import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CornerDownRight, Paperclip, X } from 'lucide-react';
import type { MensajeEnCola } from '../../types';
import { dur, ease, springPanel } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { chat as copy } from '../../copy';

/**
 * Mensajes escritos mientras el agente trabajaba. Se ven ENCIMA del composer
 * (como en Claude), en el orden en que se mandarán, y se pueden quitar antes de
 * que salgan. Se mandan solos, de uno en uno, al terminar la respuesta actual.
 */
export const ColaMensajes = memo(function ColaMensajes({
  cola,
  onQuitar,
}: {
  cola: MensajeEnCola[];
  onQuitar: (mensajeId: string) => void;
}) {
  const reducido = useReducedMotion();
  return (
    <section aria-label={copy.enCola} className="mb-2 flex flex-col gap-1.5">
      <p className="px-1 font-ui text-12 text-text-3">
        <span className="font-medium text-text-2">{copy.enCola}</span> · {copy.enColaDetalle}
      </p>
      <ul className="flex flex-col gap-1.5">
        <AnimatePresence initial={false}>
          {cola.map((m) => (
            <motion.li
              key={m.id}
              layout={!reducido}
              initial={reducido ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
              transition={reducido ? { duration: dur.fast } : springPanel}
              className="flex items-center gap-2 rounded-control bg-surface-1 py-1.5 pl-3 pr-1.5 shadow-anillo"
            >
              <CornerDownRight size={14} aria-hidden className="shrink-0 text-text-3" />
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
                <X size={14} />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </section>
  );
});
