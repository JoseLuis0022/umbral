import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import { dur, ease } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { ErrorApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { LayoutAcceso } from '../components/acceso/LayoutAcceso';
import { login as copy, registro as copyRegistro } from '../copy';

/**
 * Punto de entrada de la app.
 *
 * El correo y la contraseña los verifica el backend; el rol con el que entras
 * también lo decide él. Ya no hay atajos para "entrar como" otro perfil: si el
 * navegador pudiera elegir tu rol, los roles no protegerían nada.
 */
export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  // 403 del login = la contraseña es buena pero falta confirmar el correo.
  const [porConfirmar, setPorConfirmar] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  const relojSalida = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducido = useReducedMotion();

  useEffect(() => () => {
    if (relojSalida.current) clearTimeout(relojSalida.current);
  }, []);
  const controlesTarjeta = useAnimation();
  const navigate = useNavigate();
  const location = useLocation();
  const { iniciarSesion } = useAuth();

  // Volver al destino que el usuario intentaba abrir antes de que la ruta
  // protegida lo mandara aquí.
  const destino = (location.state as { from?: string } | null)?.from ?? '/chat';

  // Antes de navegar, el nodo de la gráfica cruza el umbral y sube: la
  // transición dice "entraste" en vez de cortar a negro. Con movimiento
  // reducido el cruce es instantáneo y la espera, mínima.
  function salirHacia(ruta: string) {
    setSaliendo(true);
    const espera = reducido ? 0.15 : 0.65;
    // El temporizador se guarda para poder cancelarlo: si algo desmonta el
    // login antes de que termine la salida, navegar desde un componente muerto
    // deja la app en un estado que nadie pidió.
    relojSalida.current = setTimeout(() => navigate(ruta, { replace: true }), espera * 1000);
  }

  function marcarError(mensaje: string) {
    setError(mensaje);
    // Con movimiento reducido la tarjeta no se sacude, pero el error NO
    // desaparece: sigue apareciendo bajo el campo, que es el feedback real.
    // Sacudir es el énfasis, no el mensaje.
    if (!reducido) {
      void controlesTarjeta.start({ x: [0, -8, 8, -8, 8, 0], transition: { duration: dur.slow, ease } });
    }
  }

  async function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!correo.trim() || !contrasena) {
      marcarError(copy.errorVacio);
      return;
    }
    setError(undefined);
    setPorConfirmar(false);
    setReenviado(false);
    setCargando(true);
    try {
      await iniciarSesion(correo, contrasena);
      salirHacia(destino);
    } catch (fallo) {
      // 401 trae el mensaje del servidor; cualquier otra cosa (red caída,
      // backend apagado) es un problema de conexión, no de la contraseña.
      const conMensaje = fallo instanceof ErrorApi && (fallo.estado === 401 || fallo.estado === 403);
      marcarError(conMensaje ? fallo.message : copy.errorServidor);
      if (fallo instanceof ErrorApi && fallo.estado === 403) setPorConfirmar(true);
      else setContrasena('');
    } finally {
      setCargando(false);
    }
  }

  return (
    <LayoutAcceso pie={copy.pie} progreso={(correo.trim() ? 0.5 : 0) + (contrasena ? 0.5 : 0)} cruzado={saliendo}>
      {/* Un solo movimiento de entrada (opacidad, toda la columna junta): la
          cascada bloque por bloque era el gesto más genérico de la pantalla.
          El momento con carácter es el cruce del umbral al entrar. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: saliendo ? 0.4 : 1 }}
        transition={{ duration: dur.reveal, ease }}
      >
        <h1 className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.titulo}</h1>
        <p className="mt-2 font-ui text-15 leading-relaxed text-text-2">{copy.subtitulo}</p>

        <motion.form animate={controlesTarjeta} onSubmit={alEnviar} className="mt-8 flex flex-col gap-4" noValidate>
          <Field label={copy.correo}>
            <Input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              autoComplete="username"
              autoFocus
              disabled={saliendo}
            />
          </Field>
          <Field label={copy.contrasena} error={error}>
            <Input
              type="password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="current-password"
              disabled={saliendo}
            />
          </Field>
          <div className="mt-2">
            <Button type="submit" className="w-full" loading={cargando || saliendo}>
              {cargando || saliendo ? copy.entrando : copy.entrar}
            </Button>
            {porConfirmar && (
              <Button
                type="button"
                variant="secondary"
                className="mt-2 w-full"
                disabled={reenviado}
                onClick={() => {
                  setReenviado(true);
                  void authService.reenviarEnlace(correo).catch(() => undefined);
                }}
              >
                {reenviado ? copy.reenviado : copy.reenviar}
              </Button>
            )}
            {porConfirmar && (
              <Link
                to={`/verificar?correo=${encodeURIComponent(correo.trim())}`}
                className="mt-3 inline-block font-ui text-14 font-medium text-accent-fg hover:underline"
              >
                {copyRegistro.tengoCodigo}
              </Link>
            )}
          </div>
        </motion.form>

        <p className="mt-6 font-ui text-14 text-text-2">
          {copy.sinCuenta}{' '}
          <Link to="/registro" className="font-medium text-accent-fg hover:underline">
            {copy.crearCuenta}
          </Link>
        </p>
      </motion.div>
    </LayoutAcceso>
  );
}
