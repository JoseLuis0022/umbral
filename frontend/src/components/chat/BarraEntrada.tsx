import { useEffect, useLayoutEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Paperclip, Square, X } from 'lucide-react';
import type { Adjunto } from '../../types';
import { cn } from '../../lib/cn';
import { springSnappy, dur, ease } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { tamanoLegible } from '../../lib/fechas';
import { IconButton, Textarea, useToast } from '../ui';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';

const EXTENSIONES = ['.pdf', '.docx', '.msg', '.eml', '.png', '.jpg', '.jpeg'];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_ARCHIVOS = 5;
const MAX_LINEAS = 6;

type Props = {
  valor: string;
  onCambio: (valor: string) => void;
  adjuntos: Adjunto[];
  onAdjuntos: (adjuntos: Adjunto[]) => void;
  onEnviar: () => void;
  onDetener: () => void;
  transmitiendo: boolean;
  autoFoco?: boolean;
  /**
   * Contador que devuelve el foco al campo cada vez que CAMBIA. Un booleano no
   * sirve para esto: precargar dos chips seguidos lo dejaría en `true` las dos
   * veces y el efecto no volvería a correr.
   */
  senalFoco?: number;
  className?: string;
};

/**
 * Barra de entrada del chat.
 *
 * Es un compuesto (adjuntar + campo que crece + enviar/detener) y no un campo
 * suelto, pero el `Textarea` de adentro sí es el del sistema de diseño, con el
 * borde y el anillo de foco anulados: el foco lo dibuja la barra completa, no
 * el campo, porque visualmente el control es la barra.
 */
export function BarraEntrada({
  valor,
  onCambio,
  adjuntos,
  onAdjuntos,
  onEnviar,
  onDetener,
  transmitiendo,
  autoFoco,
  senalFoco = 0,
  className,
}: Props) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const archivos = useRef<HTMLInputElement>(null);
  const { push } = useToast();
  const reducido = useReducedMotion();

  const puedeEnviar = valor.trim().length > 0 && !transmitiendo;

  // Crecimiento hasta 6 líneas y scroll a partir de ahí. Se mide contra el
  // line-height computado y no contra una constante: si algún día cambia la
  // escala tipográfica, el límite sigue siendo seis líneas de verdad.
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    const estilos = getComputedStyle(el);
    const alturaLinea = parseFloat(estilos.lineHeight) || 22;
    const relleno = parseFloat(estilos.paddingTop) + parseFloat(estilos.paddingBottom);
    const maximo = alturaLinea * MAX_LINEAS + relleno;
    el.style.height = 'auto';
    const deseada = Math.min(el.scrollHeight, maximo);
    el.style.height = `${deseada}px`;
    el.style.overflowY = el.scrollHeight > maximo ? 'auto' : 'hidden';
  }, [valor]);

  // El cursor se coloca al FINAL del texto, no al principio. Cuando el valor
  // llega precargado desde fuera (un chip del estado vacío, la pregunta de una
  // guía), enfocar sin más deja el cursor en la posición 0 y lo siguiente que
  // se escriba se cuela delante de la pregunta.
  useEffect(() => {
    const el = campo.current;
    if (!el || !autoFoco) return;
    el.focus();
    const fin = el.value.length;
    el.setSelectionRange(fin, fin);
  }, [autoFoco, senalFoco]);

  function alTeclado(e: KeyboardEvent<HTMLTextAreaElement>) {
    // `isComposing` protege a quien escribe con teclado de acentos o IME: sin
    // esta guarda, Enter confirma la composición Y envía el mensaje a medias.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (puedeEnviar) onEnviar();
    }
  }

  function agregarArchivos(e: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!lista.length) return;

    const nuevos: Adjunto[] = [];
    for (const archivo of lista) {
      const extension = `.${archivo.name.split('.').pop()?.toLowerCase() ?? ''}`;
      if (!EXTENSIONES.includes(extension)) {
        push({ message: copyLocal.adjuntoTipo(archivo.name), tone: 'error' });
        continue;
      }
      if (archivo.size > MAX_BYTES) {
        push({ message: copyLocal.adjuntoPesado(archivo.name), tone: 'error' });
        continue;
      }
      if (adjuntos.length + nuevos.length >= MAX_ARCHIVOS) {
        push({ message: copyLocal.adjuntoLimite, tone: 'error' });
        break;
      }
      nuevos.push({
        // Los archivos no se suben a ningún lado: solo se registra su ficha
        // para que el mensaje enviado la muestre.
        id: `${archivo.name}-${archivo.size}-${nuevos.length}`,
        nombre: archivo.name,
        tipo: extension.slice(1),
        tamanoBytes: archivo.size,
      });
    }
    if (nuevos.length) onAdjuntos([...adjuntos, ...nuevos]);
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        className={cn(
          'rounded-tarjeta border border-hairline bg-surface-1 shadow-2 transition-colors duration-150',
          'focus-within:border-accent/40 focus-within:ring-[3px] focus-within:ring-accent-soft'
        )}
      >
        <AnimatePresence initial={false}>
          {adjuntos.length > 0 && (
            <motion.div
              initial={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={reducido ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
              exit={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={springSnappy}
              className="overflow-hidden"
            >
              <ul className="flex flex-wrap gap-1.5 border-b border-hairline px-3 py-2.5">
                {adjuntos.map((a) => (
                  <li key={a.id}>
                    <FichaAdjunto adjunto={a} onQuitar={() => onAdjuntos(adjuntos.filter((x) => x.id !== a.id))} />
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-1 p-1.5">
          <input
            ref={archivos}
            type="file"
            multiple
            className="hidden"
            accept={EXTENSIONES.join(',')}
            onChange={agregarArchivos}
          />
          <IconButton
            aria-label={copy.adjuntar}
            onClick={() => archivos.current?.click()}
            disabled={adjuntos.length >= MAX_ARCHIVOS}
          >
            <Paperclip size={18} />
          </IconButton>

          <Textarea
            ref={campo}
            rows={1}
            value={valor}
            onChange={(e) => onCambio(e.target.value)}
            onKeyDown={alTeclado}
            placeholder={copy.placeholder}
            aria-label={copy.placeholder}
            className="min-h-0 flex-1 resize-none border-transparent bg-transparent px-1.5 py-2.5 leading-[22px] focus:border-transparent focus:ring-0"
          />

          {transmitiendo ? (
            <IconButton
              aria-label={copy.detener}
              onClick={onDetener}
              className="rounded-full bg-text-1 text-white hover:bg-text-1 hover:text-white"
            >
              <Square size={13} fill="currentColor" />
            </IconButton>
          ) : (
            <IconButton
              aria-label={copy.enviar}
              onClick={onEnviar}
              disabled={!puedeEnviar}
              variant={puedeEnviar ? 'primary' : 'ghost'}
              className={cn('rounded-full', !puedeEnviar && 'bg-bg text-text-3')}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </IconButton>
          )}
        </div>
      </div>

      {/* Requisito institucional: el aviso vive pegado al input y no se oculta
          nunca, ni siquiera durante la transmisión. */}
      <p className="mt-2 px-2 text-center font-ui text-12 text-text-3">{copy.avisoIA}</p>
    </div>
  );
}

export function FichaAdjunto({
  adjunto,
  onQuitar,
}: {
  adjunto: Adjunto;
  onQuitar?: () => void;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
      transition={springSnappy}
      className="inline-flex max-w-[220px] items-center gap-1.5 rounded-celda border border-hairline bg-bg py-1 pl-2.5 pr-1"
    >
      <span className="truncate font-ui text-12 text-text-1">{adjunto.nombre}</span>
      <span className="shrink-0 font-ui text-12 tabular-nums text-text-3">{tamanoLegible(adjunto.tamanoBytes)}</span>
      {onQuitar && (
        <button
          type="button"
          aria-label={copyLocal.quitarAdjunto(adjunto.nombre)}
          onClick={onQuitar}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-celda text-text-3 transition-colors duration-150 hover:bg-status-red-soft hover:text-status-red"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      )}
    </motion.span>
  );
}
