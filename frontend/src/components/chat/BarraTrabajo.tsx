import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { dur, ease, springPanel } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { minutoLegible } from '../../lib/adjuntos';
import { chat as copy } from '../../copy';

/**
 * Barra de "esta conversación está trabajando", bajo la cabecera del chat.
 *
 * Es INDETERMINADA a propósito: el agente no sabe de antemano cuántos pasos
 * va a dar (decide sobre la marcha), así que un porcentaje sería inventado.
 * Lo honesto es lo que sí se mide: cuánto lleva y cuántos pasos ha dado.
 * También dice lo que más preocupa en una tarea larga: que puedes irte.
 */
export const BarraTrabajo = memo(function BarraTrabajo({
  visible,
  desde,
  pasos,
}: {
  visible: boolean;
  /** Inicio del trabajo (ISO). */
  desde?: string;
  pasos: number;
}) {
  const reducido = useReducedMotion();
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [visible]);

  const segundos = desde ? Math.max(0, (ahora - new Date(desde).getTime()) / 1000) : 0;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="barra-trabajo"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0, transition: { duration: dur.fast, ease } }}
          transition={reducido ? { duration: dur.fast } : springPanel}
          className="shrink-0 overflow-hidden"
          role="status"
          aria-live="polite"
        >
          <div className="relative h-0.5 w-full overflow-hidden bg-accent-soft">
            {reducido ? (
              <div className="absolute inset-0 animate-pulse bg-accent/60" />
            ) : (
              <motion.div
                className="absolute inset-y-0 w-1/3 rounded-full bg-accent"
                initial={{ x: '-100%' }}
                animate={{ x: '300%' }}
                transition={{ duration: 1.6, ease: 'easeInOut', repeat: Infinity }}
              />
            )}
          </div>
          <div className="mx-auto flex w-full max-w-[720px] flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2 font-ui text-12 lg:px-6">
            <span className="font-medium text-text-1">{copy.trabajando}</span>
            <span className="tabular-nums text-text-2">
              {minutoLegible(segundos)}
              {pasos > 0 && <> · {copy.pasos(pasos)}</>}
            </span>
            <span className="text-text-3">{copy.trabajandoDetalle}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
