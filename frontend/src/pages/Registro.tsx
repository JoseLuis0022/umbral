import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { dur, ease } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { authService } from '../services/auth.service';
import { ErrorApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import { LayoutAcceso } from '../components/acceso/LayoutAcceso';
import { registro as copy } from '../copy';

const RX_CORREO = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const ESPERA_REENVIO_S = 60;

/**
 * Registro público (self-service). La cuenta nace en modo INVITADO y sin
 * verificar: no puede entrar hasta abrir el enlace que llega al correo
 * (ver backend/app/rutas_auth.py). Tras enviar, la columna cambia a "Revisa
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
    <LayoutAcceso
      pie={copy.invitadoNota}
      progreso={enviadoA ? 1 : ((nombre.trim().length >= 2 ? 1 : 0) + (RX_CORREO.test(correo.trim()) ? 1 : 0) + (contrasena.length >= 8 ? 1 : 0)) / 3}
    >
      <motion.div animate={sacudir}>
        <AnimatePresence mode="wait" initial={false}>
          {enviadoA ? (
            <motion.div
              key="revisa"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.base, ease }}
              role="status"
            >
              <h1 className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.revisaTitulo}</h1>
              <p className="mt-3 font-ui text-15 text-text-2">{copy.revisaEnviamos}</p>
              {/* El momento tipográfico de esta pantalla es el correo: es lo
                  único que la persona tiene que comprobar. */}
              <p className="mt-1 break-all font-ui text-22 font-medium text-text-1">{enviadoA}</p>
              <p className="mt-4 font-ui text-14 leading-relaxed text-text-2">{copy.revisaInstruccion}</p>
              <Button variant="secondary" className="mt-8 w-full" disabled={espera > 0} onClick={reenviar}>
                {espera > 0 ? copy.reenviarEn(espera) : copy.reenviar}
              </Button>
              {aviso && <p className="mt-3 font-ui text-13 text-text-2">{aviso}</p>}
              {yaVerificada && (
                <Link to="/login" className="mt-2 inline-block font-ui text-14 font-medium text-accent-fg hover:underline">
                  {copy.irAEntrar}
                </Link>
              )}
              <p className="mt-6 font-ui text-14">
                <Link to="/login" className="font-medium text-accent-fg hover:underline">
                  {copy.volver}
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="formulario"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: dur.fast } }}
              transition={{ duration: dur.reveal, ease }}
            >
              <h1 className="font-ui text-28 font-semibold tracking-[-0.02em] text-text-1">{copy.titulo}</h1>
              <p className="mt-2 font-ui text-15 leading-relaxed text-text-2">{copy.subtitulo}</p>
              <form onSubmit={alEnviar} className="mt-8 flex flex-col gap-4" noValidate>
                <Field label={copy.nombre} error={errores.nombre}>
                  <Input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" autoFocus maxLength={80} />
                </Field>
                <Field label={copy.correo} error={errores.correo}>
                  <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="email" />
                </Field>
                <Field label={copy.contrasena} error={errores.contrasena} hint={copy.pistaContrasena}>
                  <Input
                    type="password"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                {errores.general && (
                  <p role="alert" className={yaVerificada ? 'font-ui text-14 text-text-2' : 'font-ui text-14 text-status-red'}>
                    {errores.general}{' '}
                    {yaVerificada && (
                      <Link to="/login" className="font-medium text-accent-fg hover:underline">
                        {copy.irAEntrar}
                      </Link>
                    )}
                  </p>
                )}
                <Button type="submit" className="mt-2 w-full" loading={cargando}>
                  {cargando ? copy.creando : copy.crear}
                </Button>
              </form>
              <p className="mt-6 font-ui text-14 text-text-2">
                {copy.yaTienes}{' '}
                <Link to="/login" className="font-medium text-accent-fg hover:underline">
                  {copy.entrar}
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </LayoutAcceso>
  );
}
