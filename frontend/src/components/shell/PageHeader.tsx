import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Cabecera única de pantalla. Existe para que ninguna pantalla reinvente la
 * suya con otro tamaño, otro margen y otra alineación.
 *
 * Tiene dos formas, y la razón es el espacio:
 *
 *  - **Amplia** (por defecto): título de 22 px, subtítulo debajo y acciones a
 *    la derecha. Se usa donde el contenido cabe de sobra y una línea de
 *    contexto ayuda a quien llega por primera vez — Ajustes, Perfil, Al día.
 *
 *  - **Compacta** (`compacto`): título y acciones en LA MISMA fila, a 15 px.
 *    Se usa en las pantallas de trabajo diario. Ahí la cabecera amplia costaba
 *    76 px de los 733 de una ventana normal, y encima repetía lo que ya dice
 *    la barra de navegación con la sección marcada. El subtítulo no se pierde:
 *    sigue en el DOM para los lectores de pantalla y aparece como ayuda
 *    emergente sobre el título, así que el contexto está a un cursor de
 *    distancia sin costar un solo píxel.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  compacto = false,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  compacto?: boolean;
}) {
  if (compacto) {
    // El título NO se dibuja: la barra de navegación ya marca en qué sección
    // estás, así que repetirlo en grande costaba 76 px de pantalla para decir
    // lo que ya estaba dicho. Pero sigue existiendo como `h1`, porque una
    // página sin encabezado deja sin puntos de referencia a quien navega con
    // lector de pantalla — se oculta a la vista, no a la asistencia.
    //
    // Cuando no hay acciones, no se renderiza NADA visible: ni un contenedor
    // vacío que gaste su margen.
    return (
      <>
        <h1 className="sr-only">{title}</h1>
        {subtitle && <p className="sr-only">{subtitle}</p>}
        {actions && (
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-2">
            {actions}
          </div>
        )}
      </>
    );
  }

  return (
    <div className={cn('mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4')}>
      <div className="min-w-0">
        <h1 className="font-ui text-22 text-text-1">{title}</h1>
        {subtitle && <p className="mt-1 font-ui text-13 text-text-3">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
