import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  DollarSign,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { NivelAnalisis } from '../../../types';

/**
 * Indicador de nivel para la tabla del tablero.
 *
 * Es el MISMO lenguaje visual que `IndicadorAnalisis` de la auditoría (icono en
 * un cuadrado redondeado + palabra del nivel + escala de tres segmentos, todo
 * teñido con el color semántico): un directivo que abre las dos pantallas debe
 * leer el mismo símbolo con el mismo significado. No se importa aquel
 * componente a propósito —vive en la zona de auditoría y su layout es el de una
 * barra ancha, con la etiqueta encima del nivel— porque en una celda de tabla
 * la etiqueta ya la da el encabezado de la columna y ese renglón se aprovecha
 * para algo que allá no existe: la CIFRA exacta.
 *
 * Diferencias deliberadas con la versión de auditoría:
 *  - El renglón de arriba es la cifra exacta (3.1 h, $6,520), no la etiqueta.
 *    El tablero existe para justificar presupuesto: la cifra no se esconde
 *    detrás de un "alto".
 *  - Sin `framer-motion`. Allá hay tres indicadores en pantalla; aquí hay tres
 *    por fila y la tabla se reordena a cada clic de encabezado: animar ~54
 *    segmentos en cada reordenamiento cuesta frames y no comunica nada. Al no
 *    haber movimiento, tampoco hay nada que degradar con
 *    `prefers-reduced-motion` (la entrada de la fila ya la anima `DataTable`).
 *
 * ASIMETRÍA DELIBERADA (la misma que en auditoría): en el riesgo "bajo" es la
 * buena noticia; en los dos ahorros lo es "alto". Por eso hay DOS mapas de tono
 * y no una función única `nivel → color`.
 */

// Las clases se escriben COMPLETAS. Tailwind escanea texto plano: un
// `text-status-${familia}` no genera nada y falla en silencio, sin error.
type Tono = { texto: string; fondo: string; segmento: string; segmentoApagado: string };

const TONO_BUENO: Tono = {
  texto: 'text-status-green',
  fondo: 'bg-status-green-soft',
  segmento: 'bg-status-green',
  segmentoApagado: 'bg-status-green/20',
};
const TONO_ATENCION: Tono = {
  texto: 'text-status-amber',
  fondo: 'bg-status-amber-soft',
  segmento: 'bg-status-amber',
  segmentoApagado: 'bg-status-amber/20',
};
// Rojo TERROSO (--status-red), NUNCA el rojo de marca: si el peligro usara el
// rojo institucional, el mismo color significaría "haz clic aquí" y "cuidado
// con esto" en la misma pantalla.
const TONO_PELIGRO: Tono = {
  texto: 'text-status-red',
  fondo: 'bg-status-red-soft',
  segmento: 'bg-status-red',
  segmentoApagado: 'bg-status-red/20',
};
const TONO_NEUTRO: Tono = {
  texto: 'text-text-2',
  fondo: 'bg-status-gray-soft',
  segmento: 'bg-status-gray',
  segmentoApagado: 'bg-status-gray/20',
};

/** Riesgo: bajo es bueno, alto es la alarma. */
const TONO_RIESGO: Record<NivelAnalisis, Tono> = {
  bajo: TONO_BUENO,
  medio: TONO_ATENCION,
  alto: TONO_PELIGRO,
};

/**
 * Ahorro (tiempo y costo): solo "alto" es una buena noticia que merezca color.
 * Un ahorro medio o bajo no es un problema —no hay nada que corregir—, así que
 * se queda en neutro: teñir de ámbar un ahorro medio inventaría una alarma que
 * no existe. La diferencia entre medio y bajo la llevan la palabra, la cifra y
 * los segmentos, que es donde debe estar.
 */
const TONO_AHORRO: Record<NivelAnalisis, Tono> = {
  bajo: TONO_NEUTRO,
  medio: TONO_NEUTRO,
  alto: TONO_BUENO,
};

const SEGMENTOS: Record<NivelAnalisis, number> = { bajo: 1, medio: 2, alto: 3 };

export type ClaseIndicador = 'riesgo' | 'ahorroTiempo' | 'ahorroCosto';

/**
 * El icono CAMBIA con el nivel donde la dirección significa algo, y cada
 * dimensión usa una familia de forma distinta para que "alto" en riesgo y
 * "alto" en ahorro no compartan la misma silueta:
 *
 *  - Riesgo: flechas. Apuntan hacia arriba cuando el riesgo sube, hacia abajo
 *    cuando baja. Es la lectura natural de "subió / bajó el riesgo".
 *  - Ahorro de tiempo: chevrones (uno doble para "alto"). Misma idea de
 *    dirección, silueta distinta a la del riesgo.
 *  - Ahorro de costo: el signo de pesos, SIEMPRE. Es lo que identifica la
 *    columna de un vistazo, y poner otra flecha justo al lado de la del ahorro
 *    de tiempo duplicaría el mismo gesto dos columnas seguidas sin añadir
 *    información: aquí el nivel lo llevan el tono, la palabra y los segmentos.
 */
const ICONO: Record<ClaseIndicador, Record<NivelAnalisis, LucideIcon>> = {
  riesgo: { bajo: ArrowDownRight, medio: ArrowRight, alto: ArrowUpRight },
  ahorroTiempo: { bajo: ChevronDown, medio: ChevronUp, alto: ChevronsUp },
  ahorroCosto: { bajo: DollarSign, medio: DollarSign, alto: DollarSign },
};

/**
 * Frases que explican cada combinación EN TEXTO, para que la celda se entienda
 * sin ver un solo color (lector de pantalla, impresión en blanco y negro,
 * daltonismo). Son las mismas de la auditoría; todavía no están en `src/copy`
 * (ver reporte), y por eso se repiten aquí en lugar de importarse desde la
 * carpeta de otro agente.
 */
const EXPLICACION: Record<ClaseIndicador, Record<NivelAnalisis, string>> = {
  riesgo: {
    bajo: 'Riesgo bajo: la conversación no expuso datos personales ni incumplió la política.',
    medio: 'Riesgo medio: se rozó un límite de la política y el asistente lo advirtió antes de continuar.',
    alto: 'Riesgo alto: se intentó tratar datos personales o algo fuera de la política institucional.',
  },
  ahorroTiempo: {
    bajo: 'Ahorro de tiempo bajo: resolvió una duda puntual, sin sustituir trabajo manual.',
    medio: 'Ahorro de tiempo medio: acortó una tarea de varios minutos.',
    alto: 'Ahorro de tiempo alto: sustituyó un trabajo manual de horas o días.',
  },
  ahorroCosto: {
    bajo: 'Ahorro de costo bajo: no sustituyó ningún gasto identificable.',
    medio: 'Ahorro de costo medio: evitó parte de un proceso que hoy se paga por fuera.',
    alto: 'Ahorro de costo alto: evitó horas de personal o la contratación de un servicio externo.',
  },
};

/**
 * Qué se dice cuando NO hay nivel. Son dos ausencias distintas y se nombran
 * distinto a propósito: una conversación sin analizar no es lo mismo que un
 * análisis al que le falta esta dimensión. Ninguna de las dos se pinta como un
 * "bajo": inventar el mejor nivel posible para lo que nadie midió es
 * exactamente lo que haría que este tablero dejara de ser creíble.
 */
const SIN_NIVEL = {
  sinAnalisis: {
    palabra: 'sin analizar',
    frase: 'Esta conversación todavía no tiene análisis, así que no hay nivel que mostrar.',
  },
  noRegistrado: {
    palabra: 'sin nivel',
    frase: 'El análisis de esta conversación no registró un nivel para esta dimensión.',
  },
} as const;

/** Los tres segmentos. Decorativos: el nivel ya va escrito al lado. */
function Segmentos({ llenos, tono }: { llenos: number; tono: Tono }) {
  return (
    <span className="flex items-center gap-[3px]" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn('h-2.5 w-[3px] rounded-[2px]', i < llenos ? tono.segmento : tono.segmentoApagado)}
        />
      ))}
    </span>
  );
}

export function IndicadorNivel({
  clase,
  nivel,
  cifra,
  detalle,
  /** `true` cuando la conversación entera no tiene análisis. */
  sinAnalisis = false,
}: {
  clase: ClaseIndicador;
  nivel: NivelAnalisis | null;
  /** Cifra exacta que va sobre el nivel ("3.1 h", "$6,520"). El riesgo no tiene. */
  cifra?: string;
  /** Ampliación de la cifra para el `title` ("187 minutos"). */
  detalle?: string;
  sinAnalisis?: boolean;
}) {
  const hayNivel = nivel !== null;
  const tono = hayNivel ? (clase === 'riesgo' ? TONO_RIESGO[nivel] : TONO_AHORRO[nivel]) : TONO_NEUTRO;
  const Icono = hayNivel ? ICONO[clase][nivel] : Minus;
  const ausencia = sinAnalisis ? SIN_NIVEL.sinAnalisis : SIN_NIVEL.noRegistrado;
  const palabra = hayNivel ? nivel : ausencia.palabra;
  const frase = hayNivel ? EXPLICACION[clase][nivel] : ausencia.frase;
  // El `title` y el `aria-label` llevan SIEMPRE la cifra exacta además de la
  // frase: es el dato con el que se defiende un presupuesto y no puede quedar
  // solo insinuado por tres barritas.
  const descripcion = [frase, detalle].filter(Boolean).join(' ');

  return (
    <div
      // role="group" y no aria-hidden en las partes: la celda completa es UN
      // dato para el lector de pantalla, con la frase entera. Oír
      // "Riesgo · bajo · tres barras" por separado no dice nada.
      role="group"
      aria-label={descripcion}
      title={descripcion}
      className="flex items-center gap-2.5"
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-control',
          tono.fondo,
          tono.texto,
          // Contorno punteado solo en la ausencia: se distingue del resto sin
          // leerlo, y a la vez no se confunde con un nivel "bajo" en gris.
          !hayNivel && 'border border-dashed border-hairlineStrong bg-transparent'
        )}
      >
        <Icono size={16} strokeWidth={hayNivel && nivel === 'medio' ? 2 : 2.25} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {cifra && (
          <span className="whitespace-nowrap font-ui text-12 leading-none tabular-nums text-text-2">{cifra}</span>
        )}
        <div className="flex items-center gap-1.5">
          <span className={cn('whitespace-nowrap font-ui text-13 font-semibold leading-none', tono.texto)}>
            {palabra}
          </span>
          <Segmentos llenos={hayNivel ? SEGMENTOS[nivel] : 0} tono={tono} />
        </div>
      </div>
    </div>
  );
}
