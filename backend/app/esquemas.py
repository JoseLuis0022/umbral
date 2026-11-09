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


def _plan(usuario: db.Usuario) -> "PlanPublico | None":
    from . import planes  # import tardío: planes → correo → db, sin ciclos con este módulo

    e = planes.estado(usuario)
    if e is None:
        return None
    return PlanPublico(
        tipo=e.tipo,
        gastado_usd=round(e.gastado_usd, 4),
        limite_usd=e.limite_usd,
        modelo=e.modelo,
        contacto=e.contacto,
        agotado=e.agotado,
    )


class Registro(Modelo):
    nombre: str = Field(min_length=2, max_length=80)
    correo: str = Field(min_length=5, max_length=200)
    contrasena: str = Field(min_length=8, max_length=200)


class TokenVerificacion(Modelo):
    token: str = Field(min_length=20, max_length=200)


class CodigoVerificacion(Modelo):
    correo: str = Field(min_length=3, max_length=200)
    codigo: str = Field(pattern=r"^\d{6}$")


class SoloCorreo(Modelo):
    correo: str = Field(min_length=3, max_length=200)


class ConfigCorreoPublica(Modelo):
    usuario: str | None
    configurada: bool
    remitente: str
    contacto: str | None
    url_publica: str


class ConfigCorreoEntrada(Modelo):
    usuario: str | None = Field(default=None, max_length=200)
    # None = no cambiarla; "" = borrarla.
    contrasena: str | None = Field(default=None, max_length=200)
    remitente: str | None = Field(default=None, max_length=80)
    contacto: str | None = Field(default=None, max_length=200)
    url_publica: str | None = Field(default=None, max_length=300)


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
    # Modelo con el que contesta si nadie elige otro (el "Automático" del selector).
    modelo: str | None = None


class PlanPublico(Modelo):
    """Solo para cuentas con tope (invitado): para mostrar el crédito y el aviso."""

    tipo: str
    gastado_usd: float
    limite_usd: float
    modelo: str | None
    contacto: str | None
    agotado: bool


class Yo(Modelo):
    usuario: UsuarioPublico
    perfiles: list[PerfilPublico]
    plan: PlanPublico | None = None
    # Para que el front MUESTRE u oculte (p. ej. el selector de modelo). Quien
    # decide sigue siendo el backend en cada petición.
    permisos: list[str]


class SesionIniciada(Yo):
    token: str


class ResultadoVerificacion(Modelo):
    """`sesion` es None cuando el enlace ya se había usado: la cuenta está
    activa, pero un enlace reabierto no abre sesión (pudo abrirlo otro, p. ej.
    el lector de enlaces del correo); la persona entra con su contraseña."""

    verificada: bool
    sesion: SesionIniciada | None = None


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


# La API de Anthropic acepta peticiones de hasta 32 MB. Todo lo adjunto (en
# base64 o texto) se acota por debajo, con margen para el resto del cuerpo.
MAX_BYTES_ADJUNTOS = 30 * 1024 * 1024
# La API admite hasta 100 imágenes por petición; un video llega como fotogramas.
MAX_IMAGENES = 100
MAX_DOCUMENTOS = 10


class DocumentoAdjunto(Modelo):
    """Un PDF (base64) o un texto (html ya convertido, md, csv, código…)."""

    nombre: str = Field(max_length=200)
    formato: Literal["pdf", "texto"]
    datos: str = Field(min_length=1, max_length=MAX_BYTES_ADJUNTOS)

    @model_validator(mode="after")
    def pdf_en_base64(self) -> "DocumentoAdjunto":
        if self.formato == "pdf":
            try:
                crudo = base64.b64decode(self.datos, validate=True)
            except binascii.Error:
                raise ValueError("El PDF no es base64 válido.") from None
            if not crudo.startswith(b"%PDF"):
                raise ValueError("El archivo no es un PDF.")
        return self


class PeticionChat(Modelo):
    conversacion_id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.:\-]+$")
    mensaje: str = Field(default="", max_length=8_000)
    imagenes: list[ImagenAdjunta] = Field(default_factory=list, max_length=MAX_IMAGENES)
    documentos: list[DocumentoAdjunto] = Field(default_factory=list, max_length=MAX_DOCUMENTOS)
    perfil: str = "consulta"
    parametros: ParametrosChat | None = None

    @model_validator(mode="after")
    def con_contenido(self) -> "PeticionChat":
        if not self.mensaje.strip() and not self.imagenes and not self.documentos:
            raise ValueError("Escribe un mensaje o adjunta un archivo.")
        total = sum(len(i.datos) for i in self.imagenes) + sum(len(d.datos) for d in self.documentos)
        if total > MAX_BYTES_ADJUNTOS:
            raise ValueError("Los adjuntos superan lo que admite una petición a la API (~22 MB).")
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
        # Si el rol fuerza el modelo (invitado), ese es el que se muestra.
        perfiles=[
            PerfilPublico(
                id=p.id, nombre=p.nombre, descripcion=p.descripcion, modelo=rol(usuario.rol).modelo_forzado or p.modelo
            )
            for p in perfiles
        ],
        permisos=list(rol(usuario.rol).permisos),
        plan=_plan(usuario),
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


TipoArchivo = Literal["md", "txt", "html", "pdf", "imagen", "otro"]


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
    # Carpeta de la colección, relativa a la del agente: el front agrupa los
    # archivos por las subcarpetas que cuelgan de aquí.
    carpeta: str
    sensible: bool = False
    # El agente puede mandar sus archivos por el chat (compartir_archivo).
    compartible: bool = False
    archivos: list[ArchivoCorpus]


class Corpus(Modelo):
    colecciones: list[ColeccionCorpus]


class ContenidoArchivo(Modelo):
    ruta: str
    nombre: str
    tipo: TipoArchivo
    tamano_bytes: int
    contenido: str
