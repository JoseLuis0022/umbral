import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { springSoft, stagger, dur, ease } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useAuth } from '../context/AuthContext';
import { ErrorApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Logo } from '../components/brand/Logo';
import { login as copy } from '../copy';

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

  // La tarjeta sale hacia arriba antes de navegar: la transición explica que se
  // deja atrás la pantalla de acceso, en vez de cortar a negro.
  function salirHacia(ruta: string) {
    setSaliendo(true);
    // El temporizador se guarda para poder cancelarlo: si algo desmonta el
    // login antes de que termine la salida, navegar desde un componente muerto
    // deja la app en un estado que nadie pidió.
    relojSalida.current = setTimeout(() => navigate(ruta, { replace: true }), dur.reveal * 1000);
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
    setCargando(true);
    try {
      await iniciarSesion(correo, contrasena);
      salirHacia(destino);
    } catch (fallo) {
      // 401 trae el mensaje del servidor; cualquier otra cosa (red caída,
      // backend apagado) es un problema de conexión, no de la contraseña.
      marcarError(fallo instanceof ErrorApi && fallo.estado === 401 ? fallo.message : copy.errorServidor);
      setContrasena('');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-y-auto px-6 py-10"
      style={{ background: 'radial-gradient(120% 100% at 50% 0%, var(--accent-soft) 0%, var(--bg) 55%)' }}
    >
      <AnimatePresence>
        {!saliendo && (
          <motion.div
            key="tarjeta-login"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -24, transition: { duration: dur.reveal, ease } }}
            transition={springSoft}
            className="w-full max-w-[400px]"
          >
            <motion.div
              animate={controlesTarjeta}
              className="rounded-tarjeta border border-hairline bg-surface-1 p-8 shadow-3"
            >
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springSoft, delay: stagger.base }}
                className="flex flex-col items-center text-center"
              >
                {/* Decorativo aquí: el h1 y el subtítulo que van debajo ya
                    nombran al producto. */}
                <Logo tamano="lg" alt="" />
                <h1 className="mt-4 font-ui text-22 text-text-1">{copy.titulo}</h1>
                <p className="mt-1 font-ui text-13 text-text-3">{copy.subtitulo}</p>
              </motion.div>

              <form onSubmit={alEnviar} className="mt-7 flex flex-col gap-4" noValidate>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: stagger.base * 2 }}
                >
                  <Field label={copy.correo}>
                    <Input
                      type="email"
                      placeholder="tu.correo@ejemplo.mx"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      autoComplete="username"
                      autoFocus
                    />
                  </Field>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: stagger.base * 3 }}
                >
                  <Field label={copy.contrasena} error={error}>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      autoComplete="current-password"
                    />
                  </Field>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: stagger.base * 4 }}
                >
                  <Button type="submit" className="w-full" loading={cargando}>
                    {cargando ? copy.entrando : copy.entrar}
                  </Button>
                </motion.div>
              </form>
            </motion.div>

            <p className="mt-5 text-center font-ui text-12 text-text-3">{copy.pie}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
