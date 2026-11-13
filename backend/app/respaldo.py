"""Respaldo de la base (cuentas, historial, gasto), dentro de Docker.

Corre como su propio servicio de Docker Compose (`respaldo`): sin cron del
servidor. Cada día a la HORA_RESPALDO (UTC) copia la base con la API de backup
de SQLite (consistente aunque el backend esté escribiendo), revisa su
integridad y conserva los últimos CONSERVAR_RESPALDOS.

    python -m app.respaldo            servicio: espera la hora y respalda cada día
    python -m app.respaldo --ahora    un respaldo inmediato y sale

A propósito NO importa la configuración de la app: no necesita la API key ni
el secreto de las sesiones, solo la ruta de la base y la carpeta de destino.
"""

import logging
import os
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger("respaldo")

BASE = Path(os.environ.get("DB_RUTA", "/datos/umbral.db"))
DESTINO = Path(os.environ.get("CARPETA_RESPALDOS", "/respaldos"))
CONSERVAR = int(os.environ.get("CONSERVAR_RESPALDOS", "14"))
HORA = int(os.environ.get("HORA_RESPALDO", "10"))  # UTC: 10 = 4 a. m. en CDMX


def respaldar() -> Path:
    DESTINO.mkdir(parents=True, exist_ok=True)
    marca = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H%M")
    final = DESTINO / f"umbral-{marca}.db"
    parcial = final.with_suffix(".db.parcial")

    origen = sqlite3.connect(BASE, timeout=30)
    copia = sqlite3.connect(parcial)
    try:
        origen.backup(copia)
        resultado = copia.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        copia.close()
        origen.close()
    if resultado != "ok":
        parcial.unlink(missing_ok=True)
        raise RuntimeError(f"la copia no pasó integrity_check: {resultado}")
    # Se renombra al final: un respaldo a medias nunca tiene el nombre de uno bueno.
    parcial.rename(final)

    for viejo in sorted(DESTINO.glob("umbral-*.db"), reverse=True)[CONSERVAR:]:
        viejo.unlink()
    log.info("respaldo listo: %s (%.1f MB)", final.name, final.stat().st_size / 1e6)
    return final


def _segundos_hasta_la_hora() -> float:
    ahora = datetime.now(timezone.utc)
    siguiente = ahora.replace(hour=HORA, minute=0, second=0, microsecond=0)
    if siguiente <= ahora:
        siguiente += timedelta(days=1)
    return (siguiente - ahora).total_seconds()


def servicio() -> None:
    log.info("respaldo diario a las %02d:00 UTC en %s (se conservan %s)", HORA, DESTINO, CONSERVAR)
    # Uno al arrancar si no hay ninguno: así un despliegue nuevo queda cubierto.
    if not any(DESTINO.glob("umbral-*.db")) and BASE.exists():
        _intentar()
    while True:
        time.sleep(_segundos_hasta_la_hora())
        _intentar()


def _intentar() -> None:
    try:
        respaldar()
    except Exception:  # un fallo no tumba el servicio: se reintenta al día siguiente
        log.exception("el respaldo falló")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s · %(message)s")
    if "--ahora" in sys.argv:
        respaldar()
    else:
        servicio()
