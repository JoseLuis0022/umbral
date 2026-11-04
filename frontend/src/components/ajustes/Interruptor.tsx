import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { springSnappy } from '../../lib/motion';

/**
 * Interruptor de encendido/apagado.
 *
 * El botón es la ZONA TÁCTIL y la pista es un hijo suyo, no al revés: así el
 * ajuste de "objetivos táctiles amplios" puede estirar el botón a 44 px sin
 * deformar la pista, que se queda de 44×26 y centrada.
 *
 * Radio: `rounded-full`, no `rounded-pastilla`. Se ven igual, pero la pastilla
 * está reservada a StatusPill — es lo que la hace reconocible como estatus sin
 * leerla, y un interruptor no es un estatus.
 */
export function Interruptor({
  encendido,
  onChange,
  etiquetadoPor,
  descritoPor,
}: {
  encendido: boolean;
  onChange: (valor: boolean) => void;
  /** id del título de la fila: el interruptor no tiene texto propio. */
  etiquetadoPor: string;
  descritoPor?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={encendido}
      aria-labelledby={etiquetadoPor}
      aria-describedby={descritoPor}
      onClick={() => onChange(!encendido)}
      className="inline-flex shrink-0 items-center justify-center rounded-control p-1"
    >
      <span
        className={cn(
          'relative block h-[26px] w-11 rounded-full transition-colors duration-150',
          encendido ? 'bg-accent' : 'bg-aurora-piedra-300'
        )}
      >
        <motion.span
          // 44 − 3 − 3 − 20 = 18 px de recorrido. El spring es el mismo de
          // toda la app para presses y toggles.
          animate={{ x: encendido ? 18 : 0 }}
          transition={springSnappy}
          className="absolute left-[3px] top-[3px] block h-5 w-5 rounded-full bg-white shadow-1"
        />
      </span>
    </button>
  );
}
