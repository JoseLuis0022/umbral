/**
 * Utilidades compartidas por los servicios SIMULADOS.
 *
 * Dos razones para que existan:
 *
 * 1. **Latencia artificial de 200-600 ms.** Sin ella, los estados de carga
 *    nunca se ven y se acaban construyendo pantallas que no los contemplan.
 *    Un servicio simulado instantáneo produce una app que se rompe el día que
 *    se conecta a un backend real.
 * 2. **Persistencia en localStorage.** Los cambios sobreviven al refresh, que
 *    es lo que hace que una demostración se sienta un producto y no un mockup.
 */

export const PREFIJO = 'umbral:';

export function esperar(minMs = 200, maxMs = 600) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function leer<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = localStorage.getItem(PREFIJO + clave);
    return crudo ? (JSON.parse(crudo) as T) : porDefecto;
  } catch {
    // localStorage deshabilitado, lleno o con JSON corrupto: la app sigue
    // funcionando con los datos semilla, solo no recuerda nada.
    return porDefecto;
  }
}

export function escribir<T>(clave: string, valor: T) {
  try {
    localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
  } catch {
    // Ver nota en leer(): el fallo de persistencia nunca debe romper la acción
    // que el usuario acaba de hacer.
  }
}

export function borrarTodo() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ver nota en leer() */
  }
}

export const idNuevo = (prefijo: string) =>
  `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
