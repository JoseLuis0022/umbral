import type { PerfilAgente, PlanCuenta, Sesion, Usuario } from '../types';
import { login as copy } from '../copy';
import { ErrorApi, guardarToken, pedirJson, tokenGuardado } from './api';
import { registro as copyRegistro } from '../copy';
import { escribir, leer } from './simulacion';

const CLAVE = 'sesion';

interface SesionIniciada {
  token: string;
  usuario: Usuario;
  perfiles: PerfilAgente[];
  permisos: string[];
  plan?: PlanCuenta | null;
}

function guardarSesion(respuesta: SesionIniciada): Sesion {
  guardarToken(respuesta.token);
  const sesion: Sesion = { usuario: respuesta.usuario, perfiles: respuesta.perfiles, permisos: respuesta.permisos, plan: respuesta.plan ?? null };
  escribir(CLAVE, sesion);
  return sesion;
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
    return guardarSesion(respuesta);
  },

  /**
   * Registro público: crea la cuenta (sin verificar) y el servidor manda el
   * correo con el enlace. La respuesta es la misma exista o no el correo.
   */
  async registrarse(nombre: string, correo: string, contrasena: string): Promise<string> {
    const r = await pedirJson<{ mensaje: string }>(
      '/auth/registro',
      { method: 'POST', json: { nombre: nombre.trim(), correo: correo.trim(), contrasena } },
      copyRegistro.errorServidor
    );
    return r.mensaje;
  },

  /** El enlace del correo: activa la cuenta y deja la sesión iniciada. */
  async verificarCorreo(token: string): Promise<Sesion> {
    const respuesta = await pedirJson<SesionIniciada>(
      '/auth/verificar',
      { method: 'POST', json: { token } },
      copyRegistro.errorVerificar
    );
    return guardarSesion(respuesta);
  },

  async reenviarEnlace(correo: string): Promise<string> {
    const r = await pedirJson<{ mensaje: string }>(
      '/auth/reenviar',
      { method: 'POST', json: { correo: correo.trim() } },
      copyRegistro.errorServidor
    );
    return r.mensaje;
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
