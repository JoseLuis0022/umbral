import { useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Users, X } from 'lucide-react';
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
import { admin as copy } from '../../../copy';
import type { FiltrosAuditoria } from '../../../services/admin.service';
import type { Usuario } from '../../../types';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  buscarPlaceholder: 'Buscar por nombre, título o contenido…',
  quitarBusqueda: 'Borrar la búsqueda',
  personasAbrir: 'Filtrar por persona',
  sinArea: 'Sin área registrada',
  todasLasPersonas: 'Ver las conversaciones de toda la comunidad',
};

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

/**
 * Cabecera del panel de auditoría: búsqueda libre y los dos filtros con icono.
 *
 * Los dos filtros son controles PROPIOS del sistema de diseño, no controles del
 * navegador. El `<select>` nativo dibujaba el menú gris del sistema operativo y
 * solo admitía una línea por opción, así que el filtro por persona enseñaba el
 * nombre a secas: con seis personas del directorio, lo que de verdad las
 * distingue —el área— no cabía. Ahora cada opción lleva iniciales, nombre y
 * área, que es exactamente la pregunta que se hace quien audita.
 *
 * El de fechas eran dos `<input type="date">` que abrían el calendario del
 * sistema; ahora es un calendario de rango propio (ver `SelectorRangoFechas`).
 */
export function BarraFiltros({
  filtros,
  personas,
  texto,
  onTexto,
  onCambiar,
}: {
  filtros: FiltrosAuditoria;
  personas: Usuario[];
  /** Valor inmediato del campo (sin esperar al debounce del filtro). */
  texto: string;
  onTexto: (valor: string) => void;
  onCambiar: (parcial: Partial<FiltrosAuditoria>) => void;
}) {
  // `dato: null` es la opción "todas": la ausencia de filtro no es una persona
  // del directorio, así que no se puede fingir con un `Usuario` vacío.
  const opcionesPersona = useMemo<OpcionLista<Usuario | null>[]>(
    () => [
      { valor: '', texto: copy.todasPersonas, dato: null },
      ...personas.map((p) => ({ valor: p.id, texto: `${p.nombre} ${p.area}`, dato: p })),
    ],
    [personas]
  );

  const cambiarPersona = useCallback(
    (valor: string) => onCambiar({ usuarioId: valor || null }),
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
      {/* Reserva para el botón de plegar el panel, que flota sobre esta
          esquina (ver `PanelPlegable`). Solo en escritorio: por debajo de
          `lg` ese botón no existe y el campo se lleva todo el ancho. */}
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
            aria-label={copy.buscar}
            placeholder={TEXTO.buscarPlaceholder}
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
                aria-label={TEXTO.quitarBusqueda}
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
          etiqueta={copy.filtrarPersona}
          tituloHoja={TEXTO.personasAbrir}
          className={cn(
            'min-w-0 flex-1',
            filtros.usuarioId && 'border-accent/40 bg-accent-soft text-accent-fg'
          )}
          renderDisparador={(opcion) => (
            <>
              <Users size={16} strokeWidth={2} aria-hidden className="shrink-0 text-text-3" />
              <span className="truncate">{opcion.dato ? opcion.dato.nombre : copy.todasPersonas}</span>
            </>
          )}
          renderOpcion={(opcion) =>
            opcion.dato ? (
              <div className="flex items-center gap-2.5">
                {/* Iniciales, el mismo distintivo que usa la lista de
                    conversaciones: reconocer a la persona antes de leer. */}
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg font-ui text-12 font-semibold uppercase text-text-2"
                >
                  {opcion.dato.iniciales}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-ui text-14 font-medium text-text-1">
                    {opcion.dato.nombre}
                  </span>
                  {/* El ÁREA es lo que distingue a dos personas de nombre
                      parecido, y es justo lo que no cabía en el `<select>`. */}
                  <span className="truncate font-ui text-12 text-text-2">
                    {opcion.dato.area || TEXTO.sinArea}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg text-text-3"
                >
                  <Users size={15} strokeWidth={2} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-ui text-14 font-medium text-text-1">
                    {copy.todasPersonas}
                  </span>
                  <span className="truncate font-ui text-12 text-text-2">
                    {TEXTO.todasLasPersonas}
                  </span>
                </span>
              </div>
            )
          }
        />

        <SelectorRangoFechas
          rango={rango}
          onCambiar={cambiarRango}
          etiqueta={copy.filtrarFecha}
          textos={TEXTO_FECHAS}
        />
      </div>
    </div>
  );
}
