import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { springPress } from '../../lib/motion';

// Framer Motion redefine estos handlers con su propia firma; se excluyen de
// los props HTML nativos para que el spread no choque en TypeScript.
type MotionSafeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd'
>;

// El azul de marca sólido se reserva para la acción PRIMARIA. Si dos
// botones azules compiten en la misma pantalla, ninguno es primario.
const VARIANTS = {
  primary:
    'bg-accent text-white shadow-1 hover:bg-accent-strong disabled:bg-tinta/[.06] disabled:text-text-3 disabled:shadow-none',
  // El borde es la primera capa de la sombra (`shadow-anillo`): nunca
  // `border` más una sombra aparte.
  secondary:
    'bg-surface-1 text-text-1 shadow-anillo hover:bg-tinta/[.04] disabled:bg-bg disabled:text-text-3',
  ghost: 'bg-transparent text-text-1 hover:bg-tinta/[.05] disabled:text-text-3',
  destructive:
    'bg-status-red text-white shadow-1 hover:bg-semantic-riesgo-700 disabled:bg-tinta/[.06] disabled:text-text-3 disabled:shadow-none',
} as const;

// Compacto a propósito: un botón de acción no debe competir visualmente con
// el contenido de la pantalla. sm para acciones de tabla, md por defecto.
const SIZES = {
  sm: 'h-8 px-3.5 text-13',
  md: 'h-9 px-4 text-14',
  lg: 'h-10 px-5 text-15',
} as const;

export type ButtonProps = MotionSafeButtonProps & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
  children?: ReactNode;
};

/**
 * Botón base del sistema. El hover SOLO cambia el color (120 ms): un botón que
 * sube un píxel en cada pasada del cursor es ruido, no respuesta. El tap
 * comprime a 0.97 con `springPress` —el mismo gesto en toda la app—.
 *
 * El estado deshabilitado cambia de COLOR (neutro apagado), nunca es
 * `opacity-40` sobre un relleno de color: un botón rojo al 40% de opacidad es
 * ilegible y además parece "cargando", no "no disponible".
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, disabled, loading, children, ...props },
  ref
) {
  const inert = disabled || loading;
  return (
    <motion.button
      ref={ref}
      disabled={inert}
      whileTap={!inert ? { scale: 0.97 } : undefined}
      transition={springPress}
      className={cn(
        // La lista incluye `box-shadow`: varias variantes suben de elevación al
        // pasar el cursor, y con `transition-colors` el color se fundía en 150 ms
        // mientras la sombra saltaba de golpe en el mismo gesto — se leía como un
        // parpadeo. No se usa `transition-all`, que también vigilaría layout.
        'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-ui font-semibold',
        'transition-[color,background-color,border-color,box-shadow] duration-[120ms]',
        'disabled:cursor-not-allowed',
        'min-h-[44px] md:min-h-0', // target táctil ≥44px en móvil
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </motion.button>
  );
});

export type IconButtonProps = MotionSafeButtonProps & {
  variant?: 'ghost' | 'primary';
  'aria-label': string; // obligatorio: un botón sin texto necesita nombre accesible
  children?: ReactNode;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant = 'ghost', children, ...props },
  ref
) {
  return (
    <motion.button
      ref={ref}
      whileTap={!props.disabled ? { scale: 0.96 } : undefined}
      transition={springPress}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-control text-text-2',
        'transition-[color,background-color,border-color,box-shadow] duration-[120ms]',
        'hover:bg-tinta/[.05] hover:text-text-1 disabled:cursor-not-allowed disabled:text-text-3 disabled:hover:bg-transparent',
        'min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-strong hover:text-white',
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
});
