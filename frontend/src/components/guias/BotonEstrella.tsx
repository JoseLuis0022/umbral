import { useEffect, useRef, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { alDia as copy } from '../../copy';

/**
 * Contador de estrellas al estilo GitHub: el número que se ve YA INCLUYE tu
 * voto, y el botón es a la vez indicador y control.
 *
 * Dos animaciones, ambas de respuesta directa a un clic (no decorativas):
 *
 *  - La estrella da un rebote corto al votar. Al quitar el voto no rebota:
 *    quitar algo no se celebra.
 *  - La cifra rueda en la dirección del cambio — sube al votar, baja al
 *    revertir. Esa dirección es lo que hace legible el rollback de un voto
 *    que falló: se ve que el número REGRESA, no que cambió otra vez.
 *
 * El botón vive dentro de una tarjeta que es un enlace, así que detiene la
 * propagación del clic; sin eso, votar navegaría al detalle.
 */
export function BotonEstrella({
  estrellas,
  votada,
  titulo,
  onToggle,
  className,
}: {
  estrellas: number;
  votada: boolean;
  /** Título de la guía: entra en el nombre accesible del botón. */
  titulo: string;
  onToggle: () => void;
  className?: string;
}) {
  const reducido = useReducedMotion();

  // Se lee en render para saber hacia dónde rueda la cifra ANTES de pintarla;
  // un estado obligaría a un render extra y la cifra entraría por el lado
  // equivocado en el primer frame.
  const anterior = useRef(estrellas);
  const direccion = estrellas >= anterior.current ? 1 : -1;
  useEffect(() => {
    anterior.current = estrellas;
  }, [estrellas]);

  function manejarClic(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    onToggle();
  }

  return (
    <button
      type="button"
      onClick={manejarClic}
      aria-pressed={votada}
      aria-label={`${copy.votar}: ${titulo}`}
      title={votada ? copy.quitarVoto : copy.votar}
      className={cn(
        'inline-flex h-11 shrink-0 items-center gap-2 rounded-control border px-3 font-ui text-13 font-medium transition-colors duration-150 md:h-8',
        votada
          ? 'border-accent/30 bg-accent-soft text-accent-fg'
          : 'border-hairline bg-surface-1 text-text-2 hover:border-hairlineStrong hover:text-text-1',
        className
      )}
    >
      <motion.span
        aria-hidden
        className="flex items-center"
        // Los keyframes necesitan una curva con duración, no un spring: un
        // spring no puede ir y volver a 1 en un solo tramo.
        animate={{ scale: votada && !reducido ? [1, 1.3, 1] : 1 }}
        transition={{ duration: dur.slow, ease: [...ease] }}
      >
        <Star size={14} strokeWidth={2} fill={votada ? 'currentColor' : 'none'} />
      </motion.span>

      {/* Alto y ancho fijos: la cifra rueda dentro de su propia ventana y el
          resto del botón no se mueve un pixel al cambiar de 99 a 100. */}
      <span className="relative block h-[18px] min-w-[3ch] overflow-hidden text-right tabular-nums">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={estrellas}
            initial={reducido ? { opacity: 0 } : { y: direccion * 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reducido ? { opacity: 0 } : { y: direccion * -18, opacity: 0 }}
            transition={springSnappy}
            className="block"
          >
            {estrellas.toLocaleString('es-MX')}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
