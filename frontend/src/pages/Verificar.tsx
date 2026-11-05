import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CircleCheck, CircleAlert, Loader2 } from 'lucide-react';
import { springSoft } from '../lib/motion';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { ErrorApi } from '../services/api';
import { registro as copy } from '../copy';

type Estado = { tipo: 'confirmando' } | { tipo: 'listo' } | { tipo: 'error'; mensaje: string };

/**
 * Destino del enlace del correo: /verificar?token=…
 *
 * Confirma la cuenta y deja la sesión iniciada (el backend devuelve la sesión
 * al verificar), así que la persona cae directo en el chat. El enlace es de un
 * solo uso: abrirlo dos veces da un error claro, no una pantalla rota.
 */
export default function Verificar() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [estado, setEstado] = useState<Estado>(token ? { tipo: 'confirmando' } : { tipo: 'error', mensaje: copy.sinToken });
  const { entrarConSesion } = useAuth();
  const navigate = useNavigate();
  // El efecto corre dos veces en desarrollo (StrictMode): el token es de un
  // solo uso, así que la segunda llamada fallaría y pintaría un error falso.
  const pedido = useRef(false);

  useEffect(() => {
    if (!token || pedido.current) return;
    pedido.current = true;
    authService
      .verificarCorreo(token)
      .then((sesion) => {
        setEstado({ tipo: 'listo' });
        entrarConSesion(sesion);
        setTimeout(() => navigate('/chat', { replace: true }), 1200);
      })
      .catch((fallo) => setEstado({ tipo: 'error', mensaje: fallo instanceof ErrorApi ? fallo.message : copy.errorVerificar }));
  }, [token, entrarConSesion, navigate]);

  return (
    <div
      className="flex h-full w-full items-center justify-center px-6 py-10"
      style={{ background: 'radial-gradient(120% 100% at 50% 0%, var(--accent-soft) 0%, var(--bg) 55%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springSoft}
        className="flex w-full max-w-[400px] flex-col items-center rounded-tarjeta border border-hairline bg-surface-1 p-8 text-center shadow-3"
        role="status"
        aria-live="polite"
      >
        {estado.tipo === 'confirmando' && (
          <>
            <Loader2 size={28} className="animate-spin text-accent-fg motion-reduce:animate-none" aria-hidden />
            <p className="mt-4 font-ui text-15 text-text-2">{copy.verificando}</p>
          </>
        )}
        {estado.tipo === 'listo' && (
          <>
            <CircleCheck size={32} className="text-status-green" aria-hidden />
            <h1 className="mt-4 font-ui text-22 text-text-1">{copy.verificadoTitulo}</h1>
            <p className="mt-1 font-ui text-14 text-text-2">{copy.verificadoDetalle}</p>
          </>
        )}
        {estado.tipo === 'error' && (
          <>
            <CircleAlert size={32} className="text-status-red" aria-hidden />
            <h1 className="mt-4 font-ui text-22 text-text-1">{copy.verificarFalloTitulo}</h1>
            <p className="mt-2 font-ui text-14 leading-relaxed text-text-2">{estado.mensaje}</p>
            <Link to="/login" className="mt-6 font-ui text-14 font-medium text-accent-fg hover:underline">
              {copy.volver}
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
