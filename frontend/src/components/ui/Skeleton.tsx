import { cn } from '../../lib/cn';

/**
 * Skeleton con barrido de gradiente, SOLO para listas y tablas: contenido
 * cuya forma se conoce de antemano. La respuesta de un agente no es eso —no se
 * sabe cuánto medirá— y su espera es `PensandoUmbral` (components/chat).
 * SIEMPRE se le pasa la altura real del
 * contenido final: es lo que mantiene CLS ≈ 0 y hace que el layout no brinque
 * al llegar los datos. Un skeleton de altura distinta al contenido real es
 * peor que no poner nada.
 *
 * Con prefers-reduced-motion el CSS global reduce el barrido automáticamente.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-celda bg-tinta/[.06]',
        // Barrido más lento y más tenue que antes (1,8 s, blanco al 35 %): se
        // nota que carga sin parpadear.
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_cubic-bezier(0.4,0,0.2,1)_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent',
        className
      )}
    />
  );
}

export function SkeletonRow({ columns = 6 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-hairline px-5 py-4">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}
