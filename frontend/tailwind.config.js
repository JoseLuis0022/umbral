/** @type {import('tailwindcss').Config} */

/*
 * Tokens de color del sistema: azul cobalto de acción sobre neutros pizarra.
 *
 * Colores de marca:
 *   azul     #2F5FE4  azul-500     — color primario de marca y acción
 *   pizarra  #6E7A8D  pizarra-500  — neutro de referencia de la escala fría
 *
 * DECISIÓN DE DISEÑO — azul de marca vs. colores semánticos
 * ---------------------------------------------------------
 * El azul de marca (#2F5FE4) identifica al producto y viste las acciones
 * primarias de la interfaz (botón "Enviar", "Guardar cambios", elemento activo).
 * Si un estatus compartiera ese tono, el mismo color significaría dos cosas en
 * la misma pantalla: "haz clic aquí" y "fíjate en esto". Por eso el riesgo usa
 * `semantic.riesgo` (#8F2E22), un rojo terroso, y la información
 * `semantic.info` (#17707F), un azul petróleo claramente más verde y apagado
 * que el cobalto. Los indicadores refuerzan además con forma e icono, nunca
 * solo con color.
 *
 * ESTRUCTURA DEL TEMA
 * -------------------
 * Hay dos familias de tokens y sirven para cosas distintas:
 *
 *   `marca.*` / `semantic.*` — la PALETA de marca, con sus escalas completas.
 *     Es la fuente de verdad documental y se usa en piezas de marca puntuales.
 *
 *   `bg` / `surface` / `text` / `hairline` / `accent` / `status` — los tokens
 *     SEMÁNTICOS de interfaz, apuntando a variables CSS de src/index.css. Es lo
 *     que usan los componentes: un componente nunca dice "azul-500", dice
 *     "accent"; nunca dice "pizarra-600", dice "text-2". Cambiar un valor en
 *     index.css repinta la app entera sin tocar un solo componente.
 *
 * La mecánica no cromática (escala tipográfica cerrada, radios anidados,
 * elevación en 3 capas, curvas de motion) viene del sistema de SGO CUSOL.
 */

const azul = {
  DEFAULT: '#2F5FE4',
  50: '#EEF3FE',
  100: '#DCE6FD',
  200: '#BCCFFB',
  300: '#8EADF7',
  400: '#5B85F0',
  500: '#2F5FE4',
  600: '#2450C8',
  700: '#1D41A3', // hover / pressed de acciones primarias, y tinta de enlaces
  800: '#1A3682',
  900: '#152A61',
};

// Escala neutra fría con un punto de azul: fondos, bordes y superficies.
const pizarra = {
  25: '#FBFCFD',
  50: '#F5F7FA',
  100: '#ECEFF4',
  200: '#DEE3EB',
  300: '#C7CFDB',
  400: '#97A1B2',
  500: '#6E7A8D',
  600: '#535E70',
  700: '#3E4757',
  800: '#2A313D',
  900: '#161C27',
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
      // EXCEPCIÓN DOCUMENTADA (docs/especificacion-diseno.md §2): tamaños de
      // LECTURA. 16/26 es el cuerpo de la respuesta del agente y de los
      // documentos (≈72 caracteres por línea en 680 px); 18/26 es su h2. No se
      // usan en el chrome de la interfaz, que sigue en 12–15.
      16: ['16px', { lineHeight: '26px', letterSpacing: '-0.003em' }],
      18: ['18px', { lineHeight: '26px', fontWeight: '600', letterSpacing: '-0.006em' }],
      22: ['22px', { lineHeight: '28px', fontWeight: '600' }],
      28: ['28px', { lineHeight: '34px', fontWeight: '600' }],
      // Saludo del estado vacío del chat (32/40), la única portada del chrome.
      32: ['32px', { lineHeight: '40px', fontWeight: '600', letterSpacing: '-0.015em' }],
      40: ['40px', { lineHeight: '44px', fontWeight: '600' }],
      // Único tamaño fluido: portadas y titulares de marca, fuera del chrome.
      display: ['clamp(2rem, 1.2rem + 3.2vw, 3.25rem)', { lineHeight: '1.05', letterSpacing: '-0.022em' }],
    },

    // Radios ANIDADOS (docs/especificacion-diseno.md §2). La regla es
    // "radio interior = radio exterior − padding": un menú de 14 px con 6 px de
    // relleno lleva filas de 8 px (`celda`). Los contenedores grandes son
    // generosos y los controles cortos se mantienen contenidos: el mismo radio
    // absoluto en un input de 40 px se lee como pastilla.
    //
    //   xs 6 · chips de código, kbd        menu 14 · menús y popovers
    //   celda 8 · filas, acciones          burbuja 20 · mensaje del usuario
    //   control 10 · botones, inputs       composer 24 · barra de entrada
    //   tarjeta 20 · tarjetas              modal 28 · modales y hojas
    //   pastilla 999 · StatusPill y chips de sugerencia del chat
    borderRadius: {
      none: '0px',
      xs: '6px',
      celda: '8px',
      control: '10px',
      menu: '14px',
      burbuja: '20px',
      tarjeta: '20px',
      composer: '24px',
      modal: '28px',
      pastilla: '999px',
      full: '9999px',
    },

    // Elevación en 3 capas. Cada nivel son DOS sombras superpuestas (nunca una
    // sola dura) y todas teñidas de pizarra: 1 reposo, 2 hover, 3 flotante.
    boxShadow: {
      1: 'var(--shadow-1)',
      2: 'var(--shadow-2)',
      3: 'var(--shadow-3)',
      // El borde como ANILLO de sombra: se compone con la elevación sin
      // doblarse. Ningún componente combina `border` con una sombra aparte.
      anillo: 'var(--ring-1)',
      composer: 'var(--shadow-composer)',
      'composer-foco': 'var(--shadow-composer-focus)',
      menu: 'var(--shadow-menu)',
      none: 'none',
    },

    extend: {
      colors: {
        // — Paleta de marca (documental) —
        marca: {
          azul,
          pizarra,
        },
        // Burbuja del usuario: un gris pizarra sin borde ni sombra, para que se
        // lea como mensaje y no como tarjeta.
        burbuja: 'var(--burbuja-usuario)',
        // Tinta de pizarra-900 en canales, para TINTES con opacidad
        // (`bg-tinta/[.05]` en hover de filas, `bg-tinta/10` en el enviar
        // apagado). Los tokens `text-*` apuntan a `var(--…)` en hex y Tailwind
        // no puede aplicarles un modificador de opacidad: `bg-text-1/10` no
        // genera NADA, en silencio.
        tinta: 'rgb(22 28 39 / <alpha-value>)',
        semantic: {
          riesgo: { DEFAULT: '#8F2E22', 50: '#FBF0EE', 100: '#F5DDD9', 700: '#6E2119' },
          exito: { DEFAULT: '#1E7A4F', 50: '#EBF6F0', 100: '#D3EBE0', 700: '#155C3B' },
          aviso: { DEFAULT: '#8A5A00', 50: '#FBF3E4', 100: '#F4E4C4', 700: '#6B4600' },
          info: { DEFAULT: '#17707F', 50: '#EAF5F6', 100: '#CFE8EB', 700: '#11545F' },
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
        sans: ['var(--umbral-fuente-principal)'],
        ui: ['var(--umbral-fuente-principal)'],
        mono: ['var(--umbral-fuente-mono)'],
      },

      transitionTimingFunction: {
        // Curva única de la app para transiciones CSS (las de JS usan springs).
        umbral: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },

      keyframes: {
        // Brillo de la frase de actividad: una banda de 25 % del ancho recorre
        // el texto de izquierda a derecha (ver `TextoBrillante`, que pone el
        // gradiente de tres paradas y el `background-size` de 250 %).
        brillo: {
          '0%': { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '0% 0' },
        },
        entrarAbajo: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        // Cursor de escritura. Va en CSS y no en Framer Motion porque el
        // componente que lo contiene se re-renderiza una vez por frame mientras
        // llega texto, y una animación de JS se reiniciaba en cada render.
        parpadeo: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.15' },
        },
        // Punto de "trabajando" de la cadena de agentes del Laboratorio.
        latido: {
          '0%, 100%': { opacity: '1', transform: 'none' },
          '50%': { opacity: '0.25', transform: 'scale(0.75)' },
        },
        /*
         * EL ISOTIPO PENSANDO (docs/especificacion-diseno.md §3).
         *
         * Ciclo de 1,8 s: 1,6 s de recorrido + 200 ms de pausa. Un pulso de
         * luz (`pulsoTrazo`, segundo trazo con `pathLength=100` y
         * `stroke-dasharray: 14 200`) viaja por la M; cuando su centro pasa por
         * un nodo, el nodo crece (`nodoPaso`) y en el valle sale una onda
         * (`ondaValle`). Los retrasos de cada nodo los pone el componente y
         * salen de la geometría: pico izquierdo al 26 % del trazo, valle al
         * 50 %, pico derecho al 74 %.
         *
         * Todo es CSS porque el hilo se re-renderiza una vez por frame mientras
         * llega texto y una animación de JS se reiniciaría en cada render.
         * Antes los keyframes existían pero el servidor de Vite que estaba
         * corriendo no había releído esta configuración: si una animación nueva
         * "no se mueve", reinicia Vite antes de buscar el error en el código.
         */
        pulsoTrazo: {
          '0%': { strokeDashoffset: '14' },
          '88.9%, 100%': { strokeDashoffset: '-100' },
        },
        nodoPaso: {
          '0%, 22%, 100%': { transform: 'scale(1)' },
          '10%': { transform: 'scale(1.25)' },
        },
        ondaValle: {
          '0%': { opacity: '0', transform: 'scale(1)' },
          '2%': { opacity: '0.5', transform: 'scale(1)' },
          '39%, 100%': { opacity: '0', transform: 'scale(2.8)' },
        },
        // Los tres puntos de la burbujita "sigue trabajando": una ola que
        // levanta cada punto 2 px y lo enciende por turno.
        puntoOla: {
          '0%, 60%, 100%': { opacity: '0.35', transform: 'translateY(0) scale(0.85)' },
          '30%': { opacity: '1', transform: 'translateY(-2px) scale(1)' },
        },
        // Latido de espera para movimiento reducido: solo opacidad, sin
        // desplazamiento ni escala. Es también la forma quieta de los nodos.
        espera: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        brillo: 'brillo 2.2s linear infinite',
        entrarAbajo: 'entrarAbajo 220ms cubic-bezier(0.32, 0.72, 0, 1) both',
        parpadeo: 'parpadeo 1s linear infinite',
        latido: 'latido 1.2s ease-in-out infinite',
        pulsoTrazo: 'pulsoTrazo 1.8s linear infinite both',
        nodoPaso: 'nodoPaso 1.8s cubic-bezier(0.32, 0.72, 0, 1) infinite both',
        ondaValle: 'ondaValle 1.8s cubic-bezier(0.2, 0.6, 0.3, 1) infinite both',
        puntoOla: 'puntoOla 1.2s cubic-bezier(0.45, 0, 0.55, 1) infinite both',
        espera: 'espera 2.4s ease-in-out infinite',
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
