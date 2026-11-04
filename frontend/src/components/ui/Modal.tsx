import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { springSoft, ease, dur } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { origenInteraccion } from '../../lib/origenInteraccion';
import { IconButton } from './Button';
import { Backdrop } from './Backdrop';

/**
 * Modal.
 *
 * EMERGE DEL CONTROL QUE LO ABRIÓ y se repliega sobre él al cerrarse. No es
 * adorno: es la regla de continuidad espacial del sistema — la transición
 * explica de dónde salió el contenido y a dónde vuelve, en vez de aparecer y
 * desaparecer en el centro sin decir nada.
 *
 * Cómo se consigue, y por qué así:
 *
 *  - El punto de partida NO se pasa por props. Se lee de `origenInteraccion()`,
 *    que anota en el documento el último control accionado (ver ese archivo
 *    para el porqué). Así el efecto funciona en los modales que ya existen sin
 *    tocar ni uno solo de los sitios que los invocan, y no se rompe el día que
 *    alguien añada un modal nuevo y olvide cablear una `ref`.
 *
 *  - Se anima con `transform-origin`, no con un `layoutId` que interpole la
 *    caja del botón hasta la del modal. Ese morfeo estira el contenido —el
 *    título y los botones se deforman durante el viaje— y con un botón chico y
 *    un diálogo grande se ve mal. Fijar el origen en el punto del botón y
 *    escalar de 0.9 a 1 da justo la lectura correcta: el panel *brota* de ahí.
 *
 *  - El origen se mide en `useLayoutEffect`, ANTES del primer pintado. Medirlo
 *    en un `useEffect` normal dejaría el primer frame con el origen en el
 *    centro y el modal daría un salto perceptible al empezar.
 *
 * `layoutId` sigue existiendo para el caso en que alguien SÍ quiera el morfeo
 * de caja a caja (una tarjeta que se expande a diálogo, por ejemplo). Cuando se
 * pasa, manda él y el origen no se aplica: mezclar los dos pelea por el mismo
 * transform.
 */
export function Modal({
  open,
  onClose,
  title,
  layoutId,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  layoutId?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  const panel = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion();

  useLayoutEffect(() => {
    const nodo = panel.current;
    if (!open || !nodo || layoutId || reducido) return;

    const origen = origenInteraccion();
    if (!origen) {
      // Sin origen conocido (un modal que abre un temporizador, por ejemplo)
      // crece desde su propio centro, que es el comportamiento neutro.
      nodo.style.transformOrigin = '';
      return;
    }

    const caja = nodo.getBoundingClientRect();
    // El origen se ACOTA a la caja del panel. Un botón muy lejos del diálogo
    // daría un transform-origin a cientos de píxeles fuera, y escalar desde
    // ahí dispara el panel fuera de la pantalla en vez de hacerlo crecer.
    const x = Math.min(Math.max(origen.x - caja.left, 0), caja.width);
    const y = Math.min(Math.max(origen.y - caja.top, 0), caja.height);
    nodo.style.transformOrigin = `${x}px ${y}px`;
  }, [open, layoutId, reducido]);

  if (typeof document === 'undefined') return null;

  // Con movimiento reducido se sustituye el desplazamiento por opacidad, nunca
  // se elimina el feedback: sigue habiendo entrada y salida, solo que quietas.
  const animacionPanel = reducido
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: dur.base, ease },
      }
    : {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.9 },
        transition: springSoft,
      };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.base, ease }}
        >
          <Backdrop onClick={onClose} />
          <motion.div
            ref={panel}
            layoutId={layoutId}
            {...animacionPanel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-modal border border-hairline bg-surface-3 shadow-3',
              size === 'sm' && 'max-w-sm',
              size === 'md' && 'max-w-lg',
              size === 'lg' && 'max-w-2xl'
            )}
          >
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <h2 className="font-ui text-22">{title}</h2>
              <IconButton aria-label="Cerrar" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </div>
            <div className="px-6 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
