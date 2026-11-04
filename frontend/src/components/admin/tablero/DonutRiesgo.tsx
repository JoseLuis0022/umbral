import { motion } from 'framer-motion';
import { StatusPill } from '../../ui';
import type { StatusFamily } from '../../../lib/status';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { dur, ease, stagger } from '../../../lib/motion';
import type { ResumenTablero } from '../../../services/tablero.service';
import { entero, plural } from './formato';

const TEXTO = {
  titulo: 'Distribución de riesgo',
  subtitulo: 'Solo cuentan las conversaciones con análisis.',
  centro: 'analizadas',
  alto: 'Riesgo alto',
  medio: 'Riesgo medio',
  bajo: 'Riesgo bajo',
  vacio: 'Ninguna conversación de este periodo tiene análisis todavía.',
  resumenAccesible: (total: number, detalle: string) =>
    `Gráfica de dona: ${plural(total, 'conversación analizada', 'conversaciones analizadas')}. ${detalle}`,
};

const TAMANO = 168;
const CENTRO = TAMANO / 2;
const RADIO = 66;
const GROSOR = 20;

/** Un hueco entre segmentos, en grados. Separa sin necesidad de un borde blanco. */
const SEPARACION = 2.5;

type Segmento = { clave: string; etiqueta: string; valor: number; tono: StatusFamily; color: string };

function punto(grados: number) {
  const rad = ((grados - 90) * Math.PI) / 180; // -90: el 0 arranca arriba
  return { x: CENTRO + RADIO * Math.cos(rad), y: CENTRO + RADIO * Math.sin(rad) };
}

function arco(desde: number, hasta: number) {
  const p1 = punto(desde);
  const p2 = punto(hasta);
  const grande = hasta - desde > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${RADIO} ${RADIO} 0 ${grande} 1 ${p2.x} ${p2.y}`;
}

/**
 * Dona de riesgo.
 *
 * Se dibuja con `path` + `pathLength` y no con `stroke-dasharray` sobre un
 * `circle`: la animación de entrada es un trazo que se dibuja, y `pathLength`
 * de Framer Motion ya hace exactamente eso sobre un path. Con dasharray habría
 * que animar a mano dos atributos que además se pelean con los offsets que
 * posicionan cada segmento.
 *
 * Orden fijo alto → medio → bajo empezando arriba: lo grave siempre ocupa el
 * mismo sitio del reloj, así el gráfico se compara entre periodos de un
 * vistazo sin volver a leer la leyenda.
 */
export function DonutRiesgo({ resumen }: { resumen: ResumenTablero }) {
  const reducido = useReducedMotion();

  const segmentos: Segmento[] = [
    { clave: 'alto', etiqueta: TEXTO.alto, valor: resumen.riesgoAlto, tono: 'red', color: 'var(--status-red)' },
    { clave: 'medio', etiqueta: TEXTO.medio, valor: resumen.riesgoMedio, tono: 'amber', color: 'var(--status-amber)' },
    { clave: 'bajo', etiqueta: TEXTO.bajo, valor: resumen.riesgoBajo, tono: 'green', color: 'var(--status-green)' },
  ];

  const total = segmentos.reduce((n, s) => n + s.valor, 0);
  const conValor = segmentos.filter((s) => s.valor > 0);
  // Un único nivel presente daría un arco de 360° cuyos extremos coinciden: el
  // comando "A" degenera y no dibuja nada. En ese caso va un círculo completo.
  const anillo = total > 0 && conValor.length === 1 ? conValor[0] : null;

  let acumulado = 0;
  const arcos = conValor.map((s) => {
    const desde = (acumulado / total) * 360;
    acumulado += s.valor;
    const hasta = (acumulado / total) * 360;
    return { ...s, d: arco(desde + SEPARACION / 2, hasta - SEPARACION / 2) };
  });

  const detalle = segmentos.map((s) => `${s.etiqueta}: ${entero(s.valor)}`).join('. ');

  return (
    <section className="flex flex-col gap-4" aria-label={TEXTO.titulo}>
      <header className="flex flex-col gap-0.5">
        <h2 className="font-ui text-15 font-semibold text-text-1">{TEXTO.titulo}</h2>
        <p className="font-ui text-12 text-text-3">{TEXTO.subtitulo}</p>
      </header>

      {total === 0 ? (
        <p className="py-6 text-center font-ui text-13 text-text-3">{TEXTO.vacio}</p>
      ) : (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6 lg:flex-col lg:gap-5">
          <div className="relative shrink-0" style={{ width: TAMANO, height: TAMANO }}>
            <svg
              width={TAMANO}
              height={TAMANO}
              role="img"
              aria-label={TEXTO.resumenAccesible(total, detalle)}
              className="block"
            >
              <circle
                cx={CENTRO}
                cy={CENTRO}
                r={RADIO}
                fill="none"
                stroke="var(--hairline)"
                strokeWidth={GROSOR}
              />
              {anillo ? (
                <motion.circle
                  cx={CENTRO}
                  cy={CENTRO}
                  r={RADIO}
                  fill="none"
                  stroke={anillo.color}
                  strokeWidth={GROSOR}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: dur.slow, ease: [...ease] }}
                />
              ) : (
                arcos.map((s, i) => (
                  <motion.path
                    key={s.clave}
                    d={s.d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={GROSOR}
                    strokeLinecap="butt"
                    initial={reducido ? { opacity: 0 } : { pathLength: 0 }}
                    animate={reducido ? { opacity: 1 } : { pathLength: 1 }}
                    transition={{
                      duration: reducido ? dur.fast : dur.reveal,
                      ease: [...ease],
                      delay: reducido ? 0 : i * stagger.loose,
                    }}
                  />
                ))
              )}
            </svg>

            {/* El total va en el hueco, no en la leyenda: es la cifra que da
                sentido a los porcentajes que la rodean. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden>
              <span className="font-ui text-28 tabular-nums text-text-1">{entero(total)}</span>
              <span className="font-ui text-12 text-text-3">{TEXTO.centro}</span>
            </div>
          </div>

          <ul className="flex w-full min-w-0 flex-col gap-2.5">
            {segmentos.map((s) => (
              <li key={s.clave} className="flex items-center justify-between gap-3">
                <StatusPill label={s.etiqueta} tone={s.tono} variant="dot" />
                <span className="shrink-0 font-ui text-13 tabular-nums text-text-1">
                  {entero(s.valor)}
                  <span className="ml-1.5 font-ui text-12 text-text-3">
                    {entero((s.valor / total) * 100)} %
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
