import type { PasoGuia } from '../../types';
import { Markdown } from '../Markdown';

/**
 * Los pasos de una guía, numerados.
 *
 * Es un `<ol>` de verdad —el orden es información, no decoración—, pero los
 * marcadores nativos se apagan y la cifra se dibuja a mano en un badge: un
 * `list-decimal` no puede alinearse con el bloque de texto cuando el paso
 * contiene tablas o código, y la numeración terminaría flotando arriba a la
 * izquierda de un bloque de 300 px de alto.
 *
 * El badge va `aria-hidden`: el lector de pantalla ya anuncia "elemento 3 de
 * 6" por la semántica de la lista, y oír "3, tres, Confirma tu identidad"
 * sería redundante.
 */
export function PasosGuia({ pasos }: { pasos: PasoGuia[] }) {
  return (
    <ol className="flex list-none flex-col gap-8">
      {pasos.map((paso, i) => (
        <li key={paso.titulo} className="flex gap-4">
          <span
            aria-hidden
            className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft font-ui text-13 font-semibold tabular-nums text-accent-fg"
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-ui text-15 font-semibold leading-[22px] text-text-1">{paso.titulo}</h3>
            <Markdown className="mt-3 text-text-2">{paso.contenido}</Markdown>
          </div>
        </li>
      ))}
    </ol>
  );
}
