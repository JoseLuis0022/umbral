import { memo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Brain, Folder, Lock, type LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { formatoFechaCorta, tamanoLegible } from '../../../lib/fechas';
import { MAX_ESCALONADO, dur, ease, springPanel, springPress } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { Skeleton, StatusPill } from '../../ui';
import type { ColeccionCorpus } from '../../../services/corpus.service';
import { corpus as copy } from '../../../copy';

/**
 * Portada del Corpus: las carpetas del agente como tarjetas, agrupadas por lo
 * que SIGNIFICAN para el agente, no por cómo se llaman en disco:
 *
 *  - Material del curso: lo que el alumno puede recibir por el chat.
 *  - Memoria del agente: lo que el agente lee primero para orientarse.
 *  - Privado: entregas del equipo; nunca salen.
 *
 * El grupo se deriva de las banderas del backend (`compartible`, `sensible`),
 * así que una colección nueva cae sola en su lugar.
 */

type Grupo = { id: string; titulo: string; detalle: string; icono: LucideIcon; tono: 'acento' | 'neutro' | 'riesgo' };

const GRUPOS: Grupo[] = [
  { id: 'material', titulo: copy.grupoMaterial, detalle: copy.grupoMaterialDetalle, icono: BookOpen, tono: 'acento' },
  { id: 'memoria', titulo: copy.grupoMemoria, detalle: copy.grupoMemoriaDetalle, icono: Brain, tono: 'neutro' },
  { id: 'privado', titulo: copy.grupoPrivado, detalle: copy.grupoPrivadoDetalle, icono: Lock, tono: 'riesgo' },
];

const grupoDe = (c: ColeccionCorpus) => (c.sensible ? 'privado' : c.compartible ? 'material' : 'memoria');

export function CarpetasCorpus({
  colecciones,
  onAbrir,
}: {
  colecciones: ColeccionCorpus[];
  onAbrir: (id: string) => void;
}) {
  let indice = 0;
  return (
    <div className="flex flex-col gap-8">
      {GRUPOS.map((g) => {
        const propias = colecciones.filter((c) => grupoDe(c) === g.id);
        if (!propias.length) return null;
        return (
          <section key={g.id} aria-labelledby={`grupo-${g.id}`} className="flex flex-col gap-3">
            <header>
              <h2 id={`grupo-${g.id}`} className="font-ui text-15 font-semibold text-text-1">
                {g.titulo}
              </h2>
              <p className="font-ui text-13 text-text-2">{g.detalle}</p>
            </header>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {propias.map((c) => (
                <TarjetaCarpeta key={c.id} coleccion={c} grupo={g} orden={indice++} onAbrir={onAbrir} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const TONO_FICHA: Record<Grupo['tono'], string> = {
  acento: 'bg-accent-soft text-accent-fg',
  neutro: 'bg-tinta/[.05] text-text-2',
  riesgo: 'bg-status-red-soft text-status-red',
};

const TarjetaCarpeta = memo(function TarjetaCarpeta({
  coleccion,
  grupo,
  orden,
  onAbrir,
}: {
  coleccion: ColeccionCorpus;
  grupo: Grupo;
  orden: number;
  onAbrir: (id: string) => void;
}) {
  const reducido = useReducedMotion();
  const total = coleccion.archivos.reduce((n, a) => n + a.tamanoBytes, 0);
  const ultima = coleccion.archivos.reduce<string | null>((m, a) => (!m || a.modificado > m ? a.modificado : m), null);

  return (
    <motion.li
      initial={reducido ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reducido ? { duration: dur.fast, ease } : { ...springPanel, delay: Math.min(orden, MAX_ESCALONADO) * 0.035 }
      }
    >
      <motion.button
        type="button"
        onClick={() => onAbrir(coleccion.id)}
        whileHover={reducido ? undefined : { y: -2 }}
        whileTap={{ scale: 0.985 }}
        transition={springPress}
        className="flex h-full w-full flex-col gap-3 rounded-tarjeta bg-surface-1 p-4 text-left shadow-anillo outline-none transition-shadow duration-150 ease-umbral hover:shadow-menu focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-start justify-between gap-3">
          {/* La ficha es un objeto propio dentro de la tarjeta: radio de control (10). */}
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-control', TONO_FICHA[grupo.tono])}>
            {grupo.tono === 'riesgo' ? (
              <Lock size={18} strokeWidth={1.75} aria-hidden />
            ) : (
              <Folder size={18} strokeWidth={1.75} aria-hidden />
            )}
          </span>
          {coleccion.sensible && <StatusPill label={copy.grupoPrivado} tone="red" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-ui text-15 font-medium text-text-1">{coleccion.nombre}</span>
          <span className="line-clamp-2 font-ui text-13 leading-snug text-text-2">{coleccion.descripcion}</span>
        </span>
        <span className="font-ui text-12 tabular-nums text-text-3">
          {copy.archivos(coleccion.archivos.length)}
          {coleccion.archivos.length > 0 && <> · {tamanoLegible(total)}</>}
          {ultima && <> · {copy.actualizado(formatoFechaCorta(ultima))}</>}
        </span>
      </motion.button>
    </motion.li>
  );
});

/** La forma real de la portada: dos grupos de tarjetas, con su altura. */
export function EsqueletoCarpetas() {
  return (
    <div aria-hidden className="flex flex-col gap-8">
      {[3, 3].map((n, g) => (
        <div key={g} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-72" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: n }).map((_, i) => (
              <div key={i} className="flex h-[148px] flex-col gap-3 rounded-tarjeta bg-surface-1 p-4 shadow-anillo">
                <Skeleton className="h-10 w-10 rounded-control" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
