import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, FolderOpen, Search, SearchX, X } from 'lucide-react';
import { Banner, EmptyState, ErrorState, Input, PageEnter } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import { PanelPlegable } from '../components/shell';
import {
  CarpetasCorpus,
  CarrilArchivos,
  EsqueletoArchivos,
  EsqueletoCarpetas,
  ListaArchivos,
  VisorArchivo,
} from '../components/admin/corpus';
import { cn } from '../lib/cn';
import { springSnappy } from '../lib/motion';
import { listarColecciones, type ArchivoCorpus, type ColeccionCorpus } from '../services/corpus.service';
import { corpus as copy } from '../copy';

/** Clave propia de esta pantalla: plegar aquí no pliega Auditoría ni el Laboratorio. */
const CLAVE_PLEGADO = 'panel-plegado:corpus';

type EstadoCarga = 'cargando' | 'listo' | 'error';

/** Sin acentos y en minúsculas: buscar "practica" encuentra "Práctica". */
const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Corpus (/admin/corpus): lo que el agente tiene en su carpeta, de verdad.
 *
 * Dos niveles, como un explorador de archivos:
 *
 *  1. PORTADA (`/admin/corpus`): las carpetas como tarjetas, agrupadas por lo
 *     que significan (material del curso, memoria del agente, privado), y un
 *     buscador que recorre TODAS las carpetas.
 *  2. CARPETA (`/admin/corpus?c=apuntes`): sus archivos agrupados por
 *     subcarpeta a la izquierda y el archivo abierto a la derecha.
 *
 * La carpeta abierta vive en la URL: "Atrás" del navegador vuelve a la
 * portada y un enlace abre directo la carpeta.
 *
 * Solo lectura: subir o borrar aquí desincronizaría la carpeta de lo que el
 * agente procesó.
 */
export default function AdminCorpus() {
  const [colecciones, setColecciones] = useState<ColeccionCorpus[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [intento, setIntento] = useState(0);
  const [params, setParams] = useSearchParams();
  const coleccionId = params.get('c') ?? '';
  const [busqueda, setBusqueda] = useState('');
  const [activo, setActivo] = useState<ArchivoCorpus | null>(null);
  const [vistaMovil, setVistaMovil] = useState<'lista' | 'visor'>('lista');

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');
    listarColecciones()
      .then((lista) => {
        if (!vigente) return;
        setColecciones(lista);
        setEstado('listo');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const coleccion = colecciones.find((c) => c.id === coleccionId) ?? null;
  const totalArchivos = colecciones.reduce((n, c) => n + c.archivos.length, 0);
  const q = normalizar(busqueda.trim());

  const visibles = useMemo(() => {
    if (!coleccion) return [];
    return q ? coleccion.archivos.filter((a) => normalizar(a.ruta).includes(q)) : coleccion.archivos;
  }, [coleccion, q]);

  // Búsqueda de la portada: en todas las carpetas a la vez.
  const resultadosGlobales = useMemo(() => {
    if (coleccion || !q) return [];
    return colecciones.flatMap((c) => c.archivos.filter((a) => normalizar(a.ruta).includes(q)));
  }, [coleccion, colecciones, q]);
  const nombreColeccion = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const c of colecciones) for (const a of c.archivos) mapa.set(a.ruta, c.nombre);
    return (a: ArchivoCorpus) => mapa.get(a.ruta) ?? '';
  }, [colecciones]);

  const abrirColeccion = useCallback(
    (id: string, archivo: ArchivoCorpus | null = null) => {
      setParams(id ? { c: id } : {});
      setBusqueda('');
      setActivo(archivo);
      setVistaMovil(archivo ? 'visor' : 'lista');
    },
    [setParams]
  );

  const seleccionar = useCallback((archivo: ArchivoCorpus) => {
    setActivo(archivo);
    setVistaMovil('visor');
  }, []);

  const abrirResultado = useCallback(
    (archivo: ArchivoCorpus) => {
      const duena = colecciones.find((c) => c.archivos.some((a) => a.ruta === archivo.ruta));
      if (duena) abrirColeccion(duena.id, archivo);
    },
    [colecciones, abrirColeccion]
  );

  const cargando = estado === 'cargando';

  const buscador = (
    <div className="relative">
      <Search
        size={16}
        strokeWidth={2}
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-text-3"
      />
      <Input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        aria-label={copy.buscar}
        placeholder={coleccion ? copy.buscarPlaceholder : copy.buscarTodo}
        className="pl-9 pr-9 text-14"
        disabled={cargando}
      />
      <AnimatePresence>
        {busqueda && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={springSnappy}
            onClick={() => setBusqueda('')}
            aria-label={copy.quitarBusqueda}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-control text-text-3 transition-colors hover:bg-accent-soft hover:text-accent-fg"
          >
            <X size={14} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );

  // ── Error y vacío: iguales en los dos niveles ──
  if (estado === 'error' || (estado === 'listo' && totalArchivos === 0)) {
    return (
      <PageEnter className="flex h-full flex-col">
        <PageHeader compacto title={copy.titulo} subtitle={copy.subtitulo} />
        <div className="rounded-tarjeta border border-hairline bg-surface-1 shadow-1">
          {estado === 'error' ? (
            <ErrorState title={copy.errorLista} description={copy.errorListaDetalle} onRetry={() => setIntento((n) => n + 1)} />
          ) : (
            <EmptyState icon={FolderOpen} title={copy.vacioTitulo} description={copy.vacioDetalle} />
          )}
        </div>
      </PageEnter>
    );
  }

  // ── Nivel 1: portada de carpetas ──
  // PageEnter envuelve a cada hijo en su propio contenedor animado: sin pasarle
  // al último `flex-1 min-h-0`, el área con scroll crecía con su contenido y
  // la página no se podía desplazar hasta las carpetas de abajo.
  if (!coleccion) {
    return (
      <PageEnter className="flex h-full flex-col [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1 [&>*:last-child]:flex-col">
        <PageHeader compacto title={copy.titulo} subtitle={copy.subtitulo} />
        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-8 pt-1">
          <div className="mb-6 max-w-md">{buscador}</div>
          {cargando ? (
            <EsqueletoCarpetas />
          ) : q ? (
            <section aria-label={copy.resultados(resultadosGlobales.length)} className="overflow-hidden rounded-tarjeta bg-surface-1 shadow-anillo">
              <p className="border-b border-hairline px-4 py-2.5 font-ui text-12 font-medium text-text-2">
                {copy.resultados(resultadosGlobales.length)}
              </p>
              {resultadosGlobales.length ? (
                <ListaArchivos archivos={resultadosGlobales} activo={null} onSeleccionar={abrirResultado} etiqueta={nombreColeccion} />
              ) : (
                <EmptyState icon={SearchX} title={copy.sinResultados} description={copy.sinResultadosDetalle} />
              )}
            </section>
          ) : (
            <CarpetasCorpus colecciones={colecciones} onAbrir={abrirColeccion} />
          )}
          <p className="mt-8 font-ui text-12 text-text-3">{copy.soloLectura}</p>
        </div>
      </PageEnter>
    );
  }

  // ── Nivel 2: una carpeta abierta ──
  return (
    <PageEnter className="flex h-full flex-col [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1">
      <nav aria-label={copy.carpetas} className="mb-4 flex min-w-0 items-center gap-1 font-ui text-14">
        <button
          type="button"
          onClick={() => abrirColeccion('')}
          className="-ml-2 flex h-8 items-center gap-1 rounded-celda px-2 text-text-2 transition-colors duration-[120ms] hover:bg-tinta/[.05] hover:text-text-1"
          aria-label={copy.volverCarpetas}
        >
          <ChevronLeft size={16} aria-hidden className="lg:hidden" />
          {copy.titulo}
        </button>
        <ChevronRight size={14} aria-hidden className="hidden shrink-0 text-text-3 lg:block" />
        <h1 className="truncate px-1 font-medium text-text-1">{coleccion.nombre}</h1>
      </nav>

      <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <PanelPlegable
          clave={CLAVE_PLEGADO}
          ancho={{ lg: 360, xl: 400 }}
          textoPlegar={copy.plegarLista}
          textoDesplegar={copy.desplegarLista}
          carril={
            <CarrilArchivos archivos={visibles} cargando={cargando} activo={activo?.ruta ?? null} onSeleccionar={seleccionar} />
          }
        >
          <section
            aria-label={coleccion.nombre}
            className={cn(
              'min-h-0 flex-col overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1 lg:h-full',
              vistaMovil === 'visor' ? 'hidden lg:flex' : 'flex'
            )}
          >
            <div className="flex flex-col gap-2 border-b border-hairline px-3 py-3">
              <div className="lg:pr-12">{buscador}</div>
              {coleccion.sensible && <Banner tone="red">{copy.sensibleDetalle}</Banner>}
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
              {cargando ? (
                <EsqueletoArchivos />
              ) : visibles.length === 0 ? (
                busqueda ? (
                  <EmptyState icon={SearchX} title={copy.sinResultados} description={copy.sinResultadosDetalle} />
                ) : (
                  <EmptyState icon={FolderOpen} title={copy.coleccionVacia} />
                )
              ) : (
                <ListaArchivos archivos={visibles} activo={activo?.ruta ?? null} onSeleccionar={seleccionar} base={coleccion.carpeta} />
              )}
            </div>

            <footer className="shrink-0 border-t border-hairline px-4 py-2 font-ui text-12 leading-snug text-text-3">
              {copy.archivos(visibles.length)}. {copy.soloLectura}
            </footer>
          </section>
        </PanelPlegable>

        <VisorArchivo
          archivo={activo}
          onVolver={() => setVistaMovil('lista')}
          className={vistaMovil === 'lista' ? 'hidden lg:flex' : 'flex'}
        />
      </div>
    </PageEnter>
  );
}
