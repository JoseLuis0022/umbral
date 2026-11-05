import { Link } from 'react-router-dom';
import { memo, useRef, useState } from 'react';
import { Info, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Button, SegmentedControl, useToast } from '../../ui';
import type { SegmentedOption } from '../../ui';
import { cn } from '../../../lib/cn';
import { SelectorModelo } from './SelectorModelo';
import { ControlTemperatura } from './ControlTemperatura';
import { EditorSystemPrompt } from './EditorSystemPrompt';
import { MAX_SYSTEM_PROMPT } from './modelos';
import { copyLab } from './copyLocal';
import type { NivelPensamiento, ParametrosLab } from './tipos';

const NIVELES: SegmentedOption[] = [
  { value: 'ninguno', label: copyLab.pensamientoNinguno },
  { value: 'bajo', label: copyLab.pensamientoBajo },
  { value: 'medio', label: copyLab.pensamientoMedio },
  { value: 'alto', label: copyLab.pensamientoAlto },
];

/** Cuánto del prompt se asoma en el resumen antes de mandar a leerlo al editor. */
const RESUMEN_MAXIMO = 160;

/**
 * Columna derecha: todo lo que se puede tocar antes de preguntar.
 *
 * El mismo componente sirve al panel fijo de escritorio y al `Drawer` de móvil
 * — por eso no trae ni ancho ni borde propios: los pone quien lo coloca. Dos
 * copias del panel (una "de escritorio" y otra "de móvil") es exactamente
 * cómo se empiezan a desincronizar los formularios.
 *
 * El ORDEN de arriba abajo es el orden de las decisiones: primero con qué
 * documentos se responde (base de conocimiento), después con qué modelo, y solo
 * entonces los matices —instrucciones, razonamiento, temperatura—. La nota de
 * alcance va al pie porque es un pie de página, no un encabezado: leerla
 * primero retrasa la decisión que sí importa.
 */
/*
 * `memo`: este panel cuelga de la misma pantalla que el hilo, y esa pantalla se
 * re-renderiza una vez por frame mientras llega texto. Sin la comparación de
 * props, cada frame arrastraba el selector de modelo, el control de
 * temperatura (que reconstruye su gradiente), el SegmentedControl con su
 * animación de layout y el editor de instrucciones entero — con su Modal, su
 * portal y su AnimatePresence dentro. Nada de eso cambia durante una
 * transmisión.
 */
export const PanelParametros = memo(function PanelParametros({
  parametros,
  onCambiar,
  sessionId,
  ocupado,
  puedeRestablecer,
  onBorrarMemoria,
  onRestablecer,
  className,
}: {
  parametros: ParametrosLab;
  onCambiar: (cambio: Partial<ParametrosLab>) => void;
  sessionId: string;
  /** Hay una transmisión en curso: borrar la memoria ahora dejaría el hilo a medias. */
  ocupado: boolean;
  puedeRestablecer: boolean;
  onBorrarMemoria: () => void;
  onRestablecer: () => void;
  className?: string;
}) {
  const { push } = useToast();
  const [editorAbierto, setEditorAbierto] = useState(false);
  // El foco vuelve al botón que abrió el modal: quien navega con teclado se
  // quedaría al principio del documento si lo soltáramos.
  const botonEditor = useRef<HTMLButtonElement>(null);

  const prompt = parametros.systemPrompt.trim();
  const usados = parametros.systemPrompt.length;
  const casiLleno = usados > MAX_SYSTEM_PROMPT * 0.9;
  const resumen =
    prompt.length > RESUMEN_MAXIMO ? `${prompt.slice(0, RESUMEN_MAXIMO).trimEnd()}…` : prompt;

  function cerrarEditor() {
    setEditorAbierto(false);
    botonEditor.current?.focus();
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/*
        `data-seccion` en cada grupo: es el ancla a la que salta el carril
        cuando el panel está plegado (ver `CarrilParametros`). Va como atributo
        de datos y NO como `id` a propósito — este panel se monta dos veces a la
        vez en móvil (el aside oculto más la copia del cajón), y un `id` fijo
        estaría duplicado en el documento. El laboratorio busca el ancla dentro
        del contenedor que scrollea, así que la duplicación no le afecta.
      */}
      {/* ── 1. Fuente: informativa, no se elige ── */}
      <section data-seccion="corpus" className="flex flex-col gap-1.5">
        <h3 className="font-ui text-13 font-medium text-text-2">{copyLab.corpusEtiqueta}</h3>
        <p className="font-ui text-13 leading-relaxed text-text-2">
          {copyLab.corpusAyuda}{' '}
          <Link to="/admin/corpus" className="font-medium text-accent-fg underline-offset-2 hover:underline">
            {copyLab.corpusVer}
          </Link>
        </p>
      </section>

      {/* ── 2. Modelo ── */}
      <div data-seccion="modelo">
        <SelectorModelo valor={parametros.modelo} onCambiar={(modelo) => onCambiar({ modelo })} />
      </div>

      {/* ── 3. Instrucciones del sistema ── */}
      <section data-seccion="instrucciones" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-ui text-13 font-medium text-text-2">{copyLab.instruccionesEtiqueta}</h3>
          {prompt && (
            <span
              className={cn(
                'shrink-0 font-ui text-12 tabular-nums',
                casiLleno ? 'text-status-amber' : 'text-text-3'
              )}
              title={casiLleno ? copyLab.contadorCasiLleno : undefined}
            >
              {copyLab.contador(usados, MAX_SYSTEM_PROMPT)}
            </span>
          )}
        </div>

        {/* Resumen y no el texto completo: un system prompt largo empujaría el
            resto del panel fuera de la pantalla, que es justo lo que este
            rediseño vino a arreglar. */}
        <p
          className={cn(
            'rounded-control border border-hairline bg-bg px-3 py-2.5 font-ui text-12 leading-snug',
            prompt ? 'whitespace-pre-wrap break-words text-text-2' : 'italic text-text-3'
          )}
        >
          {resumen || copyLab.instruccionesVacio}
        </p>

        <Button
          ref={botonEditor}
          variant="secondary"
          size="sm"
          className="self-start"
          aria-haspopup="dialog"
          aria-expanded={editorAbierto}
          title={copyLab.instruccionesAbrir}
          onClick={() => setEditorAbierto(true)}
        >
          <Pencil size={14} /> {copyLab.instruccionesEditar}
        </Button>
      </section>

      {/* ── 4. Nivel de pensamiento ── */}
      <div data-seccion="pensamiento" className="flex flex-col gap-1.5">
        <span className="font-ui text-13 font-medium text-text-2" id="lab-nivel-pensamiento">
          {copyLab.pensamientoEtiqueta}
        </span>
        <div role="group" aria-labelledby="lab-nivel-pensamiento">
          {/* Sin `layoutId` explícito. Este panel se monta DOS veces a la vez
              en móvil —el aside de escritorio sigue en el DOM, oculto con
              `hidden lg:flex`, y el cajón monta otra copia—, así que un
              identificador fijo emparejaba dos pastillas y la del cajón podía
              animar desde la caja de un nodo invisible de 0×0: salía volando o
              se colapsaba. Sin el prop, cada instancia recibe el suyo. */}
          <SegmentedControl
            options={NIVELES}
            value={parametros.nivelPensamiento}
            onChange={(valor) => onCambiar({ nivelPensamiento: valor as NivelPensamiento })}
          />
        </div>
        <p className="font-ui text-12 text-text-3">{copyLab.pensamientoAyuda}</p>
      </div>

      {/* ── 5. Temperatura ── */}
      <div data-seccion="temperatura">
        <ControlTemperatura
          valor={parametros.temperatura}
          onCambiar={(temperatura) => onCambiar({ temperatura })}
        />
      </div>

      {/* ── 6. Memoria ── */}
      <section
        data-seccion="memoria"
        className="flex flex-col gap-2 rounded-tarjeta border border-hairline bg-bg p-4"
      >
        <h3 className="font-ui text-13 font-semibold text-text-1">{copyLab.memoriaTitulo}</h3>
        <p className="font-ui text-12 leading-snug text-text-2">{copyLab.memoriaExplicacion}</p>

        <p className="flex min-w-0 items-baseline gap-2 font-ui text-12 text-text-3">
          <span className="shrink-0">{copyLab.sesionEtiqueta}</span>
          <code className="min-w-0 truncate font-mono text-12 text-text-2">{sessionId}</code>
        </p>

        <Button
          variant="secondary"
          size="sm"
          className="mt-1 self-start text-status-red hover:border-status-red/30 hover:bg-status-red-soft"
          disabled={ocupado}
          onClick={onBorrarMemoria}
        >
          <Trash2 size={14} /> {copyLab.memoriaBoton}
        </Button>
      </section>

      {/* Nota honesta y permanente, no un `Banner`: el Banner alinea su icono
          al centro vertical y este texto ocupa tres líneas en un panel de
          360 px, así que el icono quedaría flotando a media altura. Mismos
          tokens (azul de información), icono arriba. */}
      <p className="flex items-start gap-2 rounded-tarjeta border border-status-blue/20 bg-status-blue-soft px-4 py-3 font-ui text-12 leading-snug text-status-blue">
        <Info size={15} strokeWidth={2} className="mt-px shrink-0" aria-hidden />
        <span>{copyLab.avisoAlcance}</span>
      </p>

      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={!puedeRestablecer}
        onClick={onRestablecer}
      >
        <RotateCcw size={14} /> {copyLab.restablecerBoton}
      </Button>

      <EditorSystemPrompt
        abierto={editorAbierto}
        valor={parametros.systemPrompt}
        onGuardar={(systemPrompt) => {
          onCambiar({ systemPrompt });
          // Confirmación explícita: el modal se cierra y el resumen del panel
          // cambia, pero si el prompt era largo el resumen se ve casi igual y
          // quedaría la duda de si se guardó.
          push({ message: copyLab.instruccionesGuardadas, tone: 'success' });
        }}
        onCerrar={cerrarEditor}
      />
    </div>
  );
});
