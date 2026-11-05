import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Library } from 'lucide-react';
import { Button, EmptyState, ErrorState, PageEnter, useToast } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import {
  BarraCorpus,
  CarrilArchivos,
  DialogoCorpus,
  DialogoEliminar,
  EditorPrompt,
  PanelArchivos,
  TarjetaCorpus,
  TarjetaCorpusEsqueleto,
  TarjetaNuevoCorpus,
  VisorDocumento,
  type DatosCorpus,
} from '../components/admin/corpus';
import { PanelPlegable } from '../components/shell';
import {
  ArchivoRechazado,
  EXTENSIONES_ACEPTADAS,
  TAMANO_MAXIMO_BYTES,
  actualizarCorpus,
  archivoDescargable,
  crearCorpus,
  eliminarDocumento,
  guardarSystemPrompt,
  indexar,
  listarCorpus,
  listarDocumentos,
  reindexar,
  subirDocumento,
} from '../services/corpus.service';
import type { Corpus, Documento } from '../types';
import { admin as copy } from '../copy';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  bases: 'Bases de conocimiento',
  sinCorpusTitulo: 'Todavía no hay bases de conocimiento',
  sinCorpusDetalle:
    'Una base agrupa los documentos que el asistente puede citar, con su propio system prompt. Crea la primera para empezar a subir archivos.',
  errorCorpus: 'No pudimos cargar las bases de conocimiento',
  errorCorpusDetalle: 'Tus documentos siguen ahí. Revisa tu conexión e intenta de nuevo.',
  corpusCreado: (nombre: string) => `Se creó la base ${nombre}`,
  corpusActualizado: (nombre: string) => `Se guardaron los cambios de ${nombre}`,
  errorPrompt: 'No pudimos guardar el system prompt. Revisa tu conexión e intenta de nuevo.',
  errorSubida: (nombre: string) => `No pudimos subir "${nombre}". Intenta de nuevo.`,
  errorIndexar: (nombre: string) => `"${nombre}" no se pudo indexar. Reintenta desde su menú.`,
  errorIndexarGenerico: 'La indexación se interrumpió. Reintenta desde el menú del documento.',
  eliminado: (nombre: string) => `Se eliminó "${nombre}"`,
  errorEliminar: 'No pudimos eliminar el documento. Sigue en la base; intenta de nuevo.',
  sinArchivo: (nombre: string) => `"${nombre}" no tiene archivo descargable en esta demostración.`,
  descargando: (nombre: string) => `Descargando "${nombre}"`,
  extensionInvalida: (nombre: string) => `"${nombre}" no es Markdown ni PDF. Sube archivos .md o .pdf.`,
  demasiadoGrande: (nombre: string) => `"${nombre}" pesa más de 10 MB. Divídelo o comprímelo antes de subirlo.`,
  anuncio: (n: number, pct: number) =>
    `Indexando ${n} ${n === 1 ? 'documento' : 'documentos'}. ${pct} por ciento completado.`,
  plegarLista: 'Plegar la lista de archivos',
  desplegarLista: 'Desplegar la lista de archivos',
};

/** Clave propia de esta pantalla: plegar aquí no pliega Auditoría ni el Laboratorio. */
const CLAVE_PLEGADO = 'panel-plegado:corpus';

type EstadoCarga = 'cargando' | 'listo' | 'error';

const EXTENSIONES = EXTENSIONES_ACEPTADAS.split(',').map((e) => e.trim().toLowerCase());

/**
 * Validación local con las MISMAS constantes que el servicio.
 *
 * Existe por rendimiento percibido, no por seguridad: soltar diez archivos y
 * esperar diez viajes de 200-600 ms para enterarse de que uno no era .md se
 * siente roto. El servicio vuelve a validar y lanza `ArchivoRechazado`; ese
 * mensaje es el que manda si algo se cuela por aquí.
 */
function motivoRechazo(archivo: File): string | null {
  const nombre = archivo.name.toLowerCase();
  if (!EXTENSIONES.some((ext) => nombre.endsWith(ext))) return TEXTO.extensionInvalida(archivo.name);
  if (archivo.size > TAMANO_MAXIMO_BYTES) return TEXTO.demasiadoGrande(archivo.name);
  return null;
}

/**
 * Corpus (/admin/corpus).
 *
 * Tres zonas: la tira de bases (elegir), el panel de archivos (administrar) y
 * el visor (leer). La proporción dice cuál manda: el visor se lleva el espacio
 * porque revisar QUÉ dice un documento es la tarea real; subirlo es un trámite
 * de diez segundos.
 *
 * El panel de archivos se PLIEGA a un carril de etiquetas MD/PDF teñidas por su
 * estado (`PanelPlegable`), así que el visor puede llevarse casi la pantalla
 * entera sin perder de vista qué se está indexando ni cómo cambiar de archivo.
 *
 * REPARTO DEL ALTO — la regla y su porqué
 * ---------------------------------------
 * La pantalla ocupa exactamente el alto de la ventana y NUNCA scrollea entera:
 * el scroll vive dentro de la lista y dentro del visor. Con un alto fijo, cada
 * píxel que gasta la parte de arriba se lo quita a la de abajo, así que las
 * dos zonas previas se pagan a precio de renglón:
 *
 *   · La tira de bases mide 60 px (una fila de fichas de un renglón). Antes
 *     eran tarjetas de 150 px con descripción, agentes y tres métricas: unos
 *     350 px con sus márgenes, para un dato que solo se mira al entrar. Lo que
 *     decía cada tarjeta se lee ahora en `BarraCorpus`, para la base abierta.
 *   · La zona de "arrastra archivos aquí" sí es un rectángulo amplio y visible,
 *     pero NO gasta alto de forma permanente: vive dentro del scroll de la
 *     lista y el propio scroll la contrae a una barra de 44 px clavada arriba
 *     (ver `useColapsoZona`). Se paga cuando sirve —al llegar a la pantalla— y
 *     se recupera en cuanto la persona se pone a recorrer archivos. La diana de
 *     arrastre sigue siendo el panel ENTERO mientras hay algo colgando del
 *     cursor, y "Subir" sigue en la cabecera, fuera del scroll.
 *
 * El resto del alto (`flex-1` + `min-h-0`) se lo reparten la lista y el visor,
 * cada uno con su propio scroll. En una ventana normal eso son ocho archivos a
 * la vista de entrada —diez y pico con la zona ya contraída— y un visor que
 * ocupa la mayor parte de la pantalla.
 *
 * Los documentos de TODAS las bases se cargan en la primera pasada y se
 * guardan en un mapa por corpus. Cuesta una ronda de peticiones al entrar y a
 * cambio dos cosas: los conteos de las tarjetas son reales desde el primer
 * pintado (no aparecen en cero y saltan a doce), y cambiar de base es
 * instantáneo en vez de mostrar un esqueleto cada vez.
 */
export default function AdminCorpus() {
  const toast = useToast();

  const [corpus, setCorpus] = useState<Corpus[]>([]);
  const [docsPorCorpus, setDocsPorCorpus] = useState<Record<string, Documento[]>>({});
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [intento, setIntento] = useState(0);

  const [corpusId, setCorpusId] = useState<string | null>(null);
  const [docActivoId, setDocActivoId] = useState<string | null>(null);

  // Borradores del system prompt POR base. Cerrar el editor no descarta lo
  // escrito: el borrador vive aquí y sobrevive a cambiar de base y volver.
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [promptAbierto, setPromptAbierto] = useState(false);
  const [guardandoPrompt, setGuardandoPrompt] = useState(false);

  /*
   * Un solo diálogo para alta y edición. El "qué se está editando" y el
   * "está abierto" van en dos estados separados A PROPÓSITO: si el corpus se
   * vaciara al cerrar, el diálogo cambiaría de título y de botón —de "Editar
   * base" a "Nuevo corpus"— durante los 200 ms de la animación de salida.
   * Al abrir el alta se pone en null antes de abrir, así que nunca se hereda.
   */
  const [dialogoCorpusAbierto, setDialogoCorpusAbierto] = useState(false);
  const [corpusEnEdicion, setCorpusEnEdicion] = useState<Corpus | null>(null);
  const [porEliminar, setPorEliminar] = useState<Documento | null>(null);
  const [eliminando, setEliminando] = useState(false);

  // La indexación es un proceso largo que sigue vivo cuando la pantalla se
  // desmonta. Sin esta bandera, cada tick intentaría escribir estado de un
  // componente que ya no existe.
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    setEstado('cargando');
    listarCorpus()
      .then(async (lista) => {
        const listas = await Promise.all(lista.map((c) => listarDocumentos(c.id)));
        if (!vigente) return;
        const mapa: Record<string, Documento[]> = {};
        lista.forEach((c, i) => {
          mapa[c.id] = listas[i];
        });
        setCorpus(lista);
        setDocsPorCorpus(mapa);
        // Se conserva la selección si sigue existiendo; si no, la primera.
        // Entrar sin base elegida dejaría media pantalla en blanco sin motivo.
        setCorpusId((actual) => (actual && lista.some((c) => c.id === actual) ? actual : (lista[0]?.id ?? null)));
        setEstado('listo');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  const corpusActivo = useMemo(() => corpus.find((c) => c.id === corpusId) ?? null, [corpus, corpusId]);
  const documentos = useMemo(
    () => (corpusId ? (docsPorCorpus[corpusId] ?? []) : []),
    [corpusId, docsPorCorpus]
  );
  const docActivo = useMemo(
    () => documentos.find((d) => d.id === docActivoId) ?? null,
    [documentos, docActivoId]
  );

  // Conteo y peso por base, derivados del mismo mapa que alimenta la lista:
  // así la tarjeta sube de 11 a 12 documentos en el mismo frame en que la fila
  // aparece en el panel, sin volver a preguntarle al servicio.
  const resumen = useMemo(() => {
    const mapa: Record<string, { documentos: number; bytes: number }> = {};
    for (const c of corpus) {
      const lista = docsPorCorpus[c.id] ?? [];
      mapa[c.id] = {
        documentos: lista.length,
        bytes: lista.reduce((suma, d) => suma + d.tamanoBytes, 0),
      };
    }
    return mapa;
  }, [corpus, docsPorCorpus]);

  const promptGuardado = corpusActivo?.systemPrompt ?? '';
  const borrador = corpusActivo ? (borradores[corpusActivo.id] ?? promptGuardado) : '';
  const promptSucio = corpusActivo != null && borrador !== promptGuardado;

  // Estado PARCIAL de la pantalla: la lista ya está completa y utilizable
  // mientras uno o más archivos siguen indexándose.
  const enProceso = useMemo(
    () => documentos.filter((d) => d.estado === 'procesando' || d.estado === 'en_cola'),
    [documentos]
  );
  const progreso = enProceso.length
    ? Math.round(enProceso.reduce((suma, d) => suma + (d.progreso ?? 0), 0) / enProceso.length)
    : 0;
  // Escalones de 25 %: la barra avanza cuarenta veces por archivo y un lector
  // de pantalla leyendo cada tick sería inservible.
  const anuncio = enProceso.length ? TEXTO.anuncio(enProceso.length, Math.floor(progreso / 25) * 25) : '';

  // ——————————————————————————————————————————————————————————
  // Mutaciones locales
  // ——————————————————————————————————————————————————————————

  const aplicarDocumento = useCallback((doc: Documento) => {
    if (!vivo.current) return;
    setDocsPorCorpus((mapa) => {
      const lista = mapa[doc.corpusId] ?? [];
      const existe = lista.some((d) => d.id === doc.id);
      return {
        ...mapa,
        [doc.corpusId]: existe ? lista.map((d) => (d.id === doc.id ? doc : d)) : [doc, ...lista],
      };
    });
  }, []);

  const lanzarIndexado = useCallback(
    async (documentoId: string, esReintento: boolean) => {
      try {
        const final = esReintento
          ? await reindexar(documentoId, aplicarDocumento)
          : await indexar(documentoId, aplicarDocumento);
        if (vivo.current && final.estado === 'error') {
          toast.push({ message: TEXTO.errorIndexar(final.nombre), tone: 'error' });
        }
      } catch {
        if (vivo.current) toast.push({ message: TEXTO.errorIndexarGenerico, tone: 'error' });
      }
    },
    [aplicarDocumento, toast]
  );

  const subir = useCallback(
    async (archivos: File[]) => {
      if (!corpusId) return;
      let primero = true;
      for (const archivo of archivos) {
        const motivo = motivoRechazo(archivo);
        if (motivo) {
          toast.push({ message: motivo, tone: 'error' });
          continue;
        }
        try {
          const doc = await subirDocumento(corpusId, archivo);
          if (!vivo.current) return;
          aplicarDocumento(doc);
          // Solo el primero del lote abre el visor: soltar cinco archivos y
          // ver la pantalla cambiar cinco veces se siente fuera de control.
          if (primero) {
            setDocActivoId(doc.id);
            primero = false;
          }
          void lanzarIndexado(doc.id, false);
        } catch (error) {
          const mensaje =
            error instanceof ArchivoRechazado ? error.message : TEXTO.errorSubida(archivo.name);
          if (vivo.current) toast.push({ message: mensaje, tone: 'error' });
        }
      }
    },
    [aplicarDocumento, corpusId, lanzarIndexado, toast]
  );

  const descargar = useCallback(
    (doc: Documento) => {
      const blob = archivoDescargable(doc);
      if (!blob) {
        toast.push({ message: TEXTO.sinArchivo(doc.nombre), tone: 'error' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = doc.nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      // Revocar en el mismo tick cancela la descarga en algunos navegadores.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.push({ message: TEXTO.descargando(doc.nombre) });
    },
    [toast]
  );

  const confirmarEliminar = useCallback(async () => {
    const doc = porEliminar;
    if (!doc) return;
    setEliminando(true);
    // Optimista: la fila se va en el mismo frame del clic y vuelve, con su
    // posición original, si el servicio falla.
    const respaldo = docsPorCorpus[doc.corpusId] ?? [];
    setDocsPorCorpus((mapa) => ({
      ...mapa,
      [doc.corpusId]: (mapa[doc.corpusId] ?? []).filter((d) => d.id !== doc.id),
    }));
    setDocActivoId((actual) => (actual === doc.id ? null : actual));
    setPorEliminar(null);
    try {
      await eliminarDocumento(doc.id);
      if (vivo.current) toast.push({ message: TEXTO.eliminado(doc.nombre) });
    } catch {
      if (!vivo.current) return;
      setDocsPorCorpus((mapa) => ({ ...mapa, [doc.corpusId]: respaldo }));
      toast.push({ message: TEXTO.errorEliminar, tone: 'error' });
    } finally {
      if (vivo.current) setEliminando(false);
    }
  }, [docsPorCorpus, porEliminar, toast]);

  const abrirNuevoCorpus = useCallback(() => {
    setCorpusEnEdicion(null);
    setDialogoCorpusAbierto(true);
  }, []);

  const abrirEdicionCorpus = useCallback((base: Corpus) => {
    setCorpusEnEdicion(base);
    setDialogoCorpusAbierto(true);
  }, []);

  /*
   * Alta y edición comparten formulario, así que comparten manejador.
   *
   * Ninguna de las dos ramas atrapa el fallo: el diálogo lo espera para pintar
   * su propio aviso y dejar el formulario abierto con lo escrito. Cerrar aquí
   * ante un error tiraría el texto de la persona.
   *
   * La edición NO manda el system prompt aunque el formulario lo tuviera: lo
   * escribe `EditorPrompt`, con su borrador vivo, y `actualizarCorpus` no lo
   * pisa. Una base renombrada mientras alguien tiene el prompt a medio escribir
   * conserva el borrador.
   */
  const guardarCorpus = useCallback(
    async (datos: DatosCorpus) => {
      if (corpusEnEdicion) {
        const actualizado = await actualizarCorpus(corpusEnEdicion.id, {
          nombre: datos.nombre,
          descripcion: datos.descripcion,
          icono: datos.icono,
        });
        if (!vivo.current) return;
        // Basta con sustituirlo en la lista: la ficha de la tira y la barra de
        // la derecha leen las dos del mismo arreglo, así que el nombre nuevo
        // aparece en los dos sitios en el mismo frame.
        setCorpus((lista) => lista.map((c) => (c.id === actualizado.id ? actualizado : c)));
        setDialogoCorpusAbierto(false);
        toast.push({ message: TEXTO.corpusActualizado(actualizado.nombre), tone: 'success' });
        return;
      }

      const creado = await crearCorpus(datos);
      if (!vivo.current) return;
      setCorpus((lista) => [...lista, creado]);
      setDocsPorCorpus((mapa) => ({ ...mapa, [creado.id]: [] }));
      setCorpusId(creado.id);
      setDocActivoId(null);
      setDialogoCorpusAbierto(false);
      toast.push({ message: TEXTO.corpusCreado(creado.nombre), tone: 'success' });
    },
    [corpusEnEdicion, toast]
  );

  const guardarPrompt = useCallback(async () => {
    if (!corpusActivo) return;
    setGuardandoPrompt(true);
    try {
      const actualizado = await guardarSystemPrompt(corpusActivo.id, borrador);
      if (!vivo.current) return;
      setCorpus((lista) => lista.map((c) => (c.id === actualizado.id ? actualizado : c)));
      setBorradores((b) => {
        const siguiente = { ...b };
        delete siguiente[actualizado.id];
        return siguiente;
      });
      setPromptAbierto(false);
      toast.push({ message: copy.cambiosGuardados, tone: 'success' });
    } catch {
      if (vivo.current) toast.push({ message: TEXTO.errorPrompt, tone: 'error' });
    } finally {
      if (vivo.current) setGuardandoPrompt(false);
    }
  }, [borrador, corpusActivo, toast]);

  const descartarPrompt = useCallback(() => {
    if (!corpusActivo) return;
    setBorradores((b) => {
      const siguiente = { ...b };
      delete siguiente[corpusActivo.id];
      return siguiente;
    });
  }, [corpusActivo]);

  const escribirPrompt = useCallback(
    (valor: string) => {
      if (!corpusActivo) return;
      setBorradores((b) => ({ ...b, [corpusActivo.id]: valor }));
    },
    [corpusActivo]
  );

  /*
   * Manejadores de la lista de archivos, ESTABLES entre renders.
   *
   * No es microoptimización: la indexación simulada emite ~40 avances por
   * documento, y cada uno vuelve a renderizar esta pantalla entera. Con flechas
   * en línea, las 27 filas recibían props nuevas en cada uno de esos avances,
   * se volvían a renderizar todas, y como cada fila lleva `layout`, Framer
   * medía las 27 cajas 40 veces por documento. Eso es lo que se comía los
   * frames y hacía que la lista se sintiera pastosa al indexar.
   *
   * Con referencias estables + `memo` en la fila, solo se vuelve a pintar la
   * fila cuyo documento cambió de verdad.
   */
  const seleccionarDocumento = useCallback((doc: Documento) => setDocActivoId(doc.id), []);
  const reindexarDocumento = useCallback(
    (doc: Documento) => void lanzarIndexado(doc.id, true),
    [lanzarIndexado]
  );
  const pedirEliminar = useCallback((doc: Documento) => setPorEliminar(doc), []);

  const elegirCorpus = useCallback((id: string) => {
    setCorpusId(id);
    setDocActivoId(null);
  }, []);

  const cargando = estado === 'cargando';
  const sinCorpus = estado === 'listo' && corpus.length === 0;

  return (
    <>
      {/* El scroll vive DENTRO de cada panel, no en la página: si scrollara la
          ventana entera, elegir un documento del final de la lista dejaría el
          visor fuera de pantalla.

          Los diálogos van FUERA de PageEnter: envuelve cada hijo en su propio
          bloque animado, y tres bloques vacíos al final desplazarían el
          selector de último hijo que es el que estira el detalle. */}
      <PageEnter
        className={
          'flex h-full flex-col ' +
          '[&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1'
        }
      >
        <PageHeader compacto title={copy.corpusTitulo} subtitle={copy.corpusSubtitulo} />

        {estado === 'error' ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-tarjeta border border-hairline bg-surface-1 shadow-1">
            <ErrorState
              title={TEXTO.errorCorpus}
              description={TEXTO.errorCorpusDetalle}
              onRetry={() => setIntento((n) => n + 1)}
            />
          </div>
        ) : sinCorpus ? (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-tarjeta border border-hairline bg-surface-1 shadow-1">
            <EmptyState
              icon={Library}
              title={TEXTO.sinCorpusTitulo}
              description={TEXTO.sinCorpusDetalle}
              action={
                <Button variant="primary" onClick={abrirNuevoCorpus}>
                  {copy.nuevoCorpus}
                </Button>
              }
            />
          </div>
        ) : (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            {/* ── Tira de bases ──
                Una sola fila que se desplaza en horizontal, no una cuadrícula:
                elegir la base es un paso previo, no el contenido de la
                pantalla, y una cuadrícula se comería el alto del visor.

                El alto de la fila se declara UNA vez aquí y todas las fichas
                se estiran a él con `items-stretch`: la ficha real, la de
                "Nuevo corpus" y el esqueleto miden exactamente lo mismo
                porque ninguna elige su altura, la heredan. Son 76 px = 60 de
                ficha + 8 arriba y abajo, porque `overflow-x-auto` recorta
                también en vertical y sin ese aire se comería la sombra y el
                levantar de 2 px del hover. */}
            <section aria-label={TEXTO.bases} className="mb-3 shrink-0">
              <div className="flex h-[84px] snap-x items-stretch gap-2 overflow-x-auto overscroll-x-contain px-0.5 py-3">
                {cargando
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="w-[220px] shrink-0">
                        <TarjetaCorpusEsqueleto />
                      </div>
                    ))
                  : corpus.map((c) => (
                      <div key={c.id} className="w-[220px] shrink-0 snap-start">
                        <TarjetaCorpus
                          corpus={c}
                          activo={c.id === corpusId}
                          documentos={resumen[c.id]?.documentos ?? 0}
                          bytes={resumen[c.id]?.bytes ?? 0}
                          onSeleccionar={() => elegirCorpus(c.id)}
                          onEditar={() => abrirEdicionCorpus(c)}
                        />
                      </div>
                    ))}
                {!cargando && (
                  <div className="w-[180px] shrink-0 snap-start">
                    <TarjetaNuevoCorpus onClick={abrirNuevoCorpus} />
                  </div>
                )}
              </div>
            </section>

            {/* ── Detalle: administrar a la izquierda, leer a la derecha ── */}
            {/* La columna de archivos es `auto` y no un ancho fijo: el ancho lo
                pone ahora `PanelPlegable` como estilo en línea (es lo que anima
                al plegar) y la rejilla lo sigue. Por debajo de `lg` no hay
                plegado y las tres zonas se apilan, como antes. */}
            <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 overflow-y-auto lg:grid-cols-[auto_minmax(0,1fr)] lg:overflow-visible">
              {/* `error={false}` no es un olvido: el fallo de carga de esta
                  pantalla es uno solo (la lista de bases y sus documentos
                  vienen de la misma pasada) y ya se resolvió arriba con su
                  propio ErrorState y su reintento. El panel conserva la
                  prop para el día que los documentos se pidan por separado.

                  Por debajo de lg las tres zonas se apilan y la columna
                  scrollea: el panel se acota a media pantalla para que el
                  visor asome sin recorrer antes toda la lista. */}
              <PanelPlegable
                clave={CLAVE_PLEGADO}
                ancho={{ lg: 300, xl: 340 }}
                textoPlegar={TEXTO.plegarLista}
                textoDesplegar={TEXTO.desplegarLista}
                carril={
                  <CarrilArchivos
                    documentos={documentos}
                    cargando={cargando}
                    documentoActivoId={docActivoId}
                    onSeleccionar={seleccionarDocumento}
                  />
                }
              >
                <PanelArchivos
                  documentos={documentos}
                  cargando={cargando}
                  error={false}
                  documentoActivoId={docActivoId}
                  onReintentar={() => setIntento((n) => n + 1)}
                  onArchivos={(archivos) => void subir(archivos)}
                  onSeleccionar={seleccionarDocumento}
                  onReindexar={reindexarDocumento}
                  onDescargar={descargar}
                  onEliminar={pedirEliminar}
                  className="max-h-[50vh] lg:h-full lg:max-h-none"
                />
              </PanelPlegable>

              <div className="flex min-h-0 flex-col gap-4">
                <BarraCorpus
                  corpus={corpusActivo}
                  cargando={cargando}
                  promptSucio={promptSucio}
                  onAbrirPrompt={() => setPromptAbierto(true)}
                  indexando={enProceso.length}
                  progreso={progreso}
                  anuncio={anuncio}
                />
                <VisorDocumento
                  documento={docActivo}
                  cargando={cargando}
                  error={false}
                  onReintentar={() => setIntento((n) => n + 1)}
                  onDescargar={descargar}
                  onReindexar={reindexarDocumento}
                  className="min-h-[60vh] flex-1 lg:min-h-0"
                />
              </div>
            </div>
          </div>
        )}
      </PageEnter>

      <EditorPrompt
        abierto={promptAbierto}
        corpus={corpusActivo}
        valor={borrador}
        sucio={promptSucio}
        guardando={guardandoPrompt}
        onValor={escribirPrompt}
        onCerrar={() => setPromptAbierto(false)}
        onGuardar={() => void guardarPrompt()}
        onDescartar={descartarPrompt}
      />

      {/* `nombresExistentes` va COMPLETO, con el nombre de la base que se está
          editando incluido: excluirlo es cosa del diálogo, que sabe cuál es el
          propio. Filtrarlo aquí dejaría el mismo bug esperando al siguiente
          sitio desde el que se abra el formulario. */}
      <DialogoCorpus
        abierto={dialogoCorpusAbierto}
        corpus={corpusEnEdicion}
        nombresExistentes={corpus.map((c) => c.nombre)}
        onCerrar={() => setDialogoCorpusAbierto(false)}
        onGuardar={guardarCorpus}
      />

      <DialogoEliminar
        documento={porEliminar}
        eliminando={eliminando}
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={() => void confirmarEliminar()}
      />
    </>
  );
}
