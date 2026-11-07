import { motion } from 'framer-motion';
import { cn } from '../../lib/cn';
import { easeOutExpo, springRebote } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';

/**
 * La función umbral dibujada a escala real: la idea del isotipo convertida en
 * una gráfica de verdad, no en adorno.
 *
 * Eje x: niveles de gris de 0 a 255. Detrás, el histograma de una imagen
 * bimodal (fondo oscuro y objeto claro), que es el caso de libro de Otsu. El
 * escalón T(r) manda a 0 todo lo que está bajo el umbral y a 255 lo que está
 * encima; el nodo azul es el umbral, el único acento de color de la pantalla.
 *
 * Responde al formulario:
 *  - `progreso` (0–1, cuánto del formulario está lleno): el nodo del umbral
 *    sube por el salto y las barras del lado claro se tiñen poco a poco, como
 *    si la imagen se fuera binarizando.
 *  - `cruzado`: el nodo llega arriba y todo el lado claro queda teñido. Es la
 *    confirmación de "entraste": se cruza el umbral, literalmente.
 *
 * Al montar, las barras crecen desde la base con rebote (de izquierda a
 * derecha, 8 ms entre una y otra) y el escalón se traza encima. Con
 * movimiento reducido todo aparece en su sitio y los cambios son instantáneos.
 */

// Lienzo de 520 × 380. Área de la gráfica: x de 40 a 500, base en y = 320.
const X0 = 40;
const X1 = 500;
const BASE = 320;
const BAJO = 280; // T(r) = 0
const ALTO = 96; // T(r) = 255
const UMBRAL = 118; // nivel de gris del umbral (Otsu para este histograma)

const xDe = (nivel: number) => X0 + (nivel / 255) * (X1 - X0);
const XT = xDe(UMBRAL);

// Histograma bimodal: dos campanas (fondo en 70, objeto en 182). Se calcula
// una vez al cargar el módulo; son 64 barras, no hace falta memoizar en render.
const BARRAS = Array.from({ length: 64 }, (_, i) => {
  const nivel = (i + 0.5) * 4;
  const campana = (centro: number, ancho: number, alto: number) =>
    alto * Math.exp(-((nivel - centro) ** 2) / (2 * ancho ** 2));
  const valor = campana(70, 20, 1) + campana(182, 24, 0.78) + 0.03;
  return {
    x: xDe(i * 4) + 0.6,
    ancho: (X1 - X0) / 64 - 1.2,
    alto: valor * 150,
    claro: nivel > UMBRAL,
    // Orden entre las barras claras (0 = la primera tras el umbral): se tiñen
    // de izquierda a derecha conforme avanza el formulario.
    rangoClaro: (nivel - UMBRAL) / (255 - UMBRAL),
  };
});

const MARCAS = [0, 64, 128, 192, 255];

export function GraficaUmbral({
  progreso = 0,
  cruzado = false,
  className,
}: {
  progreso?: number;
  cruzado?: boolean;
  className?: string;
}) {
  const reducido = useReducedMotion();
  const avance = cruzado ? 1 : Math.min(1, Math.max(0, progreso));
  // El nodo recorre el salto: abajo con el formulario vacío, a 3/4 con todo
  // lleno, y arriba solo al cruzar (entrar es lo único que lo completa).
  const yNodo = BAJO - (BAJO - ALTO) * (cruzado ? 1 : avance * 0.75);
  const resorte = reducido ? { duration: 0 } : springRebote;

  return (
    <svg viewBox="0 0 520 380" className={cn('h-auto w-full', className)} role="img" aria-labelledby="grafica-umbral-titulo">
      <title id="grafica-umbral-titulo">
        Función umbral: los niveles de gris por debajo de T pasan a negro y los de arriba a blanco.
      </title>

      {/* Histograma: estructura, no decoración. Las barras crecen desde la
          base (scaleY con origen abajo) y las del lado claro se tiñen con el avance. */}
      <g>
        {BARRAS.map((b, i) => {
          const tenida = b.claro && b.rangoClaro <= avance;
          return (
            <motion.rect
              key={i}
              x={b.x}
              y={BASE - b.alto}
              width={b.ancho}
              height={b.alto}
              rx={1}
              // El color no se interpola (es una variable CSS); la opacidad sí.
              fill={tenida ? 'var(--accent)' : 'var(--text-1)'}
              style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
              initial={reducido ? false : { scaleY: 0 }}
              animate={{ scaleY: 1, fillOpacity: tenida ? 0.3 : 0.07 }}
              transition={{
                scaleY: reducido ? { duration: 0 } : { ...springRebote, delay: 0.15 + i * 0.008 },
                fillOpacity: { duration: reducido ? 0 : 0.3 },
              }}
            />
          );
        })}
      </g>

      {/* Eje x y sus marcas */}
      <line x1={X0} x2={X1} y1={BASE} y2={BASE} stroke="var(--text-1)" strokeOpacity={0.18} />
      {MARCAS.map((m) => (
        <g key={m}>
          <line x1={xDe(m)} x2={xDe(m)} y1={BASE} y2={BASE + 5} stroke="var(--text-1)" strokeOpacity={0.25} />
          <text x={xDe(m)} y={BASE + 22} textAnchor="middle" className="fill-text-2 font-ui text-12 tabular-nums">
            {m}
          </text>
        </g>
      ))}
      <text x={X1} y={BASE + 46} textAnchor="end" className="fill-text-2 font-ui text-12">
        nivel de gris
      </text>

      {/* La vertical del umbral, punteada hasta el eje */}
      <line x1={XT} x2={XT} y1={ALTO - 24} y2={BASE} stroke="var(--accent)" strokeOpacity={0.35} strokeDasharray="3 4" />
      <text x={XT} y={ALTO - 34} textAnchor="middle" className="fill-accent-fg font-ui text-13 font-medium">
        T = {UMBRAL}
      </text>

      {/* El escalón T(r) */}
      <motion.path
        d={`M${X0} ${BAJO} H${XT} V${ALTO} H${X1}`}
        fill="none"
        stroke="var(--text-1)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducido ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: easeOutExpo, delay: 0.1 }}
      />

      {/* Extremos */}
      <circle cx={X0} cy={BAJO} r={5} fill="var(--text-1)" />
      <circle cx={X1} cy={ALTO} r={5} fill="var(--text-1)" />

      {/* El nodo del umbral: sube por el salto con el avance; con rebote. */}
      <motion.g initial={false} animate={{ y: yNodo - BAJO }} transition={resorte}>
        <motion.circle
          cx={XT}
          cy={BAJO}
          r={14}
          fill="var(--accent)"
          initial={false}
          animate={{ fillOpacity: cruzado ? 0.2 : 0.12, scale: cruzado ? 1.25 : 1 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          transition={resorte}
        />
        <circle cx={XT} cy={BAJO} r={6.5} fill="var(--accent)" />
      </motion.g>
    </svg>
  );
}
