/**
 * Preparación de imágenes para el agente, en el navegador.
 *
 * Una foto de teléfono pesa 3 MB y mide 4032 px. La API de Anthropic la
 * reduce de todos modos a ~1568 px por el lado largo, así que mandarla
 * completa solo hace más lenta la subida: aquí se reduce ANTES de enviarla
 * (queda en unos cientos de KB) y se genera una miniatura de ~10 KB, que es lo
 * único que se guarda en localStorage junto con el mensaje.
 *
 * La imagen preparada completa vive solo en memoria (`imagenesEnMemoria`): el
 * visor la usa mientras dure la sesión; después de recargar, cae a la
 * miniatura. Guardarla en localStorage llenaría su cupo (~5 MB) con dos fotos.
 */

/** Lado largo máximo que aprovecha el modelo. */
const LADO_MAXIMO = 1568;
const LADO_MINIATURA = 240;
const CALIDAD = 0.86;

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type TipoImagen = (typeof TIPOS_IMAGEN)[number];
export const MAX_IMAGENES = 5;
/** Antes de reducir. Una foto RAW o un PNG enorme se rechaza de entrada. */
export const MAX_BYTES_ORIGINAL = 25 * 1024 * 1024;

export interface ImagenPreparada {
  id: string;
  nombre: string;
  tipo: TipoImagen;
  /** Base64 sin el prefijo `data:…;base64,`: así lo espera el backend. */
  datos: string;
  /** Data URL de la imagen completa, para el visor. */
  url: string;
  /** Data URL de la miniatura (JPEG chico). */
  miniatura: string;
  tamanoBytes: number;
}

/** Imágenes completas de esta sesión, por id de adjunto. */
export const imagenesEnMemoria = new Map<string, ImagenPreparada>();

export function esImagenAceptada(archivo: File): boolean {
  return (TIPOS_IMAGEN as readonly string[]).includes(archivo.type);
}

function lienzo(ancho: number, alto: number) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return c;
}

function escalar(ancho: number, alto: number, lado: number) {
  const factor = Math.min(1, lado / Math.max(ancho, alto));
  return { ancho: Math.max(1, Math.round(ancho * factor)), alto: Math.max(1, Math.round(alto * factor)) };
}

function aBlob(c: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob> {
  return new Promise((resolver, rechazar) =>
    c.toBlob((b) => (b ? resolver(b) : rechazar(new Error('No se pudo codificar la imagen'))), tipo, calidad)
  );
}

function aDataUrl(b: Blob): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(lector.error);
    lector.readAsDataURL(b);
  });
}

let contador = 0;

/**
 * Decodifica, endereza (EXIF), reduce y codifica una imagen. Los GIF se
 * mandan tal cual: redibujarlos en un canvas perdería la animación.
 */
export async function prepararImagen(archivo: File): Promise<ImagenPreparada> {
  const id = `img-${Date.now().toString(36)}-${(contador++).toString(36)}`;
  const nombre = archivo.name || `imagen-${contador}.png`;

  // `imageOrientation: 'from-image'` aplica la rotación EXIF: sin esto, las
  // fotos verticales de teléfono llegan acostadas.
  const mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  try {
    const mini = escalar(mapa.width, mapa.height, LADO_MINIATURA);
    const cMini = lienzo(mini.ancho, mini.alto);
    cMini.getContext('2d')!.drawImage(mapa, 0, 0, mini.ancho, mini.alto);
    const miniatura = await aDataUrl(await aBlob(cMini, 'image/jpeg', 0.7));

    let blob: Blob = archivo;
    let tipo = archivo.type as TipoImagen;
    if (tipo !== 'image/gif') {
      const dim = escalar(mapa.width, mapa.height, LADO_MAXIMO);
      const c = lienzo(dim.ancho, dim.alto);
      c.getContext('2d')!.drawImage(mapa, 0, 0, dim.ancho, dim.alto);
      // PNG se conserva (capturas de pantalla con texto fino y transparencia);
      // todo lo demás pasa a JPEG, que para fotos pesa una fracción.
      tipo = tipo === 'image/png' ? 'image/png' : 'image/jpeg';
      blob = await aBlob(c, tipo, CALIDAD);
      // Una captura PNG chica puede crecer al redibujarla: se queda la original.
      if (archivo.type === tipo && archivo.size <= blob.size) blob = archivo;
    }

    const url = await aDataUrl(blob);
    const preparada: ImagenPreparada = {
      id,
      nombre,
      tipo,
      datos: url.slice(url.indexOf(',') + 1),
      url,
      miniatura,
      tamanoBytes: blob.size,
    };
    imagenesEnMemoria.set(id, preparada);
    return preparada;
  } finally {
    mapa.close();
  }
}

/** Las imágenes que vienen en un portapapeles o en un arrastre. */
export function imagenesDe(transferencia: DataTransfer | null): File[] {
  if (!transferencia) return [];
  return Array.from(transferencia.files).filter(esImagenAceptada);
}
