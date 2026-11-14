import { Check, Minus } from 'lucide-react';
import { cn } from '../../lib/cn';

type Celda = boolean | string;

/**
 * Tabla comparativa. Sobria a propósito: sin palomitas verdes ni cruces
 * rojas, sin columna "ganadora" pintada de azul. Umbral solo se distingue por
 * ir primero y en peso semibold, con un tinte neutro casi imperceptible. Un
 * sí es una palomita en tinta, un no es una raya, y lo que depende se dice
 * con texto. En pantallas chicas la tabla se desplaza en horizontal dentro de
 * su propio contenedor, con la primera columna fija.
 */
export function Comparacion({
  columnas,
  filas,
  leyenda,
  si,
  no,
}: {
  columnas: readonly string[];
  filas: readonly (readonly [string, readonly Celda[]])[];
  leyenda: string;
  si: string;
  no: string;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[760px] border-collapse text-left">
        <caption className="sr-only">{leyenda}</caption>
        <thead>
          <tr>
            <td className="sticky left-0 w-[26%] bg-surface-1" />
            {columnas.map((c, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  'px-4 pb-4 align-bottom font-ui text-15',
                  i === 0 ? 'rounded-t-tarjeta bg-tinta/[.035] pt-5 font-semibold text-text-1' : 'font-medium text-text-2'
                )}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map(([fila, celdas], f) => (
            <tr key={fila}>
              <th
                scope="row"
                className="sticky left-0 border-t border-hairline bg-surface-1 py-4 pr-4 align-top font-ui text-15 font-medium text-text-1"
              >
                {fila}
              </th>
              {celdas.map((celda, i) => (
                <td
                  key={i}
                  className={cn(
                    'border-t border-hairline px-4 py-4 align-top font-ui text-15',
                    i === 0 ? 'bg-tinta/[.035] font-medium text-text-1' : 'text-text-2',
                    i === 0 && f === filas.length - 1 && 'rounded-b-tarjeta'
                  )}
                >
                  {celda === true ? (
                    <Check size={18} strokeWidth={2} className="text-text-1" aria-label={si} role="img" />
                  ) : celda === false ? (
                    <Minus size={18} strokeWidth={1.75} className="text-text-2" aria-label={no} role="img" />
                  ) : (
                    celda
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
