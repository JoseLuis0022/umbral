import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Newspaper } from 'lucide-react';
import { EmptyState, ErrorState, PageEnter, useToast } from '../components/ui';
import { PageHeader } from '../components/shell/PageHeader';
import {
  CarrilBoletines,
  DialogoCambiosSinGuardar,
  DialogoEliminarBoletin,
  DialogoRestaurar,
  EditorBoletin,
  EsqueletoEditor,
  ListaBoletines,
  type FiltroCategoriaBoletin,
  type MarcaBoletin,
  type PestanaEditor,
} from '../components/admin/boletines';
import { PanelPlegable } from '../components/shell';
import { cn } from '../lib/cn';
import { guiaVacia, guidesService } from '../services/guides.service';
import { guiasSemilla } from '../data/guias';
import type { Guia } from '../types';
import { admin as copy } from '../copy';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  titulo: 'Boletines de Al día',
  subtitulo: 'Aquí se redacta lo que la comunidad universitaria va a leer.',
  errorTitulo: 'No pudimos cargar los boletines',
  errorDetalle: 'Lo que está publicado sigue ahí. Revisa tu conexión e intenta de nuevo.',
  sinSeleccionTitulo: 'Ningún boletín abierto',
  sinSeleccionDetalle: 'Elige uno de la lista para editarlo, o empieza uno nuevo.',
  sinTitulo: 'Boletín sin título',
  errorSinTitulo: 'El boletín necesita un título antes de publicarse. Escríbelo en el primer campo.',
  errorSinPasos: 'Un boletín necesita al menos un paso con contenido. Escribe el primero.',
  boletinPublicado: 'Boletín publicado',
  errorGuardar: 'No pudimos guardar el boletín. Lo escrito sigue aquí; intenta de nuevo.',
  eliminado: (titulo: string) => `Se eliminó "${titulo}"`,
  descartado: 'Se descartó el boletín nuevo',
  errorEliminar: 'No pudimos eliminar el boletín. Sigue publicado; intenta de nuevo.',
  restaurado: 'Boletín restaurado',
  errorRestaurar: 'No pudimos restaurar el original. Tus cambios siguen aquí; intenta de nuevo.',
  plegarLista: 'Plegar el índice de boletines',
  desplegarLista: 'Desplegar el índice de boletines',
};

/** Clave propia de esta pantalla: plegar aquí no pliega Auditoría ni Corpus. */
const CLAVE_PLEGADO = 'panel-plegado:boletines';

type EstadoCarga = 'cargando' | 'actualizando' | 'listo' | 'error';

/** Acción que quedó en espera porque había cambios sin guardar. */
type Pendiente = { tipo: 'abrir'; id: string } | { tipo: 'nuevo' };

// Los ids de la semilla se calculan UNA vez, fuera del componente: es la única
// forma de distinguir un boletín editado (restaurable) de uno creado desde
// administración (que no tiene original al que volver). `fueEditada` responde
// "sí" a los dos, porque para el servicio ambos son cambios locales.
const IDS_SEMILLA = new Set(guiasSemilla.map((g) => g.id));

/** Copia profunda del borrador: sin ella, editar un paso mutaría la lista. */
function clonar(guia: Guia): Guia {
  return { ...guia, requisitos: [...guia.requisitos], pasos: guia.pasos.map((p) => ({ ...p })) };
}

/**
 * Huella de los campos EDITABLES. `estrellas` y `votadaPorMi` quedan fuera a
 * propósito: los mueve la comunidad, no quien redacta, y si contaran, un voto
 * que llegara mientras se escribe marcaría el borrador como sucio.
 */
function huella(guia: Guia): string {
  return JSON.stringify([
    guia.titulo,
    guia.resumen,
    guia.categoria,
    guia.minutosLectura,
    guia.requisitos,
    guia.pasos,
    guia.siAlgoFalla,
    guia.preguntaSugerida,
  ]);
}

function parche(guia: Guia) {
  return {
    titulo: guia.titulo,
    resumen: guia.resumen,
    categoria: guia.categoria,
    minutosLectura: guia.minutosLectura,
    requisitos: guia.requisitos,
    pasos: guia.pasos,
    siAlgoFalla: guia.siAlgoFalla,
    preguntaSugerida: guia.preguntaSugerida,
  };
}

/**
 * Editor de boletines de "Al día" (/admin/al-dia).
 *
 * Dos paneles, la misma anatomía que Corpus y Auditoría: índice angosto a la
 * izquierda, trabajo real a la derecha. La asimetría dice cuál manda —elegir
 * un boletín toma un segundo; redactarlo, media hora.
 *
 * En móvil no caben lado a lado, así que se convierten en navegación de dos
 * niveles: lista → editor con botón de volver.
 *
 * El índice se PLIEGA a un carril de iconos de categoría (`PanelPlegable`):
 * redactar pide todo el ancho posible y aun así hay que poder saltar de un
 * boletín a otro sin recuperarlo.
 *
 * EL BOLETÍN NUEVO NO SE PUBLICA AL CREARSE. "Nuevo boletín" abre un borrador
 * que solo vive en esta pantalla y se marca "Sin publicar" en la lista; el
 * servicio no se entera hasta que se pulsa "Publicar boletín". Crearlo en el
 * servicio de entrada dejaría un boletín en blanco y sin título a la vista de
 * toda la comunidad durante el rato que dure la redacción.
 */
export default function AdminBoletines() {
  const toast = useToast();

  const [guias, setGuias] = useState<Guia[]>([]);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');
  const [intento, setIntento] = useState(0);

  // Borrador sin publicar. Es un boletín más para la lista y el editor, pero
  // no existe para el servicio hasta que se guarda.
  const [nuevo, setNuevo] = useState<Guia | null>(null);

  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Guia | null>(null);
  const [pestana, setPestana] = useState<PestanaEditor>('editar');
  const [mostrarErrores, setMostrarErrores] = useState(false);

  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  const [porEliminar, setPorEliminar] = useState<Guia | null>(null);
  const [restaurarAbierto, setRestaurarAbierto] = useState(false);
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  // El campo de búsqueda es inmediato; el FILTRO va con retraso. Separarlos
  // permite escribir sin tirones y que la lista no se recalcule por tecla.
  const [textoCampo, setTextoCampo] = useState('');
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState<FiltroCategoriaBoletin>('Todas');

  const [vistaMovil, setVistaMovil] = useState<'lista' | 'editor'>('lista');

  const yaCargoUnaVez = useRef(false);
  // Guardar y eliminar sobreviven a la desmontada de la pantalla; sin esta
  // bandera, la respuesta intentaría escribir estado de algo que ya no existe.
  const vivo = useRef(true);
  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setTexto(textoCampo), 220);
    return () => clearTimeout(t);
  }, [textoCampo]);

  useEffect(() => {
    let vigente = true;
    // La primera carga muestra esqueleto; un reintento posterior conserva lo
    // anterior y solo avisa "Actualizando…": vaciar la lista se siente roto.
    setEstado(yaCargoUnaVez.current ? 'actualizando' : 'cargando');
    guidesService
      .listar()
      .then((lista) => {
        if (!vigente) return;
        yaCargoUnaVez.current = true;
        setGuias(lista);
        setEstado('listo');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [intento]);

  // La lista visible incluye el borrador sin publicar, arriba: es donde caería
  // si ya estuviera guardado, y así no aparece de la nada al publicarlo.
  const todos = useMemo(() => (nuevo ? [nuevo, ...guias] : guias), [guias, nuevo]);

  const marcas = useMemo(() => {
    const mapa: Record<string, MarcaBoletin> = {};
    for (const g of guias) {
      if (!IDS_SEMILLA.has(g.id)) mapa[g.id] = 'nuevo';
      else if (guidesService.fueEditada(g.id)) mapa[g.id] = 'editado';
    }
    return mapa;
  }, [guias]);

  const hayFiltros = texto.trim().length > 0 || categoria !== 'Todas';

  const visibles = useMemo(() => {
    const aguja = texto.trim().toLowerCase();
    return todos.filter((g) => {
      if (categoria !== 'Todas' && g.categoria !== categoria) return false;
      if (!aguja) return true;
      return `${g.titulo} ${g.resumen}`.toLowerCase().includes(aguja);
    });
  }, [categoria, texto, todos]);

  const esNuevo = nuevo !== null && nuevo.id === seleccionId;
  const original = useMemo(
    () => todos.find((g) => g.id === seleccionId) ?? null,
    [seleccionId, todos]
  );
  // Las dos huellas se memoizan por separado. `huella` es un JSON.stringify del
  // boletín completo, y calcularlo dos veces en cada render significaba
  // serializar el documento entero DOS veces por cada tecla escrita en el
  // formulario — en el mismo commit en que Framer mide las animaciones de
  // layout de la lista de pasos.
  const huellaBorrador = useMemo(() => (borrador ? huella(borrador) : null), [borrador]);
  const huellaOriginal = useMemo(() => (original ? huella(original) : null), [original]);
  const sucio = huellaBorrador !== null && huellaOriginal !== null && huellaBorrador !== huellaOriginal;

  const errorTitulo = borrador && !borrador.titulo.trim() ? TEXTO.errorSinTitulo : null;
  const errorPasos = borrador && !borrador.pasos.some((p) => p.contenido.trim()) ? TEXTO.errorSinPasos : null;

  const puedeRestaurar =
    borrador !== null && !esNuevo && IDS_SEMILLA.has(borrador.id) && marcas[borrador.id] === 'editado';

  // ——————————————————————————————————————————————————————————
  // Navegación entre boletines
  // ——————————————————————————————————————————————————————————

  const ejecutar = useCallback(
    (accion: Pendiente) => {
      setMostrarErrores(false);
      setPestana('editar');
      setVistaMovil('editor');
      // Un boletín nuevo que se abandona sin guardar no deja rastro: no está
      // en el servicio y nadie lo ha visto.
      setNuevo((actual) => (actual && actual.id === seleccionId ? null : actual));

      if (accion.tipo === 'nuevo') {
        const blanco = guiaVacia();
        setNuevo(blanco);
        setSeleccionId(blanco.id);
        setBorrador(clonar(blanco));
        return;
      }
      const destino = todos.find((g) => g.id === accion.id);
      if (!destino) return;
      setSeleccionId(destino.id);
      setBorrador(clonar(destino));
    },
    [seleccionId, todos]
  );

  const intentar = useCallback(
    (accion: Pendiente) => {
      if (sucio) {
        setPendiente(accion);
        return;
      }
      ejecutar(accion);
    },
    [ejecutar, sucio]
  );

  // ——————————————————————————————————————————————————————————
  // Mutaciones
  // ——————————————————————————————————————————————————————————

  const actualizarCampo = useCallback((parcial: Partial<Guia>) => {
    setBorrador((b) => (b ? { ...b, ...parcial } : b));
  }, []);

  /** Devuelve `true` si se guardó, para que quien navegaba pueda continuar. */
  const guardar = useCallback(async (): Promise<boolean> => {
    if (!borrador) return false;
    setMostrarErrores(true);

    const problema = errorTitulo ?? errorPasos;
    if (problema) {
      // El aviso de salida se cierra: lo que hay que arreglar está en el
      // formulario, y dejarlo tapado por un diálogo sería una trampa.
      setPendiente(null);
      setPestana('editar');
      toast.push({ message: problema, tone: 'error' });
      return false;
    }

    setGuardando(true);
    try {
      if (esNuevo) {
        const creada = await guidesService.crear(borrador);
        if (!vivo.current) return true;
        setGuias((lista) => [creada, ...lista]);
        setNuevo(null);
        setSeleccionId(creada.id);
        setBorrador(clonar(creada));
        toast.push({ message: TEXTO.boletinPublicado, tone: 'success' });
      } else {
        const actualizada = await guidesService.guardar(borrador.id, parche(borrador));
        if (!vivo.current) return true;
        setGuias((lista) => lista.map((g) => (g.id === actualizada.id ? actualizada : g)));
        setBorrador(clonar(actualizada));
        toast.push({ message: copy.cambiosGuardados, tone: 'success' });
      }
      setMostrarErrores(false);
      return true;
    } catch {
      if (vivo.current) toast.push({ message: TEXTO.errorGuardar, tone: 'error' });
      return false;
    } finally {
      if (vivo.current) setGuardando(false);
    }
  }, [borrador, errorPasos, errorTitulo, esNuevo, toast]);

  const descartar = useCallback(() => {
    if (!original) return;
    setBorrador(clonar(original));
    setMostrarErrores(false);
  }, [original]);

  const confirmarEliminar = useCallback(async () => {
    const objetivo = porEliminar;
    if (!objetivo) return;

    const titulo = objetivo.titulo.trim();

    if (nuevo && objetivo.id === nuevo.id) {
      setNuevo(null);
      setSeleccionId(null);
      setBorrador(null);
      setPorEliminar(null);
      setVistaMovil('lista');
      toast.push({ message: TEXTO.descartado });
      return;
    }

    setEliminando(true);
    try {
      await guidesService.eliminar(objetivo.id);
      if (!vivo.current) return;
      setGuias((lista) => lista.filter((g) => g.id !== objetivo.id));
      setSeleccionId(null);
      setBorrador(null);
      setVistaMovil('lista');
      toast.push({ message: TEXTO.eliminado(titulo) });
    } catch {
      if (vivo.current) toast.push({ message: TEXTO.errorEliminar, tone: 'error' });
    } finally {
      if (vivo.current) {
        setEliminando(false);
        setPorEliminar(null);
      }
    }
  }, [nuevo, porEliminar, toast]);

  const confirmarRestaurar = useCallback(async () => {
    if (!borrador) return;
    setRestaurando(true);
    try {
      const restaurada = await guidesService.restaurar(borrador.id);
      if (!vivo.current) return;
      if (restaurada) {
        setGuias((lista) => lista.map((g) => (g.id === restaurada.id ? restaurada : g)));
        setBorrador(clonar(restaurada));
        setMostrarErrores(false);
        toast.push({ message: TEXTO.restaurado, tone: 'success' });
      }
    } catch {
      if (vivo.current) toast.push({ message: TEXTO.errorRestaurar, tone: 'error' });
    } finally {
      if (vivo.current) {
        setRestaurando(false);
        setRestaurarAbierto(false);
      }
    }
  }, [borrador, toast]);

  // ——————————————————————————————————————————————————————————
  // Resolución del aviso de cambios sin guardar
  // ——————————————————————————————————————————————————————————

  const continuarPendiente = useCallback(() => {
    const accion = pendiente;
    setPendiente(null);
    if (accion) ejecutar(accion);
  }, [ejecutar, pendiente]);

  const guardarYContinuar = useCallback(async () => {
    const ok = await guardar();
    if (ok) continuarPendiente();
  }, [continuarPendiente, guardar]);

  const cargando = estado === 'cargando';

  if (estado === 'error' && !yaCargoUnaVez.current) {
    return (
      <PageEnter className="flex flex-col">
        <PageHeader compacto title={TEXTO.titulo} subtitle={TEXTO.subtitulo} />
        <div className="flex items-center justify-center rounded-tarjeta border border-hairline bg-surface-1 shadow-1">
          <ErrorState
            title={TEXTO.errorTitulo}
            description={TEXTO.errorDetalle}
            onRetry={() => setIntento((n) => n + 1)}
          />
        </div>
      </PageEnter>
    );
  }

  return (
    <>
      {/* El scroll vive DENTRO de cada panel, no en la página: si scrollara la
          ventana entera, escribir el último paso dejaría la lista y el botón
          de guardar fuera de pantalla.

          Los diálogos van FUERA de PageEnter: envuelve cada hijo en su propio
          bloque animado, y tres bloques vacíos al final desplazarían el
          selector de último hijo que es el que estira los paneles. */}
      <PageEnter className="flex h-full flex-col [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1">
        <PageHeader title={TEXTO.titulo} subtitle={TEXTO.subtitulo} />

        {/* La columna del índice es `auto` y no un ancho fijo: el ancho lo pone
            ahora `PanelPlegable` como estilo en línea (es lo que anima al
            plegar) y la rejilla lo sigue. Por debajo de `lg` no hay plegado. */}
        <div className="grid min-h-0 w-full flex-1 grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
          <PanelPlegable
            clave={CLAVE_PLEGADO}
            ancho={{ lg: 340, xl: 380 }}
            textoPlegar={TEXTO.plegarLista}
            textoDesplegar={TEXTO.desplegarLista}
            carril={
              <CarrilBoletines
                guias={visibles}
                marcas={marcas}
                idSinPublicar={nuevo?.id ?? null}
                cargando={cargando}
                seleccionId={seleccionId}
                onSeleccionar={(id) => intentar({ tipo: 'abrir', id })}
              />
            }
          >
            <ListaBoletines
              guias={visibles}
              marcas={marcas}
              idSinPublicar={nuevo?.id ?? null}
              cargando={cargando}
              actualizando={estado === 'actualizando'}
              error={estado === 'error'}
              seleccionId={seleccionId}
              texto={textoCampo}
              onTexto={setTextoCampo}
              categoria={categoria}
              onCategoria={setCategoria}
              hayFiltros={hayFiltros}
              onLimpiarFiltros={() => {
                setTextoCampo('');
                setTexto('');
                setCategoria('Todas');
              }}
              onSeleccionar={(id) => intentar({ tipo: 'abrir', id })}
              onNuevo={() => intentar({ tipo: 'nuevo' })}
              onReintentar={() => setIntento((n) => n + 1)}
              className={cn('lg:h-full', vistaMovil === 'editor' ? 'hidden lg:flex' : 'flex')}
            />
          </PanelPlegable>

          {cargando ? (
            <section
              aria-hidden
              className={cn(
                'min-h-0 overflow-hidden rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
                vistaMovil === 'lista' ? 'hidden lg:block' : 'block'
              )}
            >
              <EsqueletoEditor />
            </section>
          ) : borrador ? (
            <EditorBoletin
              guia={borrador}
              esNuevo={esNuevo}
              marcaEditado={marcas[borrador.id] !== undefined}
              sucio={sucio}
              guardando={guardando}
              pestana={pestana}
              mostrarErrores={mostrarErrores}
              errorTitulo={errorTitulo}
              errorPasos={errorPasos}
              puedeRestaurar={puedeRestaurar}
              onPestana={setPestana}
              onCampo={actualizarCampo}
              onGuardar={() => void guardar()}
              onDescartar={descartar}
              onEliminar={() => setPorEliminar(borrador)}
              onRestaurar={() => setRestaurarAbierto(true)}
              onVolver={() => setVistaMovil('lista')}
              className={cn(vistaMovil === 'lista' ? 'hidden lg:flex' : 'flex')}
            />
          ) : (
            <section
              aria-label={TEXTO.sinSeleccionTitulo}
              className={cn(
                'min-h-0 items-center justify-center rounded-tarjeta border border-hairline bg-surface-1 shadow-1',
                vistaMovil === 'lista' ? 'hidden lg:flex' : 'flex'
              )}
            >
              <EmptyState
                icon={Newspaper}
                title={TEXTO.sinSeleccionTitulo}
                description={TEXTO.sinSeleccionDetalle}
              />
            </section>
          )}
        </div>
      </PageEnter>

      <DialogoEliminarBoletin
        guia={porEliminar}
        esNuevo={porEliminar !== null && nuevo !== null && porEliminar.id === nuevo.id}
        eliminando={eliminando}
        onCerrar={() => setPorEliminar(null)}
        onConfirmar={() => void confirmarEliminar()}
      />

      <DialogoRestaurar
        abierto={restaurarAbierto}
        titulo={borrador?.titulo.trim() || TEXTO.sinTitulo}
        restaurando={restaurando}
        onCerrar={() => setRestaurarAbierto(false)}
        onConfirmar={() => void confirmarRestaurar()}
      />

      <DialogoCambiosSinGuardar
        abierto={pendiente !== null}
        titulo={borrador?.titulo.trim() || TEXTO.sinTitulo}
        guardando={guardando}
        onSeguir={() => setPendiente(null)}
        onDescartar={continuarPendiente}
        onGuardar={() => void guardarYContinuar()}
      />
    </>
  );
}
