import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton, Skeleton } from '../../ui';
import { corpus as copy } from '../../../copy';

// El worker de pdf.js lo empaqueta Vite desde node_modules: nada se pide a un CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/**
 * Visor de PDF con react-pdf. Recibe el Blob ya descargado (el endpoint exige
 * Authorization, así que no se le puede dar una URL al visor).
 *
 * Una página a la vez, al ancho del panel: las diapositivas del profesor
 * tienen decenas de páginas y pintarlas todas de golpe congelaría el hilo
 * principal varios segundos.
 *
 * Se carga con `lazy` desde el visor: pdf.js pesa, y solo lo necesita quien
 * abre un PDF.
 */
export default function VisorPdf({
  archivo,
  onError,
  paginaInicial = 1,
}: {
  archivo: Blob;
  onError: () => void;
  /** Página con la que abre (una cita `#page=N`). */
  paginaInicial?: number;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [paginas, setPaginas] = useState(0);
  const [pagina, setPagina] = useState(paginaInicial);

  useEffect(() => {
    const nodo = contenedor.current;
    if (!nodo) return;
    const observador = new ResizeObserver(([entrada]) => setAncho(Math.floor(entrada.contentRect.width)));
    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  useEffect(() => setPagina(paginaInicial), [archivo, paginaInicial]);

  const esqueleto = <Skeleton className="aspect-[4/3] w-full rounded-tarjeta" />;

  return (
    <div className="flex flex-col gap-3">
      {/* Arriba y no abajo: con una diapositiva alta, abajo quedaba fuera de la vista. */}
      {paginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <IconButton aria-label={copy.pdfAnterior} disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>
            <ChevronLeft size={16} />
          </IconButton>
          <span className="font-ui text-13 tabular-nums text-text-2" aria-live="polite">
            {copy.pdfPagina(pagina, paginas)}
          </span>
          <IconButton
            aria-label={copy.pdfSiguiente}
            disabled={pagina >= paginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            <ChevronRight size={16} />
          </IconButton>
        </div>
      )}
      <div ref={contenedor} className="w-full">
        {ancho > 0 && (
          <Document
            file={archivo}
            onLoadSuccess={({ numPages }) => {
              setPaginas(numPages);
              // Una cita a una página que no existe no deja el visor en blanco.
              setPagina((p) => Math.min(Math.max(1, p), numPages));
            }}
            onLoadError={onError}
            loading={esqueleto}
            error={<span />}
          >
            <Page
              pageNumber={pagina}
              width={ancho}
              renderAnnotationLayer={false}
              loading={esqueleto}
              className="overflow-hidden rounded-tarjeta border border-hairline shadow-1"
            />
          </Document>
        )}
      </div>

    </div>
  );
}
