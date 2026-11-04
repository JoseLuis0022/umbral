import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { dur, ease, retardoEscalonado, springSoft, stagger } from '../../../lib/motion';
import type { BarraArea } from '../../../services/tablero.service';
import { entero, horasConUnidad, pesos, plural } from './formato';

const TEXTO = {
  titulo: 'Costo evitado por área',
  subtitulo: 'De mayor a menor. La primera barra es la que más aporta.',
  riesgoAlto: (n: number) => `${entero(n)} de riesgo alto`,
  riesgoAltoDesc: (n: number, area: string) =>
    `${plural(n, 'conversación', 'conversaciones')} de riesgo alto en ${area}`,
  meta: (conversaciones: number, minutos: number) =>
    `${plural(conversaciones, 'conversación', 'conversaciones')} · ${horasConUnidad(minutos)} ahorradas`,
  vacio: 'Ninguna área registró actividad en este periodo.',
};

/**
 * Barras horizontales por área.
 *
 * Es el único gráfico del tablero que NO se dibuja en SVG. Los nombres de las
 * áreas son largos ("Dirección de Informática y Telecomunicaciones") y en SVG
 * habría que truncarlos a mano midiendo caracteres; en HTML el navegador ya
 * sabe truncar, el texto es texto real (seleccionable, buscable con Ctrl+F y
 * leído sin necesidad de una tabla oculta) y la barra es un solo `div`. Meter
 * eso en un SVG sería trabajo extra a cambio de un resultado peor.
 *
 * El riesgo alto se marca con icono + cuenta escrita junto al nombre, NO
 * cambiando el color de la barra: la longitud de la barra ya codifica el
 * dinero, y teñirla además por riesgo haría que dos variables compitieran por
 * el mismo canal visual.
 */
export function BarrasArea({ areas }: { areas: BarraArea[] }) {
  const reducido = useReducedMotion();
  const maximo = Math.max(1, ...areas.map((a) => a.pesos));

  return (
    <section className="flex flex-col gap-4" aria-label={TEXTO.titulo}>
      <header className="flex flex-col gap-0.5">
        <h2 className="font-ui text-15 font-semibold text-text-1">{TEXTO.titulo}</h2>
        <p className="font-ui text-12 text-text-3">{TEXTO.subtitulo}</p>
      </header>

      {areas.length === 0 ? (
        <p className="py-6 text-center font-ui text-13 text-text-3">{TEXTO.vacio}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {areas.map((a, i) => (
            <li key={a.area} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="truncate font-ui text-13 font-medium text-text-1" title={a.area}>
                    {a.area}
                  </span>
                  {a.riesgoAlto > 0 && (
                    <span
                      role="img"
                      aria-label={TEXTO.riesgoAltoDesc(a.riesgoAlto, a.area)}
                      title={TEXTO.riesgoAltoDesc(a.riesgoAlto, a.area)}
                      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-ui text-12 font-medium text-status-red"
                    >
                      <AlertTriangle size={12} strokeWidth={2.25} aria-hidden />
                      {TEXTO.riesgoAlto(a.riesgoAlto)}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-ui text-13 font-semibold tabular-nums text-text-1">
                  {pesos(a.pesos)}
                </span>
              </div>

              {/* La pista usa el lienzo de la app (--bg) y no un gris nuevo:
                  así la barra se lee como relleno sobre un hueco, no como dos
                  colores compitiendo. Radio `celda`, nunca `pastilla`: la
                  pastilla completa está reservada a StatusPill. */}
              <div className="h-3 w-full overflow-hidden rounded-celda bg-bg" aria-hidden>
                {/* `scaleX` y no `width`. Animar el ancho obliga a recalcular
                    layout y a repintar en CADA frame, por cada barra y a la vez;
                    `scaleX` es un transform, vive en el compositor y el
                    navegador lo promociona solo. La pista de fuera ya recorta
                    con `overflow-hidden`, así que la barra no necesita radio
                    propio (que además se deformaría al escalar).
                    El escalonado va topado: con diez áreas, un delay sin tope
                    hacía que la última barra empezara 400 ms tarde en CADA
                    cambio de periodo, no solo al montar. */}
                <motion.div
                  className="h-full w-full origin-left bg-accent"
                  initial={reducido ? { opacity: 0, scaleX: a.pesos / maximo } : { scaleX: 0 }}
                  animate={reducido ? { opacity: 1 } : { scaleX: a.pesos / maximo }}
                  transition={
                    reducido
                      ? { duration: dur.fast, ease: [...ease] }
                      : { ...springSoft, delay: retardoEscalonado(i, stagger.base) }
                  }
                />
              </div>

              <p className="font-ui text-12 text-text-3">{TEXTO.meta(a.conversaciones, a.minutos)}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
