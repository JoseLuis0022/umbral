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


def _rutas_de(entrada: dict[str, Any], cwd: Path) -> list[Path]:
    rutas = []
    for llave in LLAVES_RUTA:
        valor = entrada.get(llave)
        if isinstance(valor, str) and valor:
            p = Path(valor)
            rutas.append((p if p.is_absolute() else cwd / p).resolve())
    # Glob: el patrón puede traer la carpeta ("Prácticas/**/*.pdf").
    patron = entrada.get("pattern")
    if isinstance(patron, str) and "/" in patron:
        base = patron.split("*", 1)[0]
        if base:
            rutas.append((cwd / base).resolve())
    return rutas


def _dentro(ruta: Path, carpeta: Path) -> bool:
    return ruta == carpeta or carpeta in ruta.parents


def hook_rutas_bloqueadas(cwd: Path, bloqueadas: tuple[str, ...]) -> HookMatcher:
    carpetas = [(cwd / b).resolve() for b in bloqueadas]

    async def revisar(entrada_hook: Any, _tool_use_id: str | None, _ctx: HookContext) -> dict[str, Any]:
        entrada = entrada_hook.get("tool_input") or {}
        for ruta in _rutas_de(entrada, cwd):
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
