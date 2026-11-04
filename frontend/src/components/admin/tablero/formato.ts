import type { NivelAnalisis } from '../../../types';
import type { StatusFamily } from '../../../lib/status';

/**
 * Formateadores del tablero, en un solo lugar.
 *
 * Los `Intl.NumberFormat` se construyen UNA vez a nivel de módulo y no dentro
 * del render: crear un formateador es caro y la tabla lo llamaría una vez por
 * celda en cada reordenamiento.
 *
 * Las cifras de dinero van SIN centavos a propósito. Un tablero directivo se
 * lee de un vistazo y "$12,480" se compara mejor que "$12,480.37"; el detalle
 * al peso vive en el CSV, que es donde alguien va a hacer cuentas.
 */

const PESOS = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});
const ENTERO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
const UNA_DECIMAL = new Intl.NumberFormat('es-MX', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const pesos = (n: number) => PESOS.format(n);
export const entero = (n: number) => ENTERO.format(Math.round(n));
export const unaDecimal = (n: number) => UNA_DECIMAL.format(n);

/** Minutos → horas. El servicio guarda minutos; el directivo piensa en horas. */
export const aHoras = (minutos: number) => minutos / 60;
export const horasConUnidad = (minutos: number) => `${unaDecimal(aHoras(minutos))} h`;

/** Espacio fino antes del signo, que es la convención tipográfica en español. */
export const porcentaje = (n: number) => `${n > 0 ? '+' : ''}${entero(n)} %`;

export const plural = (n: number, singular: string, pluralPalabra: string) =>
  `${entero(n)} ${n === 1 ? singular : pluralPalabra}`;

// ── Riesgo ──────────────────────────────────────────────────────────────────
//
// El riesgo se mapea a las familias de `src/lib/status.ts` (nunca al rojo de
// marca): alto → red terroso, medio → amber, bajo → green. Es la misma
// asimetría que ya aplica `IndicadorAnalisis` en la auditoría — en riesgo,
// "bajo" es la buena noticia.

/**
 * Etiqueta capitalizada de un nivel. Sirve para riesgo y para los dos ahorros
 * —los tres comparten la escala bajo/medio/alto— y se usa en el selector de
 * filtro y en el CSV. En pantalla, dentro de `IndicadorNivel`, el nivel se
 * escribe en minúsculas para leerse igual que en la auditoría.
 */
export const ETIQUETA_NIVEL: Record<NivelAnalisis, string> = {
  alto: 'Alto',
  medio: 'Medio',
  bajo: 'Bajo',
};

export const TONO_RIESGO: Record<NivelAnalisis, StatusFamily> = {
  alto: 'red',
  medio: 'amber',
  bajo: 'green',
};

/**
 * Peso para ordenar. Sin esto el orden por riesgo sería alfabético y pondría
 * "alto, bajo, medio" — justo lo contrario de lo que busca quien ordena por
 * riesgo. El 0 es "sin análisis": no es menos grave que "bajo", es que no se
 * midió, y al final de la lista estorba menos que en medio.
 */
export const PESO_RIESGO: Record<NivelAnalisis, number> = { alto: 3, medio: 2, bajo: 1 };
export const PESO_SIN_ANALISIS = 0;

export const SIN_ANALISIS = 'Sin análisis';

/**
 * Normaliza para buscar: sin acentos y en minúsculas. Escribir "informatica"
 * tiene que encontrar "Informática" — nadie pone acentos en un campo de
 * búsqueda y devolver cero resultados por una tilde se lee como que la
 * herramienta está rota.
 */
export const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-MX');
