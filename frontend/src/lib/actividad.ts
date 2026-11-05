import type { ActividadAgente } from '../types';
import { copyLocal } from '../components/chat/copyLocal';

/**
 * La frase de "qué está haciendo" para la espera del chat.
 *
 * La redacta el BACKEND (`motor.describir`) y llega en `descripcion`, sin
 * rutas. Antes se armaba aquí a partir de la ruta, y eso obligaba a mandarle
 * la ruta a todos: cualquiera podía verla en las DevTools. Ahora la ruta
 * (`detalle`) solo viaja a cuentas con permiso.
 */
export function describirActividad(actividad: ActividadAgente): string {
  if (actividad.clase === 'subagente') return copyLocal.consultandoAgente(actividad.nombre);
  return `${actividad.descripcion}…`;
}
