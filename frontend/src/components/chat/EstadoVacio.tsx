import { memo, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { springMensaje, springPress, springSoft, stagger, dur, ease } from '../../lib/motion';
import { IsotipoUmbral } from '../brand/Logo';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';
import { cn } from '../../lib/cn';

const INTERVALO_MS = 4000;

// Los chips rotan MÁS LENTO que la frase de arriba: son objetivos de clic, y
// cada cambio obliga a releer los cuatro. Cuatro segundos alcanzan para leer
// una frase, no para decidir entre cuatro opciones.
const INTERVALO_CHIPS_MS = 9000;
const POR_TANDA = 4;

/**
 * Primera vez / sesión nueva: isotipo, saludo (32/40), una pregunta que rota,
 * el composer CENTRADO debajo y los chips de sugerencia.
 *
 * El composer llega como `composer` desde la pantalla, envuelto en el mismo
 * `layoutId` que usa abajo: al enviar, baja a su sitio en vez de desaparecer
 * aquí y aparecer allá. Sin `composer` (teléfono), el bloque se centra solo.
 *
 * La pregunta rotativa es DECORATIVA (`aria-hidden`) a propósito. Un texto que
 * cambia solo cada cuatro segundos dentro de una región anunciable interrumpe
 * al lector de pantalla sin que el usuario haya hecho nada; y si fuera un botón,
 * la etiqueta de un control con foco cambiaría bajo el foco. Los chips de abajo
 * cubren exactamente el mismo terreno y sí son botones de verdad, así que la
 * ruta accesible existe completa.
 *
 * LOS CHIPS TAMBIÉN ROTAN, pero con dos frenos que la frase no necesita, porque
 * son botones y no decoración:
 *
 *  - **Se pausan al pasar el cursor o al entrar el foco.** Un objetivo de clic
 *    que se cambia por otro justo antes del clic hace que la persona envíe una
 *    pregunta que no eligió. Mientras haya alguien mirándolos de cerca, se
 *    quedan quietos.
 *  - **Con `prefers-reduced-motion` no rotan en absoluto.** Ahí la petición no
 *    es solo "menos animación": es contenido que deja de moverse solo.
 *
 * Rotan por TANDAS de cuatro, no de uno en uno: cambiar un chip suelto dentro
 * de un grupo estable es justo el movimiento periférico que distrae mientras se
 * lee otra cosa.
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
  const reducido = useReducedMotion();
  const [indice, setIndice] = useState(0);
  const preguntas = copy.preguntasRotativas;

  const [tanda, setTanda] = useState(0);
  const [pausado, setPausado] = useState(false);
  const tandas = Math.ceil(copy.chips.length / POR_TANDA);

  useEffect(() => {
    if (preguntas.length < 2) return;
    const t = setInterval(() => setIndice((i) => (i + 1) % preguntas.length), INTERVALO_MS);
    return () => clearInterval(t);
  }, [preguntas.length]);

  useEffect(() => {
    if (reducido || pausado || tandas < 2) return;
    const t = setInterval(() => setTanda((n) => (n + 1) % tandas), INTERVALO_CHIPS_MS);
    return () => clearInterval(t);
  }, [reducido, pausado, tandas]);

  const visibles = copy.chips.slice(tanda * POR_TANDA, tanda * POR_TANDA + POR_TANDA);

  return (
    <div className={cn('flex w-full flex-col items-center text-center', composer ? 'gap-0' : 'h-full justify-center px-4 py-10')}>
      <motion.div
        initial={reducido ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducido ? { duration: dur.base, ease } : springMensaje}
        className="flex flex-col items-center gap-3"
      >
        <IsotipoUmbral className="h-7 w-7 text-accent" />
        <h2 className="font-ui text-28 text-text-1 sm:text-32">{copy.saludo(nombre)}</h2>

        {/* Altura fija de dos líneas: sin ella el bloque entero salta cada vez
            que entra una pregunta más larga que la anterior. */}
        <div aria-hidden className="flex h-[44px] w-full max-w-[440px] items-start justify-center overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={indice}
              initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducido ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={reducido ? { duration: dur.base, ease } : springSoft}
              className="font-ui text-15 text-text-2"
            >
              {preguntas[indice]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      {composer && <div className="mt-5 w-full text-left">{composer}</div>}

      {/* La tanda entra, pero no SALE animada. Un crossfade entre tandas
          alargaría el relevo casi medio segundo, y durante ese tiempo hay
          botones a medio desvanecer que siguen siendo pulsables: se puede
          hacer clic en una pregunta que ya se está yendo. Con el cambio de
          `key`, React desmonta la tanda vieja de golpe y monta la nueva, que
          entra escalonada; en todo momento lo que se ve es lo que se puede
          pulsar. */}
      <div
        className={cn('flex w-full items-start justify-center', composer ? 'mt-5 min-h-[84px]' : 'mt-8 min-h-[96px] md:min-h-[84px]')}
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        // `*Capture` porque el foco aterriza en los botones de dentro, no aquí:
        // los eventos de foco no burbujean, así que hay que cazarlos al bajar.
        onFocusCapture={() => setPausado(true)}
        onBlurCapture={() => setPausado(false)}
      >
        <ul className="flex max-w-[640px] flex-wrap items-center justify-center gap-2">
          {visibles.map((chip, i) => (
            <motion.li
              key={chip}
              initial={reducido ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reducido ? { duration: dur.base, ease, delay: stagger.base * (i + 1) } : { ...springSoft, delay: 0.08 + stagger.base * (i + 1) }}
            >
              {/* Chip de 36 px en píldora, sobre superficie con anillo de 1 px.
                  El hover solo cambia el color: nada sube. */}
              <motion.button
                type="button"
                onClick={() => onSugerencia(chip)}
                aria-label={`${copyLocal.sugerenciaEtiqueta}: ${chip}`}
                whileTap={{ scale: 0.97 }}
                transition={springPress}
                className="group inline-flex min-h-[44px] items-center gap-1.5 rounded-pastilla bg-surface-1 px-3.5 font-ui text-13 text-text-2 shadow-anillo transition-colors duration-[120ms] hover:bg-tinta/[.04] hover:text-text-1 md:min-h-9"
              >
                {chip}
                <ArrowUpRight
                  size={13}
                  strokeWidth={2}
                  aria-hidden
                  className="text-text-3 transition-colors duration-[120ms] group-hover:text-text-2"
                />
              </motion.button>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
});
