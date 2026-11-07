import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  AudioLines,
  BookOpen,
  Brain,
  Folder,
  GalleryVerticalEnd,
  ListChecks,
  Lock,
  Map as Mapa,
  NotebookPen,
  Presentation,
  type LucideIcon,
} from 'lucide-react';
import { formatoFechaCorta, tamanoLegible } from '../../../lib/fechas';
import { springPress, springRebote } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { Skeleton, StatusPill } from '../../ui';
import type { ColeccionCorpus } from '../../../services/corpus.service';
import { corpus as copy } from '../../../copy';
import { usePrimeraVez } from '../../../lib/memoria';

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

/** Un ícono por colección (por id del backend); las nuevas usan la carpeta. */
const ICONO_COLECCION: Record<string, LucideIcon> = {
  apuntes: NotebookPen,
  transcripciones: AudioLines,
  diapositivas: Presentation,
  inventario: ListChecks,
  mapa: Mapa,
  'diapositivas-resumen': GalleryVerticalEnd,
};

const grupoDe = (c: ColeccionCorpus) => (c.sensible ? 'privado' : c.compartible ? 'material' : 'memoria');

export function CarpetasCorpus({
  colecciones,
  onAbrir,
}: {
  colecciones: ColeccionCorpus[];
  onAbrir: (id: string) => void;
}) {
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
              {propias.map((c, i) => (
                <TarjetaCarpeta key={c.id} coleccion={c} grupo={g} orden={i} onAbrir={onAbrir} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

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
  const primera = usePrimeraVez('corpus-carpetas');
  const Icono = grupo.tono === 'riesgo' ? Lock : (ICONO_COLECCION[coleccion.id] ?? Folder);
  const total = coleccion.archivos.reduce((n, a) => n + a.tamanoBytes, 0);
  const ultima = coleccion.archivos.reduce<string | null>((m, a) => (!m || a.modificado > m ? a.modificado : m), null);

  return (
    <motion.li
      initial={reducido || !primera ? false : { opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reducido ? { duration: 0 } : { ...springRebote, delay: 0.04 * orden, opacity: { duration: 0.2, delay: 0.04 * orden } }}
    >
      {/* El ícono va suelto, en el color del grupo, sin cuadro teñido. Al
          pasar el cursor da un pequeño salto (variante "activo"). */}
      <motion.button
        type="button"
        onClick={() => onAbrir(coleccion.id)}
        initial="reposo"
        whileHover="activo"
        whileTap={{ scale: 0.97 }}
        transition={springPress}
        className="flex h-full w-full flex-col gap-3 rounded-tarjeta bg-surface-1 p-5 text-left shadow-anillo outline-none transition-colors duration-150 ease-umbral hover:bg-tinta/[.02] focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <motion.span
              variants={reducido ? undefined : { reposo: { y: 0, rotate: 0 }, activo: { y: -3, rotate: -6 } }}
              transition={springRebote}
              className={
                grupo.tono === 'riesgo' ? 'text-status-red' : grupo.tono === 'acento' ? 'text-accent-fg' : 'text-text-2'
              }
            >
              <Icono size={20} strokeWidth={1.75} aria-hidden />
            </motion.span>
            <span className="truncate font-ui text-15 font-medium text-text-1">{coleccion.nombre}</span>
          </span>
          {coleccion.sensible && <StatusPill label={copy.grupoPrivado} tone="red" />}
        </span>
        <span className="line-clamp-2 flex-1 font-ui text-14 leading-snug text-text-2">{coleccion.descripcion}</span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 font-ui text-13 tabular-nums text-text-2">
          <span className="font-medium text-text-1">{copy.archivos(coleccion.archivos.length)}</span>
          {coleccion.archivos.length > 0 && <span>{tamanoLegible(total)}</span>}
          {ultima && <span>{copy.actualizado(formatoFechaCorta(ultima))}</span>}
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
