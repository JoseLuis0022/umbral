import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useLocalStorage } from '../hooks/useLocalStorage';

export type Densidad = 'comoda' | 'compacta';
export type TamanoTexto = 'pequeno' | 'normal' | 'grande';
export type Contraste = 'estandar' | 'alto';
/** `sistema` respeta `prefers-reduced-motion`; `reducido` lo fuerza aunque el sistema no lo pida. */
export type Movimiento = 'sistema' | 'reducido';

type PreferenciasCtx = {
  densidad: Densidad;
  tamanoTexto: TamanoTexto;
  contraste: Contraste;
  movimiento: Movimiento;
  enlacesSubrayados: boolean;
  toqueAmplio: boolean;
  setDensidad: (d: Densidad) => void;
  setTamanoTexto: (t: TamanoTexto) => void;
  setContraste: (c: Contraste) => void;
  setMovimiento: (m: Movimiento) => void;
  setEnlacesSubrayados: (v: boolean) => void;
  setToqueAmplio: (v: boolean) => void;
  /** true si alguna preferencia difiere de su valor de fábrica. */
  hayPersonalizacion: boolean;
  restablecerPreferencias: () => void;
};

/** Valores de fábrica. Existen como objeto para poder comparar y restablecer. */
const DEFECTOS = {
  densidad: 'comoda',
  tamanoTexto: 'normal',
  contraste: 'estandar',
  movimiento: 'sistema',
  enlacesSubrayados: false,
  toqueAmplio: false,
} satisfies Pick<
  PreferenciasCtx,
  | 'densidad'
  | 'tamanoTexto'
  | 'contraste'
  | 'movimiento'
  | 'enlacesSubrayados'
  | 'toqueAmplio'
>;

/**
 * Reglas que aplican las preferencias que NO existían cuando se escribió el
 * bloque de preferencias de src/index.css.
 *
 * Van aquí y no en el CSS global por una razón práctica: index.css es zona
 * compartida y hay varias pantallas construyéndose en paralelo sobre ella. Al
 * vivir junto al estado que las enciende, la preferencia y su efecto se leen
 * de una sola vez, y borrar una preferencia borra también su CSS.
 *
 * Se inyectan como <style> dentro del árbol (o sea, al final del documento):
 * Tailwind 3 emite CSS plano sin @layer, así que estas reglas ganan por orden
 * de aparición a las utilidades que fijan el mismo valor — que es justo lo que
 * necesita `min-height` frente a `md:min-h-0`.
 */
const CSS_PREFERENCIAS = `
/* Contraste alto: sube los dos niveles de texto secundario y engrosa los
   hairlines. Se toca la VARIABLE, no los componentes, así que la app entera
   cambia sin que ninguna pantalla se entere. text-3 pasa a pizarra-600
   (#535E70) porque el #97A1B2 de reposo es deliberadamente tenue y no llega
   a 4.5:1. */
html[data-contraste='alto'] {
  --text-2: #3e4757;
  --text-3: #535e70;
  --hairline: rgba(22, 28, 39, 0.18);
  --hairline-strong: rgba(22, 28, 39, 0.3);
}

/* Movimiento reducido forzado. Es la misma red de seguridad que ya tiene
   index.css para @media (prefers-reduced-motion), pero disparada por el
   ajuste. Las animaciones de Framer Motion no pasan por CSS: esas las corta
   <MotionConfig reducedMotion="always"> más abajo. */
html[data-movimiento='reducido'] *,
html[data-movimiento='reducido'] *::before,
html[data-movimiento='reducido'] *::after {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}

/* EXCEPCIÓN: las señales de espera sobreviven.
   La regla de arriba apaga toda animación, y eso incluye el barrido de los
   esqueletos, el cursor de escritura, el latido del agente trabajando y los
   giros de carga. El resultado sería una interfaz que se queda quieta sin
   decir que está haciendo algo: movimiento reducido pide quitar el
   DESPLAZAMIENTO, no el feedback. Se sustituyen por un latido de opacidad
   lento, que no desplaza nada.
   Es la misma excepción que index.css aplica para la media query del sistema;
   tiene que existir en los dos sitios, porque el ajuste de la aplicación
   funciona con el sistema en modo normal. */
html[data-movimiento='reducido'] [class*='animate-[shimmer'],
html[data-movimiento='reducido'] .animate-parpadeo,
html[data-movimiento='reducido'] .animate-latido,
html[data-movimiento='reducido'] .animate-pulse,
html[data-movimiento='reducido'] .animate-brillo,
html[data-movimiento='reducido'] .animate-espera,
html[data-movimiento='reducido'] .animate-puntoOla,
html[data-movimiento='reducido'] .animate-spin {
  animation: pulsoEspera 2.4s ease-in-out infinite !important;
  animation-duration: 2.4s !important;
  animation-iteration-count: infinite !important;
  transform: none !important;
}

/* Subrayar enlaces. Solo dentro de texto corrido: un enlace que envuelve una
   tarjeta entera (la rejilla de guías) no es un enlace de lectura, y
   subrayarle todo el contenido lo ensucia sin ayudar a nadie. */
html[data-enlaces='siempre'] :is(p, li, dd, td, blockquote, figcaption) a[href] {
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Objetivos táctiles amplios: sube TODO control a 44 px, también en
   escritorio. Los botones ya cumplen 44 px en móvil (min-h-[44px] md:min-h-0);
   esto extiende la misma regla a ratón y trackpad, para quien lo necesita por
   motricidad y no por tamaño de pantalla. */
html[data-toque='amplio'] button,
html[data-toque='amplio'] select,
html[data-toque='amplio'] summary,
html[data-toque='amplio'] [role='button'],
html[data-toque='amplio'] [role='switch'],
html[data-toque='amplio'] [role='tab'] {
  min-height: 44px;
}
/* Un botón sin texto lleva aria-label obligatorio (ver IconButton): sirve para
   reconocer los cuadrados y darles también ancho. */
html[data-toque='amplio'] button[aria-label] {
  min-width: 44px;
}
`;

/** Valida contra una lista cerrada: lo que no esté en ella cae al valor de fábrica. */
function unoDe<T extends string>(...permitidos: readonly T[]) {
  return (v: unknown): v is T => typeof v === 'string' && (permitidos as readonly string[]).includes(v);
}
const esBooleano = (v: unknown): v is boolean => typeof v === 'boolean';
const esDensidad = unoDe<Densidad>('comoda', 'compacta');
const esTamanoTexto = unoDe<TamanoTexto>('pequeno', 'normal', 'grande');
const esContraste = unoDe<Contraste>('estandar', 'alto');
const esMovimiento = unoDe<Movimiento>('sistema', 'reducido');

const Ctx = createContext<PreferenciasCtx | null>(null);

/**
 * Preferencias de interfaz, persistidas en localStorage.
 *
 * Se aplican como atributos `data-*` en el elemento raíz y el CSS reacciona a
 * ellos (ver el bloque de preferencias al final de src/index.css y la constante
 * CSS_PREFERENCIAS de este archivo). Va por atributo y no por clases en cada
 * componente a propósito: así ninguna pantalla tiene que saber que existen
 * estas preferencias, y una vista nueva las hereda sin escribir una línea.
 */
export function PreferenciasProvider({ children }: { children?: ReactNode }) {
  // Cada lectura se valida: un valor guardado que no está entre los permitidos
  // rompía Ajustes (los controles segmentados no saben pintar un valor ajeno).
  const [densidad, setDensidad] = useLocalStorage<Densidad>('densidad', DEFECTOS.densidad, esDensidad);
  const [tamanoTexto, setTamanoTexto] = useLocalStorage<TamanoTexto>(
    'tamano-texto',
    DEFECTOS.tamanoTexto,
    esTamanoTexto
  );
  const [contraste, setContraste] = useLocalStorage<Contraste>('contraste', DEFECTOS.contraste, esContraste);
  const [movimiento, setMovimiento] = useLocalStorage<Movimiento>('movimiento', DEFECTOS.movimiento, esMovimiento);
  const [enlacesSubrayados, setEnlacesSubrayados] = useLocalStorage<boolean>(
    'enlaces-subrayados',
    DEFECTOS.enlacesSubrayados,
    esBooleano
  );
  const [toqueAmplio, setToqueAmplio] = useLocalStorage<boolean>('toque-amplio', DEFECTOS.toqueAmplio, esBooleano);

  useEffect(() => {
    const raiz = document.documentElement.dataset;
    raiz.densidad = densidad;
    raiz.texto = tamanoTexto;
    raiz.contraste = contraste;
    raiz.movimiento = movimiento;
    raiz.enlaces = enlacesSubrayados ? 'siempre' : 'hover';
    raiz.toque = toqueAmplio ? 'amplio' : 'normal';
  }, [densidad, tamanoTexto, contraste, movimiento, enlacesSubrayados, toqueAmplio]);

  const restablecerPreferencias = useCallback(() => {
    setDensidad(DEFECTOS.densidad);
    setTamanoTexto(DEFECTOS.tamanoTexto);
    setContraste(DEFECTOS.contraste);
    setMovimiento(DEFECTOS.movimiento);
    setEnlacesSubrayados(DEFECTOS.enlacesSubrayados);
    setToqueAmplio(DEFECTOS.toqueAmplio);
  }, [
    setDensidad,
    setTamanoTexto,
    setContraste,
    setMovimiento,
    setEnlacesSubrayados,
    setToqueAmplio,
  ]);

  const hayPersonalizacion =
    densidad !== DEFECTOS.densidad ||
    tamanoTexto !== DEFECTOS.tamanoTexto ||
    contraste !== DEFECTOS.contraste ||
    movimiento !== DEFECTOS.movimiento ||
    enlacesSubrayados !== DEFECTOS.enlacesSubrayados ||
    toqueAmplio !== DEFECTOS.toqueAmplio;

  const valor = useMemo(
    () => ({
      densidad,
      tamanoTexto,
      contraste,
      movimiento,
      enlacesSubrayados,
      toqueAmplio,
      setDensidad,
      setTamanoTexto,
      setContraste,
      setMovimiento,
      setEnlacesSubrayados,
      setToqueAmplio,
      hayPersonalizacion,
      restablecerPreferencias,
    }),
    [
      densidad,
      tamanoTexto,
      contraste,
      movimiento,
      enlacesSubrayados,
      toqueAmplio,
      setDensidad,
      setTamanoTexto,
      setContraste,
      setMovimiento,
      setEnlacesSubrayados,
      setToqueAmplio,
      hayPersonalizacion,
      restablecerPreferencias,
    ]
  );

  return (
    <Ctx.Provider value={valor}>
      <style>{CSS_PREFERENCIAS}</style>
      {/*
        `user` es el comportamiento de siempre (obedece al sistema operativo);
        `always` es el ajuste manual. Framer Motion sustituye entonces
        desplazamiento y escala por opacidad en TODA la app — el feedback no
        desaparece, solo deja de moverse.
      */}
      <MotionConfig reducedMotion={movimiento === 'reducido' ? 'always' : 'user'}>{children}</MotionConfig>
    </Ctx.Provider>
  );
}

export function usePreferencias() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePreferencias debe usarse dentro de <PreferenciasProvider>');
  return ctx;
}
