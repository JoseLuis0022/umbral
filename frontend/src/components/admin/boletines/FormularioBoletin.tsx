import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import type { CategoriaGuia, Guia, PasoGuia } from '../../../types';
import { Button, Field, Input, SelectorLista, Textarea, type OpcionLista } from '../../ui';
import { Markdown } from '../../Markdown';
import { CATEGORIAS, MarcaCategoria } from '../../guias';
import { ListaRequisitos } from './ListaRequisitos';
import { EditorPasos } from './EditorPasos';

// Cadenas que no existen todavía en src/copy (ver reporte).
const TEXTO = {
  titulo: 'Título',
  tituloAyuda: 'Lo que se lee en la tarjeta de la galería. Nombra el problema, no el tema.',
  tituloPlaceholder: 'Cómo restablecer tu contraseña institucional',
  resumen: 'Resumen',
  resumenAyuda: 'Una o dos líneas. Es lo único que se lee antes de decidir si abrir el boletín.',
  resumenPlaceholder: 'Qué resuelve este boletín y para quién.',
  categoria: 'Categoría',
  minutos: 'Minutos de lectura',
  minutosAyuda: 'Entre 1 y 60.',
  siAlgoFalla: 'Si algo falla',
  siAlgoFallaAyuda: 'Los tropiezos frecuentes y su salida. Admite markdown.',
  siAlgoFallaPlaceholder: '**No llega el correo de verificación.** Revisa la carpeta de no deseados…',
  pregunta: 'Pregunta sugerida',
  preguntaAyuda: 'Con esta pregunta se abre el chat desde el boletín. Escríbela como la diría una persona.',
  preguntaPlaceholder: '¿Cómo restablezco mi contraseña si ya no tengo acceso a mi correo?',
  vistaPrevia: 'Vista previa',
  editar: 'Editar',
  verSiAlgoFalla: 'Ver "Si algo falla" como se publica',
  editarSiAlgoFalla: 'Volver a editar "Si algo falla"',
  sinContenido: 'Sin contenido todavía.',
  zonaTitulo: 'Origen y retiro',
  restaurar: 'Restaurar el original',
  restaurarDetalle:
    'Descarta los cambios hechos desde administración y devuelve el boletín al texto con el que se publicó.',
  eliminar: 'Eliminar boletín',
  eliminarDetalle: 'Deja de aparecer en "Al día" para toda la comunidad universitaria.',
  descartarNuevo: 'Descartar el boletín',
  descartarNuevoDetalle: 'Todavía no se ha publicado: al descartarlo no queda nada de lo escrito.',
};

const MINUTOS_MIN = 1;
const MINUTOS_MAX = 60;

/**
 * Pestaña "Editar": todos los campos de una `Guia`, en el mismo orden en que
 * se leen en la pantalla pública. Encabezado, cuerpo y cierre — así, lo que se
 * escribe arriba es lo que se lee arriba, sin traducción mental.
 *
 * Cada control lleva su `aria-label` a mano porque `Field` pinta la etiqueta
 * pero no la asocia (no expone `htmlFor`/`id`): sin esto, un lector de
 * pantalla anuncia "cuadro de texto" ocho veces seguidas.
 */
export function FormularioBoletin({
  guia,
  guardando,
  mostrarErrores,
  errorTitulo,
  errorPasos,
  esNuevo,
  puedeRestaurar,
  onCampo,
  onRestaurar,
  onEliminar,
}: {
  guia: Guia;
  guardando: boolean;
  mostrarErrores: boolean;
  errorTitulo: string | null;
  errorPasos: string | null;
  esNuevo: boolean;
  puedeRestaurar: boolean;
  onCampo: (parcial: Partial<Guia>) => void;
  onRestaurar: () => void;
  onEliminar: () => void;
}) {
  const [tituloTocado, setTituloTocado] = useState(false);
  const [previaFalla, setPreviaFalla] = useState(false);

  // Aquí toda opción ES una categoría: no hay "Todas", porque un boletín
  // pertenece siempre a una.
  const opcionesCategoria = useMemo<OpcionLista<CategoriaGuia>[]>(
    () => CATEGORIAS.map((c) => ({ valor: c, texto: c, dato: c })),
    []
  );

  // El campo de minutos guarda su propio texto para que borrarlo entero no se
  // convierta en un 0 delante de los ojos. El valor del modelo solo cambia
  // cuando lo escrito es un número usable.
  const [minutos, setMinutos] = useState(String(guia.minutosLectura));
  useEffect(() => {
    setMinutos(String(guia.minutosLectura));
  }, [guia.id, guia.minutosLectura]);

  const mostrarErrorTitulo = (mostrarErrores || tituloTocado) && errorTitulo;

  return (
    <div className="mx-auto flex max-w-[46rem] flex-col gap-6 px-5 py-5">
      <Field
        label={TEXTO.titulo}
        required
        hint={TEXTO.tituloAyuda}
        error={mostrarErrorTitulo ? errorTitulo ?? undefined : undefined}
      >
        <Input
          aria-label={TEXTO.titulo}
          aria-invalid={mostrarErrorTitulo ? true : undefined}
          value={guia.titulo}
          onChange={(e) => onCampo({ titulo: e.target.value })}
          onBlur={() => setTituloTocado(true)}
          placeholder={TEXTO.tituloPlaceholder}
          disabled={guardando}
          maxLength={120}
        />
      </Field>

      <Field label={TEXTO.resumen} hint={TEXTO.resumenAyuda}>
        <Textarea
          aria-label={TEXTO.resumen}
          value={guia.resumen}
          onChange={(e) => onCampo({ resumen: e.target.value })}
          placeholder={TEXTO.resumenPlaceholder}
          disabled={guardando}
          rows={2}
          className="min-h-[72px] text-14"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
        <Field label={TEXTO.categoria}>
          {/* Mismo selector propio que el filtro del panel izquierdo: dejar
              aquí el `<select>` nativo habría puesto el menú gris del sistema a
              dos paneles de distancia del menú de la app, en la misma pantalla
              y para la misma lista de categorías. */}
          <SelectorLista
            opciones={opcionesCategoria}
            valor={guia.categoria}
            onCambiar={(valor) => onCampo({ categoria: valor as CategoriaGuia })}
            etiqueta={TEXTO.categoria}
            tituloHoja={TEXTO.categoria}
            disabled={guardando}
            renderDisparador={(opcion) => (
              <>
                <MarcaCategoria categoria={opcion.dato} />
                <span className="truncate">{opcion.texto}</span>
              </>
            )}
            renderOpcion={(opcion) => (
              <div className="flex items-center gap-2.5">
                <MarcaCategoria categoria={opcion.dato} tamano={28} />
                <span className="truncate font-ui text-14 font-medium text-text-1">
                  {opcion.texto}
                </span>
              </div>
            )}
          />
        </Field>

        <Field label={TEXTO.minutos} hint={TEXTO.minutosAyuda}>
          <Input
            aria-label={TEXTO.minutos}
            type="number"
            inputMode="numeric"
            min={MINUTOS_MIN}
            max={MINUTOS_MAX}
            value={minutos}
            onChange={(e) => {
              setMinutos(e.target.value);
              const n = Number.parseInt(e.target.value, 10);
              if (Number.isFinite(n) && n >= MINUTOS_MIN && n <= MINUTOS_MAX) onCampo({ minutosLectura: n });
            }}
            onBlur={() => setMinutos(String(guia.minutosLectura))}
            disabled={guardando}
            className="tabular-nums"
          />
        </Field>
      </div>

      <hr className="border-hairline" />

      <ListaRequisitos
        requisitos={guia.requisitos}
        onCambiar={(requisitos) => onCampo({ requisitos })}
        deshabilitado={guardando}
      />

      <hr className="border-hairline" />

      <EditorPasos
        pasos={guia.pasos}
        onCambiar={(pasos: PasoGuia[]) => onCampo({ pasos })}
        deshabilitado={guardando}
        invalido={Boolean(mostrarErrores && errorPasos)}
      />
      {mostrarErrores && errorPasos && (
        <p role="alert" className="font-ui text-12 text-status-red">
          {errorPasos}
        </p>
      )}

      <hr className="border-hairline" />

      <section aria-labelledby="titulo-si-algo-falla-editor" className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 id="titulo-si-algo-falla-editor" className="font-ui text-15 font-semibold text-text-1">
              {TEXTO.siAlgoFalla}
            </h3>
            <p className="font-ui text-12 text-text-3">{TEXTO.siAlgoFallaAyuda}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setPreviaFalla((v) => !v)}
            aria-label={previaFalla ? TEXTO.editarSiAlgoFalla : TEXTO.verSiAlgoFalla}
            aria-pressed={previaFalla}
            className="shrink-0 font-normal text-text-2"
          >
            {previaFalla ? <Pencil size={14} /> : <Eye size={14} />}
            <span className="hidden sm:inline">{previaFalla ? TEXTO.editar : TEXTO.vistaPrevia}</span>
          </Button>
        </div>
        {previaFalla ? (
          <div className="min-h-[132px] rounded-control border border-hairline bg-surface-1 px-3.5 py-3">
            {guia.siAlgoFalla.trim() ? (
              <Markdown className="text-14 text-text-2">{guia.siAlgoFalla}</Markdown>
            ) : (
              <p className="font-ui text-13 italic text-text-3">{TEXTO.sinContenido}</p>
            )}
          </div>
        ) : (
          <Textarea
            aria-label={TEXTO.siAlgoFalla}
            value={guia.siAlgoFalla}
            onChange={(e) => onCampo({ siAlgoFalla: e.target.value })}
            placeholder={TEXTO.siAlgoFallaPlaceholder}
            disabled={guardando}
            className="min-h-[132px] font-mono text-13 leading-relaxed"
          />
        )}
      </section>

      <Field label={TEXTO.pregunta} hint={TEXTO.preguntaAyuda}>
        <Textarea
          aria-label={TEXTO.pregunta}
          value={guia.preguntaSugerida}
          onChange={(e) => onCampo({ preguntaSugerida: e.target.value })}
          placeholder={TEXTO.preguntaPlaceholder}
          disabled={guardando}
          rows={2}
          className="min-h-[72px] text-14"
        />
      </Field>

      {/* Retiro y restauración viven al FINAL y con su explicación de una
          línea. Arriba, junto a "Guardar cambios", competirían por la misma
          mirada que la acción que se usa cien veces más. */}
      <section aria-labelledby="titulo-zona-retiro" className="mt-2 flex flex-col gap-3 border-t border-hairline pt-6">
        <h3 id="titulo-zona-retiro" className="font-ui text-13 font-medium text-text-2">
          {TEXTO.zonaTitulo}
        </h3>

        {puedeRestaurar && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-hairline bg-bg px-4 py-3">
            <p className="min-w-0 flex-1 font-ui text-13 text-text-2">{TEXTO.restaurarDetalle}</p>
            <Button variant="secondary" size="sm" type="button" onClick={onRestaurar} disabled={guardando}>
              <RotateCcw size={14} strokeWidth={2} />
              {TEXTO.restaurar}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-tarjeta border border-hairline bg-bg px-4 py-3">
          <p className="min-w-0 flex-1 font-ui text-13 text-text-2">
            {esNuevo ? TEXTO.descartarNuevoDetalle : TEXTO.eliminarDetalle}
          </p>
          <Button variant="secondary" size="sm" type="button" onClick={onEliminar} disabled={guardando}>
            <Trash2 size={14} strokeWidth={2} />
            {esNuevo ? TEXTO.descartarNuevo : TEXTO.eliminar}
          </Button>
        </div>
      </section>
    </div>
  );
}
