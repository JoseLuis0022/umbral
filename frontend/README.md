# Umbral

Frontend del **laboratorio de agentes**: la cara web del agente de estudio de
*Procesamiento Digital de Imágenes*. Nació como la maqueta "Umbral" (un asistente
interno universitario) y conserva su sistema de diseño y sus pantallas; el chat y
el acceso ahora hablan con un backend real (`../backend`: FastAPI + Claude Agent
SDK).

**Qué es real hoy:** el inicio de sesión con roles y el chat con el agente. El
resto de pantallas (guías, corpus, auditoría, tablero, boletines) sigue
simulado en el frontend. La sección
[Qué es real y qué está simulado](#qué-es-real-y-qué-está-simulado) es lo
primero que conviene leer.

Stack: React 18 + TypeScript + Vite 7 + Tailwind 3 + Framer Motion.

---

## Levantar el proyecto

Requiere Node `^20.19.0 || >=22.12.0` (lo exige Vite 7).

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc -b
npm run build      # tsc -b && vite build            → para la raíz de un dominio
npm run build:umbral  # compila para /Umbral/            → ver "Publicar"
npm run preview    # sirve el build de dist/
```

El login y el chat necesitan el backend corriendo en el puerto 8000 (ver
`../README.md`). Vite reenvía `/api` a él (`server.proxy` en `vite.config.ts`),
así que front y back se ven como el mismo origen y no hace falta CORS.

---

## Configuración

Todo es opcional y está documentado en **`.env.example`** (cópialo a
`.env.local`). Ningún valor es secreto: las variables `VITE_` terminan dentro
del bundle que descarga el navegador.

| Variable | Por defecto | Qué hace |
|---|---|---|
| `VITE_API_URL` | `/api` | URL base de la API. |
| `VITE_API_PROXY` | `http://localhost:8000` | A dónde reenvía Vite `/api` en desarrollo. |
| `VITE_CHAT_SIMULADO` | vacío | `1` = el chat no llama al backend; un simulador local emite los mismos eventos. El login sí necesita al backend. |
| `VITE_BASE_URL` | `/` | Prefijo público (ver "Publicar"). |

### Contrato del chat

`POST /api/chat`, con `Authorization: Bearer <token>`:

```json
{ "conversacionId": "c-1", "mensaje": "¿qué es la mediana?",
  "perfil": "consulta", "parametros": { } }
```

- **Ni el usuario ni el historial viajan en el cuerpo.** Quién eres lo dice el
  token; la memoria la guarda el backend, que reanuda la sesión del agente por
  `conversacionId`.
- `parametros` (modelo, nivel de pensamiento, system prompt) solo lo manda el
  **Laboratorio**, y el backend solo lo acepta de un admin.

La respuesta es **SSE** con cinco eventos, tipados igual en
`src/types/index.ts` y en `backend/app/protocolo.py`:

| Evento | Datos | Para qué |
|---|---|---|
| `inicio` | `conversacionId`, `perfil`, `motor` | Arranca la respuesta. |
| `texto` | `delta` | Un pedazo de la respuesta, en streaming. |
| `actividad` | `id`, `clase`, `nombre`, `detalle`, `fase`, `ok`, `dentroDe` | Una herramienta o subagente empezó o terminó. El chat lo traduce a frases ("Leyendo el resumen de la Clase 12…"); el Laboratorio lo muestra tal cual. |
| `fin` | `costoUsd`, `vueltas`, `duracionMs`, `tokens`, `modelo` | Costo y tokens **medidos** por la API. |
| `error` | `codigo`, `mensaje` | El agente falló o llegó a un límite. |

Las líneas que empiezan con `:` son latidos que el backend manda cada 10 s
mientras el agente piensa; si pasan 35 s sin recibir nada, el chat aborta con el
mensaje de timeout. Los errores HTTP antes del stream (401, 403, 409, 429) traen
el mensaje del backend. `enviarMensaje()` nunca lanza: siempre resuelve con un
`ResultadoEnvio` (`completo` | `cancelado` | `error`).

Todo esto está documentado con más detalle en la cabecera de
`src/services/chat.service.ts`.

---

## Publicar

El resultado de `npm run build` es una carpeta de archivos estáticos: no hay
servidor que instalar. Solo dos cosas hay que acertar.

### 1. Dónde vive la app

Si cuelga de la raíz del dominio (`https://ejemplo.mx/`), no hay nada que hacer.
Si vive dentro de una subcarpeta (`https://tu-dominio.com/Umbral/`), hay que
decírselo al compilar, porque cambia de sitio TODO: el `<script>` del index, el
CSS, las fuentes, las capturas de las guías.

```bash
npm run build:umbral          # equivale a VITE_BASE_URL=/Umbral/ npm run build
```

`VITE_BASE_URL` alimenta las dos mitades del problema, que siempre van juntas:

| Mitad | Dónde | Qué pasa si falta |
|---|---|---|
| Prefijo de los **archivos** | `base` en `vite.config.ts` | El navegador pide `/assets/index.js` en la raíz del dominio, fuera de la carpeta: **página en blanco**. |
| Prefijo de las **rutas** | `basename` del `BrowserRouter` en `App.tsx`, leído de `import.meta.env.BASE_URL` | El enrutador compara contra `/chat` cuando la dirección real es `/Umbral/chat`: **toda la app cae en el 404**. |

Se declara una sola vez para que no puedan desincronizarse. Las imágenes que el
markdown referencia como `/guias/…` las reubica `resolverRutaPublica` en
`src/components/Markdown.tsx`, porque el empaquetador no puede reescribir una
ruta que vive dentro de una cadena de texto.

Es una decisión de **compilación**, no de servidor: cambiar la carpeta obliga a
volver a compilar.

### 2. El rewrite de una sola página

`/al-dia` y `/admin/corpus` no son archivos: son rutas que resuelve el
navegador. Sin rewrite, entrar directo o recargar en cualquier pantalla que no
sea la de entrada devuelve un 404 del servidor.

- **Netlify / Cloudflare Pages** — `public/_redirects`, ya incluido.
- **Apache** — un `.htaccess` con `RewriteBase` y el fallback al index.
- **Vercel** — `vercel.json`, ya incluido.
- **nginx** — `try_files $uri $uri/ /Umbral/index.html;`

### Front y back en el mismo dominio

El front llama a `/api` con ruta relativa. En el VPS, el reverse proxy tiene
que servir el `dist/` y reenviar `/api` al backend bajo el mismo dominio; si los
separas en dominios distintos, el backend necesitaría CORS.

---

## Qué es real y qué está simulado

**Real:** el inicio de sesión (`auth.service.ts`) y el chat
(`chat.service.ts`). Los dos hablan con el backend por `src/services/api.ts`,
que guarda el token y cierra la sesión en pantalla si el backend responde 401.

**Simulado:** conversaciones guardadas, corpus, documentos, guías, auditoría y
métricas del tablero. Los servicios simulados comparten tres reglas
(`src/services/simulacion.ts`):

- **Latencia artificial de 200–600 ms**, a propósito. Sin ella los estados de
  carga nunca se ven y se acaban construyendo pantallas que no los contemplan.
- **Persistencia en `localStorage`** bajo el prefijo `umbral:`. Lo que
  cambias sobrevive al refresh. *Ajustes → Restablecer datos de demostración*
  borra todas esas claves y devuelve la app a su semilla.
- **La pantalla nunca toca `localStorage`**: siempre va por el servicio, que
  devuelve promesas. El día que haya backend se cambia el servicio, no la
  pantalla.

Matices que conviene conocer:

- **Autenticación**: la verifica el backend y el rol lo decide él. La copia de
  la sesión en `localStorage` es solo para pintar sin esperar; al abrir la app se
  valida contra `GET /api/auth/yo`. El front **muestra u oculta** según el rol,
  pero quien **niega** es el backend.
- **Conversaciones**: el historial persiste pero **caduca a las 12 horas**. Las
  semillas calculan sus fechas hacia atrás desde "ahora" en cada arranque para
  que siempre haya casos de los cuatro grupos (Hoy / Ayer / Últimos 7 días /
  Anteriores) y de los dos modos (activa y solo lectura).
- **Guías**: no se guarda el catálogo, solo **parches** (`guias-ediciones`,
  `guias-nuevas`, `guias-borradas`, `guias-votos`). Así, al corregir una
  redacción en `data/guias.ts`, quien ya usó la app ve el arreglo en vez de
  quedarse congelado en la versión vieja.
- **Corpus**: la subida y el indexado son una simulación con progreso real de
  barra, y **uno de cada seis archivos falla a propósito** para que el estado de
  error sea alcanzable.
- **Auditoría y tablero** leen la **misma** semilla que el chat
  (`data/conversaciones.ts`). No hay una tabla de métricas aparte: un tablero
  que no cuadra con su propio detalle no se vuelve a abrir.

> Escotilla de desarrollo: con `VITE_CHAT_SIMULADO=1`, escribir **"forzar
> error"** en el chat provoca el estado de error de la pantalla sin desconectar
> la red.

---

## Pantallas

| Ruta | Qué es |
|---|---|
| `/login` | Acceso con correo y contraseña, verificados por el backend. |
| `/chat`, `/chat/:conversacionId` | El asistente. Una sola pantalla sirve las dos rutas; el panel de historial vive aquí (no en el shell) y en móvil se vuelve cajón. Las sesiones pasan a solo lectura cinco horas después del último mensaje. |
| `/al-dia` | Galería de guías, filtrable por categoría y ordenable por útiles o recientes. |
| `/al-dia/:guiaId` | Detalle de una guía: requisitos, pasos, "si algo falla" y un botón que abre el chat con la pregunta ya escrita. |
| `/ajustes` | Densidad, tamaño de tipografía y *Restablecer datos de demostración*. |
| `/perfil` | Datos de la cuenta, su rol y los modos del agente que puede usar. Solo lectura. |
| `/_dev/sistema-diseno` | Referencia viva del sistema de diseño. Fuera del shell y **sin sesión**: es documentación del equipo, no una pantalla de producto. |

Solo para **rol administrador** (un usuario sin el rol no es redirigido en
silencio: ve una explicación de por qué no puede entrar):

| Ruta | Qué es |
|---|---|
| `/admin/tablero` | Tablero directivo: uso, horas y pesos ahorrados, riesgo por área, y el detalle conversación por conversación con exportación a CSV. |
| `/admin/corpus` | Bases de conocimiento: system prompt por corpus, subida de `.md`/`.pdf` (hasta 10 MB) con indexado simulado y visor de documento. |
| `/admin/conversaciones` | Auditoría: todas las conversaciones de la comunidad, con filtros por persona, fecha y texto, y el resumen ejecutivo de cada una. Solo lectura. |
| `/admin/al-dia` | Boletines: aquí se redacta, publica, edita y restaura lo que la comunidad lee en *Al día*. |
| `/admin/laboratorio` | Modo desarrollador del agente: conversación de prueba con streaming real, modelo de Claude, nivel de pensamiento y system prompt, más el recorrido de herramientas y el **costo y los tokens medidos** de cada respuesta. El hilo no se guarda ni entra a la auditoría. La temperatura y la base de conocimiento se ignoran en el backend. |

`/` redirige a `/chat`.

---

## Cuentas y roles

Las cuentas se crean en el backend, desde la terminal
(`backend/app/cli_usuarios.py`; ver `../README.md`). No hay atajos para "entrar
como" otro perfil ni para cambiar de rol desde el menú: si el navegador pudiera
elegir tu rol, los roles no protegerían nada.

| Rol | Puede |
|---|---|
| `usuario` (Estudiante) | Preguntar en el chat (perfil `consulta`). 40 consultas al día. |
| `especialista` | Además, el perfil `generador` (procesar clases y generar apuntes). |
| `admin` | Todo, incluidas las pantallas de administración y los parámetros del Laboratorio. |

`src/data/usuarios.ts` sigue existiendo solo como semilla de las pantallas
simuladas (auditoría y tablero).

---

## Estructura

```
public/guias/          Capturas de las guías. Se referencian por ruta absoluta:
                       el markdown es una cadena, no JSX.
src/
  copy/                Todas las cadenas visibles, en un solo lugar.
  types/               Modelo de datos y protocolo del chat. Fuente única de tipos.
  data/                Semillas y contenido: usuarios, conversaciones, corpus,
                       guías y respuestas del simulador.
  services/            Frontera con los datos. `api.ts` habla con el backend
                       (lo usan `auth.service.ts` y `chat.service.ts`);
                       `simulacion.ts` da latencia y persistencia al resto.
  context/             Sesión (Auth), historial de chat (Chat) y preferencias
                       de interfaz (Preferencias).
  hooks/               `useStreamingChat` (streaming del chat de la comunidad)
                       y `useLocalStorage`.
  lib/                 Utilidades transversales: motion, fechas, estatus→color,
                       transición de ruta, `cn`.
  layouts/             `LayoutApp`: cabecera fija y contenido. No hay sidebar
                       global a propósito.
  components/ui/       Componentes del sistema de diseño. Importar desde aquí.
  components/shell/    Cabecera: menú de usuario, navegación de administración.
  components/{chat,guias,ajustes,admin}/   Piezas por dominio.
  pages/               Una pantalla por ruta.
  index.css            Tokens de color, tipografía y sombras. Cambiar aquí
                       repinta la app entera.
tailwind.config.js     Escala tipográfica, radios, elevación, paleta de marca.
.claude/skills/apple-feel-design/SKILL.md   El manual de diseño del proyecto.
```

---

## Convenciones

Son deliberadas y conviene respetarlas.

- **Español en todo**: nombres de variables, funciones, archivos, tipos y copy.
  Un `Documento` no es un `Document`.
- **Sistema de diseño propio**, regido por la skill
  `.claude/skills/apple-feel-design/SKILL.md`. La referencia viva está en
  `/_dev/sistema-diseno`: **si un componente no aparece ahí, no existe en el
  sistema**. Toda pantalla nueva se revisa contra esa página y contra el
  checklist final de la skill antes de darse por terminada.
- **Los cinco estados de cada pantalla**: vacío, cargando, parcial, error,
  ideal. Ninguna vista está terminada si solo existe el caso ideal. Los
  skeletons llevan la altura real del contenido: el layout no brinca.
- **Escala tipográfica cerrada**: 12 / 13 / 14 / 15 / 22 / 28 / 40, más un único
  tamaño fluido (`display`) para portadas. No se inventan tamaños intermedios.
- **Una sola familia tipográfica** (Google Sans, autoalojada con fontsource —
  la app es interna y no puede colgar de una petición al CDN de Google). La
  jerarquía se construye con tamaño y peso, nunca cambiando de letra.
- **El azul de marca (#2F5FE4) nunca significa estatus.** Viste la marca y las
  acciones primarias; el riesgo usa `--status-red` (#8F2E22), un rojo terroso,
  y la información `--status-blue` (#17707F), un azul petróleo. Un mismo color
  no puede querer decir "haz clic" y "cuidado". Como relleno va `bg-accent`;
  como tinta, `text-accent-fg` (#1D41A3), más oscuro para holgura de contraste. **Un solo botón
  primario por pantalla.**
- **Solo tema claro.** No se responde a `prefers-color-scheme` ni se
  reintroduce un bloque de modo oscuro sin pedirlo.
- **Radios anidados** (modal > tarjeta > control > celda) y elevación en tres
  capas, siempre con dos sombras superpuestas. La pastilla completa se reserva
  a `StatusPill`.
- **El motion vive en `src/lib/motion.ts`.** Springs y duraciones desde una
  fuente única; nada de transiciones ad-hoc en un componente.
- **La latencia artificial de los servicios simulados es una decisión, no un
  descuido.** Un servicio instantáneo produce una app que se rompe el día que
  se conecta a un backend real.
- **El copy vive en `src/copy/index.ts`**, para poder revisar el tono de una
  pasada. Etiquetas en oración; el botón y su confirmación comparten nombre
  ("Guardar cambios" → "Cambios guardados"); los errores dicen qué pasó y qué
  hacer. Ver la deuda conocida más abajo.
- **Todo estilo global va dentro de `@layer base`** en `index.css`, o le gana
  en silencio a las utilidades de Tailwind.

---

## Estado y límites conocidos

Es una maqueta y hay cosas pendientes. Las que importan:

- **`DataTable` no tiene ordenamiento nativo.** `Column.header` es un `string` y
  el componente no expone ningún gancho de orden, así que `TablaImpacto` (en el
  tablero) resuelve el clic **por delegación sobre el `<th>`, usando su
  posición**, contra un arreglo `CAMPOS` paralelo a las columnas: si se
  reordenan las columnas hay que reordenar ese arreglo. Por lo mismo,
  `aria-sort` se escribe sobre el DOM ya renderizado. Es un parche a la espera
  de que `DataTable` acepte encabezados ordenables.
- **Parte del copy sigue en objetos `TEXTO` locales** dentro de las pantallas y
  de varios componentes, en vez de estar en `src/copy/index.ts`. Están marcados
  en el código con el comentario *"Cadenas que no existen todavía en src/copy"*.
  Es deuda deliberada, no un olvido: centralizarlas es trabajo pendiente.
- **`tablero.service.ts` no entrega `ahorroCosto`** por fila, aunque el análisis
  de la conversación sí lo tiene (la auditoría lo pinta). `TablaImpacto` lo lee
  de forma opcional para que la columna encienda sola en cuanto se agregue esa
  línea al servicio; mientras tanto muestra la cifra exacta y un "sin nivel"
  honesto en lugar de un nivel inventado.
- **Los PDF de la semilla no traen archivo** — no hay binarios en el
  repositorio—, así que el visor de PDF muestra su estado de error. Es un estado
  legítimo de la demostración, no una pantalla rota.
- **El token vive en `localStorage`.** Es lo simple para el laboratorio; si un
  día hubiera un XSS, un script podría leerlo. La versión endurecida es una
  cookie httpOnly.
- **Las conversaciones se guardan solo en el navegador.** El backend guarda la
  sesión del agente (para la memoria), pero la lista de conversaciones del panel
  sigue en `localStorage`: en otro navegador no aparecen.
- **El Laboratorio duplica la mecánica de streaming** en vez de usar
  `useStreamingChat`, porque ese hook no expone `parametros`, el detalle técnico
  de cada actividad ni el consumo, que son justo lo que la pantalla necesita.
  Un cambio en el protocolo se aplica en los dos sitios.
- **La base de conocimiento y la temperatura del Laboratorio no hacen nada:**
  hay un solo corpus (la carpeta del agente) y el Agent SDK no expone
  temperatura. La selección de corpus sigue siendo obligatoria en pantalla.
- **No hay pruebas automatizadas ni linter configurado.** La única verificación
  del repositorio es `npm run typecheck`.
