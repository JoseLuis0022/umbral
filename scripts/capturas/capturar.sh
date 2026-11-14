#!/usr/bin/env bash
# Regenera las capturas de producto de la landing (frontend/public/landing/).
#
#   scripts/capturas/capturar.sh            # todo: datos, servidores, capturas, marcos
#   CONSERVAR=1 scripts/capturas/capturar.sh  # no borra la carpeta temporal (para revisar)
#
# Pasos: (a) base temporal y datos inventados, (b) backend con MOTOR=prueba y el
# front compilado en `vite preview`, (c) capturas con Playwright a 2x,
# (d) marcos de devices.css con sombra, (e) WebP con fondo transparente,
# (f) apaga todo y borra lo temporal (también si algo falla).
set -euo pipefail

AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ_REPO="$(cd "$AQUI/../.." && pwd)"
PUERTO_API="${PUERTO_API:-8021}"
PUERTO_WEB="${PUERTO_WEB:-4221}"
PYTHON_BACKEND="$RAIZ_REPO/backend/.venv/bin/python"
# Un Python con Pillow (solo para convertir a WebP). El del backend no lo trae.
PYTHON_IMAGENES="${PYTHON_IMAGENES:-python3}"
# playwright-core: el del CLI de Playwright instalado con npm, o el que se indique.
PLAYWRIGHT="${PLAYWRIGHT:-/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright-core/index.mjs}"
DESTINO="${DESTINO:-$RAIZ_REPO/frontend/public/landing}"

TEMPORAL="$(mktemp -d "${TMPDIR:-/tmp}/umbral-capturas.XXXXXX")"
PIDS=()

limpiar() {
  local codigo=$?
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] || continue
    # El proceso y sus hijos (npx → vite).
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
  done
  sleep 1
  for pid in "${PIDS[@]:-}"; do
    [ -n "$pid" ] || continue
    pkill -KILL -P "$pid" 2>/dev/null || true
    kill -KILL "$pid" 2>/dev/null || true
  done
  if [ "${CONSERVAR:-0}" = "1" ]; then
    echo "Carpeta temporal conservada: $TEMPORAL"
  else
    rm -rf "$TEMPORAL"
  fi
  exit $codigo
}
trap limpiar EXIT INT TERM

ocupado() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
if ! "$PYTHON_IMAGENES" -I -c "import PIL.WebPImagePlugin" 2>/dev/null; then
  echo "Falta un Python con Pillow: PYTHON_IMAGENES=/ruta/a/python $0" >&2; exit 1
fi
for puerto in "$PUERTO_API" "$PUERTO_WEB"; do
  if ocupado "$puerto"; then echo "El puerto $puerto ya está en uso: libéralo o cambia PUERTO_API / PUERTO_WEB." >&2; exit 1; fi
done

esperar() { # url, nombre
  for _ in $(seq 1 120); do
    if curl -fs -o /dev/null "$1"; then return 0; fi
    sleep 0.5
  done
  echo "No respondió $2 ($1)." >&2
  return 1
}

# (a) Entorno aislado: las variables de entorno ganan sobre backend/.env, así
# que nunca se toca la base real ni se gasta la API (MOTOR=prueba, llave vacía).
export JWT_SECRETO="capturas-de-demostracion-$(date +%s)-con-mas-de-32-caracteres"
export MOTOR=prueba
export ANTHROPIC_API_KEY=""
export DB_RUTA="$TEMPORAL/demo.db"
export AGENTE_CWD="$TEMPORAL/agente"
export CONFIG_CLAUDE="$TEMPORAL/claude"
export CARPETA_CLASES="Clases"
export CARPETA_TRANSCRIPCIONES="Clases/Transcripciones"
export CARPETAS_PRIVADAS="Prácticas"
export CONFIAR_CLOUDFLARE=false
export DOCS_API=false

echo "→ Datos de demostración"
(cd "$RAIZ_REPO/backend" && "$PYTHON_BACKEND" "$AQUI/sembrar.py" "$TEMPORAL")

# (b) Servidores.
echo "→ Backend en :$PUERTO_API (MOTOR=prueba)"
(cd "$RAIZ_REPO/backend" && exec "$PYTHON_BACKEND" -m uvicorn app.main:app --host 127.0.0.1 --port "$PUERTO_API" --log-level warning) \
  >"$TEMPORAL/backend.log" 2>&1 &
PIDS+=($!)

echo "→ Compilando el front en una carpeta temporal"
(cd "$RAIZ_REPO/frontend" && npx vite build --outDir "$TEMPORAL/dist" --emptyOutDir --logLevel warn)

echo "→ vite preview en :$PUERTO_WEB"
(cd "$RAIZ_REPO/frontend" && VITE_API_PROXY="http://127.0.0.1:$PUERTO_API" exec npx vite preview --outDir "$TEMPORAL/dist" \
  --port "$PUERTO_WEB" --strictPort --host 127.0.0.1) >"$TEMPORAL/preview.log" 2>&1 &
PIDS+=($!)

esperar "http://127.0.0.1:$PUERTO_API/api/salud" "el backend"
esperar "http://127.0.0.1:$PUERTO_WEB/" "vite preview"

# (c) y (d) Capturas y marcos.
echo "→ Capturas y marcos"
mkdir -p "$TEMPORAL/pantallas" "$TEMPORAL/marcos"
node "$AQUI/capturar.mjs" \
  --playwright "$PLAYWRIGHT" \
  --url "http://127.0.0.1:$PUERTO_WEB" \
  --pantallas "$TEMPORAL/pantallas" \
  --marcos "$TEMPORAL/marcos" \
  --plantilla "$AQUI/marco.html"

# (e) WebP con transparencia, recortado y verificado.
echo "→ WebP"
"$PYTHON_IMAGENES" -I "$AQUI/a_webp.py" "$TEMPORAL/marcos" "$DESTINO"

echo "Listo: $DESTINO"
