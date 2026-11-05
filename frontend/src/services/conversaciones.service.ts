import type { Conversacion } from '../types';
import { pedir, pedirJson } from './api';

/**
 * El historial del chat, en el servidor (`/api/conversaciones`).
 *
 * El servidor es la fuente de verdad: así la misma cuenta ve sus chats en
 * cualquier navegador o dispositivo. El navegador guarda solo una copia para
 * pintar la lista al instante (ver ChatContext). El dueño lo decide el token:
 * `usuarioId` lo reescribe el servidor.
 */

export function listarConversaciones(): Promise<Conversacion[]> {
  return pedirJson<Conversacion[]>('/conversaciones', {}, 'No pudimos cargar tus conversaciones.');
}

/** Guarda la conversación completa. `keepalive` deja terminar el envío aunque la página se cierre. */
export async function guardarConversacion(conv: Conversacion, keepalive = false): Promise<void> {
  const r = await pedir(`/conversaciones/${encodeURIComponent(conv.id)}`, { method: 'PUT', json: conv, keepalive });
  if (!r.ok) throw new Error(`No se pudo guardar la conversación (${r.status})`);
}

export async function eliminarConversacion(id: string): Promise<void> {
  const r = await pedir(`/conversaciones/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw new Error(`No se pudo eliminar la conversación (${r.status})`);
}
