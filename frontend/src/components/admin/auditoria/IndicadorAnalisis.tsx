import { ArrowDownRight, ArrowUpRight, DollarSign, type LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/cn';
import type { NivelAnalisis } from '../../../types';

/**
 * Indicador de análisis de una conversación auditada.
 *
 * ASIMETRÍA DELIBERADA: en el riesgo, "bajo" es la buena noticia; en los dos
 * ahorros, "alto" lo es. Por eso hay DOS mapas de tono y no una sola función
 * `nivel → color`: tratarlos igual pintaría de verde una conversación de
 * riesgo alto.
 *
 * El color nunca va solo. Cada indicador comunica el nivel por CUATRO vías:
 *  1. la palabra ("bajo" / "medio" / "alto"), escrita, no insinuada;
 *  2. la dirección del icono — flecha que baja en riesgo, que sube en ahorro,
 *     de modo que "lo deseable" apunta a lados distintos y no se confunden;
 *  3. una escala de tres segmentos llenos/vacíos, legible en escala de grises;
 *  4. el color de tono.
 * Además `title` y `aria-label` llevan la frase completa que explica el nivel.
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
// Rojo TERROSO (--status-red), nunca el azul de marca ni un rojo vivo: si el peligro
// compartiera tono con la acción, el mismo color significaría "haz clic aquí" y "cuidado
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
 * no existe. La diferencia entre medio y bajo la llevan la palabra y los
 * segmentos, que es donde debe estar.
 */
const TONO_AHORRO: Record<NivelAnalisis, Tono> = {
  bajo: TONO_NEUTRO,
  medio: TONO_NEUTRO,
  alto: TONO_BUENO,
};

const SEGMENTOS: Record<NivelAnalisis, number> = { bajo: 1, medio: 2, alto: 3 };

export type ClaseIndicador = 'riesgo' | 'ahorroTiempo' | 'ahorroCosto';

const ICONO: Record<ClaseIndicador, LucideIcon> = {
  riesgo: ArrowDownRight,
  ahorroTiempo: ArrowUpRight,
  ahorroCosto: DollarSign,
};

/**
 * Frases que explican cada combinación EN TEXTO, para que el indicador se
 * entienda sin ver un solo color (lector de pantalla, impresión en blanco y
 * negro, daltonismo). No están en `src/copy` todavía: ver el reporte.
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

export function IndicadorAnalisis({
  clase,
  etiqueta,
  nivel,
  className,
}: {
  clase: ClaseIndicador;
  etiqueta: string;
  nivel: NivelAnalisis;
  className?: string;
}) {
  const tono = clase === 'riesgo' ? TONO_RIESGO[nivel] : TONO_AHORRO[nivel];
  const Icono = ICONO[clase];
  const llenos = SEGMENTOS[nivel];
  const explicacion = EXPLICACION[clase][nivel];

  return (
    <div
      // group, no aria-hidden: el bloque completo es UN dato para el lector de
      // pantalla, con la frase entera; leer "Riesgo · bajo · tres barras" por
      // separado no dice nada.
      role="group"
      aria-label={explicacion}
      title={explicacion}
      className={cn('flex min-w-0 items-center gap-2.5', className)}
    >
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-control', tono.fondo, tono.texto)}>
        <Icono size={16} strokeWidth={nivel === 'medio' ? 2 : 2.25} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {/* En teléfono la etiqueta puede partirse: "Ahorro de tiempo" no cabe en
            un tercio de 360 px y chocaba con el indicador vecino. */}
        <span className="font-ui text-12 leading-tight text-text-3 sm:whitespace-nowrap sm:leading-none">{etiqueta}</span>
        <div className="flex items-center gap-1.5">
          <span className={cn('font-ui text-13 font-semibold leading-none', tono.texto)}>{nivel}</span>
          {/* Escala de tres segmentos: el nivel sigue siendo legible sin color. */}
          <span className="flex items-center gap-[3px]" aria-hidden>
            {/* Segmentos SIN animación, igual que su gemelo del tablero
                (`IndicadorNivel`), que documenta por qué renuncia a Framer.
                Aquí la animación además no cumplía lo que prometía: la barra no
                lleva `key` por conversación, así que React reconciliaba las
                instancias por posición y el `initial` solo se ejecutaba en el
                primer montaje de la sesión. De la segunda conversación en
                adelante los segmentos ya cambiaban de color de golpe — y
                encima el `scaleY` no consultaba la preferencia de movimiento.
                Nueve elementos animándose por una información que ya llevan el
                color, la palabra y el icono. */}
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={cn('h-2.5 w-[3px] rounded-[2px]', i < llenos ? tono.segmento : tono.segmentoApagado)}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Punto discreto para marcar riesgo alto en la lista, sin gritar. */
export function MarcaRiesgoAlto() {
  return (
    <span
      role="img"
      aria-label={EXPLICACION.riesgo.alto}
      title={EXPLICACION.riesgo.alto}
      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-status-red"
    />
  );
}
