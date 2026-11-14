import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { ease, springEscena, springPress, springSoft } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { desplazamientoPrevio, esServidor, llegoPrerenderizada } from '../../lib/prerender';

// useLayoutEffect avisa (y no hace nada) en el servidor del prerender.
const useEfectoAntesDePintar = esServidor ? useEffect : useLayoutEffect;

/**
 * Piezas comunes de la landing y de las páginas legales.
 *
 * Reglas que viven aquí para no repetirse en cada sección:
 *  - Los botones cambian SOLO de color al pasar el cursor; al presionar
 *    comprimen con `springPress`. Miden 44 px de alto (objetivo táctil).
 *  - La aparición al entrar en vista es una sola, corta y sin cascada:
 *    fundido + 14 px de subida. Los dispositivos (`variante="dispositivo"`)
 *    suben más y crecen de 0.96 a 1: pesan más que el texto y su llegada se
 *    nota sin necesitar cascada. Con movimiento reducido, solo el fundido.
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
 *
 * Con prerender (src/lib/prerender.ts) hay dos casos que NO animan:
 *  - En el servidor se pinta visible: un rastreador no ejecuta animaciones, y
 *    un `opacity: 0` en el HTML esconde el texto a quien sí lee estilos.
 *  - En el primer render del cliente sobre el HTML prerenderizado, se mide
 *    antes de pintar: lo que ya estaba en pantalla se queda quieto (no
 *    desaparece para volver a aparecer); lo que está más abajo se oculta y
 *    aparece al llegar a él, como siempre.
 */
export function Revelar({
  children,
  className,
  retraso = 0,
  como = 'div',
  variante = 'texto',
}: {
  children: ReactNode;
  className?: string;
  retraso?: number;
  como?: 'div' | 'li' | 'figure';
  variante?: 'texto' | 'dispositivo';
}) {
  const dispositivo = variante === 'dispositivo';
  const reducido = useReducedMotion();
  const Componente = motion[como];
  const ref = useRef<HTMLElement>(null);
  const [modo, setModo] = useState<'animar' | 'quieto' | 'medir'>(() =>
    esServidor ? 'quieto' : llegoPrerenderizada() ? 'medir' : 'animar'
  );

  useEfectoAntesDePintar(() => {
    if (modo !== 'medir' || !ref.current) return;
    // El contenedor recién creado aún no recupera el scroll (lo hace
    // PaginaPublica después): se mide como estaba la página prerenderizada.
    const arriba = ref.current.getBoundingClientRect().top - desplazamientoPrevio();
    setModo(arriba < window.innerHeight ? 'quieto' : 'animar');
  }, [modo]);

  return (
    <Componente
      // Pasar de medir a animar re-monta, antes del pintado, con el estado inicial oculto.
      key={modo === 'animar' ? 'animar' : 'quieto'}
      ref={ref as never}
      className={className}
      initial={
        modo !== 'animar'
          ? false
          : reducido
            ? { opacity: 0 }
            : dispositivo
              ? { opacity: 0, y: 40, scale: 0.96 }
              : { opacity: 0, y: 14 }
      }
      whileInView={dispositivo ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={
        reducido
          ? { duration: 0.2, ease, delay: retraso }
          : dispositivo
            ? {
                y: { ...springEscena, delay: retraso },
                scale: { ...springEscena, delay: retraso },
                opacity: { duration: 0.6, ease, delay: retraso },
              }
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
