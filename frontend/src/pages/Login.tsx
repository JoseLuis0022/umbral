import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { springSoft, springSnappy, stagger, dur, ease } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useAuth } from '../context/AuthContext';
import { PERFILES_DEMO } from '../data/usuarios';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Logo } from '../components/brand/Logo';
import { login as copy } from '../copy';
import type { Usuario } from '../types';

/**
 * Punto de entrada de la app.
 *
 * Cualquier contraseña es válida: el acceso real se resolverá con la cuenta
 * institucional, no con este formulario. Lo que sí decide el correo es el
 * PERFIL con el que se entra.
 *
 * El desplegable de perfiles es la pieza importante para demostrar el MVP: deja
 * saltar entre personal administrativo y administrador en un clic, sin escribir
 * credenciales ni recordar qué correo corresponde a qué rol. Se queda visible en
 * producción de demostración a propósito — un interruptor escondido "solo en
 * desarrollo" obliga a quien presenta a explicar por qué no lo ve el público.
 */
export default function Login() {
  const [correo, setCorreo] = useState('estudiante.demo@aurora.edu.mx');
  const [contrasena, setContrasena] = useState('aurora2026');
  const [error, setError] = useState<string | undefined>();
  const [cargando, setCargando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const [demoAbierto, setDemoAbierto] = useState(false);

  const demoRef = useRef<HTMLDivElement>(null);
  const relojSalida = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducido = useReducedMotion();

  useEffect(() => () => {
    if (relojSalida.current) clearTimeout(relojSalida.current);
  }, []);
  const controlesTarjeta = useAnimation();
  const navigate = useNavigate();
  const location = useLocation();
  const { iniciarSesion, entrarComo } = useAuth();

  // Volver al destino que el usuario intentaba abrir antes de que la ruta
  // protegida lo mandara aquí.
  const destino = (location.state as { from?: string } | null)?.from ?? '/chat';

  useEffect(() => {
    if (!demoAbierto) return;
    function alPresionar(e: MouseEvent) {
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) setDemoAbierto(false);
    }
    function alEscapar(e: KeyboardEvent) {
      if (e.key === 'Escape') setDemoAbierto(false);
    }
    document.addEventListener('mousedown', alPresionar);
    document.addEventListener('keydown', alEscapar);
    return () => {
      document.removeEventListener('mousedown', alPresionar);
      document.removeEventListener('keydown', alEscapar);
    };
  }, [demoAbierto]);

  // La tarjeta sale hacia arriba antes de navegar: la transición explica que se
  // deja atrás la pantalla de acceso, en vez de cortar a negro.
  function salirHacia(ruta: string) {
    setSaliendo(true);
    // El temporizador se guarda para poder cancelarlo: si algo desmonta el
    // login antes de que termine la salida, navegar desde un componente muerto
    // deja la app en un estado que nadie pidió.
    relojSalida.current = setTimeout(() => navigate(ruta, { replace: true }), dur.reveal * 1000);
  }

  async function entrarConPerfil(usuario: Usuario) {
    setError(undefined);
    setCargando(true);
    await entrarComo(usuario);
    setCargando(false);
    salirHacia(usuario.rol === 'admin' ? '/admin/conversaciones' : destino);
  }

  async function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!correo.trim() || !contrasena.trim()) {
      setError(copy.errorVacio);
      // Con movimiento reducido la tarjeta no se sacude, pero el error NO
      // desaparece: sigue apareciendo bajo el campo, que es el feedback real.
      // Sacudir es el énfasis, no el mensaje.
      if (!reducido) {
        controlesTarjeta.start({ x: [0, -8, 8, -8, 8, 0], transition: { duration: dur.slow, ease } });
      }
      return;
    }
    setError(undefined);
    setCargando(true);
    const sesion = await iniciarSesion(correo, contrasena);
    setCargando(false);
    salirHacia(sesion.usuario.rol === 'admin' ? '/admin/conversaciones' : destino);
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
                    nombran al producto y a la universidad. */}
                <Logo tamano="lg" alt="" />
                <h1 className="mt-4 font-ui text-22 text-text-1">{copy.titulo}</h1>
                <p className="mt-1 font-ui text-13 text-text-3">{copy.subtitulo}</p>
              </motion.div>

              <form onSubmit={alEnviar} className="mt-7 flex flex-col gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: stagger.base * 2 }}
                >
                  <Field label={copy.correo}>
                    <Input
                      type="email"
                      placeholder="nombre.apellido@aurora.edu.mx"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      autoComplete="username"
                    />
                  </Field>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springSoft, delay: stagger.base * 3 }}
                >
                  <Field label={copy.contrasena} error={error} hint={error ? undefined : copy.demoNota}>
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
                  className="flex flex-col gap-3"
                >
                  <Button type="submit" className="w-full" loading={cargando}>
                    {cargando ? copy.entrando : copy.entrar}
                  </Button>

                  <div className="flex items-center gap-3">
                    <span className="h-px flex-1 bg-hairline" />
                    <span className="font-ui text-12 text-text-3">o</span>
                    <span className="h-px flex-1 bg-hairline" />
                  </div>

                  {/* Cuenta institucional. Deshabilitado a propósito en el MVP.
                      TODO: aquí va el handler de MSAL / Microsoft Entra ID —
                      loginPopup() con el tenant de la universidad, y el perfil
                      se resuelve desde los claims del token, no del correo. */}
                  <div>
                    <button
                      type="button"
                      disabled
                      aria-describedby="nota-microsoft"
                      className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-control border border-hairline bg-bg px-4 py-2.5 font-ui text-14 font-medium text-text-3"
                    >
                      <LogoMicrosoft />
                      {copy.microsoft}
                    </button>
                    <p id="nota-microsoft" className="mt-1.5 text-center font-ui text-12 text-text-3">
                      {copy.microsoftNota}
                    </p>
                  </div>
                </motion.div>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                // Con el mismo spring que sus cuatro hermanos: sin `transition` este
                // bloque caía en el tween por defecto de Framer y entraba con otro ritmo.
                transition={{ ...springSoft, delay: stagger.base * 5 }}
                className="relative mt-5 flex flex-col items-center"
                ref={demoRef}
              >
                <button
                  type="button"
                  onClick={() => setDemoAbierto((o) => !o)}
                  aria-expanded={demoAbierto}
                  className="flex items-center gap-1 font-ui text-12 text-text-3 transition-colors duration-150 hover:text-accent-fg"
                >
                  {copy.demoAbrir}
                  <ChevronDown size={12} className={demoAbierto ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </button>

                <AnimatePresence>
                  {demoAbierto && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: dur.fast } }}
                      transition={springSnappy}
                      className="absolute top-full z-10 mt-1.5 w-full rounded-tarjeta border border-hairline bg-surface-3 p-1.5 shadow-3"
                    >
                      {PERFILES_DEMO.map(({ usuario, etiqueta, detalle }) => (
                        <button
                          key={usuario.id}
                          type="button"
                          onClick={() => entrarConPerfil(usuario)}
                          className="flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors duration-150 hover:bg-accent-soft"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-ui text-12 font-semibold text-accent-fg">
                            {usuario.iniciales}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-ui text-13 font-medium text-text-1">{etiqueta}</span>
                            <span className="block truncate font-ui text-12 text-text-3">
                              {usuario.nombre.split(' ').slice(0, 2).join(' ')} · {detalle}
                            </span>
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            <p className="mt-5 text-center font-ui text-12 text-text-3">{copy.pie}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Logotipo de Microsoft para el botón de cuenta institucional.
function LogoMicrosoft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden focusable="false">
      <rect x="0" y="0" width="7.2" height="7.2" fill="#F25022" />
      <rect x="8.8" y="0" width="7.2" height="7.2" fill="#7FBA00" />
      <rect x="0" y="8.8" width="7.2" height="7.2" fill="#00A4EF" />
      <rect x="8.8" y="8.8" width="7.2" height="7.2" fill="#FFB900" />
    </svg>
  );
}
