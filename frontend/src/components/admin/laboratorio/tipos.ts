/**
 * Tipos locales del laboratorio de modelos.
 *
 * NO viven en `src/types/index.ts` a propósito: describen el estado interno de
 * UNA pantalla de desarrollo (métricas de una respuesta, pasos de la cadena de
 * agentes) y no el modelo de datos del producto. Si algún día el laboratorio
 * deja de ser una pantalla y se vuelve un servicio, se suben allá.
 */

import type { ParametrosModelo } from '../../../services/chat.service';

/** Los cuatro niveles que acepta `ParametrosModelo.nivelPensamiento`. */
export type NivelPensamiento = NonNullable<ParametrosModelo['nivelPensamiento']>;

/** Lo que el administrador ajusta y lo que se persiste en localStorage. */
export interface ParametrosLab {
  /**
   * Base de conocimiento que se consulta. Es la PRIMERA decisión de la
   * pantalla: sin ella no se puede preguntar, porque no habría documentos
   * contra los que responder. Cadena vacía = todavía no se ha elegido.
   */
  corpusId: string;
  modelo: string;
  temperatura: number;
  nivelPensamiento: NivelPensamiento;
  systemPrompt: string;
}

/** Una entrada del catálogo de modelos que se ofrece en el combo. */
export interface ModeloCatalogo {
  /** Identificador técnico de OpenRouter. Se manda tal cual, sin traducir. */
  id: string;
  nombre: string;
  descripcion: string;
  etiqueta: string;
}

/** Ciclo de vida de la lista de bases de conocimiento. */
export type EstadoCorpus = 'cargando' | 'listo' | 'error';

/**
 * Un agente del flujo, tal como lo reporta `alMetadatos`. El laboratorio los
 * acumula en orden de aparición: esa lista ES la cadena de delegación.
 */
export interface PasoAgente {
  /** `nodeId` cuando existe; si no, el nombre. Es lo que empareja inicio y fin. */
  clave: string;
  nombre: string;
  /** `false` = sub-agente al que el orquestador delegó. */
  principal: boolean;
  estado: 'trabajando' | 'listo';
  /** Milisegundos desde que arrancó la petición. */
  msInicio: number;
  msFin?: number;
}

/**
 * Números que un directivo técnico quiere ver. `msPrimerFragmento` es el que
 * de verdad importa: mide cuánto tarda la pantalla en dejar de estar vacía.
 */
export interface MetricasRespuesta {
  /** `null` si la respuesta nunca llegó a emitir nada. */
  msPrimerFragmento: number | null;
  msTotal: number;
  fragmentos: number;
  /** Caracteres de la respuesta. */
  caracteres: number;
  /**
   * Caracteres que salieron de aquí en esta vuelta: la pregunta más las
   * instrucciones del sistema. Es la base del cálculo de tokens de entrada, y
   * se guarda como CARACTERES y no como tokens para que la estimación se pueda
   * recalcular el día que cambie la razón caracteres/token.
   */
  caracteresEntrada: number;
}

export interface MensajeLab {
  id: string;
  rol: 'usuario' | 'asistente';
  contenido: string;
  /** Solo en respuestas del asistente. */
  metricas?: MetricasRespuesta;
  cadena?: PasoAgente[];
  /** Ajuste de modelo con el que se pidió esta respuesta, para poder comparar. */
  modelo?: string;
  /** La transmisión se cortó (Detener o error a media respuesta). */
  incompleta?: boolean;
}

export type EstadoLab = 'inactivo' | 'esperando' | 'transmitiendo' | 'error';
