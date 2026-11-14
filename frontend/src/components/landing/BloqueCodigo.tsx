import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * Bloque de comandos de la sección "Despliégalo en tu servidor". Sobrio:
 * pizarra oscura, monoespaciada, sin resaltado de colores ni los tres
 * puntitos de ventana de macOS. Los comentarios van en un gris que pasa AA
 * sobre el fondo. "Copiar" copia solo los comandos, sin comentarios.
 */
export function BloqueCodigo({
  lineas,
  etiqueta,
  textoCopiar,
  textoCopiado,
}: {
  lineas: readonly { texto: string; comentario?: string }[];
  etiqueta: string;
  textoCopiar: string;
  textoCopiado: string;
}) {
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1800);
    return () => clearTimeout(t);
  }, [copiado]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(lineas.map((l) => l.texto).join('\n'));
      setCopiado(true);
    } catch {
      // Sin permiso de portapapeles el texto sigue ahí para seleccionarlo a mano.
    }
  }

  return (
    <figure className="overflow-hidden rounded-tarjeta bg-marca-pizarra-900" aria-label={etiqueta}>
      <div className="flex items-center justify-between border-b border-white/10 py-1 pl-5 pr-2">
        <figcaption className="font-mono text-13 text-marca-pizarra-300">bash</figcaption>
        <button
          type="button"
          onClick={copiar}
          className="inline-flex h-11 items-center gap-2 rounded-control px-3 font-ui text-13 font-medium text-marca-pizarra-200 transition-colors duration-150 hover:bg-white/[.06] hover:text-white"
        >
          {copiado ? <Check size={15} strokeWidth={2} aria-hidden="true" /> : <Copy size={15} strokeWidth={1.75} aria-hidden="true" />}
          <span aria-live="polite">{copiado ? textoCopiado : textoCopiar}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-5 font-mono text-14 leading-7 text-marca-pizarra-50">
        <code>
          {lineas.map((l) => (
            <span key={l.texto} className="block">
              <span className="select-none text-marca-pizarra-400">$ </span>
              {l.texto}
              {l.comentario && <span className="text-marca-pizarra-400">{`   # ${l.comentario}`}</span>}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
