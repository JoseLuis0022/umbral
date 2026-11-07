import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { MailCheck } from 'lucide-react';
import { springSoft, dur, ease } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { authService } from '../services/auth.service';
import { ErrorApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { Logo } from '../components/brand/Logo';
import { registro as copy } from '../copy';

const RX_CORREO = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const ESPERA_REENVIO_S = 60;

/**
 * Registro público (self-service). La cuenta nace en modo INVITADO y sin
 * verificar: no puede entrar hasta abrir el enlace que llega al correo
 * (ver backend/app/rutas_auth.py). Tras enviar, la tarjeta cambia a "Revisa
 * tu correo" con un reenvío limitado a uno por minuto.
 */
export default function Registro() {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string; contrasena?: string; general?: string }>({});
  const [cargando, setCargando] = useState(false);
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  // El correo ya tenía una cuenta activa: no hay enlace que esperar, toca entrar.
  const [yaVerificada, setYaVerificada] = useState(false);
  const reducido = useReducedMotion();
  const sacudir = useAnimation();

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    const nuevos: typeof errores = {};
    if (nombre.trim().length < 2) nuevos.nombre = copy.errorNombre;
    if (!RX_CORREO.test(correo.trim())) nuevos.correo = copy.errorCorreo;
    if (contrasena.length < 8) nuevos.contrasena = copy.errorContrasena;
    setErrores(nuevos);
    if (Object.keys(nuevos).length) {
      if (!reducido) void sacudir.start({ x: [0, -8, 8, -8, 8, 0], transition: { duration: dur.slow, ease } });
      return;
    }
    setCargando(true);
    setYaVerificada(false);
    try {
      await authService.registrarse(nombre, correo, contrasena);
      setEnviadoA(correo.trim().toLowerCase());
      setEspera(ESPERA_REENVIO_S);
    } catch (fallo) {
      setYaVerificada(fallo instanceof ErrorApi && fallo.estado === 409);
      setErrores({ general: fallo instanceof ErrorApi ? fallo.message : copy.errorServidor });
      if (!reducido) void sacudir.start({ x: [0, -8, 8, -8, 8, 0], transition: { duration: dur.slow, ease } });
    } finally {
      setCargando(false);
    }
  }

  async function reenviar() {
    if (!enviadoA || espera > 0) return;
    setEspera(ESPERA_REENVIO_S);
    try {
      const r = await authService.reenviarEnlace(enviadoA);
      setYaVerificada(r.verificada);
      setAviso(r.verificada ? r.mensaje : copy.reenviado);
    } catch (fallo) {
      setAviso(fallo instanceof ErrorApi ? fallo.message : copy.errorServidor);
    }
  }

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-y-auto px-6 py-10"
      style={{ background: 'radial-gradient(120% 100% at 50% 0%, var(--accent-soft) 0%, var(--bg) 55%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={springSoft}
        className="w-full max-w-[400px]"
      >
        <motion.div animate={sacudir} className="rounded-tarjeta border border-hairline bg-surface-1 p-8 shadow-3">
          <AnimatePresence mode="wait" initial={false}>
            {enviadoA ? (
              <motion.div
                key="revisa"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={springSoft}
                className="flex flex-col items-center text-center"
                role="status"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-control bg-accent-soft text-accent-fg">
                  <MailCheck size={22} aria-hidden />
                </span>
                <h1 className="mt-4 font-ui text-22 text-text-1">{copy.revisaTitulo}</h1>
                <p className="mt-2 font-ui text-14 leading-relaxed text-text-2">{copy.revisaDetalle(enviadoA)}</p>
                <Button variant="secondary" className="mt-6 w-full" disabled={espera > 0} onClick={reenviar}>
                  {espera > 0 ? copy.reenviarEn(espera) : copy.reenviar}
                </Button>
                {aviso && <p className="mt-3 font-ui text-13 text-text-2">{aviso}</p>}
                {yaVerificada && (
                  <Link to="/login" className="mt-2 font-ui text-14 font-medium text-accent-fg hover:underline">
                    {copy.irAEntrar}
                  </Link>
                )}
                <Link to="/login" className="mt-5 font-ui text-13 font-medium text-accent-fg hover:underline">
                  {copy.volver}
                </Link>
              </motion.div>
            ) : (
              <motion.div key="formulario" exit={{ opacity: 0, transition: { duration: dur.fast } }}>
                <div className="flex flex-col items-center text-center">
                  <Logo tamano="lg" alt="" />
                  <h1 className="mt-4 font-ui text-22 text-text-1">{copy.titulo}</h1>
                  <p className="mt-1 font-ui text-13 text-text-3">{copy.subtitulo}</p>
                </div>
                <form onSubmit={alEnviar} className="mt-7 flex flex-col gap-4" noValidate>
                  <Field label={copy.nombre} error={errores.nombre}>
                    <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" autoFocus maxLength={80} />
                  </Field>
                  <Field label={copy.correo} error={errores.correo}>
                    <Input
                      type="email"
                      placeholder="tu.correo@ejemplo.mx"
                      value={correo}
                      onChange={(e) => setCorreo(e.target.value)}
                      autoComplete="email"
                    />
                  </Field>
                  <Field label={copy.contrasena} error={errores.contrasena} hint={copy.pistaContrasena}>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={contrasena}
                      onChange={(e) => setContrasena(e.target.value)}
                      autoComplete="new-password"
                    />
                  </Field>
                  {errores.general && (
                    <p role="alert" className={yaVerificada ? 'font-ui text-13 text-text-2' : 'font-ui text-13 text-status-red'}>
                      {errores.general}{' '}
                      {yaVerificada && (
                        <Link to="/login" className="font-medium text-accent-fg hover:underline">
                          {copy.irAEntrar}
                        </Link>
                      )}
                    </p>
                  )}
                  <Button type="submit" className="w-full" loading={cargando}>
                    {cargando ? copy.creando : copy.crear}
                  </Button>
                </form>
                <p className="mt-5 text-center font-ui text-13 text-text-2">
                  {copy.yaTienes}{' '}
                  <Link to="/login" className="font-medium text-accent-fg hover:underline">
                    {copy.entrar}
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <p className="mt-5 text-center font-ui text-12 text-text-3">{copy.invitadoNota}</p>
      </motion.div>
    </div>
  );
}
