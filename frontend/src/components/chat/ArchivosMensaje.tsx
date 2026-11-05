import { lazy, memo, Suspense, useCallback, useEffect, useState, type MouseEvent } from 'react';
import { VisorImagen } from '../VisorImagen';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileText, ImageOff, Presentation, ScrollText, X, type LucideIcon } from 'lucide-react';
import type { ArchivoCompartido } from '../../types';
import { cn } from '../../lib/cn';
import { tamanoLegible } from '../../lib/fechas';
import { dur, ease, salidaPanel, springPanel, springPress } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { descargarBlob, guardarEnDisco } from '../../services/corpus.service';
import { Backdrop, IconButton, useToast } from '../ui';
import { copyLocal } from './copyLocal';

// El visor arrastra react-pdf: solo se descarga la primera vez que se abre un archivo.
const VisorArchivo = lazy(() => import('../admin/corpus/VisorArchivo').then((m) => ({ default: m.VisorArchivo })));

/**
 * Material que el agente mandó con `compartir_archivo`: una tarjeta por
 * archivo debajo de la respuesta. Clic → se lee aquí mismo, en un visor
 * encima del chat; el icono de la derecha lo descarga.
 *
 * La tarjeta no trae el archivo: trae su ruta. Abrir o descargar vuelve a pedir
 * `GET /api/archivos?ruta=…`, y el servidor revisa otra vez la lista blanca.
 */
export const ArchivosMensaje = memo(function ArchivosMensaje({
  archivos,
  className,
}: {
  archivos: ArchivoCompartido[];
  className?: string;
}) {
  const [abierto, setAbierto] = useState<ArchivoCompartido | null>(null);
  const reducido = useReducedMotion();
  if (!archivos.length) return null;
  // Las imágenes van en galería (verlas es el punto); el resto, como tarjetas.
  const imagenes = archivos.filter((a) => a.formato === 'imagen');
  const documentos = archivos.filter((a) => a.formato !== 'imagen');

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {imagenes.length > 0 && <GaleriaImagenes imagenes={imagenes} />}
      {documentos.length > 0 && (
      <ul aria-label={copyLocal.archivosEtiqueta} className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {documentos.map((a) => (
            <motion.li
              key={a.ruta}
              layout="position"
              initial={reducido ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={reducido ? { duration: dur.fast, ease } : springPanel}
            >
              <TarjetaArchivo archivo={a} onAbrir={() => setAbierto(a)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      )}
      <VisorEmergente archivo={abierto} onCerrar={() => setAbierto(null)} />
    </div>
  );
});

/**
 * Imágenes que mandó el agente (p. ej. un PDF pasado a PNG): cuadrícula de
 * miniaturas. Cada una se pide con el token (un `src` directo no lo lleva) y
 * vive como object URL mientras la galería exista.
 */
function GaleriaImagenes({ imagenes }: { imagenes: ArchivoCompartido[] }) {
  const { push } = useToast();
  const [vista, setVista] = useState<{ src: string; alt: string } | null>(null);
  const [descargando, setDescargando] = useState(false);

  const descargarTodas = async () => {
    setDescargando(true);
    try {
      for (const a of imagenes) await guardarEnDisco({ ruta: a.ruta, nombre: a.nombre, tipo: 'imagen' }, 'chat');
    } catch {
      push({ message: copyLocal.descargaFallo, tone: 'error' });
    } finally {
      setDescargando(false);
    }
  };

  return (
    <section aria-label={copyLocal.galeriaEtiqueta(imagenes.length)} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <p className="font-ui text-13 text-text-2">{copyLocal.galeriaEtiqueta(imagenes.length)}</p>
        {imagenes.length > 1 && (
          <button
            type="button"
            onClick={descargarTodas}
            disabled={descargando}
            className="flex h-8 items-center gap-1.5 rounded-celda px-2 font-ui text-13 font-medium text-text-2 transition-colors duration-[120ms] hover:bg-tinta/[.05] hover:text-text-1 disabled:opacity-60"
          >
            <Download size={14} aria-hidden className={cn(descargando && 'animate-pulse')} />
            {copyLocal.descargarTodas}
          </button>
        )}
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {imagenes.map((a, i) => (
          <MiniaturaRemota key={a.ruta} archivo={a} orden={i} onAbrir={setVista} />
        ))}
      </ul>
      <VisorImagen src={vista?.src ?? null} alt={vista?.alt} onCerrar={() => setVista(null)} />
    </section>
  );
}

function MiniaturaRemota({
  archivo,
  orden,
  onAbrir,
}: {
  archivo: ArchivoCompartido;
  orden: number;
  onAbrir: (v: { src: string; alt: string }) => void;
}) {
  const reducido = useReducedMotion();
  const [url, setUrl] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    const control = new AbortController();
    let creada: string | null = null;
    descargarBlob(archivo.ruta, control.signal, 'chat')
      .then((blob) => {
        creada = URL.createObjectURL(blob);
        setUrl(creada);
      })
      .catch(() => {
        if (!control.signal.aborted) setFallo(true);
      });
    return () => {
      control.abort();
      if (creada) URL.revokeObjectURL(creada);
    };
  }, [archivo.ruta]);

  return (
    <motion.li
      initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducido ? { duration: dur.fast, ease } : { ...springPanel, delay: Math.min(orden, 12) * 0.02 }}
    >
      <button
        type="button"
        onClick={() => url && onAbrir({ src: url, alt: archivo.nombre })}
        disabled={!url}
        title={`${archivo.nombre} · ${tamanoLegible(archivo.tamanoBytes)}`}
        aria-label={copyLocal.abrirArchivo(archivo.nombre)}
        className="group/mini relative block aspect-[4/3] w-full overflow-hidden rounded-control bg-bg shadow-anillo outline-none transition-shadow duration-150 ease-umbral enabled:hover:shadow-menu focus-visible:ring-2 focus-visible:ring-accent"
      >
        {url ? (
          <img src={url} alt="" draggable={false} className="h-full w-full object-cover transition-transform duration-300 ease-umbral group-hover/mini:scale-[1.03]" />
        ) : fallo ? (
          <span className="flex h-full w-full items-center justify-center text-text-3">
            <ImageOff size={18} aria-hidden />
          </span>
        ) : (
          <span className="block h-full w-full animate-pulse bg-tinta/[.04]" aria-hidden />
        )}
        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/50 to-transparent px-2 pb-1 pt-4 text-left font-ui text-12 text-white opacity-0 transition-opacity duration-150 group-hover/mini:opacity-100 group-focus-visible/mini:opacity-100">
          {archivo.nombre}
        </span>
      </button>
    </motion.li>
  );
}

const ICONOS: Record<string, LucideIcon> = { pdf: FileText, html: Presentation, txt: ScrollText, md: ScrollText };

function TarjetaArchivo({ archivo, onAbrir }: { archivo: ArchivoCompartido; onAbrir: () => void }) {
  const { push } = useToast();
  const [descargando, setDescargando] = useState(false);
  const Icono = ICONOS[archivo.formato] ?? FileText;

  const descargar = async (e: MouseEvent) => {
    e.stopPropagation();
    setDescargando(true);
    try {
      await guardarEnDisco({ ruta: archivo.ruta, nombre: archivo.nombre, tipo: archivo.formato }, 'chat');
    } catch {
      push({ message: copyLocal.descargaFallo, tone: 'error' });
    } finally {
      setDescargando(false);
    }
  };

  return (
    // Radios anidados: tarjeta 14 con 8 de aire → la ficha del icono lleva 6.
    <div className="group/tarjeta relative flex w-full max-w-[380px] items-center gap-3 rounded-menu bg-surface-1 p-2 pr-1.5 shadow-anillo transition-shadow duration-150 ease-umbral hover:shadow-menu">
      <motion.button
        type="button"
        onClick={onAbrir}
        whileTap={{ scale: 0.985 }}
        transition={springPress}
        aria-label={copyLocal.abrirArchivo(archivo.nombre)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xs text-left outline-none after:absolute after:inset-0 after:rounded-menu focus-visible:after:ring-2 focus-visible:after:ring-accent"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xs bg-accent-soft text-accent-fg">
          <Icono size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-ui text-14 font-medium text-text-1">{archivo.nombre}</span>
          <span className="block truncate font-ui text-12 tabular-nums text-text-3">
            {copyLocal.formatoArchivo[archivo.formato] ?? copyLocal.formatoArchivo.otro} · {tamanoLegible(archivo.tamanoBytes)} · {archivo.coleccion}
          </span>
        </span>
      </motion.button>
      <IconButton
        aria-label={copyLocal.descargarArchivo(archivo.nombre)}
        title={copyLocal.descargarArchivo(archivo.nombre)}
        onClick={descargar}
        disabled={descargando}
        className="relative z-10 h-9 w-9 shrink-0 rounded-full"
      >
        <Download size={16} className={cn(descargando && 'animate-pulse')} aria-hidden />
      </IconButton>
    </div>
  );
}

/** El archivo, leído encima del chat. Escape o clic fuera lo cierran. */
function VisorEmergente({ archivo, onCerrar }: { archivo: ArchivoCompartido | null; onCerrar: () => void }) {
  const reducido = useReducedMotion();
  const cerrar = useCallback(() => onCerrar(), [onCerrar]);

  useEffect(() => {
    if (!archivo) return;
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alTeclado);
    return () => document.removeEventListener('keydown', alTeclado);
  }, [archivo, cerrar]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {archivo && (
        <motion.div
          className="fixed inset-0 z-[1200] flex items-center justify-center p-3 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: salidaPanel }}
          transition={{ duration: dur.base, ease }}
        >
          <Backdrop onClick={cerrar} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={archivo.nombre}
            initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8, transition: salidaPanel }}
            transition={reducido ? { duration: dur.fast, ease } : springPanel}
            className="relative z-10 flex h-full max-h-[900px] w-full max-w-4xl"
          >
            <Suspense fallback={<div className="h-full w-full rounded-tarjeta bg-surface-1 shadow-3" />}>
              <VisorArchivo
                origen="chat"
                archivo={{
                  ruta: archivo.ruta,
                  nombre: archivo.nombre,
                  tipo: archivo.formato,
                  tamanoBytes: archivo.tamanoBytes,
                  modificado: '',
                }}
                subtitulo={`${copyLocal.formatoArchivo[archivo.formato] ?? copyLocal.formatoArchivo.otro} · ${tamanoLegible(archivo.tamanoBytes)} · ${archivo.coleccion}`}
                accion={
                  <IconButton aria-label={copyLocal.cerrarVisor} onClick={cerrar} className="h-9 w-9 shrink-0 rounded-full">
                    <X size={18} aria-hidden />
                  </IconButton>
                }
                className="h-full w-full rounded-tarjeta border-0 shadow-3"
              />
            </Suspense>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
