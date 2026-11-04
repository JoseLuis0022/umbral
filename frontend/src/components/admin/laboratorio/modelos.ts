import type { ModeloCatalogo, ParametrosLab } from './tipos';

/**
 * Catálogo de modelos que ofrece el laboratorio.
 *
 * El `id` viaja en `parametros.modelo` y el backend se lo pasa tal cual al
 * Agent SDK (`model`), que solo habla con modelos de Claude. Solo un admin
 * puede mandarlo: a cualquier otro rol el backend le responde 403.
 *
 * Para comparar costo, cambia de modelo y repite la MISMA pregunta con la
 * memoria borrada: la métrica de costo del pie de cada respuesta es la medida.
 */
export const MODELOS: ModeloCatalogo[] = [
  {
    id: 'claude-haiku-5-5',
    nombre: 'Claude Haiku 5.5',
    etiqueta: 'Rápido',
    descripcion: 'El más ligero de la familia. Buen punto de partida para medir cuánto cuesta una búsqueda.',
  },
  {
    id: 'claude-sonnet-5-5',
    nombre: 'Claude Sonnet 5.5',
    etiqueta: 'Equilibrado',
    descripcion: 'Balance entre calidad, velocidad y costo. Es el valor por defecto del laboratorio.',
  },
  {
    id: 'claude-opus-5-5',
    nombre: 'Claude Opus 5.5',
    etiqueta: 'Razonamiento',
    descripcion: 'El más capaz de los tres. Úsalo para ver si la calidad extra justifica el costo extra.',
  },
];

/** Tope del campo de instrucciones. Es un límite de interfaz, no del modelo. */
export const MAX_SYSTEM_PROMPT = 4000;

export const PARAMETROS_POR_DEFECTO: ParametrosLab = {
  // Sin base elegida: es la primera decisión de la pantalla y no se adivina
  // por el usuario. Preseleccionar la primera de la lista escondería justo la
  // elección que aquí manda.
  corpusId: '',
  modelo: MODELOS[1].id,
  // 0.30 y no 0.70: este asistente cita normativa, y en normativa la
  // creatividad es un defecto. Quien quiera explorar, sube el control.
  temperatura: 0.3,
  nivelPensamiento: 'medio',
  systemPrompt: '',
};

/** Clave de localStorage (el hook le antepone el prefijo `aurora-aldia:`). */
export const CLAVE_PARAMETROS = 'laboratorio:parametros';

/**
 * `corpusId` queda FUERA de la comparación a propósito: "Restablecer
 * parámetros" devuelve los ajustes del modelo a su valor de fábrica, no
 * deshace la elección de base de conocimiento. Borrarla obligaría a volver a
 * elegirla —y a perder el hilo— por pulsar un botón que promete otra cosa.
 */
export function sonParametrosPorDefecto(p: ParametrosLab): boolean {
  return (
    p.modelo === PARAMETROS_POR_DEFECTO.modelo &&
    p.temperatura === PARAMETROS_POR_DEFECTO.temperatura &&
    p.nivelPensamiento === PARAMETROS_POR_DEFECTO.nivelPensamiento &&
    p.systemPrompt === PARAMETROS_POR_DEFECTO.systemPrompt
  );
}

/**
 * Un `sessionId` nuevo. El backend reanuda la sesión del agente asociada a
 * este valor (tabla `sesiones` de backend/lab.db), así que estrenar uno es LO ÚNICO que
 * corta el contexto del lado del servidor: vaciar los mensajes de la pantalla
 * no toca esa tabla.
 */
export function nuevaSesionId(): string {
  const marca = Date.now().toString(36);
  const azar = Math.random().toString(36).slice(2, 8);
  return `lab-${marca}-${azar}`;
}
