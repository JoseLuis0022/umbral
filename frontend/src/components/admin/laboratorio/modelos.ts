import type { ModeloCatalogo, ParametrosLab } from './tipos';

/**
 * Catálogo de modelos que ofrece el laboratorio.
 *
 * IMPORTANTE — esta lista es del LADO DEL CLIENTE. Quien elige el modelo de
 * verdad es el flujo de n8n; lo que se selecciona aquí viaja dentro de
 * `metadata.parametros` y el flujo lo aplica solo si tiene ese campo cableado
 * a su nodo de modelo. La interfaz avisa de que estos ajustes son de la sesión
 * de pruebas (ver `copyLab.avisoAlcance`) en vez de fingir que el control manda:
 * un panel que promete lo que no cumple es peor que no tener panel.
 *
 * Los `id` son los de OpenRouter y se mandan literales, sin traducir.
 */
export const MODELOS: ModeloCatalogo[] = [
  {
    id: 'openai/gpt-4.1-mini',
    nombre: 'GPT-4.1 mini',
    etiqueta: 'Rápido',
    descripcion: 'El más barato y el que antes empieza a escribir. Suficiente para preguntas de trámite.',
  },
  {
    id: 'openai/gpt-4.1',
    nombre: 'GPT-4.1',
    etiqueta: 'Equilibrado',
    descripcion: 'Respuestas largas y ordenadas. Es la opción segura para una demostración.',
  },
  {
    id: 'anthropic/claude-sonnet-4.5',
    nombre: 'Claude Sonnet 4.5',
    etiqueta: 'Redacción',
    descripcion: 'El mejor con normativa y documentos largos; sigue instrucciones al pie de la letra.',
  },
  {
    id: 'google/gemini-2.5-flash',
    nombre: 'Gemini 2.5 Flash',
    etiqueta: 'Rápido',
    descripcion: 'Contexto enorme a precio bajo. Útil cuando el corpus que se consulta es grande.',
  },
  {
    id: 'google/gemini-2.5-pro',
    nombre: 'Gemini 2.5 Pro',
    etiqueta: 'Razonamiento',
    descripcion: 'Piensa antes de contestar. Tarda más, pero aguanta preguntas con varios pasos.',
  },
  {
    id: 'deepseek/deepseek-chat-v3.1',
    nombre: 'DeepSeek V3.1',
    etiqueta: 'Económico',
    descripcion: 'Abierto y muy barato por millón de tokens. Buen banco de pruebas para el costo.',
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
 * Un `sessionId` nuevo. El flujo de n8n guarda la memoria de la conversación
 * en Postgres indexada por este valor, así que estrenar uno es LO ÚNICO que
 * corta el contexto del lado del servidor: vaciar los mensajes de la pantalla
 * no toca esa tabla.
 */
export function nuevaSesionId(): string {
  const marca = Date.now().toString(36);
  const azar = Math.random().toString(36).slice(2, 8);
  return `lab-${marca}-${azar}`;
}
