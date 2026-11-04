import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Bold, Heading2, Heading3, Italic, List } from 'lucide-react';
import { Button, IconButton, Modal, Tabs, Textarea } from '../../ui';
import type { TabItem } from '../../ui';
import { Markdown } from '../../Markdown';
import { cn } from '../../../lib/cn';
import { MAX_SYSTEM_PROMPT } from './modelos';
import { envolver, prefijarLineas, type Edicion } from './markdownEdicion';
import { copyLab } from './copyLocal';

type Pestana = 'escribir' | 'previa';

const PESTANAS: TabItem[] = [
  { value: 'escribir', label: copyLab.editorEscribir },
  { value: 'previa', label: copyLab.editorVistaPrevia },
];

/**
 * Editor de las instrucciones del sistema, en modal.
 *
 * Antes era un `Textarea` de 132 px incrustado en el panel de 360. Un system
 * prompt de verdad son treinta renglones con títulos y viñetas, y editarlo por
 * una mirilla es lo que hace que nadie lo edite. En modal hay sitio para la
 * barra de formato, para escribir con holgura y para ver el markdown ya
 * renderizado antes de guardar.
 *
 * Tres decisiones que explican el archivo:
 *
 *  - **El texto se edita en una copia local.** Lo que se escribe no toca los
 *    parámetros hasta pulsar Guardar; Cancelar tiene que poder deshacerlo todo,
 *    y con escritura directa "cancelar" no significaría nada.
 *
 *  - **Escape y el descarte los maneja este componente.** El `Modal` del
 *    sistema cierra por aspa y por fondo, pero no escucha el teclado; y con
 *    cambios sin guardar cerrar de golpe pierde trabajo. Por eso el descarte se
 *    confirma EN LÍNEA, en el pie del propio modal: `window.confirm` bloquea el
 *    hilo, no se puede estilar y en móvil aparece pegado al borde del navegador.
 *
 *  - **Vista previa en pestaña, no en dos columnas.** El modal mide 672 px de
 *    ancho; partirlo daría dos columnas de 320 en las que ni se escribe ni se
 *    lee. En pestañas, cada modo usa el ancho completo.
 */
export function EditorSystemPrompt({
  abierto,
  valor,
  onGuardar,
  onCerrar,
}: {
  abierto: boolean;
  /** Valor guardado. Es lo que se copia a la edición local al abrir. */
  valor: string;
  onGuardar: (texto: string) => void;
  onCerrar: () => void;
}) {
  const [texto, setTexto] = useState(valor);
  const [pestana, setPestana] = useState<Pestana>('escribir');
  const [confirmando, setConfirmando] = useState(false);

  // El panel se monta dos veces (escritorio y cajón de móvil), así que el id
  // del campo NO puede ser una constante: dos elementos con el mismo id dejan
  // sin efecto el `aria-controls` de la barra de formato.
  const idCampo = useId();

  const campo = useRef<HTMLTextAreaElement>(null);
  const estabaAbierto = useRef(abierto);
  // Selección que hay que restaurar DESPUÉS del re-render: el textarea es
  // controlado, así que en el momento de pulsar el botón de formato el DOM
  // todavía tiene el texto viejo y colocar el cursor ahí no serviría de nada.
  const seleccionPendiente = useRef<[number, number] | null>(null);

  const sucio = texto !== valor;
  const usados = texto.length;
  const casiLleno = usados > MAX_SYSTEM_PROMPT * 0.9;

  // Al abrir se estrena la edición desde el valor guardado. Solo en la
  // transición cerrado → abierto: dentro de la sesión de edición, `valor` no
  // debe pisar lo que se está escribiendo.
  useEffect(() => {
    if (abierto && !estabaAbierto.current) {
      setTexto(valor);
      setPestana('escribir');
      setConfirmando(false);
    }
    estabaAbierto.current = abierto;
  }, [abierto, valor]);

  // El foco entra al campo, con el cursor al final. Se espera un frame porque
  // el modal entra animado y el textarea aún no está en el DOM al montar.
  useEffect(() => {
    if (!abierto) return;
    const id = requestAnimationFrame(() => {
      const el = campo.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
    return () => cancelAnimationFrame(id);
  }, [abierto]);

  useLayoutEffect(() => {
    const el = campo.current;
    const seleccion = seleccionPendiente.current;
    if (!el || !seleccion) return;
    seleccionPendiente.current = null;
    // Devolver el foco es obligatorio: sin esto el foco se queda en el botón de
    // la barra y lo siguiente que se teclee no entra en el texto.
    el.focus();
    el.setSelectionRange(seleccion[0], seleccion[1]);
  }, [texto]);

  const intentarCerrar = useCallback(() => {
    if (sucio) {
      setConfirmando(true);
      return;
    }
    onCerrar();
  }, [sucio, onCerrar]);

  // Escape cierra, y con cambios sin guardar primero pregunta. Un segundo
  // Escape mientras se pregunta vuelve a editar (nunca descarta): la tecla de
  // "salir de aquí" no puede ser también la que tira el trabajo.
  useEffect(() => {
    if (!abierto) return;
    function alTecla(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return;
      evento.stopPropagation();
      if (confirmando) setConfirmando(false);
      else intentarCerrar();
    }
    window.addEventListener('keydown', alTecla);
    return () => window.removeEventListener('keydown', alTecla);
  }, [abierto, confirmando, intentarCerrar]);

  /** Aplica una edición sobre la selección viva del textarea. */
  const aplicar = useCallback((operacion: (texto: string, inicio: number, fin: number) => Edicion) => {
    const el = campo.current;
    if (!el) return;
    const resultado = operacion(el.value, el.selectionStart, el.selectionEnd);
    // El tope es de interfaz, pero si insertar la marca lo rebasara se perdería
    // texto por el final sin avisar. Se prefiere no hacer nada y devolver el
    // foco: el contador ya está en ámbar diciendo que no cabe más.
    if (resultado.texto.length > MAX_SYSTEM_PROMPT) {
      el.focus();
      return;
    }
    seleccionPendiente.current = [resultado.inicio, resultado.fin];
    setTexto(resultado.texto);
  }, []);

  function guardar() {
    onGuardar(texto);
    onCerrar();
  }

  function descartar() {
    setConfirmando(false);
    setTexto(valor);
    onCerrar();
  }

  return (
    <Modal open={abierto} onClose={intentarCerrar} title={copyLab.instruccionesEtiqueta} size="lg"
      footer={
        confirmando ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <p className="mr-auto font-ui text-13 text-status-amber">{copyLab.editorDescartarAviso}</p>
            <Button variant="secondary" size="sm" onClick={() => setConfirmando(false)}>
              {copyLab.editorDescartarNo}
            </Button>
            {/* `destructive` y no el rojo de marca: descartar es una pérdida, no
                la acción que la pantalla quiere que hagas. */}
            <Button variant="destructive" size="sm" onClick={descartar}>
              {copyLab.editorDescartarSi}
            </Button>
          </div>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={intentarCerrar}>
              {copyLab.editorCancelar}
            </Button>
            {/* Único primario de esta capa: el modal es la superficie activa
                mientras está abierto, y guardar es lo que se vino a hacer. */}
            <Button variant="primary" size="sm" onClick={guardar}>
              {copyLab.editorGuardar}
            </Button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-3">
        {/* Sin `layoutId` fijo: el panel de parámetros puede estar montado dos
            veces a la vez en móvil (aside oculto + cajón), y un identificador
            compartido hace que el subrayado se empareje con el de la copia
            invisible. Ver la nota equivalente en PanelParametros. */}
        <Tabs items={PESTANAS} value={pestana} onChange={(v) => setPestana(v as Pestana)} />

        {pestana === 'escribir' ? (
          <>
            <div
              role="toolbar"
              aria-label={copyLab.editorBarra}
              aria-controls={idCampo}
              className="flex flex-wrap items-center gap-1 rounded-control border border-hairline bg-bg px-1.5 py-1"
            >
              <BotonFormato
                etiqueta={copyLab.editorNegrita}
                onClick={() => aplicar((t, i, f) => envolver(t, i, f, '**'))}
              >
                <Bold size={16} strokeWidth={2.25} />
              </BotonFormato>
              <BotonFormato
                etiqueta={copyLab.editorCursiva}
                onClick={() => aplicar((t, i, f) => envolver(t, i, f, '*'))}
              >
                <Italic size={16} strokeWidth={2.25} />
              </BotonFormato>

              <span className="mx-1 h-5 w-px shrink-0 bg-hairline" aria-hidden />

              <BotonFormato
                etiqueta={copyLab.editorTitulo}
                onClick={() => aplicar((t, i, f) => prefijarLineas(t, i, f, '## ', true))}
              >
                <Heading2 size={16} strokeWidth={2.25} />
              </BotonFormato>
              <BotonFormato
                etiqueta={copyLab.editorSubtitulo}
                onClick={() => aplicar((t, i, f) => prefijarLineas(t, i, f, '### ', true))}
              >
                <Heading3 size={16} strokeWidth={2.25} />
              </BotonFormato>
              <BotonFormato
                etiqueta={copyLab.editorLista}
                onClick={() => aplicar((t, i, f) => prefijarLineas(t, i, f, '- ', false))}
              >
                <List size={16} strokeWidth={2.25} />
              </BotonFormato>
            </div>

            <Textarea
              ref={campo}
              id={idCampo}
              value={texto}
              maxLength={MAX_SYSTEM_PROMPT}
              placeholder={copyLab.instruccionesPlaceholder}
              onChange={(e) => setTexto(e.target.value)}
              aria-label={copyLab.instruccionesEtiqueta}
              className="min-h-[46vh] resize-none font-mono text-13 leading-relaxed"
            />
          </>
        ) : (
          // min-h igual al del campo: cambiar de pestaña no debe mover el pie
          // del modal ni redimensionar la ventana.
          <div className="min-h-[46vh] rounded-control border border-hairline bg-surface-1 px-4 py-3">
            {texto.trim() ? (
              <Markdown>{texto}</Markdown>
            ) : (
              <p className="font-ui text-13 italic text-text-3">{copyLab.editorVistaVacia}</p>
            )}
          </div>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <p className="font-ui text-12 text-text-3">{copyLab.instruccionesAyuda}</p>
          {/* Tabular: el contador cambia con cada tecla y sin cifras de ancho
              fijo el número entero baila mientras se escribe. */}
          <span
            className={cn(
              'shrink-0 font-ui text-12 tabular-nums',
              casiLleno ? 'text-status-amber' : 'text-text-3'
            )}
            title={usados >= MAX_SYSTEM_PROMPT ? copyLab.topeAlcanzado : undefined}
          >
            {copyLab.contador(usados, MAX_SYSTEM_PROMPT)}
          </span>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Botón de la barra de formato. `onMouseDown` con `preventDefault` es lo que
 * evita que el navegador quite el foco (y con él la selección) del textarea
 * antes de que el click llegue a leerla.
 */
function BotonFormato({
  etiqueta,
  onClick,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <IconButton
      aria-label={etiqueta}
      title={etiqueta}
      className="h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </IconButton>
  );
}
