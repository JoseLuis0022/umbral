import { useMemo, useState, type ReactNode } from 'react';
import { Quote } from 'lucide-react';
import { cn } from '../../lib/cn';
import { archivoDeFuente, leerFuente } from '../../lib/fuentes';
import { VisorEmergente } from './ArchivosMensaje';

/**
 * Una cita del agente (`[Clase 12](<fuente:…> "frase")`), pintada como chip.
 *
 * Clic → la fuente se abre encima del chat en el mismo visor de los archivos
 * compartidos: una transcripción con la frase marcada y centrada, un PDF en su
 * página. La ruta no se muestra nunca; solo la etiqueta que eligió el agente.
 *
 * Lo citado desde `estado/` (memoria del agente, no compartible) se pinta como
 * cita, pero no se abre: el servidor tampoco lo serviría.
 */
export function CitaFuente({ href, titulo, children }: { href: string; titulo?: string | null; children: ReactNode }) {
  const [abierta, setAbierta] = useState(false);
  const fuente = useMemo(() => leerFuente(href, titulo), [href, titulo]);
  const archivo = useMemo(() => (fuente ? archivoDeFuente(fuente) : null), [fuente]);
  const etiqueta = typeof children === 'string' ? children : Array.isArray(children) ? children.join('') : 'fuente';
  const clases =
    'mx-0.5 inline-flex max-w-full items-baseline gap-1 rounded-xs bg-accent-soft px-1.5 align-baseline font-ui text-13 font-medium leading-5 text-accent-fg';
  const icono = <Quote size={11} strokeWidth={2.5} aria-hidden className="shrink-0 translate-y-[1px] opacity-70" />;

  if (!fuente || !fuente.clicable) {
    return (
      <span className={clases} title={fuente?.fragmento ?? undefined}>
        {icono}
        <span className="truncate">{children}</span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        title={fuente.fragmento ? `«${fuente.fragmento}»` : undefined}
        aria-label={`Abrir fuente: ${etiqueta}`}
        className={cn(
          clases,
          'cursor-pointer outline-none transition-colors duration-[120ms] hover:bg-accent/15 focus-visible:ring-2 focus-visible:ring-accent'
        )}
      >
        {icono}
        <span className="truncate">{children}</span>
      </button>
      <VisorEmergente
        archivo={abierta ? archivo : null}
        onCerrar={() => setAbierta(false)}
        resaltar={fuente.fragmento}
        pagina={fuente.pagina}
      />
    </>
  );
}
