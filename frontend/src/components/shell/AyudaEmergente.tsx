import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { dur, ease } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { Z_MENU_ANCLADO } from '../ui';

/** Aire entre el elemento y su ayuda. Suficiente para que se lean como dos piezas. */
const SEPARACION = 8;

/**
 * Ayuda emergente con el nombre completo de un elemento del carril.
 *
 * Un carril de iconos sin nombres es un acertijo: la inicial "MG" o la
 * etiqueta "PDF" identifican la fila cuando ya sabes cuál es, no cuando la
 * estás buscando. Esto es lo que devuelve el nombre.
 *
 * DOS DECISIONES
 *
 *  1. **Va en un portal, con `position: fixed`.** El carril mide 60 px y vive
 *     dentro de un panel con `overflow-hidden` y una lista con `overflow-y`:
 *     una ayuda dibujada en el flujo se recortaría contra el borde del panel a
 *     los pocos píxeles. Es el mismo motivo por el que `PanelAnclado` usa
 *     portal, y por eso comparte su capa (`Z_MENU_ANCLADO`) — las dos son
 *     superficies transitorias ancladas a un control y nunca coinciden.
 *
 *  2. **Aparece al ENFOCAR, no solo al pasar el cursor.** Quien recorre el
 *     carril con el tabulador necesita el nombre tanto como quien usa el ratón.
 *     La ayuda es `aria-hidden` a propósito: el nombre ya viaja en el
 *     `aria-label` del botón, y anunciarlo dos veces sobra.
 */
export function AyudaEmergente({
  texto,
  lado = 'derecha',
  className,
  children,
}: {
  /** Puede llevar saltos de línea: la burbuja los respeta. */
  texto: string;
  /** Hacia dónde sale respecto del elemento. */
  lado?: 'derecha' | 'izquierda';
  className?: string;
  children: ReactNode;
}) {
  const anclaRef = useRef<HTMLSpanElement>(null);
  const reducido = useReducedMotion();
  // `null` = oculta. Guardar la posición en estado cuesta un render por
  // apertura, que es exactamente una por gesto: no hay nada que optimizar.
  const [caja, setCaja] = useState<{ top: number; left: number } | null>(null);

  const mostrar = useCallback(() => {
    const r = anclaRef.current?.getBoundingClientRect();
    if (!r) return;
    setCaja({
      top: r.top + r.height / 2,
      left: lado === 'derecha' ? r.right + SEPARACION : r.left - SEPARACION,
    });
  }, [lado]);

  const ocultar = useCallback(() => setCaja(null), []);

  useEffect(() => {
    if (!caja) return;
    // La posición se calcula una vez y no se sigue: si el carril scrollea por
    // debajo, la ayuda se cierra en vez de quedarse flotando lejos de su
    // elemento. Captura, porque el scroll que importa es el del contenedor
    // interno y ese no burbujea hasta `window`.
    window.addEventListener('scroll', ocultar, true);
    window.addEventListener('resize', ocultar);
    return () => {
      window.removeEventListener('scroll', ocultar, true);
      window.removeEventListener('resize', ocultar);
    };
  }, [caja, ocultar]);

  return (
    <span
      ref={anclaRef}
      className={cn('block', className)}
      onPointerEnter={mostrar}
      onPointerLeave={ocultar}
      // `onFocus`/`onBlur` de React burbujean (son focusin/focusout), así que
      // enfocar el botón de dentro basta para abrirla.
      onFocus={mostrar}
      onBlur={ocultar}
    >
      {children}
      {caja !== null &&
        typeof document !== 'undefined' &&
        createPortal(
          <motion.div
            aria-hidden
            initial={reducido ? { opacity: 0 } : { opacity: 0, x: lado === 'derecha' ? -4 : 4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: dur.fast, ease }}
            style={{
              top: caja.top,
              left: caja.left,
              zIndex: Z_MENU_ANCLADO,
              // El desplazamiento de centrado va en el `transform` del estilo y
              // no en una clase: Framer anima `x` sobre esta misma propiedad y
              // una clase `-translate-y-1/2` la pisaría.
              translate: lado === 'derecha' ? '0 -50%' : '-100% -50%',
            }}
            className="pointer-events-none fixed max-w-[260px] whitespace-pre-line rounded-control border border-hairline bg-surface-3 px-2.5 py-1.5 font-ui text-12 leading-snug text-text-1 shadow-3"
          >
            {texto}
          </motion.div>,
          document.body
        )}
    </span>
  );
}
