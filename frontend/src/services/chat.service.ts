/**
 * Motor de chat: habla el protocolo de eventos del backend.
 *
 * QUÉ SE MANDA — `POST /api/chat` (con el token, vía `api.ts`):
 *
 *     { "conversacionId": "c-1", "mensaje": "¿qué es la mediana?",
 *       "imagenes": [{ "nombre", "tipo", "datos" }],   ← base64, ya reducidas
 *       "perfil": "consulta", "parametros": { … } }      ← parametros: solo con permiso
 *
 *   Ni el usuario ni el historial viajan en el cuerpo. Quién eres lo dice el
 *   token; la memoria de la conversación la guarda el backend (reanuda la
 *   sesión del agente por `conversacionId`).
 *
 * QUÉ SE RECIBE — SSE (`text/event-stream`), cinco eventos tipados en
 * `types/index.ts` y emitidos por `backend/app/protocolo.py`:
 *
 *     inicio · pensamiento · texto · actividad · archivo · fin · error
 *
 *   `pensamiento` solo llega si la cuenta tiene permiso "parametros".
 *
 *   Las líneas que empiezan con ":" son latidos: el backend manda uno cada 10 s
 *   mientras el agente piensa, y cualquier byte rearma el reloj de silencio.
 *
 * ERRORES — `enviarMensaje()` NUNCA lanza: siempre resuelve un `ResultadoEnvio`.
 *   · Antes del stream (HTTP 401/403/404/409/429): el mensaje viene del backend.
 *   · Durante el stream: evento `error` con un `codigo` estable.
 *   · Red caída o silencio de más de LIMITE_SILENCIO: error de red o timeout.
 *
 * SIMULADOR — con `VITE_CHAT_SIMULADO=1` no se llama al backend: un simulador
 * local emite los MISMOS eventos. Los dos pasan por la misma función
 * (`aplicar`), así que el simulador no puede desincronizarse del protocolo.
 * Escribir "forzar error" en modo simulado provoca el estado de error.
 */

import type {
  ActividadAgente,
  ArchivoCompartido,
  CodigoErrorChat,
  Esfuerzo,
  EventoError,
  EventoReintento,
  EventoInicio,
  ResumenConsulta,
} from '../types';
import { chat as copyChat } from '../copy';
import { respuestaSimulada } from '../data/respuestasSimuladas';
import { mensajeDeError, pedir } from './api';
import { esperar } from './simulacion';

const SIMULADO = ['1', 'true', 'si', 'sí'].includes(
  String(import.meta.env.VITE_CHAT_SIMULADO ?? '').trim().toLowerCase()
);

/** `'servidor'` = backend real · `'simulado'` = simulador local. Informativo: la interfaz no debe ramificar con esto. */
export const motorActivo: 'servidor' | 'simulado' = SIMULADO ? 'simulado' : 'servidor';

/** Tres latidos perdidos (el backend manda uno cada 10 s) = conexión muerta. */
const LIMITE_SILENCIO = 35_000;

// Ritmo de escritura del simulador: 15-40 ms por pieza es la franja en la que
// el texto se lee mientras aparece.
const RETARDO_MIN = 15;
const RETARDO_MAX = 40;

export type TipoErrorChat = 'red' | 'timeout' | 'respuesta' | 'sesion' | 'permiso' | 'limite';

export class ErrorChat extends Error {
  tipo: TipoErrorChat;
  /** Código del protocolo cuando el error lo reportó el backend dentro del stream. */
  codigo?: CodigoErrorChat;
  /** El agente ya había avanzado: se puede continuar desde ahí. */
  reanudable: boolean;
  constructor(tipo: TipoErrorChat, mensaje: string, codigo?: CodigoErrorChat, reanudable = false) {
    super(mensaje);
    this.name = 'ErrorChat';
    this.tipo = tipo;
    this.codigo = codigo;
    this.reanudable = reanudable;
  }
}

export interface MensajeEnvio {
  rol: 'usuario' | 'asistente';
  contenido: string;
}

export interface AdjuntoEnvio {
  nombre: string;
  tipo: string;
  tamanoBytes: number;
}

/**
 * Ajustes del Laboratorio. El backend SOLO los acepta de un rol con permiso
 * "parametros" (admin); a cualquier otro le responde 403.
 */
export interface ParametrosModelo {
  /** Id de modelo de Claude. */
  modelo?: string;
  /** El Agent SDK no expone temperatura: el backend la ignora. */
  temperatura?: number;
  /** Cuánto razona el modelo (`effort` del Agent SDK). */
  esfuerzo?: Esfuerzo;
  /** Reemplaza el system prompt del perfil. */
  systemPrompt?: string;
  /** Abre sesión nueva en el agente en vez de reanudar la anterior. */
  reiniciarMemoria?: boolean;
}

/** Una imagen lista para viajar: ya reducida y en base64 (ver lib/imagenes.ts). */
export interface ImagenEnvio {
  nombre: string;
  tipo: string;
  datos: string;
}

/** Un documento listo para viajar (ver lib/adjuntos.ts): PDF en base64 o texto plano. */
export interface DocumentoEnvio {
  nombre: string;
  formato: 'pdf' | 'texto';
  datos: string;
}

export interface OpcionesEnvio {
  /** Se manda solo el ÚLTIMO mensaje del usuario; el historial vive en el servidor. */
  mensajes: MensajeEnvio[];
  conversacionId: string;
  /** Modo del agente. Por defecto, "consulta". */
  perfil?: string;
  /** Solo informativo; lo que viaja al agente son `imagenes`. */
  adjuntos?: AdjuntoEnvio[];
  imagenes?: ImagenEnvio[];
  documentos?: DocumentoEnvio[];
  /**
   * Deja de OBSERVAR. No detiene al agente: el trabajo sigue en el servidor
   * (para detenerlo, `detenerTrabajo` de trabajos.service).
   */
  senal?: AbortSignal;
  /**
   * Volver a ver un trabajo que ya existe, en vez de crear uno: se repiten sus
   * eventos desde el principio y se sigue en vivo. `mensajes` no se usa.
   */
  seguir?: string;
  /** Llega con el id del trabajo: con él se vuelve a ver o se detiene. */
  alInicio?: (inicio: EventoInicio) => void;
  parametros?: ParametrosModelo;
  /** Se llama por cada fragmento. `acumulado` evita que quien consume concatene. */
  alFragmento?: (fragmento: string, acumulado: string) => void;
  /** Razonamiento del modelo, en vivo. `acumulado` = todo lo recibido. */
  alPensamiento?: (fragmento: string, acumulado: string) => void;
  /** Una herramienta o un subagente empezó o terminó. */
  alActividad?: (actividad: ActividadAgente) => void;
  /** El agente mandó un archivo del curso. */
  alArchivo?: (archivo: ArchivoCompartido) => void;
  /** La tarea hace fila (el Generador termina otra, o el servidor está lleno); arranca sola. */
  alEspera?: (motivo: string) => void;
  /** Algo falló y se está reintentando solo. Con capa `agente`, lo del intento anterior se descarta. */
  alReintento?: (reintento: EventoReintento) => void;
  /** Costo y tokens reales de la consulta. Llega al final, también tras un error del agente. */
  alFin?: (resumen: ResumenConsulta) => void;
  /** Evento de cierre. Se dispara igual si terminó solo o si lo detuvieron. */
  alCerrar?: (textoFinal: string, motivo: 'completo' | 'cancelado') => void;
  alError?: (error: ErrorChat) => void;
}

export interface ResultadoEnvio {
  estado: 'completo' | 'cancelado' | 'error';
  texto: string;
  error?: ErrorChat;
  /** `undefined` si la consulta no alcanzó a terminar (cancelada o red caída). */
  resumen?: ResumenConsulta;
  /** Razonamiento recibido ('' si el backend no lo mandó). */
  pensamiento: string;
  /** Archivos que mandó el agente, en orden de llegada. */
  archivos: ArchivoCompartido[];
}

type EventoProtocolo =
  | { tipo: 'inicio'; datos: EventoInicio }
  | { tipo: 'pensamiento'; datos: { delta: string } }
  | { tipo: 'texto'; datos: { delta: string } }
  | { tipo: 'actividad'; datos: ActividadAgente }
  | { tipo: 'archivo'; datos: ArchivoCompartido }
  | { tipo: 'reintento'; datos: EventoReintento }
  | { tipo: 'espera'; datos: { motivo: string } }
  | { tipo: 'fin'; datos: ResumenConsulta }
  | { tipo: 'error'; datos: EventoError };

const TIPOS_EVENTO = new Set<EventoProtocolo['tipo']>([
  'inicio',
  'pensamiento',
  'texto',
  'actividad',
  'archivo',
  'reintento',
  'espera',
  'fin',
  'error',
]);

/** Intentos para ALCANZAR al servidor (antes de que empiece la respuesta) y su espera. */
const INTENTOS_SERVIDOR = 4;
const ESPERAS_SERVIDOR_MS = [1000, 2500, 5000];

function errorAborto() {
  return new DOMException('Transmisión cancelada', 'AbortError');
}

function esAborto(e: unknown) {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError';
}

function ultimaPregunta(mensajes: MensajeEnvio[]): string {
  return [...mensajes].reverse().find((m) => m.rol === 'usuario')?.contenido ?? '';
}

/** Punto de entrada único. NUNCA lanza. */
export async function enviarMensaje(opciones: OpcionesEnvio): Promise<ResultadoEnvio> {
  if (opciones.senal?.aborted) return { estado: 'cancelado', texto: '', pensamiento: '', archivos: [] };

  const control = new AbortController();
  const propagarAborto = () => control.abort();
  opciones.senal?.addEventListener('abort', propagarAborto);

  let acumulado = '';
  let pensamiento = '';
  const archivos: ArchivoCompartido[] = [];
  let resumen: ResumenConsulta | undefined;
  let errorDelAgente: ErrorChat | undefined;
  let detenida = false;
  let porTiempo = false;
  let reloj: ReturnType<typeof setTimeout> | undefined;

  // Reloj de silencio: se rearma con cada byte que llega (texto o latido). Un
  // stream que se queda a medias no emite nada, y sin este reloj la interfaz
  // esperaría para siempre con los skeletons puestos.
  const rearmar = () => {
    clearTimeout(reloj);
    reloj = setTimeout(() => {
      porTiempo = true;
      control.abort();
    }, LIMITE_SILENCIO);
  };

  // El ÚNICO lugar que interpreta el protocolo.
  const aplicar = (evento: EventoProtocolo) => {
    switch (evento.tipo) {
      case 'texto':
        if (!evento.datos.delta) return;
        acumulado += evento.datos.delta;
        opciones.alFragmento?.(evento.datos.delta, acumulado);
        return;
      case 'pensamiento':
        if (!evento.datos.delta) return;
        pensamiento += evento.datos.delta;
        opciones.alPensamiento?.(evento.datos.delta, pensamiento);
        return;
      case 'actividad':
        opciones.alActividad?.(evento.datos);
        return;
      case 'archivo':
        archivos.push(evento.datos);
        opciones.alArchivo?.(evento.datos);
        return;
      case 'espera':
        opciones.alEspera?.(evento.datos.motivo);
        return;
      case 'reintento':
        // La consulta vuelve a empezar: el razonamiento del intento roto no cuenta.
        if (evento.datos.capa === 'agente') pensamiento = '';
        opciones.alReintento?.(evento.datos);
        return;
      case 'fin':
        resumen = evento.datos;
        opciones.alFin?.(evento.datos);
        return;
      case 'error':
        // Alguien la detuvo (este u otro navegador): no es una falla.
        if (evento.datos.codigo === 'cancelada') {
          detenida = true;
          return;
        }
        // No corta el bucle: después del error todavía llega el `fin` con el
        // costo de lo que alcanzó a hacer el agente.
        errorDelAgente = new ErrorChat(
          evento.datos.codigo.startsWith('limite') ? 'limite' : 'respuesta',
          // La causa técnica (solo para quien puede verla) va entre paréntesis:
          // "falló" sin un porqué no le sirve a nadie.
          (evento.datos.mensaje || copyChat.errorEnvio) + (evento.datos.detalle ? ` (${evento.datos.detalle})` : ''),
          evento.datos.codigo,
          !!evento.datos.reanudable
        );
        return;
      case 'inicio':
        opciones.alInicio?.(evento.datos);
        return;
    }
  };

  try {
    rearmar();
    const fuente = SIMULADO
      ? eventosSimulados(opciones, control.signal)
      : eventosDelServidor(opciones, control.signal, rearmar);
    for await (const evento of fuente) aplicar(evento);

    if (detenida) {
      opciones.alCerrar?.(acumulado, 'cancelado');
      return { estado: 'cancelado', texto: acumulado, resumen, pensamiento, archivos };
    }
    // El servidor cerró sin `fin` ni `error`: se cayó a media respuesta. Antes
    // esto se tomaba como "completo" y la respuesta quedaba cortada sin aviso.
    if (!errorDelAgente && !resumen) errorDelAgente = new ErrorChat('red', copyChat.errorCorte);
    if (errorDelAgente) {
      opciones.alError?.(errorDelAgente);
      return { estado: 'error', texto: acumulado, error: errorDelAgente, resumen, pensamiento, archivos };
    }
    opciones.alCerrar?.(acumulado, 'completo');
    return { estado: 'completo', texto: acumulado, resumen, pensamiento, archivos };
  } catch (e) {
    if (esAborto(e)) {
      if (porTiempo) {
        const error = new ErrorChat('timeout', copyChat.errorTimeout);
        opciones.alError?.(error);
        return { estado: 'error', texto: acumulado, error, resumen, pensamiento, archivos };
      }
      // Detener no es un error: lo que alcanzó a escribir se conserva.
      opciones.alCerrar?.(acumulado, 'cancelado');
      return { estado: 'cancelado', texto: acumulado, resumen, pensamiento, archivos };
    }

    const error = e instanceof ErrorChat ? e : new ErrorChat('red', copyChat.errorEnvio);
    opciones.alError?.(error);
    return { estado: 'error', texto: acumulado, error, resumen, pensamiento, archivos };
  } finally {
    clearTimeout(reloj);
    opciones.senal?.removeEventListener('abort', propagarAborto);
  }
}

/* ─────────────────────────────── Servidor ─────────────────────────────── */

function tipoPorEstado(estado: number): TipoErrorChat {
  if (estado === 401) return 'sesion';
  if (estado === 403) return 'permiso';
  if (estado === 409 || estado === 429) return 'limite';
  return 'respuesta';
}

async function* eventosDelServidor(
  opciones: OpcionesEnvio,
  senal: AbortSignal,
  alRecibir: () => void
): AsyncGenerator<EventoProtocolo> {
  const cuerpo = {
    conversacionId: opciones.conversacionId,
    mensaje: ultimaPregunta(opciones.mensajes),
    imagenes: opciones.imagenes?.length ? opciones.imagenes : undefined,
    documentos: opciones.documentos?.length ? opciones.documentos : undefined,
    perfil: opciones.perfil ?? 'consulta',
    parametros: opciones.parametros,
  };

  // Alcanzar al servidor SÍ se reintenta solo: si la petición no llegó (red
  // caída, backend reiniciándose → 5xx del proxy), el agente no corrió y no
  // se cobró nada. Una vez que empieza la respuesta, ya no: repetirla
  // duplicaría el gasto; de eso se encarga el backend, que sabe si es seguro.
  let respuesta: Response | undefined;
  for (let intento = 1; ; intento++) {
    try {
      respuesta = opciones.seguir
        ? await pedir(`/trabajos/${encodeURIComponent(opciones.seguir)}/eventos?desde=0`, {
            headers: { Accept: 'text/event-stream' },
            signal: senal,
          })
        : await pedir('/chat', {
            method: 'POST',
            headers: { Accept: 'text/event-stream' },
            json: cuerpo,
            signal: senal,
          });
    } catch (e) {
      if (esAborto(e)) throw e;
      respuesta = undefined; // la petición ni siquiera llegó
    }
    if (respuesta?.ok) break;
    let fallo: ErrorChat;
    if (respuesta) {
      const porDefecto =
        respuesta.status >= 500
          ? copyChat.errorServidor
          : opciones.seguir && respuesta.status === 404
            ? copyChat.errorTrabajoPerdido
            : copyChat.errorEnvio;
      fallo = new ErrorChat(tipoPorEstado(respuesta.status), await mensajeDeError(respuesta, porDefecto));
      if (respuesta.status < 500) throw fallo; // 401, 403, 429…: repetir no cambia nada
    } else {
      fallo = new ErrorChat('red', copyChat.errorServidor);
    }
    if (intento >= INTENTOS_SERVIDOR) throw fallo;
    const espera = ESPERAS_SERVIDOR_MS[Math.min(intento, ESPERAS_SERVIDOR_MS.length) - 1];
    yield {
      tipo: 'reintento',
      datos: { capa: 'servidor', intento: intento + 1, maximo: INTENTOS_SERVIDOR, esperaMs: espera, motivo: copyChat.motivoServidor },
    };
    alRecibir(); // la espera no cuenta como silencio
    await pausa(espera, senal);
  }
  if (!respuesta.body) throw new ErrorChat('respuesta', copyChat.errorEnvio);

  const lector = respuesta.body.getReader();
  const decodificador = new TextDecoder();
  let pendiente = '';

  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    alRecibir();
    pendiente += decodificador.decode(value, { stream: true });
    // Los eventos SSE se separan por una línea en blanco, y un trozo del
    // socket puede partir uno a la mitad: lo incompleto se queda en el buffer.
    const bloques = pendiente.split(/\r?\n\r?\n/);
    pendiente = bloques.pop() ?? '';
    for (const bloque of bloques) {
      const evento = leerBloque(bloque);
      if (evento) yield evento;
    }
  }

  const cola = leerBloque(pendiente);
  if (cola) yield cola;
}

function leerBloque(bloque: string): EventoProtocolo | null {
  let tipo = '';
  const datos: string[] = [];
  for (const linea of bloque.split(/\r?\n/)) {
    if (!linea || linea.startsWith(':')) continue; // vacía o latido
    if (linea.startsWith('event:')) tipo = linea.slice(6).trim();
    else if (linea.startsWith('data:')) datos.push(linea.slice(5).replace(/^ /, ''));
  }
  if (!TIPOS_EVENTO.has(tipo as EventoProtocolo['tipo']) || datos.length === 0) return null;
  try {
    return { tipo, datos: JSON.parse(datos.join('\n')) } as EventoProtocolo;
  } catch {
    return null; // un evento ilegible se descarta; no tumba la respuesta entera
  }
}

/* ─────────────────────────────── Simulador ────────────────────────────── */

/** setTimeout cancelable: sin esto, Detener tardaría hasta 40 ms en surtir efecto. */
function pausa(ms: number, senal: AbortSignal) {
  return new Promise<void>((resolver, rechazar) => {
    const cancelar = () => {
      clearTimeout(t);
      rechazar(errorAborto());
    };
    const t = setTimeout(() => {
      senal.removeEventListener('abort', cancelar);
      resolver();
    }, ms);
    senal.addEventListener('abort', cancelar, { once: true });
  });
}

async function* eventosSimulados(opciones: OpcionesEnvio, senal: AbortSignal): AsyncGenerator<EventoProtocolo> {
  const pregunta = ultimaPregunta(opciones.mensajes);
  const t0 = performance.now();

  // Escotilla de desarrollo: el estado de ERROR de la pantalla tiene que ser
  // alcanzable sin desconectar la red.
  if (/forzar\s+error/i.test(pregunta)) {
    await esperar(300, 600);
    throw new ErrorChat('red', copyChat.errorEnvio);
  }

  yield {
    tipo: 'inicio',
    datos: { conversacionId: opciones.conversacionId, perfil: opciones.perfil ?? 'consulta', motor: 'prueba' },
  };

  const lectura = {
    id: 'simulada-0',
    clase: 'herramienta',
    nombre: 'Read',
    descripcion: 'Revisando el índice de temas',
    detalle: 'estado/indice-temas.md',
    dentroDe: null,
  } as const;
  yield { tipo: 'actividad', datos: { ...lectura, fase: 'inicio', ok: null } };
  // "Pensando": es el hueco donde la pantalla muestra los skeletons.
  await pausa(500 + Math.random() * 450, senal);
  yield { tipo: 'actividad', datos: { ...lectura, fase: 'fin', ok: true } };

  // Por palabra con su espacio pegado: cortar por carácter se ve nervioso y
  // cortar por línea se ve a saltos.
  const texto = respuestaSimulada(pregunta);
  for (const pieza of texto.match(/\S+\s*/g) ?? [texto]) {
    await pausa(RETARDO_MIN + Math.random() * (RETARDO_MAX - RETARDO_MIN), senal);
    yield { tipo: 'texto', datos: { delta: pieza } };
  }

  yield {
    tipo: 'fin',
    datos: {
      costoUsd: 0,
      vueltas: 2,
      duracionMs: Math.round(performance.now() - t0),
      tokens: { entrada: 0, salida: 0, cacheLectura: 0, cacheEscritura: 0 },
      modelo: 'simulador',
    },
  };
}
