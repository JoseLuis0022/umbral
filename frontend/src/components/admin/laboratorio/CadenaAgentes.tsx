import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CornerDownRight, Workflow } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { dur, ease, springSnappy } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { formatoDuracion } from './formato';
import { copyLab } from './copyLocal';
import type { PasoAgente } from './tipos';

/**
 * Recorrido del agente EN VIVO.
 *
 * Es la pieza que justifica esta pantalla. Antes de escribir, el agente lee el
 * índice, el resumen de una clase, los apuntes… y cada paso es una vuelta del
 * agentic loop que cuesta tiempo y tokens. `alActividad` avisa de cada
 * herramienta en tiempo real, así que esa espera deja de ser muerta y pasa a
 * ser progreso legible: qué leyó, qué sigue haciendo y cuánto tardó cada paso.
 *
 * Lo que hace un subagente va indentado y con otra marca: la jerarquía de la
 * delegación se lee por posición, no por color (y por eso también lleva icono).
 */
/* `memo`: el hilo del laboratorio se re-renderiza una vez por frame mientras
 * llega texto, y esta lista lleva animaciones de layout. Sin memo, Framer
 * volvía a medir cada paso en CADA commit; con memo, solo cuando la cadena
 * cambia de verdad. */
export const CadenaAgentes = memo(function CadenaAgentes({ pasos }: { pasos: PasoAgente[] }) {
  const reducido = useReducedMotion();

  return (
    <section
      aria-label={copyLab.cadenaTitulo}
      className="flex flex-col gap-2 rounded-menu bg-tinta/[.03] px-3.5 py-3"
    >
      <header className="flex items-center gap-2">
        <Workflow size={14} strokeWidth={2} className="shrink-0 text-text-3" aria-hidden />
        <h3 className="font-ui text-12 font-medium text-text-3">
          {copyLab.cadenaTitulo}
        </h3>
      </header>

      <ol className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {pasos.map((paso) => (
            <motion.li
              key={paso.clave}
              // `layout="position"`: un paso solo cambia de SITIO cuando se
              // inserta otro encima; su caja no se deforma. El layout completo
              // medía además el tamaño en cada render del padre — y el padre
              // re-renderiza una vez por frame mientras llega texto.
              layout={reducido ? false : 'position'}
              initial={reducido ? { opacity: 0 } : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={springSnappy}
              className={cn('flex items-center gap-2', !paso.principal && 'pl-4')}
            >
              {!paso.principal && (
                <CornerDownRight size={13} strokeWidth={2} className="shrink-0 text-text-3" aria-hidden />
              )}

              <IndicadorPaso estado={paso.estado} />

              <span
                className={cn(
                  'min-w-0 truncate font-ui text-13',
                  paso.estado === 'listo' ? 'text-text-2' : 'font-medium text-text-1'
                )}
              >
                {paso.nombre}
              </span>

              <span className="shrink-0 rounded-xs bg-surface-1 px-1.5 py-px font-ui text-12 text-text-3 shadow-anillo">
                {paso.principal ? copyLab.cadenaPrincipal : copyLab.cadenaDelegado}
              </span>

              <span className="ml-auto shrink-0 font-ui text-12 tabular-nums text-text-3">
                {paso.estado === 'listo' && paso.msFin !== undefined
                  ? formatoDuracion(paso.msFin - paso.msInicio)
                  : copyLab.cadenaTrabajando}
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
});

/**
 * Punto de estado del paso. Mientras trabaja late; al terminar se convierte en
 * palomita. El latido se apaga con `prefers-reduced-motion`, pero el punto no
 * desaparece: el usuario sigue necesitando distinguir "trabajando" de "listo".
 */
function IndicadorPaso({ estado }: { estado: PasoAgente['estado'] }) {
  const reducido = useReducedMotion();

  if (estado === 'listo') {
    return (
      <motion.span
        initial={reducido ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reducido ? { duration: dur.fast, ease } : springSnappy}
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-status-green-soft text-status-green"
        aria-label={copyLab.cadenaTitulo}
      >
        <Check size={11} strokeWidth={3} aria-hidden />
      </motion.span>
    );
  }

  return (
    // Latido por CSS. En Framer, los arrays de keyframes se reconstruían en
    // cada render del padre —que durante el streaming es uno por frame— y la
    // animación se reiniciaba sin llegar a latir: el punto que dice "este
    // agente está trabajando" se quedaba congelado justo durante la espera que
    // existe para explicar. El keyframe termina en el estado visible, así que
    // con movimiento reducido el punto sigue ahí, solo deja de latir.
    <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
      <span className="h-2 w-2 animate-latido rounded-full bg-accent" />
    </span>
  );
}

/**
 * Resumen de la cadena una vez terminada la respuesta. Va en el pie del
 * mensaje junto a las métricas: ahí ya no hace falta el detalle en vivo, solo
 * el recorrido y cuánto costó cada salto.
 */
export const ResumenCadena = memo(function ResumenCadena({ pasos }: { pasos: PasoAgente[] }) {
  if (pasos.length === 0) return null;

  return (
    <motion.ul
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.fast, ease }}
      aria-label={copyLab.cadenaTitulo}
      className="flex flex-wrap items-center gap-1.5"
    >
      {pasos.map((paso) => (
        <li
          key={paso.clave}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-celda px-2 py-0.5 font-ui text-12 shadow-anillo',
            paso.principal ? 'bg-surface-1 text-text-1' : 'bg-bg text-text-2'
          )}
        >
          <span className="truncate">{paso.nombre}</span>
          {paso.msFin !== undefined && (
            <span className="tabular-nums text-text-3">{formatoDuracion(paso.msFin - paso.msInicio)}</span>
          )}
        </li>
      ))}
    </motion.ul>
  );
});
