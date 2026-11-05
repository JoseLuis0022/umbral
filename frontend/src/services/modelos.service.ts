import type { ModeloDisponible } from '../types';
import { pedirJson } from './api';

/**
 * Modelos de la cuenta de la API key del laboratorio (`GET /api/modelos`).
 * Solo responde a un rol con permiso "parametros"; a los demás, 403.
 */
export async function listarModelos(): Promise<ModeloDisponible[]> {
  return pedirJson<ModeloDisponible[]>('/modelos', {}, 'No pudimos cargar los modelos.');
}
