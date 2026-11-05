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

**Casi todo es real.** `api.ts` es el ÚNICO archivo que hace `fetch`: pone el token, usa la URL base `/api` (Vite la reenvía al puerto 8000, o a `VITE_API_PROXY`) y avisa a `AuthContext` cuando el backend responde 401. Sobre él:

| Servicio | Backend | Pantallas |
|---|---|---|
| `auth.service.ts` | `/api/auth/*` | Login, sesión |
| `chat.service.ts` | `POST /api/chat` (SSE) | Chat, Laboratorio |
| `auditoria.service.ts` | `GET /api/admin/consultas`, `/consultas/{id}`, `/resumen` | Auditoría (`/admin/conversaciones`), Tablero |
| `corpus.service.ts` | `GET /api/admin/corpus`, `/corpus/archivo?ruta=` · `GET /api/archivos?ruta=` (origen `chat`) | Corpus · tarjetas de archivo del chat |
| `modelos.service.ts` | `GET /api/modelos` | Laboratorio |

`/api/admin/*` exige el permiso **`auditoria`** (solo el rol `admin`). Los binarios del corpus (PDF) se piden con `pedir()` y se pasan como Blob: un `src`/`href` directo no lleva el header Authorization.

Lo único simulado es la **lista de conversaciones** del panel del chat (`ChatContext` + `data/conversaciones.ts`), persistida con `simulacion.ts` en `localStorage` bajo el prefijo `umbral:`.

**El rol lo decide el backend.** El front solo muestra u oculta según `useAuth()`; no existe forma de elegir o cambiar de rol desde el navegador, y no hay que reintroducirla. La identidad nunca viaja en el cuerpo de una petición: sale del token.

La regla que sostiene el diseño: **ninguna pantalla hace `fetch` ni toca `localStorage` o datos semilla directamente**. Siempre va por un servicio que devuelve promesas. Al añadir una capacidad, el servicio es el primer archivo, no el último.

Dos estilos de export conviven en `services/`: objeto namespace (`authService`, `auditoriaService`) y funciones sueltas (`corpus.service.ts`). Sigue el estilo del archivo que toques.

Corpus es **solo lectura** a propósito: los archivos los mantiene el agente en su carpeta. No reintroduzcas subir/borrar desde la web.

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

- El protocolo son ocho eventos SSE: `inicio`, `pensamiento`, `texto`, `actividad`, `archivo`, `reintento`, `fin`, `error`. Están tipados en `src/types/index.ts` y deben coincidir con `backend/app/protocolo.py`: **si cambias un lado, cambia el otro.**
- **Resiliencia en tres capas.** (1) El CLI reintenta las llamadas a Anthropic (hasta `REINTENTOS_API` en `motor.py`) y cada intento llega como `reintento {capa: 'api'}`. (2) El backend repite la consulta entera si el agente muere o pierde la conexión, **solo si aún no salió texto ni archivos** (`reintento {capa: 'agente'}`: el front descarta los pasos del intento roto). (3) `chat.service` reintenta ALCANZAR al servidor (red caída, 5xx) antes de que empiece la respuesta (`capa: 'servidor'`); a media respuesta nunca, porque duplicaría el gasto. Un stream que cierra sin `fin` ni `error` es un error ("se cortó"), no una respuesta completa. `error.detalle` trae la causa técnica solo para quien ve lo interno.
- **La consulta vive en el servidor, no en la conexión** (`backend/app/trabajos.py`). `POST /api/chat` crea un TRABAJO y la respuesta SSE solo lo observa; el evento `inicio` trae `trabajoId`. Cambiar de pantalla, recargar o cerrar la pestaña **no** cancela: `ChatContext` guarda `trabajoPendiente` en la conversación, la conexión en vivo SIGUE a la conversación abierta (`seguir` → `GET /api/trabajos/{id}/eventos`, repite desde el principio), y un sondeo (`GET /api/trabajos`) recoge las respuestas de los trabajos que terminaron sin nadie mirando. **Detener** es explícito (`POST /api/trabajos/{id}/detener`, en `useStreamingChat.detener`); `soltar` deja de mirar sin detener. El Laboratorio sí detiene al salir (mide una respuesta a la vez). Al terminar una tarea de más de 15 s que no estás viendo: sonido + toast, o notificación del sistema si la pestaña está oculta (`lib/avisos.ts`; el permiso se pide al enviar en un modo distinto de consulta).
- **Un solo `LayoutApp`** para todas las rutas: decide por la ruta si la pantalla maneja su propio scroll (el chat). Con dos layouts hermanos, la cabecera se destruía al navegar y parpadeaba.
- `enviarMensaje()` **nunca lanza**: siempre resuelve un `ResultadoEnvio` (`completo | cancelado | error`), con `resumen` (costo y tokens medidos) cuando llegó el `fin`.
- El historial **no** se manda: el backend reanuda la sesión del agente por `conversacionId`.
- El chat de estudiantes **nunca muestra rutas ni nombres de herramientas**: `lib/actividad.ts` los traduce ("Leyendo el resumen de la Clase 12…"). El Laboratorio sí muestra el dato técnico, porque es una pantalla para medir.
- `AdminLaboratorio` **duplica a propósito** la mecánica de streaming en vez de usar `useStreamingChat`, porque necesita `parametros`, el detalle de cada actividad y el consumo. Un cambio en el protocolo hay que aplicarlo en los dos sitios.
- Escotilla de desarrollo: con `VITE_CHAT_SIMULADO=1`, escribir **"forzar error"** provoca el estado de error de la pantalla.

### Contextos: el orden importa

En `App.tsx`, de fuera hacia dentro: `PreferenciasProvider` → `AuthProvider` → `ToastProvider` → `ChatProvider`.

- `PreferenciasProvider` va primero porque escribe atributos `data-*` en `<html>` (densidad, tamaño de texto, contraste, movimiento) y deben estar puestos antes del primer pintado.
- `ChatProvider` cuelga por encima de las rutas —no dentro de `/chat`— para que el historial no se recargue al ir a otra pantalla y volver. El historial persiste pero **caduca a las 12 h**, y las semillas de `data/conversaciones.ts` recalculan sus fechas hacia atrás desde "ahora" en cada arranque para que la demostración siempre tenga los cuatro grupos temporales y los dos modos.

`RutaProtegida` guarda sesión y rol; con `soloAdmin`, un usuario sin permiso **ve una explicación**, no una redirección muda.

`LimiteError` (`components/LimiteError.tsx`, de clase) envuelve las rutas en `App.tsx` y, en `LayoutApp`, el contenido de cada pantalla con `key` = ruta: un error de render deja la cabecera viva y muestra "Reintentar" / "Recargar la página". En el chat se usa `claveReinicio` en vez de `key` para no desmontarlo al pasar de `/chat` a `/chat/:id`.

`PreferenciasContext` valida lo que lee de `localStorage` (`useLocalStorage` acepta un validador): un valor fuera de la lista cae al de fábrica.

### El doble prefijo del despliegue

`VITE_BASE_URL` se declara **una sola vez** y alimenta dos mitades que siempre van juntas:

| Mitad | Dónde | Si falta |
|---|---|---|
| Archivos | `base` en `vite.config.ts` | página en blanco |
| Rutas | `basename` del `BrowserRouter`, leído de `import.meta.env.BASE_URL` | toda la app cae en el 404 |

Las imágenes que el markdown referencia con ruta absoluta (`/…`) las reubica `resolverRutaPublica` en `src/components/Markdown.tsx`, porque el empaquetador no puede reescribir una ruta que vive dentro de una cadena de texto. Cambiar de carpeta obliga a recompilar; no es configuración de servidor.

### Dónde vive el estilo

- `src/index.css` — tokens de color, tipografía y sombras. **Todo estilo global va dentro de `@layer base`** o le gana en silencio a las utilidades de Tailwind. Las excepciones (zoom por `data-texto`, densidad de tablas) están fuera a propósito y comentadas.
- `tailwind.config.js` — escala tipográfica **cerrada** (12/13/14/15/22/28/40 + `display` fluido; no se inventan tamaños intermedios) con tres excepciones documentadas: lectura 16/26 y 18/26 y el saludo 32/40 del chat; radios nombrados y anidados (`xs`/`celda`/`control`/`menu`/`burbuja`/`tarjeta`/`composer`/`modal`/`pastilla`); elevación en tres capas más las sombras con anillo (`anillo`, `composer`, `composer-foco`, `menu`: el borde es la primera capa de la sombra, nunca `border` + sombra), y el color `tinta` para tintes con opacidad (`bg-tinta/[.05]`; `bg-text-1/10` no genera nada). La fuente de verdad del rediseño es `../docs/especificacion-diseno.md`.
- `src/lib/motion.ts` — springs y duraciones desde una fuente única. Nada de transiciones ad-hoc en un componente.
- `src/components/ui/` — sistema de diseño; se importa desde su `index.ts`. **Si un componente no aparece en `/_dev/sistema-diseno`, no existe en el sistema.**

El azul de marca `#2F5FE4` (`bg-accent`, y `text-accent-fg` #1D41A3 como tinta, por contraste) **nunca significa estatus**: el riesgo usa `--status-red` (#8F2E22) y la información `--status-blue`, un petróleo (#17707F) distinto del cobalto. Un solo botón primario por pantalla. Solo tema claro — no reintroduzcas `prefers-color-scheme` sin que te lo pidan.

`.claude/skills/apple-feel-design/SKILL.md` es el manual de diseño del proyecto y su checklist final. Léelo antes de construir o revisar cualquier pantalla TSX. De ahí sale la regla de **los cinco estados obligatorios** (vacío, cargando, parcial, error, ideal): ninguna vista está terminada si solo existe el caso ideal, y los skeletons llevan la altura real del contenido para que el layout no brinque.

### Copy

`src/copy/index.ts` centraliza las cadenas por pantalla. Deuda deliberada conocida: parte del copy sigue en objetos `TEXTO` locales dentro de pantallas y componentes, marcados con el comentario *"Cadenas que no existen todavía en src/copy"*. Al tocar uno de esos archivos no hace falta migrarlo, pero tampoco añadas cadenas nuevas fuera de `copy/` sin motivo.

## Trampas conocidas

- **`DataTable` no soporta ordenamiento nativo.** El backend entrega las filas ya ordenadas.
- **El HTML de los apuntes va en `<iframe sandbox="" srcdoc>`**: sin scripts ni mismo origen (se quitan antes los `<script>` y `on*` para no ensuciar la consola). No le agregues `allow-scripts` ni `allow-same-origin`: juntos anulan el sandbox.
- **`/api/admin/corpus/archivo` sirve por lista blanca**: solo rutas que aparecen en `GET /api/admin/corpus`. Las rutas son relativas a la carpeta del agente y en NFC.
- **Todo lo `VITE_*` se hornea en el bundle** al compilar: nunca pongas un secreto en una variable `VITE_`.
- **`chat.service.ts` se reescribió para quitar un carácter NUL** que tenía el original (un centinela `\0` del parser de n8n). Si una herramienta se niega a editar un archivo "con bytes nulos", búscalo con `tr -dc '\000' < archivo | wc -c`.
- **El agente manda archivos con su herramienta `compartir_archivo`** (`backend/app/archivos.py`, servidor MCP en proceso). Solo salen las colecciones `compartible` de `backend/app/corpus.py` (apuntes, diapositivas, transcripciones); el evento `archivo` trae la ruta y la tarjeta (`components/chat/ArchivosMensaje.tsx`) la pide a `GET /api/archivos`, que vuelve a validar. El visor es el mismo `VisorArchivo` de Corpus con `origen="chat"`.
- **Citas `fuente:`** (`lib/fuentes.ts`, `components/chat/CitaFuente.tsx`). El agente cita con `[Clase 12](<fuente:ruta relativa> "frase literal")` (y `#page=N` en PDFs); lo pide `backend/app/prompts/consulta.md`. Los `<…>` son obligatorios: sin ellos remark no reconoce un enlace con espacios. react-markdown borra protocolos desconocidos, así que `Markdown.tsx` pasa un `urlTransform` que deja vivir `fuente:` (y aplica `defaultUrlTransform` a lo demás). El chip abre `VisorEmergente` (GET `/api/archivos`, que revalida la lista blanca): texto con la frase marcada (`buscarFragmento` ignora mayúsculas, acentos y espacios), PDF en su página. `estado/` se pinta como cita no clicable. La ruta nunca se muestra; solo la etiqueta.
- **Adjuntos: cualquier archivo entra; el límite lo pone el modelo** (`lib/adjuntos.ts`). Imagen → bloque `image`; PDF → `document` base64; todo lo que sea texto (html ya convertido a texto, md, csv, código) → `document` de texto; video → fotogramas como imágenes con su minuto. Audio y Office se rechazan con un mensaje que dice qué hacer. Tope total ~22 MB crudos (la API acepta 32 MB por petición y el base64 crece un tercio); el backend lo vuelve a validar en `PeticionChat`.
- La temperatura del Laboratorio **se ignora en el backend** (el Agent SDK no la expone). Ya no hay base de conocimiento que elegir: el agente busca en toda su carpeta.
