import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, RefreshCw, ThumbsDown, ThumbsUp, type LucideIcon } from 'lucide-react';
import type { ItemProceso, Mensaje } from '../../types';
import { cn } from '../../lib/cn';
import { ease, entradaMensaje, entradaMensajeUsuario, entradaReducida, springPress } from '../../lib/motion';
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
import { ArchivosMensaje } from './ArchivosMensaje';

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
 * El color de marca no aparece en ninguna de las dos: el único azul sólido de
 * la pantalla es el botón de enviar. La burbuja del usuario es un gris pizarra
 * SIN borde ni sombra —con los dos se leía como una tarjeta— y sin la esquina
 * recortada, que se veía anticuada.
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
    // Entra con peso (springMensaje), enfocándose desde un blur de 2 px y
    // creciendo desde su esquina inferior derecha: nace del composer.
    <motion.article {...(reducido ? entradaReducida : entradaMensajeUsuario)} className="group flex flex-col items-end gap-1.5">
      {mensaje.adjuntos && mensaje.adjuntos.length > 0 && (
        <ul className="flex max-w-[80%] flex-wrap justify-end gap-1.5">
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

      {mensaje.contenido && (
        <div className="max-w-[80%] rounded-burbuja bg-burbuja px-4 py-2.5">
          {/* `whitespace-pre-wrap`: lo que el usuario escribió se conserva tal
              cual, con sus saltos de línea. Su mensaje no es markdown. */}
          <p className="whitespace-pre-wrap break-words font-ui text-15 leading-6 text-text-1">{mensaje.contenido}</p>
        </div>
      )}

      {/* La hora solo al pasar el cursor (o con el foco dentro): en cada
          mensaje, todo el tiempo, era ruido. Sigue en el DOM para el lector. */}
      <time
        dateTime={mensaje.creadoEn}
        className="px-1 font-ui text-12 tabular-nums text-text-3 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {formatoHora(mensaje.creadoEn)}
      </time>
    </motion.article>
  );
});

export const RespuestaAsistente = memo(function RespuestaAsistente({
  mensaje,
  esUltima,
  ocupado,
  onRegenerar,
  onReaccion,
}: {
  mensaje: Mensaje;
  /** Solo la última respuesta se puede regenerar: rehacer una de en medio dejaría el hilo sin sentido. */
  esUltima: boolean;
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
    <motion.article {...(reducido ? entradaReducida : entradaMensaje)} className="group flex flex-col gap-1">
      {mensaje.proceso && <ProcesoAgente items={mensaje.proceso} modo="terminado" pensoMs={mensaje.pensoMs} />}
      {mensaje.contenido && <Markdown>{mensaje.contenido}</Markdown>}
      {mensaje.archivos && <ArchivosMensaje archivos={mensaje.archivos} className="mt-3" />}

      <div
        className={cn(
          '-ml-2 mt-1 flex flex-wrap items-center gap-0.5',
          // En escritorio las acciones aparecen al acercarse; la última
          // respuesta las conserva visibles porque es la que se copia o se
          // regenera el 90% de las veces. En táctil no hay hover: siempre visibles.
          !esUltima && 'lg:opacity-0 lg:transition-opacity lg:duration-150 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100'
        )}
      >
        <BotonCopiar texto={mensaje.contenido} />

        {esUltima && (
          <AccionMensaje
            etiqueta={copy.regenerar}
            icono={RefreshCw}
            disabled={ocupado}
            onClick={onRegenerar}
          />
        )}

        <span className="mx-1 h-4 w-px bg-tinta/[.08]" aria-hidden />

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
    <div className="flex flex-col gap-7" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-7">
          <div className="flex justify-end">
            <Skeleton className="h-[44px] w-[60%] rounded-burbuja" />
          </div>
          {/* Barras de 18 px cada 26 px: el interlineado de lectura. */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-[18px] w-full" />
            <Skeleton className="h-[18px] w-[95%]" />
            <Skeleton className="h-[18px] w-[88%]" />
            <Skeleton className="h-[18px] w-[45%]" />
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
    <AccionMensaje etiqueta={copiado ? copy.copiado : copy.copiar} activo={copiado} onClick={copiar}>
      {/* Los dos iconos se cruzan: el check entra trazándose. */}
      <AnimatePresence mode="popLayout" initial={false}>
        {copiado ? (
          <motion.span key="ok" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={springPress} className="flex">
            <CheckTrazado />
          </motion.span>
        ) : (
          <motion.span key="copiar" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={springPress} className="flex">
            <Copy size={15} strokeWidth={2} />
          </motion.span>
        )}
      </AnimatePresence>
    </AccionMensaje>
  );
}

/** Check que se dibuja (pathLength), para confirmar "copiado" sin cambiar el ancho del botón. */
export function CheckTrazado({ size = 15 }: { size?: number }) {
  const reducido = useReducedMotion();
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <motion.path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducido ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.28, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}

/**
 * Acción de un mensaje: 32 × 32 `rounded-celda`, solo icono (la etiqueta va en
 * `aria-label` y `title`). El hover solo cambia el fondo: nada se mueve.
 */
function AccionMensaje({
  etiqueta,
  icono: Icono,
  activo,
  disabled,
  onClick,
  children,
}: {
  etiqueta: string;
  icono?: LucideIcon;
  activo?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      aria-pressed={activo}
      title={etiqueta}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      transition={springPress}
      className={cn(
        'relative inline-flex h-11 w-11 items-center justify-center rounded-celda md:h-8 md:w-8',
        'transition-colors duration-[120ms]',
        activo ? 'text-accent-fg' : 'text-text-3 hover:text-text-1',
        'hover:bg-tinta/[.05] disabled:cursor-not-allowed disabled:text-text-3 disabled:hover:bg-transparent'
      )}
    >
      {children ?? (Icono && <Icono size={15} strokeWidth={2} />)}
    </motion.button>
  );
}
