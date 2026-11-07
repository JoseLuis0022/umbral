<div align="center">

<img src="frontend/public/favicon.svg" width="76" height="76" alt="Umbral">

# Umbral

**Lleva un agente de Claude de tu laptop a la web.**

Chat multiusuario con tareas que sobreviven a cerrar la página, gasto en vivo, registro con verificación por correo y despliegue con un solo `docker compose up`.

<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licencia-MIT-3b5bdb?style=flat-square" alt="Licencia MIT"></a>
  <img src="https://img.shields.io/badge/Docker%20Compose-listo-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose-listo">
  <img src="https://img.shields.io/badge/Claude%20Agent%20SDK-D97757?style=flat-square&logo=claude&logoColor=white" alt="Claude Agent SDK">
  <img src="https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python-3.13">
  <img src="https://img.shields.io/badge/React-18-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React-18">
</p>

<p><a href="#un-vistazo">Un vistazo</a> &nbsp;|&nbsp; <a href="#qué-hace">Qué hace</a> &nbsp;|&nbsp; <a href="#arquitectura">Arquitectura</a> &nbsp;|&nbsp; <a href="#despliegue-con-docker-compose">Despliegue</a> &nbsp;|&nbsp; <a href="#desarrollo-local">Desarrollo</a></p>

<br><br>

<img src="docs/img/hero.png" width="920" alt="Umbral en una MacBook y un iPhone: respuesta con citas a la clase y a la página del PDF">

<sub>El agente responde con citas clicables a la clase y a la página exacta de las diapositivas, y manda el apunte del tema. En escritorio y en el celular, instalable como app.</sub>

</div>

---

## Por qué existe

Un agente de Claude Code que funciona en tu computadora (un `CLAUDE.md`, unas
skills y una carpeta de material) está a un paso de ser útil para otros, pero
ese paso es grande: usuarios, permisos, costos, tareas largas que no pueden
depender de una pestaña abierta, y un servidor. Umbral es esa capa: toma la
carpeta del agente tal cual y la sirve como una aplicación web.

El primer agente que corre en Umbral es un asistente de estudio de
**Procesamiento Digital de Imágenes**.

## Tecnologías

| Capa | Tecnologías |
|---|---|
| **Agente** | <img src="https://img.shields.io/badge/Claude%20Agent%20SDK-D97757?style=flat-square&logo=claude&logoColor=white" alt="Claude Agent SDK"> <img src="https://img.shields.io/badge/Claude%20Code-191919?style=flat-square&logo=anthropic&logoColor=white" alt="Claude Code"> <img src="https://img.shields.io/badge/Opus%20%2F%20Sonnet%20%2F%20Haiku-D97757?style=flat-square&logo=anthropic&logoColor=white" alt="Opus / Sonnet / Haiku"> |
| **Backend** | <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python"> <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI"> <img src="https://img.shields.io/badge/Pydantic-E92063?style=flat-square&logo=pydantic&logoColor=white" alt="Pydantic"> <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite"> <img src="https://img.shields.io/badge/SSE-475569?style=flat-square&logo=html5&logoColor=white" alt="SSE"> |
| **Frontend** | <img src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React"> <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"> <img src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite"> <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS"> <img src="https://img.shields.io/badge/Framer%20Motion-0055FF?style=flat-square&logo=framer&logoColor=white" alt="Framer Motion"> |
| **Infraestructura** | <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"> <img src="https://img.shields.io/badge/nginx-009639?style=flat-square&logo=nginx&logoColor=white" alt="nginx"> <img src="https://img.shields.io/badge/Gmail%20SMTP-EA4335?style=flat-square&logo=gmail&logoColor=white" alt="Gmail SMTP"> |

## Un vistazo

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/img/tablero.png" alt="Tablero de costos">
      <p align="center"><b>Tablero</b><br><sub>Consultas y costo por día, por persona y por modelo, con el gasto en vivo.</sub></p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/img/auditoria.png" alt="Auditoría de consultas">
      <p align="center"><b>Auditoría</b><br><sub>Cada pregunta y respuesta, con modelo, tokens, herramientas y lo que costó.</sub></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img src="docs/img/corpus.png" alt="Explorador del corpus">
      <p align="center"><b>Corpus</b><br><sub>El material del agente por colecciones: lo que el estudiante puede recibir y lo que solo el agente lee.</sub></p>
    </td>
    <td width="50%" valign="top">
      <img src="docs/img/acceso.png" alt="Inicio de sesión con la gráfica de la función umbral">
      <p align="center"><b>Acceso</b><br><sub>La función umbral a escala real: reacciona a lo que escribes y, al entrar, el nodo cruza el umbral.</sub></p>
    </td>
  </tr>
</table>

<details>
<summary><b>Correo de verificación</b> (registro self-service)</summary>
<br>
<p align="center"><img src="docs/img/correo-verificacion.png" width="560" alt="Correo de verificación"></p>
</details>

<sub>Las capturas usan una instancia de demostración (cuentas y material ficticios). Marcos de dispositivo con <a href="https://github.com/picturepan2/devices.css">devices.css</a> (MIT).</sub>

## Qué hace

**Para quien usa el chat**
- Respuestas en streaming con el proceso del agente a la vista (qué está leyendo, buscando o generando).
- **Tareas en segundo plano**: la consulta vive en el servidor; cambiar de pantalla, recargar o cerrar la pestaña no la cancela. Al volver, la respuesta está ahí (y suena un aviso si tardó).
- **Cola de mensajes**: se puede seguir escribiendo mientras el agente trabaja; lo encolado sale junto al terminar.
- **Citas de fuentes clicables**: el agente enlaza la clase, la página del PDF o el apunte de donde sale cada dato, con la frase resaltada.
- Adjuntos de cualquier tipo (imágenes, PDF, texto, video como fotogramas) y archivos del curso que el agente puede mandar.
- Historial sincronizado entre dispositivos; conversaciones fijadas, archivadas y no leídas.
- **PWA instalable** (escritorio y celular) con animación de arranque; el service worker nunca sirve una versión vieja.

**Para quien opera la plataforma**
- **Registro self-service** con verificación por correo (Gmail + contraseña de aplicación, configurable desde la app).
- **Modo invitado**: cuentas nuevas con un modelo económico y un crédito de prueba por cuenta, más un **tope mensual global** para todos los invitados.
- **Gasto en vivo**: cada consulta se registra al empezar y su costo se actualiza mientras corre (estimado calibrado contra el costo real que reporta el agente).
- **Resiliencia**: reintentos visibles (API, agente y red), "Continuar donde se quedó" tras un fallo, y tareas exclusivas que hacen fila en vez de fallar.
- Panel de administración: tablero de costos, auditoría de cada consulta, explorador del corpus y laboratorio para probar modelos y prompts.

## Arquitectura

```mermaid
flowchart LR
    N[Navegador<br/>React + Vite] -->|HTTPS| X[nginx<br/>app + /api]
    X -->|SSE| A[FastAPI<br/>auth · roles · planes · trabajos]
    A --> D[(SQLite<br/>cuentas · historial · gasto)]
    A --> M[Motor<br/>Claude Agent SDK]
    M --> C[Claude Code]
    C -->|Read · Grep · Glob| F[/Carpeta del agente<br/>CLAUDE.md · skills · material/]
    C -->|API| K[Anthropic]
```

| Capa | Dónde | Responsabilidad |
|---|---|---|
| Interfaz | `frontend/` | Chat y administración. Muestra; no decide nada de seguridad. |
| Puerta | `backend/app/rutas_*.py`, `seguridad.py`, `planes.py` | Quién eres (JWT), qué rol tienes, qué modo puedes usar, cuánto crédito te queda. |
| Trabajos | `backend/app/trabajos.py` | Cada consulta es una tarea propia; la respuesta HTTP solo la **observa**. |
| Motor | `backend/app/motor.py` | Corre el agente, traduce sus mensajes al protocolo SSE y estima el costo en vivo. |
| Agente | carpeta montada en `/agente` | El agente tal cual existe en la laptop. No forma parte de este repositorio. |

Los **modos** del agente son datos, no código (`backend/app/perfiles.py`):

| Modo | Herramientas | Quién |
|---|---|---|
| Consulta | Read, Grep, Glob (confinadas a la carpeta del agente) | invitado, usuario, especialista, admin |
| Generador | + Bash, Write, Edit, Skills | especialista, admin |

## Despliegue con Docker Compose

Requisitos: un servidor Linux con Docker y Docker Compose v2.

```bash
git clone https://github.com/JoseLuis0022/umbral.git && cd umbral

# 1. Configuración
cp .env.example .env
#    ANTHROPIC_API_KEY=…   (console.anthropic.com)
#    JWT_SECRETO=…         python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# 2. El agente: su carpeta va en ./agente (o en AGENTE_DIR)
#    y debe pertenecer al UID 1000, que es con el que corre el backend.
sudo chown -R 1000:1000 agente

# 3. Levantar
docker compose up -d

# 4. Tu cuenta de administrador
docker compose exec backend python -m app.cli_usuarios crear \
  --correo tu@correo.com --nombre "Tu Nombre" --rol admin
```

Umbral queda en `http://servidor:8080` (cambia el puerto con `PUERTO`). Pon
HTTPS delante: Cloudflare Tunnel, Caddy o el proxy que ya uses.

Después, desde la app: **Ajustes → Registro público → Configurar correo**
(Gmail y contraseña de aplicación) para abrir el registro.

| Tarea | Comando |
|---|---|
| Actualizar | `git pull && docker compose up -d --build` |
| Ver registros | `docker compose logs -f backend` |
| Respaldar datos | `docker compose exec backend python -c "import sqlite3; sqlite3.connect('/datos/umbral.db').backup(sqlite3.connect('/datos/respaldo.db'))"` y copia `respaldo.db` fuera del volumen |
| Cuentas | `docker compose exec backend python -m app.cli_usuarios listar` |

> **Un solo proceso.** Las tareas en curso viven en la memoria del backend; por
> eso no se escala con varios workers. Al desplegar, el contenedor espera hasta
> 45 s a que terminen las respuestas en curso.

### Variables (`.env`)

| Variable | Obligatoria | Para qué |
|---|---|---|
| `ANTHROPIC_API_KEY` | sí | La cuenta de Anthropic que paga las consultas. Pon también un tope de gasto en la consola. |
| `JWT_SECRETO` | sí | Firma de las sesiones (≥ 32 caracteres). |
| `PUERTO` | no | Puerto publicado (8080). |
| `AGENTE_DIR` | no | Carpeta del agente en el servidor (`./agente`). |
| `AGENTES_SIMULTANEOS` | no | Consultas a la vez; las demás esperan turno (3). |
| `JWT_HORAS` | no | Duración de la sesión (12). |
| `MOTOR` | no | `sdk` (real) o `prueba` (respuestas fijas, sin gastar). |
| `VITE_BASE_URL` | no | Subcarpeta del dominio, si la hay (`/`). |
| `VITE_URL_PUBLICA` | no | Dirección pública (`https://…`), para la vista previa al compartir el enlace. |
| `CARPETA_CLASES` · `CARPETA_TRANSCRIPCIONES` | no | Dónde están las diapositivas y las transcripciones dentro de la carpeta del agente (`Clases`, `Clases/Transcripciones`). |
| `CARPETAS_PRIVADAS` | no | Carpetas que el modo Consulta nunca lee, separadas por coma (`Prácticas`). |

### Adaptarlo a tu curso

El prompt del modo Consulta que trae el repo es genérico. Para darle el nombre
de tu materia y sus reglas (qué se puede resolver, qué no), crea
`.umbral/prompts/consulta.md` dentro de la carpeta del agente: gana sobre el
genérico, vive con tu material y no se publica con el código. El modo Consulta
no puede leer esa carpeta.

## Desarrollo local

```bash
# Backend (Python 3.13)
cd backend
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python -r pyproject.toml
cp .env.example .env                     # JWT_SECRETO; ANTHROPIC_API_KEY si MOTOR=sdk
.venv/bin/python -m app.cli_usuarios crear --correo tu@correo.com --nombre "Tu Nombre" --rol admin
.venv/bin/uvicorn app.main:app --reload --port 8000

# Frontend (Node ≥ 22)
cd frontend && npm ci && npm run dev     # http://localhost:5173
```

`MOTOR=prueba` responde sin llamar a Claude y habla el mismo protocolo: sirve
para trabajar la interfaz sin gastar. La API documentada está en
`http://localhost:8000/api/docs`. Antes de dar por terminado un cambio del
frontend: `npm run typecheck`.

## Seguridad

- **La identidad sale del token, nunca del cuerpo**; el rol se lee de la base en cada petición.
- **El modo Consulta no puede leer fuera de la carpeta del agente**: un hook revisa cada llamada a herramienta (rutas absolutas, `../`, patrones de búsqueda).
- Las cuentas del registro **no entran sin verificar** el correo; los enlaces son de un solo uso y se guardan como hash; límite de cuentas por IP y correos desechables rechazados.
- **Límite de intentos en el inicio de sesión**: tras 5 fallos contra una cuenta (o 20 desde una red) se bloquea 15 minutos.
- La contraseña de aplicación de Gmail se guarda **cifrada** y nunca sale de la API.
- Cada consulta tiene un tope de gasto que corta el propio agente; los invitados, además, su crédito y el tope mensual global.
- El backend corre sin root y solo es accesible a través de nginx.

## Estructura

```
umbral/
├── backend/
│   ├── app/
│   │   ├── main.py              arranque, rutas
│   │   ├── motor.py             el agente: SDK → protocolo SSE, reintentos, costo en vivo
│   │   ├── trabajos.py          consultas como tareas que sobreviven a la conexión
│   │   ├── rutas_*.py           auth, chat, conversaciones, admin, configuración
│   │   ├── perfiles.py          modos del agente y roles (datos, no código)
│   │   ├── planes.py            crédito del invitado y tope mensual
│   │   ├── precios.py           estimado de costo que se calibra solo
│   │   ├── correo.py            Gmail + plantillas HTML
│   │   ├── guardias.py          qué rutas puede tocar el agente
│   │   └── prompts/             system prompt del modo Consulta
│   └── Dockerfile
├── frontend/
│   ├── src/                     React: pantallas, contexto del chat, servicios
│   ├── nginx.conf               app + /api (SSE sin búfer)
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Hoja de ruta

- **Pruebas automáticas en cada commit**: pruebas del backend (pytest: auth, límites, planes, guardias de rutas, protocolo SSE con el motor de prueba) y del frontend (typecheck + pruebas de componentes y un recorrido end-to-end con Playwright), corriendo en GitHub Actions para que un cambio que rompe algo no llegue a `main`.
- **Ejemplos interactivos en el chat**: que el agente pueda generar HTML (simulaciones, gráficas, un filtro aplicado sobre una imagen con controles) y que se renderice dentro de la conversación, como los artefactos de Claude, en un iframe aislado (`sandbox`) para que se pueda explorar sin riesgo.
- Sesión en cookie `httpOnly` en lugar de `localStorage`.
- Recuperación de contraseña.
- Sandbox del sistema operativo para el modo Generador (Bash).
- Búsqueda semántica (embeddings) como herramienta del agente, comparada contra la búsqueda agéntica con un banco de evaluaciones.
- Observabilidad con OpenTelemetry.

---

<sub>Hecho por José Luis Macedo Escamilla · Licencia [MIT](LICENSE). La fuente Google Sans se distribuye bajo la [SIL Open Font License 1.1](frontend/src/assets/fuentes/OFL.txt).</sub>
