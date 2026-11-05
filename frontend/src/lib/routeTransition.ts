import type { Variants } from 'framer-motion';
import { transicionRuta } from './motion';

/*
 * Transición de ruta (docs/especificacion-diseno.md §2): la pantalla nueva
 * entra subiendo 6 px en 220 ms y la vieja se va en 100 ms, sin desplazamiento
 * horizontal. Antes cada pantalla entraba 24 px de lado según la dirección de
 * la navegación; en una app de pantallas hermanas (no un flujo de pasos) ese
 * barrido lateral sugería una jerarquía que no existe y era lo que más se
 * movía de toda la interfaz.
 */
export const pageTransitionVariants: Variants = {
  enter: { opacity: 0, y: 6 },
  center: { opacity: 1, y: 0, transition: transicionRuta.entrada },
  exit: { opacity: 0, transition: transicionRuta.salida },
};
