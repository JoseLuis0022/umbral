import { pedirJson } from './api';
import { configCorreo as copy } from '../copy';

/**
 * Configuración del correo de envío (`/api/admin/correo`, solo admin).
 *
 * La contraseña de aplicación VIAJA de ida (al guardar) pero nunca de vuelta:
 * el servidor la guarda cifrada y solo responde si está configurada.
 */
export interface ConfigCorreo {
  usuario: string | null;
  configurada: boolean;
  remitente: string;
  contacto: string | null;
  urlPublica: string;
}

export interface CambiosCorreo {
  usuario?: string;
  /** undefined = no cambiarla. */
  contrasena?: string;
  remitente?: string;
  contacto?: string;
  urlPublica?: string;
}

export function leerConfigCorreo(): Promise<ConfigCorreo> {
  return pedirJson<ConfigCorreo>('/admin/correo', {}, copy.errorCarga);
}

export function guardarConfigCorreo(cambios: CambiosCorreo): Promise<ConfigCorreo> {
  return pedirJson<ConfigCorreo>('/admin/correo', { method: 'PUT', json: cambios }, copy.errorCarga);
}

/** Manda un correo de prueba a la cuenta del admin. Lanza ErrorApi con lo que hay que revisar. */
export async function probarCorreo(): Promise<string> {
  const r = await pedirJson<{ mensaje: string }>('/admin/correo/prueba', { method: 'POST' }, copy.errorCarga);
  return r.mensaje;
}
