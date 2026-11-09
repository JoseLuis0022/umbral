import { motion } from 'framer-motion';
import { dur, ease, springRebote } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';

/**
 * Confirmación de "correo verificado": un círculo verde que entra con rebote
 * y una palomita que se traza encima. Es el único momento de motion de la
 * pantalla, y responde a algo que pasó de verdad (la cuenta se activó).
 *
 * El rebote va SOLO en la escala; la opacidad lleva su propio tween corto.
 * Con el resorte también en la opacidad, se quedaba en 0 casi un segundo y
 * luego "saltaba" (así nació el parpadeo de las sugerencias).
 * Con movimiento reducido: aparece completa con un fundido.
 */
export function PalomitaExito({ tamano = 56 }: { tamano?: number }) {
  const reducido = useReducedMotion();
  return (
    <motion.svg
      width={tamano}
      height={tamano}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
      initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
      animate={reducido ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={reducido ? { duration: dur.base, ease } : { scale: springRebote, opacity: { duration: dur.fast, ease } }}
    >
      <circle cx="28" cy="28" r="28" fill="var(--status-green-soft)" />
      <motion.circle
        cx="28"
        cy="28"
        r="26"
        stroke="var(--status-green)"
        strokeWidth="2.5"
        initial={reducido ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.45, ease }}
        style={{ rotate: -90, transformOrigin: '50% 50%' }}
      />
      <motion.path
        d="M17 29l7.5 7.5L39.5 21"
        stroke="var(--status-green)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducido ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.35, delay: reducido ? 0 : 0.3, ease }}
      />
    </motion.svg>
  );
}
