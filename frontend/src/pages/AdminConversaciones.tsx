import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MessagesSquare, SearchX } from 'lucide-react';
import { Button, EmptyState, ErrorState, PageEnter } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import {
  BarraFiltros,
  CarrilConversaciones,
  DetalleConversacion,
  EsqueletoDetalle,
  EsqueletoLista,
  ListaConversaciones,
} from '../components/admin/auditoria';
import { PanelPlegable } from '../components/shell';
import { cn } from '../lib/cn';
import { dur, ease } from '../lib/motion';
import {
  adminService,
  hayFiltrosActivos,
  FILTROS_VACIOS,
  type ConversacionAuditada,
  type FiltrosAuditoria,
} from '../services/admin.service';
import { admin as copy } from '../copy';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  actualizando: 'Actualizando…',
  sinResultados: 'Ninguna conversación coincide',
  sinResultadosDetalle: 'Prueba con otras palabras, otra persona o un rango de fechas más amplio.',
  limpiarFiltros: 'Quitar todos los filtros',
  sinConversaciones: 'Todavía no hay conversaciones que auditar',
  sinConversacionesDetalle: 'En cuanto la comunidad use el asistente, sus sesiones aparecerán aquí.',
  errorLista: 'No pudimos cargar las conversaciones',
  errorListaDetalle: 'Revisa tu conexión e intenta de nuevo.',
  errorDetalle: 'No pudimos abrir esta conversación',
  errorDetalleDetalle: 'Puede que se haya movido. Intenta de nuevo o elige otra de la lista.',
  conteo: (n: number) => `${n} ${n === 1 ? 'conversación' : 'conversaciones'}`,
  sinSeleccionTitulo: 'Ninguna conversación abierta',
  plegarLista: 'Plegar la lista de conversaciones',
  desplegarLista: 'Desplegar la lista de conversaciones',
};

/** Clave propia de esta pantalla: plegar aquí no pliega Corpus ni Boletines. */
const CLAVE_PLEGADO = 'panel-plegado:auditoria';

type EstadoCarga = 'cargando' | 'actualizando' | 'listo' | 'error';

/**
 * Auditoría de conversaciones (/admin/conversaciones).
 *
 * El administrador ve TODAS las conversaciones de TODAS las personas, con
 * nombre, área y correo a la vista. Es una facultad deliberada de la
 * herramienta y por eso no se atenúa ni se esconde: media pantalla es la lista
 * global y la otra media, la evidencia completa.
 *
 * En escritorio los dos paneles conviven (lista angosta / lectura ancha, una
 * asimetría que dice cuál manda). En móvil no caben lado a lado, así que se
 * convierten en navegación de dos niveles: lista → detalle con botón de volver.
 *
 * La lista se PLIEGA a un carril de avatares (`PanelPlegable`), no hasta
 * desaparecer: leer un resumen largo pide ancho, pero saltar a la siguiente
 * conversación tiene que seguir siendo un clic. El estado se recuerda solo para
 * esta pantalla.
 */
export default function AdminConversaciones() {
  const personas = useMemo(() => adminService.listarPersonas(), []);

  const [filtros, setFiltros] = useState<FiltrosAuditoria>(FILTROS_VACIOS);
  // El campo de búsqueda es inmediato; el FILTRO va con retraso. Separarlos es
  // lo que permite que se escriba sin tirones y que la lista no se recargue
  // una vez por tecla.
  const [textoCampo, setTextoCampo] = useState('');

  const [conversaciones, setConversaciones] = useState<ConversacionAuditada[]>([]);
  const [estadoLista, setEstadoLista] = useState<EstadoCarga>('cargando');

  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<ConversacionAuditada | null>(null);
  const [estadoDetalle, setEstadoDetalle] = useState<EstadoCarga>('listo');

  // Navegación de dos niveles, solo activa por debajo de lg.
  const [vistaMovil, setVistaMovil] = useState<'lista' | 'detalle'>('lista');

  // Fuerza un reintento sin tocar los filtros.
  const [intento, setIntento] = useState(0);

  const yaCargoUnaVez = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => (f.texto === textoCampo ? f : { ...f, texto: textoCampo })), 220);
    return () => clearTimeout(t);
  }, [textoCampo]);

  useEffect(() => {
    let vigente = true;
    // La primera carga muestra esqueleto; las siguientes conservan los
    // resultados anteriores y solo avisan "Actualizando…" (estado parcial):
    // vaciar la lista en cada tecla se siente roto, no rápido.
    setEstadoLista(yaCargoUnaVez.current ? 'actualizando' : 'cargando');
    adminService
      .listarConversaciones(filtros)
      .then((datos) => {
        if (!vigente) return;
        yaCargoUnaVez.current = true;
        setConversaciones(datos);
        setEstadoLista('listo');
      })
      .catch(() => {
        if (vigente) setEstadoLista('error');
      });
    return () => {
      vigente = false;
    };
  }, [filtros, intento]);

  useEffect(() => {
    if (!seleccionId) {
      setDetalle(null);
      setEstadoDetalle('listo');
      return;
    }
    let vigente = true;
    setEstadoDetalle('cargando');
    adminService
      .obtenerConversacion(seleccionId)
      .then((datos) => {
        if (!vigente) return;
        setDetalle(datos);
        setEstadoDetalle(datos ? 'listo' : 'error');
      })
      .catch(() => {
        if (vigente) setEstadoDetalle('error');
      });
    return () => {
      vigente = false;
    };
  }, [seleccionId, intento]);

  const seleccionar = useCallback((id: string) => {
    setSeleccionId(id);
    setVistaMovil('detalle');
  }, []);

  const cambiarFiltros = useCallback((parcial: Partial<FiltrosAuditoria>) => {
    setFiltros((f) => ({ ...f, ...parcial }));
  }, []);

  const limpiarTodo = useCallback(() => {
    setTextoCampo('');
    setFiltros(FILTROS_VACIOS);
  }, []);

  const conFiltros = hayFiltrosActivos(filtros);
  const listaOcupada = estadoLista === 'cargando' || estadoLista === 'actualizando';

  return (
    // La pantalla ocupa el alto disponible y el scroll vive DENTRO de cada
    // panel: si scrollara la página entera, la cabecera de filtros se iría y
    // habría que subir hasta arriba para cambiar de persona.
    // El selector de último hijo es lo que deja que el bloque de paneles crezca
    // dentro de la envoltura que PageEnter le pone a cada hijo.
    <PageEnter className="flex h-full flex-col [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1">
      <PageHeader compacto title={copy.conversacionesTitulo} subtitle={copy.conversacionesSubtitulo} />

      {/* La columna de la lista es `auto` y no un ancho fijo: el ancho lo pone
          ahora `PanelPlegable` como estilo en línea (es lo que anima al plegar),
          y la rejilla se limita a seguirlo. Por debajo de `lg` no hay plegado y
          las dos zonas se apilan, como antes. */}
      <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        {/* ── Panel izquierdo: lista global ── */}
        <PanelPlegable
          clave={CLAVE_PLEGADO}
          ancho={{ lg: 340, xl: 380 }}
          textoPlegar={TEXTO.plegarLista}
          textoDesplegar={TEXTO.desplegarLista}
          carril={
            <CarrilConversaciones
              conversaciones={conversaciones}
              cargando={estadoLista === 'cargando'}
              seleccionId={seleccionId}
              onSeleccionar={seleccionar}
            />
          }
        >
          <section
            aria-label={copy.conversacionesTitulo}
            className={cn(
              'min-h-0 flex-col rounded-tarjeta border border-hairline bg-surface-1 shadow-1 lg:h-full',
              vistaMovil === 'detalle' ? 'hidden lg:flex' : 'flex'
            )}
          >
            <BarraFiltros
              filtros={filtros}
              personas={personas}
              texto={textoCampo}
              onTexto={setTextoCampo}
              onCambiar={cambiarFiltros}
            />

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-b-tarjeta">
              {estadoLista === 'cargando' ? (
                <EsqueletoLista />
              ) : estadoLista === 'error' ? (
                <ErrorState
                  title={TEXTO.errorLista}
                  description={TEXTO.errorListaDetalle}
                  onRetry={() => setIntento((n) => n + 1)}
                />
              ) : conversaciones.length === 0 ? (
                conFiltros ? (
                  <EmptyState
                    icon={SearchX}
                    title={TEXTO.sinResultados}
                    description={TEXTO.sinResultadosDetalle}
                    action={
                      <Button variant="secondary" size="sm" onClick={limpiarTodo}>
                        {TEXTO.limpiarFiltros}
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState
                    icon={MessagesSquare}
                    title={TEXTO.sinConversaciones}
                    description={TEXTO.sinConversacionesDetalle}
                  />
                )
              ) : (
                <ListaConversaciones
                  conversaciones={conversaciones}
                  seleccionId={seleccionId}
                  onSeleccionar={seleccionar}
                />
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline px-4 py-2">
              <span className="font-ui text-12 tabular-nums text-text-3">
                {listaOcupada && !yaCargoUnaVez.current ? ' ' : TEXTO.conteo(conversaciones.length)}
              </span>
              <AnimatePresence>
                {estadoLista === 'actualizando' && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: dur.fast, ease }}
                    role="status"
                    className="font-ui text-12 text-text-3"
                  >
                    {TEXTO.actualizando}
                  </motion.span>
                )}
              </AnimatePresence>
            </footer>
          </section>
        </PanelPlegable>

        {/* ── Panel derecho: análisis, resumen y transcripción ── */}
        <section
          aria-label={copy.transcripcion}
          className={cn(
            'min-h-0 flex-col overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
            vistaMovil === 'lista' ? 'hidden lg:flex' : 'flex'
          )}
        >
          {estadoDetalle === 'cargando' ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <EsqueletoDetalle />
            </div>
          ) : estadoDetalle === 'error' ? (
            <ErrorState
              title={TEXTO.errorDetalle}
              description={TEXTO.errorDetalleDetalle}
              onRetry={() => setIntento((n) => n + 1)}
            />
          ) : detalle ? (
            <DetalleConversacion conversacion={detalle} onVolver={() => setVistaMovil('lista')} />
          ) : (
            <EmptyState
              icon={MessagesSquare}
              title={TEXTO.sinSeleccionTitulo}
              description={copy.sinSeleccion}
            />
          )}
        </section>
      </div>
    </PageEnter>
  );
}
