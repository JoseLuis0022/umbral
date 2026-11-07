import { Children, type ReactNode } from 'react';

/**
 * Contenedor de los bloques de nivel superior de una pantalla (encabezado,
 * filtros, tabla, tarjetas). Antes los hacía entrar en cascada; ya no anima
 * (ver la nota del render): la pantalla aparece completa en un cuadro.
 *
 * Uso: <PageEnter><PageHeader/><Banner/><DataTable/></PageEnter>
 */
export function PageEnter({ children, className }: { children?: ReactNode; className?: string }) {
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
        // Sin cascada de entrada: la pantalla aparece completa en el mismo
        // cuadro. La cascada se repetía en cada visita y se sumaba a las demás
        // apariciones (era una de las "olas" del parpadeo al navegar). Se
        // conserva el envoltorio por bloque porque varias pantallas lo usan
        // para repartir el alto (`[&>*:last-child]:flex-1`).
        <div key={i}>{child}</div>
      ))}
    </div>
  );
}
