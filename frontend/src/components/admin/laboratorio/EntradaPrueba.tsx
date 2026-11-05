import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { Textarea } from '../../ui';
import { BotonEnviar } from '../../chat/BarraEntrada';
import { cn } from '../../../lib/cn';
import { copyLab } from './copyLocal';

const MAX_LINEAS = 5;

/**
 * Campo de la conversación de prueba: el MISMO composer que /chat (radio de 24
 * px, borde como anillo de sombra que se asienta con el foco, enviar/detener en
 * un círculo de 32 px), sin adjuntos ni selector: aquí los parámetros viven en
 * el panel de la derecha.
 *
 * El control visual es LA BARRA, no el campo: por eso el `Textarea` del sistema
 * entra con su borde y su anillo anulados y el foco lo dibuja el contenedor.
 *
 * El botón de enviar y el de detener ocupan el MISMO hueco. Moverlo mientras
 * responde obligaría a volver a buscar con la vista el botón que se necesita
 * justo cuando más prisa hay por cancelar.
 */
export function EntradaPrueba({
  valor,
  onCambio,
  onEnviar,
  onDetener,
  transmitiendo,
  bloqueado = false,
  motivoBloqueo,
  senalFoco = 0,
}: {
  valor: string;
  onCambio: (valor: string) => void;
  onEnviar: () => void;
  onDetener: () => void;
  transmitiendo: boolean;
  /**
   * Todavía no se puede preguntar (falta elegir base de conocimiento). El campo
   * se deshabilita en vez de ocultarse: quitarlo de la pantalla haría creer que
   * el laboratorio no tiene conversación, y lo que pasa es que falta un paso.
   */
  bloqueado?: boolean;
  /** Qué falta para desbloquear. Sustituye a la ayuda de teclado mientras dure. */
  motivoBloqueo?: string;
  /**
   * Contador que devuelve el foco al campo cada vez que CAMBIA. Un booleano no
   * sirve: pulsar dos ejemplos seguidos lo dejaría en `true` las dos veces y el
   * efecto no volvería a correr.
   */
  senalFoco?: number;
}) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const puedeEnviar = valor.trim().length > 0 && !transmitiendo && !bloqueado;

  // Crece hasta cinco líneas y a partir de ahí scrollea. Se mide contra el
  // line-height computado y no contra una constante: si la escala tipográfica
  // cambia, el límite sigue siendo cinco líneas de verdad.
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    const estilos = getComputedStyle(el);
    const alturaLinea = parseFloat(estilos.lineHeight) || 22;
    const relleno = parseFloat(estilos.paddingTop) + parseFloat(estilos.paddingBottom);
    const maximo = alturaLinea * MAX_LINEAS + relleno;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, maximo)}px`;
    el.style.overflowY = el.scrollHeight > maximo ? 'auto' : 'hidden';
  }, [valor]);

  // El cursor se coloca al FINAL. Al precargar una pregunta de ejemplo, enfocar
  // sin más lo deja en la posición 0 y lo siguiente que se escriba se cuela
  // delante del texto.
  useEffect(() => {
    const el = campo.current;
    if (!el || senalFoco === 0) return;
    el.focus();
    const fin = el.value.length;
    el.setSelectionRange(fin, fin);
  }, [senalFoco]);

  function alTeclado(e: KeyboardEvent<HTMLTextAreaElement>) {
    // `isComposing` protege a quien escribe con acentos o IME: sin la guarda,
    // Enter confirma la composición Y envía el mensaje a medias.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (puedeEnviar) onEnviar();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          'flex items-end gap-2 rounded-composer bg-surface-1 p-2 pl-2.5 shadow-composer',
          'transition-shadow duration-150 ease-umbral focus-within:shadow-composer-foco',
          // Bloqueado se lee como "apagado", no como "roto": fondo neutro y
          // sin elevación, la misma pista que usa cualquier campo que espera
          // un requisito previo.
          bloqueado && 'bg-bg shadow-anillo'
        )}
      >
        <Textarea
          ref={campo}
          rows={1}
          value={valor}
          disabled={bloqueado}
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={alTeclado}
          placeholder={bloqueado ? copyLab.placeholderBloqueado : copyLab.placeholderEntrada}
          aria-label={bloqueado ? copyLab.placeholderBloqueado : copyLab.placeholderEntrada}
          className={cn(
            'min-h-0 resize-none rounded-none border-transparent bg-transparent px-2 py-1.5 text-15 leading-[22px] shadow-none',
            'focus:border-transparent focus:ring-0',
            bloqueado && 'cursor-not-allowed'
          )}
        />

        {/* Enviar y detener ocupan el MISMO círculo (ver `BotonEnviar`):
            moverlo mientras responde obligaría a buscar el botón justo cuando
            hay prisa por cancelar. */}
        <div className="flex h-9 shrink-0 items-center pr-0.5">
          <BotonEnviar
            transmitiendo={transmitiendo}
            puedeEnviar={puedeEnviar}
            onEnviar={onEnviar}
            onDetener={onDetener}
          />
        </div>
      </div>

      <p className={cn('px-1 font-ui text-12', bloqueado ? 'text-status-amber' : 'text-text-3')}>
        {bloqueado && motivoBloqueo ? motivoBloqueo : copyLab.ayudaEntrada}
      </p>
    </div>
  );
}
