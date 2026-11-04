/**
 * Recuerda DÓNDE estaba el control que la persona acaba de accionar.
 *
 * Sirve para que un modal emerja del botón que lo abrió y se repliegue sobre
 * él al cerrarse, que es la regla de continuidad espacial del sistema: la
 * transición tiene que explicar de dónde salió el contenido.
 *
 * Se resuelve escuchando en el documento y no pidiendo una `ref` en cada sitio
 * a propósito. Un modal se abre desde una barra, desde un menú, desde una fila
 * de tabla o desde un atajo de teclado; obligar a cada uno de esos sitios a
 * cablear una referencia hasta el modal habría llenado media aplicación de
 * fontanería para un detalle de animación, y el primero que se olvidara de
 * pasarla rompería el efecto sin que nadie se enterara.
 *
 * El clic que abre un modal es, por definición, el último `pointerdown` que
 * hubo; y si se abrió con el teclado, el control sigue teniendo el foco. Con
 * esas dos señales basta.
 */

let ultimoOrigen: { x: number; y: number } | null = null;

/** Centro del elemento accionable más cercano al objetivo del evento. */
function centroDe(objetivo: EventTarget | null): { x: number; y: number } | null {
  if (!(objetivo instanceof Element)) return null;
  const control = objetivo.closest('button, a, [role="button"], [role="menuitem"], summary');
  if (!control) return null;
  const r = control.getBoundingClientRect();
  // Un control fuera de pantalla o ya desmontado mide 0: no es un origen útil.
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

if (typeof document !== 'undefined') {
  // Fase de captura: hay que anotarlo ANTES de que el manejador del propio
  // botón abra el modal, o el modal se pintaría antes de saber de dónde viene.
  document.addEventListener(
    'pointerdown',
    (e) => {
      ultimoOrigen = centroDe(e.target);
    },
    true
  );

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      ultimoOrigen = centroDe(document.activeElement);
    },
    true
  );
}

/**
 * Último origen conocido, en coordenadas de viewport, o `null` si no lo hay
 * (por ejemplo, un modal que abre un temporizador). Quien lo consuma debe
 * tratar el `null` como "aparece centrado", no como un error.
 */
export function origenInteraccion() {
  return ultimoOrigen;
}
