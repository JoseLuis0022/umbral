import { useRef, useState } from 'react';

function intercambiar<T>(lista: T[], i: number, j: number): T[] {
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}

/**
 * Lista editable y reordenable (requisitos, pasos) con CLAVES ESTABLES.
 *
 * El problema que resuelve: ni un requisito (una cadena) ni un paso tienen id
 * en el modelo, así que la tentación es usar el índice como `key`. Con índices,
 * subir un paso no mueve nada para React —solo cambia el contenido de dos
 * posiciones— y la animación de reordenamiento nunca ocurre: el texto salta de
 * una tarjeta a otra y el foco se queda en el botón equivocado.
 *
 * Aquí cada posición arrastra una clave propia que se reordena, se inserta y se
 * borra JUNTO con el elemento. Framer ve un movimiento de verdad y lo anima; el
 * DOM del paso viaja con su contenido.
 *
 * La resincronización en render cubre el caso en que la lista se reemplaza
 * desde fuera (descartar cambios, cambiar de boletín) y viene con otra
 * longitud. Es una actualización de estado derivada durante el render, que
 * converge en una sola pasada.
 */
export function useListaOrdenable<T>(items: T[], onCambiar: (items: T[]) => void) {
  const contador = useRef(0);
  const [claves, setClaves] = useState<string[]>(() => items.map(() => `f${contador.current++}`));

  if (claves.length !== items.length) {
    setClaves(items.map(() => `f${contador.current++}`));
  }

  // React descarta el resultado de este render y vuelve a ejecutarlo con las
  // claves nuevas, pero el descarte ocurre DESPUÉS de correr el cuerpo: si se
  // devolvieran las claves viejas, el consumidor mapearía con `undefined` como
  // key durante esa pasada muerta. El respaldo evita ese hueco.
  const vigentes = claves.length === items.length ? claves : items.map((_, i) => `provisional-${i}`);

  return {
    claves: vigentes,
    agregar(item: T) {
      setClaves((c) => [...c, `f${contador.current++}`]);
      onCambiar([...items, item]);
    },
    quitar(indice: number) {
      setClaves((c) => c.filter((_, i) => i !== indice));
      onCambiar(items.filter((_, i) => i !== indice));
    },
    /** `delta` es -1 (subir) o 1 (bajar); fuera de rango no hace nada. */
    mover(indice: number, delta: number) {
      const destino = indice + delta;
      if (destino < 0 || destino >= items.length) return;
      setClaves((c) => intercambiar(c, indice, destino));
      onCambiar(intercambiar(items, indice, destino));
    },
    editar(indice: number, item: T) {
      onCambiar(items.map((x, i) => (i === indice ? item : x)));
    },
  };
}
