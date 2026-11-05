# Especificación de diseño "high-end" para Umbral

Investigación del 4 de noviembre de 2026. Fuente de verdad para el rediseño del
front. **Verificado** = medido en claude.com (estilos calculados); **inferido** =
de clones de código abierto (assistant-ui) y análisis de terceros. La app
claude.ai no se pudo ver (Cloudflare). No se copia marca de Anthropic (chispa,
serif): se traslada el oficio al isotipo de Umbral y a Google Sans.

Las capturas del diagnóstico (`umbral-*.png`, `ref-*.png`) quedaron en el
scratchpad de la sesión; no están en el repo.

## 1. Diagnóstico

1. **Espera**: isotipo de 20 px casi invisible + 3 barras de skeleton. Un chat no
   sabe cuánto medirá la respuesta: el skeleton promete una forma falsa.
2. **Doble cromo**: cabecera de la app (64 px) + cabecera del chat (56 px).
3. **Estado vacío desconectado**: saludo centrado, composer pegado abajo.
4. **Composer**: `rounded-tarjeta` + `shadow-2` + anillo de foco de 3 px permanente
   (autofoco) → borde doble. Enviar desactivado casi invisible. Anillo de contexto
   vacío parece botón de radio.
5. **Selector de modelo**: dos disparadores distintos, menú de 10 px, id técnico en
   mono bajo cada nombre ("el nombre aparece dos veces"), texto truncado.
6. **Proceso**: regla de 2 px + iconos sueltos → log sin jerarquía.
7. **Lectura**: 15/22 en 760 px ≈ 100 caracteres por línea (meta: 65–75).
8. **Burbuja del usuario**: blanca con borde y sombra → parece tarjeta; la esquina
   recortada se ve anticuada.
9. **Motion uniforme**: todo con `springSnappy` e y = 8 px; sin coreografía.
10. **Hover `y:-1`** en todos los botones: ruido. Solo debe cambiar el fondo.

## 2. Tokens

**Radios**

| Token | Valor | Uso |
|---|---|---|
| `xs` | 6 px | chips de código, kbd |
| `celda` | 8 px | filas de menú, acciones del mensaje |
| `control` | 10 px | botones, inputs |
| `menu` | 14 px | menús y popovers (fila interior 8 px + padding 6 px) |
| `burbuja` | 20 px | mensaje del usuario, sin esquina recortada |
| `composer` | 24 px | composer |
| `tarjeta` | 20 px | tarjetas |
| `modal` | 28 px | modales |
| `pastilla` | 999 px | píldoras |

**Bordes como anillo de sombra**: `--ring-1: 0 0 0 1px var(--hairline)`;
`--hairline: rgba(22,28,39,.08)`. Borde y sombra se componen sin doblarse.

**Sombras**
- `--shadow-composer: 0 0 0 1px rgba(22,28,39,.08), 0 1px 2px rgba(22,28,39,.04), 0 6px 24px -8px rgba(22,28,39,.10)`
- `--shadow-composer-focus`: igual con el anillo a .14 y la última capa `0 8px 32px -8px rgba(22,28,39,.14)`. Sin anillo azul.
- `--shadow-menu: 0 0 0 1px rgba(22,28,39,.08), 0 4px 8px -2px rgba(22,28,39,.06), 0 16px 40px -8px rgba(22,28,39,.18)`

**Espaciado del chat**: 28 px entre turnos; 12 px entre Proceso y texto; composer
con padding 12–14 px arriba y 8 px abajo; fila de herramientas de 36 px.

**Tipografía**
- Respuesta: 16/26, peso 400, `text-1`, `letter-spacing: -0.003em`. Nuevo tamaño
  `16: ['16px','26px']` en la escala, excepción documentada solo para lectura.
  Párrafos con 14 px de margen; h2 18/26 600; h3 16/24 600.
- UI: 14/20 y 13/18. Mensaje del usuario: 15/24.

**Ancho de lectura**: hilo y respuesta `max-w-[680px]` (~72 caracteres); el
composer hasta 720 px.

**Motion** (`src/lib/motion.ts`; mantener los resortes actuales como alias)
- `springPress = { stiffness: 700, damping: 40, mass: 0.6 }`: `whileTap: { scale: 0.96 }`; hover solo color, 120 ms.
- `springMensaje = { stiffness: 320, damping: 32, mass: 1 }`: entrada `opacity 0→1, y 12→0, blur(2px)→0`; el mensaje del usuario además `scale .98→1` con origen abajo a la derecha.
- `springPanel = { stiffness: 420, damping: 36, mass: 0.8 }`: menús/popovers `opacity 0, scale .97, y ∓4`, origen en el ancla; salida tween 120 ms `ease [0.4,0,1,1]`.
- `springLayout = { stiffness: 380, damping: 38 }`: composer del centro al fondo (`layoutId="composer"`), altura del textarea, pliegue del Proceso.
- Ruta: entrada `opacity 0→1, y 6→0` 220 ms `ease [0.32,0.72,0,1]`; salida 100 ms; sin desplazamiento horizontal.
- Brillo de texto: ciclo de 2,2 s lineal, gradiente de 3 paradas al 25 % de ancho.

## 3. La espera del agente (P0)

**Quitar `EsqueletoRespuesta`** → `PensandoUmbral`: isotipo a **28 px** + frase de
actividad con brillo a 14 px, en una fila de 28 px. Sin barras.

Coreografía:
- t = 0: entra el mensaje del usuario (`springMensaje`).
- t = 120 ms: entra el indicador (`opacity`, `scale .9→1`, `springPanel`).
- **Dibujo** (600 ms, solo la primera vez): el trazo de la M con `pathLength 0→1`
  `ease [0.65,0,0.35,1]`; los nodos aparecen cada 90 ms con `scale 0→1` (`springPress`).
- **Recorrido** (bucle de 1,6 s): un pulso de luz recorre el trazo (segundo `path`
  con `stroke-dasharray 6 60` y `stroke-dashoffset` animado, `accent` a opacidad 1
  sobre el trazo base a .25). Al pasar por cada nodo, el nodo crece a `scale 1.25`;
  en el valle sale una onda (anillo `r 2.5→7`, opacidad .5→0, 700 ms). Orden: pico
  izquierdo → valle → pico derecho, 200 ms de pausa. En CSS (`@keyframes`): el
  hilo se re-renderiza por frame.
- **Primer token**: el indicador se encoge con `layoutId="isotipo-respuesta"` hasta
  ser la cabecera del Proceso (16 px, quieto); el texto entra con opacidad en 180 ms.
- **Movimiento reducido**: isotipo quieto; solo late la opacidad de los nodos
  (.5↔1, 2,4 s); el brillo pasa a latido.

**Panel Proceso**: cabecera `rounded-celda` de 32 px, isotipo de 16 px y
"Pensó 8 s · 2 búsquedas" (tiempo medido con `inicio`/`fin`). Abierto: superficie
`bg-[rgba(22,28,39,.03)]`, `rounded-[14px]`, padding 12/14, sin regla de 2 px.
Razonamiento 14/22 en text-2, máximo 3 líneas por bloque con "ver más". Cada paso,
fila de 28 px con un punto-nodo de 6 px unido por una línea de 1 px (la estética
del grafo de la M); descripción 13 px text-1; detalle técnico 12 px mono (solo
llega con permiso). Pasos nuevos con `springLayout`; check con `pathLength`.

## 4. Cambios por componente

**P0**
- `BurbujaMensaje.tsx`: `PensandoUmbral` en lugar del skeleton; respuesta 16/26;
  burbuja del usuario `rounded-burbuja bg-[#EBEEF3]` sin borde ni sombra,
  `px-4 py-2.5`, `max-w-[80%]`, hora solo al pasar el cursor; `AccionMensaje` de
  32 × 32 `rounded-celda`.
- `IndicadorPensando.tsx`: `IsotipoPensando` con `tamano: 16 | 28`, pulso, nodos y
  onda; `TextoBrillante` con gradiente más estrecho; `ProcesoAgente` según §3.
- `tailwind.config.js` / `index.css`: radios, sombras, tamaño 16, keyframes
  `pulsoTrazo` y `ondaValle`; ningún componente combina `border` + sombra aparte.
- `motion.ts`: `springPress`, `springMensaje`, `springPanel`, `springLayout`.
- `BarraEntrada.tsx` (composer): `rounded-composer shadow-composer` →
  `shadow-composer-focus` con foco; sin `ring-[3px]` ni `shadow-2`; altura animada
  con `layout`. Enviar: círculo de 32 px; desactivado `bg-text-1/10` con flecha
  text-3; activo `bg-accent`, flecha blanca, `scale .9→1`. Detener: cuadrado de
  10 px sobre `bg-text-1`, cruce de iconos con rotación −90°→0°.
- `BarraEntrada.tsx` (selector): un solo selector, ver §5.
- `HiloMensajes.tsx`: `max-w-[680px]`, `gap-7`; autoscroll con `use-stick-to-bottom`;
  "Ir al último" circular de 36 px con `shadow-menu`; desvanecido de 24 px sobre el
  composer (`bg-gradient-to-t from-bg`).

**P1**
- `Chat.tsx` / `EstadoVacio.tsx`: en sesión vacía el composer centrado bajo el
  saludo (`layoutId` compartido); al enviar baja con `springLayout`. Saludo 32/40
  con el isotipo de 28 px encima. Chips de 36 px `rounded-pastilla`,
  `bg-surface-1`, anillo de 1 px, sin `y:-1`.
- `LayoutApp.tsx`: en /chat, una sola barra (o transparente sin borde hasta que haya
  scroll); transición de ruta según los tokens.
- `Button.tsx`: sin `whileHover y:-1`; `springPress` con `scale .97`; hover solo color.
- `ContenidoHistorial.tsx`: filas de 36 px `rounded-celda`; fila activa con
  `layoutId` y `bg-text-1/[.05]` (no azul); secciones 12 px 500, sin versalitas.

**P2**
- Laboratorio: mismo composer, `PensandoUmbral` y Proceso; tarjeta lateral `rounded-modal`.
- `Skeleton.tsx`: solo listas y tablas; barrido más suave.
- `Markdown.tsx`: código y tablas con `rounded-[12px]`; cabecera de código de 32 px;
  copiar con check animado.

## 5. Selector de modelo y esfuerzo (P0, estilo Claude Code desktop)

- **Disparador**: un botón de 32 px `rounded-celda` `px-2.5`, 13 px 500; modelo en
  `text-1`, esfuerzo en `text-3`, chevron de 12 px. "Opus 5.5 · Medio". Hover
  `bg-text-1/[.05]`.
- **Agrupado** (`lib/modelos.ts`, función pura): `/^claude-(opus|sonnet|haiku|fable)-(\d+)(?:-(\d+))?(?:-\d{8})?$/`;
  nombre corto = familia con mayúscula + versión ("Opus 5.5"). Principales: el de
  mayor versión de cada familia, orden fijo Opus, Fable, Sonnet, Haiku. "Más
  modelos": el resto, por familia y versión descendente; los que no encajan, con su
  `nombre` sin "Claude ".
- **Predeterminado** → fila "Automático" (atajo 1), subtítulo "Lo que usa el perfil"
  si el backend lo expone. Disparador: "Automático · Medio". El esfuerzo también
  tiene "Automático".
- **Menú**: 260 px, `rounded-menu`, `p-1.5`, `shadow-menu`; filas de 32 px
  `rounded-celda` 14 px; check de 14 px `accent-fg` y atajo 12 px text-3
  `tabular-nums`; separador; "Esfuerzo · Medio ›"; "Más modelos ›". Sin ids técnicos
  (a lo más un `title`).
- **Submenús**: a la derecha (o izquierda si no caben), superposición −6 px; abren
  al pasar el cursor tras 120 ms o con →/Enter; cierran con ←/Esc; triángulo de
  seguridad para el movimiento diagonal.
- **Accesibilidad**: `role="menu"`, `menuitemradio` + `aria-checked`,
  `aria-haspopup`/`aria-expanded` en filas con submenú, roving tabindex, ↑↓ Home
  End, números eligen y cierran, búsqueda por letra, el foco vuelve al disparador.
  En móvil, hoja inferior con submenús como páginas deslizadas.
- **Animación**: apertura `springPanel` (`opacity`, `scale .97→1`, `y 4→0`, origen
  en la esquina del ancla); submenú `x −4→0`; salida 100 ms; el check viaja con
  `layoutId`; el disparador hace fundido cruzado de 150 ms con `layout`.
- **Implementación recomendada**: `@radix-ui/react-dropdown-menu` (submenús, foco y
  polígono de seguridad resueltos) estilado con estos tokens.

## 6. Framer Motion vs GSAP

Quedarse con Framer Motion: declarativo, `layout`/`layoutId`, resortes nativos,
`AnimatePresence`, MIT. GSAP no tiene resortes, es imperativo y su licencia es de
Webflow; solo convendría para líneas de tiempo SVG largas, y el isotipo se resuelve
con keyframes CSS y `pathLength`.

## Fuentes

- claude.com (estilos calculados): https://claude.com/product/overview
- Clon de Claude en assistant-ui: https://www.assistant-ui.com/examples/claude
- Análisis de terceros (no verificados): https://getdesign.md/design-md/claude/preview.html · https://open-design.ai/systems/claude/
- use-stick-to-bottom: https://github.com/stackblitz-labs/use-stick-to-bottom
- prompt-kit chat container: https://prompt-kit.com/docs/chat-container
- Shimmer con AI Elements: https://developer.chrome.com/blog/prompt-ui-ai-elements-with-vercel-ai
- Motion vs GSAP: https://motion.dev/docs/gsap-vs-motion
