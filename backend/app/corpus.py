"""El material del agente: qué archivos existen, de qué colección y cuáles se sirven.

Lista blanca compartida por dos lectores:

- el administrador (rutas_admin: Corpus), que puede ver todas las colecciones;
- el chat (archivos.py), que solo entrega las colecciones `compartible`.

Un archivo solo se entrega si aparece en el índice de colecciones; además, la
ruta resuelta (symlinks incluidos) tiene que quedar dentro de `agente_cwd`.
Así `../`, una ruta absoluta o un enlace que apunte fuera se rechazan aunque
el archivo exista.
"""

import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, status

from .config import ajustes
from .esquemas import ArchivoCorpus

# Tope para devolver un archivo de texto entero en JSON.
MAX_BYTES_TEXTO = 3 * 1024 * 1024

_TIPOS = {
    ".md": "md", ".txt": "txt", ".html": "html", ".htm": "html", ".pdf": "pdf",
    ".png": "imagen", ".jpg": "imagen", ".jpeg": "imagen", ".webp": "imagen", ".gif": "imagen",
}

# Para servir imágenes con su tipo MIME correcto.
TIPOS_IMAGEN = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}


@dataclass(frozen=True)
class Coleccion:
    id: str
    nombre: str
    descripcion: str
    # Carpeta (relativa, en NFC) y si se incluyen subcarpetas.
    carpeta: str
    extensiones: tuple[str, ...] | None  # None = cualquiera
    recursiva: bool = False
    sensible: bool = False
    # El agente puede mandársela al usuario por el chat (compartir_archivo).
    compartible: bool = False


# El orden importa: un archivo pertenece a la PRIMERA colección que lo acepta
# (estado/inventario/*.md no debe caer también en estado/*.md).
COLECCIONES: tuple[Coleccion, ...] = (
    Coleccion(
        "inventario",
        "Resúmenes de clases y prácticas",
        "Lo que el agente sabe de cada clase y cada práctica. Es lo primero que consulta.",
        "estado/inventario",
        (".md",),
    ),
    Coleccion(
        "mapa",
        "Mapa y calendario",
        "Índice de temas, calendario de la materia y bitácora de cambios.",
        "estado",
        (".md",),
    ),
    Coleccion(
        "diapositivas-resumen",
        "Resúmenes de diapositivas",
        "Resumen por página de cada presentación del profesor.",
        "estado/diapositivas",
        (".md",),
    ),
    Coleccion(
        "apuntes",
        "Apuntes",
        "Los apuntes por tema y para cada examen (HTML y PDF), con sus figuras e imágenes.",
        "Apuntes",
        # Con subcarpetas e imágenes: las figuras de Apuntes/img y lo que el
        # generador produzca aquí (p. ej. un PDF pasado a PNG) se pueden mandar.
        (".html", ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"),
        recursiva=True,
        compartible=True,
    ),
    Coleccion(
        "transcripciones",
        "Transcripciones",
        "Lo que se dijo en cada clase grabada.",
        ajustes.carpeta_transcripciones,
        (".txt",),
        compartible=True,
    ),
    Coleccion(
        "diapositivas",
        "Diapositivas del profesor",
        "Las presentaciones originales en PDF.",
        ajustes.carpeta_clases,
        (".pdf",),
        recursiva=True,
        compartible=True,
    ),
)


def nfc(texto: str) -> str:
    # macOS guarda los nombres en NFD ("Prácticas" con el acento separado); el
    # navegador manda NFC. Se compara siempre normalizado.
    return unicodedata.normalize("NFC", texto)


def base() -> Path:
    return ajustes.agente_cwd.resolve()


def coleccion_de(relativa: str) -> Coleccion | None:
    carpeta, _, nombre = relativa.rpartition("/")
    extension = Path(nombre).suffix.lower()
    for c in COLECCIONES:
        dentro = carpeta == c.carpeta or (c.recursiva and carpeta.startswith(c.carpeta + "/"))
        if dentro and (c.extensiones is None or extension in c.extensiones):
            return c
    return None


def carpeta_real(base: Path, carpeta: str) -> Path | None:
    """Encuentra `carpeta` bajo `base` comparando cada tramo en NFC.

    En macOS (APFS) da igual cómo venga normalizado el nombre; en Linux no, y
    una copia hecha desde una Mac conserva los nombres en NFD.
    """
    actual = base
    for tramo in carpeta.split("/"):
        directo = actual / tramo
        if directo.is_dir():
            actual = directo
            continue
        try:
            actual = next(h for h in actual.iterdir() if h.is_dir() and nfc(h.name) == tramo)
        except (StopIteration, OSError):
            return None
    return actual


def indice() -> dict[str, tuple[Coleccion, Path]]:
    """{ruta relativa NFC: (colección, ruta real)} de todo lo que se puede servir."""
    carpeta_base = base()
    indice: dict[str, tuple[Coleccion, Path]] = {}
    if not carpeta_base.is_dir():
        return indice
    for c in COLECCIONES:
        raiz = carpeta_real(carpeta_base, c.carpeta)
        if raiz is None:
            continue
        candidatos = raiz.rglob("*") if c.recursiva else raiz.iterdir()
        for ruta in candidatos:
            if ruta.name.startswith(".") or not ruta.is_file():
                continue
            # Un enlace que apunte fuera de la carpeta ni siquiera se lista.
            if not ruta.resolve().is_relative_to(carpeta_base):
                continue
            try:
                relativa = nfc(ruta.relative_to(carpeta_base).as_posix())
            except ValueError:
                continue
            if relativa in indice:
                continue
            if coleccion_de(relativa) is c:
                indice[relativa] = (c, ruta)
    return indice


def tipo(nombre: str) -> str:
    return _TIPOS.get(Path(nombre).suffix.lower(), "otro")


def archivo(relativa: str, ruta: Path) -> ArchivoCorpus:
    info = ruta.stat()
    return ArchivoCorpus(
        ruta=relativa,
        nombre=nfc(ruta.name),
        tipo=tipo(ruta.name),  # type: ignore[arg-type]
        tamano_bytes=info.st_size,
        modificado=datetime.fromtimestamp(info.st_mtime, timezone.utc).isoformat(),
    )


def resolver(ruta: str) -> tuple[str, Path]:
    """Valida la ruta pedida y devuelve (relativa NFC, ruta real dentro de la base)."""
    if not ruta or "\x00" in ruta or "\\" in ruta:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ruta inválida.")
    pedida = Path(ruta)
    if pedida.is_absolute() or ".." in pedida.parts:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ruta inválida.")

    carpeta_base = base()
    relativa = nfc(pedida.as_posix())
    entrada = indice().get(relativa)
    if entrada is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese archivo no está en el corpus.")

    # Segunda barrera: aunque esté en la lista, la ruta REAL (siguiendo
    # symlinks) tiene que quedar dentro de la carpeta del agente.
    real = entrada[1].resolve()
    if not real.is_relative_to(carpeta_base) or not real.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese archivo no está en el corpus.")
    return relativa, real


