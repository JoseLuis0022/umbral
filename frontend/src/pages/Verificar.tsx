import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dur, ease } from '../lib/motion';
import { LayoutAcceso } from '../components/acceso/LayoutAcceso';
import { IsotipoPensando } from '../components/chat/IndicadorPensando';
import { Banner } from '../components/ui/Banner';
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
    <LayoutAcceso progreso={estado.tipo === 'confirmando' ? 1 : 0} cruzado={estado.tipo === 'listo'}>
      <motion.div
        key={estado.tipo}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: dur.base, ease }}
        role="status"
        aria-live="polite"
      >
        {estado.tipo === 'confirmando' && (
          <div className="flex items-center gap-3">
            {/* La espera propia de la marca, la misma del chat: no un spinner genérico. */}
            <IsotipoPensando tamano={28} />
            <p className="font-ui text-15 text-text-2">{copy.verificando}</p>
          </div>
        )}
        {estado.tipo === 'listo' && (
          <>
            <h1 className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.verificadoTitulo}</h1>
            <p className="mt-2 font-ui text-15 text-text-2">{copy.verificadoDetalle}</p>
          </>
        )}
        {estado.tipo === 'error' && (
          <>
            <h1 className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.verificarFalloTitulo}</h1>
            <div className="mt-4">
              <Banner tone="red">{estado.mensaje}</Banner>
            </div>
            <p className="mt-6 font-ui text-14">
              <Link to="/login" className="font-medium text-accent-fg hover:underline">
                {copy.volver}
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </LayoutAcceso>
  );
}
