import { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { springSoft, ease, dur } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { origenInteraccion } from '../lib/origenInteraccion';

/**
 * Visor de imagen a tamaño completo, DENTRO de la aplicación.
 *
 * Las capturas de un procedimiento se leen en miniatura solo a medias: el
 * detalle que importa —un icono de barra de herramientas, un campo señalado en
 * rojo— necesita verse grande. Antes esto se resolvía abriendo la imagen en una
 * pestaña nueva, y eso saca a la persona de la aplicación: pierde el hilo de la
 * conversación, y volver depende de que sepa cerrar la pestaña.
 *
 * Igual que el resto de los diálogos del sistema, **emerge desde la miniatura
 * que se pulsó** y se repliega sobre ella, para que quede claro qué se amplió.
 */
export function VisorImagen({
  src,
  alt,
  onCerrar,
}: {
  src: string | null;
  alt?: string;
  onCerrar: () => void;
}) {
  const abierto = src !== null;
  const panel = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const focoPrevio = useRef<HTMLElement | null>(null);
  const reducido = useReducedMotion();

  // El origen se fija antes del primer pintado; medirlo después dejaría un
  // frame con la imagen creciendo desde el centro y se vería el salto.
  useLayoutEffect(() => {
    const nodo = panel.current;
    if (!abierto || !nodo || reducido) return;
    const origen = origenInteraccion();
    if (!origen) {
      nodo.style.transformOrigin = '';
      return;
    }
    const caja = nodo.getBoundingClientRect();
    const x = Math.min(Math.max(origen.x - caja.left, 0), caja.width);
    const y = Math.min(Math.max(origen.y - caja.top, 0), caja.height);
    nodo.style.transformOrigin = `${x}px ${y}px`;
  }, [abierto, reducido]);

  useEffect(() => {
    if (!abierto) return;

    focoPrevio.current = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();

    function alEscapar(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    document.addEventListener('keydown', alEscapar);

    // Se bloquea el scroll de fondo: con la imagen ocupando la pantalla, la
    // rueda del ratón debe no hacer nada, no mover la conversación por detrás.
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alEscapar);
      document.body.style.overflow = overflowPrevio;
      focoPrevio.current?.focus();
    };
  }, [abierto, onCerrar]);

  if (typeof document === 'undefined') return null;

  const animacion = reducido
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: dur.base, ease },
      }
    : {
        initial: { opacity: 0, scale: 0.92 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.92 },
        transition: springSoft,
      };

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div
          className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.base, ease }}
          role="dialog"
          aria-modal="true"
          aria-label={alt || 'Imagen ampliada'}
        >
          {/* Fondo más oscuro que el de un diálogo normal: aquí lo que se mira
              es una captura de pantalla clara, y necesita contraste alrededor
              para que se lea el detalle. Cerrar al pulsar fuera. */}
          <button
            type="button"
            aria-label="Cerrar la imagen"
            onClick={onCerrar}
            className="absolute inset-0 cursor-zoom-out bg-[#1a1614]/80 backdrop-blur-sm"
          />

          <motion.div
            ref={panel}
            {...animacion}
            className="relative z-10 flex max-h-full min-h-0 w-full max-w-6xl flex-col items-center gap-3"
          >
            <img
              src={src ?? ''}
              alt={alt ?? ''}
              className="min-h-0 w-auto max-w-full flex-1 rounded-tarjeta object-contain shadow-3"
            />
            {alt && (
              <figcaption className="max-w-2xl shrink-0 text-center font-ui text-13 text-white/85">
                {alt}
              </figcaption>
            )}
          </motion.div>

          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar la imagen"
            className="absolute right-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white backdrop-blur transition-colors duration-150 hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <X size={20} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
