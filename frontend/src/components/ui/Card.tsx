import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { spring } from '../../lib/motion';

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
 * Tarjeta de KPI: layout HORIZONTAL a propósito — icono en badge a la
 * izquierda, etiqueta y cifra apiladas a la derecha. El layout vertical
 * (icono arriba, cifra enorme, detalle abajo) siempre termina leyéndose como
 * un cuadrado; el horizontal se siente rectangular sin recortar contenido.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  className,
  onClick,
  active,
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  detail?: string;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      onClick={onClick}
      whileHover={onClick ? { y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={spring}
      className={cn(
        'flex items-center gap-4 rounded-tarjeta border px-5 py-4 text-left shadow-1',
        active ? 'border-accent bg-accent-soft' : 'border-hairline bg-surface-1',
        onClick && 'cursor-pointer hover:shadow-2',
        className
      )}
    >
      {Icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-fg">
          <Icon size={20} strokeWidth={1.75} />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-ui text-13 text-text-2">{label}</span>
        <span className="font-ui text-28 tabular-nums text-text-1">{value}</span>
        {detail && <span className="truncate font-ui text-12 text-text-3">{detail}</span>}
      </div>
    </Comp>
  );
}
