import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../../lib/cn';
import { dur, ease, springSnappy } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { formatoFechaCorta, tamanoLegible } from '../../../lib/fechas';
import { ElementoCarril, ListaCarril } from '../../shell';
import { Skeleton } from '../../ui';
import type { ArchivoCorpus } from '../../../services/corpus.service';

/** Carpeta común de todos los archivos (la raíz de la colección). */
function carpetaComun(archivos: ArchivoCorpus[]): string[] {
  if (archivos.length === 0) return [];
  let comun = archivos[0].ruta.split('/').slice(0, -1);
  for (const a of archivos) {
    const partes = a.ruta.split('/').slice(0, -1);
    let i = 0;
    while (i < comun.length && comun[i] === partes[i]) i++;
    comun = comun.slice(0, i);
  }
  return comun;
}

/** Carpeta del archivo dentro de su colección, para distinguir "Práctica 3/…" de "Práctica 5/…". */
function subcarpeta(ruta: string, base: number): string {
  return ruta.split('/').slice(base, -1).join(' / ');
}

/**
 * Lista de archivos de una colección. La extensión va escrita (MD, TXT, HTML,
 * PDF) y no como icono genérico: en una lista mezclada es lo que distingue un
 * resumen de su PDF original.
 */
export function ListaArchivos({
  archivos,
  activo,
  onSeleccionar,
}: {
  archivos: ArchivoCorpus[];
  activo: string | null;
  onSeleccionar: (archivo: ArchivoCorpus) => void;
}) {
  const base = carpetaComun(archivos).length;
  return (
    <ul className="flex flex-col">
      {archivos.map((a) => (
        <FilaArchivo
          key={a.ruta}
          archivo={a}
          carpeta={subcarpeta(a.ruta, base)}
          activo={a.ruta === activo}
          onSeleccionar={onSeleccionar}
        />
      ))}
    </ul>
  );
}

const FilaArchivo = memo(function FilaArchivo({
  archivo,
  carpeta,
  activo,
  onSeleccionar,
}: {
  archivo: ArchivoCorpus;
  carpeta: string;
  activo: boolean;
  onSeleccionar: (archivo: ArchivoCorpus) => void;
}) {
  const reducido = useReducedMotion();

  return (
    <li className="relative border-b border-hairline last:border-b-0">
      {activo && (
        <motion.span
          layoutId="corpus-seleccion"
          transition={reducido ? { duration: dur.fast, ease } : springSnappy}
          className="absolute inset-y-0 left-0 z-10 w-[3px] bg-accent"
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={() => onSeleccionar(archivo)}
        aria-current={activo ? 'true' : undefined}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150',
          'focus-visible:relative focus-visible:z-20',
          activo ? 'bg-accent-soft' : 'hover:bg-bg'
        )}
      >
        <EtiquetaTipo tipo={archivo.tipo} activo={activo} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-ui text-13 font-medium text-text-1" title={archivo.nombre}>
            {archivo.nombre}
          </span>
          {carpeta && <span className="truncate font-ui text-12 text-text-3">{carpeta}</span>}
          <span className="mt-0.5 flex items-center justify-between gap-2 font-ui text-12 tabular-nums text-text-3">
            <span>{formatoFechaCorta(archivo.modificado)}</span>
            <span>{tamanoLegible(archivo.tamanoBytes)}</span>
          </span>
        </span>
      </button>
    </li>
  );
});

function EtiquetaTipo({ tipo, activo }: { tipo: ArchivoCorpus['tipo']; activo: boolean }) {
  return (
    <span
      className={cn(
        'mt-0.5 flex h-7 w-10 shrink-0 items-center justify-center rounded-celda font-ui text-12 font-semibold uppercase',
        activo ? 'bg-surface-1 text-text-2' : 'bg-bg text-text-3'
      )}
    >
      {tipo === 'otro' ? '···' : tipo}
    </span>
  );
}

export function EsqueletoArchivos({ filas = 8 }: { filas?: number }) {
  return (
    <div aria-hidden className="flex flex-col">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 border-b border-hairline px-4 py-2.5">
          <Skeleton className="mt-0.5 h-7 w-10 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className={cn('h-3.5', i % 3 === 0 ? 'w-48' : i % 3 === 1 ? 'w-36' : 'w-56')} />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** El panel plegado: la etiqueta de tipo de cada archivo, con su nombre en la ayuda. */
export function CarrilArchivos({
  archivos,
  cargando,
  activo,
  onSeleccionar,
}: {
  archivos: ArchivoCorpus[];
  cargando: boolean;
  activo: string | null;
  onSeleccionar: (archivo: ArchivoCorpus) => void;
}) {
  if (cargando) {
    return (
      <ul aria-hidden className="flex flex-col gap-0.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex h-11 items-center justify-center">
            <Skeleton className="h-7 w-10" />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ListaCarril>
      {archivos.map((a) => (
        <ElementoCarril
          key={a.ruta}
          idSeleccion="corpus-carril-seleccion"
          etiqueta={`${a.nombre}\n${tamanoLegible(a.tamanoBytes)}`}
          activo={a.ruta === activo}
          onClick={() => onSeleccionar(a)}
        >
          <EtiquetaTipo tipo={a.tipo} activo={a.ruta === activo} />
        </ElementoCarril>
      ))}
    </ListaCarril>
  );
}
