"""Guardias de herramientas: un hook PreToolUse que bloquea rutas.

Defensa en capas. La regla `disallowed_tools` es la primera barrera, pero la
documentación la aplica a Grep y Glob como "mejor esfuerzo". Este hook revisa
CADA llamada a herramienta antes de que se ejecute y la niega si toca una ruta
prohibida. Si el hook falla, la llamada se bloquea (`on_failure="block"`).

Nota honesta: esto protege las herramientas de archivos. Un perfil con Bash
podría leer la carpeta igual (`cat …`); para eso hace falta el sandbox del
sistema operativo (etapa 2). Por eso el perfil de consulta no tiene Bash.
"""

from pathlib import Path
from typing import Any

from claude_agent_sdk import HookContext, HookMatcher

# Llaves donde las herramientas integradas reciben rutas.
LLAVES_RUTA = ("file_path", "path", "notebook_path")
# Llaves con patrones de archivos: `pattern` de Glob y `glob` de Grep. (El
# `pattern` de Grep es una expresión regular sobre el CONTENIDO, no una ruta;
# se revisa igual porque tratarlo como ruta solo puede negar de más.)
LLAVES_PATRON = ("pattern", "glob")


def _sube_de_carpeta(patron: str) -> bool:
    """¿El patrón tiene un segmento `..`? (p. ej. `**/../../backend/.env`)."""
    return any(segmento == ".." for segmento in patron.replace("\\", "/").split("/"))


def _rutas_de(entrada: dict[str, Any], cwd: Path) -> list[Path]:
    rutas = []
    for llave in LLAVES_RUTA:
        valor = entrada.get(llave)
        if isinstance(valor, str) and valor:
            p = Path(valor)
            rutas.append((p if p.is_absolute() else cwd / p).resolve())
    # Glob/Grep: el patrón puede traer la carpeta ("Prácticas/**/*.pdf")
    # o ser absoluto ("/Users/…/backend/*.env"). Solo se puede resolver lo que
    # va antes del primer comodín; lo que viene después (un `..` escondido tras
    # `**/`) lo revisa `_sube_de_carpeta`.
    for llave in LLAVES_PATRON:
        patron = entrada.get(llave)
        if isinstance(patron, str) and ("/" in patron or patron.startswith("~")):
            base = patron.split("*", 1)[0]
            if base:
                p = Path(base).expanduser()
                rutas.append((p if p.is_absolute() else cwd / p).resolve())
    return rutas


def _patrones_de(entrada: dict[str, Any]) -> list[str]:
    return [v for llave in LLAVES_PATRON if isinstance(v := entrada.get(llave), str)]


def _dentro(ruta: Path, carpeta: Path) -> bool:
    return ruta == carpeta or carpeta in ruta.parents


def _negar(motivo: str) -> dict[str, Any]:
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": motivo,
        }
    }


def hook_rutas_bloqueadas(cwd: Path, bloqueadas: tuple[str, ...], solo_dentro: bool = False) -> HookMatcher:
    """Niega rutas de `bloqueadas` y, con `solo_dentro`, CUALQUIER ruta fuera de `cwd`.

    `solo_dentro` es para los perfiles sin Bash (consulta, invitados): sin él,
    Read/Grep/Glob aceptan rutas absolutas o con "../", y una pregunta del tipo
    "lee ../backend/.env" entregaría la API key y el secreto de las sesiones.
    """
    cwd = cwd.resolve()
    carpetas = [(cwd / b).resolve() for b in bloqueadas]

    async def revisar(entrada_hook: Any, _tool_use_id: str | None, _ctx: HookContext) -> dict[str, Any]:
        entrada = entrada_hook.get("tool_input") or {}
        # Sin Bash no hay razón legítima para un `..` en un patrón: se niega
        # siempre, aunque el comodín impida saber a dónde llegaría.
        if solo_dentro and any(_sube_de_carpeta(p) for p in _patrones_de(entrada)):
            return _negar("Solo puedes leer el material del curso, dentro de su carpeta.")
        for ruta in _rutas_de(entrada, cwd):
            if solo_dentro and not _dentro(ruta, cwd):
                return _negar("Solo puedes leer el material del curso, dentro de su carpeta.")
            if any(_dentro(ruta, c) for c in carpetas):
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": (
                            "Esa carpeta no está disponible en este modo. "
                            "Responde con el resto del material del curso."
                        ),
                    }
                }
        return {}

    return HookMatcher(matcher=None, hooks=[revisar], on_failure="block")


def reglas_bloqueo(bloqueadas: tuple[str, ...]) -> list[str]:
    """Las mismas carpetas como reglas de permiso (relativas al cwd)."""
    reglas = []
    for b in bloqueadas:
        for herramienta in ("Read", "Grep", "Glob", "Edit", "Write"):
            reglas.append(f"{herramienta}(./{b}/**)")
    return reglas
