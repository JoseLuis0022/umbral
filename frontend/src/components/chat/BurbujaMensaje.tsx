import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Copy, RefreshCw, ThumbsDown, ThumbsUp, type LucideIcon } from 'lucide-react';
import type { ItemProceso, Mensaje } from '../../types';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { formatoHora } from '../../lib/fechas';
import { Markdown, MarkdownEnVivo } from '../Markdown';
import { Skeleton } from '../ui';
import { VisorImagen } from '../VisorImagen';
import { imagenesEnMemoria } from '../../lib/imagenes';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';
import { FichaAdjunto, MiniaturaImagen } from './BarraEntrada';
import { BurbujaTrabajando, ProcesoAgente } from './IndicadorPensando';

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
 * El color de marca no aparece en ninguna de las dos. Si la burbuja del usuario
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
  // La imagen completa solo existe en memoria durante la sesión en que se
  // envió; después de recargar, el visor muestra la miniatura guardada.
  const [vista, setVista] = useState<{ src: string; alt: string } | null>(null);
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
              {a.miniatura ? (
                <MiniaturaImagen
                  src={a.miniatura}
                  nombre={a.nombre}
                  className="h-20 w-20"
                  onAbrir={() => setVista({ src: imagenesEnMemoria.get(a.id)?.url ?? a.miniatura!, alt: a.nombre })}
                />
              ) : (
                <FichaAdjunto adjunto={a} />
              )}
            </li>
          ))}
        </ul>
      )}
      <VisorImagen src={vista?.src ?? null} alt={vista?.alt} onCerrar={() => setVista(null)} />

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
      {mensaje.proceso && <ProcesoAgente items={mensaje.proceso} modo="terminado" pensoMs={mensaje.pensoMs} />}
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
  proceso,
  transmitiendo,
  pensoMs,
  layoutId,
  procesoAbierto,
  onAlternarProceso,
}: {
  texto: string;
  proceso: ItemProceso[];
  transmitiendo: boolean;
  pensoMs?: number | null;
  layoutId?: string;
  procesoAbierto?: boolean;
  onAlternarProceso?: () => void;
}) {
  // El paso que está corriendo AHORA, si el agente pausó a media respuesta
  // para usar una herramienta: la burbujita lo dice en vez de quedarse muda.
  let pasoActivo: string | null = null;
  for (let i = proceso.length - 1; i >= 0; i--) {
    const item = proceso[i];
    if (item.tipo === 'paso' && item.estado === 'trabajando') {
      pasoActivo = item.descripcion;
      break;
    }
  }

  return (
    <div className="relative">
      {/* Mientras transmite, el texto se OCULTA al lector de pantalla y en su
          lugar se anuncia una vez que el asistente está escribiendo: el hilo es
          un `role="log"` y, sin esto, cada fragmento se leería en voz alta. */}
      {transmitiendo && <span role="status" className="sr-only">{copyLocal.escribiendo}</span>}
      <ProcesoAgente
        items={proceso}
        modo="transmitiendo"
        pensoMs={pensoMs}
        layoutId={layoutId}
        abierto={procesoAbierto}
        onAlternar={onAlternarProceso}
      />
      {/* El texto entra con opacidad (180 ms) mientras el isotipo se encoge
          hasta la cabecera del Proceso. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, ease }}
        aria-hidden={transmitiendo}
      >
        {/* Por bloques: solo el último —el que crece— se vuelve a analizar. */}
        <MarkdownEnVivo>{texto}</MarkdownEnVivo>
      </motion.div>
      {/* La burbujita sigue ahí mientras el agente esté activo: también cuando
          se pausa a media respuesta para leer otro archivo. Es CSS (ver
          IndicadorPensando): el componente se re-renderiza por frame. */}
      {transmitiendo && (
        <BurbujaTrabajando etiqueta={copyLocal.escribiendo} actividad={pasoActivo} className="mt-3" />
      )}
    </div>
  );
});

/**
 * Espera antes del primer fragmento: el isotipo de Umbral vivo y la frase de lo
 * que el agente está haciendo ("Leyendo el resumen de la Clase 12…"), ya
 * redactada por `lib/actividad.ts`. Sin barras de skeleton: un chat no sabe
 * cuánto medirá la respuesta y un esqueleto promete una forma falsa.
 *
 * Es la cabecera viva del Proceso: con un clic se abren los pasos que lleva.
 */
export function EsperaRespuesta({
  actividad,
  proceso = [],
  layoutId,
  procesoAbierto,
  onAlternarProceso,
}: {
  actividad?: string | null;
  proceso?: ItemProceso[];
  layoutId?: string;
  procesoAbierto?: boolean;
  onAlternarProceso?: () => void;
}) {
  // Sin `role="status"`: ya vive dentro del `role="log"` del hilo, y anidar
  // dos regiones anunciables hace que el mismo aviso se lea dos veces.
  return (
    <ProcesoAgente
      items={proceso}
      modo="esperando"
      actual={actividad}
      layoutId={layoutId}
      abierto={procesoAbierto}
      onAlternar={onAlternarProceso}
    />
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
