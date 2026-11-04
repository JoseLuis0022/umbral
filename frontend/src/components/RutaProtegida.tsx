import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Button } from './ui';
import { errores } from '../copy';
import { ShieldAlert } from 'lucide-react';

/**
 * Guarda de sesión y de rol.
 *
 * Sin sesión, manda a /login guardando el destino en `state.from`, para volver
 * ahí después de entrar en vez de dejar al usuario en la pantalla inicial.
 *
 * Con `soloAdmin`, un usuario sin rol de administrador NO es redirigido en
 * silencio: ve una explicación de por qué no puede entrar. Una redirección muda
 * se lee como un bug, sobre todo en una demostración donde alguien acaba de
 * cambiar de perfil y no entiende por qué la pantalla saltó sola.
 */
export function RutaProtegida({ children, soloAdmin }: { children: ReactNode; soloAdmin?: boolean }) {
  const { sesion, esAdmin, cargando } = useAuth();
  const location = useLocation();

  // Mientras se recupera la sesión de localStorage no se sabe si hay sesión;
  // renderizar el login en ese hueco haría parpadear el formulario.
  if (cargando) return <div className="h-full w-full bg-bg" />;

  if (!sesion) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (soloAdmin && !esAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-tarjeta border border-hairline bg-surface-1">
          <EmptyState
            icon={ShieldAlert}
            title={errores.sinPermiso}
            description={errores.sinPermisoDetalle}
            action={
              <Button size="sm" variant="secondary" onClick={() => window.history.back()}>
                Volver
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
