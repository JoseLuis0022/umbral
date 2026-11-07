/**
 * Igualdad profunda de datos JSON (objetos, arreglos y primitivos), sin
 * importar el orden de las llaves. `undefined` y una llave ausente cuentan
 * igual: JSON no distingue entre las dos, y la copia del servidor nunca trae
 * llaves con `undefined`.
 */
export function igualProfundo(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => igualProfundo(x, b[i]));
  }
  const oa = a as Record<string, unknown>;
  const ob = b as Record<string, unknown>;
  const llaves = new Set([...Object.keys(oa), ...Object.keys(ob)]);
  for (const k of llaves) {
    if (!igualProfundo(oa[k], ob[k])) return false;
  }
  return true;
}
