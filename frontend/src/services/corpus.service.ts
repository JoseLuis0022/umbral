import { ErrorApi, mensajeDeError, pedir, pedirJson } from './api';

/**
 * Corpus REAL: los archivos de la carpeta del agente (`agente_cwd` en el
 * backend), agrupados en colecciones. Lo sirve `GET /api/admin/corpus*` y exige
 * el permiso `auditoria`.
 *
 * Es de solo lectura a propósito: los archivos los escribe el agente
 * (perfil generador) o quien mantiene la carpeta; subir o borrar desde la web
 * dejaría la carpeta y lo que el agente cree saber desincronizados.
 */

export type TipoArchivo = 'md' | 'txt' | 'html' | 'pdf' | 'imagen' | 'otro';

export interface ArchivoCorpus {
  /** Relativa a la carpeta del agente, con "/". Es el identificador. */
  ruta: string;
  nombre: string;
  tipo: TipoArchivo;
  tamanoBytes: number;
  modificado: string;
}

export interface ColeccionCorpus {
  id: string;
  nombre: string;
  descripcion: string;
  /** Carpeta de la colección (relativa a la del agente). */
  carpeta: string;
  /** Entregas calificadas: el perfil de consulta no puede leerlas. */
  sensible: boolean;
  /** El agente puede mandar estos archivos por el chat. */
  compartible: boolean;
  archivos: ArchivoCorpus[];
}

export interface ContenidoArchivo {
  ruta: string;
  nombre: string;
  tipo: TipoArchivo;
  tamanoBytes: number;
  contenido: string;
}

/**
 * De dónde se lee un archivo:
 *  - `corpus`: `/admin/corpus/archivo`, cualquier colección (permiso `auditoria`).
 *  - `chat`:   `/archivos`, solo el material que el agente puede mandar
 *              (apuntes, diapositivas, transcripciones), para cualquier sesión.
 * Las dos respuestas tienen la misma forma: PDF crudo o JSON con el texto.
 */
export type OrigenArchivo = 'corpus' | 'chat';

const RUTA_ARCHIVO = (ruta: string, origen: OrigenArchivo = 'corpus') =>
  `${origen === 'chat' ? '/archivos' : '/admin/corpus/archivo'}?ruta=${encodeURIComponent(ruta)}`;

export async function listarColecciones(): Promise<ColeccionCorpus[]> {
  const datos = await pedirJson<{ colecciones: ColeccionCorpus[] }>(
    '/admin/corpus',
    {},
    'No pudimos leer la carpeta del agente.'
  );
  return datos.colecciones;
}

/** Contenido de un archivo de texto (md, txt, html). */
export async function leerTexto(ruta: string, senal?: AbortSignal, origen: OrigenArchivo = 'corpus'): Promise<ContenidoArchivo> {
  return pedirJson<ContenidoArchivo>(RUTA_ARCHIVO(ruta, origen), { signal: senal }, 'No pudimos abrir este archivo.');
}

/**
 * El archivo crudo (PDF y descargas). Va por `pedir()` y no por un `<a href>`
 * o un `src` porque el endpoint exige el header Authorization, que el navegador
 * no manda por su cuenta.
 */
export async function descargarBlob(ruta: string, senal?: AbortSignal, origen: OrigenArchivo = 'corpus'): Promise<Blob> {
  const respuesta = await pedir(RUTA_ARCHIVO(ruta, origen), { signal: senal });
  if (!respuesta.ok) {
    throw new ErrorApi(respuesta.status, await mensajeDeError(respuesta, 'No pudimos descargar el archivo.'));
  }
  return respuesta.blob();
}

/** Guarda en disco cualquier archivo del corpus. Texto incluido. */
export async function guardarEnDisco(
  archivo: Pick<ArchivoCorpus, 'ruta' | 'nombre' | 'tipo'>,
  origen: OrigenArchivo = 'corpus'
): Promise<void> {
  let blob: Blob;
  if (archivo.tipo === 'pdf' || archivo.tipo === 'imagen') {
    blob = await descargarBlob(archivo.ruta, undefined, origen);
  } else if (archivo.tipo === 'otro') {
    // El backend no previsualiza ni entrega binarios que no sean PDF.
    throw new ErrorApi(415, 'Este tipo de archivo no se puede descargar desde aquí.');
  } else {
    const { contenido } = await leerTexto(archivo.ruta, undefined, origen);
    blob = new Blob([contenido], { type: archivo.tipo === 'html' ? 'text/html' : 'text/plain' });
  }
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo.nombre;
  enlace.click();
  // Un tick de margen: revocar en el mismo instante cancela la descarga en Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
