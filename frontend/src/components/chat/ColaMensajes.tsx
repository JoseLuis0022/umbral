import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Paperclip, X } from 'lucide-react';
import type { MensajeEnCola } from '../../types';
import { dur, ease, springPanel } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { chat as copy } from '../../copy';

/**
 * Mensajes escritos mientras el agente trabajaba, en UNA tarjeta compacta
 * encima del composer (como en Claude). Tiene alto máximo y desplaza por
 * dentro: la cola nunca tapa el hilo. Al terminar la respuesta actual salen
 * todos juntos en un solo mensaje.
 */
export const ColaMensajes = memo(function ColaMensajes({
  cola,
  onQuitar,
}: {
  cola: MensajeEnCola[];
  /** `null` = quitar todos. */
  onQuitar: (mensajeId: string | null) => void;
}) {
  const reducido = useReducedMotion();
  return (
    <motion.section
      aria-label={copy.enColaCuenta(cola.length)}
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reducido ? { duration: dur.fast } : springPanel}
      className="mb-2 overflow-hidden rounded-control bg-surface-1 shadow-anillo"
    >
      <header className="flex items-center gap-2 py-1 pl-3 pr-1">
        <p className="min-w-0 flex-1 truncate font-ui text-12 text-text-3">
          <span className="font-medium text-text-2">{copy.enColaCuenta(cola.length)}.</span> {copy.enColaJuntos}
        </p>
        {cola.length > 1 && (
          <button
            type="button"
            onClick={() => onQuitar(null)}
            className="shrink-0 rounded-xs px-2 py-1 font-ui text-12 text-text-3 outline-none transition-colors duration-[120ms] hover:bg-tinta/[.06] hover:text-text-1 focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copy.quitarTodos}
          </button>
        )}
      </header>
      <ul className="max-h-[96px] overflow-y-auto overscroll-contain border-t border-tinta/[.06] px-1 py-0.5">
        <AnimatePresence initial={false}>
          {cola.map((m) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
              className="flex h-8 items-center gap-2 rounded-xs pl-2"
            >
              <span className="min-w-0 flex-1 truncate font-ui text-13 text-text-1">{m.contenido || m.adjuntos?.[0]?.nombre}</span>
              {m.adjuntos?.length ? (
                <span className="flex shrink-0 items-center gap-0.5 font-ui text-12 text-text-3">
                  <Paperclip size={12} aria-hidden />
                  {m.adjuntos.length}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onQuitar(m.id)}
                aria-label={`${copy.quitarDeCola}: ${m.contenido.slice(0, 40)}`}
                title={copy.quitarDeCola}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs text-text-3 outline-none transition-colors duration-[120ms] hover:bg-tinta/[.06] hover:text-text-1 focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X size={13} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.section>
  );
});
