// Fuente única de verdad de motion para todo el proyecto.
// No definir springs ni duraciones ad-hoc dentro de un componente: todo pasa
// por aquí. La consistencia (misma curva, misma duración en toda la app) es
// lo que hace que la interfaz se sienta de una sola pieza.

import type { Transition, Variants } from 'framer-motion';

/*
 * LOS TRES RESORTES DEL SISTEMA
 *
 * Los tres se describen aquí por SENSACIÓN —cuánto rebote y cuánto tarda en
 * asentarse— y no por sus números, porque es lo que hay que preservar el día
 * que alguien los toque. El rebote lo fija la relación de amortiguación
 * ζ = damping / (2·√(stiffness·mass)): por debajo de 1 hay sobrepaso, en 1 el
 * elemento llega y se detiene sin pasarse. El tiempo hasta asentarse va con
 * ω = √(stiffness/mass): a más rigidez, antes termina.
 *
 * Los tres caen entre 220 y 270 ms, que es el rango de microinteracción del
 * manual. Que las tres duraciones coincidan es lo que hace que la interfaz se
 * sienta de una pieza aunque cada elemento use el resorte que le toca.
 */

/** Default. ζ ≈ 0.84: rebote apenas perceptible, se asienta en ~225 ms.
 *  El resorte de todo lo que se mueve sin ser ni un control ni una capa. */
export const spring: Transition = { type: 'spring', stiffness: 400, damping: 32, mass: 0.9 };

/** Press, toggles, aparición de controles. ζ ≈ 0.78: ~2 % de sobrepaso —el
 *  punto justo en que un botón se siente "vivo" sin verse elástico— y ~230 ms
 *  hasta quedarse quieto. Es el más rígido de los tres a propósito: responde a
 *  un dedo, y la respuesta a un dedo no puede sentirse blanda. */
export const springSnappy: Transition = { type: 'spring', stiffness: 500, damping: 35 };

/** Modales, sheets, paneles y cascadas de entrada. ζ ≈ 0.93: prácticamente
 *  crítico, o sea SIN rebote, y ~265 ms. Una superficie grande que rebota se
 *  lee como un error de física; y en una cascada de muchos bloques, un resorte
 *  más rígido acentúa cualquier frame perdido y se siente trabado. */
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 30 };

export const ease = [0.32, 0.72, 0, 1] as const;

// Excepción documentada a "siempre springs": un contador numérico necesita una
// curva DISEÑADA (desaceleración fuerte y predecible), no física de resorte —
// un spring subamortiguado avanza casi a ritmo parejo en el tramo medio y no
// da la sensación de "los últimos números llegan más lento" que sí da un
// ease-out expo. Úsese solo para interpolar el VALOR de un contador numérico,
// nunca para posición, opacidad o escala de UI.
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

// Microinteracción (feedback directo de un input): 150-250 ms.
// Revelado (entrada de pantalla, contadores, gráficas): hasta 450 ms, porque
// no responde a un input y puede permitirse ser más expresivo.
export const dur = {
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
  reveal: 0.45,
};

export const stagger = {
  tight: 0.025,
  base: 0.04,
  loose: 0.06,
};

/*
 * Tope del escalonado.
 *
 * Un `delay: i * paso` sin tope hace que una tabla de cincuenta filas tarde
 * segundo y medio en terminar de aparecer. Cada pieza sigue siendo rápida y aun
 * así la PANTALLA se siente lenta, que es exactamente lo que la cascada quería
 * evitar. Doce escalones bastan para que se lea como cascada (es más de lo que
 * cabe en una pantalla sin hacer scroll) y ponen el techo en ~300 ms con el
 * paso `tight`: a partir de ahí el resto entra a la vez.
 */
export const MAX_ESCALONADO = 12;

/** Retardo escalonado con tope. Úsalo en toda lista de largo desconocido. */
export function retardoEscalonado(indice: number, paso: number = stagger.tight) {
  return Math.min(indice, MAX_ESCALONADO) * paso;
}

// Variants de entrada de pantalla (stagger de bloques). Usa springSoft y no el
// spring default: con muchos bloques en cascada, un spring más rígido acentúa
// cualquier variación de frame y se siente "trabado"; uno más suave cascadea
// mejor y es más perdonavidas en máquinas lentas.
export const screenEnter: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...springSoft, delay: i * stagger.base },
  }),
};

// Misma coreografía con movimiento reducido: se conserva la CASCADA (sigue
// explicando el orden de lectura de la pantalla) y se pierde solo el
// desplazamiento. Quitar también el escalonado dejaría la entrada sin ninguna
// estructura, que es más de lo que pide la preferencia.
export const screenEnterReducido: Variants = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({
    opacity: 1,
    transition: { duration: dur.fast, ease, delay: i * stagger.base },
  }),
};

// Entrada ligera para elementos DENTRO de un bloque que ya anima PageEnter
// (EmptyState, ErrorState, Banner). Solo opacidad, sin desplazamiento: un
// segundo spring con movimiento encima del contenedor se siente trabado, no
// aditivo.
export const nestedFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: dur.fast, ease } },
};

export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: dur.fast } },
};
