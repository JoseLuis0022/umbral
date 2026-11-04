import { Skeleton } from '../../ui';
import { cn } from '../../../lib/cn';

/**
 * Los esqueletos replican la ALTURA REAL de lo que sustituyen —fila de 82 px,
 * barra de análisis de 73 px, burbujas de tres renglones— para que el layout
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

export function EsqueletoDetalle() {
  return (
    <div aria-hidden className="flex flex-col">
      <div className="flex flex-col gap-4 border-b border-hairline px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <Skeleton className="h-6 w-64 max-w-full" />
        <div className="flex shrink-0 gap-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-control" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* `gap-6` y no `gap-8`, y con la fila de identidad delante: son las dos
          medidas que el contenido real tiene (ver DetalleConversacion) y que
          este esqueleto no reservaba. Faltaban ~60 px de alto y 8 px por cada
          separación, así que al llegar los datos el panel entero se recolocaba
          hacia abajo justo cuando el ojo ya estaba leyendo. */}
      <div className="flex flex-col gap-6 px-5 py-6 lg:px-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        <div className="border-t border-dashed border-hairlineStrong" />

        <div className="flex flex-col gap-5">
          {[false, true, false].map((esPersona, i) => (
            <div key={i} className={cn('flex gap-3', esPersona ? 'flex-row-reverse' : 'flex-row')}>
              <Skeleton className="mt-0.5 h-8 w-8 shrink-0 rounded-full" />
              <div className={cn('flex w-full max-w-[min(680px,88%)] flex-col gap-1', esPersona && 'items-end')}>
                <Skeleton className="h-3 w-32" />
                <Skeleton className={cn('w-full rounded-tarjeta', esPersona ? 'h-16' : 'h-28')} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
