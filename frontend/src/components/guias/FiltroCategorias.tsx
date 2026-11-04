import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import type { CategoriaGuia } from '../../types';
import { cn } from '../../lib/cn';
import { springSnappy } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { alDia as copy } from '../../copy';
import { CATEGORIAS, ICONO_CATEGORIA } from './categorias';

/** "Todas" no es una categoría del modelo: es la ausencia de filtro. */
export type FiltroCategoria = CategoriaGuia | 'Todas';

/**
 * Filtro de categorías de la galería.
 *
 * No es un `SegmentedControl`: seis opciones dentro de una pista gris no caben
 * en un teléfono sin encogerse a un tamaño intocable. Aquí son chips que
 * scrollean en horizontal y conservan su target de 44 px en móvil.
 *
 * Lo que sí se hereda del segmented es la MECÁNICA: el realce del chip activo
 * es un `layoutId` que se DESPLAZA de una opción a otra, así que cambiar de
 * categoría se lee como un movimiento y no como dos estados sin relación.
 * Con reduced motion el mismo realce aparece sin recorrido: se elimina el
 * desplazamiento, nunca el feedback.
 *
 * El realce es `accent-soft` con tinta `accent-fg` y no relleno rojo sólido:
 * el relleno de marca está reservado a la acción primaria, y un filtro no lo es.
 */
export function FiltroCategorias({
  valor,
  onCambiar,
  etiqueta,
  className,
}: {
  valor: FiltroCategoria;
  onCambiar: (valor: FiltroCategoria) => void;
  /** Nombre accesible del grupo: sin él, los chips se anuncian sueltos. */
  etiqueta: string;
  className?: string;
}) {
  const reducido = useReducedMotion();
  const opciones: FiltroCategoria[] = ['Todas', ...CATEGORIAS];

  return (
    // El padding lateral compensa el margen negativo: sin él, el anillo de
    // foco del primer y del último chip quedaría recortado por el scroll.
    // `layoutScroll`: los chips scrollean en horizontal en móvil y la pastilla
    // de dentro es un `layoutId`. Framer mide en coordenadas de viewport, así
    // que si el navegador desplaza esta tira —por ejemplo al llevar el foco a un
    // chip medio fuera de vista— mientras la pastilla viaja, la pastilla
    // aterriza en el sitio equivocado o se queda a medias.
    <motion.div
      layoutScroll
      role="group"
      aria-label={etiqueta}
      className={cn('-mx-1 flex items-center gap-1 overflow-x-auto px-1 py-1', className)}
    >
      {opciones.map((opcion) => {
        const activa = opcion === valor;
        const Icono = opcion === 'Todas' ? LayoutGrid : ICONO_CATEGORIA[opcion];
        return (
          <button
            key={opcion}
            type="button"
            onClick={() => onCambiar(opcion)}
            aria-pressed={activa}
            className={cn(
              'relative flex h-11 shrink-0 items-center gap-1.5 rounded-control px-3 font-ui text-13 font-medium transition-colors duration-150 md:h-8',
              activa ? 'text-accent-fg' : 'text-text-2 hover:bg-bg hover:text-text-1'
            )}
          >
            {activa && (
              <motion.span
                aria-hidden
                layoutId="filtro-categoria-guias"
                transition={reducido ? { duration: 0 } : springSnappy}
                className="absolute inset-0 rounded-control bg-accent-soft"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icono size={14} strokeWidth={2} />
              {opcion === 'Todas' ? copy.todasCategorias : opcion}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}
