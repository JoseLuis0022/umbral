import { Children, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { screenEnter, screenEnterReducido } from '../../lib/motion';
import { useReducedMotion } from '../../lib/useReducedMotion';

/**
 * Coreografía de entrada de pantalla: envuelve los bloques de nivel superior
 * de CUALQUIER pantalla (encabezado, filtros, tabla, tarjetas) para que entren
 * en cascada de 40 ms en vez de aparecer todos de golpe.
 *
 * `initial`/`animate` van explícitos en CADA hijo en lugar de depender de la
 * propagación de variants desde el padre: la propagación por contexto dejaba
 * el contenido atascado en estado "hidden" de forma intermitente.
 *
 * Uso: <PageEnter><PageHeader/><Banner/><DataTable/></PageEnter>
 */
export function PageEnter({ children, className }: { children?: ReactNode; className?: string }) {
  const reducido = useReducedMotion();

  /*
   * `Children.toArray` y no `Children.map`, y esto arregla un fallo visual de
   * los feos.
   *
   * `Children.map` invoca su callback también para `null`, `undefined` y
   * `false`, así que un hijo escrito como `{condicion && <Bloque/>}` producía
   * un envoltorio VACÍO cuando la condición no se cumplía. Ese envoltorio
   * gastaba una ranura del `gap` del padre (32 px de hueco fantasma en las
   * pantallas con `gap-8`), gastaba un escalón del escalonado retrasando a los
   * que sí tenían contenido, y —lo grave— en las cuatro pantallas que le dan
   * `flex-1` al último hijo para repartir un alto de viewport completo, ese
   * `flex-1` podía caerle a un div vacío: el contenido real colapsaba a cero y
   * quedaba un rectángulo en blanco de pantalla completa.
   *
   * `toArray` descarta los huecos y además asigna claves estables.
   */
  const bloques = Children.toArray(children);

  return (
    <div className={className}>
      {bloques.map((child, i) => (
        <motion.div
          key={i}
          custom={i}
          initial="hidden"
          animate="visible"
          // Con movimiento reducido la cascada se conserva —sigue explicando el
          // orden de lectura— pero sin desplazamiento: solo opacidad. Esta era
          // la animación más grande de la app que ignoraba la preferencia.
          variants={reducido ? screenEnterReducido : screenEnter}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
