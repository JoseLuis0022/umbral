import type { ArchivoCompartido } from '../types';

/**
 * Citas de fuentes en las respuestas del agente.
 *
 * El agente cita con un enlace markdown de esquema propio (lo pide
 * backend/app/prompts/consulta.md):
 *
 *     [Clase 12](<fuente:Clases/Transcripciones/Clase 12 - ….txt> "frase exacta")
 *     [Morfología, p. 12](<fuente:Clases/Morfología.pdf#page=12>)
 *
 * Los `<…>` son obligatorios: las rutas llevan espacios y sin ellos el markdown
 * no reconoce el enlace. El título (entre comillas) es un fragmento textual del
 * archivo, para resaltarlo al abrir. La ruta solo viaja en el href: la persona
 * ve la etiqueta ("Clase 12"), nunca la ruta.
 *
 * El visor la pide a `GET /api/archivos`, que vuelve a validar la lista blanca:
 * citar algo no compartible (p. ej. `estado/`) no abre nada.
 */

export const ESQUEMA_FUENTE = 'fuente:';

export interface Fuente {
  ruta: string;
  /** Página de un PDF (`#page=N`). */
  pagina?: number;
  /** Fragmento a resaltar (el título del enlace). */
  fragmento?: string;
  /** `estado/` es memoria del agente: se cita, pero no se abre. */
  clicable: boolean;
}

export function esFuente(href: string | undefined): href is string {
  return !!href && href.startsWith(ESQUEMA_FUENTE);
}

/** react-markdown borra los protocolos que no conoce: `fuente:` se deja pasar tal cual. */
export function transformarUrl(url: string, porDefecto: (url: string) => string): string {
  return url.startsWith(ESQUEMA_FUENTE) ? url : porDefecto(url);
}

export function leerFuente(href: string, titulo?: string | null): Fuente | null {
  let resto = href.slice(ESQUEMA_FUENTE.length);
  let pagina: number | undefined;
  const ancla = resto.match(/#page=(\d+)$/i);
  if (ancla) {
    pagina = Number(ancla[1]);
    resto = resto.slice(0, ancla.index);
  }
  let ruta: string;
  try {
    // El markdown llega codificado ("Clase%2012"); el backend compara en NFC.
    ruta = decodeURIComponent(resto).normalize('NFC').replace(/^\.?\//, '');
  } catch {
    return null;
  }
  if (!ruta || ruta.includes('..')) return null;
  return {
    ruta,
    pagina: pagina && pagina > 0 ? pagina : undefined,
    fragmento: titulo?.trim() || undefined,
    clicable: !ruta.startsWith('estado/'),
  };
}

const POR_EXTENSION: Record<string, ArchivoCompartido['formato']> = {
  pdf: 'pdf',
  txt: 'txt',
  md: 'md',
  html: 'html',
  htm: 'html',
  png: 'imagen',
  jpg: 'imagen',
  jpeg: 'imagen',
  webp: 'imagen',
  gif: 'imagen',
};

/** Lo mínimo que necesita el visor del chat para abrir la fuente. */
export function archivoDeFuente(fuente: Fuente): ArchivoCompartido {
  const nombre = fuente.ruta.split('/').pop() || fuente.ruta;
  const extension = nombre.split('.').pop()?.toLowerCase() ?? '';
  const coleccion = fuente.ruta.startsWith('Apuntes/')
    ? 'Apuntes'
    : fuente.ruta.includes('Transcripciones')
      ? 'Transcripciones'
      : 'Diapositivas del profesor';
  return { ruta: fuente.ruta, nombre, formato: POR_EXTENSION[extension] ?? 'otro', tamanoBytes: 0, coleccion };
}

/**
 * Dónde está `fragmento` dentro de `texto`, tolerando lo que el modelo no copia
 * igual: mayúsculas, acentos, espacios y saltos de línea. Devuelve los índices
 * en el texto ORIGINAL, para poder marcarlo sin alterar lo demás.
 */
export function buscarFragmento(texto: string, fragmento: string): { inicio: number; fin: number } | null {
  const plano = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  // Texto normalizado + de qué índice original viene cada carácter.
  let normal = '';
  const origen: number[] = [];
  let espacio = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (/\s/.test(c)) {
      if (!espacio && normal) {
        normal += ' ';
        origen.push(i);
      }
      espacio = true;
      continue;
    }
    espacio = false;
    for (const p of plano(c)) {
      normal += p;
      origen.push(i);
    }
  }
  const buscado = plano(fragmento).replace(/\s+/g, ' ').trim().replace(/^["“«]|["”»]$/g, '');
  if (buscado.length < 3) return null;
  const pos = normal.indexOf(buscado);
  if (pos === -1) return null;
  return { inicio: origen[pos], fin: origen[pos + buscado.length - 1] + 1 };
}
