import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dur, ease } from '../lib/motion';
import { LayoutAcceso } from '../components/acceso/LayoutAcceso';
import { CampoCodigo } from '../components/acceso/CampoCodigo';
import { IsotipoPensando } from '../components/chat/IndicadorPensando';
import { Verificado } from '../components/acceso/Verificado';
import { Banner } from '../components/ui/Banner';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { ErrorApi } from '../services/api';
import type { Sesion } from '../types';
import { registro as copy } from '../copy';

type Estado =
  | { tipo: 'confirmando' }
  | { tipo: 'codigo' }
  | { tipo: 'listo'; conSesion: boolean }
  | { tipo: 'error'; mensaje: string };

const RX_CORREO = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const ESPERA_ENTRADA_MS = 1600;

/**
 * /verificar?token=…  → destino del enlace del correo.
 * /verificar?correo=… → escribir el código de 6 dígitos (desde el login, o si
 *                       el correo se abrió en otro dispositivo).
 *
 * Reabrir un enlace ya usado NO es un error: el lector de enlaces de Gmail y
 * las apps de correo lo abren antes que la persona. El backend responde
 * "verificada" sin sesión, y aquí se muestra la palomita con "inicia sesión"
 * (o se entra directo si este navegador ya tenía la sesión abierta).
 */
export default function Verificar() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [estado, setEstado] = useState<Estado>(token ? { tipo: 'confirmando' } : { tipo: 'codigo' });
  const { entrarConSesion, usuario } = useAuth();
  const navigate = useNavigate();
  // El efecto corre dos veces en desarrollo (StrictMode): una sola llamada.
  const pedido = useRef(false);
  const usuarioActual = useRef(usuario);
  usuarioActual.current = usuario;

  function terminar(sesion: Sesion | null) {
    if (sesion) entrarConSesion(sesion);
    const entra = sesion !== null || usuarioActual.current !== null;
    setEstado({ tipo: 'listo', conSesion: entra });
    if (entra) setTimeout(() => navigate('/chat', { replace: true }), ESPERA_ENTRADA_MS);
  }

  useEffect(() => {
    if (!token || pedido.current) return;
    pedido.current = true;
    authService
      .verificarCorreo(token)
      .then(({ sesion }) => terminar(sesion))
      .catch((fallo) => setEstado({ tipo: 'error', mensaje: fallo instanceof ErrorApi ? fallo.message : copy.errorVerificar }));
  }, [token]);

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
        {estado.tipo === 'listo' && <Verificado conSesion={estado.conSesion} />}
        {estado.tipo === 'codigo' && <FormularioCodigo correoInicial={params.get('correo') ?? ''} alVerificar={terminar} />}
        {estado.tipo === 'error' && (
          <>
            <h1 className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.verificarFalloTitulo}</h1>
            <div className="mt-4">
              <Banner tone="red">{estado.mensaje}</Banner>
            </div>
            <Button variant="secondary" className="mt-6 w-full" onClick={() => setEstado({ tipo: 'codigo' })}>
              {copy.tengoCodigo}
            </Button>
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

function FormularioCodigo({ correoInicial, alVerificar }: { correoInicial: string; alVerificar: (s: Sesion | null) => void }) {
  const [correo, setCorreo] = useState(correoInicial);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);

  async function confirmar(valor = codigo) {
    if (!RX_CORREO.test(correo.trim())) return setError(copy.errorCorreo);
    if (valor.length !== 6) return setError(copy.errorCodigoIncompleto);
    setError(undefined);
    setCargando(true);
    try {
      const { sesion } = await authService.verificarCodigo(correo, valor);
      alVerificar(sesion);
    } catch (fallo) {
      setError(fallo instanceof ErrorApi ? fallo.message : copy.errorServidor);
      setCodigo('');
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      <h1 className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.codigoTitulo}</h1>
      <p className="mt-2 font-ui text-15 leading-relaxed text-text-2">{copy.codigoSubtitulo}</p>
      <form
        className="mt-8 flex flex-col gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void confirmar();
        }}
      >
        <Field label={copy.correo}>
          <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" autoFocus={!correoInicial} />
        </Field>
        <Field label={copy.codigo} error={error}>
          <CampoCodigo
            valor={codigo}
            alCambiar={setCodigo}
            alCompletar={(v) => void confirmar(v)}
            invalido={Boolean(error)}
            deshabilitado={cargando}
          />
        </Field>
        <Button type="submit" className="w-full" loading={cargando}>
          {cargando ? copy.confirmandoCodigo : copy.confirmarCodigo}
        </Button>
      </form>
      <p className="mt-6 font-ui text-14">
        <Link to="/login" className="font-medium text-accent-fg hover:underline">
          {copy.volver}
        </Link>
      </p>
    </>
  );
}
