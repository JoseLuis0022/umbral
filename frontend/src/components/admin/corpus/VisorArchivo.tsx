import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, Download, FileQuestion, FileText } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { formatoFechaLarga, tamanoLegible } from '../../../lib/fechas';
import { Markdown } from '../../Markdown';
import { Banner, Button, EmptyState, ErrorState, Skeleton, useToast } from '../../ui';
import { corpus as copy } from '../../../copy';
import {
  descargarBlob,
  guardarEnDisco,
  leerTexto,
  type ArchivoCorpus,
  type OrigenArchivo,
} from '../../../services/corpus.service';

const VisorPdf = lazy(() => import('./VisorPdf'));

/**
 * Quita `<script>` y manejadores `on*` del apunte antes de dárselo al iframe.
 * El `sandbox=""` ya impide que corran (es la barrera de seguridad); esto solo
 * evita que el navegador llene la consola avisando que los bloqueó.
 */
function sinScripts(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script').forEach((s) => s.remove());
  doc.querySelectorAll('*').forEach((el) => {
    for (const { name } of Array.from(el.attributes)) {
      if (name.toLowerCase().startsWith('on')) el.removeAttribute(name);
    }
  });
  return '<!DOCTYPE html>' + doc.documentElement.outerHTML;
}

type Carga =
  | { estado: 'cargando' }
  | { estado: 'error' }
  | { estado: 'texto'; contenido: string }
  | { estado: 'pdf'; blob: Blob }
  | { estado: 'sinVista' };

/**
 * Mitad derecha de Corpus: el archivo se LEE aquí, cada tipo a su manera.
 *
 *  - md   → `Markdown`, el mismo renderizador del chat.
 *  - txt  → preformateado legible (las transcripciones son texto corrido).
 *  - html → `<iframe sandbox="">` con `srcdoc`: sandbox VACÍO, sin scripts ni
 *           mismo origen. El apunte puede traer JavaScript; aquí no corre.
 *  - pdf  → react-pdf sobre el Blob descargado con el token.
 */
export function VisorArchivo({
  archivo,
  onVolver,
  origen = 'corpus',
  subtitulo,
  accion,
  className,
}: {
  archivo: ArchivoCorpus | null;
  /** Botón "volver" de móvil (Corpus). Sin él, no se dibuja. */
  onVolver?: () => void;
  origen?: OrigenArchivo;
  /** Reemplaza la línea "tamaño · modificado" (el chat no conoce la fecha). */
  subtitulo?: string;
  /** Algo más en la cabecera, a la derecha de Descargar (el chat pone Cerrar). */
  accion?: ReactNode;
  className?: string;
}) {
  const { push } = useToast();
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (!archivo) return;
    if (archivo.tipo === 'otro') {
      setCarga({ estado: 'sinVista' });
      return;
    }
    const control = new AbortController();
    setCarga({ estado: 'cargando' });
    const promesa =
      archivo.tipo === 'pdf'
        ? descargarBlob(archivo.ruta, control.signal, origen).then((blob): Carga => ({ estado: 'pdf', blob }))
        : leerTexto(archivo.ruta, control.signal, origen).then((r): Carga => ({ estado: 'texto', contenido: r.contenido }));
    promesa
      .then((resultado) => {
        if (!control.signal.aborted) setCarga(resultado);
      })
      .catch(() => {
        if (!control.signal.aborted) setCarga({ estado: 'error' });
      });
    // Cambiar de archivo cancela la descarga anterior: un PDF de 8 MB que
    // llega tarde no debe pisar al archivo que ya se está leyendo.
    return () => control.abort();
  }, [archivo, intento, origen]);

  const descargar = useCallback(async () => {
    if (!archivo) return;
    setDescargando(true);
    try {
      await guardarEnDisco(archivo, origen);
    } catch {
      push({ message: copy.descargaFallo, tone: 'error' });
    } finally {
      setDescargando(false);
    }
  }, [archivo, push, origen]);

  const alFallarPdf = useCallback(() => setCarga({ estado: 'error' }), []);
  const htmlLimpio = useMemo(
    () => (archivo?.tipo === 'html' && carga.estado === 'texto' ? sinScripts(carga.contenido) : ''),
    [archivo, carga]
  );

  return (
    <section
      aria-label={copy.contenido}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
        className
      )}
    >
      {/* La cabecera existe siempre: si apareciera al elegir el primer
          archivo, el visor entero saltaría hacia abajo. */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-4 py-3 lg:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {onVolver && (
            <Button variant="ghost" size="sm" onClick={onVolver} className="shrink-0 px-2 lg:hidden" aria-label={copy.volver}>
              <ChevronLeft size={16} aria-hidden />
            </Button>
          )}
          {archivo ? (
            <div className="min-w-0">
              <p className="truncate font-ui text-14 font-medium text-text-1" title={archivo.ruta}>
                {archivo.nombre}
              </p>
              <p className="mt-0.5 truncate font-ui text-12 tabular-nums text-text-3">
                {subtitulo ?? `${tamanoLegible(archivo.tamanoBytes)} · ${copy.modificado(formatoFechaLarga(archivo.modificado))}`}
              </p>
            </div>
          ) : (
            <p className="font-ui text-14 text-text-3">{copy.visorVacioTitulo}</p>
          )}
        </div>
        {archivo && archivo.tipo !== 'otro' && (
          <Button variant="secondary" size="sm" loading={descargando} onClick={descargar} className="shrink-0">
            <Download size={14} />
            {copy.descargar}
          </Button>
        )}
        {accion}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {!archivo ? (
          <EmptyState icon={FileText} title={copy.visorVacioTitulo} description={copy.visorVacio} />
        ) : carga.estado === 'cargando' ? (
          <EsqueletoVisor />
        ) : carga.estado === 'error' ? (
          <ErrorState
            title={copy.errorArchivo}
            description={copy.errorArchivoDetalle}
            onRetry={() => setIntento((n) => n + 1)}
          />
        ) : carga.estado === 'sinVista' ? (
          <EmptyState icon={FileQuestion} title={copy.sinVistaTitulo} description={copy.sinVistaDetalle} />
        ) : carga.estado === 'pdf' ? (
          <div className="px-4 py-4 lg:px-6">
            <Suspense fallback={<Skeleton className="aspect-[4/3] w-full rounded-tarjeta" />}>
              <VisorPdf archivo={carga.blob} onError={alFallarPdf} />
            </Suspense>
          </div>
        ) : archivo.tipo === 'html' ? (
          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
            <Banner tone="neutral">{copy.htmlNota}</Banner>
            <iframe
              key={archivo.ruta}
              title={archivo.nombre}
              sandbox=""
              srcDoc={htmlLimpio}
              className="min-h-[60vh] w-full flex-1 rounded-celda border border-hairline bg-white"
            />
          </div>
        ) : archivo.tipo === 'md' ? (
          <div className="px-6 py-5">
            <Markdown key={archivo.ruta} className="max-w-[76ch]">
              {carga.contenido}
            </Markdown>
          </div>
        ) : (
          <pre
            key={archivo.ruta}
            className="max-w-[90ch] whitespace-pre-wrap break-words px-6 py-5 font-ui text-14 leading-relaxed text-text-1"
          >
            {carga.contenido}
          </pre>
        )}
      </div>
    </section>
  );
}

/** Título y párrafos: la forma de un documento leído, para que no brinque. */
function EsqueletoVisor() {
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
