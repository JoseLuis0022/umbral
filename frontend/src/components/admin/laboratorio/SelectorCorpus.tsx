import { useId, useMemo } from 'react';
import { AlertTriangle, Library } from 'lucide-react';
import { Button, SelectorLista, Skeleton, type OpcionLista } from '../../ui';
import { copyLab } from './copyLocal';
import type { EstadoCorpus } from './tipos';
import type { Corpus } from '../../../types';

/**
 * Elección de base de conocimiento. Va ARRIBA DEL TODO en el panel porque es
 * la primera decisión de la pantalla: el modelo, la temperatura y las
 * instrucciones modulan CÓMO responde el asistente; la base decide CON QUÉ
 * documentos. Preguntar sin haberla elegido no tiene respuesta posible, y por
 * eso mientras esté vacía la conversación queda deshabilitada.
 *
 * Con el selector propio, cada opción muestra lo que de verdad ayuda a elegir:
 * nombre, para qué sirve esa base y cuántos documentos tiene. Con un `<select>`
 * nativo eso no cabía —una línea por opción— y había que elegir a ciegas entre
 * nombres parecidos.
 *
 * Los tres estados de la lista se pintan aquí y no en la pantalla: cargando
 * (esqueleto de la altura exacta del control, para que nada brinque al llegar),
 * error (con reintento a un toque) y vacío (que en esta maqueta significa que
 * nadie ha creado todavía un corpus, no que algo se haya roto).
 */
export function SelectorCorpus({
  corpus,
  estado,
  valor,
  onCambiar,
  onReintentar,
  conteoDocumentos,
  disabled,
}: {
  corpus: Corpus[];
  estado: EstadoCorpus;
  valor: string;
  onCambiar: (id: string) => void;
  onReintentar: () => void;
  /**
   * Documentos por base. Llega DESPUÉS de la lista (es otra consulta) y por eso
   * es opcional: la base ya se puede elegir sin saber cuántos archivos tiene.
   */
  conteoDocumentos?: Record<string, number>;
  disabled?: boolean;
}) {
  const idEtiqueta = useId();
  const idAyuda = useId();
  const elegido = corpus.find((c) => c.id === valor);
  const vacia = estado === 'listo' && corpus.length === 0;
  const hayControl = estado === 'listo' && !vacia;

  const opciones = useMemo<OpcionLista<Corpus>[]>(
    () => corpus.map((c) => ({ valor: c.id, texto: c.nombre, dato: c })),
    [corpus]
  );

  return (
    <div className="flex flex-col gap-1.5">
      {/* Un `span` con `id` y no un `<label htmlFor>`: el disparador es un
          `button` con `role="combobox"`, y a un botón no se le puede asociar
          una etiqueta con `for`. El selector lo referencia con
          `aria-labelledby`, que sí lo etiqueta de verdad. */}
      <span
        id={idEtiqueta}
        className="flex items-center gap-1.5 font-ui text-13 font-medium text-text-2"
      >
        <Library size={14} strokeWidth={2} className="text-text-3" aria-hidden />
        {copyLab.corpusEtiqueta}
      </span>

      {estado === 'cargando' && (
        <>
          {/* h-10 = la altura exacta del disparador, para que al llegar la
              lista el panel no dé un salto. */}
          <Skeleton className="h-10 w-full rounded-control" />
          <p className="font-ui text-12 text-text-3" role="status">
            {copyLab.corpusCargando}
          </p>
        </>
      )}

      {estado === 'error' && (
        <div
          role="alert"
          className="flex flex-col items-start gap-2 rounded-control border border-status-red/20 bg-status-red-soft px-3 py-2.5"
        >
          <p className="flex items-start gap-2 font-ui text-12 leading-snug text-status-red">
            <AlertTriangle size={14} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
            <span>{copyLab.corpusError}</span>
          </p>
          <Button variant="secondary" size="sm" onClick={onReintentar}>
            {copyLab.corpusReintentar}
          </Button>
        </div>
      )}

      {hayControl && (
        <SelectorLista
          opciones={opciones}
          valor={valor}
          onCambiar={onCambiar}
          etiquetaId={idEtiqueta}
          describedBy={idAyuda}
          tituloHoja={copyLab.corpusAbrir}
          placeholder={copyLab.corpusPlaceholder}
          disabled={disabled}
          renderDisparador={(opcion) => (
            <span className="truncate">{opcion.dato.nombre}</span>
          )}
          renderOpcion={(opcion) => {
            const documentos = conteoDocumentos?.[opcion.valor];
            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-ui text-14 font-medium text-text-1">
                    {opcion.dato.nombre}
                  </span>
                  {documentos !== undefined && (
                    <span className="shrink-0 font-ui text-12 tabular-nums text-text-3">
                      {copyLab.corpusDocumentos(documentos)}
                    </span>
                  )}
                </div>
                {opcion.dato.descripcion && (
                  <p className="font-ui text-12 leading-snug text-text-2">
                    {opcion.dato.descripcion}
                  </p>
                )}
              </div>
            );
          }}
        />
      )}

      {vacia && (
        <p className="rounded-control border border-hairline bg-bg px-3 py-2.5 font-ui text-12 leading-snug text-text-2">
          {copyLab.corpusVacio}
        </p>
      )}

      {/* La descripción de la base elegida se queda: el desplegable se cierra y
          esto es lo único que sigue diciendo CONTRA QUÉ documentos se pregunta
          mientras dura la conversación. */}
      {elegido?.descripcion && (
        <p className="font-ui text-12 leading-snug text-text-2">{elegido.descripcion}</p>
      )}

      <p
        id={idAyuda}
        className={
          hayControl && !elegido
            ? 'font-ui text-12 font-medium text-status-amber'
            : 'font-ui text-12 text-text-3'
        }
      >
        {hayControl && !elegido ? copyLab.corpusPendiente : copyLab.corpusAyuda}
      </p>
    </div>
  );
}
