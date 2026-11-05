import type { ModeloDisponible } from '../types';

/**
 * Agrupado de modelos para el selector del chat (docs/especificacion-diseno.md §5).
 *
 * Funciones puras: entra la lista que devuelve `GET /api/modelos` y sale lo
 * que el menú pinta. El menú no enseña ids técnicos —"el nombre aparecía dos
 * veces"—: cada modelo se nombra por familia y versión ("Opus 5.5").
 *
 * La versión menor se limita a uno o dos dígitos a propósito: sin el tope,
 * `claude-opus-4-20250514` leería la FECHA como versión menor (4.20250514).
 */
const PATRON = /^claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/;

/** Orden fijo de las familias en el menú. */
const FAMILIAS = ['opus', 'fable', 'sonnet', 'haiku'] as const;
type Familia = (typeof FAMILIAS)[number];

export interface ModeloMenu {
  id: string;
  /** "Opus 5.5", o el nombre del backend sin "Claude " si el id no sigue el patrón. */
  nombre: string;
  familia: Familia | null;
  version: [number, number];
}

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function describirModelo(modelo: ModeloDisponible): ModeloMenu {
  const m = PATRON.exec(modelo.id);
  if (!m) {
    return { id: modelo.id, nombre: modelo.nombre.replace(/^Claude\s+/i, ''), familia: null, version: [0, 0] };
  }
  const familia = m[1] as Familia;
  const mayor = Number(m[2]);
  const menor = m[3] !== undefined ? Number(m[3]) : 0;
  return {
    id: modelo.id,
    nombre: `${capitalizar(familia)} ${mayor}${m[3] !== undefined ? `.${menor}` : ''}`,
    familia,
    version: [mayor, menor],
  };
}

function compararVersion(a: ModeloMenu, b: ModeloMenu) {
  return b.version[0] - a.version[0] || b.version[1] - a.version[1];
}

/**
 * Principales: el de mayor versión de cada familia, en orden Opus, Fable,
 * Sonnet, Haiku. Más modelos: el resto, por familia y versión descendente; al
 * final, los que no siguen el patrón.
 *
 * Si dos ids comparten versión (el alias y su fecha), el principal es el
 * primero que llegó: el resto queda en "Más modelos" con el mismo nombre, y el
 * `title` de la fila los distingue.
 */
export function agruparModelos(modelos: ModeloDisponible[]): { principales: ModeloMenu[]; mas: ModeloMenu[] } {
  const descritos = modelos.map(describirModelo);
  const principales: ModeloMenu[] = [];
  const mas: ModeloMenu[] = [];

  for (const familia of FAMILIAS) {
    const deFamilia = descritos.filter((d) => d.familia === familia).sort(compararVersion);
    if (!deFamilia.length) continue;
    principales.push(deFamilia[0]);
    mas.push(...deFamilia.slice(1));
  }
  mas.push(...descritos.filter((d) => d.familia === null));
  return { principales, mas };
}

/** Nombre corto para un id que quizá ya no está en la lista (ajuste guardado de otra sesión). */
export function nombreCorto(id: string, modelos: ModeloDisponible[]): string {
  const conocido = modelos.find((m) => m.id === id);
  return describirModelo(conocido ?? { id, nombre: id }).nombre;
}
