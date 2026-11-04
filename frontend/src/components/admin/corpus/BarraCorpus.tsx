import { motion } from 'framer-motion';
import { SlidersHorizontal } from 'lucide-react';
import type { Corpus } from '../../../types';
import { cn } from '../../../lib/cn';
import { spring } from '../../../lib/motion';
import { formatoFechaCorta } from '../../../lib/fechas';
import { Button, Skeleton } from '../../ui';
import { admin as copy } from '../../../copy';

// Cadenas que no existen todavía en src/copy (ver reporte).
const textos = {
  sinGuardar: 'Cambios sin guardar',
  indexando: (n: number) => (n === 1 ? 'Indexando 1 documento' : `Indexando ${n} documentos`),
  progresoEtiqueta: 'Progreso de la indexación',
  actualizado: (fecha: string) => `Actualizado ${fecha}`,
  masAgentes: (n: number) => `+${n} más`,
  agentes: (lista: string[]) => `Agentes: ${lista.join(', ')}`,
};

/** Cuántas etiquetas de agente se dibujan antes de resumir el resto. Dos es
 *  lo que cabe junto al nombre sin empujar nada; el resto se cuenta. */
const MAX_AGENTES = 2;

/**
 * Cabecera del panel de detalle: TODO lo que se sabe de la base abierta.
 *
 * Aquí viven ahora la descripción, los agentes asociados y la fecha de
 * actualización, que antes se repetían dentro de cada tarjeta de la tira. El
 * dato de la base que NO está abierta no vale 250 px de alto de visor; el de
 * la que sí lo está se lee mejor en una sola barra ancha.
 *
 * La franja de indexación ocupa una altura FIJA aunque no haya nada
 * indexándose. Si apareciera y desapareciera empujando el contenido, cada
 * archivo soltado movería la lista y el visor dos veces — y el salto se
 * percibe mucho más que la propia barra.
 */
export function BarraCorpus({
  corpus,
  cargando,
  promptSucio,
  onAbrirPrompt,
  indexando,
  progreso,
  anuncio,
  className,
}: {
  corpus: Corpus | null;
  cargando: boolean;
  promptSucio: boolean;
  onAbrirPrompt: () => void;
  indexando: number;
  progreso: number;
  anuncio: string;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-tarjeta border border-hairline bg-surface-1 px-4 py-3 shadow-1',
        className
      )}
      aria-label={corpus?.nombre ?? copy.corpusTitulo}
    >
      <div className="min-w-0 flex-1">
        {cargando || !corpus ? (
          <>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-64" />
          </>
        ) : (
          <>
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate font-ui text-15 font-semibold text-text-1">{corpus.nombre}</h2>
              <EtiquetasAgente agentes={corpus.agentesAsociados} />
            </div>
            <p className="mt-0.5 truncate font-ui text-12 text-text-3">
              {corpus.descripcion} · {textos.actualizado(formatoFechaCorta(corpus.actualizadoEn))}
            </p>
          </>
        )}
      </div>

      {/* Altura fija: el hueco existe siempre, se llene o no. En teléfono la
          fila baja completa bajo el título y la barra de progreso cede ancho
          antes que el botón: si no, el botón se sale de la tarjeta. */}
      <div className="flex h-9 w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-start">
        {indexando > 0 && (
          <div className="flex min-w-0 items-center gap-2">
            <span className="whitespace-nowrap font-ui text-12 tabular-nums text-status-blue">
              {textos.indexando(indexando)}
            </span>
            <div
              role="progressbar"
              aria-label={textos.progresoEtiqueta}
              aria-valuenow={progreso}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-1 w-20 shrink overflow-hidden rounded-full bg-status-blue-soft"
            >
              <motion.div
                className="h-full w-full origin-left rounded-full bg-status-blue"
                initial={false}
                animate={{ scaleX: progreso / 100 }}
                transition={spring}
              />
            </div>
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={onAbrirPrompt}
          disabled={!corpus}
          aria-describedby={promptSucio ? 'aviso-prompt-sucio' : undefined}
        >
          <SlidersHorizontal size={14} />
          {copy.systemPrompt}
          {/* El punto ámbar dice que el borrador sigue vivo aunque el editor
              esté cerrado: cerrar no descarta lo escrito. */}
          {promptSucio && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-status-amber" aria-hidden />}
        </Button>
        {promptSucio && (
          <span id="aviso-prompt-sucio" className="sr-only">
            {textos.sinGuardar}
          </span>
        )}
      </div>

      {/* Región viva: anuncia el avance en escalones, no en cada tick — un
          lector de pantalla leyendo "31 %, 32 %, 33 %" es inutilizable. */}
      <p role="status" aria-live="polite" className="sr-only">
        {anuncio}
      </p>
    </section>
  );
}

/**
 * Agentes que consultan esta base. Se dibujan como máximo dos y el resto se
 * resume en "+N más": el bloque mide lo mismo con cero, con tres o con seis, y
 * nunca puede empujar el alto de la barra. La lista completa sigue disponible
 * como nombre accesible y como `title`.
 */
function EtiquetasAgente({ agentes }: { agentes: string[] }) {
  if (agentes.length === 0) return null;

  const visibles = agentes.slice(0, MAX_AGENTES);
  const resto = agentes.length - visibles.length;

  return (
    // Se ocultan por debajo de md: en un teléfono el nombre de la base y su
    // descripción valen más que la lista de agentes.
    <div className="hidden shrink-0 items-center gap-1.5 md:flex" title={textos.agentes(agentes)}>
      <span className="sr-only">{textos.agentes(agentes)}</span>
      {visibles.map((agente) => (
        <span
          key={agente}
          aria-hidden
          className="max-w-[16ch] truncate rounded-celda bg-bg px-2 py-0.5 font-ui text-12 text-text-2"
        >
          {agente}
        </span>
      ))}
      {resto > 0 && (
        <span aria-hidden className="whitespace-nowrap rounded-celda bg-bg px-2 py-0.5 font-ui text-12 tabular-nums text-text-3">
          {textos.masAgentes(resto)}
        </span>
      )}
    </div>
  );
}
