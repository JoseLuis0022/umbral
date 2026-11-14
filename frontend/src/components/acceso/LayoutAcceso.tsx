import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MarcaPlana } from '../brand/Logo';
import { GraficaUmbral } from '../brand/GraficaUmbral';
import { acceso as copy } from '../../copy';
import { cn } from '../../lib/cn';

const ENLACE_LEGAL =
  'inline-flex h-11 items-center rounded-control px-2 font-ui text-13 text-text-2 transition-colors duration-150 hover:text-text-1';

/**
 * Retícula de las pantallas de acceso (Login, Registro, Verificar).
 *
 * Sin tarjeta flotante ni degradado de fondo: el formulario va directo sobre
 * el lienzo, alineado a la izquierda, y la otra mitad es la función umbral
 * dibujada a escala real. La marca vive en ese detalle, no en un ícono
 * centrado. En pantallas chicas la gráfica se va y queda solo el formulario.
 */
export function LayoutAcceso({
  children,
  pie,
  progreso = 0,
  cruzado = false,
}: {
  children: ReactNode;
  /** Nota al pie de la columna (p. ej. qué incluye el modo invitado). En text-2: es información, no adorno. */
  pie?: ReactNode;
  /** 0–1: cuánto del formulario está lleno; la gráfica lo refleja. */
  progreso?: number;
  /** El nodo del umbral sube: confirma que se entró. */
  cruzado?: boolean;
}) {
  return (
    <div className="grid h-full w-full overflow-y-auto bg-bg lg:grid-cols-[minmax(400px,520px)_1fr]">
      <div className="flex min-h-full flex-col px-6 py-8 sm:px-12 lg:px-16">
        {/* La marca regresa a la landing (quien llegó al login sin saber qué es Umbral). */}
        <Link to="/" className="self-start rounded-control" aria-label="Umbral, inicio">
          <MarcaPlana />
        </Link>
        <main className="flex flex-1 flex-col justify-center py-12">
          <div className="w-full max-w-[360px]">{children}</div>
        </main>
        {pie && <p className="max-w-[360px] font-ui text-13 leading-relaxed text-text-2">{pie}</p>}
        {/* Discreto, al pie de la columna: está para quien lo busque. */}
        <nav aria-label={copy.legal} className={cn('-ml-2 flex gap-1', pie && 'mt-2')}>
          <Link to="/privacidad" className={ENLACE_LEGAL}>
            {copy.privacidad}
          </Link>
          <Link to="/terminos" className={ENLACE_LEGAL}>
            {copy.terminos}
          </Link>
        </nav>
      </div>

      <div className="hidden min-h-full flex-col items-center justify-center border-l border-hairline bg-surface-1 px-12 lg:flex">
        <figure className="w-full max-w-[560px]">
          <GraficaUmbral progreso={progreso} cruzado={cruzado} />
          <figcaption className="mt-6 max-w-[440px] font-ui text-14 leading-relaxed text-text-2">
            {copy.leyendaGrafica}
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
