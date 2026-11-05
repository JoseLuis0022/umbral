import { forwardRef, memo, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, MoreHorizontal, RefreshCw, Trash2, type LucideIcon } from 'lucide-react';
import type { Documento } from '../../../types';
import { cn } from '../../../lib/cn';
import { dur, spring, springSnappy } from '../../../lib/motion';
import { tamanoLegible } from '../../../lib/fechas';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { Skeleton } from '../../ui';
import { admin as copy } from '../../../copy';
import { ESTADO_DOC } from './estados';

const textos = {
  acciones: (nombre: string) => `Acciones de ${nombre}`,
  abrir: (nombre: string) => `Abrir ${nombre}`,
};

/**
 * Fila de documento.
 *
 * Va envuelta en `memo` y sus manejadores reciben el documento por argumento
 * en vez de venir cerrados sobre él. Las dos cosas van juntas y son la razón de
 * que la lista se mantenga fluida MIENTRAS INDEXA: el progreso simulado emite
 * unas cuarenta actualizaciones por documento, y sin esto las veintisiete filas
 * se volvían a renderizar —y a medir, porque cada una lleva `layout`— en cada
 * una de esas actualizaciones.
 */
type PropsFila = {
  documento: Documento;
  activo: boolean;
  onSeleccionar: (doc: Documento) => void;
  onReindexar: (doc: Documento) => void;
  onDescargar: (doc: Documento) => void;
  onEliminar: (doc: Documento) => void;
};

/*
 * `forwardRef` es obligatorio: la fila es hija directa de
 * `<AnimatePresence mode="popLayout">`, que necesita el nodo real para sacarla
 * del flujo al salir. Sin él React avisa "Function components cannot be given
 * refs" y la salida no se anima.
 */
const FilaDocumentoBase = forwardRef<HTMLLIElement, PropsFila>(function FilaDocumentoBase(
  { documento, activo, onSeleccionar, onReindexar, onDescargar, onEliminar },
  ref
) {
  const estado = ESTADO_DOC[documento.estado];
  const IconoEstado = estado.icono;
  const reducido = useReducedMotion();

  return (
    <motion.li
      ref={ref}
      // `layout="position"`: solo interesa que la fila se DESLICE a su nuevo
      // sitio cuando otra desaparece. Medir además su tamaño es trabajo que no
      // se usa, multiplicado por cada fila de la lista.
      layout="position"
      initial={{ opacity: 0, y: reducido ? 0 : -6 }}
      animate={{ opacity: 1, y: 0 }}
      // La salida NO anima `height`: forzaría un layout de la lista entera en
      // cada frame y pelearía con el `layout` de este mismo elemento. El hueco
      // lo cierra `mode="popLayout"` del padre. `marginBottom` tampoco pintaba
      // nada: la separación la da el `gap` del <ul>.
      exit={{ opacity: 0, scale: 0.98 }}
      transition={spring}
      className={cn(
        // Mismo lenguaje que la tarjeta de corpus seleccionada: borde de acento
        // + relleno tenue. Dos formas distintas de marcar "esto es lo activo"
        // en la misma pantalla obligarían a aprender dos códigos.
        'group relative rounded-celda border px-2.5 py-2 transition-colors duration-150',
        activo ? 'border-accent bg-accent-soft' : 'border-transparent hover:bg-bg'
      )}
    >
      {activo && (
        <motion.span
          layoutId="riel-documento"
          transition={springSnappy}
          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent"
        />
      )}

      <button type="button" onClick={() => onSeleccionar(documento)} className="absolute inset-0 rounded-celda">
        <span className="sr-only">{textos.abrir(documento.nombre)}</span>
      </button>

      <div className="pointer-events-none flex items-start gap-2.5">
        {/* La extensión escrita, no un icono de documento genérico: en una
            lista de .md y .pdf mezclados el icono no distingue nada. */}
        <span
          className={cn(
            'mt-0.5 flex h-7 w-8 shrink-0 items-center justify-center rounded-celda font-ui text-12 font-semibold uppercase',
            activo ? 'bg-surface-1 text-text-2' : 'bg-bg text-text-3'
          )}
        >
          {documento.tipo}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-ui text-13 font-medium text-text-1" title={documento.nombre}>
            {documento.nombre}
          </p>

          <div className="mt-1 flex items-center justify-between gap-2">
            <span className={cn('inline-flex items-center gap-1 font-ui text-12 font-medium', estado.texto)}>
              <IconoEstado
                size={12}
                strokeWidth={2.25}
                className={cn('shrink-0', documento.estado === 'procesando' && 'animate-spin')}
              />
              {estado.etiqueta}
            </span>
            <span className="shrink-0 font-ui text-12 tabular-nums text-text-3">
              {tamanoLegible(documento.tamanoBytes)}
            </span>
          </div>

          {/* La barra escala en horizontal, NO anima `width`. Animar el ancho
              recalcula el layout en cada frame y en el hilo principal; `scaleX`
              lo resuelve el compositor. Con varios documentos indexando a la
              vez, es la diferencia entre una barra fluida y una a tirones. */}
          {documento.estado === 'procesando' && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-status-blue-soft">
              <motion.div
                className="h-full w-full origin-left rounded-full bg-status-blue"
                initial={false}
                animate={{ scaleX: (documento.progreso ?? 0) / 100 }}
                transition={spring}
              />
            </div>
          )}

          {documento.estado === 'error' && documento.mensajeError && (
            <p className="mt-1.5 font-ui text-12 leading-snug text-status-red">{documento.mensajeError}</p>
          )}
        </div>

        <MenuDocumento
          nombre={documento.nombre}
          onReindexar={() => onReindexar(documento)}
          onDescargar={() => onDescargar(documento)}
          onEliminar={() => onEliminar(documento)}
        />
      </div>
    </motion.li>
  );
});

/**
 * El comparador es explícito y no la comparación superficial por defecto: el
 * objeto `documento` se sustituye entero en cada avance de indexación, así que
 * una comparación por referencia daría siempre "cambió" y `memo` no serviría de
 * nada. Se comparan los campos que de verdad pinta la fila.
 */
export const FilaDocumento = memo(FilaDocumentoBase, (previo, siguiente) => {
  const a = previo.documento;
  const b = siguiente.documento;
  return (
    previo.activo === siguiente.activo &&
    a.id === b.id &&
    a.nombre === b.nombre &&
    a.estado === b.estado &&
    a.progreso === b.progreso &&
    a.tamanoBytes === b.tamanoBytes &&
    a.mensajeError === b.mensajeError &&
    previo.onSeleccionar === siguiente.onSeleccionar &&
    previo.onReindexar === siguiente.onReindexar &&
    previo.onDescargar === siguiente.onDescargar &&
    previo.onEliminar === siguiente.onEliminar
  );
});

function MenuDocumento({
  nombre,
  onReindexar,
  onDescargar,
  onEliminar,
}: {
  nombre: string;
  onReindexar: () => void;
  onDescargar: () => void;
  onEliminar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function alPresionar(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    function alEscapar(e: KeyboardEvent) {
      if (e.key === 'Escape') setAbierto(false);
    }
    document.addEventListener('mousedown', alPresionar);
    document.addEventListener('keydown', alEscapar);
    return () => {
      document.removeEventListener('mousedown', alPresionar);
      document.removeEventListener('keydown', alEscapar);
    };
  }, [abierto]);

  function ejecutar(accion: () => void) {
    setAbierto(false);
    accion();
  }

  return (
    <div className="pointer-events-auto relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={textos.acciones(nombre)}
        className={cn(
          // Siempre visible, no solo en hover: en táctil no hay hover y un menú
          // que solo existe con el cursor encima es un menú que no existe.
          // 44px en móvil, 32 en escritorio, donde el puntero es preciso.
          'flex h-11 w-11 items-center justify-center rounded-control text-text-3 transition-colors duration-150',
          'hover:bg-surface-1 hover:text-accent-fg md:h-8 md:w-8',
          abierto && 'bg-surface-1 text-accent-fg'
        )}
      >
        <MoreHorizontal size={16} />
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98, transition: { duration: dur.fast } }}
            transition={springSnappy}
            className="absolute right-0 top-full z-50 mt-1 w-52 rounded-tarjeta border border-hairline bg-surface-3 p-1.5 shadow-3"
          >
            <Opcion icono={RefreshCw} onClick={() => ejecutar(onReindexar)}>
              {copy.reindexar}
            </Opcion>
            <Opcion icono={Download} onClick={() => ejecutar(onDescargar)}>
              {copy.descargar}
            </Opcion>
            <div className="my-1 border-t border-hairline" />
            <Opcion icono={Trash2} peligro onClick={() => ejecutar(onEliminar)}>
              {copy.eliminarDoc}
            </Opcion>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Opcion({
  icono: Icono,
  onClick,
  peligro,
  children,
}: {
  icono: LucideIcon;
  onClick: () => void;
  peligro?: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left font-ui text-13 transition-colors duration-150',
        peligro ? 'text-status-red hover:bg-status-red-soft' : 'text-text-1 hover:bg-accent-soft'
      )}
    >
      <Icono size={15} className={cn('shrink-0', peligro ? 'text-status-red' : 'text-text-2')} />
      {children}
    </button>
  );
}

/** Misma altura que una fila real, para que la lista no brinque al cargar. */
export function FilaDocumentoEsqueleto() {
  return (
    <li className="flex items-start gap-2.5 px-2.5 py-2">
      <Skeleton className="mt-0.5 h-7 w-8 shrink-0" />
      <div className="min-w-0 flex-1">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="mt-2 h-3 w-1/3" />
      </div>
    </li>
  );
}
