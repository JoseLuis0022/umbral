import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PerfilAgente, Sesion, Usuario } from '../types';
import { authService } from '../services/auth.service';
import { siLaSesionExpira } from '../services/api';

type AuthCtx = {
  sesion: Sesion | null;
  usuario: Usuario | null;
  /** Modos del agente que esta cuenta puede usar (los dice el backend). */
  perfiles: PerfilAgente[];
  /** Solo para MOSTRAR u ocultar. Quien niega de verdad es el backend. */
  esAdmin: boolean;
  cargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<Sesion>;
  cerrarSesion: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children?: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  // `cargando` evita el parpadeo del login: mientras se valida el token con el
  // backend no se sabe todavía si hay sesión, y renderizar /login en ese hueco
  // haría que un usuario ya autenticado viera el formulario un instante.
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    void authService.recuperarSesion().then((recuperada) => {
      if (!vivo) return;
      setSesion(recuperada);
      setCargando(false);
    });
    // Si el backend rechaza el token a media sesión, se sale en ese instante.
    const dejarDeEscuchar = siLaSesionExpira(() => setSesion(null));
    return () => {
      vivo = false;
      dejarDeEscuchar();
    };
  }, []);

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    const nueva = await authService.iniciarSesion(correo, contrasena);
    setSesion(nueva);
    return nueva;
  }, []);

  const cerrarSesion = useCallback(() => {
    authService.cerrarSesion();
    setSesion(null);
  }, []);

  const valor = useMemo<AuthCtx>(
    () => ({
      sesion,
      usuario: sesion?.usuario ?? null,
      perfiles: sesion?.perfiles ?? [],
      esAdmin: sesion?.usuario.rol === 'admin',
      cargando,
      iniciarSesion,
      cerrarSesion,
    }),
    [sesion, cargando, iniciarSesion, cerrarSesion]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
