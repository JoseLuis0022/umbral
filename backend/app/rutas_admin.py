"""/api/admin — lo que ve el administrador: auditoría de consultas y corpus.

Todo aquí exige el permiso "auditoria" (rol `admin`, ver perfiles.py):

    GET /admin/consultas            lista paginada, con filtros
    GET /admin/consultas/{id}       una consulta con la respuesta completa
    GET /admin/resumen              totales y desgloses de los últimos N días
    GET /admin/corpus               los archivos reales de la carpeta del agente
    GET /admin/corpus/archivo       el contenido de uno de esos archivos

Solo lectura: nada de este módulo escribe en la base ni en la carpeta del agente.

El corpus se sirve por LISTA BLANCA: las colecciones y las comprobaciones de
ruta viven en corpus.py, compartidas con la descarga del chat (archivos.py).
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from . import corpus as material
from . import db
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

@router.get("/corpus", response_model=Corpus)
def corpus() -> Corpus:
    if not material.base().is_dir():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "No encontramos la carpeta del agente en el servidor.")
    por_coleccion: dict[str, list[ArchivoCorpus]] = {c.id: [] for c in material.COLECCIONES}
    for relativa, (c, ruta) in material.indice().items():
        por_coleccion[c.id].append(material.archivo(relativa, ruta))
    return Corpus(
        colecciones=[
            ColeccionCorpus(
                id=c.id,
                nombre=c.nombre,
                descripcion=c.descripcion,
                carpeta=c.carpeta,
                sensible=c.sensible,
                compartible=c.compartible,
                archivos=sorted(por_coleccion[c.id], key=lambda a: a.ruta.casefold()),
            )
            for c in material.COLECCIONES
        ]
    )


@router.get("/corpus/archivo", response_model=ContenidoArchivo)
def archivo(ruta: str = Query(min_length=1, max_length=500)):  # noqa: ANN201 — JSON o PDF
    relativa, real = material.resolver(ruta)
    tipo = material.tipo(real.name)
    if tipo == "imagen":
        return FileResponse(real, media_type=material.TIPOS_IMAGEN[real.suffix.lower()])
    if tipo == "pdf":
        return FileResponse(real, media_type="application/pdf", filename=material.nfc(real.name), content_disposition_type="inline")
    if tipo == "otro":
        raise HTTPException(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, "Este tipo de archivo no se puede previsualizar.")
    tamano = real.stat().st_size
    if tamano > material.MAX_BYTES_TEXTO:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "El archivo es demasiado grande para mostrarlo.")
    return ContenidoArchivo(
        ruta=relativa,
        nombre=material.nfc(real.name),
        tipo=tipo,  # type: ignore[arg-type]
        tamano_bytes=tamano,
        contenido=real.read_bytes().decode("utf-8", errors="replace"),
    )
