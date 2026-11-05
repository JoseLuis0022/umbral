> Notas técnicas del laboratorio (antes eran el README). El README actual está en la raíz.

# Laboratorio de agentes

Cómo pasa un agente de Claude Code en una laptop a una app web multiusuario.
El agente es el de los apuntes de **Procesamiento Digital de Imágenes**
(profesor, Aurora, otoño 2026).

```
Agente Prod/
├── frontend/          Capa 1 · React + Vite (la interfaz de Umbral)
├── backend/           Capas 2 y 3 · FastAPI (puerta) + Claude Agent SDK (cerebro)
└── agente-imagenes/   Capa 4 · copia del agente completo (CLAUDE.md, skills,
                       apuntes, estado, transcripciones). NO está en el repo.
```

## Las cuatro capas

| Capa | Dónde | Qué hace |
|---|---|---|
| 1 · Frontend | `frontend/` | Login, chat y administración (Tablero, Corpus, Auditoría, Laboratorio). Muestra; no decide nada de seguridad. |
| 2 · Web API | `backend/app/rutas_*.py`, `seguridad.py` | Quién eres (JWT), qué rol tienes, qué modo puedes usar, cuántas consultas te quedan. Elige la configuración del agente. |
| 3 · Agente | `backend/app/motor.py` | Corre el agentic loop con el Agent SDK y traduce sus mensajes a nuestro protocolo. No sabe qué es un rol. |
| 4 · Herramientas | `agente-imagenes/` | `Read`, `Grep`, `Glob` sobre la carpeta del agente. |

Los **modos** del agente son datos, no `if`: ver `backend/app/perfiles.py`.

| Perfil | Herramientas | Carga el CLAUDE.md del agente | Quién |
|---|---|---|---|
| `consulta` | Read, Grep, Glob | No (prompt propio en `prompts/consulta.md`) | usuario, especialista, admin |
| `generador` | + Bash, Write, Edit, Skill | Sí, tal cual | especialista, admin |

## Levantar todo (desarrollo)

**Una vez:**

```bash
# Datos: copia del agente sin videos (desde OneDrive)
rsync -a --exclude '*.mp4' --exclude .DS_Store \
  "/ruta/a/tu/agente/" agente-imagenes/

# Backend
cd backend
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python -r pyproject.toml
cp .env.example .env        # llena JWT_SECRETO; ANTHROPIC_API_KEY cuando uses MOTOR=sdk

# Tu cuenta de admin (la contraseña se pide sin eco)
.venv/bin/python -m app.cli_usuarios crear --correo tu@correo.mx --nombre "Tu Nombre" --rol admin

# Frontend
cd ../frontend && npm ci
```

**Cada vez**, en dos terminales:

```bash
cd backend  && .venv/bin/uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev          # http://localhost:5173
```

Documentación interactiva de la API: http://localhost:8000/api/docs

## Motores

`MOTOR` en `backend/.env`:

- `prueba` — respuestas fijas que hablan el mismo protocolo. **No gasta tokens.**
- `sdk` — el agente real. Necesita `ANTHROPIC_API_KEY`. Cada consulta tiene un
  tope duro en dólares (`presupuesto_usd` del perfil). **Pon también un tope de
  gasto en la consola de Anthropic.**

## Cuentas para tus amigos

```bash
cd backend
.venv/bin/python -m app.cli_usuarios crear --correo amigo@correo.mx --nombre "Amigo" --rol usuario --generar
.venv/bin/python -m app.cli_usuarios listar
.venv/bin/python -m app.cli_usuarios rol --correo amigo@correo.mx --rol especialista
```

`--generar` imprime una contraseña aleatoria una sola vez.

## El "oro molido"

Cada consulta queda en `backend/lab.db`, tabla `consultas`: quién preguntó, qué,
**la respuesta que vio** (columna `respuesta`; solo el texto, sin el
razonamiento), con qué perfil y modelo, costo en USD, vueltas, tokens (incluida
la caché), herramientas usadas y cómo terminó (`completa`, `cancelada`,
`error`). La columna `respuesta` se agrega sola a una base existente al
arrancar el backend; las consultas anteriores quedan sin respuesta.

Para leerlo no hace falta SQL: **Auditoría** (`/admin/conversaciones`) lista
todas las consultas con su respuesta y sus métricas, y **Tablero**
(`/admin/tablero`) resume costo por día, por persona y por modelo.

```bash
sqlite3 backend/lab.db "SELECT creado_en, perfil, costo_usd, vueltas, estado, pregunta FROM consultas ORDER BY id DESC LIMIT 10;"
```

## Administración (`/api/admin`)

`backend/app/rutas_admin.py`. Todo exige el permiso **`auditoria`**, que hoy
solo tiene el rol `admin` (`perfiles.py`). Sin token: 401; con otra cuenta: 403.
Solo lectura.

| Endpoint | Qué devuelve |
|---|---|
| `GET /api/admin/consultas` | Consultas, la más reciente primero. Filtros: `usuario` (id), `perfil`, `estado`, `q` (texto en pregunta o respuesta), `desde`/`hasta` (ISO 8601). Paginación: `limite` (≤ 100) y `antesDe` (id; la respuesta trae `siguiente`). Cada fila: usuario {id, nombre, correo, rol}, conversación, perfil, modelo, pregunta, extracto de la respuesta, costo, vueltas, duración, tokens, herramientas, estado y error. |
| `GET /api/admin/consultas/{id}` | Lo mismo con la respuesta completa. |
| `GET /api/admin/resumen?dias=30` | Totales (histórico y del periodo), por estado, por persona, por modelo y por día (UTC, con ceros en los días sin consultas). |
| `GET /api/admin/corpus` | Los archivos de `agente-imagenes/` en colecciones: resúmenes de clases y prácticas (`estado/inventario`), mapa y calendario (`estado/*.md`), resúmenes de diapositivas, apuntes, transcripciones, diapositivas del profesor y prácticas (marcada `sensible`). Por archivo: ruta relativa, nombre, tipo, tamaño y fecha. |
| `GET /api/admin/corpus/archivo?ruta=…` | md/txt/html como JSON (tope 3 MB → 413); PDF como `application/pdf`. Solo sirve rutas que aparecen en el listado; rechaza rutas absolutas, `..`, `\` y NUL (400), y comprueba que la ruta real (symlinks incluidos) quede dentro de la carpeta del agente (404). |

## Lo que falta (etapa 2)

- Sandbox real del sistema operativo (contenedor endurecido) y red aislada.
- Una carpeta curada para el perfil `consulta`, sin las entregas de prácticas.
  Hoy se bloquean con una regla de permisos y un hook, pero un `Grep` sin ruta
  recorre toda la carpeta.
- Token en cookie httpOnly en lugar de `localStorage`.
- Observabilidad con OpenTelemetry → Langfuse.
- Docker Compose para el VPS.
