import { useEffect, useState } from 'react';

/*
 * Memoria de la sesión (en RAM, se va al recargar) para dos cosas que hacían
 * parpadear la app al navegar entre pantallas:
 *
 *  1. DATOS: cada pantalla volvía a pedir sus datos al montarse y, mientras
 *     tanto, pintaba vacío o esqueleto; al llegar, el contenido aparecía otra
 *     vez. Con `recuerdo`/`recordar` la pantalla arranca con lo último que vio
 *     (stale-while-revalidate) y solo cambia si el servidor trae algo distinto.
 *  2. ENTRADAS ANIMADAS: una aparición con rebote es deleite la primera vez y
 *     parpadeo la quinta. `usePrimeraVez` dice si este bloque ya se vio en la
 *     sesión.
 */

const datos = new Map<string, unknown>();

export function recuerdo<T>(clave: string): T | undefined {
  return datos.get(clave) as T | undefined;
}

export function recordar<T>(clave: string, valor: T): T {
  datos.set(clave, valor);
  return valor;
}

const vistos = new Set<string>();

/**
 * `true` solo la primera vez que algo con esta clave se monta en la sesión.
 *
 * Se decide en el inicializador del estado y se marca en un efecto: en
 * desarrollo StrictMode llama dos veces al inicializador, y si marcara ahí la
 * segunda llamada ya lo daría por visto.
 */
export function usePrimeraVez(clave: string): boolean {
  const [primera] = useState(() => !vistos.has(clave));
  useEffect(() => {
    vistos.add(clave);
  }, [clave]);
  return primera;
}
