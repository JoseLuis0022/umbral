import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, ImagePlus, Loader2, Square, X } from 'lucide-react';
import type { Adjunto, ContextoSesion, ModeloDisponible } from '../../types';
import { PREDETERMINADO, type EsfuerzoElegido } from '../../lib/ajusteModelo';
import { cn } from '../../lib/cn';
import { springSnappy, dur, ease } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { tamanoLegible } from '../../lib/fechas';
import {
  MAX_BYTES_ORIGINAL,
  MAX_IMAGENES,
  TIPOS_IMAGEN,
  esImagenAceptada,
  imagenesDe,
  prepararImagen,
  type ImagenPreparada,
} from '../../lib/imagenes';
import { IconButton, SelectorLista, Textarea, useToast, type OpcionLista } from '../ui';
import { VisorImagen } from '../VisorImagen';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';
import { AnilloContexto } from './AnilloContexto';

const MAX_LINEAS = 8;

/** Selección de modelo y esfuerzo. Solo existe si la cuenta tiene permiso. */
export type AjustesModelo = {
  modelos: ModeloDisponible[];
  modelo: string;
  onModelo: (id: string) => void;
  esfuerzo: EsfuerzoElegido;
  onEsfuerzo: (e: EsfuerzoElegido) => void;
};

type Props = {
  valor: string;
  onCambio: (valor: string) => void;
  imagenes: ImagenPreparada[];
  onImagenes: (imagenes: ImagenPreparada[]) => void;
  onEnviar: () => void;
  onDetener: () => void;
  transmitiendo: boolean;
  ajustesModelo?: AjustesModelo;
  contexto?: ContextoSesion;
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
 * Campo que crece arriba y una fila de herramientas abajo: adjuntar · modelo ·
 * esfuerzo · contexto · enviar. Las imágenes entran por el botón, pegándolas
 * (⌘V) o arrastrándolas, y se REDUCEN aquí mismo antes de viajar (ver
 * lib/imagenes.ts). El foco lo dibuja la barra completa, no el campo.
 */
export function BarraEntrada({
  valor,
  onCambio,
  imagenes,
  onImagenes,
  onEnviar,
  onDetener,
  transmitiendo,
  ajustesModelo,
  contexto,
  autoFoco,
  senalFoco = 0,
  className,
}: Props) {
  const campo = useRef<HTMLTextAreaElement>(null);
  const archivos = useRef<HTMLInputElement>(null);
  const { push } = useToast();
  const reducido = useReducedMotion();
  const [preparando, setPreparando] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [vista, setVista] = useState<ImagenPreparada | null>(null);

  const puedeEnviar = (valor.trim().length > 0 || imagenes.length > 0) && !transmitiendo && preparando === 0;

  // Crecimiento hasta 8 líneas y scroll a partir de ahí, medido contra el
  // line-height computado para que siga siendo cierto si cambia la escala.
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

  // El cursor va al FINAL: si el valor llega precargado (un chip del estado
  // vacío), enfocar sin más lo deja en la posición 0.
  useEffect(() => {
    const el = campo.current;
    if (!el || !autoFoco) return;
    el.focus();
    const fin = el.value.length;
    el.setSelectionRange(fin, fin);
  }, [autoFoco, senalFoco]);

  function alTeclado(e: KeyboardEvent<HTMLTextAreaElement>) {
    // `isComposing`: Enter confirma la composición de acentos/IME, no envía.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (puedeEnviar) onEnviar();
    }
  }

  async function agregar(lista: File[]) {
    if (!lista.length) return;
    const aceptadas: File[] = [];
    for (const archivo of lista) {
      if (!esImagenAceptada(archivo)) {
        push({ message: copyLocal.adjuntoTipo(archivo.name), tone: 'error' });
      } else if (archivo.size > MAX_BYTES_ORIGINAL) {
        push({ message: copyLocal.adjuntoPesado(archivo.name), tone: 'error' });
      } else if (imagenes.length + aceptadas.length >= MAX_IMAGENES) {
        push({ message: copyLocal.adjuntoLimite, tone: 'error' });
        break;
      } else {
        aceptadas.push(archivo);
      }
    }
    if (!aceptadas.length) return;

    setPreparando((n) => n + aceptadas.length);
    const listas: ImagenPreparada[] = [];
    for (const archivo of aceptadas) {
      try {
        listas.push(await prepararImagen(archivo));
      } catch {
        push({ message: copyLocal.adjuntoIlegible(archivo.name), tone: 'error' });
      } finally {
        setPreparando((n) => n - 1);
      }
    }
    if (listas.length) onImagenes([...imagenes, ...listas]);
  }

  function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite volver a elegir el mismo archivo
    void agregar(lista);
  }

  function alPegar(e: ClipboardEvent<HTMLTextAreaElement>) {
    const lista = imagenesDe(e.clipboardData);
    if (!lista.length) return;
    // Si además venía texto (copiar de una página web), el texto se pega
    // normal y las imágenes se adjuntan; si solo eran imágenes, que no se
    // cuele el nombre del archivo como texto.
    if (!e.clipboardData.getData('text/plain')) e.preventDefault();
    void agregar(lista);
  }

  function alSoltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    void agregar(Array.from(e.dataTransfer.files));
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        onDragOver={(e) => {
          if (Array.from(e.dataTransfer.items).some((i) => i.kind === 'file')) {
            e.preventDefault();
            setArrastrando(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastrando(false);
        }}
        onDrop={alSoltar}
        className={cn(
          'relative rounded-tarjeta border bg-surface-1 shadow-2 transition-colors duration-150',
          'focus-within:border-accent/40 focus-within:ring-[3px] focus-within:ring-accent-soft',
          arrastrando ? 'border-accent ring-[3px] ring-accent-soft' : 'border-hairline'
        )}
      >
        <AnimatePresence initial={false}>
          {(imagenes.length > 0 || preparando > 0) && (
            <motion.div
              initial={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={reducido ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
              exit={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={springSnappy}
              className="overflow-hidden"
            >
              <ul className="flex flex-wrap gap-2 px-3 pt-3">
                {imagenes.map((img) => (
                  <li key={img.id}>
                    <MiniaturaImagen
                      src={img.miniatura}
                      nombre={img.nombre}
                      detalle={tamanoLegible(img.tamanoBytes)}
                      onAbrir={() => setVista(img)}
                      onQuitar={() => onImagenes(imagenes.filter((x) => x.id !== img.id))}
                    />
                  </li>
                ))}
                {Array.from({ length: preparando }, (_, i) => (
                  <li
                    key={`preparando-${i}`}
                    className="flex h-16 w-16 items-center justify-center rounded-control border border-hairline bg-bg"
                    aria-label={copyLocal.preparandoImagen}
                  >
                    <Loader2 size={16} className="animate-spin text-text-3" />
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <Textarea
          ref={campo}
          rows={1}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={alTeclado}
          onPaste={alPegar}
          placeholder={copy.placeholder}
          aria-label={copy.placeholder}
          className="block min-h-0 w-full resize-none border-transparent bg-transparent px-4 pb-1 pt-3.5 leading-[22px] focus:border-transparent focus:ring-0"
        />

        <div className="flex items-center gap-1 px-2 pb-2 pt-1">
          <input
            ref={archivos}
            type="file"
            multiple
            className="hidden"
            accept={TIPOS_IMAGEN.join(',')}
            onChange={alElegir}
          />
          <IconButton
            aria-label={copyLocal.adjuntarImagen}
            title={copyLocal.adjuntarImagenAyuda}
            onClick={() => archivos.current?.click()}
            disabled={imagenes.length + preparando >= MAX_IMAGENES}
          >
            <ImagePlus size={18} />
          </IconButton>

          <div className="ml-auto flex min-w-0 items-center gap-0.5">
            {ajustesModelo && <SelectoresModelo {...ajustesModelo} />}
            <AnilloContexto contexto={contexto} />

            {transmitiendo ? (
              <IconButton
                aria-label={copy.detener}
                onClick={onDetener}
                className="ml-1 rounded-full bg-text-1 text-white hover:bg-text-1 hover:text-white"
              >
                <Square size={13} fill="currentColor" />
              </IconButton>
            ) : (
              <IconButton
                aria-label={copy.enviar}
                onClick={onEnviar}
                disabled={!puedeEnviar}
                variant={puedeEnviar ? 'primary' : 'ghost'}
                className={cn('ml-1 rounded-full', !puedeEnviar && 'bg-bg text-text-3')}
              >
                <ArrowUp size={18} strokeWidth={2.5} />
              </IconButton>
            )}
          </div>
        </div>

        {arrastrando && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-tarjeta bg-accent-soft/80 font-ui text-14 font-medium text-accent-fg">
            {copyLocal.soltarImagenes}
          </div>
        )}
      </div>

      <p className="mt-2 px-2 text-center font-ui text-12 text-text-3">{copy.avisoIA}</p>

      <VisorImagen src={vista?.url ?? null} alt={vista?.nombre} onCerrar={() => setVista(null)} />
    </div>
  );
}

/* ───────────────────────────── Modelo y esfuerzo ───────────────────────────── */

const ESFUERZOS: { valor: EsfuerzoElegido; texto: string }[] = [
  { valor: PREDETERMINADO, texto: copyLocal.esfuerzoPredeterminado },
  { valor: 'low', texto: copyLocal.esfuerzoBajo },
  { valor: 'medium', texto: copyLocal.esfuerzoMedio },
  { valor: 'high', texto: copyLocal.esfuerzoAlto },
  { valor: 'xhigh', texto: copyLocal.esfuerzoMuyAlto },
  { valor: 'max', texto: copyLocal.esfuerzoMaximo },
];

// Disparador compacto: en la barra los selectores no son campos de formulario
// sino controles de texto, como en las barras de los asistentes de chat.
const DISPARADOR_COMPACTO =
  'h-8 w-auto max-w-[190px] gap-1 rounded-control border-transparent bg-transparent px-2 text-13 text-text-2 hover:border-transparent hover:bg-accent-soft hover:text-text-1';

function SelectoresModelo({ modelos, modelo, onModelo, esfuerzo, onEsfuerzo }: AjustesModelo) {
  const opcionesModelo = useMemo<OpcionLista<ModeloDisponible>[]>(
    () => [
      { valor: PREDETERMINADO, texto: copyLocal.modeloPredeterminado, dato: { id: PREDETERMINADO, nombre: copyLocal.modeloPredeterminado } },
      ...modelos.map((m) => ({ valor: m.id, texto: m.nombre, dato: m })),
    ],
    [modelos]
  );
  const opcionesEsfuerzo = useMemo<OpcionLista<string>[]>(
    () => ESFUERZOS.map((e) => ({ valor: e.valor, texto: e.texto, dato: e.texto })),
    []
  );

  return (
    <>
      <SelectorLista
        opciones={opcionesModelo}
        valor={modelo}
        onCambiar={onModelo}
        etiqueta={copyLocal.modeloEtiqueta}
        tituloHoja={copyLocal.modeloEtiqueta}
        className={DISPARADOR_COMPACTO}
        renderDisparador={(o) => <span className="min-w-0 truncate">{o.dato.nombre}</span>}
        renderOpcion={(o) => (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-ui text-14 text-text-1">{o.dato.nombre}</span>
            {o.valor !== PREDETERMINADO && <code className="truncate font-mono text-12 text-text-3">{o.dato.id}</code>}
          </div>
        )}
      />
      <SelectorLista
        opciones={opcionesEsfuerzo}
        valor={esfuerzo}
        onCambiar={(v) => onEsfuerzo(v as EsfuerzoElegido)}
        etiqueta={copyLocal.esfuerzoEtiqueta}
        tituloHoja={copyLocal.esfuerzoEtiqueta}
        className={DISPARADOR_COMPACTO}
        renderDisparador={(o) => <span className="truncate">{o.dato}</span>}
        renderOpcion={(o) => <span className="font-ui text-14 text-text-1">{o.dato}</span>}
      />
    </>
  );
}

/* ──────────────────────────────── Miniaturas ──────────────────────────────── */

export function MiniaturaImagen({
  src,
  nombre,
  detalle,
  onAbrir,
  onQuitar,
  className,
}: {
  src?: string;
  nombre: string;
  detalle?: string;
  onAbrir?: () => void;
  onQuitar?: () => void;
  className?: string;
}) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
      transition={springSnappy}
      className={cn('group relative block h-16 w-16', className)}
    >
      <button
        type="button"
        onClick={onAbrir}
        disabled={!onAbrir || !src}
        title={detalle ? `${nombre} · ${detalle}` : nombre}
        aria-label={copyLocal.verImagen(nombre)}
        className="block h-full w-full overflow-hidden rounded-control border border-hairline bg-bg transition-shadow duration-150 enabled:hover:shadow-2"
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-1 text-center font-ui text-12 text-text-3">
            {nombre}
          </span>
        )}
      </button>
      {onQuitar && (
        <button
          type="button"
          aria-label={copyLocal.quitarAdjunto(nombre)}
          onClick={onQuitar}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-hairline bg-surface-1 text-text-2 shadow-1 transition-colors duration-150 hover:bg-status-red-soft hover:text-status-red"
        >
          <X size={11} strokeWidth={2.75} />
        </button>
      )}
    </motion.span>
  );
}

/** Ficha de un adjunto que no es imagen o que ya no tiene miniatura. */
export function FichaAdjunto({ adjunto, onQuitar }: { adjunto: Adjunto; onQuitar?: () => void }) {
  return (
    <span className="inline-flex max-w-[220px] items-center gap-1.5 rounded-celda border border-hairline bg-bg py-1 pl-2.5 pr-1">
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
    </span>
  );
}
