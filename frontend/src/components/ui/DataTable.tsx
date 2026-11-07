import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { dur, ease, retardoEscalonado } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';

// Anchos variados para que el skeleton de celdas lea como datos reales
// (folios, nombres y fechas tienen largos distintos) en vez de barras iguales.
const CELL_WIDTHS = ['w-16', 'w-24', 'w-20', 'w-28', 'w-14', 'w-20'];

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  mono?: boolean;
  align?: 'left' | 'right';
  width?: number | string;
  /** En móvil, esta columna es el título de la tarjeta (default: la primera). */
  cardTitle?: boolean;
  /** En móvil, esta columna no se muestra. */
  cardHidden?: boolean;
};

type Variant = 'lines' | 'zebra' | 'minimal';

// El fondo de fila se computa aparte porque la celda sticky (primera columna)
// necesita el MISMO fondo explícito que la fila: si queda transparente, al
// hacer scroll horizontal se ve el contenido de otras columnas a través de ella.
function rowBg(variant: Variant, ri: number) {
  if (variant === 'zebra') return ri % 2 === 1 ? 'bg-bg' : 'bg-surface-1';
  return 'bg-surface-1';
}

const HEADER_CLASSES: Record<Variant, string> = {
  lines: 'bg-surface-2 border-b border-hairlineStrong shadow-1',
  minimal: 'bg-surface-2 border-b border-hairline',
  zebra: 'bg-surface-2 border-b border-hairline',
};

/**
 * DataTable — la pieza central del sistema. Con UNA sola definición de
 * columnas renderiza dos cosas distintas:
 *
 *  - ≥768px: una <table> real, con encabezado sticky, primera columna sticky y
 *    scroll horizontal contenido en su propio overflow (el body nunca scrollea).
 *  - <768px: lista de tarjetas apiladas con pares etiqueta/valor. Ningún campo
 *    se pierde en móvil; se reacomodan, no se ocultan.
 *
 * El estado `loading` reutiliza el encabezado REAL (los títulos de columna no
 * dependen de los datos, ya se conocen) y solo sustituye el contenido de las
 * celdas: cero salto de layout cuando llegan los datos.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey = (row: T, i: number) => (row as { id?: string | number })?.id ?? i,
  state = 'idle',
  variant = 'lines',
  onRetry,
  emptyState,
  skeletonRows = 7,
  className,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey?: (row: T, i: number) => string | number;
  state?: 'idle' | 'loading' | 'empty' | 'error';
  variant?: Variant;
  onRetry?: () => void;
  emptyState?: { title?: string; description?: string; action?: ReactNode };
  skeletonRows?: number;
  className?: string;
  onRowClick?: (row: T) => void;
}) {
  const reducido = useReducedMotion();

  if (state === 'error') {
    return (
      <div className={cn('rounded-tarjeta border border-hairline bg-surface-1', className)}>
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  const isLoading = state === 'loading';

  if (state === 'empty' || (!isLoading && rows.length === 0)) {
    return (
      <div className={cn('rounded-tarjeta border border-hairline bg-surface-1', className)}>
        <EmptyState title="Sin resultados" {...emptyState} />
      </div>
    );
  }

  const titleCol = columns.find((c) => c.cardTitle) ?? columns[0];
  const restCols = columns.filter((c) => c !== titleCol && !c.cardHidden);
  const displayRows: Array<T | undefined> = isLoading ? Array.from({ length: skeletonRows }) : rows;

  return (
    <>
      {/* Escritorio y tablet: tabla real */}
      <div className={cn('hidden overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 md:block', className)}>
        {/* `layoutScroll`: las filas llevan `layout="position"` y este es su
            contenedor con scroll. Framer mide en coordenadas de viewport; sin
            el aviso, ordenar una tabla desplazada en horizontal recoloca las
            filas contra una referencia equivocada. */}
        <motion.div layoutScroll className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-max border-collapse">
            <thead className={cn('sticky top-0 z-10', HEADER_CLASSES[variant])}>
              <tr>
                {columns.map((col, i) => (
                  <th
                    key={col.key}
                    style={{ width: col.width }}
                    className={cn(
                      'whitespace-nowrap px-5 py-3.5 text-left font-ui text-[11px] font-semibold uppercase tracking-wide text-text-3',
                      i === 0 && cn('sticky left-0 z-20', HEADER_CLASSES[variant]),
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            {/* Sin `AnimatePresence` alrededor de las filas, y es la corrección de un
                salto visible, no un ahorro de frames.

                Los esqueletos y las filas reales tienen claves distintas, así que al
                llegar los datos AnimatePresence mantenía montados los siete esqueletos
                —desvaneciéndose— MIENTRAS entraban las filas nuevas: durante ese tercio
                de segundo la tabla medía las dos cosas a la vez, crecía y volvía a
                encogerse. Un salto de layout justo en el momento en que el usuario mira
                la tabla. Sin presencia diferida, el esqueleto se va en el mismo frame en
                que entra el dato.

                Lo que se pierde es el fundido de SALIDA de una fila borrada; lo que lo
                sustituye es el `layout` de las filas de abajo subiendo a ocupar el
                hueco, que además explica mejor lo que acaba de pasar. */}
            <tbody>
              {displayRows.map((row, ri) => (
                <motion.tr
                  key={isLoading ? `skeleton-${ri}` : rowKey(row as T, ri)}
                  // `layout="position"` y no `layout` a secas: al ordenar o filtrar, una
                  // fila solo cambia de SITIO. El layout completo mide además su tamaño
                  // y aplica una corrección de escala inversa a cada celda — trabajo por
                  // fila y por render para animar algo que no se mueve, y que de paso
                  // deforma el texto de las celdas durante el viaje.
                  // Con movimiento reducido no viaja: aparece ya recolocada.
                  layout={!isLoading && !reducido ? 'position' : false}
                  // Sin aparición al montar (era parpadeo al volver a la pantalla).
                  initial={false}
                  animate={{ opacity: 1, transition: { delay: retardoEscalonado(ri), duration: dur.fast, ease } }}
                  onClick={() => !isLoading && onRowClick?.(row as T)}
                  className={cn(
                    'group transition-colors duration-150',
                    variant === 'lines' && 'border-t border-hairlineStrong',
                    !isLoading && rowBg(variant, ri),
                    !isLoading && 'hover:bg-accent-soft/60',
                    !isLoading && onRowClick && 'cursor-pointer'
                  )}
                >
                  {columns.map((col, ci) => (
                    <td
                      key={col.key}
                      className={cn(
                        'whitespace-nowrap px-5 py-4 font-ui text-13 text-text-1',
                        ci === 0 && cn('sticky left-0 z-[5] group-hover:bg-accent-soft/60', rowBg(variant, ri)),
                        col.mono && 'font-mono tabular-nums',
                        col.align === 'right' && 'text-right'
                      )}
                    >
                      {isLoading ? (
                        <Skeleton className={cn('h-4', CELL_WIDTHS[(ri + ci) % CELL_WIDTHS.length])} />
                      ) : col.render ? (
                        col.render(row as T)
                      ) : (
                        ((row as Record<string, ReactNode>)[col.key])
                      )}
                    </td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>

      {/* Móvil: tarjetas apiladas — misma definición de columnas, cero campos perdidos */}
      <div className="flex flex-col gap-3 md:hidden">
        {displayRows.map((row, ri) => (
          <motion.div
            key={isLoading ? `skeleton-${ri}` : rowKey(row as T, ri)}
            layout={!isLoading && !reducido ? 'position' : false}
            initial={false}
            // Misma duración y misma curva que la tabla de escritorio. Antes esta
            // rama no declaraba ninguna de las dos y caía en el tween por defecto
            // de Framer (0.3 s, otra curva): la MISMA tabla se veía entrar distinto
            // según el ancho de la ventana.
            animate={{ opacity: 1, transition: { delay: retardoEscalonado(ri), duration: dur.fast, ease } }}
            onClick={() => !isLoading && onRowClick?.(row as T)}
            className={cn(
              'rounded-tarjeta border border-hairline bg-surface-1 p-5 shadow-1',
              !isLoading && onRowClick && 'cursor-pointer active:scale-[0.99]'
            )}
          >
            {isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-1/3" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {restCols.map((col) => (
                    <Skeleton key={col.key} className="h-3 w-2/3" />
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className={cn('font-ui text-15 font-medium text-text-1', titleCol.mono && 'font-mono')}>
                    {titleCol.render ? titleCol.render(row as T) : (row as Record<string, ReactNode>)[titleCol.key]}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {restCols.map((col) => (
                    <div key={col.key} className="flex flex-col gap-0.5">
                      <dt className="font-ui text-12 text-text-3">{col.header}</dt>
                      <dd className={cn('font-ui text-13 text-text-1', col.mono && 'font-mono tabular-nums')}>
                        {col.render ? col.render(row as T) : (row as Record<string, ReactNode>)[col.key]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </>
  );
}
