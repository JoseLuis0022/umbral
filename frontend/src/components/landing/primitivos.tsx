import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { ease, springPress, springSoft } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';

/**
 * Piezas comunes de la landing y de las páginas legales.
 *
 * Reglas que viven aquí para no repetirse en cada sección:
 *  - Los botones cambian SOLO de color al pasar el cursor; al presionar
 *    comprimen con `springPress`. Miden 44 px de alto (objetivo táctil).
 *  - La aparición al entrar en vista es una sola, corta y sin cascada:
 *    fundido + 14 px de subida. Con movimiento reducido, solo el fundido.
 */

const MotionLink = motion.create(Link);

const BASE_BOTON =
  'inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-control px-5 font-ui text-15 font-medium transition-colors duration-150';

const ESTILOS_BOTON = {
  primario: 'bg-accent text-white shadow-1 hover:bg-accent-strong',
  secundario: 'bg-surface-1 text-text-1 shadow-anillo hover:bg-tinta/[.04]',
} as const;

type PropsAccion = {
  variante?: keyof typeof ESTILOS_BOTON;
  className?: string;
  children: ReactNode;
} & ({ a: string; externo?: boolean } | { href: string });

/** Botón de la landing: `a` = ruta interna, `href` = enlace externo o mailto. */
export function Accion(props: PropsAccion) {
  const reducido = useReducedMotion();
  const presion = reducido ? undefined : { scale: 0.97 };
  const clases = cn(BASE_BOTON, ESTILOS_BOTON[props.variante ?? 'secundario'], props.className);
  if ('a' in props) {
    return (
      <MotionLink to={props.a} whileTap={presion} transition={springPress} className={clases}>
        {props.children}
      </MotionLink>
    );
  }
  const externo = props.href.startsWith('http');
  return (
    <motion.a
      href={props.href}
      {...(externo ? { target: '_blank', rel: 'noreferrer' } : {})}
      whileTap={presion}
      transition={springPress}
      className={clases}
    >
      {props.children}
    </motion.a>
  );
}

/**
 * Aparición al entrar en vista, una sola vez. La opacidad va con tween y el
 * desplazamiento con resorte: con un resorte la opacidad se queda en 0 casi
 * todo el recorrido y luego "salta" (ver `springRebote` en lib/motion.ts).
 */
export function Revelar({
  children,
  className,
  retraso = 0,
  como = 'div',
}: {
  children: ReactNode;
  className?: string;
  retraso?: number;
  como?: 'div' | 'li' | 'figure';
}) {
  const reducido = useReducedMotion();
  const Componente = motion[como];
  return (
    <Componente
      className={className}
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={
        reducido
          ? { duration: 0.2, ease, delay: retraso }
          : { y: { ...springSoft, delay: retraso }, opacity: { duration: 0.45, ease, delay: retraso } }
      }
    >
      {children}
    </Componente>
  );
}

/** Contenedor horizontal de todas las secciones: un solo ancho y un solo margen. */
export function Contenedor({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-8 lg:px-12', className)}>{children}</div>;
}

/** Etiqueta + titular de sección. `oscuro` para la banda pizarra. */
export function Encabezado({
  etiqueta,
  titulo,
  texto,
  oscuro = false,
  id,
  className,
}: {
  id?: string;
  etiqueta: string;
  titulo: string;
  texto?: string;
  oscuro?: boolean;
  className?: string;
}) {
  return (
    <Revelar className={cn('max-w-[820px]', className)}>
      <p className={cn('font-ui text-15 font-medium', oscuro ? 'text-marca-pizarra-300' : 'text-text-2')}>{etiqueta}</p>
      <h2 id={id} className={cn('mt-3 font-ui text-display font-semibold', oscuro ? 'text-white' : 'text-text-1')}>{titulo}</h2>
      {texto && (
        <p className={cn('mt-5 max-w-[640px] font-ui text-18 font-normal', oscuro ? 'text-marca-pizarra-300' : 'text-text-2')}>
          {texto}
        </p>
      )}
    </Revelar>
  );
}
