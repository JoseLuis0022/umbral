import type { ReactNode } from 'react';
import { MarcaPlana } from '../brand/Logo';
import { GraficaUmbral } from '../brand/GraficaUmbral';
import { acceso as copy } from '../../copy';

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
  cruzado = false,
}: {
  children: ReactNode;
  /** Nota al pie de la columna (p. ej. qué incluye el modo invitado). En text-2: es información, no adorno. */
  pie?: ReactNode;
  /** El nodo del umbral sube: confirma que se entró. */
  cruzado?: boolean;
}) {
  return (
    <div className="grid h-full w-full overflow-y-auto bg-bg lg:grid-cols-[minmax(400px,520px)_1fr]">
      <div className="flex min-h-full flex-col px-6 py-8 sm:px-12 lg:px-16">
        <MarcaPlana />
        <main className="flex flex-1 flex-col justify-center py-12">
          <div className="w-full max-w-[360px]">{children}</div>
        </main>
        {pie && <p className="max-w-[360px] font-ui text-13 leading-relaxed text-text-2">{pie}</p>}
      </div>

      <div className="hidden min-h-full flex-col items-center justify-center border-l border-hairline bg-surface-1 px-12 lg:flex">
        <figure className="w-full max-w-[560px]">
          <GraficaUmbral cruzado={cruzado} />
          <figcaption className="mt-6 max-w-[440px] font-ui text-14 leading-relaxed text-text-2">
            {copy.leyendaGrafica}
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
