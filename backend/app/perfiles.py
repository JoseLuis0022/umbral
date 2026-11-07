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

from .config import ajustes

DIR_PROMPTS = Path(__file__).parent / "prompts"
# Prompts propios de un curso: viven con el material, en la carpeta del agente
# (que no está en el repo), y ganan sobre los genéricos de DIR_PROMPTS. Así las
# reglas y nombres de una materia concreta nunca se publican con el código.
DIR_PROMPTS_AGENTE = Path(".umbral") / "prompts"


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
        # Entregas calificadas (aunque se copien a la carpeta) y la configuración
        # del curso (.umbral: sus prompts no son material para el estudiante).
        rutas_bloqueadas=(".umbral", *(c.strip() for c in ajustes.carpetas_privadas.split(",") if c.strip())),
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
    # El modelo lo decide el ROL, no la persona (invitados: siempre el barato).
    modelo_forzado: str | None = None
    # Gasto máximo de la cuenta en toda su vida (USD). None = sin tope.
    presupuesto_total_usd: float | None = None


ROLES: dict[str, Rol] = {
    # Cuentas del registro público: para probar. Solo consulta, siempre con
    # Haiku (~$0.003–0.01 por pregunta) y $0.30 por cuenta, de 30 a 100 preguntas.
    "invitado": Rol(
        perfiles=("consulta",),
        consultas_por_dia=25,
        modelo_forzado="claude-haiku-5-5",
        presupuesto_total_usd=0.30,
    ),
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
    propio = ajustes.agente_cwd / DIR_PROMPTS_AGENTE / perfil.prompt
    archivo = propio if propio.is_file() else DIR_PROMPTS / perfil.prompt
    return archivo.read_text(encoding="utf-8")


# Rol con el que nace una cuenta del registro público.
ROL_REGISTRO = "invitado"
# Tope de gasto de TODOS los invitados juntos en el mes calendario (UTC): aunque
# alguien cree muchas cuentas, el laboratorio no gasta más que esto al mes.
TOPE_MENSUAL_INVITADOS_USD = 20.0
