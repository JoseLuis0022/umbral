import { useId, useMemo } from 'react';
import { SelectorLista, type OpcionLista } from '../../ui';
import { MODELOS } from './modelos';
import { copyLab } from './copyLocal';
import type { ModeloCatalogo } from './tipos';

/**
 * Selector de modelo: un control de 40 px, no seis tarjetas.
 *
 * Antes cada modelo era una tarjeta con radio, nombre, id y descripción. Se
 * leía bien pero se comía la columna entera: seis tarjetas dejaban el resto de
 * los parámetros —temperatura, memoria— fuera de la primera pantalla, y el
 * panel existe para verlos todos a la vez.
 *
 * Con el `<select>` nativo la información no cabía y había que apretarla:
 * "GPT-4.1 · Equilibrado" en el texto de la opción, y el id técnico y la
 * descripción repetidos debajo del control. Ahora cada opción del desplegable
 * lleva lo suyo —nombre, carácter, id en monoespaciada y para qué sirve— y solo
 * se ve al elegir, que es cuando se necesita.
 *
 * Debajo del control se queda ÚNICAMENTE el id del modelo elegido: es lo que se
 * copia en la configuración del asistente y hay que poder leerlo sin abrir
 * nada. La descripción ya no se repite ahí: vive en su opción.
 */
export function SelectorModelo({
  valor,
  onCambiar,
  disabled,
}: {
  valor: string;
  onCambiar: (id: string) => void;
  disabled?: boolean;
}) {
  const idEtiqueta = useId();
  const elegido = MODELOS.find((m) => m.id === valor);

  const opciones = useMemo<OpcionLista<ModeloCatalogo>[]>(
    () => MODELOS.map((m) => ({ valor: m.id, texto: m.nombre, dato: m })),
    []
  );

  return (
    <div className="flex flex-col gap-1.5">
      {/* `span` con `id`, no `<label htmlFor>`: ver el porqué en SelectorCorpus. */}
      <span id={idEtiqueta} className="font-ui text-13 font-medium text-text-2">
        {copyLab.modeloEtiqueta}
      </span>

      <SelectorLista
        opciones={opciones}
        valor={valor}
        onCambiar={onCambiar}
        etiquetaId={idEtiqueta}
        tituloHoja={copyLab.modeloAbrir}
        disabled={disabled}
        renderDisparador={(opcion) => (
          <>
            <span className="min-w-0 truncate">{opcion.dato.nombre}</span>
            {/* El carácter del modelo va en una marca, no apretado en el texto
                con un separador: se distingue del nombre de un vistazo. */}
            <span className="shrink-0 rounded-celda border border-hairline bg-bg px-1.5 font-ui text-12 text-text-2">
              {opcion.dato.etiqueta}
            </span>
          </>
        )}
        renderOpcion={(opcion) => (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="min-w-0 truncate font-ui text-14 font-medium text-text-1">
                {opcion.dato.nombre}
              </span>
              <span className="shrink-0 rounded-celda border border-hairline bg-bg px-1.5 font-ui text-12 text-text-2">
                {opcion.dato.etiqueta}
              </span>
            </div>
            {/* El id se queda en inglés y en mono: es un identificador técnico,
                no una etiqueta de interfaz. */}
            <code className="truncate font-mono text-12 text-text-3">{opcion.dato.id}</code>
            <p className="font-ui text-12 leading-snug text-text-2">{opcion.dato.descripcion}</p>
          </div>
        )}
      />

      {elegido && (
        // `aria-live` no hace falta: el propio selector anuncia la opción al
        // elegirla, y repetir el nombre por otro canal duplicaría el aviso.
        <code className="truncate font-mono text-12 text-text-3" title={elegido.id}>
          {elegido.id}
        </code>
      )}

      <p className="font-ui text-12 text-text-3">{copyLab.modeloAyuda}</p>
    </div>
  );
}
