/**
 * Cualquier archivo pegado, arrastrado o elegido → algo que el modelo pueda leer.
 *
 * El límite lo pone el MODELO, no la interfaz. Lo que Claude entiende y cómo
 * se le manda:
 *
 *  - Imagen (jpeg/png/webp/gif) → bloque `image` (ver lib/imagenes.ts).
 *  - PDF                        → bloque `document` base64: ve texto Y figuras.
 *  - Texto de cualquier tipo    → bloque `document` de texto: md, txt, csv,
 *    (html, código, json, .m…)    json, código, MATLAB… El HTML se pasa a su
 *                                 texto legible (sin CSS ni scripts).
 *  - Video                      → Claude no ve video: el navegador saca
 *                                 FOTOGRAMAS repartidos en la duración y los
 *                                 manda como imágenes con su minuto.
 *  - Audio, Word, Excel, PPT…   → el modelo no los lee directo: se rechazan
 *                                 con un mensaje que dice qué hacer.
 *
 * Tope: la API acepta peticiones de hasta 32 MB. En base64 todo crece un
 * tercio, así que la suma de lo adjunto se acota a TOPE_TOTAL_BYTES.
 */
import { imagenesEnMemoria, esImagenAceptada, prepararImagen, type ImagenPreparada } from './imagenes';

export const MAX_ADJUNTOS = 10;
/** ~22 MB crudos ≈ 30 MB en base64: lo que cabe en una petición de la API. */
export const TOPE_TOTAL_BYTES = 22 * 1024 * 1024;
/** Fotogramas por video: suficientes para seguirlo, pocos para no gastar contexto. */
const FOTOGRAMAS_VIDEO = 12;
const LADO_FOTOGRAMA = 1024;

export interface DocumentoPreparado {
  clase: 'documento';
  id: string;
  nombre: string;
  /** `pdf` viaja en base64; `texto`, como texto plano. */
  formato: 'pdf' | 'texto';
  datos: string;
  tamanoBytes: number;
}

export interface Fotograma {
  segundo: number;
  datos: string; // base64 JPEG
}

export interface VideoPreparado {
  clase: 'video';
  id: string;
  nombre: string;
  duracion: number;
  fotogramas: Fotograma[];
  /** Data URL del primer fotograma, para la ficha. */
  miniatura: string;
  /** Lo que ocupa lo que se manda (los fotogramas), no el video original. */
  tamanoBytes: number;
}

export type AdjuntoPreparado = (ImagenPreparada & { clase: 'imagen' }) | DocumentoPreparado | VideoPreparado;

/** Documentos y videos de esta sesión, por id (las imágenes viven en `imagenesEnMemoria`). */
export const adjuntosEnMemoria = new Map<string, AdjuntoPreparado>();

/** El archivo no se puede mandar; `message` es para el usuario. */
export class ArchivoNoSoportado extends Error {}

let contador = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}-${(contador++).toString(36)}`;

const extension = (nombre: string) => nombre.split('.').pop()?.toLowerCase() ?? '';

const OFFICE = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'pages', 'numbers', 'key']);

export function minutoLegible(segundos: number) {
  const s = Math.max(0, Math.round(segundos));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export async function prepararArchivo(archivo: File): Promise<AdjuntoPreparado> {
  const nombre = archivo.name || 'archivo';
  const ext = extension(nombre);

  if (esImagenAceptada(archivo)) return { ...(await prepararImagen(archivo)), clase: 'imagen' };
  if (archivo.type === 'application/pdf' || ext === 'pdf') return guardar(await prepararPdf(archivo, nombre));
  if (archivo.type.startsWith('video/')) return guardar(await prepararVideo(archivo, nombre));
  if (archivo.type.startsWith('audio/')) {
    throw new ArchivoNoSoportado(`El modelo no escucha audio: «${nombre}» no se puede mandar. Pega su transcripción como texto.`);
  }
  if (OFFICE.has(ext)) {
    throw new ArchivoNoSoportado(`El modelo no lee archivos de Office directo: exporta «${nombre}» a PDF y adjúntalo.`);
  }
  return guardar(await prepararTexto(archivo, nombre, ext));
}

function guardar<T extends AdjuntoPreparado>(a: T): T {
  adjuntosEnMemoria.set(a.id, a);
  return a;
}

function base64De(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  // Por bloques: `String.fromCharCode(...bytes)` revienta la pila con archivos grandes.
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

async function prepararPdf(archivo: File, nombre: string): Promise<DocumentoPreparado> {
  return { clase: 'documento', id: nuevoId('pdf'), nombre, formato: 'pdf', datos: base64De(await archivo.arrayBuffer()), tamanoBytes: archivo.size };
}

/** HTML → su texto legible: el CSS y los scripts gastan contexto y no dicen nada. */
function textoDeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script, style, noscript, svg, template').forEach((n) => n.remove());
  const titulo = doc.title.trim();
  const cuerpo = (doc.body?.innerText || doc.body?.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
  return titulo ? `${titulo}\n\n${cuerpo}` : cuerpo;
}

async function prepararTexto(archivo: File, nombre: string, ext: string): Promise<DocumentoPreparado> {
  const buffer = await archivo.arrayBuffer();
  // Un byte nulo en el arranque = binario (zip, mat, exe…): no es texto.
  if (new Uint8Array(buffer.slice(0, 8192)).includes(0)) {
    throw new ArchivoNoSoportado(`«${nombre}» es un archivo binario que el modelo no puede leer.`);
  }
  let texto: string;
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    texto = new TextDecoder('latin1').decode(buffer);
  }
  if (ext === 'html' || ext === 'htm' || archivo.type === 'text/html') texto = textoDeHtml(texto);
  if (!texto.trim()) throw new ArchivoNoSoportado(`«${nombre}» está vacío.`);
  return { clase: 'documento', id: nuevoId('txt'), nombre, formato: 'texto', datos: texto, tamanoBytes: new Blob([texto]).size };
}

/** Fotogramas repartidos en la duración, con un `<video>` y un canvas. Nada sale del navegador más que las imágenes. */
async function prepararVideo(archivo: File, nombre: string): Promise<VideoPreparado> {
  const url = URL.createObjectURL(archivo);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.src = url;
  try {
    await new Promise<void>((resolver, rechazar) => {
      video.onloadedmetadata = () => resolver();
      video.onerror = () =>
        rechazar(new ArchivoNoSoportado(`Tu navegador no puede abrir «${nombre}». Prueba con un MP4 o WebM.`));
    });
    const duracion = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duracion || !video.videoWidth) throw new ArchivoNoSoportado(`No pudimos leer los cuadros de «${nombre}».`);

    const factor = Math.min(1, LADO_FOTOGRAMA / Math.max(video.videoWidth, video.videoHeight));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(video.videoWidth * factor);
    lienzo.height = Math.round(video.videoHeight * factor);
    const ctx = lienzo.getContext('2d')!;

    const n = Math.max(1, Math.min(FOTOGRAMAS_VIDEO, Math.ceil(duracion)));
    const fotogramas: Fotograma[] = [];
    let miniatura = '';
    for (let i = 0; i < n; i++) {
      // Centro de cada tramo: ni el negro del arranque ni el del final.
      const segundo = ((i + 0.5) / n) * duracion;
      await new Promise<void>((resolver) => {
        video.onseeked = () => resolver();
        video.currentTime = segundo;
      });
      ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
      const dataUrl = lienzo.toDataURL('image/jpeg', 0.8);
      if (!miniatura) miniatura = dataUrl;
      fotogramas.push({ segundo, datos: dataUrl.slice(dataUrl.indexOf(',') + 1) });
    }
    const tamanoBytes = fotogramas.reduce((s, f) => s + Math.round((f.datos.length * 3) / 4), 0);
    return { clase: 'video', id: nuevoId('vid'), nombre, duracion, fotogramas, miniatura, tamanoBytes };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
  }
}

/** Todo lo que viene en un portapapeles o un arrastre (ya no solo imágenes). */
export function archivosDe(transferencia: DataTransfer | null): File[] {
  return transferencia ? Array.from(transferencia.files) : [];
}

/** Lo que viaja al backend, separado por tipo de bloque. */
export function paraEnviar(adjuntos: AdjuntoPreparado[]) {
  const imagenes: { nombre: string; tipo: string; datos: string }[] = [];
  const documentos: { nombre: string; formato: 'pdf' | 'texto'; datos: string }[] = [];
  for (const a of adjuntos) {
    if (a.clase === 'imagen') imagenes.push({ nombre: a.nombre, tipo: a.tipo, datos: a.datos });
    else if (a.clase === 'documento') documentos.push({ nombre: a.nombre, formato: a.formato, datos: a.datos });
    else
      for (const f of a.fotogramas)
        imagenes.push({ nombre: `${a.nombre} · fotograma en ${minutoLegible(f.segundo)} de ${minutoLegible(a.duracion)}`, tipo: 'image/jpeg', datos: f.datos });
  }
  return { imagenes, documentos };
}

/** El adjunto completo de esta sesión, por id (después de recargar ya no existe). */
export function adjuntoEnMemoria(id: string): AdjuntoPreparado | undefined {
  const img = imagenesEnMemoria.get(id);
  return img ? { ...img, clase: 'imagen' } : adjuntosEnMemoria.get(id);
}
