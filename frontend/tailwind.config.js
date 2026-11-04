/** @type {import('tailwindcss').Config} */

/*
 * Tokens de color tomados del Manual de Identidad Gráfica 2024 de la
 * Universidad Aurora Ciudad de México.
 *
 * Colores institucionales (restricción dura, no modificar):
 *   rojo   #E00034  Pantone 185 C   — color primario de marca
 *   gris   #82786F  Warm Gray 9 C   — texto secundario
 *   negro  #000000  negro puro      — el manual pide negro, no negro tintado
 *
 * DECISIÓN DE DISEÑO — rojo de marca vs. rojo semántico
 * -----------------------------------------------------
 * El rojo institucional (#E00034) identifica a la marca y viste las acciones
 * primarias de la interfaz (botón "Enviar", "Guardar cambios", elemento activo).
 * Si además lo usáramos para señalar peligro o riesgo alto, el mismo color
 * significaría dos cosas opuestas en la misma pantalla: "haz clic aquí" y
 * "cuidado con esto". Por eso el riesgo se comunica con `semantic.riesgo`
 * (#8F2E22), un rojo terroso claramente más apagado y oscuro, imposible de
 * confundir con el rojo de marca aun de reojo. Los indicadores de riesgo
 * refuerzan además la codificación con forma e icono, nunca solo con color.
 *
 * ESTRUCTURA DEL TEMA
 * -------------------
 * Hay dos familias de tokens y sirven para cosas distintas:
 *
 *   `aurora.*` / `semantic.*` — la PALETA de marca, con sus escalas completas.
 *     Es la fuente de verdad documental y se usa en piezas de marca puntuales.
 *
 *   `bg` / `surface` / `text` / `hairline` / `accent` / `status` — los tokens
 *     SEMÁNTICOS de interfaz, apuntando a variables CSS de src/index.css. Es lo
 *     que usan los componentes: un componente nunca dice "rojo-500", dice
 *     "accent"; nunca dice "piedra-600", dice "text-2". Cambiar un valor en
 *     index.css repinta la app entera sin tocar un solo componente.
 *
 * La mecánica no cromática (escala tipográfica cerrada, radios anidados,
 * elevación en 3 capas, curvas de motion) viene del sistema de SGO CUSOL.
 */

const rojo = {
  DEFAULT: '#E00034',
  50: '#FFF1F4',
  100: '#FFE1E7',
  200: '#FFC4D0',
  300: '#FF97AC',
  400: '#F85277',
  500: '#E00034',
  600: '#C4002D',
  700: '#A30026', // hover / pressed de acciones primarias, y tinta de enlaces
  800: '#7D001D',
  900: '#5A0015',
};

// Escala neutra cálida derivada de Warm Gray 9 C (#82786F): fondos,
// bordes y superficies. El 500 es exactamente el gris institucional.
const piedra = {
  25: '#FCFBFA',
  50: '#F7F6F4',
  100: '#EFEDEA',
  200: '#E3DFDA',
  300: '#CFC9C2',
  400: '#ABA49B',
  500: '#82786F',
  600: '#6B625A',
  700: '#544E48',
  800: '#3B3631',
  900: '#23201D',
};

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class', // declarado pero sin usar: el MVP es solo modo claro
  theme: {
    // NOTA sobre espaciado: se usa la escala COMPLETA de Tailwind, a propósito.
    // Restringir `theme.spacing` a 4/8/12/16/24/32/48 se probó en CUSOL y causó
    // bugs silenciosos: Tailwind no avisa cuando una clase no existe, simplemente
    // no aplica nada, así que `py-16` o `ml-0.5` se rompían sin error visible.
    // "Preferir la escala 4/8/12/16/24/32/48 (claves 1/2/3/4/6/8/12) para el
    // espaciado entre bloques" es una convención de código, no una restricción
    // técnica; los medios-pasos siguen disponibles para ajustes finos de iconos.

    // Escala tipográfica CERRADA: 7 tamaños, ni uno más. Cuatro para cuerpo e
    // interfaz (12/13/14/15) y tres para jerarquía (22/28/40, ya con peso 600
    // horneado). La jerarquía se construye con peso y tamaño, nunca con color.
    //
    fontSize: {
      12: ['12px', { lineHeight: '16px' }],
      13: ['13px', { lineHeight: '18px' }],
      14: ['14px', { lineHeight: '20px' }],
      15: ['15px', { lineHeight: '22px' }],
      22: ['22px', { lineHeight: '28px', fontWeight: '600' }],
      28: ['28px', { lineHeight: '34px', fontWeight: '600' }],
      40: ['40px', { lineHeight: '44px', fontWeight: '600' }],
      // Único tamaño fluido: portadas y titulares de marca, fuera del chrome.
      display: ['clamp(2rem, 1.2rem + 3.2vw, 3.25rem)', { lineHeight: '1.05', letterSpacing: '-0.022em' }],
    },

    // Radios ANIDADOS: modal > tarjeta > control > celda. La regla es
    // "radio interior = radio exterior − padding", por eso los contenedores
    // grandes son generosos y los controles cortos se mantienen contenidos:
    // el mismo radio absoluto en un input de 40px se lee como pastilla, y la
    // pastilla completa se reserva para un solo componente (StatusPill).
    borderRadius: {
      none: '0px',
      celda: '8px',
      control: '10px',
      tarjeta: '20px',
      modal: '24px',
      pastilla: '999px',
      full: '9999px',
    },

    // Elevación en 3 capas. Cada nivel son DOS sombras superpuestas (nunca una
    // sola dura) y todas teñidas de cálido: 1 reposo, 2 hover, 3 flotante.
    boxShadow: {
      1: 'var(--shadow-1)',
      2: 'var(--shadow-2)',
      3: 'var(--shadow-3)',
      none: 'none',
    },

    extend: {
      colors: {
        // — Paleta de marca (documental) —
        aurora: {
          rojo,
          gris: '#82786F',
          negro: '#000000',
          piedra,
        },
        semantic: {
          riesgo: { DEFAULT: '#8F2E22', 50: '#FBF0EE', 100: '#F5DDD9', 700: '#6E2119' },
          exito: { DEFAULT: '#1E7A4F', 50: '#EBF6F0', 100: '#D3EBE0', 700: '#155C3B' },
          aviso: { DEFAULT: '#8A5A00', 50: '#FBF3E4', 100: '#F4E4C4', 700: '#6B4600' },
          info: { DEFAULT: '#1F5F8B', 50: '#ECF3F8', 100: '#D3E4F0', 700: '#174A6D' },
        },

        // — Tokens semánticos de interfaz (lo que usan los componentes) —
        bg: 'var(--bg)',
        surface: {
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        hairline: 'var(--hairline)',
        hairlineStrong: 'var(--hairline-strong)',
        text: {
          1: 'var(--text-1)',
          2: 'var(--text-2)',
          3: 'var(--text-3)',
        },
        accent: {
          DEFAULT: 'var(--accent)',      // rellenos: botón primario, indicador activo
          fg: 'var(--accent-fg)',        // tinta: texto e iconos sobre fondo claro (AA)
          strong: 'var(--accent-strong)',// hover / pressed
          soft: 'var(--accent-soft)',    // fondos de realce, hover de fila, píldora activa
        },
        status: {
          green: 'var(--status-green)',
          'green-soft': 'var(--status-green-soft)',
          blue: 'var(--status-blue)',
          'blue-soft': 'var(--status-blue-soft)',
          amber: 'var(--status-amber)',
          'amber-soft': 'var(--status-amber-soft)',
          red: 'var(--status-red)',
          'red-soft': 'var(--status-red-soft)',
          gray: 'var(--status-gray)',
          'gray-soft': 'var(--status-gray-soft)',
        },
      },

      fontFamily: {
        // Punto único de sustitución tipográfica — ver src/index.css.
        // UNA sola familia para todo (Google Sans): interfaz, títulos, cuerpo,
        // texto del agente y documentos. La jerarquía se construye con tamaño y
        // peso, no cambiando de letra.
        sans: ['var(--aurora-fuente-principal)'],
        ui: ['var(--aurora-fuente-principal)'],
        mono: ['var(--aurora-fuente-mono)'],
      },

      transitionTimingFunction: {
        // Curva única de la app para transiciones CSS (las de JS usan springs).
        aurora: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },

      keyframes: {
        brillo: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        entrarAbajo: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Cursor de escritura del chat. Va en CSS y no en Framer Motion porque
        // el componente que lo contiene se re-renderiza una vez por frame
        // mientras llega texto, y una animación de JS se reiniciaba en cada uno
        // de esos renders sin llegar nunca a parpadear. Termina en opacidad 1
        // a propósito: con prefers-reduced-motion la regla global colapsa la
        // duración y el cursor se queda VISIBLE, no apagado.
        parpadeo: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.15' },
        },
        // Punto de "trabajando" de la cadena de agentes. Mismo motivo que
        // `parpadeo`: su componente se re-renderiza una vez por frame mientras
        // llega texto, y una animación de JS se reiniciaba sin llegar a latir —
        // justo en los 3-4 s de espera que la cadena existe para explicar.
        // Termina en su estado visible para que reduced-motion deje el punto ahí.
        latido: {
          '0%, 100%': { opacity: '1', transform: 'none' },
          '50%': { opacity: '0.25', transform: 'scale(0.75)' },
        },
      },
      animation: {
        brillo: 'brillo 1.6s linear infinite',
        entrarAbajo: 'entrarAbajo 220ms cubic-bezier(0.32, 0.72, 0, 1) both',
        parpadeo: 'parpadeo 1s linear infinite',
        latido: 'latido 1.2s ease-in-out infinite',
      },

      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
      },
    },
  },
  plugins: [],
};
