"""Contratos de entrada y salida de la API (Pydantic).

En Python los campos van en snake_case; en el JSON salen en camelCase, que es
como los espera el front (`conversacionId`, `systemPrompt`…).
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from . import db
from .perfiles import Perfil, perfiles_de


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


class SesionIniciada(Yo):
    token: str


class ParametrosChat(Modelo):
    """Ajustes del Laboratorio. Solo los acepta un rol con permiso "parametros"."""

    modelo: str | None = Field(default=None, max_length=100)
    nivel_pensamiento: Literal["ninguno", "bajo", "medio", "alto"] | None = None
    system_prompt: str | None = Field(default=None, max_length=20_000)
    # Abrir sesión nueva en vez de reanudar. No es privilegiado.
    reiniciar_memoria: bool = False

    def pide_ajustes(self) -> bool:
        return any(v not in (None, "") for v in (self.modelo, self.nivel_pensamiento, self.system_prompt))


class PeticionChat(Modelo):
    conversacion_id: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.:\-]+$")
    mensaje: str = Field(min_length=1, max_length=8_000)
    perfil: str = "consulta"
    parametros: ParametrosChat | None = None


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
    )
