/**
 * Tipos locales del laboratorio de modelos.
 *
 * NO viven en `src/types/index.ts` a propósito: describen el estado interno de
 * UNA pantalla de desarrollo (métricas de una respuesta, pasos de la cadena de
 * agentes) y no el modelo de datos del producto. Si algún día el laboratorio
 * deja de ser una pantalla y se vuelve un servicio, se suben allá.
 */

import type { ParametrosModelo } from '../../../services/chat.service';
import type { ResumenConsulta } from '../../../types';

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
 * Una actividad del agente (herramienta o subagente), tal como la reporta
 * `alActividad`. El laboratorio las acumula en orden de aparición: esa lista
 * ES el recorrido del agentic loop.
 */
export interface PasoAgente {
  /** `id` de la actividad: empareja su inicio con su fin. */
  clave: string;
  /** Herramienta y lo que tocó, p. ej. "Read · estado/indice-temas.md". */
  nombre: string;
  /** `false` = la hizo un subagente, no el agente principal. */
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
   * Caracteres de la pregunta más las instrucciones del sistema. Solo se usa
   * para ESTIMAR tokens cuando no hay `consumo` (simulador).
   */
  caracteresEntrada: number;
  /**
   * Costo y tokens MEDIDOS que reporta el backend en el evento `fin`. Cuando
   * existe, las métricas muestran esto y no la estimación.
   */
  consumo?: ResumenConsulta;
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
