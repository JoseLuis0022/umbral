import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { dur, ease, salidaPanel, springPanel, springSoft } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { IconButton } from './Button';
import { Backdrop } from './Backdrop';

/**
 * Superficie flotante anclada a un control.
 *
 * Es la fontanería que comparten el `SelectorLista` y el `SelectorRangoFechas`:
 * portal, colocación contra la caja del disparador, volteo cuando abajo no
 * cabe, hoja inferior en móvil, clic fuera y seguimiento del scroll. Los dos
 * controles se ven y se comportan igual porque literalmente montan la misma
 * caja; lo único que cambia es lo que va dentro.
 *
 * TRES DECISIONES QUE EXPLICAN EL RESTO DEL ARCHIVO
 *
 *  1. **Se dibuja en un portal.** Los paneles que contienen estos controles
 *     tienen `overflow-y: auto`; un desplegable colocado dentro del flujo se
 *     recortaría contra el borde del panel. Con portal + `position: fixed` la
 *     superficie vive por encima de todo y se coloca a mano contra la caja del
 *     disparador.
 *
 *  2. **La colocación se ESCRIBE, no se renderiza.** `top`, `left`, `width` y
 *     el alto máximo se aplican con `style.*` sobre un div posicionador que no
 *     anima nada. Guardar la posición en estado significaría un render por
 *     cada píxel de scroll; así el scroll no cuesta ni un re-render, y la
 *     animación (que sí es de React) solo toca `transform` y `opacity`.
 *
 *  3. **El foco lo mueve quien la usa.** Este componente no decide a qué se
 *     enfoca al abrir —una lista y una retícula de calendario tienen puntos de
 *     entrada distintos— pero sí garantiza que Escape y el clic fuera llamen a
 *     `cerrar`, y ahí es donde el consumidor devuelve el foco al disparador.
 */

/**
 * ESCALA DE CAPAS DEL SISTEMA (z-index), de abajo hacia arriba:
 *
 *   1200  Superficies modales de página: `Modal` y `Drawer`.
 *   1250  Historial de chat en móvil (`ContenidoHistorial`): se superpone al
 *         layout, pero por debajo de un visor a pantalla completa.
 *   1300  Lectura a pantalla completa (`VisorImagen`) y avisos (`Toast`).
 *   1400  ESTA capa: menús anclados a un control.
 *
 * El criterio es "de quién es el gesto en curso", no "qué es más importante".
 * Un menú anclado es SIEMPRE transitorio y nace de un control que puede vivir
 * dentro de cualquiera de las capas de abajo —un selector dentro de un `Modal`
 * es el caso normal—, así que tiene que dibujarse por encima de todas ellas o
 * quedaría recortado detrás de su propio contenedor.
 *
 * Antes compartía el 1300 de `VisorImagen` y el `Toast`, y con empate el orden
 * lo decidía el orden de montaje en el DOM: exactamente lo que una escala
 * documentada existe para evitar.
 */
export const Z_MENU_ANCLADO = 1400;

/** Aire mínimo entre el menú y el borde de la ventana. */
const MARGEN_VENTANA = 8;
/** Separación entre el disparador y el menú. Suficiente para que se lean como dos piezas. */
const SEPARACION = 6;
/** Suelo duro: si ni arriba ni abajo hay sitio, el menú se queda pequeño pero navegable. */
const ALTO_MINIMO = 120;

/**
 * Punto de corte del sistema (`sm` = 640 px, el mismo `screens` de
 * tailwind.config.js). Por debajo, un menú anclado a un control de 40 px queda
 * pegado a los bordes de la pantalla y se lee apretado: ahí el desplegable
 * pasa a ser una hoja inferior a lo ancho.
 */
const CONSULTA_COMPACTO = '(max-width: 639px)';

export function useEsCompacto() {
  const [compacto, setCompacto] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(CONSULTA_COMPACTO).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(CONSULTA_COMPACTO);
    const alCambiar = (e: MediaQueryListEvent) => setCompacto(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  return compacto;
}

export function PanelAnclado({
  abierto,
  cerrar,
  disparadorRef,
  anclaRef,
  tituloHoja,
  ancho = 'disparador',
  altoMaximo = 320,
  altoMinimoUtil = 176,
  aplicarAlto,
  className,
  children,
}: {
  abierto: boolean;
  /** Cerrar SIN cambiar nada. Quien la implementa devuelve el foco al disparador. */
  cerrar: () => void;
  disparadorRef: RefObject<HTMLElement>;
  /**
   * Caja de la que se separa el panel en vertical (por defecto, el disparador).
   * Un disparador DENTRO de otra superficie (el anillo, dentro del composer)
   * abre el panel fuera de esa superficie, no encima de su borde.
   */
  anclaRef?: RefObject<HTMLElement>;
  /** Título de la hoja inferior en móvil, donde el rótulo de la pantalla no se ve. */
  tituloHoja: string;
  /** `'disparador'` copia el ancho del control; un número fija píxeles y se acota a la ventana. */
  ancho?: 'disparador' | number;
  /** El menú nunca crece más que esto: a partir de aquí se navega, no se abarca. */
  altoMaximo?: number;
  /**
   * Por debajo de este alto el menú deja de ser útil y vale la pena voltearlo
   * hacia arriba. El volteo es la excepción: si abajo cabe algo razonable, se
   * despliega hacia abajo aunque arriba quepa más.
   */
  altoMinimoUtil?: number;
  /**
   * Recibe el alto disponible en píxeles, o `null` en la hoja móvil (donde el
   * alto lo pone la clase y cualquier valor escrito a mano sobra). El
   * consumidor decide a qué nodo se lo aplica: en una lista, al `ul` que
   * scrollea; en el calendario, a la caja entera.
   */
  aplicarAlto?: (px: number | null) => void;
  className?: string;
  children: ReactNode;
}) {
  const posicionadorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [haciaArriba, setHaciaArriba] = useState(false);

  const compacto = useEsCompacto();
  const reducido = useReducedMotion();

  // `aplicarAlto` suele llegar como función nueva en cada render del padre.
  // Guardarla en una ref evita que `colocar` cambie de identidad y con ella se
  // vuelvan a montar los listeners de scroll en cada render.
  const refAplicarAlto = useRef(aplicarAlto);
  useLayoutEffect(() => {
    refAplicarAlto.current = aplicarAlto;
  });

  /**
   * Decide arriba/abajo y escribe la caja del menú. Se llama al abrir y en
   * cada scroll o resize; por eso no toca el estado salvo cuando el sentido
   * del despliegue cambia de verdad.
   */
  const colocar = useCallback(() => {
    const disparador = disparadorRef.current;
    const posicionador = posicionadorRef.current;
    if (!disparador || !posicionador) return;

    const caja = disparador.getBoundingClientRect();
    const cajaV = anclaRef?.current?.getBoundingClientRect() ?? caja;

    // El disparador se fue de la pantalla (el panel hizo scroll por debajo):
    // un menú flotando lejos de su control ya no explica de dónde salió.
    if (caja.bottom < 0 || caja.top > window.innerHeight) {
      cerrar();
      return;
    }

    const espacioAbajo = window.innerHeight - cajaV.bottom - SEPARACION - MARGEN_VENTANA;
    const espacioArriba = cajaV.top - SEPARACION - MARGEN_VENTANA;
    const arriba = espacioAbajo < altoMinimoUtil && espacioArriba > espacioAbajo;
    const disponible = arriba ? espacioArriba : espacioAbajo;
    const alto = Math.min(altoMaximo, Math.max(ALTO_MINIMO, disponible));

    if (ancho === 'disparador') {
      posicionador.style.left = `${caja.left}px`;
      posicionador.style.width = `${caja.width}px`;
    } else {
      // Un panel más ancho que su control se alinea por la DERECHA del
      // disparador (es el borde que la mirada ya tiene fijado al pulsarlo) y
      // luego se acota a la ventana, para que nunca se salga por un lado.
      const preferido = Math.min(caja.left, caja.right - ancho);
      const maximo = window.innerWidth - ancho - MARGEN_VENTANA;
      posicionador.style.left = `${Math.max(MARGEN_VENTANA, Math.min(preferido, maximo))}px`;
      posicionador.style.width = `${ancho}px`;
    }

    if (arriba) {
      posicionador.style.top = 'auto';
      posicionador.style.bottom = `${window.innerHeight - cajaV.top + SEPARACION}px`;
    } else {
      posicionador.style.bottom = 'auto';
      posicionador.style.top = `${cajaV.bottom + SEPARACION}px`;
    }
    refAplicarAlto.current?.(alto);

    setHaciaArriba(arriba);
  }, [disparadorRef, anclaRef, cerrar, ancho, altoMaximo, altoMinimoUtil]);

  // Colocación: antes del primer pintado, o el menú aparecería un frame en la
  // esquina superior izquierda antes de saltar a su sitio.
  useLayoutEffect(() => {
    if (!abierto) return;
    if (compacto) {
      // Al pasar de escritorio a móvil con el menú abierto queda un alto
      // máximo escrito a mano que ya no aplica: la hoja lo lleva en su clase.
      refAplicarAlto.current?.(null);
      return;
    }
    colocar();
  }, [abierto, compacto, colocar]);

  // Clic fuera. Se escucha `pointerdown` y no `click` para cerrar en cuanto el
  // dedo baja, antes de que el navegador mueva el foco.
  useEffect(() => {
    if (!abierto) return;
    const alApuntar = (e: PointerEvent) => {
      const objetivo = e.target as Node;
      if (disparadorRef.current?.contains(objetivo)) return;
      if (panelRef.current?.contains(objetivo)) return;
      cerrar();
    };
    document.addEventListener('pointerdown', alApuntar);
    return () => document.removeEventListener('pointerdown', alApuntar);
  }, [abierto, cerrar, disparadorRef]);

  // Scroll y resize: el menú sigue a su disparador. Limitado a un frame para
  // no medir la caja sesenta veces por segundo en un scroll rápido.
  useEffect(() => {
    if (!abierto || compacto) return;
    let pendiente = 0;
    const alMover = () => {
      if (pendiente) return;
      pendiente = requestAnimationFrame(() => {
        pendiente = 0;
        colocar();
      });
    };
    // Captura: el scroll que importa casi siempre es el de un contenedor
    // interno (el panel de la pantalla), y ese no burbujea hasta `window`.
    window.addEventListener('scroll', alMover, true);
    window.addEventListener('resize', alMover);
    return () => {
      if (pendiente) cancelAnimationFrame(pendiente);
      window.removeEventListener('scroll', alMover, true);
      window.removeEventListener('resize', alMover);
    };
  }, [abierto, compacto, colocar]);

  if (typeof document === 'undefined') return null;

  // Con movimiento reducido se cambia el desplazamiento por opacidad, nunca se
  // quita el feedback: el menú sigue apareciendo y desapareciendo.
  const animacionMenu = reducido
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: dur.fast, ease },
      }
    : {
        // Emerge DESDE el control: nace pegado a él (y negativa cuando baja) y
        // crece desde el borde por el que sale. Se va con un tween de 120 ms:
        // nadie mira lo que se cierra.
        initial: { opacity: 0, scale: 0.97, y: haciaArriba ? 4 : -4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: haciaArriba ? 4 : -4, transition: salidaPanel },
        transition: springPanel,
      };

  const animacionHoja = reducido
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: dur.base, ease },
      }
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: springSoft,
      };

  return createPortal(
    <AnimatePresence>
      {abierto &&
        (compacto ? (
          <div className="fixed inset-0 flex items-end" style={{ zIndex: Z_MENU_ANCLADO }}>
            <Backdrop onClick={cerrar} />
            <motion.div
              ref={panelRef}
              {...animacionHoja}
              role="dialog"
              aria-modal="true"
              aria-label={tituloHoja}
              className="relative z-10 w-full rounded-t-modal bg-surface-3 pb-[env(safe-area-inset-bottom)] shadow-menu"
            >
              <header className="flex items-center justify-between gap-3 px-4 pb-1 pt-3">
                <h2 className="font-ui text-14 font-semibold text-text-1">{tituloHoja}</h2>
                <IconButton aria-label="Cerrar" onClick={cerrar}>
                  <X size={16} />
                </IconButton>
              </header>
              {children}
            </motion.div>
          </div>
        ) : (
          // El posicionador no anima nada: solo recibe las coordenadas que
          // `colocar` le escribe. Dentro va el panel, que anima exclusivamente
          // `transform` y `opacity`.
          <div
            ref={posicionadorRef}
            className="fixed"
            style={{ top: 0, left: 0, zIndex: Z_MENU_ANCLADO }}
          >
            <motion.div
              ref={panelRef}
              {...animacionMenu}
              // El origen va en el borde por el que sale, para que se lea como
              // que el menú brota del control y no como una caja que aparece en
              // medio.
              style={{ transformOrigin: `${haciaArriba ? 'bottom' : 'top'} ${ancho === 'disparador' ? 'center' : 'right'}` }}
              className={cn(
                // Menú del sistema: radio `menu` (14 px = fila de 8 px + 6 px
                // de relleno) y el borde como primera capa de la sombra.
                'overflow-hidden rounded-menu bg-surface-3 shadow-menu',
                className
              )}
            >
              {children}
            </motion.div>
          </div>
        ))}
    </AnimatePresence>,
    document.body
  );
}
