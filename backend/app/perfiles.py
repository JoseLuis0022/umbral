"""Perfiles de agente y roles: el diseño "modos como datos".

- Un PERFIL es una configuración del agente (prompt, herramientas, límites).
  Crear un modo nuevo = agregar un Perfil aquí. No se toca ningún `if`.
- Un ROL dice qué perfiles puede usar quien lo tiene, qué permisos extra tiene
  y cuántas consultas al día puede hacer.

La capa 2 siempre hace la misma pregunta: "¿el rol de este usuario incluye el
perfil que pidió?". La capa 3 nunca sabe qué es un rol: solo recibe un Perfil.
"""

from dataclasses import dataclass
from pathlib import Path

DIR_PROMPTS = Path(__file__).parent / "prompts"


@dataclass(frozen=True)
class Perfil:
    id: str
    nombre: str
    descripcion: str
    # Las únicas herramientas que EXISTEN para este agente (`tools` del SDK).
    # Lo que no está aquí, el modelo ni lo ve.
    herramientas: tuple[str, ...]
    # Archivo en prompts/. None = system prompt de Claude Code + CLAUDE.md del
    # proyecto (el agente de tu laptop, tal cual).
    prompt: str | None
    # True = carga CLAUDE.md, skills y settings de la carpeta (setting_sources).
    cargar_proyecto: bool
    max_vueltas: int
    # Tope DURO en dólares por consulta. El SDK corta la ejecución al pasarlo.
    presupuesto_usd: float
    # Carpetas (relativas al cwd del agente) que este perfil no puede tocar.
    rutas_bloqueadas: tuple[str, ...] = ()
    # Activa la herramienta Skill con las skills del proyecto.
    skills: bool = False
    # Un solo trabajo a la vez: el perfil escribe archivos compartidos.
    exclusivo: bool = False
    # Explícito a propósito: con None el CLI elige por su cuenta, y la interfaz
    # no podría decir qué modelo contesta. Se publica en /auth/yo.
    modelo: str | None = None
    esfuerzo: str | None = None


PERFILES: dict[str, Perfil] = {
    "consulta": Perfil(
        id="consulta",
        nombre="Consulta",
        descripcion="Responde preguntas sobre la materia buscando en los apuntes y las clases.",
        herramientas=("Read", "Grep", "Glob"),
        prompt="consulta.md",
        cargar_proyecto=False,
        max_vueltas=12,
        presupuesto_usd=0.75,
        # La carpeta ya no está en el corpus publicado (tenía nombres del equipo);
        # el bloqueo se queda por si alguien la vuelve a copiar.
        rutas_bloqueadas=("Prácticas",),
        # Sonnet: en las pruebas costó ~3× menos que Opus por pregunta
        # ($0.035 contra $0.11) con respuestas de buena calidad para consulta.
        modelo="claude-sonnet-5-5",
    ),
    "generador": Perfil(
        id="generador",
        nombre="Generador de apuntes",
        descripcion="Procesa clases nuevas y genera o actualiza los apuntes HTML.",
        herramientas=("Read", "Grep", "Glob", "Bash", "Write", "Edit", "Skill"),
        prompt=None,
        cargar_proyecto=True,
        max_vueltas=80,
        presupuesto_usd=8.0,
        skills=True,
        exclusivo=True,
        modelo="claude-opus-5-5",
    ),
}


@dataclass(frozen=True)
class Rol:
    # "*" = todos los perfiles.
    perfiles: tuple[str, ...]
    # Permisos extra: "parametros" = puede mandar modelo/system prompt desde el
    # Laboratorio; "usuarios" = puede administrar cuentas; "auditoria" = puede
    # leer todas las consultas (pregunta y respuesta) y los archivos del agente.
    permisos: tuple[str, ...] = ()
    # None = sin límite.
    consultas_por_dia: int | None = None


ROLES: dict[str, Rol] = {
    "usuario": Rol(perfiles=("consulta",), consultas_por_dia=40),
    "especialista": Rol(perfiles=("consulta", "generador"), consultas_por_dia=100),
    "admin": Rol(perfiles=("*",), permisos=("parametros", "usuarios", "auditoria")),
}


def rol(nombre: str) -> Rol:
    # Un rol desconocido no hereda nada: se trata como sin permisos.
    return ROLES.get(nombre, Rol(perfiles=()))


def puede_usar(nombre_rol: str, perfil_id: str) -> bool:
    permitidos = rol(nombre_rol).perfiles
    return perfil_id in PERFILES and ("*" in permitidos or perfil_id in permitidos)


def perfiles_de(nombre_rol: str) -> list[Perfil]:
    return [p for p in PERFILES.values() if puede_usar(nombre_rol, p.id)]


def tiene_permiso(nombre_rol: str, permiso: str) -> bool:
    return permiso in rol(nombre_rol).permisos


def leer_prompt(perfil: Perfil) -> str | None:
    if perfil.prompt is None:
        return None
    return (DIR_PROMPTS / perfil.prompt).read_text(encoding="utf-8")
