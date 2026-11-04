import { cn } from '../../lib/cn';
import { marca } from '../../copy';

/**
 * Isotipo del producto: una "M" dibujada como un grafo de tres nodos.
 *
 * Los picos y el valle de la M son los nodos; las líneas, los pasos entre
 * ellos. Es el agentic loop en una imagen: el agente va de un paso a otro
 * (leer el índice → ir al resumen → responder). El nodo del valle lleva un halo:
 * es el "paso activo".
 *
 * No es un archivo de imagen a propósito: la placa sale de `--accent` y
 * `--accent-strong`, y el trazo es `currentColor`, así que un cambio de
 * colorimetría en src/index.css lo repinta junto con el resto. El favicon
 * (public/favicon.svg) es el mismo dibujo SIN el halo y con los colores
 * escritos: el navegador lo pinta fuera de la app, y a 16 px el halo es ruido.
 *
 * Probado a 16, 28, 36, 56 y 112 px: el halo es lo primero que se pierde en
 * tamaños chicos, y por diseño puede perderse sin que la M deje de leerse.
 */
const TAMANOS = {
  sm: 'h-7 w-7 rounded-celda', // cabecera
  md: 'h-9 w-9 rounded-control',
  lg: 'h-14 w-14 rounded-control', // login
} as const;

/** El dibujo, sin placa. Rejilla de 24: picos en (5,6) y (19,6), valle en (12,16). */
export function IsotipoUmbral({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M5 19.5V6l7 10L19 6v13.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="16" r="4.6" fill="none" stroke="currentColor" strokeWidth={1.2} opacity={0.38} />
      <circle cx="5" cy="6" r="2.1" fill="currentColor" />
      <circle cx="19" cy="6" r="2.1" fill="currentColor" />
      <circle cx="12" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  className,
  tamano = 'md',
  alt = marca.nombre,
}: {
  className?: string;
  tamano?: keyof typeof TAMANOS;
  /** Vacío cuando el isotipo va junto a un texto que ya nombra al producto:
   *  repetirlo obliga al lector de pantalla a oír la marca dos veces. */
  alt?: string;
}) {
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center text-white shadow-1',
        TAMANOS[tamano],
        className
      )}
      // Degradado diagonal entre los dos azules de marca: da volumen sin
      // inventar un color nuevo.
      style={{ backgroundImage: 'linear-gradient(135deg, var(--accent), var(--accent-strong))' }}
    >
      <IsotipoUmbral className="h-[72%] w-[72%]" />
    </span>
  );
}

/** Marca en línea para cabeceras: isotipo + nombre del producto. */
export function MarcaProducto({ className }: { className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <Logo tamano="sm" alt="" />
      {/* El nombre sale de `copy.marca`, no escrito aquí: es la marca del
          producto y tiene que cambiar en un solo sitio. En teléfono basta el
          isotipo: el ancho hace falta para la navegación. */}
      <span className="hidden whitespace-nowrap sm:inline font-ui text-14 font-semibold text-text-1">{marca.nombre}</span>
    </span>
  );
}
