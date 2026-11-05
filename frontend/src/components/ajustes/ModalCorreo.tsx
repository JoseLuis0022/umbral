import { useEffect, useState } from 'react';
import { ExternalLink, Send } from 'lucide-react';
import { Banner, Button, Field, Input, Modal, useToast } from '../ui';
import { ErrorApi } from '../../services/api';
import { guardarConfigCorreo, leerConfigCorreo, probarCorreo, type ConfigCorreo } from '../../services/correo.service';
import { configCorreo as copy } from '../../copy';

/**
 * Pegar la contraseña de aplicación de Gmail SIN pasarla por un chat ni por
 * el repositorio: va directo al servidor, que la guarda cifrada y nunca la
 * devuelve (el campo queda vacío con la nota "ya está guardada").
 */
export function ModalCorreo({ abierto, onCerrar, onCambio }: { abierto: boolean; onCerrar: () => void; onCambio?: (c: ConfigCorreo) => void }) {
  const { push } = useToast();
  const [config, setConfig] = useState<ConfigCorreo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [remitente, setRemitente] = useState('');
  const [contacto, setContacto] = useState('');
  const [urlPublica, setUrlPublica] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);

  useEffect(() => {
    if (!abierto) return;
    setError(null);
    setResultado(null);
    setContrasena('');
    leerConfigCorreo()
      .then((c) => {
        setConfig(c);
        setUsuario(c.usuario ?? '');
        setRemitente(c.remitente);
        setContacto(c.contacto ?? '');
        setUrlPublica(c.urlPublica);
      })
      .catch((e) => setError(e instanceof ErrorApi ? e.message : copy.errorCarga));
  }, [abierto]);

  async function guardar(): Promise<boolean> {
    setGuardando(true);
    setResultado(null);
    try {
      const nueva = await guardarConfigCorreo({
        usuario,
        // Vacío = no tocar la guardada.
        contrasena: contrasena.trim() ? contrasena : undefined,
        remitente,
        contacto,
        urlPublica,
      });
      setConfig(nueva);
      setContrasena('');
      onCambio?.(nueva);
      return true;
    } catch (e) {
      setResultado({ ok: false, texto: e instanceof ErrorApi ? e.message : copy.errorCarga });
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function probar() {
    // Se guarda primero: probar lo que está escrito, no lo de antes.
    if (!(await guardar())) return;
    setProbando(true);
    try {
      setResultado({ ok: true, texto: await probarCorreo() });
    } catch (e) {
      setResultado({ ok: false, texto: e instanceof ErrorApi ? e.message : copy.errorCarga });
    } finally {
      setProbando(false);
    }
  }

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title={copy.titulo}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={probar} loading={probando} disabled={!config || guardando}>
            <Send size={14} /> {copy.probar}
          </Button>
          <Button
            size="sm"
            loading={guardando && !probando}
            disabled={!config}
            onClick={async () => {
              if (await guardar()) {
                push({ message: copy.guardado, tone: 'success' });
                onCerrar();
              }
            }}
          >
            {copy.guardar}
          </Button>
        </>
      }
    >
      {error ? (
        <Banner tone="red">{error}</Banner>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="font-ui text-14 leading-relaxed text-text-2">
            {copy.descripcion}{' '}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent-fg hover:underline"
            >
              {copy.ayuda} <ExternalLink size={12} aria-hidden />
            </a>
          </p>
          {config && (
            <Banner tone={config.configurada ? 'green' : 'blue'}>
              {config.configurada ? copy.estadoListo : copy.estadoFalta}
            </Banner>
          )}
          <Field label={copy.usuario}>
            <Input type="email" value={usuario} placeholder="tu.correo@gmail.com" onChange={(e) => setUsuario(e.target.value)} autoComplete="off" />
          </Field>
          <Field label={copy.contrasena} hint={config?.configurada ? copy.contrasenaGuardada : copy.contrasenaPista}>
            <Input
              type="password"
              value={contrasena}
              placeholder={config?.configurada ? '•••• •••• •••• ••••' : 'abcd efgh ijkl mnop'}
              onChange={(e) => setContrasena(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={copy.remitente}>
              <Input value={remitente} onChange={(e) => setRemitente(e.target.value)} maxLength={80} />
            </Field>
            <Field label={copy.contacto} hint={copy.contactoPista}>
              <Input type="email" value={contacto} onChange={(e) => setContacto(e.target.value)} />
            </Field>
          </div>
          <Field label={copy.urlPublica} hint={copy.urlPublicaPista}>
            <Input value={urlPublica} onChange={(e) => setUrlPublica(e.target.value)} />
          </Field>
          {resultado && (
            <div role="status">
              <Banner tone={resultado.ok ? 'green' : 'red'}>{resultado.texto}</Banner>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
