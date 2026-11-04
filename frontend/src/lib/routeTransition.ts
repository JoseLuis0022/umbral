import { useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import type { Variants } from 'framer-motion';

// Continuidad espacial a nivel de shell: cada pantalla entra desde la derecha
// al avanzar y desde la izquierda al volver, para que la transición explique
// de dónde viene y a dónde va el contenido.
//
// React Router expone el TIPO de navegación (PUSH/POP/REPLACE) por transición,
// no una dirección persistente; la dirección se deriva aquí comparando la key
// de location actual contra la anterior. POP (atrás/adelante del navegador, o
// un navigate(-1) propio) invierte la animación; PUSH/REPLACE siempre avanza.
export function useRouteDirection() {
  const location = useLocation();
  const navType = useNavigationType();
  const prevKeyRef = useRef(location.key);
  const dirRef = useRef(1);

  if (prevKeyRef.current !== location.key) {
    dirRef.current = navType === 'POP' ? -1 : 1;
    prevKeyRef.current = location.key;
  }
  return dirRef.current;
}

export const pageTransitionVariants: Variants = {
  enter: (direction: number) => ({ opacity: 0, x: direction >= 0 ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction >= 0 ? -24 : 24 }),
};
