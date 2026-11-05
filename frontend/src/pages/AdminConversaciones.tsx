import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MessagesSquare, SearchX } from 'lucide-react';
import { Button, EmptyState, ErrorState, PageEnter } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import {
  BarraFiltros,
  CarrilConsultas,
  DetalleConsulta,
  EsqueletoDetalle,
  EsqueletoLista,
  ListaConsultas,
} from '../components/admin/auditoria';
import { PanelPlegable } from '../components/shell';
import { cn } from '../lib/cn';
import { dur, ease } from '../lib/motion';
import {
  auditoriaService,
  hayFiltrosActivos,
  FILTROS_VACIOS,
  type ConsultaAuditada,
  type ConsultaDetalle,
  type FiltrosAuditoria,
  type ResumenUsuario,
} from '../services/auditoria.service';
import { admin as copyAdmin, auditoria as copy } from '../copy';

/** Clave propia de esta pantalla: plegar aquí no pliega Corpus ni el Laboratorio. */
const CLAVE_PLEGADO = 'panel-plegado:auditoria';

type EstadoCarga = 'cargando' | 'actualizando' | 'listo' | 'error';

/**
 * Auditoría (/admin/conversaciones).
 *
 * Lee lo que el backend guarda de CADA consulta al agente —pregunta, respuesta,
 * modelo, costo, tokens, herramientas, estado— y lo muestra con nombre y correo
 * de quien preguntó. Es una facultad deliberada del laboratorio (Ajustes lo
 * explica a cada persona), por eso la identidad no se atenúa.
 *
 * Lista angosta a la izquierda (filtros y paginación por "Cargar más") y
 * lectura ancha a la derecha. En móvil, navegación de dos niveles.
 */
export default function AdminConversaciones() {
  const [personas, setPersonas] = useState<ResumenUsuario[]>([]);
  // `?usuario=<id>` llega desde el Tablero ("ver sus consultas").
  const [parametros] = useSearchParams();
  const [filtros, setFiltros] = useState<FiltrosAuditoria>(() => ({
    ...FILTROS_VACIOS,
    usuarioId: parametros.get('usuario') || null,
  }));
  // El campo de búsqueda es inmediato; el FILTRO va con retraso, para no pedir
  // una página al servidor por cada tecla.
  const [textoCampo, setTextoCampo] = useState('');

  const [consultas, setConsultas] = useState<ConsultaAuditada[]>([]);
  const [siguiente, setSiguiente] = useState<number | null>(null);
  const [estadoLista, setEstadoLista] = useState<EstadoCarga>('cargando');
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorMas, setErrorMas] = useState(false);

  const [seleccionId, setSeleccionId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<ConsultaDetalle | null>(null);
  const [estadoDetalle, setEstadoDetalle] = useState<EstadoCarga>('listo');

  const [vistaMovil, setVistaMovil] = useState<'lista' | 'detalle'>('lista');
  const [intento, setIntento] = useState(0);
  const [intentoDetalle, setIntentoDetalle] = useState(0);
  const yaCargoUnaVez = useRef(false);

  // Quién ha preguntado en el último año: alimenta el filtro por persona. Si
  // falla, el filtro solo ofrece "todas"; la lista sigue funcionando.
  useEffect(() => {
    let vigente = true;
    auditoriaService
      .obtenerResumen(365)
      .then((r) => vigente && setPersonas(r.porUsuario))
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setFiltros((f) => (f.texto === textoCampo ? f : { ...f, texto: textoCampo })), 300);
    return () => clearTimeout(t);
  }, [textoCampo]);

  useEffect(() => {
    let vigente = true;
    // La primera carga muestra esqueleto; las siguientes conservan la lista
    // anterior y avisan "Actualizando…" (estado parcial).
    setEstadoLista(yaCargoUnaVez.current ? 'actualizando' : 'cargando');
    setErrorMas(false);
    auditoriaService
      .listarConsultas(filtros)
      .then((pagina) => {
        if (!vigente) return;
        yaCargoUnaVez.current = true;
        setConsultas(pagina.consultas);
        setSiguiente(pagina.siguiente);
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
    if (seleccionId == null) {
      setDetalle(null);
      setEstadoDetalle('listo');
      return;
    }
    let vigente = true;
    setEstadoDetalle('cargando');
    auditoriaService
      .obtenerConsulta(seleccionId)
      .then((datos) => {
        if (!vigente) return;
        setDetalle(datos);
        setEstadoDetalle('listo');
      })
      .catch(() => {
        if (vigente) setEstadoDetalle('error');
      });
    return () => {
      vigente = false;
    };
  }, [seleccionId, intentoDetalle]);

  const cargarMas = useCallback(() => {
    if (siguiente == null) return;
    setCargandoMas(true);
    setErrorMas(false);
    auditoriaService
      .listarConsultas(filtros, siguiente)
      .then((pagina) => {
        setConsultas((previas) => [...previas, ...pagina.consultas]);
        setSiguiente(pagina.siguiente);
      })
      .catch(() => setErrorMas(true))
      .finally(() => setCargandoMas(false));
  }, [filtros, siguiente]);

  const seleccionar = useCallback((id: number) => {
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

  return (
    <PageEnter className="flex h-full flex-col [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1">
      <PageHeader compacto title={copyAdmin.conversacionesTitulo} subtitle={copyAdmin.conversacionesSubtitulo} />

      <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        {/* ── Panel izquierdo: lista global ── */}
        <PanelPlegable
          clave={CLAVE_PLEGADO}
          ancho={{ lg: 360, xl: 400 }}
          textoPlegar={copy.plegarLista}
          textoDesplegar={copy.desplegarLista}
          carril={
            <CarrilConsultas
              consultas={consultas}
              cargando={estadoLista === 'cargando'}
              seleccionId={seleccionId}
              onSeleccionar={seleccionar}
            />
          }
        >
          <section
            aria-label={copyAdmin.conversacionesTitulo}
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
                  title={copy.errorLista}
                  description={copy.errorListaDetalle}
                  onRetry={() => setIntento((n) => n + 1)}
                />
              ) : consultas.length === 0 ? (
                conFiltros ? (
                  <EmptyState
                    icon={SearchX}
                    title={copy.sinResultados}
                    description={copy.sinResultadosDetalle}
                    action={
                      <Button variant="secondary" size="sm" onClick={limpiarTodo}>
                        {copy.limpiarFiltros}
                      </Button>
                    }
                  />
                ) : (
                  <EmptyState icon={MessagesSquare} title={copy.sinConsultas} description={copy.sinConsultasDetalle} />
                )
              ) : (
                <>
                  <ListaConsultas consultas={consultas} seleccionId={seleccionId} onSeleccionar={seleccionar} />
                  {siguiente != null && (
                    <div className="flex flex-col items-center gap-1.5 px-4 py-3">
                      <Button variant="secondary" size="sm" loading={cargandoMas} onClick={cargarMas}>
                        {copy.cargarMas}
                      </Button>
                      {errorMas && (
                        <p role="alert" className="font-ui text-12 text-status-red">
                          {copy.errorMas}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline px-4 py-2">
              <span className="font-ui text-12 tabular-nums text-text-3">
                {yaCargoUnaVez.current ? copy.conteo(consultas.length, siguiente != null) : ' '}
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
                    {copy.actualizando}
                  </motion.span>
                )}
              </AnimatePresence>
            </footer>
          </section>
        </PanelPlegable>

        {/* ── Panel derecho: la consulta completa ── */}
        <section
          aria-label={copy.respuesta}
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
              title={copy.errorDetalle}
              description={copy.errorDetalleDetalle}
              onRetry={() => setIntentoDetalle((n) => n + 1)}
            />
          ) : detalle ? (
            <DetalleConsulta consulta={detalle} onVolver={() => setVistaMovil('lista')} />
          ) : (
            <EmptyState icon={MessagesSquare} title={copy.sinSeleccionTitulo} description={copy.sinSeleccion} />
          )}
        </section>
      </div>
    </PageEnter>
  );
}
