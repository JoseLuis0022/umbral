import type { Sesion, Usuario } from '../types';
import { usuarios } from '../data/usuarios';
import { esperar, leer, escribir } from './simulacion';

const CLAVE = 'sesion';

/**
 * Autenticación SIMULADA.
 *
 * En la demostración cualquier contraseña es válida: la herramienta es interna
 * y el acceso real se resolverá con la cuenta institucional (Entra ID / MSAL),
 * no con un formulario propio. Lo único que este servicio decide es CON QUÉ
 * PERFIL se entra, y eso lo determina el correo.
 *
 * Un correo que no está en el directorio entra igual, como personal
 * administrativo: en una demostración, un correo mal escrito no debe dejar a
 * nadie fuera de la pantalla que venía a mostrar.
 */
export const authService = {
  async iniciarSesion(correo: string, _contrasena: string): Promise<Sesion> {
    await esperar(300, 700);
    const limpio = correo.trim().toLowerCase();
    const encontrado = usuarios.find((u) => u.correo.toLowerCase() === limpio);
    const usuario = encontrado ?? { ...usuarios[0], correo: limpio };
    const sesion: Sesion = { usuario };
    escribir(CLAVE, sesion);
    return sesion;
  },

  /** Entrada directa por perfil: el atajo del login para demostrar la app. */
  async entrarComo(usuario: Usuario): Promise<Sesion> {
    await esperar(300, 700);
    const sesion: Sesion = { usuario };
    escribir(CLAVE, sesion);
    return sesion;
  },

  /** Cambio de perfil sin pasar por el login, desde el menú del avatar. */
  cambiarPerfil(usuario: Usuario): Sesion {
    const sesion: Sesion = { usuario };
    escribir(CLAVE, sesion);
    return sesion;
  },

  recuperarSesion(): Sesion | null {
    return leer<Sesion | null>(CLAVE, null);
  },

  cerrarSesion() {
    escribir<Sesion | null>(CLAVE, null);
  },
};
