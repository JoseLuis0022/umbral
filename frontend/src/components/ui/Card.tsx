import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { spring, springRebote } from '../../lib/motion';
import { usePrimeraVez } from '../../lib/memoria';

export function Card({
  className,
  children,
  hoverable,
}: {
  className?: string;
  children?: ReactNode;
  hoverable?: boolean;
}) {
  return (
    <motion.div
      whileHover={hoverable ? { y: -2 } : undefined}
      transition={spring}
      className={cn(
        'rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
        // La sombra se funde en lugar de saltar (ver la nota de Button.tsx).
        hoverable && 'transition-shadow duration-150 hover:shadow-2',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * Tarjeta de KPI: solo tipografía. Etiqueta, cifra y detalle; sin ícono en
 * cuadro teñido (el "badge" decorativo era la marca más reconocible de
 * tablero genérico). La cifra es la protagonista y la jerarquía la dan el
 * tamaño y el peso, no un adorno.
 */
export function KpiCard({
  label,
  value,
  detail,
  className,
  onClick,
  active,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Comp = onClick ? motion.button : motion.div;
  // Rebote de entrada solo la primera vez en la sesión: al volver al tablero
  // las tarjetas ya están, no vuelven a aparecer.
  const primera = usePrimeraVez('kpi');
  return (
    <Comp
      onClick={onClick}
      // Entra con un rebote corto, y la cifra cuenta hasta su valor
      // (AnimatedNumber): el tablero se siente vivo al abrirlo.
      initial={primera ? { opacity: 0, y: 10, scale: 0.97 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      transition={springRebote}
      className={cn(
        'flex flex-col gap-1 rounded-tarjeta px-5 py-4 text-left shadow-anillo',
        active ? 'bg-accent-soft' : 'bg-surface-1',
        onClick && 'cursor-pointer transition-colors duration-150 hover:bg-tinta/[.02]',
        className
      )}
    >
      <span className="font-ui text-13 text-text-2">{label}</span>
      <span className="font-ui text-28 font-medium tracking-[-0.02em] tabular-nums text-text-1">{value}</span>
      {detail && <span className="truncate font-ui text-13 text-text-2">{detail}</span>}
    </Comp>
  );
}
