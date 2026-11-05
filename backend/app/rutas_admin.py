"""/api/admin — lo que ve el administrador: auditoría de consultas y corpus.

Todo aquí exige el permiso "auditoria" (rol `admin`, ver perfiles.py):

    GET /admin/consultas            lista paginada, con filtros
    GET /admin/consultas/{id}       una consulta con la respuesta completa
    GET /admin/resumen              totales y desgloses de los últimos N días
    GET /admin/corpus               los archivos reales de la carpeta del agente
    GET /admin/corpus/archivo       el contenido de uno de esos archivos

Solo lectura: nada de este módulo escribe en la base ni en la carpeta del agente.

El corpus se sirve por LISTA BLANCA. Un archivo solo se entrega si aparece en
el listado de colecciones; además, la ruta resuelta (symlinks incluidos) tiene
que quedar dentro de `agente_cwd`. Así `../`, una ruta absoluta o un enlace que
apunte fuera se rechazan aunque el archivo exista.
"""

import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from . import db
from .config import ajustes
from .esquemas import (
    ArchivoCorpus,
    ColeccionCorpus,
    ConsultaDetalle,
    ConsultaResumida,
    ContenidoArchivo,
    Corpus,
    PaginaConsultas,
    ResumenAuditoria,
    ResumenDia,
    ResumenModelo,
    ResumenUsuario,
    TotalPeriodo,
    UsuarioAuditoria,
)
from .seguridad import requiere_permiso

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(requiere_permiso("auditoria"))])

# ── Auditoría ───────────────────────────────────────────────────────────────


def _fecha_utc(valor: str | None, campo: str) -> str | None:
    """ISO 8601 → ISO en UTC, comparable como texto con `creado_en`."""
    if not valor:
        return None
    try:
        momento = datetime.fromisoformat(valor.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"`{campo}` no es una fecha ISO válida.") from None
    if momento.tzinfo is None:
        momento = momento.replace(tzinfo=timezone.utc)
    return momento.astimezone(timezone.utc).isoformat()


def _usuario(fila: dict[str, Any]) -> UsuarioAuditoria:
    return UsuarioAuditoria(
        id=fila["usuario_id"],
        nombre=fila.get("usuario_nombre"),
        correo=fila.get("usuario_correo"),
        rol=fila.get("usuario_rol"),
    )


def _campos_consulta(fila: dict[str, Any]) -> dict[str, Any]:
    respuesta = fila.get("respuesta") or ""
    extracto = respuesta[: db.LARGO_EXTRACTO].rstrip() + ("…" if len(respuesta) > db.LARGO_EXTRACTO else "")
    return dict(
        id=fila["id"],
        usuario=_usuario(fila),
        conversacion_id=fila["conversacion_id"],
        perfil=fila["perfil"],
        motor=fila["motor"],
        modelo=fila.get("modelo"),
        pregunta=fila["pregunta"],
        extracto=extracto or None,
        costo_usd=fila.get("costo_usd"),
        vueltas=fila.get("vueltas"),
        duracion_ms=fila.get("duracion_ms"),
        tokens={k: int(v) for k, v in (fila.get("tokens") or {}).items() if isinstance(v, (int, float))},
        herramientas=list(fila.get("herramientas") or []),
        estado=fila["estado"],
        error=fila.get("error"),
        creado_en=fila["creado_en"],
    )


@router.get("/consultas", response_model=PaginaConsultas)
def consultas(
    usuario: str | None = Query(default=None, max_length=100, description="Id de la cuenta"),
    perfil: str | None = Query(default=None, max_length=50),
    estado: str | None = Query(default=None, pattern="^(completa|cancelada|error)$"),
    q: str | None = Query(default=None, max_length=200, description="Texto en la pregunta o la respuesta"),
    desde: str | None = Query(default=None, description="ISO 8601"),
    hasta: str | None = Query(default=None, description="ISO 8601"),
    limite: int = Query(default=50, ge=1, le=100),
    antes_de: int | None = Query(default=None, alias="antesDe", ge=1),
) -> PaginaConsultas:
    # Se pide una de más para saber si hay página siguiente sin otro COUNT.
    filas = db.listar_consultas(
        usuario_id=usuario,
        perfil=perfil,
        estado=estado,
        texto=(q or "").strip() or None,
        desde=_fecha_utc(desde, "desde"),
        hasta=_fecha_utc(hasta, "hasta"),
        antes_de=antes_de,
        limite=limite + 1,
    )
    hay_mas = len(filas) > limite
    filas = filas[:limite]
    return PaginaConsultas(
        consultas=[ConsultaResumida(**_campos_consulta(f)) for f in filas],
        siguiente=filas[-1]["id"] if hay_mas and filas else None,
    )


@router.get("/consultas/{consulta_id}", response_model=ConsultaDetalle)
def consulta(consulta_id: int) -> ConsultaDetalle:
    fila = db.consulta_por_id(consulta_id)
    if fila is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa consulta no existe.")
    return ConsultaDetalle(**_campos_consulta(fila), respuesta=fila.get("respuesta"))


@router.get("/resumen", response_model=ResumenAuditoria)
def resumen(dias: int = Query(default=30, ge=1, le=365)) -> ResumenAuditoria:
    hoy = datetime.now(timezone.utc).date()
    primer_dia = hoy - timedelta(days=dias - 1)
    desde = datetime(primer_dia.year, primer_dia.month, primer_dia.day, tzinfo=timezone.utc).isoformat()
    datos = db.resumen_consultas(desde)

    # Los días sin consultas también existen: la serie sale completa, con ceros.
    por_dia = {f["dia"]: f for f in datos["por_dia"]}
    serie = []
    for i in range(dias):
        dia = (primer_dia + timedelta(days=i)).isoformat()
        f = por_dia.get(dia)
        serie.append(ResumenDia(dia=dia, consultas=f["consultas"] if f else 0, costo_usd=f["costo"] if f else 0.0))

    return ResumenAuditoria(
        dias=dias,
        desde=desde,
        historico=TotalPeriodo(consultas=datos["historico"]["consultas"], costo_usd=datos["historico"]["costo"]),
        periodo=TotalPeriodo(consultas=datos["periodo"]["consultas"], costo_usd=datos["periodo"]["costo"]),
        por_estado={f["estado"]: f["consultas"] for f in datos["por_estado"]},
        por_usuario=[
            ResumenUsuario(
                usuario=UsuarioAuditoria(id=f["usuario_id"], nombre=f["nombre"], correo=f["correo"], rol=f["rol"]),
                consultas=f["consultas"],
                costo_usd=f["costo"],
                ultima=f["ultima"],
            )
            for f in datos["por_usuario"]
        ],
        por_modelo=[ResumenModelo(modelo=f["modelo"], consultas=f["consultas"], costo_usd=f["costo"]) for f in datos["por_modelo"]],
        por_dia=serie,
    )


# ── Corpus ──────────────────────────────────────────────────────────────────

# Tope para devolver un archivo de texto entero en JSON.
MAX_BYTES_TEXTO = 3 * 1024 * 1024

_TIPOS = {".md": "md", ".txt": "txt", ".html": "html", ".htm": "html", ".pdf": "pdf"}


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
        "Los apuntes por tema y para cada examen, en HTML (y su PDF cuando existe).",
        "Apuntes",
        (".html", ".pdf"),
    ),
    Coleccion(
        "transcripciones",
        "Transcripciones",
        "Lo que se dijo en cada clase grabada.",
        "Clases/Transcripciones",
        (".txt",),
    ),
    Coleccion(
        "diapositivas",
        "Diapositivas del profesor",
        "Las presentaciones originales en PDF.",
        "Clases",
        (".pdf",),
        recursiva=True,
    ),
    Coleccion(
        "practicas",
        "Prácticas",
        "Entregas calificadas del equipo. El perfil de consulta no puede leerlas.",
        "Prácticas",
        None,
        recursiva=True,
        sensible=True,
    ),
)


def _nfc(texto: str) -> str:
    # macOS guarda los nombres en NFD ("Prácticas" con el acento separado); el
    # navegador manda NFC. Se compara siempre normalizado.
    return unicodedata.normalize("NFC", texto)


def _base() -> Path:
    return ajustes.agente_cwd.resolve()


def _coleccion_de(relativa: str) -> Coleccion | None:
    carpeta, _, nombre = relativa.rpartition("/")
    extension = Path(nombre).suffix.lower()
    for c in COLECCIONES:
        dentro = carpeta == c.carpeta or (c.recursiva and carpeta.startswith(c.carpeta + "/"))
        if dentro and (c.extensiones is None or extension in c.extensiones):
            return c
    return None


def _carpeta_real(base: Path, carpeta: str) -> Path | None:
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
            actual = next(h for h in actual.iterdir() if h.is_dir() and _nfc(h.name) == tramo)
        except (StopIteration, OSError):
            return None
    return actual


def _indice() -> dict[str, tuple[Coleccion, Path]]:
    """{ruta relativa NFC: (colección, ruta real)} de todo lo que se puede servir."""
    base = _base()
    indice: dict[str, tuple[Coleccion, Path]] = {}
    if not base.is_dir():
        return indice
    for c in COLECCIONES:
        raiz = _carpeta_real(base, c.carpeta)
        if raiz is None:
            continue
        candidatos = raiz.rglob("*") if c.recursiva else raiz.iterdir()
        for ruta in candidatos:
            if ruta.name.startswith(".") or not ruta.is_file():
                continue
            # Un enlace que apunte fuera de la carpeta ni siquiera se lista.
            if not ruta.resolve().is_relative_to(base):
                continue
            try:
                relativa = _nfc(ruta.relative_to(base).as_posix())
            except ValueError:
                continue
            if relativa in indice:
                continue
            if _coleccion_de(relativa) is c:
                indice[relativa] = (c, ruta)
    return indice


def _tipo(nombre: str) -> str:
    return _TIPOS.get(Path(nombre).suffix.lower(), "otro")


def _archivo(relativa: str, ruta: Path) -> ArchivoCorpus:
    info = ruta.stat()
    return ArchivoCorpus(
        ruta=relativa,
        nombre=_nfc(ruta.name),
        tipo=_tipo(ruta.name),  # type: ignore[arg-type]
        tamano_bytes=info.st_size,
        modificado=datetime.fromtimestamp(info.st_mtime, timezone.utc).isoformat(),
    )


@router.get("/corpus", response_model=Corpus)
def corpus() -> Corpus:
    if not _base().is_dir():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "No encontramos la carpeta del agente en el servidor.")
    por_coleccion: dict[str, list[ArchivoCorpus]] = {c.id: [] for c in COLECCIONES}
    for relativa, (c, ruta) in _indice().items():
        por_coleccion[c.id].append(_archivo(relativa, ruta))
    return Corpus(
        colecciones=[
            ColeccionCorpus(
                id=c.id,
                nombre=c.nombre,
                descripcion=c.descripcion,
                sensible=c.sensible,
                archivos=sorted(por_coleccion[c.id], key=lambda a: a.ruta.casefold()),
            )
            for c in COLECCIONES
        ]
    )


def _resolver(ruta: str) -> tuple[str, Path]:
    """Valida la ruta pedida y devuelve (relativa NFC, ruta real dentro de la base)."""
    if not ruta or "\x00" in ruta or "\\" in ruta:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ruta inválida.")
    pedida = Path(ruta)
    if pedida.is_absolute() or ".." in pedida.parts:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ruta inválida.")

    base = _base()
    relativa = _nfc(pedida.as_posix())
    entrada = _indice().get(relativa)
    if entrada is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese archivo no está en el corpus.")

    # Segunda barrera: aunque esté en la lista, la ruta REAL (siguiendo
    # symlinks) tiene que quedar dentro de la carpeta del agente.
    real = entrada[1].resolve()
    if not real.is_relative_to(base) or not real.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese archivo no está en el corpus.")
    return relativa, real


@router.get("/corpus/archivo", response_model=ContenidoArchivo)
def archivo(ruta: str = Query(min_length=1, max_length=500)):  # noqa: ANN201 — JSON o PDF
    relativa, real = _resolver(ruta)
    tipo = _tipo(real.name)
    if tipo == "pdf":
        return FileResponse(real, media_type="application/pdf", filename=_nfc(real.name), content_disposition_type="inline")
    if tipo == "otro":
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Este tipo de archivo no se puede previsualizar.")
    tamano = real.stat().st_size
    if tamano > MAX_BYTES_TEXTO:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "El archivo es demasiado grande para mostrarlo.")
    return ContenidoArchivo(
        ruta=relativa,
        nombre=_nfc(real.name),
        tipo=tipo,  # type: ignore[arg-type]
        tamano_bytes=tamano,
        contenido=real.read_bytes().decode("utf-8", errors="replace"),
    )
