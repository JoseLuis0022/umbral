import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileText, FileX2, RefreshCw } from 'lucide-react';
import type { Documento } from '../../../types';
import { cn } from '../../../lib/cn';
import { dur, ease, spring } from '../../../lib/motion';
import { tamanoLegible } from '../../../lib/fechas';
import { Markdown } from '../../Markdown';
import { Banner, Button, EmptyState, ErrorState, Skeleton } from '../../ui';
import { admin as copy } from '../../../copy';
import { ESTADO_DOC } from './estados';

// Cadenas que no existen todavía en src/copy (ver reporte).
const textos = {
  vacioTitulo: 'Ningún documento abierto',
  errorTitulo: 'No pudimos abrir este documento',
  errorDetalle: 'El archivo sigue en la base. Vuelve a intentarlo en un momento.',
  sinPdfTitulo: 'Este PDF no se puede leer aquí',
  sinPdfDetalle: 'La maqueta no guarda el archivo original. Descárgalo para abrirlo en tu lector.',
  indexando: (n: number) => `Indexando este documento… ${n} %`,
  enCola: 'En cola. La indexación empieza en unos segundos.',
  contenido: 'Contenido del documento',
};

/**
 * Mitad derecha de la pantalla: el documento se LEE aquí.
 *
 * El visor no espera a que la indexación termine para mostrar el markdown. Un
 * archivo recién soltado ya tiene su texto (se leyó al subirlo), así que se
 * muestra con un aviso de que sigue procesándose: es el estado parcial de esta
 * pantalla, y es más honesto que dejar el panel en blanco seis segundos.
 */
export function VisorDocumento({
  documento,
  cargando,
  error,
  onReintentar,
  onDescargar,
  onReindexar,
  className,
}: {
  documento: Documento | null;
  cargando: boolean;
  error: boolean;
  onReintentar: () => void;
  onDescargar: (documento: Documento) => void;
  onReindexar: (documento: Documento) => void;
  className?: string;
}) {
  const estado = documento ? ESTADO_DOC[documento.estado] : null;
  const IconoEstado = estado?.icono;

  return (
    <section
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
        className
      )}
      aria-label={textos.contenido}
    >
      {/* La cabecera existe siempre, con o sin documento: si apareciera al
          elegir el primer archivo, el visor entero saltaría hacia abajo. */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-5 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {cargando ? (
            <Skeleton className="h-4 w-56" />
          ) : documento ? (
            <>
              <span className="flex h-7 w-8 shrink-0 items-center justify-center rounded-celda bg-bg font-ui text-12 font-semibold uppercase text-text-2">
                {documento.tipo}
              </span>
              <div className="min-w-0">
                <p className="truncate font-ui text-14 font-medium text-text-1" title={documento.nombre}>
                  {documento.nombre}
                </p>
                <p className="mt-0.5 flex items-center gap-2 font-ui text-12 text-text-3">
                  <span className="tabular-nums">{tamanoLegible(documento.tamanoBytes)}</span>
                  {estado && IconoEstado && (
                    <span className={cn('inline-flex items-center gap-1 font-medium', estado.texto)}>
                      <IconoEstado
                        size={11}
                        strokeWidth={2.25}
                        className={cn(documento.estado === 'procesando' && 'animate-spin')}
                      />
                      {estado.etiqueta}
                    </span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <p className="font-ui text-14 text-text-3">{textos.vacioTitulo}</p>
          )}
        </div>

        {documento && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onReindexar(documento)}>
              <RefreshCw size={14} />
              {copy.reindexar}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onDescargar(documento)}>
              <Download size={14} />
              {copy.descargar}
            </Button>
          </div>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {error ? (
          <ErrorState title={textos.errorTitulo} description={textos.errorDetalle} onRetry={onReintentar} />
        ) : cargando ? (
          <VisorEsqueleto />
        ) : !documento ? (
          <EmptyState icon={FileText} title={textos.vacioTitulo} description={copy.visorVacio} />
        ) : (
          <div className="px-6 py-5">
            <AnimatePresence initial={false} mode="popLayout">
              {documento.estado === 'error' && documento.mensajeError && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: dur.fast, ease }}
                  className="mb-5"
                >
                  {/* Rojo terroso de estatus, nunca el color de marca: el
                      peligro y la acción primaria no comparten color. */}
                  <Banner
                    tone="red"
                    action={
                      <Button variant="secondary" size="sm" onClick={() => onReindexar(documento)}>
                        {copy.reindexar}
                      </Button>
                    }
                  >
                    {documento.mensajeError}
                  </Banner>
                </motion.div>
              )}

              {(documento.estado === 'procesando' || documento.estado === 'en_cola') && (
                <motion.div
                  key="progreso"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: dur.fast, ease }}
                  className="mb-5"
                >
                  <Banner tone="blue">
                    {documento.estado === 'en_cola'
                      ? textos.enCola
                      : textos.indexando(Math.round(documento.progreso ?? 0))}
                  </Banner>
                  {documento.estado === 'procesando' && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-status-blue-soft">
                      <motion.div
                        className="h-full w-full origin-left rounded-full bg-status-blue"
                        initial={false}
                        animate={{ scaleX: (documento.progreso ?? 0) / 100 }}
                        transition={spring}
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {documento.contenido ? (
              // `key` por documento: sin él React reutiliza los nodos del
              // markdown anterior y el scroll se queda a media página del
              // archivo que ya no está en pantalla.
              <Markdown key={documento.id} className="max-w-[72ch]">
                {documento.contenido}
              </Markdown>
            ) : (
              <EmptyState
                icon={FileX2}
                title={textos.sinPdfTitulo}
                description={textos.sinPdfDetalle}
                action={
                  <Button variant="secondary" size="sm" onClick={() => onDescargar(documento)}>
                    <Download size={14} />
                    {copy.descargar}
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}

/** Bloques con la métrica real de un documento leído: título, párrafos y un
 *  subtítulo. Un esqueleto de otra altura brinca al llegar el markdown. */
function VisorEsqueleto() {
  return (
    <div aria-hidden className="max-w-[72ch] px-6 py-5">
      <Skeleton className="h-7 w-3/5" />
      <div className="mt-5 flex flex-col gap-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <Skeleton className="mt-7 h-5 w-2/5" />
      <div className="mt-4 flex flex-col gap-2.5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}
