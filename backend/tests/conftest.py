"""Entorno de las pruebas: base temporal, carpeta de agente falsa y MOTOR=prueba.

La configuración (`app.config.ajustes`) se lee al IMPORTAR la app, así que las
variables van antes de cualquier `import app…`. Las variables de entorno ganan
sobre `backend/.env`: las pruebas nunca tocan la base ni la API key reales, y
el motor de prueba responde sin llamar a Claude (no gasta tokens).
"""

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

_RAIZ = Path(tempfile.mkdtemp(prefix="umbral-pruebas-"))
AGENTE = _RAIZ / "agente"

# Una carpeta de agente mínima: material público, una carpeta privada y el
# prompt privado (.umbral), más un "secreto" FUERA de la carpeta.
for relativa, contenido in {
    "Apuntes/Tema 01 - Histograma.html": "<section><h2>Histograma</h2><p>mediana</p></section>",
    "Clases/Transcripciones/Clase 1 - 1 ago.txt": "Hoy vemos el filtro de mediana.",
    "Prácticas/Práctica 1.pdf": "entrega calificada",
    ".umbral/prompts/consulta.md": "prompt privado",
}.items():
    archivo = AGENTE / relativa
    archivo.parent.mkdir(parents=True, exist_ok=True)
    archivo.write_text(contenido, encoding="utf-8")
(_RAIZ / "secreto.env").write_text("ANTHROPIC_API_KEY=no-deberias-verme", encoding="utf-8")

os.environ.update(
    {
        "JWT_SECRETO": "secreto-de-pruebas-con-mas-de-32-caracteres-xx",
        "MOTOR": "prueba",
        "AGENTE_CWD": str(AGENTE),
        "DB_RUTA": str(_RAIZ / "pruebas.db"),
        "CONFIG_CLAUDE": str(_RAIZ / "claude"),
        "CARPETAS_PRIVADAS": "Prácticas",
        "ANTHROPIC_API_KEY": "",
        "CONFIAR_CLOUDFLARE": "false",
        "DOCS_API": "false",
    }
)

from fastapi.testclient import TestClient  # noqa: E402

from app import correo, db, rutas_auth, trabajos  # noqa: E402
from app.main import app  # noqa: E402
from app.seguridad import emitir_token, hashear  # noqa: E402

CONTRASENA = "contrasena-segura-1"


@pytest.fixture(scope="session")
def raiz() -> Path:
    return _RAIZ


@pytest.fixture
def cliente() -> Iterator[TestClient]:
    # Los frenos de fallos y los trabajos viven en memoria: se limpian para que
    # una prueba no herede los intentos ni las tareas de otra.
    rutas_auth._fallos.clear()
    with TestClient(app) as c:
        yield c
    rutas_auth._fallos.clear()
    trabajos._trabajos.clear()


@pytest.fixture
def buzon(monkeypatch: pytest.MonkeyPatch) -> list[dict[str, str]]:
    """Correo falso: guarda cada envío en vez de mandarlo y deja el registro abierto."""
    enviados: list[dict[str, str]] = []

    async def enviar(para: str, asunto: str, html: str, texto: str) -> None:
        enviados.append({"para": para, "asunto": asunto, "texto": texto})

    monkeypatch.setattr(correo, "enviar", enviar)
    monkeypatch.setattr(correo, "leer_config", lambda: correo.ConfigCorreo("umbral@ejemplo.com", "x", "Umbral", None, "https://umbral.test"))
    return enviados


_contador = 0


def correo_unico(prefijo: str = "persona") -> str:
    global _contador
    _contador += 1
    return f"{prefijo}{_contador}@ejemplo.com"


def crear_cuenta(rol: str = "usuario", direccion: str | None = None) -> tuple[db.Usuario, str]:
    """Cuenta verificada con su token de sesión."""
    usuario = db.crear_usuario(direccion or correo_unico(rol), "Ana Prueba", rol, hashear(CONTRASENA))
    return usuario, emitir_token(usuario)


def autorizacion(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
