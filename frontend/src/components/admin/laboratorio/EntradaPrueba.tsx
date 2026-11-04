import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Square } from 'lucide-react';
import { IconButton, Textarea } from '../../ui';
import { cn } from '../../../lib/cn';
import { dur, ease, springSnappy } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { copyLab } from './copyLocal';

const MAX_LINEAS = 5;

/**
 * Campo de la conversación de prueba.
 *
 * El control visual es LA BARRA, no el campo: por eso el `Textarea` del sistema
 * entra con su borde y su anillo anulados y el foco lo dibuja el contenedor.
 * Un anillo dentro de otro anillo se ve como un error de maquetación.
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
  const reducido = useReducedMotion();
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
          'flex items-end gap-2 rounded-tarjeta border border-hairline bg-surface-1 p-2 shadow-1',
          'transition-colors duration-150 focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft',
          // Bloqueado se lee como "apagado", no como "roto": fondo neutro y
          // borde discontinuo, la misma pista que usa cualquier campo que
          // espera un requisito previo.
          bloqueado && 'border-dashed bg-bg shadow-none'
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
            'min-h-0 resize-none border-transparent bg-transparent px-2 py-2 shadow-none',
            'focus:border-transparent focus:ring-0',
            bloqueado && 'cursor-not-allowed'
          )}
        />

        {/* Sin `mode="popLayout"`. `popLayout` saca al elemento saliente del
            flujo, y estos dos botones viven en un `flex` junto a un textarea
            `flex-1`: durante el relevo la barra perdía el ancho del botón y el
            campo se ensanchaba y volvía en un par de frames. Además `popLayout`
            no aportaba nada aquí — los dos botones ocupan exactamente el mismo
            hueco. Es el mismo tratamiento que la barra de /chat. */}
        <AnimatePresence initial={false}>
          {transmitiendo ? (
            <motion.span
              key="detener"
              initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              transition={reducido ? { duration: dur.fast, ease } : springSnappy}
            >
              <IconButton aria-label={copyLab.detener} title={copyLab.detener} onClick={onDetener}>
                <Square size={15} strokeWidth={2.5} fill="currentColor" />
              </IconButton>
            </motion.span>
          ) : (
            <motion.span
              key="enviar"
              initial={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducido ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
              transition={reducido ? { duration: dur.fast, ease } : springSnappy}
            >
              <IconButton
                variant="primary"
                aria-label={copyLab.enviar}
                title={copyLab.enviar}
                disabled={!puedeEnviar}
                onClick={onEnviar}
                className={cn(!puedeEnviar && 'bg-bg text-text-3 hover:bg-bg hover:text-text-3')}
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </IconButton>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <p className={cn('px-1 font-ui text-12', bloqueado ? 'text-status-amber' : 'text-text-3')}>
        {bloqueado && motivoBloqueo ? motivoBloqueo : copyLab.ayudaEntrada}
      </p>
    </div>
  );
}
