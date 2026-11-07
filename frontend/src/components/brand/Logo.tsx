import { cn } from '../../lib/cn';
import { marca } from '../../copy';

/**
 * Isotipo de Umbral: la FUNCIÓN UMBRAL (el escalón de la binarización) dibujada
 * como un grafo de tres nodos.
 *
 * Una línea baja, el salto en el umbral y una línea alta: lo que pasa de un
 * lado del umbral al otro. Es un concepto central de la materia (Otsu,
 * binarización) y la idea del producto: cruzar el umbral hacia entender algo.
 * Los extremos y el punto del salto son los nodos; el del umbral lleva un halo:
 * es el "paso activo" (y el que late en la animación de "pensando").
 *
 * No es un archivo de imagen a propósito: la placa sale de `--accent` y
 * `--accent-strong`, y el trazo es `currentColor`, así que un cambio de
 * colorimetría en src/index.css lo repinta junto con el resto. El favicon
 * (public/favicon.svg) es el mismo dibujo SIN el halo y con los colores
 * escritos: el navegador lo pinta fuera de la app, y a 16 px el halo es ruido.
 *
 * Probado a 16, 28, 36, 56 y 112 px: el halo es lo primero que se pierde en
 * tamaños chicos, y por diseño puede perderse sin que el escalón deje de leerse.
 */
const TAMANOS = {
  sm: 'h-7 w-7 rounded-celda', // cabecera
  md: 'h-9 w-9 rounded-control',
  lg: 'h-14 w-14 rounded-control', // login
} as const;

/**
 * El dibujo, sin placa. Rejilla de 24: extremos en (4,17) y (20,7), umbral en (12,12).
 * `acento`: el nodo del umbral (y su halo) en `--accent` y el resto en
 * `currentColor`. Es la versión "plana" de la marca, para fondos claros.
 */
export function IsotipoUmbral({ className, acento = false }: { className?: string; acento?: boolean }) {
  const umbral = acento ? 'var(--accent)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path
        d="M3 17h9V7h9"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="4.6" fill="none" stroke={umbral} strokeWidth={1.2} opacity={0.38} />
      <circle cx="4" cy="17" r="2.1" fill="currentColor" />
      <circle cx="20" cy="7" r="2.1" fill="currentColor" />
      <circle cx="12" cy="12" r="2.5" fill={umbral} />
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
      {/* Marca plana, sin placa: el escalón en tinta y el umbral en azul. */}
      <IsotipoUmbral acento className="h-6 w-6 text-text-1" />
      {/* El nombre sale de `copy.marca`, no escrito aquí: es la marca del
          producto y tiene que cambiar en un solo sitio. En teléfono basta el
          isotipo: el ancho hace falta para la navegación. */}
      <span className="hidden whitespace-nowrap sm:inline font-ui text-14 font-semibold text-text-1">{marca.nombre}</span>
    </span>
  );
}

/**
 * Marca sin placa ni degradado: el escalón en tinta y el umbral en azul. Para
 * las pantallas de acceso, donde la marca vive en el detalle y no en un
 * "ícono de app" centrado.
 */
export function MarcaPlana({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-text-1', className)}>
      <IsotipoUmbral acento className="h-7 w-7" />
      <span className="font-ui text-15 font-semibold tracking-[-0.01em]">{marca.nombre}</span>
    </span>
  );
}
