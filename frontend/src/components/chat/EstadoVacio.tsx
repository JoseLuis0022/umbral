import { memo, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { springSoft, springSnappy, stagger, dur, ease } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';

const INTERVALO_MS = 4000;

// Los chips rotan MÁS LENTO que la frase de arriba: son objetivos de clic, y
// cada cambio obliga a releer los cuatro. Cuatro segundos alcanzan para leer
// una frase, no para decidir entre cuatro opciones.
const INTERVALO_CHIPS_MS = 9000;
const POR_TANDA = 4;

/**
 * Primera vez / sesión nueva: saludo, una pregunta que rota y chips que
 * precargan el campo.
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
}: {
  nombre: string;
  onSugerencia: (texto: string) => void;
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
    <div className="flex h-full flex-col items-center justify-center gap-8 px-4 py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <motion.h2
          initial={reducido ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSoft}
          className="font-ui text-28 text-text-1"
        >
          {copy.saludo(nombre)}
        </motion.h2>

        {/* Altura fija de dos líneas: sin ella el bloque entero salta cada vez
            que entra una pregunta más larga que la anterior. */}
        <div
          aria-hidden
          className="flex h-[44px] w-full max-w-[440px] items-start justify-center overflow-hidden"
        >
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
      </div>

      {/* La tanda entra, pero no SALE animada. Un crossfade entre tandas
          alargaría el relevo casi medio segundo, y durante ese tiempo hay
          botones a medio desvanecer que siguen siendo pulsables: se puede
          hacer clic en una pregunta que ya se está yendo. Con el cambio de
          `key`, React desmonta la tanda vieja de golpe y monta la nueva, que
          entra escalonada; en todo momento lo que se ve es lo que se puede
          pulsar. */}
      <div
        className="flex min-h-[96px] w-full items-start justify-center md:min-h-[80px]"
        onMouseEnter={() => setPausado(true)}
        onMouseLeave={() => setPausado(false)}
        // `*Capture` porque el foco aterriza en los botones de dentro, no aquí:
        // los eventos de foco no burbujean, así que hay que cazarlos al bajar.
        onFocusCapture={() => setPausado(true)}
        onBlurCapture={() => setPausado(false)}
      >
        <ul className="flex max-w-[620px] flex-wrap items-center justify-center gap-2">
          {visibles.map((chip, i) => (
            <motion.li
              key={chip}
              initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springSoft, delay: stagger.base * (i + 1) }}
            >
              <motion.button
                type="button"
                onClick={() => onSugerencia(chip)}
                aria-label={`${copyLocal.sugerenciaEtiqueta}: ${chip}`}
                whileHover={reducido ? undefined : { y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={springSnappy}
                className="group inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-hairline bg-surface-1 px-3.5 font-ui text-13 text-text-2 shadow-1 transition-colors duration-150 hover:border-accent/30 hover:bg-accent-soft hover:text-accent-fg md:min-h-[36px]"
              >
                {chip}
                <ArrowUpRight
                  size={13}
                  strokeWidth={2}
                  aria-hidden
                  className="text-text-3 transition-colors duration-150 group-hover:text-accent-fg"
                />
              </motion.button>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
});
