import { useEffect } from 'react';

const FOCALIZABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Cierre con Esc, trampa de foco y devolución del foco al cerrar, para el
 * `Modal` del sistema.
 *
 * Es una COPIA deliberada del hook de la pantalla de corpus, no un import: las
 * dos pantallas de administración se tocan en paralelo y compartir un archivo
 * privado de una de ellas las acoplaría sin que nada lo declare. El día que
 * `Modal` incorpore esto de fábrica, las dos copias se borran a la vez.
 *
 * Se engancha al nodo que `Modal` ya renderiza —`[role="dialog"][aria-modal]`
 * dentro del portal— en lugar de necesitar una ref que no expone.
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
      // diálogo hacia la pantalla de atrás, que además está tapada por el fondo
      // esmerilado — el foco desaparece de la vista.
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
      dialogo?.querySelector<HTMLElement>(FOCALIZABLES)?.focus();
    });

    document.addEventListener('keydown', alTeclear, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', alTeclear, true);
      previo?.focus?.();
    };
  }, [abierto, alCerrar]);
}
