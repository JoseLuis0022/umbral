import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderOpen, Library, Lock, Search, SearchX, X } from 'lucide-react';
import {
  Banner,
  EmptyState,
  ErrorState,
  Input,
  PageEnter,
  SelectorLista,
  Skeleton,
  StatusPill,
  type OpcionLista,
} from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import { PanelPlegable } from '../components/shell';
import { CarrilArchivos, EsqueletoArchivos, ListaArchivos, VisorArchivo } from '../components/admin/corpus';
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
 * A la izquierda, la colección (resúmenes de clase, apuntes, transcripciones,
 * diapositivas, prácticas…) y sus archivos; a la derecha, el archivo abierto.
 * El visor se lleva el ancho porque la tarea es LEER qué sabe el agente.
 *
 * Solo lectura: subir o borrar aquí desincronizaría la carpeta de lo que el
 * agente procesó. La pantalla lo dice en una línea en lugar de esconder los
 * botones sin explicación.
 */
export default function AdminCorpus() {
  const [colecciones, setColecciones] = useState<ColeccionCorpus[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [intento, setIntento] = useState(0);
  const [coleccionId, setColeccionId] = useState<string>('');
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
        // La primera colección con archivos: abrir en una vacía se lee como
        // "aquí no hay nada" aunque la carpeta esté llena.
        setColeccionId((previa) =>
          lista.some((c) => c.id === previa) ? previa : (lista.find((c) => c.archivos.length > 0) ?? lista[0])?.id ?? ''
        );
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

  const visibles = useMemo(() => {
    if (!coleccion) return [];
    const q = normalizar(busqueda.trim());
    return q ? coleccion.archivos.filter((a) => normalizar(a.ruta).includes(q)) : coleccion.archivos;
  }, [coleccion, busqueda]);

  const opciones = useMemo<OpcionLista<ColeccionCorpus>[]>(
    () => colecciones.map((c) => ({ valor: c.id, texto: c.nombre, dato: c })),
    [colecciones]
  );

  const seleccionar = useCallback((archivo: ArchivoCorpus) => {
    setActivo(archivo);
    setVistaMovil('visor');
  }, []);

  const cambiarColeccion = useCallback((id: string) => {
    setColeccionId(id);
    setBusqueda('');
  }, []);

  const cargando = estado === 'cargando';

  return (
    <PageEnter className="flex h-full flex-col [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1">
      <PageHeader compacto title={copy.titulo} subtitle={copy.subtitulo} />

      {estado === 'error' ? (
        <div className="rounded-tarjeta border border-hairline bg-surface-1 shadow-1">
          <ErrorState title={copy.errorLista} description={copy.errorListaDetalle} onRetry={() => setIntento((n) => n + 1)} />
        </div>
      ) : estado === 'listo' && totalArchivos === 0 ? (
        <div className="rounded-tarjeta border border-hairline bg-surface-1 shadow-1">
          <EmptyState icon={FolderOpen} title={copy.vacioTitulo} description={copy.vacioDetalle} />
        </div>
      ) : (
        <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
          <PanelPlegable
            clave={CLAVE_PLEGADO}
            ancho={{ lg: 360, xl: 400 }}
            textoPlegar={copy.plegarLista}
            textoDesplegar={copy.desplegarLista}
            carril={
              <CarrilArchivos
                archivos={visibles}
                cargando={cargando}
                activo={activo?.ruta ?? null}
                onSeleccionar={seleccionar}
              />
            }
          >
            <section
              aria-label={copy.titulo}
              className={cn(
                'min-h-0 flex-col rounded-tarjeta border border-hairline bg-surface-1 shadow-1 lg:h-full',
                vistaMovil === 'visor' ? 'hidden lg:flex' : 'flex'
              )}
            >
              <div className="flex flex-col gap-2 border-b border-hairline px-3 py-3">
                <div className="lg:pr-12">
                  {cargando ? (
                    <Skeleton className="h-9 w-full rounded-control" />
                  ) : (
                    <SelectorLista
                      opciones={opciones}
                      valor={coleccionId}
                      onCambiar={cambiarColeccion}
                      etiqueta={copy.coleccion}
                      tituloHoja={copy.coleccionTitulo}
                      className="w-full"
                      renderDisparador={(o) => (
                        <>
                          {o.dato.sensible ? (
                            <Lock size={16} strokeWidth={2} aria-hidden className="shrink-0 text-status-red" />
                          ) : (
                            <Library size={16} strokeWidth={2} aria-hidden className="shrink-0 text-text-3" />
                          )}
                          <span className="truncate">{o.dato.nombre}</span>
                          <span className="ml-auto shrink-0 pl-2 font-ui text-12 tabular-nums text-text-3">
                            {o.dato.archivos.length}
                          </span>
                        </>
                      )}
                      renderOpcion={(o) => (
                        <span className="flex min-w-0 flex-col">
                          <span className="flex items-center gap-2 font-ui text-14 font-medium text-text-1">
                            <span className="truncate">{o.dato.nombre}</span>
                            {o.dato.sensible && <StatusPill label={copy.sensible} tone="red" />}
                          </span>
                          <span className="font-ui text-12 text-text-2">
                            {copy.archivos(o.dato.archivos.length)} · {o.dato.descripcion}
                          </span>
                        </span>
                      )}
                    />
                  )}
                </div>
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
                    placeholder={copy.buscarPlaceholder}
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
                {coleccion?.sensible && <Banner tone="red">{copy.sensibleDetalle}</Banner>}
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
                  <ListaArchivos archivos={visibles} activo={activo?.ruta ?? null} onSeleccionar={seleccionar} />
                )}
              </div>

              <footer className="shrink-0 border-t border-hairline px-4 py-2 font-ui text-12 leading-snug text-text-3">
                {cargando ? ' ' : `${copy.archivos(visibles.length)} · ${copy.soloLectura}`}
              </footer>
            </section>
          </PanelPlegable>

          <VisorArchivo
            archivo={activo}
            onVolver={() => setVistaMovil('lista')}
            className={vistaMovil === 'lista' ? 'hidden lg:flex' : 'flex'}
          />
        </div>
      )}
    </PageEnter>
  );
}
