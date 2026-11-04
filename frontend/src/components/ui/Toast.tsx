import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '../../lib/cn';
import { dur, springSoft } from '../../lib/motion';

type Tone = 'default' | 'success' | 'error';
type ToastInput = { message: string; tone?: Tone; duration?: number };
type ToastCtx = { push: (t: ToastInput) => number; dismiss: (id: number) => void };

const ToastContext = createContext<ToastCtx | null>(null);

const TONES = {
  default: { classes: 'bg-surface-3 text-text-1 border border-hairline', icon: Info, iconClass: 'text-accent-fg' },
  success: { classes: 'bg-status-green text-white', icon: CheckCircle2, iconClass: 'text-white' },
  error: { classes: 'bg-status-red text-white', icon: XCircle, iconClass: 'text-white' },
} as const;

let idSeq = 0;

/**
 * Toast con auto-cierre a 4 s y barra de progreso visible (el usuario ve
 * cuánto le queda para leerlo).
 *
 * Entra desde abajo con un pequeño "pop" y sale deslizando a la derecha con un
 * ease acelerado — direcciones distintas a propósito: una salida que es el
 * reverso exacto de la entrada se siente mecánica.
 */
export function ToastProvider({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; tone: Tone; duration: number }>>([]);
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    ({ message, tone = 'default' as Tone, duration = 4000 }: ToastInput) => {
      const id = ++idSeq;
      setToasts((t) => [...t, { id, message, tone, duration }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[1300] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => {
            const config = TONES[t.tone];
            const Icon = config.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 28, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: springSoft }}
                // La CURVA de salida es distinta a propósito (ver el docblock): una salida
                // que es el reverso exacto de la entrada se siente mecánica. La DURACIÓN sí
                // vuelve al sistema — era el único literal suelto del componente.
                exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: dur.slow, ease: [0.4, 0, 1, 1] } }}
                className={cn(
                  'pointer-events-auto relative flex items-center gap-2.5 overflow-hidden rounded-tarjeta px-4 py-3.5 font-ui text-13 shadow-3',
                  config.classes
                )}
                onClick={() => dismiss(t.id)}
                role="status"
              >
                <Icon size={18} strokeWidth={2} className={cn('shrink-0', config.iconClass)} />
                <span className="leading-snug">{t.message}</span>
                <motion.span
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: t.duration / 1000, ease: 'linear' }}
                  style={{ originX: 0 }}
                  className={cn(
                    'absolute bottom-0 left-0 h-[2px] w-full',
                    t.tone === 'default' ? 'bg-accent/40' : 'bg-white/40'
                  )}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
