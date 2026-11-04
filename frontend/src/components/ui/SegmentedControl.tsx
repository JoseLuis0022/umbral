import type { ReactNode } from 'react';
import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';

export type SegmentedOption = { value: string; label: string; icon?: ReactNode };

/**
 * Segmented control: pista gris con pastilla BLANCA + sombra en el activo,
 * nunca relleno sólido de color. El relleno de marca se reserva para acciones
 * primarias; si un filtro también fuera rojo, dejaría de haber una sola
 * llamada a la acción en la pantalla.
 *
 * La pastilla se desplaza con layoutId, así que el cambio de opción se ve como
 * un movimiento y no como dos estados sin relación.
 */
export function SegmentedControl({
  options,
  value,
  onChange,
  layoutId,
  className,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  layoutId?: string;
  className?: string;
}) {
  // Identificador único por instancia: ver la nota equivalente en Tabs.tsx.
  const propio = useId();
  const idIndicador = layoutId ?? propio;
  const reducido = useReducedMotion();

  return (
    // self-start: si el padre es flex-col, `align-items: stretch` haría que
    // este control ocupara todo el ancho pese a ser inline-flex.
    <div
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-0.5 self-start rounded-tarjeta border border-hairline bg-bg p-1',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-full px-3 py-1.5 font-ui text-13 font-medium transition-colors duration-150',
              active ? 'text-text-1' : 'text-text-2 hover:text-text-1'
            )}
          >
            {active && (
              <motion.span
                layoutId={idIndicador}
                // `layout` no lo cubre la red de CSS ni MotionConfig: la
                // preferencia se consulta aquí. La pastilla aparece igual en la
                // opción nueva, solo deja de recorrer el camino.
                transition={reducido ? { duration: dur.fast, ease } : springSnappy}
                className="absolute inset-0 rounded-full bg-surface-1 shadow-1"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
