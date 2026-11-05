import { memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Check, ChevronRight, FileText, Loader2, Search, Workflow, Wrench, X, type LucideIcon } from 'lucide-react';
import type { ItemProceso } from '../../types';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { copyLocal } from './copyLocal';

/**
 * El isotipo de Umbral "pensando": la misma M de tres nodos del logo, viva.
 *
 * Cada nodo late por turno siguiendo el camino del agente —pico izquierdo →
 * valle → pico derecho— y el halo del valle se expande como una onda. Es el
 * agentic loop en movimiento, con la identidad del producto (no la chispa de
 * Claude, que es marca de Anthropic).
 *
 * Todo es CSS (`animate-nodo`, `animate-onda`): el componente vive dentro del
 * hilo, que se re-renderiza una vez por frame mientras llega texto, y una
 * animación de JS se reiniciaría en cada render. Con movimiento reducido los
 * keyframes terminan en su estado de reposo y el isotipo queda quieto.
 */
export function IsotipoPensando({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5 shrink-0 text-accent', className)} aria-hidden="true">
      <path
        d="M5 19.5V6l7 10L19 6v13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.35}
      />
      <circle
        cx="12"
        cy="16"
        r="4.6"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.2}
        className="animate-onda [transform-box:fill-box] [transform-origin:center]"
        style={{ animationDelay: '0.45s' }}
      />
      {[
        { cx: 5, cy: 6, r: 2.1, retraso: '0s' },
        { cx: 12, cy: 16, r: 2.5, retraso: '0.45s' },
        { cx: 19, cy: 6, r: 2.1, retraso: '0.9s' },
      ].map((n) => (
        <circle
          key={n.cx}
          cx={n.cx}
          cy={n.cy}
          r={n.r}
          fill="currentColor"
          className="animate-nodo [transform-box:fill-box] [transform-origin:center]"
          style={{ animationDelay: n.retraso }}
        />
      ))}
    </svg>
  );
}

/**
 * Texto con un brillo que lo recorre. Reusa `animate-brillo` (el barrido de
 * los skeletons), que el bloque de movimiento reducido de index.css ya
 * convierte en un latido de opacidad.
 */
export function TextoBrillante({ children, className }: { children: string; className?: string }) {
  return (
    <span
      className={cn(
        'animate-brillo bg-[linear-gradient(90deg,var(--text-3)_0%,var(--text-3)_35%,var(--text-1)_50%,var(--text-3)_65%,var(--text-3)_100%)] bg-[length:200%_100%] bg-clip-text text-transparent',
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Burbujita de "trabajando": tres puntos que laten por turno —los tres nodos
 * de la M— dentro de una píldora chica. Va debajo de la respuesta mientras el
 * agente sigue activo (escribiendo o usando herramientas a media respuesta),
 * para que nunca parezca que se quedó congelado.
 */
export function BurbujaTrabajando({ etiqueta, className }: { etiqueta: string; className?: string }) {
  return (
    <span
      role="status"
      aria-label={etiqueta}
      className={cn(
        'inline-flex h-6 items-center gap-[3px] rounded-full border border-hairline bg-surface-1 px-2 shadow-1',
        className
      )}
    >
      {['0s', '0.45s', '0.9s'].map((retraso) => (
        <span
          key={retraso}
          className="h-[5px] w-[5px] animate-nodo rounded-full bg-accent"
          style={{ animationDelay: retraso }}
        />
      ))}
    </span>
  );
}

const ICONOS: Record<string, LucideIcon> = { Read: FileText, Grep: Search, Glob: Search };

/**
 * Panel "Proceso": lo que hizo el agente —su razonamiento y cada paso—, en el
 * orden en que ocurrió. Es el equivalente a ver trabajar a Claude: plegado por
 * defecto, con un clic se hace zoom.
 *
 * La cabecera ES el indicador en vivo: mientras el agente trabaja muestra el
 * isotipo animado y el paso actual con brillo; al terminar, un resumen quieto
 * ("Proceso · 3 pasos").
 *
 * Seguridad: lo que se ve aquí es lo que el backend decidió mandar. Para
 * cuentas sin permiso, cada paso trae solo su `descripcion` (sin rutas) y no
 * hay razonamiento; el `detalle` técnico y el pensamiento solo llegan a quien
 * tiene permiso "parametros". El front no esconde nada: no lo recibe.
 */
export const ProcesoAgente = memo(function ProcesoAgente({
  items,
  enVivo,
  actual,
}: {
  items: ItemProceso[];
  enVivo: boolean;
  /** Frase del paso en curso (lib/actividad.ts), para la cabecera en vivo. */
  actual?: string | null;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLOListElement>(null);
  const reducido = useReducedMotion();
  const pasos = items.filter((i) => i.tipo === 'paso').length;

  // En vivo y abierto: el final de la línea de tiempo siempre a la vista.
  useEffect(() => {
    if (enVivo && abierto && caja.current) caja.current.scrollTop = caja.current.scrollHeight;
  }, [items, enVivo, abierto]);

  if (!enVivo && items.length === 0) return null;

  const titulo = enVivo
    ? actual ?? copyLocal.pensamientoEnVivo
    : pasos > 0
      ? copyLocal.procesoListo(pasos)
      : copyLocal.procesoSoloPensamiento;

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        disabled={items.length === 0}
        aria-expanded={abierto}
        aria-label={`${titulo}. ${copyLocal.procesoVer}`}
        className="group -ml-1 flex max-w-full items-center gap-2 rounded-control px-1 py-1 text-left transition-colors duration-150 enabled:hover:bg-accent-soft/60"
      >
        {enVivo ? <IsotipoPensando /> : <Workflow size={15} className="shrink-0 text-text-3" aria-hidden />}
        {/* `key`: cada frase nueva entra con un fundido corto, en vez de
            reemplazar el texto de golpe a media animación. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={titulo}
            initial={{ opacity: 0, y: 2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
            transition={springSnappy}
            className={cn('min-w-0 truncate font-ui', enVivo ? 'text-14' : 'text-13 text-text-2 group-hover:text-text-1')}
          >
            {enVivo ? <TextoBrillante>{titulo}</TextoBrillante> : titulo}
          </motion.span>
        </AnimatePresence>
        {items.length > 0 && (
          <ChevronRight
            size={14}
            className={cn('shrink-0 text-text-3 transition-transform duration-200 ease-umbral', abierto && 'rotate-90')}
            aria-hidden
          />
        )}
      </button>

      <AnimatePresence initial={false}>
        {abierto && items.length > 0 && (
          <motion.div
            initial={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reducido ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
            exit={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={springSnappy}
            className="overflow-hidden"
          >
            <ol ref={caja} className="mt-1.5 flex max-h-80 flex-col gap-2.5 overflow-y-auto border-l-2 border-hairline py-1 pl-3.5">
              {items.map((item, i) =>
                item.tipo === 'pensamiento' ? (
                  <li key={`p-${i}`} className="whitespace-pre-wrap font-ui text-13 leading-relaxed text-text-2">
                    {item.texto}
                  </li>
                ) : (
                  <PasoProceso key={item.id} paso={item} />
                )
              )}
            </ol>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

function PasoProceso({ paso }: { paso: Extract<ItemProceso, { tipo: 'paso' }> }) {
  const Icono = paso.clase === 'subagente' ? Bot : (ICONOS[paso.nombre] ?? Wrench);
  return (
    <li className={cn('flex items-start gap-2', paso.dentroDe && 'pl-4')}>
      <Icono size={14} className="mt-[3px] shrink-0 text-text-3" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-ui text-13 text-text-1">{paso.descripcion}</p>
        {/* Solo existe si el backend lo mandó (cuenta con permiso). */}
        {paso.detalle && <code className="block truncate font-mono text-12 text-text-3" title={paso.detalle}>{paso.detalle}</code>}
      </div>
      {paso.estado === 'trabajando' ? (
        <Loader2 size={13} className="mt-[3px] shrink-0 animate-spin text-text-3" aria-label={copyLocal.pensamientoEnVivo} />
      ) : paso.estado === 'fallo' ? (
        <X size={13} strokeWidth={2.5} className="mt-[3px] shrink-0 text-status-red" aria-hidden />
      ) : (
        <Check size={13} strokeWidth={2.5} className="mt-[3px] shrink-0 text-status-green" aria-hidden />
      )}
    </li>
  );
}
