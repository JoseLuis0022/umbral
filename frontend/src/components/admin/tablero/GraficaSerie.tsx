import { useId, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { dur, ease } from '../../../lib/motion';
import type { PuntoSerie } from '../../../services/tablero.service';
import { entero, horasConUnidad, pesos, plural } from './formato';
import { useAnchoContenedor } from './hooks';

const TEXTO = {
  titulo: 'Actividad por día',
  subtitulo: 'Conversaciones cerradas cada día del periodo.',
  resumenAccesible: (dias: number, total: number, pico: string) =>
    `Gráfica de área: ${plural(total, 'conversación', 'conversaciones')} a lo largo de ${plural(dias, 'día', 'días')}. Día con más actividad: ${pico}.`,
  tablaOculta: 'Detalle de los días con actividad',
  colDia: 'Día',
  colConversaciones: 'Conversaciones',
  colHoras: 'Horas ahorradas',
  colPesos: 'Costo evitado',
  sinActividad: 'Ningún día del periodo registró actividad.',
  conversaciones: (n: number) => plural(n, 'conversación', 'conversaciones'),
};

const ALTO = 220;
const PAD = { izq: 42, der: 14, arriba: 14, abajo: 26 };

type Punto = { x: number; y: number };

/**
 * Catmull-Rom convertido a curvas de Bézier cúbicas.
 *
 * La tensión va por debajo de 1 (la conversión "canónica") porque la serie
 * viene con días en CERO rellenados a propósito por el servicio: con tensión
 * plena, cada valle entre dos ceros se pasa de largo y la curva cruza por
 * debajo de la línea base, dibujando conversaciones negativas. Además de bajar
 * la tensión se recortan los puntos de control al área de dibujo, que es el
 * seguro real contra ese desbordamiento.
 */
function trazoSuave(puntos: Punto[], techo: number, piso: number, tension = 0.8) {
  if (puntos.length === 0) return '';
  if (puntos.length === 1) return `M ${puntos[0].x} ${puntos[0].y}`;

  const recortar = (y: number) => Math.min(piso, Math.max(techo, y));
  let d = `M ${puntos[0].x} ${puntos[0].y}`;

  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] ?? puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] ?? p2;

    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const c1y = recortar(p1.y + ((p2.y - p0.y) / 6) * tension);
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const c2y = recortar(p2.y - ((p3.y - p1.y) / 6) * tension);

    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }

  return d;
}

export function GraficaSerie({ serie }: { serie: PuntoSerie[] }) {
  const [contenedorRef, ancho] = useAnchoContenedor<HTMLDivElement>();
  const reducido = useReducedMotion();
  const [activo, setActivo] = useState<number | null>(null);
  const idDegradado = useId();
  /*
   * Caja del SVG cacheada. `getBoundingClientRect()` dentro de `onPointerMove`
   * fuerza un recálculo de layout SÍNCRONO en cada evento —y un trackpad de
   * 120 Hz emite ciento veinte por segundo—, justo mientras la gráfica y el
   * resto del tablero están animando. Se mide una vez al entrar el puntero
   * (donde el coste es uno solo) y se olvida al salir.
   */
  const caja = useRef<DOMRect | null>(null);

  const geometria = useMemo(() => {
    const anchoUtil = Math.max(0, ancho - PAD.izq - PAD.der);
    const altoUtil = ALTO - PAD.arriba - PAD.abajo;
    const base = PAD.arriba + altoUtil;
    // El máximo nunca baja de 1: con toda la serie en cero, dividir entre el
    // máximo real daría NaN y la gráfica desaparecería sin ningún error.
    const maxY = Math.max(1, ...serie.map((p) => p.conversaciones));
    const paso = serie.length > 1 ? anchoUtil / (serie.length - 1) : 0;

    const puntos: Punto[] = serie.map((p, i) => ({
      x: PAD.izq + i * paso,
      y: PAD.arriba + (1 - p.conversaciones / maxY) * altoUtil,
    }));

    const linea = trazoSuave(puntos, PAD.arriba, base);
    const area =
      puntos.length > 0
        ? `${linea} L ${puntos[puntos.length - 1].x} ${base} L ${puntos[0].x} ${base} Z`
        : '';

    // Una etiqueta cada ~68 px: por debajo de eso las fechas se encinan. El
    // último día siempre se etiqueta —es el dato que más se mira— y si queda
    // demasiado cerca del anterior, se sacrifica el anterior.
    const cada = Math.max(1, Math.ceil(serie.length / Math.max(2, Math.floor(anchoUtil / 68))));
    const marcas: number[] = [];
    for (let i = 0; i < serie.length; i += cada) marcas.push(i);
    const ultimo = serie.length - 1;
    if (ultimo >= 0 && marcas[marcas.length - 1] !== ultimo) {
      if (ultimo - marcas[marcas.length - 1] < cada / 2) marcas.pop();
      marcas.push(ultimo);
    }

    return { anchoUtil, altoUtil, base, maxY, paso, puntos, linea, area, marcas };
  }, [serie, ancho]);

  const totales = useMemo(
    () => serie.reduce((n, p) => n + p.conversaciones, 0),
    [serie]
  );
  const pico = useMemo(
    () => serie.reduce<PuntoSerie | null>((a, p) => (!a || p.conversaciones > a.conversaciones ? p : a), null),
    [serie]
  );
  const conActividad = useMemo(() => serie.filter((p) => p.conversaciones > 0), [serie]);

  const alEntrar = (e: ReactPointerEvent<SVGSVGElement>) => {
    caja.current = e.currentTarget.getBoundingClientRect();
  };

  const alMover = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (serie.length === 0) return;
    const medida = caja.current ?? e.currentTarget.getBoundingClientRect();
    caja.current = medida;
    const x = e.clientX - medida.left;
    const i = geometria.paso === 0 ? 0 : Math.round((x - PAD.izq) / geometria.paso);
    setActivo(Math.min(serie.length - 1, Math.max(0, i)));
  };

  const puntoActivo = activo === null ? null : serie[activo];
  const coordActiva = activo === null ? null : geometria.puntos[activo];

  return (
    <figure className="m-0 flex flex-col gap-4">
      <figcaption className="flex flex-col gap-0.5">
        <h2 className="font-ui text-15 font-semibold text-text-1">{TEXTO.titulo}</h2>
        <p className="font-ui text-12 text-text-3">{TEXTO.subtitulo}</p>
      </figcaption>

      {/* El contenedor reserva la altura final desde el primer pintado: la
          gráfica solo puede dibujarse cuando ya se midió el ancho, y sin esta
          altura el bloque saltaría de 0 px a 220 px al segundo frame. */}
      <div ref={contenedorRef} className="relative w-full" style={{ height: ALTO }}>
        {ancho > 0 && (
          <svg
            width={ancho}
            height={ALTO}
            role="img"
            aria-label={TEXTO.resumenAccesible(
              serie.length,
              totales,
              pico && pico.conversaciones > 0
                ? `${pico.etiqueta}, ${TEXTO.conversaciones(pico.conversaciones)}`
                : TEXTO.sinActividad
            )}
            className="block touch-pan-y"
            onPointerEnter={alEntrar}
            onPointerMove={alMover}
            onPointerLeave={() => {
              caja.current = null;
              setActivo(null);
            }}
          >
            <defs>
              <linearGradient id={idDegradado} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Rejilla: tres líneas y solo dos etiquetas (0 y el máximo). Un eje
                completo de números compite con la curva, que es el dato. */}
            {[0, 0.5, 1].map((f) => {
              const y = PAD.arriba + f * geometria.altoUtil;
              return (
                <line
                  key={f}
                  x1={PAD.izq}
                  x2={ancho - PAD.der}
                  y1={y}
                  y2={y}
                  stroke="var(--hairline)"
                  strokeWidth={1}
                />
              );
            })}
            <text x={PAD.izq - 8} y={PAD.arriba + 4} textAnchor="end" className="fill-text-3 font-ui text-[11px]">
              {entero(geometria.maxY)}
            </text>
            <text x={PAD.izq - 8} y={geometria.base + 4} textAnchor="end" className="fill-text-3 font-ui text-[11px]">
              0
            </text>

            <motion.path
              key={`area-${serie.length}-${serie[0]?.fecha ?? ''}`}
              d={geometria.area}
              fill={`url(#${idDegradado})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducido ? dur.fast : dur.reveal, ease: [...ease], delay: reducido ? 0 : dur.fast }}
            />
            <motion.path
              key={`linea-${serie.length}-${serie[0]?.fecha ?? ''}`}
              d={geometria.linea}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reducido ? { opacity: 0 } : { pathLength: 0 }}
              animate={reducido ? { opacity: 1 } : { pathLength: 1 }}
              // `dur.reveal` y no 0.9 s. `pathLength` se implementa con
              // `stroke-dashoffset`: no es compositable y obliga a re-rasterizar
              // el trazo completo en cada frame, así que casi un segundo de
              // repintado era lo más caro de la pantalla — y además era el único
              // literal de duración fuera del sistema en todo el tablero.
              transition={{ duration: reducido ? dur.fast : dur.reveal, ease: [...ease] }}
            />

            {geometria.marcas.map((i) => (
              <text
                key={i}
                x={geometria.puntos[i]?.x ?? 0}
                y={ALTO - 6}
                textAnchor={i === 0 ? 'start' : i === serie.length - 1 ? 'end' : 'middle'}
                className="fill-text-3 font-ui text-[11px]"
              >
                {serie[i]?.etiqueta}
              </text>
            ))}

            {coordActiva && (
              <g>
                <line
                  x1={coordActiva.x}
                  x2={coordActiva.x}
                  y1={PAD.arriba}
                  y2={geometria.base}
                  stroke="var(--hairline-strong)"
                  strokeWidth={1}
                />
                <circle cx={coordActiva.x} cy={coordActiva.y} r={5} fill="var(--surface-1)" stroke="var(--accent)" strokeWidth={2.5} />
              </g>
            )}
          </svg>
        )}

        {puntoActivo && coordActiva && (
          <div
            // Anclado arriba y no junto al cursor: un tooltip que persigue el
            // puntero tapa justo el tramo de curva que se está mirando.
            className="pointer-events-none absolute top-0 z-10 w-[168px] -translate-x-1/2 rounded-control border border-hairline bg-surface-3/95 px-3 py-2 shadow-2 backdrop-blur-xl"
            style={{ left: Math.min(Math.max(coordActiva.x, 88), Math.max(88, ancho - 88)) }}
          >
            <p className="font-ui text-12 font-semibold text-text-1">{puntoActivo.etiqueta}</p>
            <dl className="mt-1 flex flex-col gap-0.5 font-ui text-12 text-text-2">
              <div className="flex justify-between gap-2">
                <dt>{TEXTO.colConversaciones}</dt>
                <dd className="tabular-nums text-text-1">{entero(puntoActivo.conversaciones)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{TEXTO.colHoras}</dt>
                <dd className="tabular-nums text-text-1">{horasConUnidad(puntoActivo.minutos)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>{TEXTO.colPesos}</dt>
                <dd className="tabular-nums text-text-1">{pesos(puntoActivo.pesos)}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* La curva es la única representación visual de estos números: sin esta
          tabla, quien navega con lector de pantalla se queda solo con el
          resumen. Se listan los días CON actividad; los ceros de relleno son
          contexto visual del ritmo, no datos que valga la pena dictar. */}
      <table className="sr-only">
        <caption>{TEXTO.tablaOculta}</caption>
        <thead>
          <tr>
            <th scope="col">{TEXTO.colDia}</th>
            <th scope="col">{TEXTO.colConversaciones}</th>
            <th scope="col">{TEXTO.colHoras}</th>
            <th scope="col">{TEXTO.colPesos}</th>
          </tr>
        </thead>
        <tbody>
          {conActividad.length === 0 ? (
            <tr>
              <td colSpan={4}>{TEXTO.sinActividad}</td>
            </tr>
          ) : (
            conActividad.map((p) => (
              <tr key={p.fecha}>
                <th scope="row">{p.etiqueta}</th>
                <td>{entero(p.conversaciones)}</td>
                <td>{horasConUnidad(p.minutos)}</td>
                <td>{pesos(p.pesos)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </figure>
  );
}
