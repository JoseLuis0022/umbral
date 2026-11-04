import { Skeleton } from '../ui';

/**
 * Esqueleto del detalle de una guía, con las alturas REALES del contenido:
 * 34 px por renglón de título (text-28),
 * 22 px por renglón de resumen y de
 * cuerpo (text-15), 18 px por renglón de metadatos (text-13).
 *
 * Se dibujan tres pasos, que es la mediana de las guías publicadas. Con menos,
 * el salto al llegar los datos se nota; con más, la página se estira y luego
 * se encoge, que es peor.
 *
 * `conCabecera={false}` sirve al estado PARCIAL: cuando se llega desde una
 * tarjeta, el título, la categoría y el conteo de estrellas ya se conocen y se
 * pintan de inmediato; solo el cuerpo sigue cargando. Repetir un esqueleto
 * encima de un título que ya está en pantalla lo borraría para volver a
 * escribirlo medio segundo después.
 */
export function EsqueletoDetalle({ conCabecera = true }: { conCabecera?: boolean } = {}) {
  return (
    <div className="mx-auto w-full flex max-w-[44rem] flex-col">
      {conCabecera && (
        <>
          <Skeleton className="h-8 w-28 rounded-control" />

          <div className="mt-6">
            <Skeleton className="h-7 w-32 rounded-celda" />
            <Skeleton className="mt-4 h-[34px] w-full" />
            <Skeleton className="mt-2 h-[34px] w-3/4" />
            <Skeleton className="mt-4 h-[22px] w-11/12" />
            <div className="mt-6 flex items-center justify-between">
              <Skeleton className="h-[18px] w-28" />
              <Skeleton className="h-11 w-[76px] rounded-control md:h-8" />
            </div>
          </div>
        </>
      )}

      <div className={conCabecera ? 'mt-8 rounded-tarjeta border border-hairline bg-surface-1 p-5' : 'rounded-tarjeta border border-hairline bg-surface-1 p-5'}>
        <Skeleton className="h-[22px] w-40" />
        <Skeleton className="mt-4 h-[22px] w-full" />
        <Skeleton className="mt-2 h-[22px] w-5/6" />
        <Skeleton className="mt-2 h-[22px] w-4/6" />
      </div>

      <div className="mt-10 flex flex-col gap-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-[22px] w-2/3" />
              <Skeleton className="mt-3 h-[22px] w-full" />
              <Skeleton className="mt-2 h-[22px] w-full" />
              <Skeleton className="mt-2 h-[22px] w-3/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
