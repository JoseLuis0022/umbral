import type { Guia } from '../types';
import { guiasSemilla } from '../data/guias';
import { esperar, leer, escribir, idNuevo } from './simulacion';

const CLAVE_VOTOS = 'guias-votos';
const CLAVE_EDICIONES = 'guias-ediciones';
const CLAVE_NUEVAS = 'guias-nuevas';
const CLAVE_BORRADAS = 'guias-borradas';

/**
 * Guías de "Al día", SIMULADAS.
 *
 * Lo único que persiste es la LISTA DE IDS VOTADOS, no las guías completas.
 * Guardar el objeto entero en localStorage congelaría el contenido: al
 * corregir una redacción en `data/guias.ts`, quien ya hubiera abierto la app
 * seguiría leyendo la versión vieja para siempre. Con solo los votos
 * guardados, el contenido siempre viene de la semilla y el voto se superpone.
 *
 * `estrellas` de la semilla es la cifra de la comunidad; el voto propio suma 1
 * encima. Es la misma mecánica que un contador de estrellas de GitHub: el
 * número que ves ya te incluye.
 *
 * EDICIÓN DESDE ADMINISTRACIÓN
 * ----------------------------
 * Misma idea, por la misma razón. La semilla NO se sobrescribe; se guardan
 * tres cosas por separado:
 *
 *   - `guias-ediciones`: parches por id, solo los campos que alguien tocó.
 *   - `guias-nuevas`: guías creadas desde cero, que no existen en la semilla.
 *   - `guias-borradas`: ids ocultos.
 *
 * Guardar el catálogo entero congelaría el contenido: al corregir una
 * redacción en `data/guias.ts` nadie vería el arreglo. Con parches, lo que no
 * se editó sigue viniendo de la semilla y mejora solo.
 *
 * "Restablecer datos de demostración" (en Ajustes) borra las tres claves y el
 * catálogo vuelve a la semilla, sin dejar rastro.
 */

// Punto único para demostrar el rollback del voto optimista sin tocar la UI:
// súbelo a 0.5 y la mitad de los votos fallará. En 0 el servicio solo falla
// por causas reales (una guía que no existe).
const PROBABILIDAD_FALLA_VOTO = 0;

function leerVotos(): string[] {
  return leer<string[]>(CLAVE_VOTOS, []);
}

function conVoto(guia: Guia, votos: string[]): Guia {
  const votada = votos.includes(guia.id);
  return votada ? { ...guia, votadaPorMi: true, estrellas: guia.estrellas + 1 } : { ...guia };
}

async function guardarVoto(id: string, votar: boolean): Promise<Guia> {
  await esperar();

  const base = guiasSemilla.find((g) => g.id === id);
  if (!base) throw new Error(`No existe la guía ${id}`);
  if (Math.random() < PROBABILIDAD_FALLA_VOTO) throw new Error('No se pudo registrar el voto');

  const votos = leerVotos();
  const siguientes = votar
    ? Array.from(new Set([...votos, id]))
    : votos.filter((v) => v !== id);
  escribir(CLAVE_VOTOS, siguientes);

  return conVoto(base, siguientes);
}

type ParcheGuia = Partial<Omit<Guia, 'id'>>;

function leerEdiciones(): Record<string, ParcheGuia> {
  return leer<Record<string, ParcheGuia>>(CLAVE_EDICIONES, {});
}
function leerNuevas(): Guia[] {
  return leer<Guia[]>(CLAVE_NUEVAS, []);
}
function leerBorradas(): string[] {
  return leer<string[]>(CLAVE_BORRADAS, []);
}

/** Semilla + creadas − borradas, con los parches de edición ya aplicados. */
function catalogo(): Guia[] {
  const ediciones = leerEdiciones();
  const borradas = new Set(leerBorradas());
  // Las creadas van ARRIBA: el orden del arreglo es el orden cronológico y lo
  // último publicado es lo más reciente.
  return [...leerNuevas(), ...guiasSemilla]
    .filter((g) => !borradas.has(g.id))
    .map((g) => (ediciones[g.id] ? { ...g, ...ediciones[g.id] } : g));
}

/** Guía en blanco para el formulario de "Nuevo boletín". */
export function guiaVacia(): Guia {
  return {
    id: idNuevo('g'),
    titulo: '',
    resumen: '',
    categoria: 'Correo',
    estrellas: 0,
    votadaPorMi: false,
    minutosLectura: 3,
    requisitos: [],
    pasos: [{ titulo: '', contenido: '' }],
    siAlgoFalla: '',
    preguntaSugerida: '',
  };
}

export const guidesService = {
  /** Todas las guías, en orden cronológico (más reciente primero). */
  async listar(): Promise<Guia[]> {
    await esperar();
    const votos = leerVotos();
    return catalogo().map((g) => conVoto(g, votos));
  },

  /** Devuelve `null` en vez de lanzar: una URL con un id inventado es un 404 de
   *  pantalla, no un error del servicio. */
  async obtener(id: string): Promise<Guia | null> {
    await esperar();
    const base = catalogo().find((g) => g.id === id);
    return base ? conVoto(base, leerVotos()) : null;
  },

  votar(id: string): Promise<Guia> {
    return guardarVoto(id, true);
  },

  quitarVoto(id: string): Promise<Guia> {
    return guardarVoto(id, false);
  },

  /* ----------------------- Edición (solo administración) ---------------------- */

  /**
   * Crea un boletín. Se guarda ENTERO en `guias-nuevas`, no como parche: no
   * hay semilla debajo de la que heredar nada.
   */
  async crear(guia: Guia): Promise<Guia> {
    await esperar();
    const nuevas = leerNuevas();
    escribir(CLAVE_NUEVAS, [{ ...guia }, ...nuevas.filter((g) => g.id !== guia.id)]);
    return { ...guia };
  },

  /**
   * Guarda cambios. Si la guía nació desde administración se reemplaza
   * completa; si viene de la semilla se guarda solo el PARCHE, para que el
   * resto del contenido siga viniendo del archivo y se beneficie de sus
   * correcciones.
   */
  async guardar(id: string, cambios: ParcheGuia): Promise<Guia> {
    await esperar();

    const nuevas = leerNuevas();
    const indice = nuevas.findIndex((g) => g.id === id);
    if (indice !== -1) {
      const actualizada = { ...nuevas[indice], ...cambios };
      nuevas[indice] = actualizada;
      escribir(CLAVE_NUEVAS, nuevas);
      return conVoto(actualizada, leerVotos());
    }

    const base = guiasSemilla.find((g) => g.id === id);
    if (!base) throw new Error(`No existe la guía ${id}`);

    const ediciones = leerEdiciones();
    ediciones[id] = { ...ediciones[id], ...cambios };
    escribir(CLAVE_EDICIONES, ediciones);
    return conVoto({ ...base, ...ediciones[id] }, leerVotos());
  },

  /** Oculta un boletín. Una guía de la semilla se marca; una creada se borra. */
  async eliminar(id: string): Promise<void> {
    await esperar();

    const nuevas = leerNuevas();
    if (nuevas.some((g) => g.id === id)) {
      escribir(CLAVE_NUEVAS, nuevas.filter((g) => g.id !== id));
      return;
    }
    escribir(CLAVE_BORRADAS, Array.from(new Set([...leerBorradas(), id])));
  },

  /**
   * Devuelve UNA guía a su versión de la semilla. Es la salida para quien
   * editó de más: sin esto, el único remedio sería restablecer toda la demo.
   */
  async restaurar(id: string): Promise<Guia | null> {
    await esperar();

    const ediciones = leerEdiciones();
    delete ediciones[id];
    escribir(CLAVE_EDICIONES, ediciones);
    escribir(CLAVE_BORRADAS, leerBorradas().filter((b) => b !== id));

    const base = guiasSemilla.find((g) => g.id === id);
    return base ? conVoto(base, leerVotos()) : null;
  },

  /** `true` si la guía tiene cambios locales encima de la semilla. */
  fueEditada(id: string): boolean {
    return Boolean(leerEdiciones()[id]) || leerNuevas().some((g) => g.id === id);
  },
};
