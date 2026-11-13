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

    # Cómo se llaman las carpetas del material DENTRO de la carpeta del agente
    # (relativas a ella). Cada curso las nombra a su manera; el código no
    # asume nombres de nadie. Ver también `<agente>/.umbral/prompts/`.
    carpeta_clases: str = "Clases"  # diapositivas en PDF (con subcarpetas)
    carpeta_transcripciones: str = "Clases/Transcripciones"  # "Clase N - <fecha>.txt"
    # Material que NINGÚN perfil de consulta puede leer (p. ej. entregas
    # calificadas). Separadas por coma.
    carpetas_privadas: str = "Prácticas"

    db_ruta: Path = RAIZ_BACKEND / "lab.db"

    # Directorio de configuración PROPIO del subproceso `claude`. Sin esto, el
    # agente del laboratorio leería tu ~/.claude: tu CLAUDE.md global, tus
    # servidores MCP, tus plugins. Aquí viven también las transcripciones de
    # sesión (lo que `resume` vuelve a cargar).
    config_claude: Path = RAIZ_BACKEND / ".claude-runtime"

    # IP del cliente. Con True se usa `CF-Connecting-IP` (la pone Cloudflare).
    # Solo es seguro si NADIE puede llegar a nginx sin pasar por Cloudflare
    # (túnel + puerto publicado en 127.0.0.1, ver ENLACE en .env.example): si
    # no, cualquiera inventa ese encabezado y se salta los límites por IP.
    # Con False se usa la IP que vio nginx (`X-Real-IP`).
    confiar_cloudflare: bool = False

    # /api/docs y /api/openapi.json. Apagados por defecto: en producción no
    # hace falta publicar el mapa completo de la API.
    docs_api: bool = False

    # Cuántos agentes pueden correr a la vez. Cada uno es un subproceso con su
    # propia memoria; en la laptop-VPS, 3 es un número prudente.
    agentes_simultaneos: int = 3


ajustes = Ajustes()
