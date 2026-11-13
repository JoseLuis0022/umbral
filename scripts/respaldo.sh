#!/bin/sh
# Respaldo de la base de Umbral (cuentas, historial, gasto).
#
#   scripts/respaldo.sh [carpeta destino]      (por defecto ./respaldos)
#
# Usa la API de backup de SQLite: la copia es consistente aunque el backend
# esté escribiendo. Conserva los últimos $CONSERVAR respaldos (14 por defecto).
# Para que sea un respaldo de verdad, el destino debería estar en otro disco o
# sincronizarse fuera del servidor (R2, S3, rclone…).
#
# Cron diario a las 04:00:
#   0 4 * * * cd "/ruta/a/Umbral" && scripts/respaldo.sh >> respaldos/respaldo.log 2>&1
set -eu
cd "$(dirname "$0")/.."
DESTINO="${1:-./respaldos}"
CONSERVAR="${CONSERVAR:-14}"
FECHA=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DESTINO"

docker compose exec -T backend python -c "
import sqlite3
origen = sqlite3.connect('/datos/umbral.db')
copia = sqlite3.connect('/tmp/respaldo.db')
origen.backup(copia)
copia.execute('PRAGMA integrity_check').fetchone()
copia.close()
"
docker compose cp backend:/tmp/respaldo.db "$DESTINO/umbral-$FECHA.db"
docker compose exec -T backend rm -f /tmp/respaldo.db

# Los más viejos fuera.
ls -1t "$DESTINO"/umbral-*.db | tail -n +"$((CONSERVAR + 1))" | while read -r viejo; do rm -f "$viejo"; done
echo "$(date '+%F %T') respaldo listo: $DESTINO/umbral-$FECHA.db"
