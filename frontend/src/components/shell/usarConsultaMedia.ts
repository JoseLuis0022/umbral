import { useEffect, useState } from 'react';

/**
 * Lectura de una media query desde JavaScript.
 *
 * Existe porque el plegado a carril NO se puede resolver solo con clases
 * `lg:`: el ancho del panel se escribe como estilo en línea (lo anima Framer)
 * y un estilo en línea no entiende de puntos de corte. Si el mismo árbol se
 * pintara en móvil, el panel se quedaría clavado en 340 px dentro de una
 * columna de 375 px.
 *
 * Por eso `PanelPlegable` RAMIFICA: por debajo de `lg` devuelve el panel tal
 * cual, sin envoltura, sin botón y sin carril, que es justo lo que pide la
 * navegación de dos niveles de móvil (lista → detalle).
 */
export function usarConsultaMedia(consulta: string): boolean {
  const [coincide, setCoincide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    // Se sincroniza al montar además de escuchar: entre el primer render y
    // este efecto el usuario pudo girar el dispositivo.
    setCoincide(mq.matches);
    const alCambiar = (e: MediaQueryListEvent) => setCoincide(e.matches);
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, [consulta]);

  return coincide;
}

/**
 * Los dos puntos de corte que usa el plegado, con los MISMOS valores que
 * `theme.screens` de tailwind.config.js. Se declaran aquí como constantes para
 * que un cambio en el config tenga un solo sitio que corregir de este lado.
 */
export const CONSULTA_ESCRITORIO = '(min-width: 1024px)'; // lg
export const CONSULTA_ANCHA = '(min-width: 1280px)'; // xl
