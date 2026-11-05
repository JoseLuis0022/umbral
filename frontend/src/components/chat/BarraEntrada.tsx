import { Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, FileCode2, FileText, Film, Loader2, Paperclip, Play, X, type LucideIcon } from 'lucide-react';
import type { Adjunto, ContextoSesion, ModeloDisponible } from '../../types';
import type { AjusteModelo } from '../../lib/ajusteModelo';
import { cn } from '../../lib/cn';
import { springSnappy, springLayout, springPress, dur, ease } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { tamanoLegible } from '../../lib/fechas';
import type { ImagenPreparada } from '../../lib/imagenes';
import {
  ArchivoNoSoportado,
  MAX_ADJUNTOS,
  TOPE_TOTAL_BYTES,
  archivosDe,
  prepararArchivo,
  type AdjuntoPreparado,
} from '../../lib/adjuntos';
import { IconButton, Textarea, useToast } from '../ui';
import { VisorImagen } from '../VisorImagen';
import { chat as copy } from '../../copy';
import { copyLocal } from './copyLocal';
import { AnilloContexto } from './AnilloContexto';

/*
 * El selector de modelo se carga APARTE (con Radix dentro, ~30 KB gzip): solo
 * lo ve quien tiene permiso "parametros". Una cuenta de estudiante nunca
 * descarga ese código.
 */
const MenuModelo = lazy(() => import('./MenuModelo').then((m) => ({ default: m.MenuModelo })));

const MAX_LINEAS = 8;

/**
 * Selección de modelo y esfuerzo. Solo existe si la cuenta tiene permiso.
 * Llegan directo de `useChat()` (`modelos`, `ajusteModelo`,
 * `cambiarAjusteModelo`): referencias estables, así el menú memoizado no se
 * vuelve a renderizar una vez por frame durante el streaming.
 */
export type AjustesModelo = {
  modelos: ModeloDisponible[];
  ajuste: AjusteModelo;
  onCambiar: (cambio: Partial<AjusteModelo>) => void;
  /** El modelo del perfil: lo que el disparador nombra cuando está en automático. */
  modeloPredeterminado?: string | null;
};

type Props = {
  valor: string;
  onCambio: (valor: string) => void;
  adjuntos: AdjuntoPreparado[];
  onAdjuntos: (adjuntos: AdjuntoPreparado[]) => void;
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
  /** Sin el aviso de IA debajo (el estado vacío lo pone en otro sitio). */
  sinAviso?: boolean;
  className?: string;
};

/**
 * Barra de entrada del chat (el "composer").
 *
 * Campo que crece arriba y una fila de herramientas de 36 px abajo: adjuntar ·
 * modelo y esfuerzo · contexto · enviar. CUALQUIER archivo entra por el botón,
 * pegándolo (⌘V) o arrastrándolo; lib/adjuntos.ts lo convierte en lo que el
 * modelo sabe leer (imagen, PDF, texto, fotogramas de un video) o dice por qué
 * no se puede.
 *
 * El borde es la primera capa de la sombra (`shadow-composer`): con foco la
 * barra se ASIENTA (`shadow-composer-foco`), sin anillo azul de 3 px. El anillo
 * permanente, con el autofoco, dibujaba un borde doble todo el tiempo.
 */
export function BarraEntrada({
  valor,
  onCambio,
  adjuntos,
  onAdjuntos,
  onEnviar,
  onDetener,
  transmitiendo,
  ajustesModelo,
  contexto,
  autoFoco,
  senalFoco = 0,
  sinAviso = false,
  className,
}: Props) {
  const campo = useRef<HTMLTextAreaElement>(null);
  // El composer: los menús de la barra abren por encima de él.
  const composer = useRef<HTMLDivElement>(null);
  const archivos = useRef<HTMLInputElement>(null);
  const { push } = useToast();
  const reducido = useReducedMotion();
  const [preparando, setPreparando] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [vista, setVista] = useState<ImagenPreparada | null>(null);
  const [alto, setAlto] = useState<number | null>(null);

  const puedeEnviar = (valor.trim().length > 0 || adjuntos.length > 0) && !transmitiendo && preparando === 0;

  // Crecimiento hasta 8 líneas y scroll a partir de ahí, medido contra el
  // line-height computado para que siga siendo cierto si cambia la escala. El
  // campo toma su alto al instante; lo que ANIMA es la caja que lo envuelve
  // (`springLayout`), así la barra crece con suavidad sin estirar el texto.
  useLayoutEffect(() => {
    const el = campo.current;
    if (!el) return;
    const estilos = getComputedStyle(el);
    const alturaLinea = parseFloat(estilos.lineHeight) || 22;
    const relleno = parseFloat(estilos.paddingTop) + parseFloat(estilos.paddingBottom);
    const maximo = alturaLinea * MAX_LINEAS + relleno;
    el.style.height = 'auto';
    const medido = Math.min(el.scrollHeight, maximo);
    el.style.height = `${medido}px`;
    el.style.overflowY = el.scrollHeight > maximo ? 'auto' : 'hidden';
    setAlto(medido);
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
    const libres = MAX_ADJUNTOS - adjuntos.length;
    if (lista.length > libres) push({ message: copyLocal.adjuntoLimite, tone: 'error' });
    const aceptadas = lista.slice(0, Math.max(0, libres));
    if (!aceptadas.length) return;

    setPreparando((n) => n + aceptadas.length);
    const listas: AdjuntoPreparado[] = [];
    // Lo que pesa lo que YA viaja (reducido): es lo que cuenta contra el tope de la API.
    let total = adjuntos.reduce((s, a) => s + a.tamanoBytes, 0);
    for (const archivo of aceptadas) {
      try {
        const listo = await prepararArchivo(archivo);
        if (total + listo.tamanoBytes > TOPE_TOTAL_BYTES) {
          push({ message: copyLocal.adjuntoPesado(archivo.name), tone: 'error' });
          continue;
        }
        total += listo.tamanoBytes;
        listas.push(listo);
      } catch (e) {
        push({
          message: e instanceof ArchivoNoSoportado ? e.message : copyLocal.adjuntoIlegible(archivo.name),
          tone: 'error',
        });
      } finally {
        setPreparando((n) => n - 1);
      }
    }
    if (listas.length) onAdjuntos([...adjuntos, ...listas]);
  }

  function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? []);
    e.target.value = ''; // permite volver a elegir el mismo archivo
    void agregar(lista);
  }

  function alPegar(e: ClipboardEvent<HTMLTextAreaElement>) {
    const lista = archivosDe(e.clipboardData);
    if (!lista.length) return;
    // Si además venía texto (copiar de una página web), el texto se pega
    // normal y los archivos se adjuntan; si solo eran archivos, que no se
    // cuele su nombre como texto.
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
        // Un clic en el aire de la barra (no en un control) enfoca el campo:
        // la barra entera se lee como el campo, así que debe portarse como él.
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            e.preventDefault();
            campo.current?.focus();
          }
        }}
        ref={composer}
        className={cn(
          'relative rounded-composer bg-surface-1 shadow-composer transition-shadow duration-150 ease-umbral',
          'focus-within:shadow-composer-foco',
          arrastrando && 'shadow-composer-foco'
        )}
      >
        <AnimatePresence initial={false}>
          {(adjuntos.length > 0 || preparando > 0) && (
            <motion.div
              initial={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={reducido ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
              exit={reducido ? { opacity: 0 } : { opacity: 0, height: 0 }}
              transition={reducido ? { duration: dur.fast, ease } : springLayout}
              className="overflow-hidden"
            >
              <ul className="flex flex-wrap gap-2 px-3.5 pt-3.5">
                {adjuntos.map((a) => {
                  const quitar = () => onAdjuntos(adjuntos.filter((x) => x.id !== a.id));
                  return (
                    <li key={a.id}>
                      {a.clase === 'imagen' ? (
                        <MiniaturaImagen
                          src={a.miniatura}
                          nombre={a.nombre}
                          detalle={tamanoLegible(a.tamanoBytes)}
                          onAbrir={() => setVista(a)}
                          onQuitar={quitar}
                        />
                      ) : a.clase === 'video' ? (
                        <MiniaturaImagen
                          src={a.miniatura}
                          nombre={a.nombre}
                          detalle={copyLocal.videoDetalle(a.fotogramas.length)}
                          insignia
                          onQuitar={quitar}
                        />
                      ) : (
                        <FichaAdjunto
                          adjunto={{ id: a.id, nombre: a.nombre, tipo: '', tamanoBytes: a.tamanoBytes, formato: a.formato }}
                          onQuitar={quitar}
                        />
                      )}
                    </li>
                  );
                })}
                {Array.from({ length: preparando }, (_, i) => (
                  <li
                    key={`preparando-${i}`}
                    className="flex h-16 w-16 items-center justify-center rounded-control bg-bg shadow-anillo"
                    aria-label={copyLocal.preparandoImagen}
                  >
                    <Loader2 size={16} className="animate-spin text-text-3" />
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={false}
          animate={alto === null ? undefined : { height: alto }}
          transition={reducido ? { duration: 0 } : springLayout}
          className="overflow-hidden"
        >
          <Textarea
            ref={campo}
            rows={1}
            value={valor}
            onChange={(e) => onCambio(e.target.value)}
            onKeyDown={alTeclado}
            onPaste={alPegar}
            placeholder={copy.placeholder}
            aria-label={copy.placeholder}
            className="block min-h-0 w-full resize-none rounded-none border-transparent bg-transparent px-4 pb-1 pt-3.5 text-15 leading-[22px] shadow-none focus:border-transparent focus:ring-0"
          />
        </motion.div>

        <div className="flex h-11 items-center gap-1 px-2 pb-2">
          <input
            ref={archivos}
            type="file"
            multiple
            className="hidden"
            onChange={alElegir}
          />
          <IconButton
            aria-label={copyLocal.adjuntarImagen}
            title={copyLocal.adjuntarImagenAyuda}
            onClick={() => archivos.current?.click()}
            disabled={adjuntos.length + preparando >= MAX_ADJUNTOS}
            className="h-9 w-9 rounded-full text-text-2 hover:bg-tinta/[.05] hover:text-text-1"
          >
            <Paperclip size={18} />
          </IconButton>

          <div className="ml-auto flex min-w-0 items-center gap-0.5">
            {ajustesModelo && (
              // El hueco del disparador se reserva mientras llega el código: sin
              // él, la fila de herramientas brincaría al aparecer el selector.
              <Suspense fallback={<span className="h-8 w-28" aria-hidden />}>
                <MenuModelo
                  modelos={ajustesModelo.modelos}
                  ajuste={ajustesModelo.ajuste}
                  onCambiar={ajustesModelo.onCambiar}
                  modeloPredeterminado={ajustesModelo.modeloPredeterminado}
                  anclaRef={composer}
                />
              </Suspense>
            )}
            <AnilloContexto contexto={contexto} anclaRef={composer} />
            <BotonEnviar
              transmitiendo={transmitiendo}
              puedeEnviar={puedeEnviar}
              onEnviar={onEnviar}
              onDetener={onDetener}
            />
          </div>
        </div>

        <AnimatePresence>
          {arrastrando && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: dur.fast, ease }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-composer bg-[rgba(238,243,254,.94)] font-ui text-14 font-medium text-accent-fg shadow-[inset_0_0_0_1.5px_var(--accent)]"
            >
              {copyLocal.soltarImagenes}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!sinAviso && <p className="mt-2 px-2 text-center font-ui text-12 text-text-3">{copy.avisoIA}</p>}

      <VisorImagen src={vista?.url ?? null} alt={vista?.nombre} onCerrar={() => setVista(null)} />
    </div>
  );
}

/**
 * Enviar y Detener ocupan el MISMO círculo de 32 px: moverlo mientras responde
 * obligaría a buscar con la vista el botón justo cuando hay prisa por cancelar.
 *
 *  - Desactivado: `bg-tinta/10` con la flecha en text-3. Se lee como "todavía
 *    no", no como un botón roto (antes era casi invisible).
 *  - Activo: relleno de marca y flecha blanca; entra con `scale .9 → 1`.
 *  - Detener: cuadrado de 10 px sobre `bg-text-1`; los iconos se cruzan con una
 *    rotación de −90° a 0°.
 *
 * El área táctil se extiende a 44 px con un pseudo-elemento: el círculo se ve
 * de 32, pero el dedo no tiene que acertarle a 32.
 */
export function BotonEnviar({
  transmitiendo,
  puedeEnviar,
  onEnviar,
  onDetener,
}: {
  transmitiendo: boolean;
  puedeEnviar: boolean;
  onEnviar: () => void;
  onDetener: () => void;
}) {
  const reducido = useReducedMotion();
  const activo = transmitiendo || puedeEnviar;
  const icono = reducido
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0, rotate: -90, scale: 0.6 }, animate: { opacity: 1, rotate: 0, scale: 1 }, exit: { opacity: 0, rotate: 90, scale: 0.6 } };

  return (
    <motion.button
      type="button"
      aria-label={transmitiendo ? copy.detener : copy.enviar}
      title={transmitiendo ? copy.detener : copy.enviar}
      onClick={transmitiendo ? onDetener : onEnviar}
      disabled={!activo}
      animate={reducido ? undefined : { scale: puedeEnviar || transmitiendo ? 1 : 0.9 }}
      whileTap={activo && !reducido ? { scale: 0.88 } : undefined}
      transition={springPress}
      className={cn(
        'relative ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-[120ms]',
        'before:absolute before:-inset-1.5 before:content-[""]',
        transmitiendo
          ? 'bg-text-1 text-white hover:bg-tinta/85'
          : puedeEnviar
            ? 'bg-accent text-white hover:bg-accent-strong'
            : 'cursor-not-allowed bg-tinta/10 text-text-3'
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {transmitiendo ? (
          <motion.span key="detener" {...icono} transition={reducido ? { duration: dur.fast } : springSnappy} className="flex">
            <span className="block h-2.5 w-2.5 rounded-[2px] bg-current" />
          </motion.span>
        ) : (
          <motion.span key="enviar" {...icono} transition={reducido ? { duration: dur.fast } : springSnappy} className="flex">
            <ArrowUp size={17} strokeWidth={2.5} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ──────────────────────────────── Miniaturas ──────────────────────────────── */

export function MiniaturaImagen({
  src,
  nombre,
  detalle,
  insignia = false,
  onAbrir,
  onQuitar,
  className,
}: {
  src?: string;
  nombre: string;
  detalle?: string;
  /** Marca de video (▶) encima de la miniatura. */
  insignia?: boolean;
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
        className="relative block h-full w-full overflow-hidden rounded-control bg-bg shadow-anillo transition-shadow duration-150 enabled:hover:shadow-2"
      >
        {src ? (
          <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : null}
        {insignia && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
              <Play size={11} fill="currentColor" strokeWidth={0} className="translate-x-px" />
            </span>
          </span>
        )}
        {!src && (
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
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-1 text-text-2 shadow-menu transition-colors duration-150 hover:bg-status-red-soft hover:text-status-red"
        >
          <X size={11} strokeWidth={2.75} />
        </button>
      )}
    </motion.span>
  );
}

const ICONO_FORMATO: Record<string, LucideIcon> = { pdf: FileText, texto: FileCode2, video: Film };

/**
 * Ficha de un adjunto que no es imagen: un documento (PDF o texto), o una
 * imagen/video que ya no tiene miniatura. Mide lo mismo que la miniatura
 * (64 px) para que la fila de adjuntos no tenga dos alturas.
 */
export function FichaAdjunto({ adjunto, onQuitar }: { adjunto: Adjunto; onQuitar?: () => void }) {
  const Icono = ICONO_FORMATO[adjunto.formato ?? ''] ?? FileText;
  const etiqueta = copyLocal.formatoAdjunto[adjunto.formato ?? 'imagen'] ?? copyLocal.formatoAdjunto.texto;
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: dur.fast, ease } }}
      transition={springSnappy}
      className="group relative flex h-16 w-[208px] items-center gap-2.5 rounded-control bg-surface-1 p-2 shadow-anillo"
      title={`${adjunto.nombre} · ${tamanoLegible(adjunto.tamanoBytes)}`}
    >
      {/* Radios anidados: ficha 10 con 8 de aire → icono 6 (xs). */}
      <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-xs bg-accent-soft text-accent-fg">
        <Icono size={18} strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-ui text-13 font-medium text-text-1">{adjunto.nombre}</span>
        <span className="block truncate font-ui text-12 tabular-nums text-text-3">
          {etiqueta} · {tamanoLegible(adjunto.tamanoBytes)}
        </span>
      </span>
      {onQuitar && (
        <button
          type="button"
          aria-label={copyLocal.quitarAdjunto(adjunto.nombre)}
          onClick={onQuitar}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-1 text-text-2 shadow-menu transition-colors duration-150 hover:bg-status-red-soft hover:text-status-red"
        >
          <X size={11} strokeWidth={2.75} />
        </button>
      )}
    </motion.span>
  );
}
