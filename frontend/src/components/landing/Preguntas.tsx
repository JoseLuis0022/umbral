import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ease, springLayout } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';

/**
 * Acordeón de preguntas frecuentes. Cada pregunta es un <button> con
 * `aria-expanded` que controla su región; la respuesta cerrada no está en el
 * DOM, así que tampoco recibe foco ni la lee un lector de pantalla. Se pueden
 * abrir varias a la vez: quien compara respuestas no quiere que se cierre la
 * anterior.
 */
export function Preguntas({ lista }: { lista: readonly (readonly [string, string])[] }) {
  return (
    <div className="border-t border-hairline">
      {lista.map(([pregunta, respuesta]) => (
        <Pregunta key={pregunta} pregunta={pregunta} respuesta={respuesta} />
      ))}
    </div>
  );
}

function Pregunta({ pregunta, respuesta }: { pregunta: string; respuesta: string }) {
  const [abierta, setAbierta] = useState(false);
  const reducido = useReducedMotion();
  const id = useId();

  return (
    <div className="border-b border-hairline">
      <h3>
        <button
          type="button"
          id={`${id}-boton`}
          aria-expanded={abierta}
          aria-controls={`${id}-respuesta`}
          onClick={() => setAbierta((a) => !a)}
          className="group flex min-h-16 w-full items-center justify-between gap-6 rounded-celda py-5 text-left"
        >
          <span className="font-ui text-18 font-medium text-text-1 transition-colors duration-150 group-hover:text-accent-fg">
            {pregunta}
          </span>
          <Plus
            size={20}
            strokeWidth={1.75}
            aria-hidden="true"
            className={cn(
              'shrink-0 text-text-2 transition-transform duration-200 ease-umbral',
              abierta && 'rotate-45'
            )}
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {abierta && (
          <motion.div
            id={`${id}-respuesta`}
            role="region"
            aria-labelledby={`${id}-boton`}
            className="overflow-hidden"
            initial={reducido ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reducido ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reducido ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reducido ? { duration: 0.15, ease } : { height: springLayout, opacity: { duration: 0.2, ease } }}
          >
            <p className="max-w-[680px] pb-6 pr-10 font-ui text-16 text-text-2">{respuesta}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
