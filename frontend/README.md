# Umbral

Frontend del **laboratorio de agentes**: la cara web del agente de estudio de
*Procesamiento Digital de Imágenes*. Nació como la maqueta "Umbral" (un asistente
interno universitario) y conserva su sistema de diseño y sus pantallas; el chat y
el acceso ahora hablan con un backend real (`../backend`: FastAPI + Claude Agent
SDK).

**Qué es real hoy:** el inicio de sesión con roles, el chat con el agente y
las pantallas de administración (Auditoría, Tablero y Corpus), que leen
`/api/admin/*`. Lo único simulado que queda es la lista de conversaciones del
panel del chat. La sección
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
CSS, las fuentes y lo que haya en `public/`.

```bash
npm run build:umbral          # equivale a VITE_BASE_URL=/Umbral/ npm run build
```

`VITE_BASE_URL` alimenta las dos mitades del problema, que siempre van juntas:

| Mitad | Dónde | Qué pasa si falta |
|---|---|---|
| Prefijo de los **archivos** | `base` en `vite.config.ts` | El navegador pide `/assets/index.js` en la raíz del dominio, fuera de la carpeta: **página en blanco**. |
| Prefijo de las **rutas** | `basename` del `BrowserRouter` en `App.tsx`, leído de `import.meta.env.BASE_URL` | El enrutador compara contra `/chat` cuando la dirección real es `/Umbral/chat`: **toda la app cae en el 404**. |

Se declara una sola vez para que no puedan desincronizarse. Las imágenes que el
markdown referencia con ruta absoluta (`/…`) las reubica `resolverRutaPublica` en
`src/components/Markdown.tsx`, porque el empaquetador no puede reescribir una
ruta que vive dentro de una cadena de texto.

Es una decisión de **compilación**, no de servidor: cambiar la carpeta obliga a
volver a compilar.

### 2. El rewrite de una sola página

`/ajustes` y `/admin/corpus` no son archivos: son rutas que resuelve el
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

**Real:** todo lo que pasa por `src/services/api.ts` (el ÚNICO archivo que
hace `fetch`; pone el token y cierra la sesión en pantalla si el backend
responde 401):

| Servicio | Endpoints | Pantallas |
|---|---|---|
| `auth.service.ts` | `POST /api/auth/login`, `GET /api/auth/yo` | Login, sesión |
| `chat.service.ts` | `POST /api/chat` (SSE) | Chat, Laboratorio |
| `auditoria.service.ts` | `GET /api/admin/consultas`, `/consultas/{id}`, `/resumen` | Auditoría, Tablero |
| `corpus.service.ts` | `GET /api/admin/corpus`, `/corpus/archivo?ruta=…` | Corpus |
| `modelos.service.ts` | `GET /api/modelos` | Laboratorio |

Los de `/api/admin/*` exigen el permiso `auditoria` (rol `admin`); a otra cuenta
el backend le responde 403.

**Simulado:** solo la **lista de conversaciones** del panel del chat
(`ChatContext` + `data/conversaciones.ts`), en `localStorage` bajo el prefijo
`umbral:`. El backend reanuda la sesión del agente por `conversacionId`, pero
la lista que se ve en el panel vive en el navegador. *Ajustes → Restablecer
datos de demostración* borra esas claves.

Matices que conviene conocer:

- **Autenticación**: la verifica el backend y el rol lo decide él. La copia de
  la sesión en `localStorage` es solo para pintar sin esperar; al abrir la app se
  valida contra `GET /api/auth/yo`. El front **muestra u oculta** según el rol,
  pero quien **niega** es el backend.
- **Conversaciones**: el historial persiste pero **caduca a las 12 horas**.
- **Auditoría** muestra cada consulta guardada en la tabla `consultas`:
  pregunta, respuesta (lo que vio la persona, sin razonamiento), modelo, costo,
  tokens con caché, vueltas, herramientas y estado. Las consultas anteriores a
  que existiera la columna `respuesta` solo tienen la pregunta.
- **Corpus** es de solo lectura: lista los archivos reales de la carpeta del
  agente y los abre (Markdown, texto, HTML en un iframe con `sandbox=""` y PDF
  con react-pdf). Los archivos se mantienen desde la carpeta del agente, no
  desde la web.
- **La pantalla nunca hace `fetch` ni toca `localStorage` directamente**:
  siempre va por un servicio que devuelve promesas.

> Escotilla de desarrollo: con `VITE_CHAT_SIMULADO=1`, escribir **"forzar
> error"** en el chat provoca el estado de error de la pantalla sin desconectar
> la red.

---

## Pantallas

| Ruta | Qué es |
|---|---|
| `/login` | Acceso con correo y contraseña, verificados por el backend. |
| `/chat`, `/chat/:conversacionId` | El asistente. Una sola pantalla sirve las dos rutas; el panel de historial vive aquí (no en el shell) y en móvil se vuelve cajón. Las sesiones pasan a solo lectura cinco horas después del último mensaje. |
| `/ajustes` | Densidad, tipografía, contraste, movimiento y accesibilidad; qué se guarda y quién lo ve. Los valores guardados se validan al leerlos: uno ajeno cae al de fábrica. |
| `/perfil` | Datos de la cuenta, su rol y los modos del agente que puede usar. Solo lectura. |
| `/_dev/sistema-diseno` | Referencia viva del sistema de diseño. Fuera del shell y **sin sesión**: es documentación del equipo, no una pantalla de producto. |

Solo para **rol administrador** (un usuario sin el rol no es redirigido en
silencio: ve una explicación de por qué no puede entrar):

| Ruta | Qué es |
|---|---|
| `/admin/tablero` | Tablero: consultas, costo en USD (periodo e histórico), costo por consulta, consultas sin terminar, costo por día, por persona (clic → sus consultas en Auditoría) y por modelo. Periodos de 7, 30 y 90 días. Lee `GET /api/admin/resumen`. |
| `/admin/corpus` | Los archivos reales de la carpeta del agente en siete colecciones (resúmenes de clases y prácticas, mapa y calendario, resúmenes de diapositivas, apuntes, transcripciones, diapositivas del profesor y prácticas — esta última marcada como sensible), con visor por tipo y descarga. Solo lectura. |
| `/admin/conversaciones` | Auditoría: cada pregunta que alguien le hizo al agente, con su respuesta en Markdown, quién la hizo y lo que costó. Filtros por persona, texto (pregunta o respuesta), estado y fechas; paginación con "Cargar más". `?usuario=<id>` llega ya filtrada. Solo lectura. |
| `/admin/laboratorio` | Modo desarrollador del agente: conversación de prueba con streaming real, modelo de Claude, nivel de pensamiento y system prompt, más el recorrido de herramientas y el **costo y los tokens medidos** de cada respuesta. La temperatura se ignora en el backend; no hay base de conocimiento que elegir (el agente busca en toda su carpeta). Sus consultas sí quedan en el registro del backend y, por tanto, en Auditoría. |

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
| `admin` | Todo, incluidas las pantallas de administración (permiso `auditoria`) y los parámetros del Laboratorio (permiso `parametros`). |

---

## Estructura

```
src/
  copy/                Todas las cadenas visibles, en un solo lugar.
  types/               Modelo de datos y protocolo del chat. Fuente única de tipos.
  data/                Semilla de la lista de conversaciones y respuestas del
                       simulador del chat.
  services/            Frontera con los datos. `api.ts` es el único que hace
                       `fetch`; `simulacion.ts` da persistencia en localStorage.
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
  components/{chat,ajustes,admin}/   Piezas por dominio.
  components/LimiteError.tsx   Límite de error: una pantalla que falla al
                       pintarse muestra un mensaje con "Reintentar" en vez de
                       dejar la app en blanco.
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

- **`DataTable` no tiene ordenamiento nativo.** Las tablas del Tablero llegan
  ya ordenadas por costo desde el backend.
- **Parte del copy sigue en objetos `TEXTO` locales** dentro de las pantallas y
  de varios componentes, en vez de estar en `src/copy/index.ts`. Están marcados
  en el código con el comentario *"Cadenas que no existen todavía en src/copy"*.
  Es deuda deliberada, no un olvido: centralizarlas es trabajo pendiente.
- **El HTML de los apuntes se ve sin sus imágenes** en Corpus: el iframe no
  tiene mismo origen (`sandbox=""`) y las imágenes relativas no se resuelven.
  Es el precio de no ejecutar nada del archivo.
- **Los días del Tablero son días UTC**, como los guarda el servidor.
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
- **La temperatura del Laboratorio no hace nada:** el Agent SDK no la expone.
- **No hay pruebas automatizadas ni linter configurado.** La única verificación
  del repositorio es `npm run typecheck`.
