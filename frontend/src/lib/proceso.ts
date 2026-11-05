import type { ActividadAgente, ItemProceso } from '../types';

/**
 * La línea de tiempo del panel "Proceso" (razonamiento y pasos, en orden),
 * como funciones puras: la usan igual el chat en vivo (useStreamingChat) y la
 * recogida de un trabajo que terminó sin nadie mirando (ChatContext).
 */

export function conActividad(lista: ItemProceso[], a: ActividadAgente): ItemProceso[] {
  if (a.fase === 'inicio') {
    return [
      ...lista,
      {
        tipo: 'paso',
        id: a.id,
        clase: a.clase,
        nombre: a.nombre,
        descripcion: a.descripcion,
        detalle: a.detalle,
        estado: 'trabajando',
        dentroDe: a.dentroDe,
      },
    ];
  }
  return lista.map((item) =>
    item.tipo === 'paso' && item.id === a.id ? { ...item, estado: a.ok === false ? 'fallo' : 'listo' } : item
  );
}

/** Pensamiento que sigue a otro se pega; si hubo un paso en medio, abre un bloque nuevo. */
export function conPensamiento(lista: ItemProceso[], fragmento: string): ItemProceso[] {
  const ultimo = lista[lista.length - 1];
  return ultimo?.tipo === 'pensamiento'
    ? [...lista.slice(0, -1), { tipo: 'pensamiento', texto: ultimo.texto + fragmento }]
    : [...lista, { tipo: 'pensamiento', texto: fragmento }];
}

/** Un paso que se quedó "trabajando" es uno cuyo fin nunca llegó: se cierra para no dejar un spinner eterno. */
export function cerrarProceso(lista: ItemProceso[]): ItemProceso[] {
  return lista.map((item) =>
    item.tipo === 'paso' && item.estado === 'trabajando' ? { ...item, estado: 'listo' as const } : item
  );
}

/** Pasos del agente principal (sin contar los de subagentes): la medida de avance de la barra. */
export function pasosPrincipales(lista: ItemProceso[]): number {
  return lista.filter((i) => i.tipo === 'paso' && !i.dentroDe).length;
}
