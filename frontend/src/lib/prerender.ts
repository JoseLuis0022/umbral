/**
 * Estado del arranque cuando la página llegó PRERENDERIZADA (`/`,
 * `/privacidad` y `/terminos`, ver src/prerender/ y scripts/prerender.mjs).
 *
 * React no hidrata ese HTML: lo reemplaza con `createRoot` (main.tsx). Es lo
 * robusto: la hidratación exige que el primer render del cliente coincida
 * nodo por nodo con el del servidor, y aquí no coincide a propósito (la
 * sesión, el movimiento reducido y los conteos solo existen en el navegador).
 * El reemplazo ocurre en un solo commit, sin un cuadro en blanco entre medias,
 * pero las animaciones de entrada volverían a ocultar lo que ya se veía. Con
 * estas banderas, lo que el prerender ya pintó en pantalla se queda quieto.
 */

export const esServidor = typeof window === 'undefined';

let llego = false;
let desplazamiento = 0;

/** main.tsx, ANTES de `createRoot`: ¿la raíz trae markup del prerender? */
export function registrarPrerender(raiz: HTMLElement) {
  llego = raiz.childElementCount > 0;
  // Quien ya bajó por la página antes de que cargara el JS no debe volver arriba.
  desplazamiento = document.getElementById('pagina-publica')?.scrollTop ?? 0;
}

/** Verdadero solo durante el primer render del cliente sobre un prerender. */
export function llegoPrerenderizada() {
  return llego;
}

/** Cuánto había bajado la persona por el HTML prerenderizado. */
export function desplazamientoPrevio() {
  return llego ? desplazamiento : 0;
}

/**
 * Tras el primer commit: la navegación dentro de la app ya anima normal, y se
 * quita el velo que el <head> pone a quien tiene sesión guardada (ver
 * scripts/prerender.mjs: oculta la landing hasta que React decide).
 */
export function terminarArranque() {
  llego = false;
  desplazamiento = 0;
  document.documentElement.removeAttribute('data-sesion');
}
