import type { TrabajoAgente } from '../types';
import { pedir, pedirJson } from './api';

/**
 * Trabajos del agente en el servidor.
 *
 * Una consulta ya no vive en la conexión: el backend la corre como TRABAJO y
 * la conexión solo la observa (ver backend/app/trabajos.py). Cerrar la
 * pestaña no la cancela; para eso existe `detenerTrabajo`.
 */

/** Los del usuario: en curso y terminados en la última hora. */
export function listarTrabajos(): Promise<TrabajoAgente[]> {
  return pedirJson<TrabajoAgente[]>('/trabajos', {}, 'No pudimos consultar las tareas en curso.');
}

/** Detener es una orden explícita. Si el trabajo ya no existe, no hay nada que detener. */
export async function detenerTrabajo(id: string): Promise<void> {
  try {
    await pedir(`/trabajos/${encodeURIComponent(id)}/detener`, { method: 'POST' });
  } catch {
    /* sin red: el trabajo seguirá y se recogerá al volver */
  }
}
