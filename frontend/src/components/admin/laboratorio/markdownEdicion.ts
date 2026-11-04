/**
 * Inserción de marcas de markdown en un texto, respetando la selección.
 *
 * Vive fuera del componente por dos razones: la lógica de "envuelve lo
 * seleccionado o abre las marcas y deja el cursor en medio" es la única parte
 * del editor con aritmética de índices, y mezclarla con JSX la vuelve
 * imposible de leer; y así se puede probar sin montar un modal.
 *
 * Cada función devuelve el texto completo Y dónde debe quedar la selección
 * después. Devolver solo el texto sería suficiente para pintar, pero dejaría
 * el cursor al final del campo en cada pulsación: el usuario tendría que
 * volver a colocarlo a mano después de cada negrita.
 */

export interface Edicion {
  texto: string;
  /** Inicio de la selección resultante. */
  inicio: number;
  /** Fin de la selección resultante. Igual a `inicio` = cursor sin selección. */
  fin: number;
}

/**
 * Marca que abre y cierra (`**`, `*`).
 *
 * Con texto seleccionado lo envuelve y lo deja seleccionado — así se puede
 * encadenar negrita + cursiva sin volver a seleccionar. Sin selección inserta
 * el par vacío y deja el cursor ENTRE las dos marcas, listo para escribir.
 */
export function envolver(texto: string, inicio: number, fin: number, marca: string): Edicion {
  const seleccionado = texto.slice(inicio, fin);

  if (seleccionado.length > 0) {
    return {
      texto: texto.slice(0, inicio) + marca + seleccionado + marca + texto.slice(fin),
      inicio: inicio + marca.length,
      fin: fin + marca.length,
    };
  }

  const cursor = inicio + marca.length;
  return {
    texto: texto.slice(0, inicio) + marca + marca + texto.slice(inicio),
    inicio: cursor,
    fin: cursor,
  };
}

/**
 * Marca de LÍNEA (`## `, `### `, `- `). Se aplica a todas las líneas que toca
 * la selección, no solo a la primera: seleccionar cuatro renglones y pulsar
 * "Lista" tiene que dar cuatro viñetas.
 *
 * `exclusiva` es para los títulos: un renglón no puede ser `## ` y `### ` a la
 * vez, así que primero se quita el nivel que tuviera. Pulsar de nuevo la misma
 * marca la retira — el botón funciona como interruptor, que es lo que espera
 * cualquiera que haya usado un editor de texto.
 *
 * El cursor queda al FINAL del bloque modificado. Conservar el offset original
 * exigiría rastrear cuánto creció cada línea por separado, y el resultado
 * práctico —escribir el título justo después de pulsar "Título"— es
 * exactamente este.
 */
export function prefijarLineas(
  texto: string,
  inicio: number,
  fin: number,
  prefijo: string,
  exclusiva: boolean
): Edicion {
  const arranque = texto.lastIndexOf('\n', Math.max(0, inicio - 1)) + 1;
  const saltoFinal = texto.indexOf('\n', fin);
  const corte = saltoFinal === -1 ? texto.length : saltoFinal;

  const bloque = texto.slice(arranque, corte);
  const lineas = bloque.split('\n');
  // Se retira solo si TODAS las líneas ya la traen: con una mezcla, lo que el
  // usuario quiere es uniformar, no deshacer.
  const todasLaTienen = lineas.every((linea) => linea.startsWith(prefijo));

  const resultado = lineas
    .map((linea) => {
      if (todasLaTienen) return linea.slice(prefijo.length);
      const limpia = exclusiva ? linea.replace(/^#{1,6}\s+/, '') : linea;
      return limpia.startsWith(prefijo) ? limpia : prefijo + limpia;
    })
    .join('\n');

  const cursor = arranque + resultado.length;
  return {
    texto: texto.slice(0, arranque) + resultado + texto.slice(corte),
    inicio: cursor,
    fin: cursor,
  };
}
