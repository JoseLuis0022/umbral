import { Skeleton } from '../../ui';
import { cn } from '../../../lib/cn';

/**
 * Los esqueletos replican la ALTURA REAL de lo que sustituyen —fila de lista,
 * bloque de pregunta, párrafos de respuesta y rejilla de métricas— para que el layout
 * no brinque cuando llegan los datos. Un esqueleto de otra altura es peor que
 * no poner nada.
 */

export function EsqueletoLista({ filas = 6 }: { filas?: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-hairline px-4 py-3">
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              {/* Anchos alternos: un esqueleto con todas las barras iguales se
                  lee como una tabla vacía, no como contenido en camino. */}
              <Skeleton className={cn('h-3.5', i % 3 === 0 ? 'w-40' : i % 3 === 1 ? 'w-32' : 'w-44')} />
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className={cn('h-3.5', i % 2 === 0 ? 'w-full' : 'w-3/4')} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Misma estructura que `DetalleConsulta`: identidad, pregunta, respuesta y métricas. */
export function EsqueletoDetalle() {
  return (
    <div aria-hidden className="flex flex-col gap-6 px-5 py-6 lg:px-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-16 w-full rounded-tarjeta" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="border-t border-dashed border-hairlineStrong" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
