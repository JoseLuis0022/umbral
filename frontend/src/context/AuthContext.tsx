import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Sesion, Usuario } from '../types';
import { authService } from '../services/auth.service';

type AuthCtx = {
  sesion: Sesion | null;
  usuario: Usuario | null;
  esAdmin: boolean;
  cargando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<Sesion>;
  entrarComo: (usuario: Usuario) => Promise<Sesion>;
  cambiarPerfil: (usuario: Usuario) => void;
  cerrarSesion: () => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children?: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  // `cargando` evita el parpadeo del login: mientras se recupera la sesión de
  // localStorage no se sabe todavía si hay sesión, y renderizar /login en ese
  // hueco haría que un usuario ya autenticado viera el formulario un instante.
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setSesion(authService.recuperarSesion());
    setCargando(false);
  }, []);

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    const nueva = await authService.iniciarSesion(correo, contrasena);
    setSesion(nueva);
    return nueva;
  }, []);

  const entrarComo = useCallback(async (usuario: Usuario) => {
    const nueva = await authService.entrarComo(usuario);
    setSesion(nueva);
    return nueva;
  }, []);

  const cambiarPerfil = useCallback((usuario: Usuario) => {
    setSesion(authService.cambiarPerfil(usuario));
  }, []);

  const cerrarSesion = useCallback(() => {
    authService.cerrarSesion();
    setSesion(null);
  }, []);

  const valor = useMemo<AuthCtx>(
    () => ({
      sesion,
      usuario: sesion?.usuario ?? null,
      esAdmin: sesion?.usuario.rol === 'admin',
      cargando,
      iniciarSesion,
      entrarComo,
      cambiarPerfil,
      cerrarSesion,
    }),
    [sesion, cargando, iniciarSesion, entrarComo, cambiarPerfil, cerrarSesion]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
