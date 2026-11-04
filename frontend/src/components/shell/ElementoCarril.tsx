import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { dur, ease, springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { AyudaEmergente } from './AyudaEmergente';

/**
 * Una fila del carril: el identificador visual mínimo, centrado, con su ayuda
 * emergente y la misma marca de selección que la lista desplegada.
 *
 * Existe para que las cuatro pantallas no reinventen la diana, el marcado del
 * elemento activo ni el nombre accesible. Lo ÚNICO que cambia entre ellas es el
 * dibujo de dentro: unas iniciales, un icono de categoría, una etiqueta MD/PDF.
 *
 * `h-11` (44 px) no es decorativo: es la diana mínima del manual, y en un
 * carril donde el elemento mide 32 px es lo que separa "apuntar" de "pulsar".
 */
export function ElementoCarril({
  etiqueta,
  activo = false,
  lado = 'izquierda',
  idSeleccion,
  onClick,
  children,
}: {
  /** Nombre completo. Va al `aria-label` y a la ayuda emergente; admite saltos de línea. */
  etiqueta: string;
  activo?: boolean;
  /** Lado del panel: decide hacia dónde sale la ayuda y dónde va la marca. */
  lado?: 'izquierda' | 'derecha';
  /**
   * `layoutId` de la marca de selección. Con él, la marca se DESLIZA de una
   * fila a otra igual que en la lista desplegada. Tiene que ser único por
   * carril: dos marcas con el mismo identificador vivas a la vez se emparejan
   * y una de ellas anima desde una caja que no le corresponde.
   */
  idSeleccion?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const reducido = useReducedMotion();

  return (
    <li className="relative">
      {activo && idSeleccion && (
        <motion.span
          layoutId={idSeleccion}
          // `springSnappy`, la física de todos los indicadores de selección
          // deslizantes del sistema (Tabs, SegmentedControl, las dos listas).
          transition={reducido ? { duration: dur.fast, ease } : springSnappy}
          className={cn(
            'absolute inset-y-1 z-10 w-[3px] rounded-full bg-accent',
            lado === 'izquierda' ? 'left-0' : 'right-0'
          )}
          aria-hidden
        />
      )}
      <AyudaEmergente texto={etiqueta} lado={lado === 'izquierda' ? 'derecha' : 'izquierda'}>
        <button
          type="button"
          onClick={onClick}
          aria-label={etiqueta}
          aria-current={activo ? 'true' : undefined}
          className={cn(
            'flex h-11 w-full items-center justify-center rounded-celda transition-colors duration-150',
            'focus-visible:relative focus-visible:z-20',
            activo ? 'bg-accent-soft' : 'hover:bg-bg'
          )}
        >
          {children}
        </button>
      </AyudaEmergente>
    </li>
  );
}

/** Lista del carril. Un solo sitio donde vive la separación entre elementos. */
export function ListaCarril({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col gap-0.5">{children}</ul>;
}
