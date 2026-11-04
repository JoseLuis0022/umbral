import { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';

export type TabItem = { value: string; label: string };

// Tabs con subrayado deslizante — deliberadamente distinto del
// SegmentedControl (pastilla): tabs navegan entre secciones de una pantalla,
// el segmented filtra el mismo contenido. Formas distintas, funciones distintas.
export function Tabs({
  items,
  value,
  onChange,
  layoutId,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  layoutId?: string;
  className?: string;
}) {
  // El identificador por defecto es ÚNICO por instancia, no una constante
  // global. Con una constante, dos Tabs en la misma pantalla que no pasaran el
  // prop compartían indicador y el subrayado se teletransportaba de un control
  // al otro. Quien SÍ quiera compartirlo sigue pudiendo pasarlo a mano.
  const propio = useId();
  const idIndicador = layoutId ?? propio;
  const reducido = useReducedMotion();

  return (
    <div className={cn('flex items-center gap-6 border-b border-hairline', className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative pb-3 font-ui text-13 font-medium transition-colors duration-150',
              active ? 'text-accent-fg' : 'text-text-2 hover:text-text-1'
            )}
          >
            {item.label}
            {active && (
              <motion.span
                layoutId={idIndicador}
                // Las animaciones de `layout` son transforms de JS: ni la regla
                // global de CSS ni `MotionConfig` las alcanzan, así que la
                // preferencia hay que consultarla aquí. El subrayado sigue
                // apareciendo en la pestaña nueva; lo que se pierde es el viaje.
                transition={reducido ? { duration: dur.fast, ease } : springSnappy}
                className="absolute -bottom-px left-0 right-0 h-[2px] bg-accent"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
