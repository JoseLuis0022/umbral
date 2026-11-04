import { useRef, useState, type DragEvent, type DragEventHandler, type RefObject } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { UploadCloud } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { dur, ease } from '../../../lib/motion';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { Button } from '../../ui';
import { admin as copy } from '../../../copy';
import { EXTENSIONES_ACEPTADAS } from '../../../services/corpus.service';

// Cadenas que no existen todavía en src/copy (ver reporte).
const textos = {
  subir: 'Subir',
  subirLargo: 'Subir archivos',
  formatos: 'Markdown o PDF, hasta 10 MB',
};

/** Un arrastre de texto o de un enlace no debe encender la diana: solo los
 *  archivos son soltables aquí. */
function traeArchivos(e: DragEvent<HTMLElement>) {
  return Array.from(e.dataTransfer.types).includes('Files');
}

/**
 * Arrastrar y soltar, repartido en cuatro piezas:
 *
 *   `useSoltarArchivos` — engancha el arrastre al panel COMPLETO.
 *   `CapaSoltar`        — la diana, que solo existe mientras se arrastra.
 *   `ZonaSoltar`        — el rectángulo visible de "arrastra archivos aquí",
 *                         que se contrae a una barra al hacer scroll.
 *   `BotonSubir`        — el camino de siempre para quien nunca arrastra nada
 *                         (que es la mitad de la gente), en 32 px de alto y
 *                         SIEMPRE presente en la cabecera del panel.
 *
 * El contador de `dragenter`/`dragleave` existe porque los eventos también se
 * disparan al pasar sobre los HIJOS del panel: sin contador, la diana
 * parpadearía mientras el cursor se mueve por encima de la lista.
 */
export function useSoltarArchivos(onArchivos: (archivos: File[]) => void) {
  const [encima, setEncima] = useState(false);
  const profundidad = useRef(0);

  const propsSoltar: {
    onDragEnter: DragEventHandler<HTMLElement>;
    onDragOver: DragEventHandler<HTMLElement>;
    onDragLeave: DragEventHandler<HTMLElement>;
    onDrop: DragEventHandler<HTMLElement>;
  } = {
    onDragEnter: (e) => {
      if (!traeArchivos(e)) return;
      e.preventDefault();
      profundidad.current += 1;
      setEncima(true);
    },
    onDragOver: (e) => {
      if (!traeArchivos(e)) return;
      // Sin este preventDefault el navegador abre el archivo en una pestaña
      // en vez de dejar que el drop llegue a la aplicación.
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (e) => {
      if (!traeArchivos(e)) return;
      e.preventDefault();
      profundidad.current -= 1;
      if (profundidad.current <= 0) {
        profundidad.current = 0;
        setEncima(false);
      }
    },
    onDrop: (e) => {
      e.preventDefault();
      profundidad.current = 0;
      setEncima(false);
      const archivos = Array.from(e.dataTransfer.files);
      if (archivos.length > 0) onArchivos(archivos);
    },
  };

  return { encima, propsSoltar };
}

// ————————————————————————————————————————————————————————————————
// Zona de soltar que se contrae con el scroll
// ————————————————————————————————————————————————————————————————

/** Alto total del bloque desplegado, incluidos los 8 px que lo separan de la
 *  primera fila. */
const ALTO_AMPLIO = 140;
/** Alto que queda visible cuando está contraída: 44 px de barra + esos 8 px. */
const ALTO_COMPACTO = 52;
/** Recorrido de scroll que dura la transición. Es exactamente la diferencia de
 *  alto, porque quien empuja el bloque hacia arriba es el scroll mismo. */
const RECORRIDO = ALTO_AMPLIO - ALTO_COMPACTO;

export interface ColapsoZona {
  alto: number;
  top: number;
  opacidadAmplia: MotionValue<number>;
  opacidadCompacta: MotionValue<number>;
}

/**
 * Liga la zona de soltar al scroll de la lista.
 *
 * SE LLAMA DESDE EL COMPONENTE QUE DECLARA LA REF DEL CONTENEDOR, nunca desde
 * un hijo suyo: React conecta la ref de un elemento antes de correr los efectos
 * de layout del componente que lo renderiza, pero DESPUÉS de los de sus hijos.
 * Llamando a `useScroll` desde un hijo, `contenedor.current` todavía sería null
 * al suscribirse y Framer se engancharía al scroll de la ventana.
 *
 * CÓMO SE MUEVE, Y POR QUÉ ASÍ
 * ----------------------------
 * El desplazamiento NO lo anima JavaScript: el bloque es un `position: sticky`
 * con `top` negativo dentro de la lista. Sube empujado por el propio scroll
 * hasta que su borde inferior toca el techo, y ahí se queda clavado como barra.
 * Es el patrón de cabecera que colapsa de iOS, resuelto por el navegador: cero
 * trabajo por frame en el hilo principal, y ligado al scroll por definición —
 * no hay dos estados entre los que saltar.
 *
 * Lo único que sí se interpola es la OPACIDAD de las dos capas de contenido, y
 * se escribe directo al estilo a través de MotionValues: nada de `useState` con
 * el desplazamiento, que volvería a renderizar el panel —y sus veintisiete
 * filas— en cada frame de scroll.
 *
 * NO HAY BUCLE DE REALIMENTACIÓN porque el alto en el flujo NUNCA cambia: el
 * bloque siempre mide `ALTO_AMPLIO`, contraerse es taparlo con scroll. El
 * `scrollHeight` de la lista es constante, así que encogerse no puede mover el
 * scroll y volver a desplegar la zona.
 *
 * Y el alto es inseparable del contenido: el bloque ES el que reserva su
 * espacio, no un espaciador aparte. Si el contenido no se pintara, tampoco
 * habría hueco.
 */
export function useColapsoZona(contenedor: RefObject<HTMLElement>): ColapsoZona {
  const reducido = useReducedMotion();
  const { scrollY } = useScroll({ container: contenedor });

  // El cruce no es a mitad exacta: la capa amplia termina de irse antes de que
  // la compacta llegue del todo, para que no se lean las dos superpuestas.
  // El rango de salida se decide DENTRO del `useTransform`, no con un retorno
  // temprano: salir antes dejaría los dos MotionValue creados y suscritos a
  // `scrollY`, recalculándose en cada frame de scroll para que nadie los lea.
  // De paso, el tipo de retorno deja de ser `MotionValue<number> | number`.
  const opacidadAmplia = useTransform(scrollY, [0, RECORRIDO * 0.55], reducido ? [0, 0] : [1, 0]);
  const opacidadCompacta = useTransform(scrollY, [RECORRIDO * 0.5, RECORRIDO], reducido ? [1, 1] : [0, 1]);

  // Con movimiento reducido la zona nace compacta y se queda así: `top: 0` y el
  // alto de la barra la dejan quieta arriba, sin nada ligado al scroll.
  if (reducido) {
    return { alto: ALTO_COMPACTO, top: 0, opacidadAmplia, opacidadCompacta };
  }

  return { alto: ALTO_AMPLIO, top: -RECORRIDO, opacidadAmplia, opacidadCompacta };
}

/**
 * Primer hijo de la lista de archivos: el rectángulo de "arrastra archivos
 * aquí" de siempre, ahora capaz de encogerse.
 *
 * Es un `<button>` completo, no un adorno: hacer clic abre el selector de
 * archivos, tanto desplegado como contraído. Así la barra compacta sigue
 * valiendo por el botón "Subir" sin duplicar controles, y el objetivo táctil
 * nunca baja de 44 px.
 *
 * El fondo es OPACO a propósito. Mientras está clavada arriba, las filas pasan
 * por debajo: con `backdrop-blur` habría que rerrasterizar el fondo en cada
 * frame de scroll, que es justo el gasto que este rediseño evita.
 */
export function ZonaSoltar({
  colapso,
  onArchivos,
}: {
  colapso: ColapsoZona;
  onArchivos: (archivos: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <div
      className="sticky z-10 pb-2"
      style={{ height: colapso.alto, top: colapso.top }}
    >
      <button
        type="button"
        onClick={() => input.current?.click()}
        aria-label={textos.subirLargo}
        title={textos.formatos}
        className={cn(
          'relative flex h-full w-full items-center justify-center overflow-hidden rounded-control',
          'border border-dashed border-hairlineStrong bg-bg transition-colors duration-150',
          'hover:border-accent/50 hover:bg-accent-soft',
          'focus-visible:border-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-soft'
        )}
      >
        {/* Capa amplia: centrada en el bloque entero. Cuando el scroll lo
            empuja hacia arriba ya se ha desvanecido, así que se lee como que
            el contenido se guarda, no como que se recorta. */}
        <motion.span
          style={{ opacity: colapso.opacidadAmplia }}
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-1 text-accent-fg shadow-1">
            <UploadCloud size={18} strokeWidth={1.75} />
          </span>
          <span className="font-ui text-14 font-semibold text-text-1">{copy.soltarArchivos}</span>
          <span className="font-ui text-12 text-text-3">{textos.formatos}</span>
        </motion.span>

        {/* Capa compacta: anclada al BORDE INFERIOR, que es la única franja que
            queda a la vista cuando el bloque se clava arriba. */}
        <motion.span
          style={{ opacity: colapso.opacidadCompacta }}
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-11 items-center justify-center gap-2 px-3"
        >
          <UploadCloud size={14} strokeWidth={2} className="shrink-0 text-accent-fg" />
          <span className="truncate font-ui text-13 font-medium text-text-2">{textos.subirLargo}</span>
        </motion.span>
      </button>

      <EntradaArchivos entrada={input} onArchivos={onArchivos} />
    </div>
  );
}

/**
 * Diana a pantalla completa del panel. `pointer-events-none` no es un detalle:
 * si la capa recibiera eventos, aparecer bajo el cursor dispararía su propio
 * `dragenter` y el contador de profundidad se descuadraría.
 *
 * Solo anima opacidad, así que se comporta igual con `prefers-reduced-motion`.
 */
export function CapaSoltar({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur.fast, ease }}
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-accent bg-accent-soft px-4 text-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-1">
            <UploadCloud size={20} strokeWidth={1.75} />
          </span>
          <span className="font-ui text-14 font-semibold text-text-1">{copy.soltarArchivos}</span>
          <span className="font-ui text-12 text-text-3">{textos.formatos}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Selector de archivos de siempre, del tamaño de un botón de cabecera. Vive en
 *  la cabecera del panel y no se mueve con el scroll: subir tiene que estar a un
 *  clic aunque la lista esté al final. */
export function BotonSubir({ onArchivos }: { onArchivos: (archivos: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => input.current?.click()}
        aria-label={textos.subirLargo}
        title={textos.formatos}
      >
        <UploadCloud size={14} />
        {textos.subir}
      </Button>

      <EntradaArchivos entrada={input} onArchivos={onArchivos} />
    </>
  );
}

/** El `<input type="file">` de verdad, oculto. El botón de la cabecera y la
 *  zona de soltar tienen cada uno el suyo; la ref se pasa como `entrada` y no
 *  como `ref` porque en React 18 `ref` no es una prop normal de un componente
 *  de función: se la queda React y nunca llegaría aquí. */
function EntradaArchivos({
  entrada,
  onArchivos,
}: {
  entrada: RefObject<HTMLInputElement>;
  onArchivos: (archivos: File[]) => void;
}) {
  return (
    <input
      ref={entrada}
      type="file"
      multiple
      accept={EXTENSIONES_ACEPTADAS}
      className="sr-only"
      onChange={(e) => {
        const archivos = Array.from(e.target.files ?? []);
        if (archivos.length > 0) onArchivos(archivos);
        // Se limpia para que volver a elegir el MISMO archivo dispare change.
        e.target.value = '';
      }}
    />
  );
}
