import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Accessibility,
  Info,
  Mail,
  MessagesSquare,
  Palette,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { PageEnter, Banner, Button, SegmentedControl, Modal, useToast } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import { Seccion, FilaAjuste, FilaTexto, FilaDato, FilaPendiente, Interruptor } from '../components/ajustes';
import { ModalCorreo } from '../components/ajustes/ModalCorreo';
import { configCorreo as copyCorreo } from '../copy';
import {
  usePreferencias,
  type Contraste,
  type Densidad,
  type Movimiento,
  type TamanoTexto,
} from '../context/PreferenciasContext';
import { useAuth } from '../context/AuthContext';
import { useReducedMotion } from '../lib/useReducedMotion';
import { borrarTodo } from '../services/simulacion';
import { ajustes as copy } from '../copy';


// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  // — Apariencia —
  apariencia: 'Apariencia',
  densidadDetalle: 'Aprieta el ritmo vertical de listas y tablas. Los bloques de lectura no cambian.',
  tipografiaDetalle: 'Escala la interfaz completa, no solo el texto.',
  contraste: 'Contraste del texto',
  contrasteDetalle: 'Oscurece el texto secundario y marca más los separadores. Útil con luz directa o proyector.',
  contrasteEstandar: 'Estándar',
  contrasteAlto: 'Alto',

  // — Accesibilidad —
  accesibilidad: 'Accesibilidad',
  movimiento: 'Reducir el movimiento',
  movimientoDetalle:
    'Quita desplazamientos y rebotes; el aviso de que algo pasó se mantiene. Apagado, se respeta lo que pida tu sistema operativo.',
  movimientoSistema: 'Tu sistema ya pide movimiento reducido, así que la app lo aplica aunque este ajuste esté apagado.',
  enlaces: 'Subrayar los enlaces',
  enlacesDetalle: 'Los enlaces dentro de textos se subrayan siempre, no solo al pasar el puntero.',
  toque: 'Objetivos táctiles amplios',
  toqueDetalle: 'Sube todo botón y menú a 44 px de alto, también con ratón. Ayuda si te cuesta apuntar fino.',
  restablecerPreferencias: 'Volver a los ajustes de fábrica',
  preferenciasRestablecidas: 'Ajustes de fábrica restaurados',

  // — Chat, todavía sin conectar —
  chat: 'Chat',
  pendiente: 'Siguiente versión',
  chatNota:
    'Estos ajustes ya están diseñados, pero todavía no hacen nada: por eso no los ponemos como interruptores. Se conectan en la siguiente versión.',
  envio: 'Tecla para enviar en el chat',
  envioDetalle: 'Elegir entre Enter para enviar o Cmd/Ctrl + Enter, con Enter para el salto de línea.',
  avisoIA: 'Aviso de que la IA puede equivocarse',
  avisoIADetalle: 'Ocultar la línea bajo el campo de escritura una vez que ya la leíste.',
  idioma: 'Idioma de las respuestas',
  idiomaDetalle: 'Pedirle al asistente que responda siempre en español o en inglés, sin repetirlo cada vez.',

  // — Privacidad —
  privacidad: 'Privacidad y datos',
  auditoria: 'Quién puede leer tus conversaciones',
  auditoriaDetalle:
    'La Universidad audita el uso de la herramienta: un administrador puede abrir cualquier conversación con tu nombre, tu área y tu correo a la vista. No hay modo privado ni conversaciones ocultas.',
  auditoriaAdmin:
    'Tu perfil es de administrador: tú también ves las conversaciones de toda la comunidad en Auditoría, con los mismos datos.',
  auditoriaBanner: 'Aquí no se esconde nada: esto es lo que la herramienta guarda y quién lo ve.',
  almacenamiento: 'Dónde viven estos datos',
  almacenamientoValor: 'Navegador y servidor',
  almacenamientoDetalle:
    'Tus preferencias y la lista de conversaciones se guardan en este navegador. Cada pregunta y cada respuesta del asistente quedan registradas en el servidor del laboratorio.',

  // — Cuenta —
  cuenta: 'Cuenta',
  cuentaNombre: 'Nombre',
  cuentaCorreo: 'Correo institucional',
  cuentaArea: 'Área',
  cuentaRol: 'Rol en la herramienta',
  cuentaNota: 'Estos datos llegan del directorio institucional y no se editan desde la herramienta.',
  verPerfil: 'Ver mi perfil',
  rolUsuario: 'Personal administrativo',
  rolAdmin: 'Administrador',

  // — Acerca de —
  acercaDe: 'Acerca de',
  version: 'Versión',
  // Se escriben a mano mientras la maqueta no tenga pipeline de compilación:
  // cuando lo tenga, salen de variables inyectadas por Vite en tiempo de build.
  versionValor: '0.1.0 · maqueta de demostración',
  compilacion: 'Compilación',
  compilacionValor: '2 de septiembre de 2026',
  entorno: 'Entorno',
  soporte: 'Reportar un problema',
  soporteCorreo: 'soporte.aldia@aurora.edu.mx',
  soporteDetalle: 'Cuéntanos qué esperabas y qué pasó. Si puedes, adjunta una captura.',
};

/**
 * Ajustes (/ajustes).
 *
 * Panel de preferencias de la instalación, en secciones rotuladas y no en una
 * lista plana: la gente no lee estos paneles, los recorre buscando una cosa.
 *
 * Regla de honestidad de la pantalla: lo que se muestra como control FUNCIONA
 * y se nota al instante, sin recargar. Lo que todavía no está conectado se
 * agrupa aparte, sin control que tocar y con su etiqueta de "Siguiente
 * versión" — el mismo trato que el botón de Microsoft en el login. Un
 * interruptor que no mueve nada es peor que no tener el ajuste.
 */
export default function Ajustes() {
  const {
    densidad,
    tamanoTexto,
    contraste,
    movimiento,
    enlacesSubrayados,
    toqueAmplio,
    setDensidad,
    setTamanoTexto,
    setContraste,
    setMovimiento,
    setEnlacesSubrayados,
    setToqueAmplio,
    hayPersonalizacion,
    restablecerPreferencias,
  } = usePreferencias();
  const { usuario, esAdmin, puede } = useAuth();
  const [correoAbierto, setCorreoAbierto] = useState(false);
  // Solo para AVISAR: si el sistema ya pide movimiento reducido, el interruptor
  // apagado no significa "con movimiento", y callárselo parecería un bug.
  const sistemaReduceMovimiento = useReducedMotion();

  const [confirmando, setConfirmando] = useState(false);
  const { push } = useToast();
  const navigate = useNavigate();

  // Igual que en Perfil: la ruta ya está protegida, pero sin esta guarda la
  // sección de Cuenta sería un hijo condicional de PageEnter, y un hijo que a
  // veces no existe deja un hueco de 32 px en la cascada de entrada.
  if (!usuario) return null;

  /**
   * Restablecer borra TODO el almacenamiento con prefijo `umbral:`, lo que
   * incluye la sesión. Por eso recarga en /login: dejar la app en pie con una
   * sesión que ya no existe en el almacenamiento produce una pantalla a medias
   * imposible de explicar en una demostración.
   */
  function restablecer() {
    borrarTodo();
    setConfirmando(false);
    push({ message: copy.datosRestablecidos, tone: 'success' });
    setTimeout(() => {
      navigate('/login', { replace: true });
      window.location.reload();
    }, 700);
  }

  function volverAFabrica() {
    restablecerPreferencias();
    push({ message: TEXTO.preferenciasRestablecidas, tone: 'success' });
  }

  return (
    <>
      <PageEnter className="mx-auto w-full flex max-w-2xl flex-col gap-8">
        <PageHeader
          title={copy.titulo}
          subtitle={copy.subtitulo}
          actions={
            // Solo aparece cuando hay algo que deshacer: un botón permanente que
            // casi siempre no hace nada acaba leyéndose como decoración.
            hayPersonalizacion ? (
              <Button variant="secondary" size="sm" onClick={volverAFabrica}>
                <RotateCcw size={14} /> {TEXTO.restablecerPreferencias}
              </Button>
            ) : undefined
          }
        />

        <Seccion titulo={TEXTO.apariencia} icono={Palette}>
          <FilaAjuste titulo={copy.densidad} detalle={TEXTO.densidadDetalle}>
            {(ids) => (
              <div role="group" aria-labelledby={ids.titulo} aria-describedby={ids.detalle}>
                <SegmentedControl
                  layoutId="pref-densidad"
                  options={[
                    { value: 'comoda', label: copy.densidadComoda },
                    { value: 'compacta', label: copy.densidadCompacta },
                  ]}
                  value={densidad}
                  onChange={(v) => setDensidad(v as Densidad)}
                />
              </div>
            )}
          </FilaAjuste>

          <FilaAjuste titulo={copy.tipografia} detalle={TEXTO.tipografiaDetalle}>
            {(ids) => (
              <div role="group" aria-labelledby={ids.titulo} aria-describedby={ids.detalle}>
                <SegmentedControl
                  layoutId="pref-texto"
                  options={[
                    { value: 'pequeno', label: 'Pequeña' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'grande', label: 'Grande' },
                  ]}
                  value={tamanoTexto}
                  onChange={(v) => setTamanoTexto(v as TamanoTexto)}
                />
              </div>
            )}
          </FilaAjuste>

          <FilaAjuste titulo={TEXTO.contraste} detalle={TEXTO.contrasteDetalle}>
            {(ids) => (
              <div role="group" aria-labelledby={ids.titulo} aria-describedby={ids.detalle}>
                <SegmentedControl
                  layoutId="pref-contraste"
                  options={[
                    { value: 'estandar', label: TEXTO.contrasteEstandar },
                    { value: 'alto', label: TEXTO.contrasteAlto },
                  ]}
                  value={contraste}
                  onChange={(v) => setContraste(v as Contraste)}
                />
              </div>
            )}
          </FilaAjuste>
        </Seccion>

        <Seccion
          titulo={TEXTO.accesibilidad}
          icono={Accessibility}
          aviso={
            sistemaReduceMovimiento && movimiento === 'sistema' ? (
              <Banner tone="blue">{TEXTO.movimientoSistema}</Banner>
            ) : undefined
          }
        >
          <FilaAjuste titulo={TEXTO.movimiento} detalle={TEXTO.movimientoDetalle}>
            {(ids) => (
              <Interruptor
                encendido={movimiento === 'reducido'}
                onChange={(v) => setMovimiento((v ? 'reducido' : 'sistema') satisfies Movimiento)}
                etiquetadoPor={ids.titulo}
                descritoPor={ids.detalle}
              />
            )}
          </FilaAjuste>

          <FilaAjuste titulo={TEXTO.enlaces} detalle={TEXTO.enlacesDetalle}>
            {(ids) => (
              <Interruptor
                encendido={enlacesSubrayados}
                onChange={setEnlacesSubrayados}
                etiquetadoPor={ids.titulo}
                descritoPor={ids.detalle}
              />
            )}
          </FilaAjuste>

          <FilaAjuste titulo={TEXTO.toque} detalle={TEXTO.toqueDetalle}>
            {(ids) => (
              <Interruptor
                encendido={toqueAmplio}
                onChange={setToqueAmplio}
                etiquetadoPor={ids.titulo}
                descritoPor={ids.detalle}
              />
            )}
          </FilaAjuste>
        </Seccion>

        <Seccion titulo={TEXTO.chat} icono={MessagesSquare} nota={TEXTO.chatNota}>
          <FilaPendiente titulo={TEXTO.envio} detalle={TEXTO.envioDetalle} etiqueta={TEXTO.pendiente} />
          <FilaPendiente titulo={TEXTO.avisoIA} detalle={TEXTO.avisoIADetalle} etiqueta={TEXTO.pendiente} />
          <FilaPendiente titulo={TEXTO.idioma} detalle={TEXTO.idiomaDetalle} etiqueta={TEXTO.pendiente} />
        </Seccion>

        <Seccion
          titulo={TEXTO.privacidad}
          icono={ShieldCheck}
          aviso={<Banner tone="blue">{TEXTO.auditoriaBanner}</Banner>}
        >
          <FilaTexto
            titulo={TEXTO.auditoria}
            detalle={`${TEXTO.auditoriaDetalle}${esAdmin ? ` ${TEXTO.auditoriaAdmin}` : ''}`}
          />
          <FilaTexto
            titulo={TEXTO.almacenamiento}
            valor={TEXTO.almacenamientoValor}
            detalle={TEXTO.almacenamientoDetalle}
          />
          <FilaAjuste titulo={copy.restablecer} detalle={copy.restablecerDetalle}>
            {() => (
              <Button variant="secondary" size="sm" onClick={() => setConfirmando(true)}>
                <RotateCcw size={14} /> {copy.restablecerConfirmar}
              </Button>
            )}
          </FilaAjuste>
        </Seccion>

        {/* Solo quien administra cuentas: el registro público depende del correo. */}
        {puede('usuarios') && (
          <Seccion titulo="Registro público" icono={Mail}>
            <FilaAjuste titulo={copyCorreo.titulo} detalle={copyCorreo.descripcion}>
              {() => (
                <Button variant="secondary" size="sm" onClick={() => setCorreoAbierto(true)}>
                  <Mail size={14} /> {copyCorreo.boton}
                </Button>
              )}
            </FilaAjuste>
          </Seccion>
        )}
        <ModalCorreo abierto={correoAbierto} onCerrar={() => setCorreoAbierto(false)} />

        <Seccion titulo={TEXTO.cuenta} icono={UserRound}>
          <dl className="flex flex-col divide-y divide-hairline">
            <FilaDato etiqueta={TEXTO.cuentaNombre} valor={usuario.nombre} />
            <FilaDato etiqueta={TEXTO.cuentaCorreo} valor={usuario.correo} />
            <FilaDato etiqueta={TEXTO.cuentaArea} valor={usuario.area} />
            <FilaDato etiqueta={TEXTO.cuentaRol} valor={esAdmin ? TEXTO.rolAdmin : TEXTO.rolUsuario} />
          </dl>
          <p className="p-5 font-ui text-13 text-text-2">
            {TEXTO.cuentaNota}{' '}
            <Link to="/perfil" className="font-medium text-accent-fg underline-offset-2 hover:underline">
              {TEXTO.verPerfil}
            </Link>
          </p>
        </Seccion>

        <Seccion titulo={TEXTO.acercaDe} icono={Info}>
          <dl className="flex flex-col divide-y divide-hairline">
            <FilaDato etiqueta={TEXTO.version} valor={TEXTO.versionValor} />
            <FilaDato etiqueta={TEXTO.compilacion} valor={TEXTO.compilacionValor} />
            <FilaDato etiqueta={TEXTO.entorno} valor={import.meta.env.DEV ? 'Desarrollo' : 'Producción'} />
          </dl>
          <p className="p-5 font-ui text-13 text-text-2">
            <span className="font-medium text-text-1">{TEXTO.soporte}:</span> {TEXTO.soporteDetalle}{' '}
            <a
              href={`mailto:${TEXTO.soporteCorreo}`}
              className="font-medium text-accent-fg underline-offset-2 hover:underline"
            >
              {TEXTO.soporteCorreo}
            </a>
          </p>
        </Seccion>
        </PageEnter>

      <Modal
        open={confirmando}
        onClose={() => setConfirmando(false)}
        title={copy.restablecer}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            {/* El botón destructivo nombra la acción, nunca dice solo "Sí". */}
            <Button variant="destructive" onClick={restablecer}>
              {copy.restablecerConfirmar}
            </Button>
          </>
        }
      >
        <p className="font-ui text-15 text-text-2">
          {copy.restablecerDetalle} Se cerrará tu sesión y volverás a la pantalla de acceso.
        </p>
      </Modal>
    </>
  );
}
