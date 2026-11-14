import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * twMerge necesita saber explícitamente que nuestra escala de `fontSize`
 * personalizada (12/13/14/15/22/28/40, definida en tailwind.config.js) son
 * utilidades de TAMAÑO de fuente. Sin esto, twMerge no reconoce `text-14`
 * como font-size (Tailwind por defecto usa text-sm/lg/xl, no números) y lo
 * clasifica como si compitiera con clases de COLOR de texto (`text-white`,
 * `text-accent`, etc.) — el resultado es que la clase de color que aparezca
 * ANTES en el string se descarta silenciosamente en favor del tamaño que
 * aparece después, y el texto blanco de un botón primario desaparece sin
 * ningún error. Es un bug que ya costó dos rondas de depuración en CUSOL.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['12', '13', '14', '15', '22', '28', '40', 'display', 'portada'] }],
      // Lo mismo con los radios y sombras con nombre: sin esto, pasar
      // `rounded-modal` a un componente que ya trae `rounded-tarjeta` dejaba
      // las dos clases y ganaba la que Tailwind hubiera escrito después.
      rounded: [{ rounded: ['xs', 'celda', 'control', 'menu', 'burbuja', 'tarjeta', 'composer', 'modal', 'pastilla'] }],
      shadow: [{ shadow: ['1', '2', '3', 'anillo', 'composer', 'composer-foco', 'menu'] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
