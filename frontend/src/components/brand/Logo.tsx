import { cn } from '../../lib/cn';
import { marca } from '../../copy';
import logoAurora from '../../assets/aurora-cdmx.png';

/**
 * Logotipo oficial de la Universidad Aurora Ciudad de México, usado con
 * autorización.
 *
 * Se renderiza como imagen y **nunca** se recompone: el Manual de Identidad
 * Gráfica 2024 prohíbe redibujarlo, recortarlo, separar "AURORA" de "CIUDAD DE
 * MÉXICO", cambiarle el color o encimarlo sobre un fondo de color. El archivo
 * trae su propia caja roja, así que aquí no se le pone `bg-accent` detrás ni se
 * le aplican filtros: se escala y ya.
 *
 * Por eso el tamaño se controla solo por altura y el ancho va `auto` — fijar
 * los dos lados es la forma más fácil de deformarlo sin darse cuenta.
 */
const ALTURAS = {
  sm: 'h-7', // cabecera
  md: 'h-9',
  lg: 'h-14', // login
} as const;

export function Logo({
  className,
  tamano = 'md',
  alt = marca.universidad,
}: {
  className?: string;
  tamano?: keyof typeof ALTURAS;
  /** Vacío cuando el logo va junto a un texto que ya nombra a la institución:
   *  repetirlo obliga al lector de pantalla a oír la marca dos veces. */
  alt?: string;
}) {
  return (
    <img
      src={logoAurora}
      alt={alt}
      className={cn('w-auto select-none object-contain', ALTURAS[tamano], className)}
      draggable={false}
    />
  );
}

/** Marca en línea para cabeceras: logotipo institucional + nombre del producto.
 *  El filete separa dos marcas distintas — la universidad no "es" el producto. */
export function MarcaProducto({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Logo tamano="sm" alt="" />
      <span aria-hidden className="h-5 w-px shrink-0 bg-hairlineStrong" />
      {/* El nombre sale de `copy.marca`, no escrito aquí: es la marca del
          producto y tiene que cambiar en un solo sitio. El logotipo de la
          Universidad NO cambia — son dos marcas distintas, y el filete de en
          medio existe justo para decirlo. */}
      <span className="whitespace-nowrap font-ui text-14 font-semibold text-text-1">{marca.nombre}</span>
    </span>
  );
}
