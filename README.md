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
| 1 · Frontend | `frontend/` | Login, chat, Laboratorio. Muestra; no decide nada de seguridad. |
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
con qué perfil, costo en USD, vueltas, tokens (incluida la caché), herramientas
usadas y cómo terminó (`completa`, `cancelada`, `error`).

```bash
sqlite3 backend/lab.db "SELECT creado_en, perfil, costo_usd, vueltas, estado, pregunta FROM consultas ORDER BY id DESC LIMIT 10;"
```

## Lo que falta (etapa 2)

- Sandbox real del sistema operativo (contenedor endurecido) y red aislada.
- Una carpeta curada para el perfil `consulta`, sin las entregas de prácticas.
  Hoy se bloquean con una regla de permisos y un hook, pero un `Grep` sin ruta
  recorre toda la carpeta.
- Token en cookie httpOnly en lugar de `localStorage`.
- Observabilidad con OpenTelemetry → Langfuse.
- Docker Compose para el VPS.
