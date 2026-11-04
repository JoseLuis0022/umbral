import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Newspaper, Plus, Search, SearchX, Star, X } from 'lucide-react';
import type { CategoriaGuia, Guia } from '../../../types';
import { cn } from '../../../lib/cn';
import { springSnappy, dur, ease } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { Button, EmptyState, ErrorState, Input, SelectorLista, type OpcionLista } from '../../ui';
import { CATEGORIAS, CLASES_CATEGORIA, ICONO_CATEGORIA, MarcaCategoria } from '../../guias';
import { alDia as copyAlDia } from '../../../copy';
import { EsqueletoLista } from './EsqueletosBoletines';

/** "Todas" no es una categoría del modelo: es la ausencia de filtro. */
export type FiltroCategoriaBoletin = CategoriaGuia | 'Todas';

/**
 * Procedencia de un boletín, para el distintivo de la fila.
 * `nuevo` = creado desde administración. `editado` = viene de la semilla y
 * tiene cambios locales encima. Sin marca = tal como se publicó.
 */
export type MarcaBoletin = 'nuevo' | 'editado';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  panel: 'Boletines',
  nuevo: 'Nuevo boletín',
  buscar: 'Buscar boletines',
  buscarPlaceholder: 'Buscar por título o resumen…',
  quitarBusqueda: 'Borrar la búsqueda',
  filtrarCategoria: 'Filtrar por categoría',
  todasCategorias: 'Todas las categorías',
  todasCategoriasDetalle: 'Sin acotar: el catálogo completo',
  categoriasAbrir: 'Elegir categoría',
  conteo: (n: number) => `${n} ${n === 1 ? 'boletín' : 'boletines'}`,
  actualizando: 'Actualizando…',
  sinGuardar: 'Sin publicar',
  marcas: { nuevo: 'Nuevo', editado: 'Editado' } as Record<MarcaBoletin, string>,
  estrellas: (n: number) => `${n} ${n === 1 ? 'persona lo marcó útil' : 'personas lo marcaron útil'}`,
  vacioTitulo: 'Todavía no hay boletines',
  vacioDetalle:
    'Un boletín es una guía corta de "Al día": pasos, requisitos y una pregunta con la que abrir el asistente. Escribe el primero.',
  vacioAccion: 'Crear el primer boletín',
  sinResultados: 'Ningún boletín coincide',
  sinResultadosDetalle: 'Prueba con otras palabras o quita el filtro de categoría.',
  limpiar: 'Quitar los filtros',
  errorTitulo: 'No pudimos cargar los boletines',
  errorDetalle: 'Lo que está publicado sigue ahí. Revisa tu conexión e intenta de nuevo.',
};

/**
 * Panel izquierdo: el índice de boletines.
 *
 * Es angosto a propósito. Aquí se ELIGE qué redactar; redactarlo —que es la
 * tarea real— ocurre a la derecha y por eso se lleva el ancho.
 *
 * Las filas se separan con hairlines dentro de una sola superficie, no como
 * tarjetas sueltas: dieciocho tarjetas idénticas con la misma sombra se leen
 * como plantilla y dificultan comparar una fila con otra.
 */
export function ListaBoletines({
  guias,
  marcas,
  idSinPublicar,
  cargando,
  actualizando,
  error,
  seleccionId,
  texto,
  onTexto,
  categoria,
  onCategoria,
  hayFiltros,
  onLimpiarFiltros,
  onSeleccionar,
  onNuevo,
  onReintentar,
  className,
}: {
  /** Ya filtrados: el panel pinta, no decide. */
  guias: Guia[];
  marcas: Record<string, MarcaBoletin>;
  /** Boletín nuevo que todavía no se ha guardado, si lo hay. */
  idSinPublicar: string | null;
  cargando: boolean;
  actualizando: boolean;
  error: boolean;
  seleccionId: string | null;
  texto: string;
  onTexto: (valor: string) => void;
  categoria: FiltroCategoriaBoletin;
  onCategoria: (valor: FiltroCategoriaBoletin) => void;
  hayFiltros: boolean;
  onLimpiarFiltros: () => void;
  onSeleccionar: (id: string) => void;
  onNuevo: () => void;
  onReintentar: () => void;
  className?: string;
}) {
  const reducido = useReducedMotion();

  // `dato: null` es "Todas": la ausencia de filtro no es una categoría del
  // modelo, así que no se disfraza de una.
  const opcionesCategoria = useMemo<OpcionLista<CategoriaGuia | null>[]>(
    () => [
      { valor: 'Todas', texto: TEXTO.todasCategorias, dato: null },
      ...CATEGORIAS.map((c) => ({ valor: c, texto: c, dato: c })),
    ],
    []
  );

  return (
    <section
      aria-label={TEXTO.panel}
      className={cn(
        'min-h-0 flex-col rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
        className
      )}
    >
      {/*
        Sin rótulo "Boletines" dentro del panel: la barra de navegación ya dice
        en qué sección estamos, y repetirlo aquí gastaba un renglón de una
        columna que es angosta a propósito. El nombre accesible de la sección no
        se pierde — sigue en el `aria-label` de arriba —, así que un lector de
        pantalla anuncia el panel igual que antes.
      */}
      <div className="flex shrink-0 flex-col gap-2 border-b border-hairline px-3 pb-3 pt-3">
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
              aria-label={TEXTO.buscar}
              placeholder={TEXTO.buscarPlaceholder}
              className="pl-9 pr-9 text-14"
            />
            <AnimatePresence>
              {texto && (
                <motion.button
                  type="button"
                  initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  transition={reducido ? { duration: dur.fast, ease } : springSnappy}
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

        <div className="flex items-center gap-2">
          <SelectorLista
            opciones={opcionesCategoria}
            valor={categoria}
            onCambiar={(valor) => onCategoria(valor as FiltroCategoriaBoletin)}
            etiqueta={TEXTO.filtrarCategoria}
            tituloHoja={TEXTO.categoriasAbrir}
            className={cn(
              'min-w-0 flex-1',
              categoria !== 'Todas' && 'border-accent/40 bg-accent-soft text-accent-fg'
            )}
            renderDisparador={(opcion) => (
              <>
                <MarcaCategoria categoria={opcion.dato} />
                <span className="truncate">{opcion.texto}</span>
              </>
            )}
            renderOpcion={(opcion) => (
              <div className="flex items-center gap-2.5">
                <MarcaCategoria categoria={opcion.dato} tamano={28} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-ui text-14 font-medium text-text-1">
                    {opcion.texto}
                  </span>
                  {opcion.dato === null && (
                    <span className="truncate font-ui text-12 text-text-2">
                      {TEXTO.todasCategoriasDetalle}
                    </span>
                  )}
                </span>
              </div>
            )}
          />

          {/* Secundario, no primario: la acción principal de la pantalla es
              "Guardar cambios" en el editor. Dos rellenos rojos a la vez y
              ninguno de los dos sería la acción principal. */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onNuevo}
            disabled={cargando || error}
            className="h-10 shrink-0"
          >
            <Plus size={14} strokeWidth={2.5} />
            {TEXTO.nuevo}
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {cargando ? (
          <EsqueletoLista />
        ) : error ? (
          <ErrorState title={TEXTO.errorTitulo} description={TEXTO.errorDetalle} onRetry={onReintentar} />
        ) : guias.length === 0 ? (
          hayFiltros ? (
            <EmptyState
              icon={SearchX}
              title={TEXTO.sinResultados}
              description={TEXTO.sinResultadosDetalle}
              action={
                <Button variant="secondary" size="sm" onClick={onLimpiarFiltros}>
                  {TEXTO.limpiar}
                </Button>
              }
            />
          ) : (
            // Sin filtros activos, la lista visible ES el catálogo completo:
            // si está vacía, no hay ningún boletín todavía.
            <EmptyState
              icon={Newspaper}
              title={TEXTO.vacioTitulo}
              description={TEXTO.vacioDetalle}
              action={
                <Button variant="primary" size="sm" onClick={onNuevo}>
                  {TEXTO.vacioAccion}
                </Button>
              }
            />
          )
        ) : (
          <ul className="flex flex-col">
            {guias.map((guia) => (
              <FilaBoletin
                key={guia.id}
                guia={guia}
                marca={marcas[guia.id]}
                sinPublicar={guia.id === idSinPublicar}
                seleccionada={guia.id === seleccionId}
                onSeleccionar={onSeleccionar}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline px-4 py-2">
        <span className="font-ui text-12 tabular-nums text-text-3">
          {cargando ? ' ' : TEXTO.conteo(guias.length)}
        </span>
        <AnimatePresence>
          {actualizando && (
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
  );
}

function FilaBoletin({
  guia,
  marca,
  sinPublicar,
  seleccionada,
  onSeleccionar,
}: {
  guia: Guia;
  marca: MarcaBoletin | undefined;
  sinPublicar: boolean;
  seleccionada: boolean;
  onSeleccionar: (id: string) => void;
}) {
  const reducido = useReducedMotion();
  const Icono = ICONO_CATEGORIA[guia.categoria];

  return (
    <li className="relative border-b border-hairline last:border-b-0">
      {seleccionada && (
        // layoutId: la marca de selección se DESLIZA de una fila a otra en vez
        // de parpadear en dos sitios, y así el ojo sigue el salto.
        <motion.span
          layoutId="boletines-seleccion"
          // `springSnappy`, como todos los demás indicadores de selección
          // deslizantes del sistema (Tabs, SegmentedControl, auditoría). Era el
          // último que usaba otra física para el mismo gesto. Con la duración
          // igualada, además deja de desincronizarse del fondo de la fila, que
          // cambia con `transition-colors duration-150`.
          transition={reducido ? { duration: dur.fast, ease } : springSnappy}
          className="absolute inset-y-0 left-0 z-10 w-[3px] bg-accent"
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={() => onSeleccionar(guia.id)}
        aria-current={seleccionada ? 'true' : undefined}
        className={cn(
          'flex w-full flex-col items-start gap-2 px-4 py-3 text-left transition-colors duration-150',
          'focus-visible:relative focus-visible:z-20',
          seleccionada ? 'bg-accent-soft' : 'hover:bg-bg'
        )}
      >
        <span className="flex w-full items-start gap-2">
          <span className="line-clamp-2 min-w-0 flex-1 font-ui text-14 font-semibold text-text-1">
            {guia.titulo || TEXTO.sinGuardar}
          </span>
          {sinPublicar ? (
            <Distintivo tono="ambar">{TEXTO.sinGuardar}</Distintivo>
          ) : marca ? (
            <Distintivo tono={marca === 'nuevo' ? 'verde' : 'ambar'}>{TEXTO.marcas[marca]}</Distintivo>
          ) : null}
        </span>

        <span className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={cn(
              'inline-flex h-6 items-center gap-1.5 rounded-celda px-2 font-ui text-12 font-medium',
              CLASES_CATEGORIA[guia.categoria]
            )}
          >
            <Icono size={12} strokeWidth={2} aria-hidden />
            {guia.categoria}
          </span>
          <span className="font-ui text-12 tabular-nums text-text-3">{copyAlDia.minutos(guia.minutosLectura)}</span>
          <span
            className="inline-flex items-center gap-1 font-ui text-12 tabular-nums text-text-3"
            title={TEXTO.estrellas(guia.estrellas)}
          >
            <Star size={12} strokeWidth={2} aria-hidden />
            {guia.estrellas}
            <span className="sr-only">{TEXTO.estrellas(guia.estrellas)}</span>
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * Distintivo de procedencia. Es discreto a propósito: dice de dónde viene el
 * boletín, no compite con el título. Las clases van escritas completas porque
 * Tailwind escanea texto plano y una clase armada con plantilla no se genera.
 */
function Distintivo({ tono, children }: { tono: 'ambar' | 'verde'; children: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-celda px-1.5 font-ui text-12 font-medium',
        tono === 'ambar' ? 'bg-status-amber-soft text-status-amber' : 'bg-status-green-soft text-status-green'
      )}
    >
      <span
        aria-hidden
        className={cn('h-1.5 w-1.5 rounded-full', tono === 'ambar' ? 'bg-status-amber' : 'bg-status-green')}
      />
      {children}
    </span>
  );
}
