import { LayoutGrid } from 'lucide-react';
import type { CategoriaGuia } from '../../types';
import { cn } from '../../lib/cn';
import { CLASES_CATEGORIA, ICONO_CATEGORIA } from './categorias';

/**
 * Icono de la categoría en su color, o la retícula neutra para "Todas".
 *
 * Existe porque los selectores propios SÍ pueden pintar dentro de una opción, y
 * un `<select>` nativo no: con esta marca la categoría se reconoce por forma y
 * color antes de leerla. El mismo distintivo aparece en el filtro, en el editor
 * y en la fila de cada boletín, así que las tres piezas hablan el mismo idioma.
 *
 * Las clases de color vienen escritas COMPLETAS de `categorias.ts` porque el
 * JIT de Tailwind escanea texto plano: una clase armada con plantilla no se
 * genera y el color desaparecería sin ningún error visible.
 */
export function MarcaCategoria({
  categoria,
  tamano = 24,
}: {
  /** `null` = "Todas": la ausencia de filtro, que no es una categoría. */
  categoria: CategoriaGuia | null;
  tamano?: number;
}) {
  const Icono = categoria ? ICONO_CATEGORIA[categoria] : LayoutGrid;
  return (
    <span
      aria-hidden
      style={{ width: tamano, height: tamano }}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-celda',
        categoria ? CLASES_CATEGORIA[categoria] : 'bg-bg text-text-3'
      )}
    >
      <Icono size={tamano >= 28 ? 15 : 13} strokeWidth={2} />
    </span>
  );
}
