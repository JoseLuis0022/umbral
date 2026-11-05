import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessagesSquare, PanelLeft, PanelLeftClose, Plus } from 'lucide-react';
import type { AdjuntoPreparado } from '../lib/adjuntos';
import { cn } from '../lib/cn';
import { dur, ease, springLayout, springSoft } from '../lib/motion';
import { useReducedMotion } from '../lib/useReducedMotion';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { pasosPrincipales } from '../lib/proceso';
import { ColaMensajes } from '../components/chat/ColaMensajes';
import { Button, Drawer, EmptyState, IconButton, useEsCompacto, useToast } from '../components/ui';
import {
  BarraEntrada,
  ContenidoHistorial,
  EstadoVacio,
  HiloMensajes,
  copyLocal,
  primerNombre,
} from '../components/chat';
import { chat as copy } from '../copy';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  sesionNueva: 'Sesión nueva',
  panelHistorial: 'Historial de conversaciones',
};

/** Ancho del panel lateral en escritorio. Fijo: un panel elástico hace que el hilo cambie de medida de lectura al redimensionar. */
const ANCHO_PANEL = 292;

/**
 * Pantalla de chat (/chat y /chat/:conversacionId).
 *
 * UNA sola pantalla sirve las dos rutas. El id de la URL no es "otra vista":
 * es cuál conversación está abierta, y el historial de al lado no debería
 * desmontarse ni volver a cargar por cambiar de hilo.
 *
 * El panel de historial vive AQUÍ y no en el shell a propósito (lo documenta
 * `LayoutApp`): un panel global ocuparía ancho permanente en Al día y en
 * Administración, donde no significa nada. En móvil no cabe al lado y se
 * convierte en cajón.
 *
 * La pantalla recibe el alto completo (`LayoutApp scrollPropio`) y administra
 * su propio desbordamiento: el único scroll es el del hilo, y la barra de
 * entrada queda anclada abajo sin `position: fixed` — un input fijo sobre un
 * documento que scrollea es lo que hace que los teclados de iOS lo tapen.
 */
export default function Chat() {
  const { conversacionId } = useParams<{ conversacionId: string }>();
  const navigate = useNavigate();
  const reducido = useReducedMotion();
  const compacto = useEsCompacto();
  const { push } = useToast();
  const { usuario } = useAuth();

  const {
    conversaciones,
    cargando,
    conversacionActiva,
    seleccionar,
    enviar,
    detener,
    regenerar,
    reintentar,
    estadoStream,
    textoParcial,
    proceso,
    archivosEnVivo,
    actividad,
    pensoMs,
    errorStream,
    puedeAjustarModelo,
    modelos,
    ajusteModelo,
    cambiarAjusteModelo,
    perfiles: perfilesChat,
    perfilActual,
    perfilFijo,
    cambiarPerfil,
    streamEnId,
    progresoTrabajos,
    quitarDeCola,
    marcar,
    renombrar,
    eliminar,
    reaccionar,
  } = useChat();

  // "Automático" = el modelo del modo con el que habla esta conversación.
  const modeloDelPerfil = perfilesChat.find((p) => p.id === perfilActual)?.modelo ?? null;

  const [texto, setTexto] = useState('');
  const [adjuntos, setAdjuntos] = useState<AdjuntoPreparado[]>([]);
  // Contador, no booleano: devolver el foco al campo dos veces seguidas (dos
  // chips, dos "nueva sesión") tiene que volver a disparar el efecto.
  const [senalFoco, setSenalFoco] = useState(0);

  const [cajonAbierto, setCajonAbierto] = useState(false);
  // La cabecera del chat no tiene borde hasta que el hilo tiene algo debajo:
  // con la barra de la app encima, dos hairlines seguidas eran doble cromo.
  const [desplazado, setDesplazado] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(true);
  /*
   * El contenido del panel no puede ocultarse en el mismo frame en que empieza
   * a plegarse. El ancho tarda su animación entera en llegar a cero, y ocultar
   * el interior de golpe dejaba una FRANJA VACÍA encogiéndose durante todo ese
   * tiempo: el hueco se veía como un fallo de pintado, no como un panel que se
   * cierra. Se oculta al TERMINAR el pliegue (que es cuando ya no ocupa nada) y
   * se muestra al instante al abrir.
   */
  const [plegadoTerminado, setPlegadoTerminado] = useState(false);
  const contenidoPanelOculto = !panelAbierto && plegadoTerminado;

  // "Hace 3 h" se CALCULA contra el reloj: la pantalla necesita su propio latido.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // La URL manda sobre la selección, no al revés: pegar /chat/c-3 en la barra
  // de direcciones tiene que abrir esa conversación.
  useEffect(() => {
    seleccionar(conversacionId ?? null);
  }, [conversacionId, seleccionar]);


  const idAbierto = conversacionActiva?.id ?? null;
  const noEncontrada = !!conversacionId && !cargando && !conversacionActiva;

  // El stream es global (solo hay uno), pero solo se pinta en la conversación
  // a la que pertenece: si el usuario se va a otro hilo mientras responde, el
  // texto vivo no debe aparecer donde no es.
  const streamAqui = streamEnId !== null && streamEnId === idAbierto;
  // Ocupada es ESTA conversación: otra que trabaje en segundo plano no bloquea
  // el composer (mandar aquí la suelta y sigue en el servidor).
  const trabajandoAqui = !!conversacionActiva?.trabajoPendiente;
  const ocupado = (streamAqui && (estadoStream === 'esperando' || estadoStream === 'transmitiendo')) || trabajandoAqui;
  const pasosAqui = streamAqui ? pasosPrincipales(proceso) : idAbierto ? progresoTrabajos[idAbierto]?.pasos ?? 0 : 0;
  const errorAqui = streamAqui && estadoStream === 'error' ? errorStream : conversacionActiva?.errorPendiente ?? null;

  const nombre = useMemo(() => (usuario ? primerNombre(usuario.nombre) : ''), [usuario]);

  /*
   * Sesión EN BLANCO: el composer va centrado bajo el saludo, no pegado abajo
   * con el saludo flotando en medio. Al enviar, el mismo composer (mismo
   * `layoutId`) baja a su sitio con `springLayout`. En el teléfono se queda
   * abajo siempre: centrado, el teclado lo taparía al enfocarlo.
   */
  const enBlanco =
    !compacto &&
    !noEncontrada &&
    !(cargando && !!conversacionId) &&
    (conversacionActiva?.mensajes.length ?? 0) === 0 &&
    !ocupado &&
    !errorAqui &&
    !(streamAqui && estadoStream === 'error');

  /*
   * Los chips del estado vacío SE ENVÍAN al pulsarlos, no se precargan.
   *
   * Es lo contrario de lo que hace una pregunta que llega desde una guía (ver
   * arriba), y la diferencia está en de dónde viene cada una. La de la guía es
   * un tema que alguien acaba de leer y casi siempre quiere matizarlo con su
   * caso antes de mandarlo. Un chip es una pregunta cerrada que propone la
   * propia app: pedir un segundo clic en "Enviar" para un texto que nadie va a
   * editar solo añade un paso.
   */
  const enviarSugerencia = useCallback(
    (sugerencia: string) => {
      if (ocupado) return;
      const id = enviar(sugerencia, []);
      if (!id) return;
      setTexto('');
      setAdjuntos([]);
      if (id !== conversacionId) navigate(`/chat/${id}`, { replace: true });
    },
    [ocupado, enviar, conversacionId, navigate]
  );

  const nuevaSesion = useCallback(() => {
    setCajonAbierto(false);
    setTexto('');
    setAdjuntos([]);
    seleccionar(null);
    // Solo se navega si de verdad se venía de una conversación: repetir
    // /chat sobre /chat llenaría el historial del navegador de entradas
    // idénticas y "atrás" dejaría de salir del chat.
    if (conversacionId) navigate('/chat');
    setSenalFoco((n) => n + 1);
  }, [conversacionId, navigate, seleccionar]);

  const abrirConversacion = useCallback(
    (id: string) => {
      setCajonAbierto(false);
      // Se selecciona ANTES de navegar: dejárselo al efecto de la ruta pinta
      // un frame con el hilo anterior bajo el título nuevo.
      seleccionar(id);
      navigate(`/chat/${id}`);
    },
    [navigate, seleccionar]
  );

  function alEnviar() {
    // Ocupada no bloquea: `enviar` lo pone en la cola y se manda al terminar.
    if (!texto.trim() && !adjuntos.length) return;
    // `enviar` agrega el mensaje del usuario de forma síncrona y devuelve el id:
    // el mensaje aparece en el hilo en el mismo frame del clic, muy por debajo
    // de los 100 ms, y la espera de la respuesta ya es un estado visible.
    const id = enviar(texto, adjuntos);
    if (!id) return;
    setTexto('');
    setAdjuntos([]);
    // `replace`: la sesión recién creada no merece una entrada propia en el
    // historial del navegador — "atrás" debe salir del chat, no volver a /chat.
    if (id !== conversacionId) navigate(`/chat/${id}`, { replace: true });
  }

  /*
   * Los tres callbacks que bajan al historial y al hilo van en `useCallback`, y
   * no por costumbre: `ContenidoHistorial`, `EstadoVacio` y las burbujas del
   * hilo están memoizados, y una función nueva por render los sacaría de la
   * memoización justo cuando más importa — durante el streaming esta pantalla
   * se renderiza una vez por frame.
   */
  const alRenombrar = useCallback(
    (id: string, titulo: string) => {
      renombrar(id, titulo);
      push({ message: copyLocal.nombreGuardado, tone: 'success' });
    },
    [push, renombrar]
  );

  const alEliminar = useCallback(
    (id: string) => {
      eliminar(id);
      push({ message: copyLocal.conversacionEliminada, tone: 'success' });
      if (id === conversacionId) navigate('/chat', { replace: true });
    },
    [conversacionId, eliminar, navigate, push]
  );

  const alReaccionar = useCallback(
    (mensajeId: string, reaccion: 'positiva' | 'negativa') => {
      if (idAbierto) reaccionar(idAbierto, mensajeId, reaccion);
    },
    [idAbierto, reaccionar]
  );

  const historial = (
    <ContenidoHistorial
      conversaciones={conversaciones}
      cargando={cargando}
      activaId={idAbierto}
      ahora={ahora}
      onAbrir={abrirConversacion}
      onNueva={nuevaSesion}
      onRenombrar={alRenombrar}
      onEliminar={alEliminar}
      onMarcar={marcar}
    />
  );

  const composer = (
    <motion.div layoutId={reducido ? undefined : 'composer'} transition={springLayout} className="w-full">
      <BarraEntrada
        valor={texto}
        onCambio={setTexto}
        adjuntos={adjuntos}
        onAdjuntos={setAdjuntos}
        contexto={conversacionActiva?.contexto}
        ajustesModelo={
          puedeAjustarModelo
            ? { modelos, ajuste: ajusteModelo, onCambiar: cambiarAjusteModelo, modeloPredeterminado: modeloDelPerfil }
            : undefined
        }
        ajustesModo={
          perfilesChat.length > 1
            ? { perfiles: perfilesChat, actual: perfilActual, fijo: perfilFijo, onCambiar: cambiarPerfil }
            : undefined
        }
        onEnviar={alEnviar}
        onDetener={detener}
        transmitiendo={ocupado}
        permiteCola
        autoFoco
        senalFoco={senalFoco}
        sinAviso={enBlanco}
      />
    </motion.div>
  );

  const vacio = noEncontrada ? (
    <EmptyState
      icon={MessagesSquare}
      title={copyLocal.conversacionNoEncontrada}
      description={copyLocal.conversacionNoEncontradaDetalle}
      action={
        <Button variant="secondary" size="sm" onClick={nuevaSesion}>
          <Plus size={14} /> {copy.nuevaSesion}
        </Button>
      }
    />
  ) : (
    <EstadoVacio nombre={nombre} onSugerencia={enviarSugerencia} />
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: dur.base, ease }}
      className="flex h-full w-full overflow-hidden"
    >
      {/* ── Panel lateral: historial (escritorio) ── */}
      <motion.aside
        aria-label={TEXTO.panelHistorial}
        initial={false}
        /*
         * Sí, esto anima `width`, que es de las propiedades caras.
         *
         * Se conserva a conciencia. Plegar el panel tiene que RECOLOCAR la
         * columna del hilo (su medida de lectura se vuelve a centrar en el
         * espacio que queda): cualquier alternativa con `transform` mueve el
         * panel pero deja el hilo donde estaba, que es justo lo que el gesto no
         * significa. El coste está acotado: es una interacción puntual, no un
         * trabajo por frame de fondo, y el contenido de dentro va en una caja de
         * ancho FIJO, así que solo se recalcula la caja de recorte y la columna
         * principal — el historial no se re-maqueta mientras dura.
         */
        animate={{ width: panelAbierto ? ANCHO_PANEL : 0 }}
        transition={reducido ? { duration: 0 } : springSoft}
        onAnimationComplete={() => setPlegadoTerminado(!panelAbierto)}
        className="hidden shrink-0 overflow-hidden border-r border-hairline bg-surface-1 lg:block"
      >
        {/* `invisible` y no solo ancho 0: con el panel plegado su contenido
            seguiría siendo alcanzable con el tabulador, y el foco se perdería
            dentro de algo que no se ve. Se aplica al acabar el pliegue — ver
            `plegadoTerminado` arriba. */}
        <div className={cn('h-full', contenidoPanelOculto && 'invisible')} style={{ width: ANCHO_PANEL }}>
          {historial}
        </div>
      </motion.aside>

      {/* ── Columna principal: cabecera + hilo + entrada ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            'flex h-12 shrink-0 items-center gap-2 border-b px-2 transition-colors duration-150 lg:px-4',
            desplazado && !enBlanco ? 'border-hairline' : 'border-transparent'
          )}
        >
          <IconButton
            aria-label={copyLocal.mostrarHistorial}
            onClick={() => setCajonAbierto(true)}
            className="lg:hidden"
          >
            <PanelLeft size={18} />
          </IconButton>

          <IconButton
            aria-label={panelAbierto ? copyLocal.ocultarHistorial : copyLocal.mostrarHistorial}
            aria-expanded={panelAbierto}
            onClick={() => setPanelAbierto((abierto) => !abierto)}
            className="hidden lg:inline-flex"
          >
            {panelAbierto ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </IconButton>

          <h1 className="min-w-0 flex-1 truncate px-1 font-ui text-14 font-medium text-text-2">
            {conversacionActiva?.titulo ?? TEXTO.sesionNueva}
          </h1>

        </header>

        {enBlanco ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col items-center justify-center px-4 pb-[10vh] pt-4 lg:px-6">
              <EstadoVacio nombre={nombre} onSugerencia={enviarSugerencia} composer={composer} />
            </div>
          </div>
        ) : (
          <>
            <HiloMensajes
              conversacionId={idAbierto}
              mensajes={conversacionActiva?.mensajes ?? []}
              cargando={cargando && !!conversacionId}
              esperando={streamAqui && estadoStream === 'esperando'}
              actividad={streamAqui ? actividad : null}
              transmitiendo={streamAqui && estadoStream === 'transmitiendo'}
              textoParcial={streamAqui ? textoParcial : ''}
              proceso={streamAqui ? proceso : []}
              archivosEnVivo={streamAqui ? archivosEnVivo : []}
              pensoMs={streamAqui ? pensoMs : null}
              error={ocupado ? null : errorAqui}
              onReintentar={reintentar}
              onContinuar={
                conversacionActiva?.errorReanudable ? () => void enviar(copy.textoContinuar, []) : undefined
              }
              onRegenerar={regenerar}
              onReaccion={alReaccionar}
              onDesplazado={setDesplazado}
              vacio={vacio}
              trabajo={trabajandoAqui ? { desde: conversacionActiva?.trabajoDesde, pasos: pasosAqui } : null}
            />

            <div className="shrink-0 px-4 pb-4 lg:px-6">
              <div className="mx-auto w-full max-w-[720px]">
                {!noEncontrada && conversacionActiva?.cola?.length ? (
                  <ColaMensajes
                    cola={conversacionActiva.cola}
                    onQuitar={(mensajeId) => quitarDeCola(conversacionActiva.id, mensajeId)}
                  />
                ) : null}
                {noEncontrada ? null : composer}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Panel lateral: historial (móvil) ── */}
      <Drawer
        open={cajonAbierto}
        onClose={() => setCajonAbierto(false)}
        title={copy.historialTitulo}
        side="left"
      >
        {/* El cajón ya trae su propio relleno horizontal; se cancela para que
            las filas del historial midan lo mismo aquí que en escritorio. */}
        <div className="-mx-6 h-full">
          <ContenidoHistorial
            conversaciones={conversaciones}
            cargando={cargando}
            activaId={idAbierto}
            ahora={ahora}
            onAbrir={abrirConversacion}
            onNueva={nuevaSesion}
            onRenombrar={alRenombrar}
            onEliminar={alEliminar}
            onMarcar={marcar}
            conEncabezado={false}
          />
        </div>
      </Drawer>
    </motion.div>
  );
}
