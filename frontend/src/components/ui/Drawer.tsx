import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { springSoft, ease, dur } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { IconButton } from './Button';
import { Backdrop } from './Backdrop';

// Panel lateral para detalle o alta rápida. Entra deslizando desde el borde
// del que "vive", con el mismo spring suave que el Modal.
export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  side = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  side?: 'right' | 'left';
}) {
  const reducido = useReducedMotion();
  if (typeof document === 'undefined') return null;

  // Con movimiento reducido el cajón NO se desliza, pero sigue entrando y
  // saliendo por opacidad: quitarle el deslizamiento es la petición; quitarle
  // el feedback dejaría al usuario sin saber que la capa se abrió.
  const fueraX = side === 'right' ? '100%' : '-100%';
  const animacionPanel = reducido
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: dur.base, ease } }
    : { initial: { x: fueraX }, animate: { x: 0 }, exit: { x: fueraX }, transition: springSoft };
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1200]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.base, ease }}
        >
          <Backdrop onClick={onClose} />
          <motion.div
            {...animacionPanel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'absolute top-0 flex h-full w-full max-w-md flex-col border-hairline bg-surface-3 shadow-3',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
            )}
          >
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <h2 className="font-ui text-22">{title}</h2>
              <IconButton aria-label="Cerrar" onClick={onClose}>
                <X size={18} />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-hairline px-6 py-4">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
