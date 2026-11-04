import type { AnalisisConversacion } from '../../../types';
import { admin as copy } from '../../../copy';
import { IndicadorAnalisis } from './IndicadorAnalisis';

/**
 * Barra de análisis del detalle: título de la conversación a la izquierda, los
 * tres indicadores a la derecha.
 *
 * Va pegada al borde superior del panel (sticky) porque es el marco de lectura
 * de todo lo que sigue: el auditor debe poder bajar por una transcripción
 * larga sin perder de vista con qué riesgo la está leyendo.
 */
export function BarraAnalisis({ titulo, analisis }: { titulo: string; analisis?: AnalisisConversacion }) {
  return (
    <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-hairline bg-surface-1/90 px-5 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:px-6">
      <h2 className="min-w-0 font-ui text-15 font-semibold text-text-1 lg:text-22 lg:font-normal">{titulo}</h2>

      {analisis && (
        // En móvil los tres indicadores se reparten el ancho; en escritorio se
        // agrupan a la derecha separados por hairlines verticales, para que se
        // lean como un solo bloque de veredicto y no como tres tarjetas.
        // Por debajo de `sm` el icono de cada indicador se oculta (el primer
        // <span> de IndicadorAnalisis): a 393 px, icono + "Ahorro de tiempo"
        // no caben en un tercio del ancho y el tercero se salía de la tarjeta.
        <div className="grid shrink-0 grid-cols-3 gap-2 sm:gap-3 lg:flex [&>*>span:first-child]:hidden sm:[&>*>span:first-child]:flex lg:items-center lg:gap-0 lg:divide-x lg:divide-hairline">
          <IndicadorAnalisis clase="riesgo" etiqueta={copy.riesgo} nivel={analisis.riesgo} className="lg:pr-5" />
          <IndicadorAnalisis
            clase="ahorroTiempo"
            etiqueta={copy.ahorroTiempo}
            nivel={analisis.ahorroTiempo}
            className="lg:px-5"
          />
          <IndicadorAnalisis
            clase="ahorroCosto"
            etiqueta={copy.ahorroCosto}
            nivel={analisis.ahorroCosto}
            className="lg:pl-5"
          />
        </div>
      )}
    </div>
  );
}
