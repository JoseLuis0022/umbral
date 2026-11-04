import { useEffect, useState } from 'react';

/**
 * Lectura de la preferencia efectiva de movimiento.
 *
 * Son DOS fuentes, no una: el ajuste del sistema operativo
 * (`prefers-reduced-motion`) y el interruptor propio de la app (Ajustes →
 * Movimiento), que `PreferenciasContext` escribe como `data-movimiento` en la
 * raíz del documento. El interruptor de la app solo puede AÑADIR: si el sistema
 * ya pide menos movimiento, esa petición manda por encima de todo.
 *
 * Antes solo se leía la media query, y eso dejaba la app partida en dos: los
 * transforms declarados sí obedecían al interruptor (porque `MotionConfig
 * reducedMotion="always"` los intercepta), pero todo lo que ramifica a mano
 * —animaciones de `layout`, keyframes de CSS, decisiones de "muevo o solo
 * desvanezco"— seguía por la rama de movimiento completo. Media interfaz
 * respetaba el ajuste y la otra media no.
 */
function preferenciaEfectiva() {
  if (typeof window === 'undefined') return false;
  if (document.documentElement.dataset.movimiento === 'reducido') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Fuente única para el movimiento reducido. Si está activo, los componentes
 * sustituyen desplazamiento y escala por crossfade de opacidad — nunca
 * eliminan el feedback por completo: el usuario sigue necesitando saber que
 * su acción se registró.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(preferenciaEfectiva);

  useEffect(() => {
    const sincronizar = () => setReduced(preferenciaEfectiva());
    sincronizar();

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', sincronizar);

    // El interruptor de la app no emite eventos: se observa el atributo que
    // `PreferenciasContext` escribe en <html>. Observar el DOM es preferible a
    // consumir el contexto de preferencias porque este hook lo usan piezas de
    // `ui/` que deben poder funcionar sin ese proveedor montado.
    const observador = new MutationObserver(sincronizar);
    observador.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-movimiento'],
    });

    return () => {
      mq.removeEventListener('change', sincronizar);
      observador.disconnect();
    };
  }, []);

  return reduced;
}

// Preset listo para pasar a Framer Motion, ya resuelto según la preferencia
// del usuario. Úsalo en vez de escribir variants a mano cuando el componente
// solo necesita entrar y salir con desplazamiento estándar.
export function useMotionPreset({ y = 8, transition }: { y?: number; transition?: object } = {}) {
  const reduced = useReducedMotion();
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15 },
    };
  }
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -y / 2 },
    transition,
  };
}
