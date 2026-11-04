const ENTEROS = new Intl.NumberFormat('es-MX');

export function formatoEntero(valor: number): string {
  return ENTEROS.format(valor);
}

// Cuatro decimales: una pregunta cuesta centavos, y con dos decimales casi
// todas se verían iguales ("US$0.04"), que es justo la diferencia que se mide.
const DOLARES = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export function formatoUsd(valor: number): string {
  return DOLARES.format(valor);
}

/**
 * Duraciones legibles de un vistazo. Por debajo del segundo se muestran los
 * milisegundos enteros (un "0.9 s" esconde la diferencia entre 850 y 949 ms,
 * que es justo la que interesa medir); a partir de ahí, segundos con un
 * decimal, que es la precisión que un ojo humano puede corroborar.
 */
export function formatoDuracion(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/**
 * Caracteres por token que se usan para ESTIMAR el consumo.
 *
 * Cuatro es la aproximación habitual para español con tokenizadores tipo BPE.
 * No es exacta —varía por modelo, por acentos y por la cantidad de números y
 * código que traiga el texto— y por eso todo lo que se calcula con esto se
 * presenta en la interfaz marcado como aproximado.
 */
export const CARACTERES_POR_TOKEN = 4;

/**
 * Tokens ESTIMADOS a partir de los caracteres.
 *
 * POR QUÉ ES ESTIMACIÓN Y NO MEDICIÓN: la transmisión emite `begin` / `item` /
 * `end` y ninguno de los tres trae un bloque `usage`, así que el conteo real
 * de tokens sencillamente no llega al navegador. Se puede pedir al flujo que lo
 * reporte en los metadatos del `end`; mientras eso no exista, esta cifra sirve
 * para comparar respuestas entre sí (que es para lo que está la pantalla) y no
 * para facturar. La interfaz lo dice: la etiqueta es "Tokens aprox." y la cifra
 * va precedida de ≈.
 */
export function tokensAprox(caracteres: number): number {
  return Math.round(caracteres / CARACTERES_POR_TOKEN);
}
