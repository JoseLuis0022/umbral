"""Ajustes del backend, leídos de `backend/.env` (y del entorno, que gana).

Todo lo que cambia entre tu laptop y el VPS vive aquí. El código no lee
`os.environ` directamente en ningún otro lugar.
"""

from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

RAIZ_BACKEND = Path(__file__).resolve().parent.parent


class Ajustes(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=RAIZ_BACKEND / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Llave de la API de Anthropic (los créditos del laboratorio). Obligatoria
    # con MOTOR=sdk. Nunca entra al contexto del modelo: viaja como variable de
    # entorno del subproceso `claude`.
    anthropic_api_key: str = ""

    # Firma de los JWT. Si alguien la conoce, puede fabricar tokens de admin.
    jwt_secreto: str = Field(min_length=32)
    jwt_horas: int = 12

    # "sdk" = agente real (gasta tokens). "prueba" = respuestas fijas que hablan
    # el mismo protocolo: sirve para trabajar el front sin gastar.
    motor: Literal["sdk", "prueba"] = "sdk"

    # El `cwd` del agente: la copia completa del agente de Imágenes.
    agente_cwd: Path = RAIZ_BACKEND.parent / "agente-imagenes"

    db_ruta: Path = RAIZ_BACKEND / "lab.db"

    # Directorio de configuración PROPIO del subproceso `claude`. Sin esto, el
    # agente del laboratorio leería tu ~/.claude: tu CLAUDE.md global, tus
    # servidores MCP, tus plugins. Aquí viven también las transcripciones de
    # sesión (lo que `resume` vuelve a cargar).
    config_claude: Path = RAIZ_BACKEND / ".claude-runtime"

    # Cuántos agentes pueden correr a la vez. Cada uno es un subproceso con su
    # propia memoria; en la laptop-VPS, 3 es un número prudente.
    agentes_simultaneos: int = 3


ajustes = Ajustes()
