import { useCallback, useState } from 'react';
import { leer, escribir } from '../services/simulacion';

/**
 * Estado de React respaldado en localStorage, bajo el prefijo `aurora-aldia:`.
 * Para preferencias de interfaz que deben sobrevivir al refresh (panel lateral
 * colapsado, densidad, orden de las guías).
 */
export function useLocalStorage<T>(clave: string, inicial: T) {
  const [valor, setValor] = useState<T>(() => leer(clave, inicial));

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
