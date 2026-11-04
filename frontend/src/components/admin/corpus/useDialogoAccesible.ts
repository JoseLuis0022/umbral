import { useEffect } from 'react';

const FOCALIZABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Cierre con Esc, trampa de foco y devolución del foco al cerrar, para el
 * `Modal` y el `Drawer` del sistema.
 *
 * Vive aquí y no dentro de esos componentes porque `src/components/ui` es
 * territorio compartido con otros frentes de trabajo y no se toca desde esta
 * pantalla. El hook se engancha al nodo que ellos ya renderizan —
 * `[role="dialog"][aria-modal="true"]` dentro del portal— en vez de necesitar
 * una ref que no exponen.
 *
 * En cuanto Modal y Drawer incorporen esto de fábrica, este archivo se borra y
 * las llamadas se quitan; no hay nada más que desmontar.
 */
export function useDialogoAccesible(abierto: boolean, alCerrar: () => void) {
  useEffect(() => {
    if (!abierto) return;

    const previo = document.activeElement as HTMLElement | null;

    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        alCerrar();
        return;
      }
      if (e.key !== 'Tab') return;

      const dialogo = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (!dialogo) return;

      const focos = Array.from(dialogo.querySelectorAll<HTMLElement>(FOCALIZABLES)).filter(
        (el) => el.offsetParent !== null
      );
      if (focos.length === 0) return;

      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      const activo = document.activeElement;

      // El ciclo se cierra a mano en los dos extremos: sin esto el Tab sale del
      // diálogo hacia la pantalla de atrás, que además está tapada por el
      // fondo esmerilado — el foco desaparece de la vista.
      if (e.shiftKey && (activo === primero || !dialogo.contains(activo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && activo === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    // Un frame de espera: el portal y la animación de entrada del diálogo
    // todavía no están en el DOM en el mismo tick en que `abierto` cambia.
    const raf = requestAnimationFrame(() => {
      const dialogo = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      const primerCampo = dialogo?.querySelector<HTMLElement>('input, textarea, select');
      (primerCampo ?? dialogo?.querySelector<HTMLElement>(FOCALIZABLES))?.focus();
    });

    document.addEventListener('keydown', alTeclear, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', alTeclear, true);
      previo?.focus?.();
    };
  }, [abierto, alCerrar]);
}
