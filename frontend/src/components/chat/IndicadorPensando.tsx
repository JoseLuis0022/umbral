import { memo, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { ItemProceso } from '../../types';
import { cn } from '../../lib/cn';
import { dur, ease, springLayout, springPanel, springPress } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { copyLocal } from './copyLocal';

/*
 * LA ESPERA DEL AGENTE (docs/especificacion-diseno.md §3)
 *
 * Un chat no sabe cuánto medirá la respuesta, así que la espera NO promete una
 * forma (nada de barras de skeleton): dice que el agente está trabajando y QUÉ
 * está haciendo. La señal es el isotipo de Umbral vivo —la M de tres nodos— más
 * una frase con brillo, en una fila de 28 px.
 *
 * Todo lo que late aquí es CSS (keyframes en tailwind.config.js). Estas piezas
 * viven dentro del hilo, que se re-renderiza una vez por frame mientras llega
 * texto, y una animación de JS se reiniciaría en cada render. Framer Motion
 * solo hace lo que ocurre UNA vez: el dibujo inicial de la M y la entrada.
 */

/** Rejilla de 24: picos en (5,6) y (19,6), valle en (12,16). Es el mismo dibujo que `IsotipoUmbral`. */
const TRAZO = 'M5 19.5V6l7 10L19 6v13.5';

/*
 * Cuándo pasa el pulso por cada nodo, en segundos desde el arranque del ciclo.
 * Salen de la geometría (con `pathLength=100` los nodos caen al 26 %, 50 % y
 * 74 % del trazo) y de la velocidad del pulso (`pulsoTrazo`: de 14 a −100 en
 * 1,6 s). `nodoPaso` tiene su pico al 10 % de 1,8 s = 0,18 s, así que cada
 * retraso es "momento del paso − 0,18".
 */
const NODOS = [
  { cx: 5, cy: 6, r: 2.1, retraso: 0.287 },
  { cx: 12, cy: 16, r: 2.5, retraso: 0.62 },
  { cx: 19, cy: 6, r: 2.1, retraso: 0.953 },
];
/** El pulso llega al valle a los 0,8 s: ahí sale la onda. */
const RETRASO_ONDA = 0.8;
/** El dibujo inicial dura 600 ms; el recorrido empieza al terminar. */
const DURACION_DIBUJO = 0.6;

export function IsotipoPensando({
  tamano = 28,
  animado = true,
  dibujar = false,
  className,
}: {
  tamano?: 16 | 28;
  /** `false` = el isotipo quieto (cabecera del Proceso terminada). */
  animado?: boolean;
  /** Fase "dibujo": la M se traza y los nodos aparecen. Solo la primera vez que se monta la espera. */
  dibujar?: boolean;
  className?: string;
}) {
  const reducido = useReducedMotion();
  const vivo = animado && !reducido;
  const conDibujo = dibujar && vivo;
  const base = conDibujo ? DURACION_DIBUJO : 0;

  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('shrink-0 overflow-visible', tamano === 28 ? 'h-7 w-7' : 'h-4 w-4', className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* Trazo base. Vivo va al 25 %: el pulso de luz es lo que se lee. */}
      <motion.path
        d={TRAZO}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={conDibujo ? { pathLength: 0, opacity: 0.25 } : false}
        animate={{ pathLength: 1, opacity: animado ? 0.25 : 1 }}
        transition={{ pathLength: { duration: DURACION_DIBUJO, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: dur.fast } }}
      />

      {/* Pulso de luz que recorre la M (`pulsoTrazo`). */}
      {vivo && (
        <path
          d={TRAZO}
          pathLength={100}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="14 200"
          className="animate-pulsoTrazo"
          style={{ animationDelay: `${base}s` }}
        />
      )}

      {/* Onda del valle: el anillo crece de r 2,5 a 7 y se apaga. */}
      {vivo && (
        <circle
          cx={12}
          cy={16}
          r={2.5}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          className="animate-ondaValle [transform-box:fill-box] [transform-origin:center]"
          style={{ animationDelay: `${base + RETRASO_ONDA}s` }}
        />
      )}

      {NODOS.map((n, i) => (
        // El `g` lleva la aparición de Framer (escala 0 → 1, cada 90 ms) y el
        // círculo lleva el CSS: dos transformaciones en el mismo nodo se
        // pisarían.
        <motion.g
          key={n.cx}
          initial={conDibujo ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ ...springPress, delay: 0.15 + i * 0.09 }}
        >
          <circle
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill="currentColor"
            className={cn(
              '[transform-box:fill-box] [transform-origin:center]',
              vivo && 'animate-nodoPaso',
              // Movimiento reducido: el isotipo se queda quieto y solo late la
              // opacidad de los nodos. Sigue diciendo "estoy trabajando".
              animado && reducido && 'animate-espera'
            )}
            style={vivo ? { animationDelay: `${base + n.retraso}s` } : undefined}
          />
        </motion.g>
      ))}
    </svg>
  );
}

/**
 * Texto con una banda de luz que lo recorre (ciclo de 2,2 s, gradiente de tres
 * paradas al 25 % del ancho). Con movimiento reducido el bloque de excepciones
 * de index.css convierte `animate-brillo` en un latido de opacidad.
 */
export function TextoBrillante({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        'animate-brillo bg-[linear-gradient(90deg,var(--text-2)_40%,var(--text-1)_50%,var(--text-2)_60%)] bg-[length:250%_100%] bg-clip-text text-transparent',
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * La espera antes del primer token: isotipo de 28 px dibujándose y recorriendo
 * su trazo, más la frase de actividad con brillo. Entra 120 ms después que el
 * mensaje del usuario, para que se lea como respuesta a él.
 *
 * `layoutId`: cuando llega el primer token, el isotipo se encoge hasta ser la
 * cabecera de 16 px del Proceso (ver `ProcesoAgente`). Es la misma pieza que
 * cambia de papel, no una que desaparece y otra que aparece.
 */
export function PensandoUmbral({
  frase,
  layoutId,
  className,
}: {
  frase: string;
  layoutId?: string;
  className?: string;
}) {
  const reducido = useReducedMotion();
  return (
    <motion.span
      initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducido ? { duration: dur.fast, ease, delay: 0.12 } : { ...springPanel, delay: 0.12 }}
      style={{ transformOrigin: 'left center' }}
      className={cn('flex h-7 min-w-0 items-center gap-2.5', className)}
    >
      <motion.span layoutId={layoutId} transition={springLayout} className="flex shrink-0 text-accent">
        <IsotipoPensando tamano={28} dibujar />
      </motion.span>
      {/* `key`: cada frase nueva entra con un fundido corto. Sin salida
          animada a propósito: con `mode="wait"` la frase vieja tenía que irse
          antes de que entrara la nueva, y cuando el agente encadena pasos
          rápidos la fila se quedaba EN BLANCO justo en la espera. */}
      <motion.span
        key={frase}
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur.fast, ease }}
        className="min-w-0 truncate font-ui text-14"
      >
        <TextoBrillante>{frase}</TextoBrillante>
      </motion.span>
    </motion.span>
  );
}

/**
 * Burbujita de "sigue trabajando": tres puntos —los tres nodos de la M— que se
 * levantan por turno dentro de una píldora. Va debajo de la respuesta mientras
 * el agente siga activo, también cuando pausa a media respuesta para usar una
 * herramienta; en ese caso dice además qué está haciendo.
 *
 * Se eligió sobre el cursor de punto de la especificación porque es lo que se
 * pidió ("una burbujita mientras está haciendo las cosas", como Claude Code) y
 * porque sobrevive a las pausas: un cursor al final del texto parece colgado
 * cuando el agente lleva diez segundos leyendo un archivo.
 */
export function BurbujaTrabajando({
  etiqueta,
  actividad,
  className,
}: {
  /** Nombre accesible ("El asistente está escribiendo…"). */
  etiqueta: string;
  /** Lo que hace a media respuesta, si está usando una herramienta. */
  actividad?: string | null;
  className?: string;
}) {
  const reducido = useReducedMotion();
  return (
    <motion.span
      role="status"
      aria-label={actividad ?? etiqueta}
      initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducido ? { duration: dur.fast, ease } : springPanel}
      style={{ transformOrigin: 'left center' }}
      className={cn(
        'inline-flex h-7 max-w-full items-center gap-2 rounded-pastilla bg-surface-1 px-3 shadow-anillo',
        className
      )}
    >
      <span className="flex items-center gap-[4px]" aria-hidden>
        {[0, 0.15, 0.3].map((retraso) => (
          <span
            key={retraso}
            className="h-1.5 w-1.5 animate-puntoOla rounded-full bg-accent"
            style={{ animationDelay: `${retraso}s` }}
          />
        ))}
      </span>
      <AnimatePresence initial={false}>
        {actividad && (
          <motion.span
            key={actividad}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: dur.fast } }}
            transition={{ duration: dur.fast, ease }}
            className="min-w-0 truncate font-ui text-13"
            aria-hidden
          >
            <TextoBrillante>{actividad}</TextoBrillante>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.span>
  );
}

/* ───────────────────────────────── Proceso ───────────────────────────────── */

const BUSQUEDAS = new Set(['Grep', 'Glob', 'WebSearch']);
const LECTURAS = new Set(['Read', 'WebFetch']);

/** "Pensó 8 s · 2 búsquedas · 1 lectura". Sin duración medida, "Proceso · …". */
export function resumenProceso(items: ItemProceso[], pensoMs?: number | null): string {
  let busquedas = 0;
  let lecturas = 0;
  let otros = 0;
  for (const item of items) {
    if (item.tipo !== 'paso') continue;
    if (BUSQUEDAS.has(item.nombre)) busquedas++;
    else if (LECTURAS.has(item.nombre)) lecturas++;
    else otros++;
  }
  const partes: string[] = [];
  if (busquedas) partes.push(copyLocal.procesoBusquedas(busquedas));
  if (lecturas) partes.push(copyLocal.procesoLecturas(lecturas));
  if (otros) partes.push(copyLocal.procesoPasos(otros));

  const cabeza =
    pensoMs != null
      ? copyLocal.procesoPenso(Math.max(1, Math.round(pensoMs / 1000)))
      : partes.length
        ? copyLocal.procesoTitulo
        : copyLocal.procesoSoloPensamiento;
  return [cabeza, ...partes].join(' · ');
}

/**
 * Panel "Proceso": lo que hizo el agente —su razonamiento y cada paso—, en el
 * orden en que ocurrió. Plegado por defecto; con un clic se abre.
 *
 * Tres modos, uno por momento de la respuesta:
 *  - `esperando`: la cabecera ES el indicador de espera (`PensandoUmbral`).
 *  - `transmitiendo`: ya hay texto; cabecera compacta y quieta, pero los pasos
 *    que lleguen a media respuesta siguen entrando.
 *  - `terminado`: el resumen de una respuesta cerrada.
 *
 * Seguridad: lo que se ve aquí es lo que el backend decidió mandar. Para
 * cuentas sin permiso, cada paso trae solo su `descripcion` (sin rutas) y no
 * hay razonamiento; el `detalle` técnico y el pensamiento solo llegan a quien
 * tiene permiso "parametros". El front no esconde nada: no lo recibe.
 */
export const ProcesoAgente = memo(function ProcesoAgente({
  items,
  modo,
  actual,
  pensoMs,
  layoutId,
  abierto: abiertoControlado,
  onAlternar,
}: {
  items: ItemProceso[];
  modo: 'esperando' | 'transmitiendo' | 'terminado';
  /** Frase del paso en curso (lib/actividad.ts), para la cabecera en espera. */
  actual?: string | null;
  /** Lo que tardó en llegar el primer token: "Pensó 8 s". */
  pensoMs?: number | null;
  /** Une el isotipo de la espera con el de esta cabecera (ver `PensandoUmbral`). */
  layoutId?: string;
  /** Controlado desde el hilo en la respuesta viva, para que abrirlo durante la espera sobreviva al primer token. */
  abierto?: boolean;
  onAlternar?: () => void;
}) {
  const [abiertoPropio, setAbiertoPropio] = useState(false);
  const abierto = abiertoControlado ?? abiertoPropio;
  const alternar = onAlternar ?? (() => setAbiertoPropio((a) => !a));
  const reducido = useReducedMotion();

  const hayItems = items.length > 0;
  if (modo !== 'esperando' && !hayItems) return null;

  const enEspera = modo === 'esperando';
  const titulo = enEspera ? (actual ?? copyLocal.pensamientoEnVivo) : resumenProceso(items, pensoMs);

  return (
    <div className={enEspera ? '' : 'mb-3'}>
      {enEspera ? (
        <button
          type="button"
          onClick={alternar}
          disabled={!hayItems}
          aria-expanded={hayItems ? abierto : undefined}
          aria-label={hayItems ? `${titulo}. ${copyLocal.procesoVer}` : titulo}
          className="group -ml-1 flex max-w-full items-center gap-1 rounded-celda py-0.5 pl-1 pr-2 text-left transition-colors duration-[120ms] enabled:hover:bg-tinta/[.04]"
        >
          <PensandoUmbral frase={titulo} layoutId={layoutId} />
          {hayItems && <Chevron abierto={abierto} />}
        </button>
      ) : (
        <button
          type="button"
          onClick={alternar}
          aria-expanded={abierto}
          aria-label={`${titulo}. ${copyLocal.procesoVer}`}
          className="group -ml-2 flex h-8 max-w-full items-center gap-2 rounded-celda px-2 text-left text-text-3 transition-colors duration-[120ms] hover:bg-tinta/[.05] hover:text-text-2"
        >
          <motion.span layoutId={layoutId} transition={springLayout} className="flex shrink-0">
            <IsotipoPensando tamano={16} animado={false} />
          </motion.span>
          <motion.span
            initial={layoutId ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18, ease }}
            className="min-w-0 truncate font-ui text-13 tabular-nums text-text-2 group-hover:text-text-1"
          >
            {titulo}
          </motion.span>
          <Chevron abierto={abierto} />
        </button>
      )}

      <AnimatePresence initial={false}>
        {abierto && hayItems && (
          <motion.div
            key="lista"
            initial={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reducido ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={reducido ? { duration: dur.fast, ease } : springLayout}
            className="overflow-hidden"
          >
            <LineaTiempo items={items} vivo={modo !== 'terminado'} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <ChevronRight
      size={14}
      strokeWidth={2}
      className={cn('shrink-0 text-text-3 transition-transform duration-200 ease-umbral', abierto && 'rotate-90')}
      aria-hidden
    />
  );
}

/**
 * La línea de tiempo abierta: cada paso es un punto-nodo de 6 px unido al
 * siguiente por una línea de 1 px —la estética del grafo de la M—, sobre una
 * superficie apenas teñida. Sin regla lateral de 2 px ni iconos sueltos.
 */
function LineaTiempo({ items, vivo }: { items: ItemProceso[]; vivo: boolean }) {
  const caja = useRef<HTMLOListElement>(null);
  // Lo que ya estaba al abrir no entra animado; lo que llegue después, sí.
  const iniciales = useRef(items.length);

  // En vivo: el final de la línea de tiempo siempre a la vista.
  useLayoutEffect(() => {
    if (vivo && caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [items, vivo]);

  return (
    <div className="mt-1.5 rounded-menu bg-[rgba(22,28,39,.03)] px-3.5 py-3">
      <ol ref={caja} className="flex max-h-80 flex-col overflow-y-auto overscroll-contain">
        {items.map((item, i) => (
          <ItemLinea
            key={item.tipo === 'paso' ? item.id : `p-${i}`}
            item={item}
            ultimo={i === items.length - 1}
            animarEntrada={i >= iniciales.current}
          />
        ))}
      </ol>
    </div>
  );
}

function ItemLinea({ item, ultimo, animarEntrada }: { item: ItemProceso; ultimo: boolean; animarEntrada: boolean }) {
  const reducido = useReducedMotion();
  const anidado = item.tipo === 'paso' && item.dentroDe !== null;
  // El check se TRAZA si el paso terminó con el panel a la vista; si ya
  // estaba terminado al abrir, aparece quieto.
  const empezoTrabajando = useRef(item.tipo === 'paso' && item.estado === 'trabajando');

  return (
    <motion.li
      initial={animarEntrada ? (reducido ? { opacity: 0 } : { opacity: 0, y: 4 }) : false}
      animate={{ opacity: 1, y: 0 }}
      transition={reducido ? { duration: dur.fast, ease } : springLayout}
      className={cn('relative flex min-h-7 gap-2.5 pl-4', anidado && 'ml-4', !ultimo && 'pb-1.5')}
    >
      {/* Línea hacia el siguiente nodo. */}
      {!ultimo && <span aria-hidden className="absolute bottom-0 left-[2.5px] top-[18px] w-px bg-tinta/10" />}
      <NodoLinea item={item} />

      {item.tipo === 'pensamiento' ? (
        <Pensamiento texto={item.texto} />
      ) : (
        <>
          <div className="min-w-0 flex-1 py-[5px]">
            <p className="font-ui text-13 text-text-1">{item.descripcion}</p>
            {/* Solo existe si el backend lo mandó (cuenta con permiso). */}
            {item.detalle && (
              <code className="mt-0.5 block truncate font-mono text-12 text-text-3" title={item.detalle}>
                {item.detalle}
              </code>
            )}
          </div>
          <EstadoPaso estado={item.estado} animar={animarEntrada || empezoTrabajando.current} />
        </>
      )}
    </motion.li>
  );
}

function NodoLinea({ item }: { item: ItemProceso }) {
  const base = 'absolute left-0 top-[11px] h-1.5 w-1.5 rounded-full';
  if (item.tipo === 'pensamiento') {
    return <span aria-hidden className={cn(base, 'shadow-[inset_0_0_0_1px_var(--text-3)]')} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        base,
        item.estado === 'trabajando' && 'animate-espera bg-accent',
        item.estado === 'listo' && 'bg-text-3',
        item.estado === 'fallo' && 'bg-status-red'
      )}
    />
  );
}

/** Razonamiento: 14/22 en text-2, máximo tres líneas por bloque con "ver más". */
function Pensamiento({ texto }: { texto: string }) {
  const [completo, setCompleto] = useState(false);
  const [recortado, setRecortado] = useState(false);
  const parrafo = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = parrafo.current;
    if (!el || completo) return;
    setRecortado(el.scrollHeight > el.clientHeight + 1);
  }, [texto, completo]);

  return (
    <div className="min-w-0 flex-1 py-[3px]">
      <p
        ref={parrafo}
        className={cn('whitespace-pre-wrap font-ui text-14 leading-[22px] text-text-2', !completo && 'line-clamp-3')}
      >
        {texto}
      </p>
      {(recortado || completo) && (
        <button
          type="button"
          onClick={() => setCompleto((c) => !c)}
          className="mt-0.5 rounded-xs font-ui text-12 font-medium text-text-3 transition-colors duration-[120ms] hover:text-text-1"
        >
          {completo ? copyLocal.verMenos : copyLocal.verMas}
        </button>
      )}
    </div>
  );
}

/** A la derecha del paso: nada mientras trabaja (late el nodo), check trazado al terminar, X si falló. */
function EstadoPaso({ estado, animar }: { estado: 'trabajando' | 'listo' | 'fallo'; animar: boolean }) {
  const reducido = useReducedMotion();
  if (estado === 'trabajando') return <span className="sr-only">{copyLocal.pensamientoEnVivo}</span>;
  const falla = estado === 'fallo';
  return (
    <svg
      viewBox="0 0 16 16"
      className={cn('mt-[7px] h-3.5 w-3.5 shrink-0', falla ? 'text-status-red' : 'text-status-green')}
      aria-label={falla ? copyLocal.pasoFallo : copyLocal.pasoListo}
      role="img"
    >
      <motion.path
        d={falla ? 'M4.5 4.5l7 7M11.5 4.5l-7 7' : 'M3.5 8.5l3 3 6-7'}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animar && !reducido ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.28, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  );
}
