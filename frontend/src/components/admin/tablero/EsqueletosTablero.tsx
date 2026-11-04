import { Card, Skeleton } from '../../ui';
import { cn } from '../../../lib/cn';

/**
 * Los esqueletos replican la GEOMETRÍA real de lo que sustituyen —tarjeta de
 * KPI de 44 px de badge, lienzo de gráfica de 220 px, dona de 168 px— para que
 * el tablero no brinque cuando llegan los datos. Un esqueleto de otra altura
 * es peor que no poner nada.
 */

export function EsqueletoKpis() {
  return (
    <div aria-hidden className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-tarjeta border border-hairline bg-surface-1 px-5 py-4 shadow-1"
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-control" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-20" />
            {/* Anchos alternos: cinco barras idénticas se leen como una tabla
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

export function EsqueletoRiesgo() {
  return (
    <Card className="p-5">
      <div aria-hidden className="flex flex-col gap-4">
        <CabeceraFalsa />
        {/* `sm:items-center` y `lg:gap-5` copiados del contenido real
            (DonutRiesgo): sin ellos el esqueleto separaba 24 px donde el dato
            separa 20, y la tarjeta daba un salto de 4 px al cargar. */}
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6 lg:flex-col lg:gap-5">
          <Skeleton className="h-[168px] w-[168px] shrink-0 rounded-full" />
          <div className="flex w-full flex-col gap-2.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
