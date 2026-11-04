---
name: apple-feel-design
description: >
  Reglas de diseño "Apple-Feel" para la maqueta de Aurora al Día (Vite + React +
  TypeScript + Tailwind + Framer Motion). Léela antes de construir o revisar
  cualquier pantalla TSX del proyecto: cubre rendimiento percibido, motion y
  microinteracciones con springs, sistema visual (espaciado, tipografía,
  profundidad, accesibilidad) y los 5 estados obligatorios de cada pantalla
  (vacío, cargando, parcial, error, ideal). Úsala como checklist de calidad
  antes de dar por terminada una pantalla.
metadata: { "tags": "diseño, apple-feel, motion, framer-motion, tailwind, aurora" }
---


# Reglas de Diseño "Apple-Feel" para Sistemas Web / PWA

Manual de referencia para construir sistemas web que se sientan frescos, fluidos y pulidos.
La referencia viva de los componentes vive en la ruta `/sistema-diseno` de la app. Dividido en 4 pilares: **Rendimiento**, **Motion**, **Diseño Visual**, y **Estados & Resiliencia**.

Este manual aplica a **todas** las pantallas TSX de la maqueta de Aurora al Día.
Se heredó del sistema de SGO CUSOL, donde se escribió y se probó a lo largo de
15 pantallas; aquí se conserva la mecánica y se cambia la colorimetría. Cada pantalla nueva o modificada debe pasar por el checklist final antes de considerarse terminada.

---

## PILAR 1 — RENDIMIENTO PERCIBIDO Y REAL

### 1.1 Optimiza "tiempo a respuesta", no "tiempo total"

La gente perdona que algo tarde 2–3 s **si responde de inmediato**.

- Al hacer click/tap: **feedback en <100 ms** (cambio visual, estado "cargando", botón deshabilitado)
- Divide tareas largas en pasos: "Preparando… / Procesando… / Listo"
- Muestra progreso real o estimado si pasa de 1 s

**Regla rápida:**

| Tiempo | Percepción |
|---|---|
| <100 ms | Instantáneo |
| 100–300 ms | OK |
| >300 ms | Ya se siente lento |
| >1 s | Indicador obligatorio |

### 1.2 Trabajo pesado fuera del hilo principal

**El punto #1 para fluidez.**

- Web: Web Workers / OffscreenCanvas / requestIdleCallback (con cuidado)
- Patrón: el UI thread solo pinta + maneja input. Todo lo demás, async
- I/O y cómputo pesado nunca bloquean el render

### 1.3 Presupuestos de frame (60/120 fps)

- 60 fps → **16.7 ms por frame**
- 120 fps → **8.3 ms por frame**
- Incluye: JS/logic + layout + paint + render

Tips:
- Reduce layouts/reflows
- Virtualiza listas grandes (nunca renderices 500 filas de golpe)
- Precalcula, cachea, memoiza

### 1.4 Skeletons y placeholders

No dejes ver "nada", deja ver "algo".

- Skeleton loading (bloques grises con shimmer)
- Listas placeholder con altura real
- Imágenes con blur preview (LQIP)
- **Clave: el layout no brinca.** CLS ≈ 0 se siente premium

### 1.5 Preload inteligente

- Prefetch de la siguiente pantalla probable
- Cache de resultados frecuentes
- Warm-up de conexiones (HTTP keep-alive)
- Lazy-load de lo no crítico
- Carga primero lo visible, lo demás después

### 1.6 Optimiza p95/p99, no el promedio

- Mide p50, p95, p99 de: arranque, interacción, respuesta de API
- **El peor 5% es lo que el usuario recuerda**

### 1.7 Evita jank por GC/memoria

- No crees miles de objetos por frame en animaciones
- Reutiliza buffers/arrays
- Vigila leaks: listeners no removidos, timers, referencias globales
- Comprime imágenes; nada de assets gigantes en móvil

### 1.8 Input-first

- El input se procesa antes que todo lo demás
- Debounce/throttle para scroll, resize, search
- Búsqueda: muestra resultados anteriores + "actualizando…"
- Formularios: validación incremental, no al final

### 1.9 Instrumenta todo

**Web:** LCP, INP, CLS (Core Web Vitals), long tasks, FPS en scroll, TTI
**General:** cold/warm start, frame drops, respuesta a taps, memoria y CPU sostenidas

Lo que no se mide, no se mejora.

---

## PILAR 2 — MOTION Y MICROINTERACCIONES

### 2.1 Física, no curvas lineales

- Usa **springs** (masa, rigidez, fricción), no `ease-in-out` genérico
- Web: `spring()` de Framer Motion, o CSS `linear()` con curva de resorte
- Animaciones **interrumpibles**: si el usuario cambia de opinión a mitad, la animación redirige, no se reinicia
- Elementos arrastrables conservan velocidad/inercia al soltarse

### 2.2 Microinteracciones consistentes

- Hover/pressed states claros en todo elemento interactivo
- Animaciones cortas: **150–250 ms**
- Misma curva, misma duración en toda la app
- Sonidos/haptics si aplica
- El cerebro ama patrones: consistencia > creatividad

### 2.3 Continuidad espacial

Las transiciones explican de dónde viene y a dónde va cada cosa:

- Shared element transitions (View Transitions API)
- Los modales emergen desde donde los invocaste
- "Atrás" deshace visualmente la transición de entrada

### 2.4 Respeta reduced motion

- `prefers-reduced-motion`: reemplaza movimiento con transiciones de opacidad
- Nunca elimines el feedback, solo el desplazamiento

---

## PILAR 3 — DISEÑO VISUAL

### 3.1 Sistema de espaciado estricto

- Escala fija: **4 / 8 / 12 / 16 / 24 / 32 / 48**
- Nunca valores arbitrarios (nada de `margin: 13px`)

### 3.2 Tipografía disciplinada

- Máximo 2 familias tipográficas
- 4–5 tamaños, 2–3 pesos
- Jerarquía por peso y tamaño, no por color
- `line-height` 1.4–1.6 en cuerpo
- `font-variant-numeric: tabular-nums` en cifras que cambian

### 3.3 Profundidad y materiales

- Sombras suaves en capas: 2–3 sombras sutiles superpuestas, nunca una sola dura
- `backdrop-filter: blur()` para superficies flotantes (vidrio esmerilado)
- Radios de esquina consistentes y **anidados**: radio interior = radio exterior − padding

### 3.4 Dark mode de verdad

> **NO APLICA EN ESTE PROYECTO.** Aurora al Día es **solo tema claro**: no se
> implementa modo oscuro ni se responde a `prefers-color-scheme`. No
> reintroducir un bloque `@media (prefers-color-scheme: dark)` en
> `src/index.css` sin que el usuario lo pida explícitamente.

- Fondo oscuro ≠ #000: grises muy oscuros con elevación por luminosidad
- Las sombras no funcionan en oscuro → elevación con superficies más claras
- Desatura los colores en dark mode (los saturados vibran)

### 3.5 Accesibilidad = pulido

- Targets táctiles ≥ **44×44 px**
- Contraste mínimo AA (4.5:1 en texto)
- Focus visible y bien diseñado. Nunca `outline: none` sin reemplazo

### 3.6 El rojo de marca no es un color más

Restricción específica de este proyecto, encima del manual general:

- **Relleno → `bg-accent` (#E00034). Tinta → `text-accent-fg` (#A30026).**
  El rojo institucional sobre blanco no alcanza 4.5:1 como texto; como relleno
  con texto blanco encima da 4.98:1 y sí cumple.
- **Un solo botón `variant="primary"` por pantalla.** Si dos rojos compiten,
  ninguno es la acción principal.
- **El riesgo NO usa el rojo de marca.** `--status-red` es un rojo terroso
  aparte (#8F2E22), deliberadamente apagado: si peligro y acción primaria
  compartieran color, el mismo rojo significaría "haz clic aquí" y "cuidado con
  esto" en la misma pantalla.
- **La píldora completa (`rounded-pastilla`) se reserva a `StatusPill`.** Es lo
  que la hace reconocible como estatus sin leerla.

### 3.7 Microcopy humano

- Verbos en botones: "Guardar cambios", no "OK"
- Errores que dicen qué pasó y qué hacer: "No pudimos guardar. Revisa tu conexión e intenta de nuevo"
- Nada de jerga técnica visible al usuario
- Acciones destructivas: el botón peligroso nombra la acción ("Eliminar proyecto", no "Sí")

---

## PILAR 4 — ESTADOS Y RESILIENCIA

### 4.1 Los 5 estados de cada pantalla

Ninguna vista está terminada si solo existe el happy path:

1. **Vacío** — primera vez, sin datos. Con acción sugerida, no solo "No hay datos"
2. **Cargando** — skeleton con layout real
3. **Parcial** — algunos datos listos, otros cargando
4. **Error** — reintento en un tap, mensaje humano, nunca stack trace
5. **Ideal** — con datos

### 4.2 Optimistic UI

- El cambio se aplica localmente **al instante** (like, guardar, marcar)
- Sincroniza en background
- Si falla: revierte con animación + toast discreto

### 4.3 PWA: offline-first

- Service Worker con **stale-while-revalidate**: muestra cache al instante, actualiza en silencio
- **Cola de acciones offline**: lo hecho sin conexión se guarda y sincroniza al volver
- Indicador de conexión discreto (no banner rojo gigante)
- Manifest completo: splash screen, iconos maskable, `theme-color` acorde a la UI
- Sin "flash blanco" al abrir: fondo del splash = fondo de la app

---

## CHECKLIST FINAL "APPLE-FEEL"

### Rendimiento
- [ ] Feedback visual inmediato (<100 ms)
- [ ] UI nunca se bloquea por cómputo/I/O
- [ ] Scroll fluido (virtualización en listas)
- [ ] Skeletons + layout estable (CLS ≈ 0)
- [ ] Cache/prefetch de lo común
- [ ] p95/p99 bajo control
- [ ] Sin memory leaks ni pausas de GC visibles
- [ ] Core Web Vitals instrumentados

### Motion
- [ ] Springs interrumpibles, no ease lineal
- [ ] Animaciones 150–250 ms, misma curva en toda la app
- [ ] View Transitions / continuidad espacial
- [ ] `prefers-reduced-motion` respetado

### Visual
- [ ] Escala de espaciado fija (4/8/12/16/24/32/48)
- [ ] Tipografía: 2 familias, 4-5 tamaños, jerarquía por peso
- [ ] Sombras en capas + radios anidados
- [ ] ~~Dark mode con elevación por luminosidad~~ — fuera de alcance (solo tema claro)
- [ ] Targets 44px + contraste AA + focus visible
- [ ] Un solo botón rojo por pantalla; relleno bg-accent / tinta text-accent-fg
- [ ] Riesgo con --status-red, nunca con el rojo de marca
- [ ] Microcopy humano en botones y errores

### Estados
- [ ] 5 estados diseñados por pantalla
- [ ] Optimistic UI con rollback
- [ ] Offline-first con cola de sincronización
- [ ] Splash sin flash blanco
