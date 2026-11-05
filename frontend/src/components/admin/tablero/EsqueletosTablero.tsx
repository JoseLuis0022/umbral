import { Card, Skeleton } from '../../ui';
import { cn } from '../../../lib/cn';

/**
 * Los esqueletos replican la GEOMETRÍA real de lo que sustituyen —tarjeta de
 * KPI de 44 px de badge, lienzo de gráfica de 220 px— para que
 * el tablero no brinque cuando llegan los datos. Un esqueleto de otra altura
 * es peor que no poner nada.
 */

export function EsqueletoKpis() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-tarjeta border border-hairline bg-surface-1 px-5 py-4 shadow-1"
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-control" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            {/* Anchos alternos: cuatro barras idénticas se leen como una tabla
                vacía, no como cifras en camino. */}
            <Skeleton className={cn('h-6', i % 3 === 0 ? 'w-24' : i % 3 === 1 ? 'w-16' : 'w-20')} />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

function CabeceraFalsa() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56" />
    </div>
  );
}

export function EsqueletoSerie() {
  return (
    <Card className="p-5">
      <div aria-hidden className="flex flex-col gap-4">
        <CabeceraFalsa />
        <Skeleton className="h-[220px] w-full rounded-tarjeta" />
      </div>
    </Card>
  );
}

export function EsqueletoAreas() {
  return (
    <Card className="p-5">
      <div aria-hidden className="flex flex-col gap-4">
        <CabeceraFalsa />
        <div className="flex flex-col gap-4">
          {/* Barras decrecientes: el gráfico real siempre llega ordenado de
              mayor a menor, y un esqueleto de barras iguales prometería otra
              forma. */}
          {['w-[92%]', 'w-[68%]', 'w-[47%]', 'w-[28%]'].map((anchoBarra) => (
            <div key={anchoBarra} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Skeleton className="h-3.5 w-48 max-w-[60%]" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <div className="h-3 w-full overflow-hidden rounded-celda bg-bg">
                <Skeleton className={cn('h-full rounded-celda', anchoBarra)} />
              </div>
              <Skeleton className="h-2.5 w-40" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
