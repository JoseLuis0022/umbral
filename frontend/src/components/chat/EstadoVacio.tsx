import { memo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { springPress, dur, ease } from '../../lib/motion';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';
import { cn } from '../../lib/cn';

/** Cuántas sugerencias se muestran. Fijas: un objetivo de clic no rota. */
const SUGERENCIAS = 4;

/**
 * Primera vez / sesión nueva: una pregunta directa, una línea que dice qué
 * hace el asistente, el composer y una lista corta de sugerencias.
 *
 * Alineado a la izquierda, como el resto del hilo: el saludo centrado con
 * isotipo encima y chips en píldora rotando era la composición de cualquier
 * chat de IA. Aquí la voz la pone el tamaño del título, y las sugerencias son
 * una lista que se lee de un vistazo, no botones que cambian solos (antes
 * rotaban; un objetivo de clic que se mueve hace que se pulse lo que no se
 * eligió).
 *
 * El composer llega como `composer` desde la pantalla, envuelto en el mismo
 * `layoutId` que usa abajo: al enviar, baja a su sitio en vez de desaparecer
 * aquí y aparecer allá. Sin `composer` (teléfono), el bloque se centra en vertical.
 */
export const EstadoVacio = memo(function EstadoVacio({
  nombre,
  onSugerencia,
  composer,
}: {
  nombre: string;
  onSugerencia: (texto: string) => void;
  composer?: ReactNode;
}) {
  const sugerencias = copy.chips.slice(0, SUGERENCIAS);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.reveal, ease }}
      className={cn('flex w-full flex-col text-left', !composer && 'h-full justify-center px-4 py-10')}
    >
      <h2 className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1 sm:text-32">{copy.saludo(nombre)}</h2>
      <p className="mt-2 font-ui text-15 leading-relaxed text-text-2">{copy.subtituloVacio}</p>

      {composer && <div className="mt-6 w-full">{composer}</div>}

      <section className={composer ? 'mt-8' : 'mt-10'} aria-labelledby="sugerencias-titulo">
        <h3 id="sugerencias-titulo" className="font-ui text-13 font-medium text-text-2">
          {copy.paraEmpezar}
        </h3>
        <ul className="mt-2 divide-y divide-hairline border-y border-hairline">
          {sugerencias.map((chip) => (
            <li key={chip}>
              <motion.button
                type="button"
                onClick={() => onSugerencia(chip)}
                aria-label={`${copyLocal.sugerenciaEtiqueta}: ${chip}`}
                whileTap={{ scale: 0.99 }}
                transition={springPress}
                className="group flex min-h-[44px] w-full items-center justify-between gap-4 px-1 py-2.5 text-left font-ui text-15 text-text-1 transition-colors duration-[120ms] hover:bg-tinta/[.03]"
              >
                {chip}
                <ArrowUpRight
                  size={15}
                  strokeWidth={2}
                  aria-hidden
                  className="shrink-0 text-text-2 transition-colors duration-[120ms] group-hover:text-accent-fg"
                />
              </motion.button>
            </li>
          ))}
        </ul>
      </section>
    </motion.div>
  );
});
