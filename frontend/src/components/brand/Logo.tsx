import { cn } from '../../lib/cn';
import { marca } from '../../copy';

/**
 * Monograma del producto: la inicial de `copy.marca.nombre` sobre una placa en
 * `bg-accent`. No es un archivo de imagen a propósito — vive en los tokens, así
 * que un cambio de colorimetría en src/index.css lo repinta junto con el resto.
 *
 * La placa se dimensiona por los dos lados (es cuadrada por diseño) y el radio
 * sale de la escala nombrada: `celda` en tamaños chicos, `control` en el de login.
 */
const TAMANOS = {
  sm: 'h-7 w-7 rounded-celda text-14', // cabecera
  md: 'h-9 w-9 rounded-control text-15',
  lg: 'h-14 w-14 rounded-control text-22', // login
} as const;

export function Logo({
  className,
  tamano = 'md',
  alt = marca.nombre,
}: {
  className?: string;
  tamano?: keyof typeof TAMANOS;
  /** Vacío cuando el monograma va junto a un texto que ya nombra al producto:
   *  repetirlo obliga al lector de pantalla a oír la marca dos veces. */
  alt?: string;
}) {
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center bg-accent font-ui font-semibold leading-none text-white shadow-1',
        TAMANOS[tamano],
        className
      )}
    >
      {marca.nombre.charAt(0)}
    </span>
  );
}

/** Marca en línea para cabeceras: monograma + nombre del producto. */
export function MarcaProducto({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Logo tamano="sm" alt="" />
      {/* El nombre sale de `copy.marca`, no escrito aquí: es la marca del
          producto y tiene que cambiar en un solo sitio. En teléfono basta el
          monograma: el ancho hace falta para la navegación. */}
      <span className="hidden whitespace-nowrap sm:inline font-ui text-14 font-semibold text-text-1">{marca.nombre}</span>
    </span>
  );
}
