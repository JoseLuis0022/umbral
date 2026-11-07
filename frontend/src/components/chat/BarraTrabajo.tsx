import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dur, ease, springPanel } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { minutoLegible } from '../../lib/adjuntos';
import { chat as copy } from '../../copy';

/** Antes de esto una tarea no es "larga": la espera normal del chat basta. */
export const UMBRAL_TAREA_LARGA_S = 15;

/**
 * Progreso de una tarea LARGA, en el lugar donde va a aparecer la respuesta
 * (como el informe de una investigación a fondo), no en la cabecera.
 *
 *  - Solo aparece pasados UMBRAL_TAREA_LARGA_S: una pregunta de 5 segundos no
 *    necesita que le expliquen que puede cerrar la página.
 *  - Es INDETERMINADA a propósito: el agente decide sobre la marcha cuántos
 *    pasos dar, así que un porcentaje sería inventado. Lo honesto es lo que sí
 *    se mide: cuánto lleva y cuántos pasos ha dado.
 */
export const BarraTrabajo = memo(function BarraTrabajo({
  activa,
  desde,
  pasos,
}: {
  activa: boolean;
  /** Inicio del trabajo (ISO). */
  desde?: string;
  pasos: number;
}) {
  const reducido = useReducedMotion();
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!activa) return;
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [activa]);

  const segundos = desde ? Math.max(0, (ahora - new Date(desde).getTime()) / 1000) : 0;
  const visible = activa && segundos >= UMBRAL_TAREA_LARGA_S;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="tarea-larga"
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
          transition={reducido ? { duration: dur.fast } : springPanel}
          role="status"
          aria-live="polite"
          className="flex flex-col gap-3 rounded-tarjeta bg-surface-1 p-4 shadow-anillo"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-ui text-13">
            <span className="font-medium text-text-1">{copy.trabajando}</span>
            <span className="tabular-nums text-text-2">
              {minutoLegible(segundos)}
              {pasos > 0 && <>, {copy.pasos(pasos)}</>}
            </span>
          </div>
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-accent-soft">
            {reducido ? (
              <div className="absolute inset-0 animate-pulse rounded-full bg-accent/50" />
            ) : (
              <motion.div
                className="absolute inset-y-0 w-1/3 rounded-full bg-accent"
                initial={{ x: '-100%' }}
                animate={{ x: '300%' }}
                transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
              />
            )}
          </div>
          <p className="font-ui text-12 leading-snug text-text-3">{copy.trabajandoDetalle}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
