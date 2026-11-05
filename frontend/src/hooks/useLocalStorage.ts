import { useCallback, useState } from 'react';
import { leer, escribir } from '../services/simulacion';

/**
 * Estado de React respaldado en localStorage, bajo el prefijo `umbral:`.
 * Para preferencias de interfaz que deben sobrevivir al refresh (panel lateral
 * colapsado, densidad, contraste).
 */
export function useLocalStorage<T>(clave: string, inicial: T, esValido?: (v: unknown) => v is T) {
  /*
   * `esValido` protege de lo que haya quedado guardado: una versión vieja de la
   * app, una edición a mano o un valor corrupto. Sin él, un `umbral:densidad`
   * con "gigante" llegaba tal cual a componentes que solo conocen dos valores.
   */
  const [valor, setValor] = useState<T>(() => {
    const guardado = leer<unknown>(clave, inicial);
    return esValido && !esValido(guardado) ? inicial : (guardado as T);
  });

  const actualizar = useCallback(
    (siguiente: T | ((previo: T) => T)) => {
      setValor((previo) => {
        const resuelto = typeof siguiente === 'function' ? (siguiente as (p: T) => T)(previo) : siguiente;
        escribir(clave, resuelto);
        return resuelto;
      });
    },
    [clave]
  );

  return [valor, actualizar] as const;
}
