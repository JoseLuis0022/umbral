import { useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CircleDot, Search, Users, X } from 'lucide-react';
import {
  Input,
  SelectorLista,
  SelectorRangoFechas,
  type OpcionLista,
  type RangoFechas,
  type TextosRangoFechas,
} from '../../ui';
import { cn } from '../../../lib/cn';
import { springSnappy } from '../../../lib/motion';
import { admin as copyAdmin, auditoria as copy } from '../../../copy';
import {
  inicialesDe,
  nombreDe,
  type EstadoConsulta,
  type FiltrosAuditoria,
  type ResumenUsuario,
} from '../../../services/auditoria.service';

/** Copy del calendario. Vive aquí, con el resto del copy de la pantalla. */
const TEXTO_FECHAS: TextosRangoFechas = {
  todasFechas: 'Todas las fechas',
  desde: 'Desde',
  hasta: 'Hasta',
  elegirDesde: 'Elegir el primer día del rango',
  elegirHasta: 'Elegir el último día del rango',
  hoy: 'Hoy',
  ultimos7: 'Últimos 7 días',
  esteMes: 'Este mes',
  borrar: 'Borrar',
  mesAnterior: 'Mes anterior',
  mesSiguiente: 'Mes siguiente',
  tituloHoja: 'Filtrar por fecha',
  ayuda: 'Deja un extremo sin elegir para no acotar ese lado.',
  sinElegir: 'Sin elegir',
};

const ESTADOS: (EstadoConsulta | '')[] = ['', 'completa', 'cancelada', 'error'];

/**
 * Cabecera del panel de auditoría: búsqueda en pregunta y respuesta, persona,
 * estado y rango de fechas. Todos los filtros los resuelve el backend.
 *
 * La lista de personas sale del RESUMEN (quién ha preguntado en el último año),
 * no de un directorio: lo que interesa al auditar es quién usó el agente, y
 * una cuenta sin consultas solo haría ruido en el menú.
 */
export function BarraFiltros({
  filtros,
  personas,
  texto,
  onTexto,
  onCambiar,
}: {
  filtros: FiltrosAuditoria;
  personas: ResumenUsuario[];
  /** Valor inmediato del campo (sin esperar al debounce del filtro). */
  texto: string;
  onTexto: (valor: string) => void;
  onCambiar: (parcial: Partial<FiltrosAuditoria>) => void;
}) {
  const opcionesPersona = useMemo<OpcionLista<ResumenUsuario | null>[]>(
    () => [
      { valor: '', texto: copy.todasPersonas, dato: null },
      ...personas.map((p) => ({
        valor: p.usuario.id,
        texto: `${nombreDe(p.usuario)} ${p.usuario.correo ?? ''}`,
        dato: p,
      })),
    ],
    [personas]
  );

  const opcionesEstado = useMemo<OpcionLista<EstadoConsulta | null>[]>(
    () =>
      ESTADOS.map((e) => ({
        valor: e,
        texto: e ? copy.estados[e] : copy.todosEstados,
        dato: e || null,
      })),
    []
  );

  const cambiarPersona = useCallback((valor: string) => onCambiar({ usuarioId: valor || null }), [onCambiar]);
  const cambiarEstado = useCallback(
    (valor: string) => onCambiar({ estado: (valor || null) as EstadoConsulta | null }),
    [onCambiar]
  );
  const cambiarRango = useCallback(
    (rango: RangoFechas) => onCambiar({ desde: rango.desde, hasta: rango.hasta }),
    [onCambiar]
  );
  const rango = useMemo<RangoFechas>(
    () => ({ desde: filtros.desde, hasta: filtros.hasta }),
    [filtros.desde, filtros.hasta]
  );

  return (
    <div className="flex flex-col gap-2 border-b border-hairline px-3 py-3">
      {/* Reserva para el botón de plegar el panel (ver `PanelPlegable`). */}
      <div className="lg:pr-12">
        <div className="relative">
          <Search
            size={16}
            strokeWidth={2}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-text-3"
          />
          <Input
            type="search"
            value={texto}
            onChange={(e) => onTexto(e.target.value)}
            aria-label={copyAdmin.buscar}
            placeholder={copy.buscarPlaceholder}
            className="pl-9 pr-9 text-14"
          />
          <AnimatePresence>
            {texto && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={springSnappy}
                onClick={() => onTexto('')}
                aria-label={copy.quitarBusqueda}
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-control text-text-3 transition-colors hover:bg-accent-soft hover:text-accent-fg"
              >
                <X size={14} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex items-stretch gap-2">
        <SelectorLista
          opciones={opcionesPersona}
          valor={filtros.usuarioId ?? ''}
          onCambiar={cambiarPersona}
          etiqueta={copyAdmin.filtrarPersona}
          tituloHoja={copy.personasTitulo}
          className={cn('min-w-0 flex-1', filtros.usuarioId && 'border-accent/40 bg-accent-soft text-accent-fg')}
          renderDisparador={(opcion) => (
            <>
              <Users size={16} strokeWidth={2} aria-hidden className="shrink-0 text-text-3" />
              <span className="truncate">{opcion.dato ? nombreDe(opcion.dato.usuario) : copy.todasPersonas}</span>
            </>
          )}
          renderOpcion={(opcion) => (
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg font-ui text-12 font-semibold uppercase text-text-2"
              >
                {opcion.dato ? inicialesDe(opcion.dato.usuario) : <Users size={15} strokeWidth={2} />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-ui text-14 font-medium text-text-1">
                  {opcion.dato ? nombreDe(opcion.dato.usuario) : copy.todasPersonas}
                </span>
                <span className="truncate font-ui text-12 text-text-2">
                  {opcion.dato
                    ? `${opcion.dato.usuario.correo ?? copy.cuentaEliminada} · ${copy.consultasDe(opcion.dato.consultas)}`
                    : copy.todasPersonasDetalle}
                </span>
              </span>
            </div>
          )}
        />
        <SelectorRangoFechas rango={rango} onCambiar={cambiarRango} etiqueta={copyAdmin.filtrarFecha} textos={TEXTO_FECHAS} />
      </div>

      <SelectorLista
        opciones={opcionesEstado}
        valor={filtros.estado ?? ''}
        onCambiar={cambiarEstado}
        etiqueta={copy.estadoTitulo}
        tituloHoja={copy.estadoTitulo}
        className={cn('w-full', filtros.estado && 'border-accent/40 bg-accent-soft text-accent-fg')}
        renderDisparador={(opcion) => (
          <>
            <CircleDot size={16} strokeWidth={2} aria-hidden className="shrink-0 text-text-3" />
            <span className="truncate">{opcion.texto}</span>
          </>
        )}
        renderOpcion={(opcion) => <span className="font-ui text-14 text-text-1">{opcion.texto}</span>}
      />
    </div>
  );
}
