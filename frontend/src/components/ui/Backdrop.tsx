import { useEffect, useState } from 'react';
import { useIsPresent } from 'framer-motion';
import { cn } from '../../lib/cn';

/**
 * Fondo con vidrio esmerilado para Modal y Drawer.
 *
 * NO usa Framer Motion para animar el blur: `backdropFilter` no está entre las
 * propiedades que Framer Motion sabe interpolar de forma fiable (`filter` sí,
 * `backdropFilter` no), y el resultado de intentarlo es que el desenfoque
 * aparece de golpe. En su lugar se usa una transición CSS nativa, que el
 * navegador sí interpola bien.
 *
 * Y lo que se anima es SOLO LA OPACIDAD, con el radio de desenfoque fijo. Antes
 * se interpolaba el radio (`backdrop-blur-none` → `backdrop-blur-xl`) con
 * `transition-all`, y eso obliga al navegador a REHACER el desenfoque de la
 * pantalla completa en cada frame: es de las cosas más caras que se le pueden
 * pedir, y es lo que hacía que abrir un modal costara frames justo en el
 * momento en que el usuario está mirando. Con el radio fijo, el desenfoque se
 * calcula una vez y la capa entera se funde en el compositor. Se ve igual.
 *
 * `transition-all` además animaba de paso el color de fondo y cualquier otra
 * propiedad que cambiara; la lista va explícita.
 *
 * `useIsPresent` avisa a este componente cuando el AnimatePresence padre
 * empezó a desmontarlo, para disparar la clase de salida antes de que React
 * lo quite del DOM.
 */
export function Backdrop({ onClick, className }: { onClick?: () => void; className?: string }) {
  const isPresent = useIsPresent();
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = entered && isPresent;

  return (
    <div
      className={cn(
        'absolute inset-0 backdrop-blur-xl transition-opacity duration-200 ease-aurora',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
      style={{ backgroundColor: 'rgba(35, 32, 29, 0.28)' }}
      onClick={onClick}
      aria-hidden
    />
  );
}
