"""Material que el agente le manda al usuario por el chat.

Dos piezas, una por capa:

- La HERRAMIENTA `compartir_archivo` (capa 3). Es una herramienta propia,
  servida por un servidor MCP dentro del mismo proceso (`create_sdk_mcp_server`).
  El modelo la llama con una ruta; aquí se valida y se le contesta qué pasó. El
  motor ve el resultado y emite el evento `archivo` del protocolo, que el front
  pinta como una tarjeta.

- El ENDPOINT `GET /api/archivos` (capa 2). Entrega el archivo a quien tenga
  sesión. El navegador nunca recibe una ruta que el agente pueda inventar sin
  control: la descarga vuelve a pasar por la lista blanca.

Qué se puede compartir lo decide `corpus.COLECCIONES` (las marcadas
`compartible`: apuntes, diapositivas y transcripciones). Las entregas
privadas y los archivos internos del agente (estado/) nunca salen, aunque el
modelo lo intente: la regla vive en código, no en el prompt.
"""

from pathlib import PurePosixPath
from typing import Any

from claude_agent_sdk import McpSdkServerConfig, create_sdk_mcp_server, tool
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from . import corpus
from .esquemas import ContenidoArchivo
from .seguridad import usuario_actual

SERVIDOR_MCP = "umbral"
NOMBRE_HERRAMIENTA = "compartir_archivo"
# Así la nombra Claude Code: mcp__<servidor>__<herramienta>.
HERRAMIENTA = f"mcp__{SERVIDOR_MCP}__{NOMBRE_HERRAMIENTA}"

router = APIRouter(prefix="/archivos", tags=["archivos"], dependencies=[Depends(usuario_actual)])


class NoCompartible(Exception):
    """La ruta no es material que se pueda mandar. El mensaje es para el modelo."""


def resolver_compartible(ruta: str, bloqueadas: tuple[str, ...] = ()) -> tuple[str, Any, corpus.Coleccion]:
    """(relativa NFC, ruta real, colección) de un archivo que SÍ se puede mandar."""
    limpia = ruta.strip().removeprefix("./")
    base = str(corpus.base())
    if limpia.startswith(base + "/"):
        # El modelo a veces usa la ruta absoluta que le devolvió Glob.
        limpia = limpia[len(base) + 1 :]
    try:
        relativa, real = corpus.resolver(limpia)
    except HTTPException:
        raise NoCompartible(
            f"No existe «{ruta}» en el material del curso. Usa la ruta relativa exacta que te dio Glob."
        ) from None
    coleccion = corpus.coleccion_de(relativa)
    if coleccion is None or not coleccion.compartible:
        raise NoCompartible(
            "Ese archivo es interno o privado y no se puede mandar. "
            "Solo se comparten apuntes (con sus imágenes, dentro de Apuntes/), diapositivas del "
            "profesor y transcripciones. Si generaste archivos, guárdalos dentro de Apuntes/."
        )
    partes = PurePosixPath(relativa).parts
    for b in bloqueadas:
        if partes[: len(PurePosixPath(corpus.nfc(b)).parts)] == PurePosixPath(corpus.nfc(b)).parts:
            raise NoCompartible("Ese archivo no está disponible en este modo.")
    return relativa, real, coleccion


def ficha(relativa: str, real: Any, coleccion: corpus.Coleccion) -> dict[str, Any]:
    """Lo que viaja en el evento `archivo`: lo justo para pintar la tarjeta."""
    return {
        "ruta": relativa,
        "nombre": corpus.nfc(real.name),
        # `formato` y no `tipo`: `tipo` ya es el nombre del evento.
        "formato": corpus.tipo(real.name),
        "tamanoBytes": real.stat().st_size,
        "coleccion": coleccion.nombre,
    }


def servidor_mcp(bloqueadas: tuple[str, ...]) -> McpSdkServerConfig:
    """El servidor MCP en proceso con la herramienta, atado a las rutas bloqueadas del perfil."""

    @tool(
        NOMBRE_HERRAMIENTA,
        (
            "Manda al usuario un archivo del material del curso: apuntes (HTML, PDF e imágenes PNG/JPG "
            "dentro de Apuntes/, incluidas sus subcarpetas), diapositivas del profesor en PDF o "
            "transcripciones de clase. Un documento llega como tarjeta para abrir y descargar; las "
            "imágenes, como galería. Úsala cuando pida un archivo, un PDF, unas diapositivas, unas "
            "imágenes o 'mándame / pásame' algo. `ruta` es relativa a la carpeta del curso, como la "
            "devolvió Glob. Llámala una vez por archivo; para muchas imágenes, llámala varias veces."
        ),
        {"ruta": str},
    )
    async def compartir(args: dict[str, Any]) -> dict[str, Any]:
        try:
            relativa, real, coleccion = resolver_compartible(str(args.get("ruta", "")), bloqueadas)
        except NoCompartible as e:
            return {"content": [{"type": "text", "text": str(e)}], "is_error": True}
        return {
            "content": [
                {
                    "type": "text",
                    "text": (
                        f"Listo: el usuario ya ve la tarjeta de «{corpus.nfc(real.name)}» ({coleccion.nombre}). "
                        "No repitas la ruta ni digas que no puedes mandar archivos; basta una frase breve."
                    ),
                }
            ]
        }

    return create_sdk_mcp_server(SERVIDOR_MCP, tools=[compartir])


@router.get("", response_model=ContenidoArchivo)
def descargar(ruta: str = Query(min_length=1, max_length=500)):  # noqa: ANN201 — JSON o PDF
    """Mismo contrato que /admin/corpus/archivo, pero solo con material compartible.

    PDF → el archivo. Texto (html, txt) → JSON con el contenido: el front lo
    muestra en un iframe sin permisos o como texto, nunca como página de
    nuestro origen (un apunte HTML podría traer JavaScript).
    """
    try:
        relativa, real, _ = resolver_compartible(ruta)
    except NoCompartible:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese archivo no está disponible.") from None
    tipo = corpus.tipo(real.name)
    if tipo == "imagen":
        return FileResponse(real, media_type=corpus.TIPOS_IMAGEN[real.suffix.lower()])
    if tipo == "pdf":
        return FileResponse(real, media_type="application/pdf", filename=corpus.nfc(real.name), content_disposition_type="inline")
    if tipo == "otro":
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Este tipo de archivo no se puede abrir.")
    tamano = real.stat().st_size
    if tamano > corpus.MAX_BYTES_TEXTO:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "El archivo es demasiado grande para mostrarlo.")
    return ContenidoArchivo(
        ruta=relativa,
        nombre=corpus.nfc(real.name),
        tipo=tipo,  # type: ignore[arg-type]
        tamano_bytes=tamano,
        contenido=real.read_bytes().decode("utf-8", errors="replace"),
    )
