# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Todo el proyecto está en **español**: variables, funciones, tipos, nombres de archivo, comentarios y copy. Un `Documento` no es un `Document`. Mantén esa convención en cualquier código nuevo.

## Comandos

```bash
npm run dev          # Vite dev server → http://localhost:5173
npm run typecheck    # tsc -b  ← ÚNICA verificación del repositorio
npm run build        # tsc -b && vite build           (app en la raíz del dominio)
npm run build:umbral  # VITE_BASE_URL=/Umbral/ vite build (app en subcarpeta)
npm run preview      # sirve dist/
```

No hay pruebas automatizadas ni linter configurado. **Antes de dar por terminado cualquier cambio, ejecuta `npm run typecheck`**: `tsconfig.app.json` activa `noUnusedLocals`, `noUnusedParameters` y `verbatimModuleSyntax` (los tipos se importan con `import type`, o la compilación falla). Requiere Node `^20.19.0 || >=22.12.0`.

No existe alias `@/` (pese al comentario de `src/components/ui/index.ts`): todos los imports son relativos.

## Arquitectura

Este front es la capa 1 del laboratorio de agentes; el backend vive en `../backend` (FastAPI + Claude Agent SDK). El `README.md` documenta el protocolo del chat, el despliegue y las convenciones de producto. Lo que sigue es solo el mapa mental que cuesta reconstruir leyendo archivos sueltos.

### Una sola frontera: `src/services/`

**Lo real del proyecto es el login (`auth.service.ts`) y el chat (`chat.service.ts`).** Los dos hablan con el backend por `api.ts`, que es el ÚNICO archivo que hace `fetch`: pone el token, usa la URL base `/api` (Vite la reenvía al puerto 8000) y avisa a `AuthContext` cuando el backend responde 401. Todo lo demás (corpus, guías, auditoría, tablero, lista de conversaciones) está simulado en el frontend sobre `simulacion.ts`, que aporta latencia artificial de 200–600 ms, persistencia en `localStorage` bajo el prefijo `aurora-aldia:` y generación de ids.

**El rol lo decide el backend.** El front solo muestra u oculta según `useAuth()`; no existe forma de elegir o cambiar de rol desde el navegador, y no hay que reintroducirla. La identidad nunca viaja en el cuerpo de una petición: sale del token.

La regla que sostiene el diseño: **ninguna pantalla toca `localStorage` ni datos semilla directamente**. Siempre va por un servicio que devuelve promesas, para que el día que exista backend se cambie el servicio y no la pantalla. Al añadir una capacidad, el servicio es el primer archivo, no el último.

Dos estilos de export conviven en `services/`: objeto namespace (`authService`, `adminService`, `guidesService`, `tableroService`) y funciones sueltas (`corpus.service.ts`). Sigue el estilo del archivo que toques.

La latencia artificial no es un descuido: sin ella los estados de carga nunca se ven y se construyen pantallas que no los contemplan.

### El chat: tres capas y una precedencia

```
Chat.tsx / AdminLaboratorio.tsx
  └─ useStreamingChat            (acumula fragmentos y los vuelca 1× por frame con rAF;
     │                            aborta la transmisión anterior y en desmontaje;
     │                            traduce cada actividad a una frase con lib/actividad.ts)
     └─ chat.service.enviarMensaje
          ├─ POST /api/chat → SSE del backend   (por defecto)
          └─ simulador local                    (VITE_CHAT_SIMULADO=1)
             Los dos emiten los MISMOS eventos y pasan por la misma función `aplicar`.
```

- El protocolo son cinco eventos SSE: `inicio`, `texto`, `actividad`, `fin`, `error`. Están tipados en `src/types/index.ts` y deben coincidir con `backend/app/protocolo.py`: **si cambias un lado, cambia el otro.**
- `enviarMensaje()` **nunca lanza**: siempre resuelve un `ResultadoEnvio` (`completo | cancelado | error`), con `resumen` (costo y tokens medidos) cuando llegó el `fin`.
- El historial **no** se manda: el backend reanuda la sesión del agente por `conversacionId`.
- El chat de estudiantes **nunca muestra rutas ni nombres de herramientas**: `lib/actividad.ts` los traduce ("Leyendo el resumen de la Clase 12…"). El Laboratorio sí muestra el dato técnico, porque es una pantalla para medir.
- `AdminLaboratorio` **duplica a propósito** la mecánica de streaming en vez de usar `useStreamingChat`, porque necesita `parametros`, el detalle de cada actividad y el consumo. Un cambio en el protocolo hay que aplicarlo en los dos sitios.
- Escotilla de desarrollo: con `VITE_CHAT_SIMULADO=1`, escribir **"forzar error"** provoca el estado de error de la pantalla.

### Contextos: el orden importa

En `App.tsx`, de fuera hacia dentro: `PreferenciasProvider` → `AuthProvider` → `ToastProvider` → `ChatProvider`.

- `PreferenciasProvider` va primero porque escribe atributos `data-*` en `<html>` (densidad, tamaño de texto, contraste, movimiento) y deben estar puestos antes del primer pintado.
- `ChatProvider` cuelga por encima de las rutas —no dentro de `/chat`— para que el historial no se recargue al ir a una guía y volver. El historial persiste pero **caduca a las 12 h**, y las semillas de `data/conversaciones.ts` recalculan sus fechas hacia atrás desde "ahora" en cada arranque para que la demostración siempre tenga los cuatro grupos temporales y los dos modos.

`RutaProtegida` guarda sesión y rol; con `soloAdmin`, un usuario sin permiso **ve una explicación**, no una redirección muda.

### El doble prefijo del despliegue

`VITE_BASE_URL` se declara **una sola vez** y alimenta dos mitades que siempre van juntas:

| Mitad | Dónde | Si falta |
|---|---|---|
| Archivos | `base` en `vite.config.ts` | página en blanco |
| Rutas | `basename` del `BrowserRouter`, leído de `import.meta.env.BASE_URL` | toda la app cae en el 404 |

Las imágenes que el markdown referencia como `/guias/…` las reubica `resolverRutaPublica` en `src/components/Markdown.tsx`, porque el empaquetador no puede reescribir una ruta que vive dentro de una cadena de texto. Cambiar de carpeta obliga a recompilar; no es configuración de servidor.

### Dónde vive el estilo

- `src/index.css` — tokens de color, tipografía y sombras. **Todo estilo global va dentro de `@layer base`** o le gana en silencio a las utilidades de Tailwind. Las excepciones (zoom por `data-texto`, densidad de tablas) están fuera a propósito y comentadas.
- `tailwind.config.js` — escala tipográfica **cerrada** (12/13/14/15/22/28/40 + `display` fluido; no se inventan tamaños intermedios), radios nombrados (`celda`/`control`/`tarjeta`/`modal`/`pastilla`, anidados en ese orden) y elevación en tres capas.
- `src/lib/motion.ts` — springs y duraciones desde una fuente única. Nada de transiciones ad-hoc en un componente.
- `src/components/ui/` — sistema de diseño; se importa desde su `index.ts`. **Si un componente no aparece en `/_dev/sistema-diseno`, no existe en el sistema.**

El rojo de marca `#E00034` (`bg-accent`, y `text-accent-fg` #A30026 como tinta, por contraste) **nunca significa riesgo**: el riesgo usa `--status-red` (#8F2E22). Un solo botón primario por pantalla. Solo tema claro — no reintroduzcas `prefers-color-scheme` sin que te lo pidan.

`.claude/skills/apple-feel-design/SKILL.md` es el manual de diseño del proyecto y su checklist final. Léelo antes de construir o revisar cualquier pantalla TSX. De ahí sale la regla de **los cinco estados obligatorios** (vacío, cargando, parcial, error, ideal): ninguna vista está terminada si solo existe el caso ideal, y los skeletons llevan la altura real del contenido para que el layout no brinque.

### Copy

`src/copy/index.ts` centraliza las cadenas por pantalla. Deuda deliberada conocida: parte del copy sigue en objetos `TEXTO` locales dentro de pantallas y componentes, marcados con el comentario *"Cadenas que no existen todavía en src/copy"*. Al tocar uno de esos archivos no hace falta migrarlo, pero tampoco añadas cadenas nuevas fuera de `copy/` sin motivo.

## Trampas conocidas

- **`DataTable` no soporta ordenamiento nativo.** `TablaImpacto` (tablero) resuelve el clic por delegación sobre el `<th>` **usando su posición**, contra un arreglo `CAMPOS` paralelo a las columnas, y escribe `aria-sort` sobre el DOM ya renderizado. Si reordenas columnas, reordena `CAMPOS`.
- **`tablero.service.ts` no entrega `ahorroCosto`** por fila aunque el análisis lo tenga; `TablaImpacto` lo lee de forma opcional y la columna encenderá sola cuando se agregue.
- **Los PDF de la semilla no traen archivo** (no hay binarios en el repo): el visor muestra su estado de error a propósito.
- **Todo lo `VITE_*` se hornea en el bundle** al compilar: nunca pongas un secreto en una variable `VITE_`.
- **`chat.service.ts` se reescribió para quitar un carácter NUL** que tenía el original (un centinela `\0` del parser de n8n). Si una herramienta se niega a editar un archivo "con bytes nulos", búscalo con `tr -dc '\000' < archivo | wc -c`.
- La base de conocimiento y la temperatura del Laboratorio **se ignoran en el backend**; los controles siguen en pantalla.
