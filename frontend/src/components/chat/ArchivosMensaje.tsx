import { lazy, memo, Suspense, useCallback, useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, FileText, Presentation, ScrollText, X, type LucideIcon } from 'lucide-react';
import type { ArchivoCompartido } from '../../types';
import { cn } from '../../lib/cn';
import { tamanoLegible } from '../../lib/fechas';
import { dur, ease, salidaPanel, springPanel, springPress } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { guardarEnDisco } from '../../services/corpus.service';
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

  return (
    <>
      <ul aria-label={copyLocal.archivosEtiqueta} className={cn('flex flex-col gap-2', className)}>
        <AnimatePresence initial={false}>
          {archivos.map((a) => (
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
      <VisorEmergente archivo={abierto} onCerrar={() => setAbierto(null)} />
    </>
  );
});

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
    <div className="group relative flex w-full max-w-[380px] items-center gap-3 rounded-menu bg-surface-1 p-2 pr-1.5 shadow-anillo transition-shadow duration-150 ease-umbral hover:shadow-menu">
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
