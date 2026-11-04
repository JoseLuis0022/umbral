import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp, type LucideIcon } from 'lucide-react';
import type { Mensaje } from '../../types';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { formatoHora } from '../../lib/fechas';
import { Markdown } from '../Markdown';
import { Skeleton } from '../ui';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';
import { FichaAdjunto } from './BarraEntrada';

/**
 * Piezas del hilo: burbuja del usuario, respuesta del asistente, respuesta en
 * vivo y esqueleto de espera.
 *
 * La asimetría es deliberada. El mensaje del usuario SÍ es una burbuja (corto,
 * alineado a la derecha, se lee de un vistazo); la respuesta del asistente NO
 * lo es: ocupa el ancho de lectura completo porque trae markdown, listas y
 * tablas, y una tabla dentro de una burbuja con esquinas redondeadas se ve
 * apretada y obliga a un scroll horizontal innecesario.
 *
 * El rojo de marca no aparece en ninguna de las dos. Si la burbuja del usuario
 * fuera roja competiría con el botón de enviar, y en esta pantalla el único
 * rojo sólido es ese botón.
 */

/*
 * `memo` en las tres piezas del hilo, y no es un adorno de rendimiento: es LA
 * corrección de fluidez del chat.
 *
 * Mientras llega texto por streaming, la pantalla se vuelve a renderizar una
 * vez por frame. Sin memo, ese render arrastraba consigo TODOS los mensajes ya
 * cerrados, y cada uno reprocesa su markdown completo. Con diez mensajes en el
 * hilo eso son diez análisis de markdown por frame — el presupuesto de 16.7 ms
 * se agota antes de pintar nada. Un mensaje cerrado no cambia nunca: comparar
 * sus props lo deja fuera del render y el coste por frame pasa a depender solo
 * de la respuesta viva.
 */
export const BurbujaUsuario = memo(function BurbujaUsuario({ mensaje }: { mensaje: Mensaje }) {
  const reducido = useReducedMotion();
  return (
    <motion.article
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSnappy}
      className="flex flex-col items-end gap-1.5"
    >
      {mensaje.adjuntos && mensaje.adjuntos.length > 0 && (
        <ul className="flex max-w-[85%] flex-wrap justify-end gap-1.5">
          {mensaje.adjuntos.map((a) => (
            <li key={a.id}>
              <FichaAdjunto adjunto={a} />
            </li>
          ))}
        </ul>
      )}

      <div className="max-w-[85%] rounded-tarjeta rounded-br-celda border border-hairline bg-surface-1 px-4 py-2.5 shadow-1">
        {/* `whitespace-pre-wrap`: lo que el usuario escribió se conserva tal
            cual, con sus saltos de línea. Su mensaje no es markdown. */}
        <p className="whitespace-pre-wrap break-words font-ui text-15 leading-relaxed text-text-1">
          {mensaje.contenido}
        </p>
      </div>

      <time dateTime={mensaje.creadoEn} className="px-1 font-ui text-12 tabular-nums text-text-3">
        {formatoHora(mensaje.creadoEn)}
      </time>
    </motion.article>
  );
});

export const RespuestaAsistente = memo(function RespuestaAsistente({
  mensaje,
  esUltima,
  soloLectura,
  ocupado,
  onRegenerar,
  onReaccion,
}: {
  mensaje: Mensaje;
  /** Solo la última respuesta se puede regenerar: rehacer una de en medio dejaría el hilo sin sentido. */
  esUltima: boolean;
  soloLectura: boolean;
  ocupado: boolean;
  onRegenerar: () => void;
  /*
   * Recibe el id del mensaje además de la reacción. Podría cerrarse sobre
   * `mensaje.id` en el padre, pero entonces la prop sería una función nueva en
   * cada render del hilo y el `memo` de arriba no serviría de nada: la lista
   * volvería a renderizarse entera por frame. Con la firma completa, el padre
   * pasa un callback estable.
   */
  onReaccion: (mensajeId: string, reaccion: 'positiva' | 'negativa') => void;
}) {
  const reducido = useReducedMotion();

  return (
    <motion.article
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSnappy}
      className="group flex flex-col gap-1"
    >
      <Markdown>{mensaje.contenido}</Markdown>

      <div
        className={cn(
          'flex flex-wrap items-center gap-0.5',
          // En escritorio las acciones aparecen al acercarse; la última
          // respuesta las conserva visibles porque es la que se copia o se
          // regenera el 90% de las veces. En táctil no hay hover: siempre visibles.
          !esUltima && 'lg:opacity-0 lg:transition-opacity lg:duration-150 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100'
        )}
      >
        <BotonCopiar texto={mensaje.contenido} />

        {esUltima && !soloLectura && (
          <AccionMensaje
            etiqueta={copy.regenerar}
            icono={RefreshCw}
            disabled={ocupado}
            onClick={onRegenerar}
          />
        )}

        <span className="mx-1 h-4 w-px bg-hairline" aria-hidden />

        <AccionMensaje
          etiqueta={copy.utilSi}
          icono={ThumbsUp}
          activo={mensaje.reaccion === 'positiva'}
          onClick={() => onReaccion(mensaje.id, 'positiva')}
        />
        <AccionMensaje
          etiqueta={copy.utilNo}
          icono={ThumbsDown}
          activo={mensaje.reaccion === 'negativa'}
          onClick={() => onReaccion(mensaje.id, 'negativa')}
        />
      </div>
    </motion.article>
  );
});

/**
 * Texto que llega por streaming. No es un `Mensaje` todavía: se pinta aparte y
 * el contexto lo sustituye por el mensaje confirmado en el mismo lote de React,
 * así que no hay un frame en el que se vea duplicado.
 */
export const RespuestaEnVivo = memo(function RespuestaEnVivo({
  texto,
  transmitiendo,
}: {
  texto: string;
  transmitiendo: boolean;
}) {
  return (
    <div className="relative">
      {/* Mientras transmite, el texto se OCULTA al lector de pantalla y en su
          lugar se anuncia una vez que el asistente está escribiendo. El hilo es
          un `role="log"`, así que sin esto cada fragmento que llega — decenas
          por segundo — se leería en voz alta como contenido nuevo. Al cerrarse
          el stream, el mensaje confirmado entra al log y se anuncia una sola vez. */}
      {transmitiendo && <span role="status" className="sr-only">{copyLocal.escribiendo}</span>}
      <div aria-hidden={transmitiendo}>
        <Markdown>{texto}</Markdown>
      </div>
      {/*
        El cursor parpadea con una animación de CSS, no con keyframes de Framer
        Motion. El motivo es un fallo real, no una preferencia: este componente
        se vuelve a renderizar una vez por frame mientras llega texto, y
        `animate={{ opacity: [1, 0.15, 1] }}` creaba un array NUEVO en cada uno
        de esos renders. Framer lo leía como un destino distinto y reiniciaba el
        parpadeo desde cero sesenta veces por segundo: el cursor se quedaba
        clavado cerca de opacidad 1 y nunca llegaba a parpadear, además de
        recalcular la animación en cada frame.

        En CSS la animación vive en el compositor, sobrevive a los renders y no
        cuesta nada. Con `prefers-reduced-motion` la regla global de index.css
        la colapsa y el keyframe termina en opacidad 1: el cursor sigue ahí —el
        feedback no se elimina—, solo deja de parpadear.
      */}
      {transmitiendo && (
        <span
          aria-hidden
          className="ml-0.5 inline-block h-[15px] w-[7px] translate-y-[2px] animate-parpadeo rounded-[2px] bg-accent align-baseline"
        />
      )}
    </div>
  );
});

/**
 * Espera antes del primer fragmento. Las barras miden 16 px con 6 px de
 * separación: exactamente el interlineado de 22 px del cuerpo, para que al
 * llegar el texto real la altura no cambie y el hilo no brinque.
 *
 * `agenteActivo` sustituye el "Pensando…" genérico por el nombre del
 * sub-agente que está trabajando. Con el backend real, delegar cuesta 3-4
 * segundos de silencio, y decir *quién* trabaja es la diferencia entre una
 * espera que se entiende y una que parece un cuelgue.
 */
export function EsqueletoRespuesta({ agenteActivo }: { agenteActivo?: string | null }) {
  return (
    // Sin `role="status"`: ya vive dentro del `role="log"` del hilo, y anidar
    // dos regiones anunciables hace que el mismo aviso se lea dos veces.
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-accent" aria-hidden />
        <span className="font-ui text-13 text-text-3">
          {agenteActivo ? copyLocal.consultandoAgente(agenteActivo) : copyLocal.pensando}
        </span>
      </div>
      <div className="flex flex-col gap-1.5" aria-hidden>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-[68%]" />
      </div>
    </div>
  );
}

/** Esqueleto del hilo completo, con la alternancia usuario/asistente real. */
export function EsqueletoHilo() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-8">
          <div className="flex justify-end">
            <Skeleton className="h-[52px] w-[60%] rounded-tarjeta" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[88%]" />
            <Skeleton className="h-4 w-[45%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------- Acciones -------------------------------- */

function BotonCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  // El temporizador se limpia al desmontar: en un hilo largo se copian varias
  // respuestas y cada una dejaría su setState huérfano detrás.
  useEffect(() => () => { if (reloj.current) clearTimeout(reloj.current); }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // El portapapeles puede estar bloqueado por permisos; el texto sigue
      // siendo seleccionable a mano y no vale la pena un error para eso.
      return;
    }
    setCopiado(true);
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(() => setCopiado(false), 1600);
  }

  return (
    <AccionMensaje
      etiqueta={copiado ? copy.copiado : copy.copiar}
      icono={copiado ? Check : Copy}
      activo={copiado}
      conTexto={copiado}
      animarAncho
      onClick={copiar}
    />
  );
}

function AccionMensaje({
  etiqueta,
  icono: Icono,
  activo,
  conTexto,
  animarAncho,
  disabled,
  onClick,
}: {
  etiqueta: string;
  icono: LucideIcon;
  activo?: boolean;
  /** Muestra la etiqueta junto al icono — se usa para confirmar "Copiado". */
  conTexto?: boolean;
  /**
   * Solo el botón de copiar cambia de ancho (le entra la palabra "Copiado"), y
   * solo él necesita `layout`. Antes lo llevaban los cuatro botones de CADA
   * respuesta: `layout` obliga a medir la caja en cada render del componente, y
   * en un hilo largo eso son decenas de mediciones por render para animar un
   * ancho que en tres de los cuatro no se mueve nunca.
   */
  animarAncho?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      layout={animarAncho}
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      aria-pressed={activo}
      title={etiqueta}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={springSnappy}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-celda px-2.5 font-ui text-12 font-medium',
        'transition-colors duration-150 md:min-h-[32px]',
        activo ? 'text-accent-fg' : 'text-text-3 hover:text-text-1',
        'hover:bg-accent-soft disabled:cursor-not-allowed disabled:text-text-3 disabled:hover:bg-transparent'
      )}
    >
      <Icono size={14} strokeWidth={2} />
      {conTexto && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur.fast, ease }}
        >
          {etiqueta}
        </motion.span>
      )}
    </motion.button>
  );
}
