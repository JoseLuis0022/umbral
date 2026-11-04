import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Ancho real del contenedor, medido con ResizeObserver.
 *
 * Las gráficas se dibujan en píxeles reales y NO con un `viewBox` escalado:
 * un SVG estirado con `preserveAspectRatio="none"` deforma el grosor de los
 * trazos y el tamaño de las etiquetas, y en un tablero angosto el resultado se
 * ve como una captura mal reescalada.
 *
 * Se observa el elemento y no `window.resize` porque el ancho disponible
 * también cambia sin que la ventana se mueva: al plegar el menú lateral o al
 * cambiar la densidad/tamaño de texto de Ajustes.
 */
export function useAnchoContenedor<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [ancho, setAncho] = useState(0);

  // `useLayoutEffect` y no `useEffect`: la gráfica solo se dibuja cuando ya hay
  // ancho, así que medir después del pintado dejaba un frame con el hueco
  // reservado (220 px) COMPLETAMENTE VACÍO. Midiendo antes de pintar, el primer
  // frame que el usuario ve ya trae la gráfica.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Misma métrica en la medición inicial y en las actualizaciones: mezclar
    // `clientWidth` (incluye padding) con `contentRect.width` (no lo incluye)
    // hacía que la geometría se recalculara un frame después de montar.
    setAncho(el.getBoundingClientRect().width);
    const observador = new ResizeObserver((entradas) => {
      const entrada = entradas[0];
      // Un ancho 0 significa que el contenedor está oculto (una pestaña que se
      // fue, un panel plegado), no que la gráfica mida cero. Escribirlo
      // desmontaba el SVG y al volver se reproducía el trazado entero desde el
      // principio, como si los datos acabaran de llegar.
      if (entrada && entrada.contentRect.width > 0) setAncho(entrada.contentRect.width);
    });
    observador.observe(el);
    return () => observador.disconnect();
  }, []);

  return [ref, ancho] as const;
}

function useMediaQuery(consulta: string) {
  const [activa, setActiva] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    setActiva(mq.matches);
    const manejar = (e: MediaQueryListEvent) => setActiva(e.matches);
    mq.addEventListener('change', manejar);
    return () => mq.removeEventListener('change', manejar);
  }, [consulta]);

  return activa;
}

/**
 * 768px es el MISMO punto de corte en el que `DataTable` cambia de tabla real
 * a tarjetas apiladas. La tabla necesita saberlo porque en modo tarjeta no
 * existen encabezados: ahí el orden solo puede cambiarse desde el selector de
 * la barra de herramientas, no haciendo clic en una columna que no está.
 */
export const useEsEscritorio = () => useMediaQuery('(min-width: 768px)');
