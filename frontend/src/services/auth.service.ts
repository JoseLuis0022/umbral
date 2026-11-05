import type { PerfilAgente, Sesion, Usuario } from '../types';
import { login as copy } from '../copy';
import { ErrorApi, guardarToken, pedirJson, tokenGuardado } from './api';
import { escribir, leer } from './simulacion';

const CLAVE = 'sesion';

interface SesionIniciada {
  token: string;
  usuario: Usuario;
  perfiles: PerfilAgente[];
  permisos: string[];
}

/**
 * Autenticación contra el backend (`POST /api/auth/login`, `GET /api/auth/yo`).
 *
 * El front ya no decide con qué rol se entra: lo dice el servidor después de
 * verificar la contraseña. La sesión que se guarda aquí es solo una COPIA para
 * pintar la pantalla sin esperar; cada petición vuelve a probar quién eres con
 * el token, y el backend lee tu rol de su base en cada una.
 */
export const authService = {
  /** Lanza `ErrorApi` con el mensaje para la persona si el servidor rechaza. */
  async iniciarSesion(correo: string, contrasena: string): Promise<Sesion> {
    const respuesta = await pedirJson<SesionIniciada>(
      '/auth/login',
      { method: 'POST', json: { correo: correo.trim(), contrasena } },
      copy.errorCredenciales
    );
    guardarToken(respuesta.token);
    const sesion: Sesion = { usuario: respuesta.usuario, perfiles: respuesta.perfiles, permisos: respuesta.permisos };
    escribir(CLAVE, sesion);
    return sesion;
  },

  /**
   * Al abrir la app: si hay token, se le pregunta al backend quién eres. Un 401
   * (expiró, la cuenta ya no existe) cierra la sesión; un fallo de red usa la
   * copia guardada, para que la app abra y el error aparezca donde se use.
   */
  async recuperarSesion(): Promise<Sesion | null> {
    if (!tokenGuardado()) return null;
    try {
      const sesion = await pedirJson<Sesion>('/auth/yo', {}, copy.errorServidor);
      escribir(CLAVE, sesion);
      return sesion;
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 401) {
        escribir<Sesion | null>(CLAVE, null);
        return null;
      }
      return leer<Sesion | null>(CLAVE, null);
    }
  },

  cerrarSesion() {
    guardarToken(null);
    escribir<Sesion | null>(CLAVE, null);
  },
};
