import { Skeleton } from '../../ui';

/**
 * Esqueletos de la pantalla de boletines.
 *
 * Cada bloque mide lo mismo que el contenido que va a sustituir: es lo que
 * mantiene CLS ≈ 0 y evita que el layout brinque al llegar los datos. Un
 * esqueleto con otra altura es peor que no poner nada.
 */
export function EsqueletoLista() {
  return (
    <ul aria-hidden className="flex flex-col">
      {Array.from({ length: 7 }).map((_, i) => (
        <li key={i} className="flex flex-col gap-2 border-b border-hairline px-4 py-3 last:border-b-0">
          <Skeleton className="h-4 w-[85%]" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-24 rounded-celda" />
            <Skeleton className="h-3 w-20" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EsqueletoEditor() {
  return (
    <div aria-hidden className="flex flex-col gap-6 p-5">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-24" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[132px] w-full rounded-tarjeta" />
        ))}
      </div>
    </div>
  );
}
