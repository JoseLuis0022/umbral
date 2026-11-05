"""La app FastAPI: une las rutas bajo /api.

Correr en desarrollo (desde backend/):
    .venv/bin/uvicorn app.main:app --reload --port 8000

No hay CORS a propósito: en desarrollo, Vite reenvía /api al backend (proxy) y
en el VPS un reverse proxy servirá front y back en el mismo dominio. Mismo
origen = el navegador no necesita CORS, y es una superficie menos que asegurar.
"""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from . import archivos, db, rutas_admin, rutas_auth, rutas_chat, rutas_config, rutas_conversaciones
from .config import ajustes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s · %(message)s")
log = logging.getLogger("lab")


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI) -> AsyncIterator[None]:
    db.iniciar()
    huerfanas = db.cerrar_huerfanas()
    if huerfanas:
        log.warning("%s consulta(s) quedaron a medias por un reinicio: se marcan como interrumpidas", huerfanas)
    if not ajustes.agente_cwd.is_dir():
        log.error("No existe la carpeta del agente: %s", ajustes.agente_cwd)
    if ajustes.motor == "sdk" and not ajustes.anthropic_api_key:
        log.warning("MOTOR=sdk pero falta ANTHROPIC_API_KEY: el chat responderá con error de configuración.")
    log.info("Motor: %s · agente: %s", ajustes.motor, ajustes.agente_cwd)
    yield


app = FastAPI(
    title="Laboratorio de agentes",
    lifespan=ciclo_de_vida,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)
app.include_router(rutas_auth.router, prefix="/api")
app.include_router(rutas_chat.router, prefix="/api")
app.include_router(rutas_admin.router, prefix="/api")
app.include_router(archivos.router, prefix="/api")
app.include_router(rutas_conversaciones.router, prefix="/api")
app.include_router(rutas_config.router, prefix="/api")


@app.get("/api/salud", tags=["salud"])
def salud() -> dict[str, object]:
    return {
        "ok": True,
        "motor": ajustes.motor,
        "agenteDisponible": ajustes.agente_cwd.is_dir(),
        "apiKeyConfigurada": bool(ajustes.anthropic_api_key),
    }
