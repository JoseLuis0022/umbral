import { memo } from 'react';
import { motion } from 'framer-motion';
import { Folder } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { dur, ease, springSnappy } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { formatoFechaCorta, tamanoLegible } from '../../../lib/fechas';
import { ElementoCarril, ListaCarril } from '../../shell';
import { Skeleton } from '../../ui';
import type { ArchivoCorpus } from '../../../services/corpus.service';
import { corpus as copyCorpus } from '../../../copy';

const ACENTOS: Record<string, string> = { practica: 'Práctica', clase: 'Clase', tema: 'Tema', examen: 'Examen' };

/**
 * Nombre para leer, no para el disco: `clase-02.md` → "Clase 2",
 * `Tema 05 - Filtrado espacial.html` → "Tema 5 · Filtrado espacial".
 * El nombre real sigue en el `title` de la fila.
 */
export function tituloLegible(nombre: string): string {
  const sinExt = nombre.replace(/\.[a-z0-9]+$/i, '');
  const kebab = sinExt.match(/^([a-záéíóú]+)[-_ ]0*(\d+)$/i);
  if (kebab) {
    const palabra = kebab[1].toLowerCase();
    return `${ACENTOS[palabra] ?? palabra[0].toUpperCase() + palabra.slice(1)} ${kebab[2]}`;
  }
  const conTitulo = sinExt.match(/^(Tema|Clase|Práctica|Practica)\s+0*(\d+)\s*[-–]\s*(.+)$/i);
  if (conTitulo) return `${conTitulo[1]} ${conTitulo[2]} · ${conTitulo[3]}`;
  return sinExt.replace(/_/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

/** Subcarpeta del archivo debajo de `base` ("Práctica 4", "Apunte del profesor"); '' si cuelga directo. */
function subcarpeta(ruta: string, base: string): string {
  const resto = base && ruta.startsWith(base + '/') ? ruta.slice(base.length + 1) : ruta;
  return resto.split('/').slice(0, -1).join(' / ');
}

/**
 * Lista de archivos de una colección, agrupada por subcarpeta con cabeceras
 * fijas: en Prácticas o Diapositivas, la carpeta ES la información ("Práctica
 * 4"), y repetirla en cada fila era ruido. La extensión va escrita (MD, PDF…):
 * en una lista mezclada es lo que distingue un resumen de su PDF original.
 *
 * `etiqueta` (búsqueda global) pinta de qué colección viene cada archivo.
 */
export function ListaArchivos({
  archivos,
  activo,
  onSeleccionar,
  base = '',
  etiqueta,
}: {
  archivos: ArchivoCorpus[];
  activo: string | null;
  onSeleccionar: (archivo: ArchivoCorpus) => void;
  /** Carpeta de la colección: lo que cuelga de ella se agrupa por subcarpeta. */
  base?: string;
  etiqueta?: (archivo: ArchivoCorpus) => string;
}) {
  const grupos: { carpeta: string; archivos: ArchivoCorpus[] }[] = [];
  if (etiqueta) {
    grupos.push({ carpeta: '', archivos });
  } else {
    for (const a of archivos) {
      const carpeta = subcarpeta(a.ruta, base);
      const grupo = grupos.find((g) => g.carpeta === carpeta);
      if (grupo) grupo.archivos.push(a);
      else grupos.push({ carpeta, archivos: [a] });
    }
    // Lo que cuelga directo de la colección va primero; luego las subcarpetas.
    grupos.sort((x, y) => (x.carpeta === '' ? -1 : y.carpeta === '' ? 1 : x.carpeta.localeCompare(y.carpeta, 'es', { numeric: true })));
  }
  const conCabeceras = grupos.length > 1 || (grupos[0]?.carpeta ?? '') !== '';

  return (
    <div className="flex flex-col">
      {grupos.map((g) => (
        <section key={g.carpeta || '·'} aria-label={g.carpeta || undefined}>
          {conCabeceras && (
            <h3 className="sticky top-0 z-20 flex items-center gap-2 border-b border-hairline bg-surface-1/95 px-4 py-2 font-ui text-12 font-medium text-text-2 backdrop-blur">
              <Folder size={13} strokeWidth={2} aria-hidden className="shrink-0 text-text-3" />
              <span className="truncate">{g.carpeta || copyCorpus.raiz}</span>
              <span className="ml-auto tabular-nums text-text-3">{g.archivos.length}</span>
            </h3>
          )}
          <ul className="flex flex-col">
            {g.archivos.map((a) => (
              <FilaArchivo
                key={a.ruta}
                archivo={a}
                secundario={etiqueta?.(a) ?? ''}
                activo={a.ruta === activo}
                onSeleccionar={onSeleccionar}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const FilaArchivo = memo(function FilaArchivo({
  archivo,
  secundario,
  activo,
  onSeleccionar,
}: {
  archivo: ArchivoCorpus;
  /** Línea extra bajo el título (la colección, en la búsqueda global). */
  secundario: string;
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
        <EtiquetaTipo tipo={archivo.tipo} nombre={archivo.nombre} activo={activo} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-ui text-13 font-medium text-text-1" title={archivo.ruta}>
            {tituloLegible(archivo.nombre)}
          </span>
          {secundario && <span className="truncate font-ui text-12 text-text-3">{secundario}</span>}
          <span className="mt-0.5 flex items-center justify-between gap-2 font-ui text-12 tabular-nums text-text-3">
            <span>{formatoFechaCorta(archivo.modificado)}</span>
            <span>{tamanoLegible(archivo.tamanoBytes)}</span>
          </span>
        </span>
      </button>
    </li>
  );
});

/** La extensión real cuando no es un tipo conocido (ZIP, M, MAT…): "···" no decía nada. */
const extension = (nombre: string) => (nombre.match(/\.([a-z0-9]{1,4})$/i)?.[1] ?? '···').toUpperCase();

function EtiquetaTipo({ tipo, nombre, activo }: { tipo: ArchivoCorpus['tipo']; nombre: string; activo: boolean }) {
  return (
    <span
      className={cn(
        'mt-0.5 flex h-7 w-10 shrink-0 items-center justify-center rounded-celda font-ui text-12 font-semibold uppercase',
        activo ? 'bg-surface-1 text-text-2' : 'bg-bg text-text-3'
      )}
    >
      {tipo === 'otro' ? extension(nombre) : tipo === 'imagen' ? 'img' : tipo}
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
          etiqueta={`${tituloLegible(a.nombre)}\n${tamanoLegible(a.tamanoBytes)}`}
          activo={a.ruta === activo}
          onClick={() => onSeleccionar(a)}
        >
          <EtiquetaTipo tipo={a.tipo} nombre={a.nombre} activo={a.ruta === activo} />
        </ElementoCarril>
      ))}
    </ListaCarril>
  );
}
