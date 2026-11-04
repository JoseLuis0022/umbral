import { useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { FolderOpen } from 'lucide-react';
import type { Documento, EstadoDocumento } from '../../../types';
import { cn } from '../../../lib/cn';
import { EmptyState, ErrorState } from '../../ui';
import { admin as copy } from '../../../copy';
import { ESTADO_DOC, ORDEN_ESTADOS } from './estados';
import { FilaDocumento, FilaDocumentoEsqueleto } from './FilaDocumento';
import { BotonSubir, CapaSoltar, ZonaSoltar, useColapsoZona, useSoltarArchivos } from './ZonaSoltar';

const textos = {
  titulo: 'Archivos',
  vacioTitulo: 'Esta base todavía no tiene documentos',
  vacioDetalle: 'Suelta archivos en el recuadro de arriba, o usa Subir. Se indexan solos.',
  errorTitulo: 'No pudimos cargar los documentos',
  errorDetalle: 'La base sigue ahí. Vuelve a intentarlo en un momento.',
};

/**
 * Columna izquierda: subir y administrar. Es angosta a propósito — es el
 * índice, no el contenido. Lo que se lee vive a la derecha.
 *
 * EL ALTO SE PAGA SOLO MIENTRAS SIRVE
 * -----------------------------------
 * La zona de soltar es un rectángulo amplio y visible —icono, "arrastra
 * archivos aquí" y los formatos aceptados— porque llegar a una base vacía y no
 * ver dónde soltar es el momento en que la pantalla se usa por primera vez.
 * Pero en cuanto la persona empieza a recorrer la lista, ese rectángulo ya
 * cumplió: va DENTRO del scroll de la lista, así que el propio scroll lo empuja
 * hacia arriba hasta dejarlo en una barra de 44 px clavada en el techo, y
 * volver arriba lo despliega otra vez. Ver `useColapsoZona`.
 *
 * Además, todo el panel sigue siendo diana de arrastre y la capa de "suelta
 * aquí" se dibuja sobre el panel entero mientras hay algo colgando del cursor;
 * y el botón "Subir" de la cabecera está siempre a un clic, sin importar dónde
 * esté el scroll.
 */
export function PanelArchivos({
  documentos,
  cargando,
  error,
  documentoActivoId,
  onReintentar,
  onArchivos,
  onSeleccionar,
  onReindexar,
  onDescargar,
  onEliminar,
  className,
}: {
  documentos: Documento[];
  cargando: boolean;
  error: boolean;
  documentoActivoId: string | null;
  onReintentar: () => void;
  onArchivos: (archivos: File[]) => void;
  onSeleccionar: (documento: Documento) => void;
  onReindexar: (documento: Documento) => void;
  onDescargar: (documento: Documento) => void;
  onEliminar: (documento: Documento) => void;
  className?: string;
}) {
  const { encima, propsSoltar } = useSoltarArchivos(onArchivos);

  // La ref del contenedor de scroll se declara AQUÍ y el hook se llama AQUÍ:
  // desde un hijo, `useScroll` se suscribiría antes de que React conecte la
  // ref y acabaría escuchando el scroll de la ventana.
  const lista = useRef<HTMLDivElement>(null);
  const colapso = useColapsoZona(lista);

  // Resumen por estado. Es lo que convierte una lista larga en información:
  // "27 documentos" no dice nada; "1 con error" sí.
  const conteos = useMemo(() => {
    const mapa = {} as Record<EstadoDocumento, number>;
    for (const doc of documentos) mapa[doc.estado] = (mapa[doc.estado] ?? 0) + 1;
    return ORDEN_ESTADOS.filter((e) => mapa[e] > 0).map((e) => ({ estado: e, total: mapa[e] }));
  }, [documentos]);

  return (
    <section
      {...propsSoltar}
      className={cn(
        'relative flex min-h-0 flex-col overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
        className
      )}
      aria-label={textos.titulo}
    >
      {/* Cabecera de una sola fila: título, conteo y la acción de subir. Tres
          renglones apilados aquí arriba son tres filas menos de lista.

          `lg:pr-12` reserva la esquina para el botón de plegar el panel, que
          flota sobre ella (ver `PanelPlegable`). Por debajo de `lg` ese botón
          no existe y la cabecera recupera su relleno normal. */}
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 lg:pr-12">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="font-ui text-15 font-semibold text-text-1">{textos.titulo}</h2>
          <span className="truncate font-ui text-12 tabular-nums text-text-3">
            {cargando ? '—' : copy.documentos(documentos.length)}
          </span>
        </div>
        <BotonSubir onArchivos={onArchivos} />
      </header>

      {conteos.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 px-4 pb-2">
          {conteos.map(({ estado, total }) => (
            <span key={estado} className="inline-flex items-center gap-1.5 font-ui text-12 text-text-2">
              <span className={cn('h-2 w-2 shrink-0 rounded-full', ESTADO_DOC[estado].punto)} />
              <span className="tabular-nums">{total}</span>
              <span className="lowercase">{ESTADO_DOC[estado].etiqueta}</span>
            </span>
          ))}
        </div>
      )}

      <div ref={lista} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
        <ZonaSoltar colapso={colapso} onArchivos={onArchivos} />

        {error ? (
          <ErrorState title={textos.errorTitulo} description={textos.errorDetalle} onRetry={onReintentar} />
        ) : cargando ? (
          // Ocho filas: lo que cabe sin scroll en la altura del panel. El
          // esqueleto mide lo mismo que la fila real, así que nada brinca.
          <ul aria-hidden className="flex flex-col gap-0.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <FilaDocumentoEsqueleto key={i} />
            ))}
          </ul>
        ) : documentos.length === 0 ? (
          <EmptyState icon={FolderOpen} title={textos.vacioTitulo} description={textos.vacioDetalle} />
        ) : (
          <ul className="flex flex-col gap-0.5">
            <AnimatePresence initial={false} mode="popLayout">
              {documentos.map((doc) => (
                <FilaDocumento
                  key={doc.id}
                  documento={doc}
                  activo={doc.id === documentoActivoId}
                  onSeleccionar={onSeleccionar}
                  onReindexar={onReindexar}
                  onDescargar={onDescargar}
                  onEliminar={onEliminar}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <CapaSoltar visible={encima} />
    </section>
  );
}
