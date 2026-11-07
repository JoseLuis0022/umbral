import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/cn';
import { spring } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { tablero as copy } from '../../../copy';
import { formatoEntero, formatoUsd } from '../laboratorio/formato';
import type { ResumenDia } from '../../../services/auditoria.service';
import { usePrimeraVez } from '../../../lib/memoria';

const ALTO = 220;

const FECHA_DIA = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const etiquetaDia = (dia: string) => FECHA_DIA.format(new Date(`${dia}T00:00:00Z`));

/**
 * Costo por día: una barra por día del periodo, días sin consultas incluidos
 * (el backend rellena con ceros). La altura es el COSTO —lo que se paga—; el
 * número de consultas va en la lectura del día activo y en la tabla accesible.
 *
 * Barras y no curva: son totales diarios discretos, y una curva suavizada
 * inventaría valores entre un día y otro.
 */
export function GraficaCostoDia({ serie }: { serie: ResumenDia[] }) {
  const primera = usePrimeraVez('grafica-costo-dia');
  const reducido = useReducedMotion();
  const [activo, setActivo] = useState<number | null>(null);
  const maximo = Math.max(...serie.map((d) => d.costoUsd), 0);
  const total = serie.reduce((s, d) => s + d.costoUsd, 0);
  const consultas = serie.reduce((s, d) => s + d.consultas, 0);
  const lectura = activo != null ? serie[activo] : null;
  // Cada cuántos días se rotula el eje para que las fechas no se encimen.
  const paso = Math.max(1, Math.ceil(serie.length / 8));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="font-ui text-15 font-semibold text-text-1">{copy.costoDia}</h2>
          <p className="font-ui text-13 text-text-2">{copy.costoDiaDetalle}</p>
        </div>
        {/* Hueco reservado: la lectura cambia sin empujar nada. */}
        <p className="min-w-[200px] text-right font-ui text-13 tabular-nums text-text-2" aria-live="polite">
          {lectura
            ? copy.lecturaDia(etiquetaDia(lectura.dia), formatoUsd(lectura.costoUsd), lectura.consultas)
            : copy.lecturaTotal(formatoUsd(total), consultas)}
        </p>
      </div>

      <div
        aria-hidden
        className="flex items-end gap-[2px] border-b border-hairlineStrong"
        style={{ height: ALTO }}
        onPointerLeave={() => setActivo(null)}
      >
        {serie.map((d, i) => {
          const proporcion = maximo > 0 ? d.costoUsd / maximo : 0;
          return (
            <div
              key={d.dia}
              className="flex h-full min-w-0 flex-1 cursor-default items-end"
              onPointerEnter={() => setActivo(i)}
            >
              <motion.div
                className={cn(
                  'w-full origin-bottom rounded-t-[3px]',
                  activo === i ? 'bg-accent' : d.consultas > 0 ? 'bg-accent opacity-50' : 'bg-hairline'
                )}
                style={{ height: d.consultas > 0 ? `${Math.max(proporcion * 100, 2)}%` : 2 }}
                // Crecen solo la primera vez en la sesión; al volver al tablero ya están.
                initial={reducido || !primera ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={spring}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden className="flex gap-[2px]">
        {serie.map((d, i) => (
          <span key={d.dia} className="min-w-0 flex-1 overflow-visible whitespace-nowrap font-ui text-12 text-text-3">
            {i % paso === 0 ? etiquetaDia(d.dia) : ''}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>{copy.costoDia}</caption>
        <thead>
          <tr>
            <th>{copy.colDia}</th>
            <th>{copy.colConsultas}</th>
            <th>{copy.colCosto}</th>
          </tr>
        </thead>
        <tbody>
          {serie
            .filter((d) => d.consultas > 0)
            .map((d) => (
              <tr key={d.dia}>
                <td>{etiquetaDia(d.dia)}</td>
                <td>{formatoEntero(d.consultas)}</td>
                <td>{formatoUsd(d.costoUsd)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
