import type { Corpus, Documento } from '../types';
import { corpusSemilla, documentosSemilla } from '../data/corpus';
import { esperar, leer, escribir, idNuevo } from './simulacion';

/**
 * Servicio SIMULADO de bases de conocimiento.
 *
 * Es la interfaz que el día de mañana se cambia por llamadas HTTP sin tocar la
 * pantalla: todo devuelve promesas, todo tarda 200-600 ms y todo persiste en
 * localStorage. La pantalla nunca lee ni escribe localStorage por su cuenta.
 */

const CLAVE_CORPUS = 'corpus';
const CLAVE_DOCS = 'corpus-documentos';
const CLAVE_CONTADOR = 'corpus-contador-subidas';

export const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;
export const EXTENSIONES_ACEPTADAS = '.md,.markdown,.pdf';

/** Un archivo de cada seis termina en error de indexación. */
const CADA_CUANTOS_FALLA = 6;

/** Duración total del indexado simulado. */
const MS_MINIMO = 3000;
const MS_MAXIMO = 6000;

// Cada cuánto avanza la barra. 120 ms es el punto donde el movimiento todavía
// se lee continuo y no se generan cien escrituras de estado por segundo.
const MS_POR_TICK = 120;

// ————————————————————————————————————————————————————————————————
// Acceso al almacén
// ————————————————————————————————————————————————————————————————

const todosLosCorpus = () => leer<Corpus[]>(CLAVE_CORPUS, corpusSemilla);
const todosLosDocumentos = () => leer<Documento[]>(CLAVE_DOCS, documentosSemilla);

/**
 * Escribe un documento leyendo SIEMPRE el arreglo completo justo antes de
 * guardar. Si se guardara una copia capturada al inicio del indexado, dos
 * archivos soltados a la vez se pisarían: el segundo en terminar borraría al
 * primero.
 */
function mutarDocumento(id: string, cambios: Partial<Documento>): Documento | undefined {
  const docs = todosLosDocumentos();
  let resultado: Documento | undefined;
  const siguiente = docs.map((d) => {
    if (d.id !== id) return d;
    resultado = { ...d, ...cambios };
    return resultado;
  });
  if (!resultado) return undefined;
  escribir(CLAVE_DOCS, siguiente);
  tocarCorpus(resultado.corpusId);
  return resultado;
}

/** La fecha del corpus es la de su último movimiento: se deriva, no se captura. */
function tocarCorpus(corpusId: string) {
  const lista = todosLosCorpus().map((c) =>
    c.id === corpusId ? { ...c, actualizadoEn: new Date().toISOString() } : c
  );
  escribir(CLAVE_CORPUS, lista);
}

// ————————————————————————————————————————————————————————————————
// Lectura
// ————————————————————————————————————————————————————————————————

export async function listarCorpus(): Promise<Corpus[]> {
  await esperar();
  return todosLosCorpus();
}

export async function listarDocumentos(corpusId: string): Promise<Documento[]> {
  await esperar();
  // Más recientes arriba: en una base que crece, lo último que subiste es lo
  // que vienes a revisar.
  return todosLosDocumentos()
    .filter((d) => d.corpusId === corpusId)
    .sort((a, b) => b.subidoEn.localeCompare(a.subidoEn));
}

// ————————————————————————————————————————————————————————————————
// Escritura
// ————————————————————————————————————————————————————————————————

export async function crearCorpus(datos: {
  nombre: string;
  descripcion: string;
  systemPrompt?: string;
  icono?: string;
}): Promise<Corpus> {
  await esperar();
  const nuevo: Corpus = {
    id: idNuevo('corpus'),
    nombre: datos.nombre.trim(),
    descripcion: datos.descripcion.trim(),
    systemPrompt: datos.systemPrompt?.trim() ?? '',
    // Sin elección explícita queda el neutro; nunca se inventa uno al azar,
    // porque el icono es lo que la persona usa para reconocer su base de un
    // vistazo y uno distinto en cada arranque haría justo lo contrario.
    icono: datos.icono ?? 'biblioteca',
    agentesAsociados: ['Asistente institucional'],
    actualizadoEn: new Date().toISOString(),
  };
  escribir(CLAVE_CORPUS, [...todosLosCorpus(), nuevo]);
  return nuevo;
}

/**
 * Edita los datos de identidad de una base: nombre, descripción e icono.
 *
 * NO toca el system prompt ni los documentos. Son cosas distintas y se guardan
 * por caminos distintos a propósito: el prompt tiene su propio editor con
 * borrador y estado sucio, y mezclarlo aquí obligaría a decidir cuál de las dos
 * versiones gana cuando alguien tiene el prompt a medio escribir y renombra la
 * base desde otro sitio.
 */
export async function actualizarCorpus(
  corpusId: string,
  datos: { nombre: string; descripcion: string; icono: string }
): Promise<Corpus> {
  await esperar();
  const lista = todosLosCorpus().map((c) =>
    c.id === corpusId
      ? {
          ...c,
          nombre: datos.nombre.trim(),
          descripcion: datos.descripcion.trim(),
          icono: datos.icono,
          actualizadoEn: new Date().toISOString(),
        }
      : c
  );
  escribir(CLAVE_CORPUS, lista);
  const actualizado = lista.find((c) => c.id === corpusId);
  if (!actualizado) throw new Error(`No existe la base ${corpusId}`);
  return actualizado;
}

export async function guardarSystemPrompt(corpusId: string, systemPrompt: string): Promise<Corpus> {
  await esperar();
  const lista = todosLosCorpus().map((c) =>
    c.id === corpusId ? { ...c, systemPrompt, actualizadoEn: new Date().toISOString() } : c
  );
  escribir(CLAVE_CORPUS, lista);
  const actualizado = lista.find((c) => c.id === corpusId);
  if (!actualizado) throw new Error('No encontramos ese corpus.');
  return actualizado;
}

export async function eliminarDocumento(documentoId: string): Promise<void> {
  await esperar();
  const docs = todosLosDocumentos();
  const objetivo = docs.find((d) => d.id === documentoId);
  escribir(
    CLAVE_DOCS,
    docs.filter((d) => d.id !== documentoId)
  );
  if (objetivo) tocarCorpus(objetivo.corpusId);
}

// ————————————————————————————————————————————————————————————————
// Subida e indexación
// ————————————————————————————————————————————————————————————————

export class ArchivoRechazado extends Error {}

function tipoDeArchivo(nombre: string): Documento['tipo'] | null {
  const bajo = nombre.toLowerCase();
  if (bajo.endsWith('.md') || bajo.endsWith('.markdown')) return 'md';
  if (bajo.endsWith('.pdf')) return 'pdf';
  return null;
}

/**
 * Registra el archivo y lo deja EN COLA. La indexación es una llamada aparte
 * (`indexar`) porque la fila ya tiene que estar en pantalla, con su estado en
 * cola, antes de que empiece el proceso: si se esperara a que terminara todo,
 * el usuario soltaría un archivo y no pasaría nada visible durante seis
 * segundos.
 */
export async function subirDocumento(corpusId: string, archivo: File): Promise<Documento> {
  const tipo = tipoDeArchivo(archivo.name);
  if (!tipo) {
    throw new ArchivoRechazado(`"${archivo.name}" no es Markdown ni PDF. Sube archivos .md o .pdf.`);
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    throw new ArchivoRechazado(`"${archivo.name}" pesa más de 10 MB. Divídelo o comprímelo antes de subirlo.`);
  }

  // El markdown se lee de verdad para que el visor muestre el archivo que la
  // persona acaba de soltar y no un texto de relleno.
  const contenido = tipo === 'md' ? await archivo.text() : undefined;

  await esperar();

  const documento: Documento = {
    id: idNuevo('doc'),
    corpusId,
    nombre: archivo.name,
    tipo,
    tamanoBytes: archivo.size,
    estado: 'en_cola',
    contenido,
    subidoEn: new Date().toISOString(),
  };

  escribir(CLAVE_DOCS, [...todosLosDocumentos(), documento]);
  tocarCorpus(corpusId);
  return documento;
}

/**
 * Decide si esta subida falla. Es un contador, no un dado: "uno de cada seis"
 * con aleatoriedad pura puede dar catorce éxitos seguidos y dejar el estado de
 * error sin verse en toda una demostración.
 */
function tocaFallar(): boolean {
  const contador = leer<number>(CLAVE_CONTADOR, 0) + 1;
  escribir(CLAVE_CONTADOR, contador);
  return contador % CADA_CUANTOS_FALLA === 0;
}

const MOTIVOS_DE_FALLA = [
  'No pudimos extraer el texto del archivo. Revisa que no esté dañado y vuelve a subirlo.',
  'El indexador se quedó sin respuesta a la mitad del archivo. Reintenta la indexación.',
  'El archivo mezcla codificaciones de texto y el indexador no pudo leerlo completo. Guárdalo como UTF-8 y súbelo de nuevo.',
];

type AlCambiar = (documento: Documento) => void;

/**
 * Máquina de estados de la indexación: en cola → procesando (con progreso
 * real durante 3-6 s) → indexado, o error.
 *
 * `onCambio` recibe cada paso. Solo se PERSISTEN los estados terminales: la
 * barra avanza unas cuarenta veces y escribir el arreglo completo de
 * documentos en cada tick sería la única operación cara de la pantalla, sin
 * ganar nada — un progreso a medias no tiene sentido conservarlo entre
 * recargas.
 */
export async function indexar(
  documentoId: string,
  onCambio: AlCambiar,
  opciones: { puedeFallar?: boolean } = {}
): Promise<Documento> {
  const base = todosLosDocumentos().find((d) => d.id === documentoId);
  if (!base) throw new Error('No encontramos ese documento.');

  const enCola = mutarDocumento(documentoId, {
    estado: 'en_cola',
    progreso: undefined,
    mensajeError: undefined,
  });
  if (enCola) onCambio(enCola);

  await esperar(300, 900);

  const fallara = opciones.puedeFallar === false ? false : tocaFallar();
  const total = MS_MINIMO + Math.random() * (MS_MAXIMO - MS_MINIMO);
  const pasos = Math.max(1, Math.round(total / MS_POR_TICK));

  // El corte del fallo cae entre el 35% y el 80%: fallar en 0% no se alcanza a
  // ver y fallar en 99% se lee como un bug de redondeo.
  const pasoDeFalla = fallara ? Math.round(pasos * (0.35 + Math.random() * 0.45)) : Infinity;

  let enCurso: Documento = { ...base, estado: 'procesando', progreso: 0, mensajeError: undefined };
  onCambio(enCurso);

  for (let paso = 1; paso <= pasos; paso++) {
    await esperar(MS_POR_TICK, MS_POR_TICK);
    if (paso >= pasoDeFalla) {
      const motivo = MOTIVOS_DE_FALLA[Math.floor(Math.random() * MOTIVOS_DE_FALLA.length)];
      const conError = mutarDocumento(documentoId, {
        estado: 'error',
        progreso: undefined,
        mensajeError: motivo,
      });
      const final = conError ?? { ...enCurso, estado: 'error' as const, mensajeError: motivo };
      onCambio(final);
      return final;
    }
    enCurso = { ...enCurso, progreso: Math.round((paso / pasos) * 100) };
    onCambio(enCurso);
  }

  const indexado = mutarDocumento(documentoId, {
    estado: 'indexado',
    progreso: undefined,
    mensajeError: undefined,
  });
  const final = indexado ?? { ...enCurso, estado: 'indexado' as const, progreso: undefined };
  onCambio(final);
  return final;
}

/**
 * Reindexar NUNCA falla al azar. Es un reintento que la persona pidió a
 * propósito, casi siempre después de un error: volver a fallar por sorteo se
 * leería como que el botón no hace nada.
 */
export function reindexar(documentoId: string, onCambio: AlCambiar): Promise<Documento> {
  return indexar(documentoId, onCambio, { puedeFallar: false });
}

// ————————————————————————————————————————————————————————————————
// Descarga
// ————————————————————————————————————————————————————————————————

/**
 * Solo los .md tienen bytes de verdad en la maqueta (su markdown). Los .pdf
 * son fichas sin binario, así que devuelve null y la pantalla lo dice tal
 * cual, en vez de descargar un archivo vacío que el usuario abriría roto.
 */
export function archivoDescargable(documento: Documento): Blob | null {
  if (documento.tipo !== 'md' || !documento.contenido) return null;
  return new Blob([documento.contenido], { type: 'text/markdown;charset=utf-8' });
}
