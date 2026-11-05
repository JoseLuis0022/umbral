"""Contratos de entrada y salida de la API (Pydantic).

En Python los campos van en snake_case; en el JSON salen en camelCase, que es
como los espera el front (`conversacionId`, `systemPrompt`…).
"""

import base64
import binascii
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel

from . import db
from .perfiles import Perfil, perfiles_de, rol


class Modelo(BaseModel):
    # extra="ignore": si el front manda campos que el backend no usa
    # (`temperatura`, `corpusId`), se descartan en vez de fallar.
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")


class Credenciales(Modelo):
    correo: str = Field(min_length=3, max_length=200)
    contrasena: str = Field(min_length=1, max_length=200)


class UsuarioPublico(Modelo):
    id: str
    nombre: str
    correo: str
    area: str
    rol: str
    iniciales: str


class PerfilPublico(Modelo):
    id: str
    nombre: str
    descripcion: str


class Yo(Modelo):
    usuario: UsuarioPublico
    perfiles: list[PerfilPublico]
    # Para que el front MUESTRE u oculte (p. ej. el selector de modelo). Quien
    # decide sigue siendo el backend en cada petición.
    permisos: list[str]


class SesionIniciada(Yo):
    token: str


Esfuerzo = Literal["low", "medium", "high", "xhigh", "max"]


class ParametrosChat(Modelo):
    """Ajustes de modelo. Solo los acepta un rol con permiso "parametros"."""

    modelo: str | None = Field(default=None, max_length=100)
    # Niveles nativos del Agent SDK (`effort`).
    esfuerzo: Esfuerzo | None = None
    system_prompt: str | None = Field(default=None, max_length=20_000)
    # Abrir sesión nueva en vez de reanudar. No es privilegiado.
    reiniciar_memoria: bool = False

    def pide_ajustes(self) -> bool:
        return any(v not in (None, "") for v in (self.modelo, self.esfuerzo, self.system_prompt))


# La API de Anthropic acepta estos cuatro formatos y hasta 5 MB por imagen. El
# front ya las reduce a ~1568 px por lado antes de enviarlas (más no le sirve al
# modelo y se paga igual), así que en la práctica llegan de unos cientos de KB.
TipoImagen = Literal["image/jpeg", "image/png", "image/webp", "image/gif"]
MAX_BYTES_IMAGEN = 5 * 1024 * 1024


class ImagenAdjunta(Modelo):
    nombre: str = Field(max_length=200)
    tipo: TipoImagen
    # Base64 SIN el prefijo "data:…;base64,".
    datos: str = Field(min_length=1, max_length=(MAX_BYTES_IMAGEN * 4) // 3 + 4)

    @field_validator("datos")
    @classmethod
    def base64_valido(cls, valor: str) -> str:
        try:
            crudo = base64.b64decode(valor, validate=True)
        except binascii.Error:
            raise ValueError("La imagen no es base64 válido.") from None
        if len(crudo) > MAX_BYTES_IMAGEN:
            raise ValueError("La imagen pesa más de 5 MB.")
        return valor


class PeticionChat(Modelo):
    conversacion_id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.:\-]+$")
    mensaje: str = Field(default="", max_length=8_000)
    imagenes: list[ImagenAdjunta] = Field(default_factory=list, max_length=5)
    perfil: str = "consulta"
    parametros: ParametrosChat | None = None

    @model_validator(mode="after")
    def con_contenido(self) -> "PeticionChat":
        if not self.mensaje.strip() and not self.imagenes:
            raise ValueError("Escribe un mensaje o adjunta una imagen.")
        return self


class ModeloDisponible(Modelo):
    id: str
    nombre: str


def iniciales(nombre: str) -> str:
    partes = [p for p in nombre.split() if p]
    return "".join(p[0] for p in partes[:2]).upper() or "?"


def publico(usuario: db.Usuario) -> Yo:
    perfiles: list[Perfil] = perfiles_de(usuario.rol)
    return Yo(
        usuario=UsuarioPublico(
            id=usuario.id,
            nombre=usuario.nombre,
            correo=usuario.correo,
            area=usuario.area,
            rol=usuario.rol,
            iniciales=iniciales(usuario.nombre),
        ),
        perfiles=[PerfilPublico(id=p.id, nombre=p.nombre, descripcion=p.descripcion) for p in perfiles],
        permisos=list(rol(usuario.rol).permisos),
    )


# ── Administración: auditoría y corpus ──────────────────────────────────────


class UsuarioAuditoria(Modelo):
    id: str
    # La cuenta pudo borrarse después de preguntar: el registro se conserva.
    nombre: str | None = None
    correo: str | None = None
    rol: str | None = None


class ConsultaResumida(Modelo):
    id: int
    usuario: UsuarioAuditoria
    conversacion_id: str
    perfil: str
    motor: str
    modelo: str | None = None
    pregunta: str
    # Los primeros caracteres de la respuesta; la completa, en el detalle.
    extracto: str | None = None
    costo_usd: float | None = None
    vueltas: int | None = None
    duracion_ms: int | None = None
    tokens: dict[str, int] = Field(default_factory=dict)
    herramientas: list[str] = Field(default_factory=list)
    estado: str
    error: str | None = None
    creado_en: str


class ConsultaDetalle(ConsultaResumida):
    respuesta: str | None = None


class PaginaConsultas(Modelo):
    consultas: list[ConsultaResumida]
    # Id para pedir la página siguiente (`antesDe`); None = no hay más.
    siguiente: int | None = None


class TotalPeriodo(Modelo):
    consultas: int
    costo_usd: float


class ResumenUsuario(Modelo):
    usuario: UsuarioAuditoria
    consultas: int
    costo_usd: float
    ultima: str | None = None


class ResumenModelo(Modelo):
    modelo: str
    consultas: int
    costo_usd: float


class ResumenDia(Modelo):
    dia: str  # AAAA-MM-DD (UTC)
    consultas: int
    costo_usd: float


class ResumenAuditoria(Modelo):
    dias: int
    desde: str
    historico: TotalPeriodo
    periodo: TotalPeriodo
    por_estado: dict[str, int]
    por_usuario: list[ResumenUsuario]
    por_modelo: list[ResumenModelo]
    por_dia: list[ResumenDia]


TipoArchivo = Literal["md", "txt", "html", "pdf", "otro"]


class ArchivoCorpus(Modelo):
    ruta: str  # relativa a la carpeta del agente, con "/"
    nombre: str
    tipo: TipoArchivo
    tamano_bytes: int
    modificado: str


class ColeccionCorpus(Modelo):
    id: str
    nombre: str
    descripcion: str
    sensible: bool = False
    archivos: list[ArchivoCorpus]


class Corpus(Modelo):
    colecciones: list[ColeccionCorpus]


class ContenidoArchivo(Modelo):
    ruta: str
    nombre: str
    tipo: TipoArchivo
    tamano_bytes: int
    contenido: str
