# Umbral

Asistente interno de la **Universidad Aurora**, para
personal administrativo y profesorado. Resuelve dudas del día a día sobre las
herramientas institucionales (Copilot, Outlook, Teams, Brightspace) y sobre la
política de IA de la Universidad, y publica guías cortas en la sección *Al día*.

**Esto es un MVP: una maqueta de demostración.** Navega completa, tiene datos y
estados reales de pantalla, y una sola pieza puede hablar con un backend de
verdad — el motor de chat. Todo lo demás está simulado en el frontend. La
sección [Qué es real y qué está simulado](#qué-es-real-y-qué-está-simulado) es
lo primero que conviene leer.

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

No hace falta configurar nada para arrancar: sin variables de entorno la app
funciona entera con su simulador.

---

## Configuración

Una sola variable, documentada en **`.env.example`**. Cópialo a `.env` y
rellénalo (`.env` está en `.gitignore`).

```bash
# .env
VITE_N8N_CHAT_URL=https://tu-instancia/webhook/xxxxxxxx/chat
```

| Valor | Qué pasa |
|---|---|
| Vacía o ausente | `chat.service.ts` cae a su **simulador interno**: mismo callback, mismo manejo de errores, mismo evento de cierre. La app funciona completa sin backend. |
| Con URL | El chat habla con ese flujo de n8n. Quien consume el servicio no puede distinguir cuál motor corre. |

### Contrato de la petición

`POST` con `Content-Type: application/json`. Es el formato **nativo** del nodo
"When chat message received" de n8n, no uno inventado: sin `action`, `sessionId`
y `chatInput` el flujo aborta.

```json
{
  "action": "sendMessage",
  "sessionId": "c-1",
  "chatInput": "último mensaje del usuario",
  "metadata": {
    "usuario":    { "id": "u-1", "nombre": "…", "area": "…" },
    "adjuntos":   [],
    "parametros": {}
  }
}
```

- **El historial no se manda.** El flujo guarda la conversación en su propia
  memoria de Postgres, indexada por `sessionId` (= `conversacionId`). Mandarlo
  además desde aquí lo duplicaría dentro del prompt del agente.
- `metadata.parametros` solo lo manda el **laboratorio** (`/admin/laboratorio`);
  el chat de la comunidad usa lo que el flujo tenga configurado.

### Formas de respuesta aceptadas

Las cuatro se detectan por el **cuerpo**, no por el `Content-Type` — n8n manda
`application/json` en todas ellas:

1. **NDJSON en streaming** (lo que corre hoy). Una línea JSON por evento:
   `{"type":"begin"…}`, `{"type":"item","content":"…"}`, `{"type":"end"…}`. Se
   emite el `content` de cada `item`.
2. **SSE** (`text/event-stream`). Eventos `data: …`, cerrados con `data: [DONE]`.
3. **JSON de una pieza**, `{"output":"…"}` — el Chat Trigger con *Response Mode:
   Last Node*. Funciona, pero la respuesta se pinta de golpe, sin escritura
   progresiva.
4. **Texto plano en streaming**: cada trozo se emite tal cual.

**Multi-agente.** El flujo emite un ciclo `begin → item… → end` por cada agente.
Solo se pinta lo que emite el nodo del **primer `begin`** (el que cuelga del
trigger); lo que contestan los sub-agentes se reporta por `alMetadatos` —el
laboratorio lo dibuja como cadena de agentes— pero no se muestra, porque el
orquestador lo repite al redactar la respuesta final.

**Tiempos de espera.** 25 s para el primer fragmento (el flujo recupera
documentos antes de hablar) y 15 s de silencio entre fragmentos. Al agotarse se
aborta con el mensaje de timeout. `enviarMensaje()` nunca lanza: siempre
resuelve con un `ResultadoEnvio` (`completo` | `cancelado` | `error`).

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

### Advertencia sobre `VITE_N8N_CHAT_URL`

Las variables `VITE_` se **hornean en el JavaScript** al compilar: la URL del
webhook queda en texto plano dentro del bundle y cualquiera que abra el sitio
puede leerla y llamarla. Para una demostración interna da igual; en una URL
pública, ese endpoint necesita autenticación o restricción por origen en n8n.

---

## Qué es real y qué está simulado

**Real:** el motor de chat (`src/services/chat.service.ts`) y nada más. Es lo
único que puede hacer una petición de red.

**Simulado:** autenticación, usuarios, conversaciones, corpus, documentos,
guías y métricas. Los servicios simulados comparten tres reglas
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

- **Autenticación** (`auth.service.ts`): cualquier contraseña es válida. Lo
  único que decide el correo es **con qué perfil se entra**. Un correo que no
  está en el directorio entra igual, como personal administrativo. El acceso
  real se resolverá con la cuenta institucional (Entra ID / MSAL), no con este
  formulario.
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

### Respuestas fijas

`src/data/respuestasFijas.ts` contiene procedimientos escritos a mano, con
capturas propias en `public/guias/…`. **Ganan a los dos motores**: si la
pregunta coincide con una de sus claves, el asistente sirve ese markdown tal
cual, haya backend o no. Existen por dos razones:

1. **Determinismo.** Son procedimientos que la Universidad quiere enseñar con
   sus propias capturas y en un orden concreto. Un modelo puede describir
   Outlook de memoria y equivocarse de menú; una captura del Outlook
   institucional, no.
2. **Confianza en la demostración.** Es la primera pregunta que casi todo el
   mundo pulsa; que salga bien siempre vale más que la variedad.

El emparejado normaliza acentos, mayúsculas y signos, pero **no adivina**: si la
pregunta no coincide con alguna clave, contesta el agente. Un emparejado "casi"
secuestraría preguntas parecidas.

> Escotilla de desarrollo: en modo simulado, escribir **"forzar error"** en el
> chat provoca el estado de error de la pantalla sin desconectar la red.

---

## Pantallas

| Ruta | Qué es |
|---|---|
| `/login` | Acceso. Cualquier contraseña sirve; incluye el desplegable de perfiles de demostración. |
| `/chat`, `/chat/:conversacionId` | El asistente. Una sola pantalla sirve las dos rutas; el panel de historial vive aquí (no en el shell) y en móvil se vuelve cajón. Las sesiones pasan a solo lectura cinco horas después del último mensaje. |
| `/al-dia` | Galería de guías, filtrable por categoría y ordenable por útiles o recientes. |
| `/al-dia/:guiaId` | Detalle de una guía: requisitos, pasos, "si algo falla" y un botón que abre el chat con la pregunta ya escrita. |
| `/ajustes` | Densidad, tamaño de tipografía y *Restablecer datos de demostración*. |
| `/perfil` | Datos de la persona, tal como vendrían del directorio institucional. Solo lectura. |
| `/_dev/sistema-diseno` | Referencia viva del sistema de diseño. Fuera del shell y **sin sesión**: es documentación del equipo, no una pantalla de producto. |

Solo para **rol administrador** (un usuario sin el rol no es redirigido en
silencio: ve una explicación de por qué no puede entrar):

| Ruta | Qué es |
|---|---|
| `/admin/tablero` | Tablero directivo: uso, horas y pesos ahorrados, riesgo por área, y el detalle conversación por conversación con exportación a CSV. |
| `/admin/corpus` | Bases de conocimiento: system prompt por corpus, subida de `.md`/`.pdf` (hasta 10 MB) con indexado simulado y visor de documento. |
| `/admin/conversaciones` | Auditoría: todas las conversaciones de la comunidad, con filtros por persona, fecha y texto, y el resumen ejecutivo de cada una. Solo lectura. |
| `/admin/al-dia` | Boletines: aquí se redacta, publica, edita y restaura lo que la comunidad lee en *Al día*. |
| `/admin/laboratorio` | Modo desarrollador del asistente: conversación de prueba con streaming real más modelo, temperatura, nivel de pensamiento y system prompt, que viajan a n8n dentro de `metadata`. El hilo no se guarda ni entra a la auditoría. |

`/` redirige a `/chat`.

---

## Perfiles de demostración

Dos perfiles, uno de cada rol (`src/data/usuarios.ts`):

| Correo | Perfil |
|---|---|
| `estudiante.demo@aurora.edu.mx` | Personal administrativo — ve chat y guías |
| `especialista.demo@aurora.edu.mx` | Administrador — además, corpus, auditoría, tablero, boletines y laboratorio |

Tres formas de entrar, y **cualquier contraseña funciona**:

1. Escribir uno de esos correos en el formulario.
2. **"Entrar como otro perfil"** en el login: desplegable que salta entre roles
   en un clic, sin escribir credenciales.
3. **"Cambiar de perfil"** en el menú del avatar (`MenuUsuario`), ya dentro de
   la app y **sin pasar por el login**. Es lo importante para presentar el MVP:
   enseñar las dos caras de la herramienta seguidas, sin cerrar sesión en medio
   de la explicación.

El desplegable del login se queda visible en la demostración a propósito: un
interruptor escondido "solo en desarrollo" obliga a quien presenta a explicar
por qué el público no lo ve.

---

## Estructura

```
public/guias/          Capturas de las respuestas fijas. Se referencian por ruta
                       absoluta: el markdown es una cadena, no JSX.
src/
  copy/                Todas las cadenas visibles, en un solo lugar.
  types/               Modelo de datos. Fuente única de tipos.
  data/                Semillas y contenido: usuarios, conversaciones, corpus,
                       guías, respuestas simuladas y respuestas fijas.
  services/            Frontera con los datos. `chat.service.ts` es el único
                       real; `simulacion.ts` da latencia y persistencia al resto.
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
- **El acceso con cuenta institucional (Entra ID / MSAL) no está implementado.**
  El botón existe en el login rotulado "Disponible en la siguiente versión".
- **El laboratorio duplica la mecánica de streaming** en vez de usar
  `useStreamingChat`, porque ese hook no expone `parametros` ni `alMetadatos`,
  que son justo lo que la pantalla necesita.
- **No hay pruebas automatizadas ni linter configurado.** La única verificación
  del repositorio es `npm run typecheck`.
