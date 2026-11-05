import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PerfilAgente, PlanCuenta, Sesion, Usuario } from '../types';
import { authService } from '../services/auth.service';
import { siLaSesionExpira } from '../services/api';

type AuthCtx = {
  sesion: Sesion | null;
  usuario: Usuario | null;
  /** Modos del agente que esta cuenta puede usar (los dice el backend). */
  perfiles: PerfilAgente[];
  /** Solo para MOSTRAR u ocultar. Quien niega de verdad es el backend. */
  esAdmin: boolean;
  /** ¿El rol tiene este permiso extra? Igual: solo para mostrar u ocultar. */
  puede: (permiso: string) => boolean;
  cargando: boolean;
  /** Crédito de una cuenta con tope (invitado); null = sin tope. */
  plan: PlanCuenta | null;
  /** Vuelve a pedir la sesión al servidor (p. ej. para actualizar el crédito tras una consulta). */
  refrescar: () => Promise<void>;
  /** Entra con una sesión ya emitida (el enlace de verificación del correo). */
  entrarConSesion: (sesion: Sesion) => void;
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

  const refrescar = useCallback(async () => {
    const actual = await authService.recuperarSesion();
    if (actual) setSesion(actual);
  }, []);

  const entrarConSesion = useCallback((nueva: Sesion) => setSesion(nueva), []);

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
      // Una sesión guardada antes de que existiera `permisos` no trae el campo.
      puede: (permiso: string) => sesion?.permisos?.includes(permiso) ?? false,
      cargando,
      plan: sesion?.plan ?? null,
      refrescar,
      entrarConSesion,
      iniciarSesion,
      cerrarSesion,
    }),
    [sesion, cargando, refrescar, entrarConSesion, iniciarSesion, cerrarSesion]
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
