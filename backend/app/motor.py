"""Capa 3: corre el agente y traduce sus mensajes a nuestro protocolo.

`consultar()` es lo único que la capa 2 conoce de aquí. Recibe un Perfil (no un
rol: el motor no sabe qué es un rol) y devuelve eventos del protocolo.

Qué emite el SDK y en qué se convierte:

    SystemMessage(init)          → (nada visible) guarda session_id, modelo
    StreamEvent text_delta       → texto {delta}         ← token por token
    AssistantMessage ToolUse     → actividad {fase: inicio}
    UserMessage ToolResult       → actividad {fase: fin, ok}
    ResultMessage                → fin {costoUsd, vueltas, tokens…}  (+ error si falló)

Los StreamEvent de subagentes (parent_tool_use_id != None) NO se pintan: el
agente principal redacta la respuesta final; lo de los subagentes se ve como
actividad.
"""

import asyncio
import logging
import random
import re
import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKError,
    ResultMessage,
    StreamEvent,
    SystemMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
    query,
)

from .config import ajustes
from .guardias import hook_rutas_bloqueadas, reglas_bloqueo
from .perfiles import Perfil, leer_prompt
from .protocolo import evento

log = logging.getLogger("lab.motor")

HERRAMIENTAS_SUBAGENTE = {"Task", "Agent"}

# Niveles que manda el Laboratorio del front → `effort` del SDK.
ESFUERZO_POR_NIVEL = {"ninguno": "low", "bajo": "low", "medio": "medium", "alto": "high"}

ERROR_POR_SUBTIPO = {
    "error_max_turns": ("limite_vueltas", "El agente llegó al máximo de pasos sin terminar."),
    "error_max_budget_usd": ("limite_presupuesto", "La consulta llegó al tope de gasto permitido."),
}

ERROR_POR_FALLA_API = {
    "authentication_failed": ("credenciales", "La API key de Anthropic no es válida."),
    "billing_error": ("saldo", "La cuenta de Anthropic no tiene saldo."),
    "rate_limit": ("limite_api", "Anthropic está limitando las peticiones. Intenta en un momento."),
}


@dataclass
class Ajuste:
    """Lo que un admin puede sobreescribir desde el Laboratorio."""

    modelo: str | None = None
    esfuerzo: str | None = None
    system_prompt: str | None = None


@dataclass
class Registro:
    """Lo que la capa 2 guarda de cada consulta (el "oro molido")."""

    sesion_sdk: str | None = None
    costo_usd: float | None = None
    vueltas: int | None = None
    duracion_ms: int | None = None
    tokens: dict[str, int] = field(default_factory=dict)
    modelo: str | None = None
    herramientas: list[str] = field(default_factory=list)
    error: str | None = None
    fuente_llave: str | None = None


def consultar(
    perfil: Perfil,
    mensaje: str,
    *,
    sesion_previa: str | None,
    usuario_id: str,
    ajuste: Ajuste,
    registro: Registro,
) -> AsyncIterator[dict[str, Any]]:
    if ajustes.motor == "prueba":
        return _consultar_prueba(mensaje, sesion_previa, registro)
    return _consultar_sdk(perfil, mensaje, sesion_previa, usuario_id, ajuste, registro)


# ─────────────────────────────── Motor real ────────────────────────────────


def construir_opciones(
    perfil: Perfil, *, sesion_previa: str | None, usuario_id: str, ajuste: Ajuste
) -> ClaudeAgentOptions:
    cwd = ajustes.agente_cwd.resolve()
    ajustes.config_claude.mkdir(parents=True, exist_ok=True)

    prompt = ajuste.system_prompt or leer_prompt(perfil)
    # Sin prompt propio = el agente de la laptop: prompt de Claude Code + CLAUDE.md.
    system_prompt: Any = prompt if prompt is not None else {"type": "preset", "preset": "claude_code"}

    hooks: Any = None
    if perfil.rutas_bloqueadas:
        hooks = {"PreToolUse": [hook_rutas_bloqueadas(cwd, perfil.rutas_bloqueadas)]}

    return ClaudeAgentOptions(
        cwd=str(cwd),
        # `tools` define qué herramientas EXISTEN; `allowed_tools` las aprueba
        # sin preguntar; `dontAsk` niega todo lo demás (no hay humano que conteste).
        tools=list(perfil.herramientas),
        allowed_tools=list(perfil.herramientas),
        disallowed_tools=reglas_bloqueo(perfil.rutas_bloqueadas),
        permission_mode="dontAsk",
        setting_sources=["project"] if perfil.cargar_proyecto else [],
        skills="all" if perfil.skills else None,
        system_prompt=system_prompt,
        max_turns=perfil.max_vueltas,
        max_budget_usd=perfil.presupuesto_usd,
        model=ajuste.modelo or perfil.modelo,
        effort=ajuste.esfuerzo or perfil.esfuerzo,  # type: ignore[arg-type]
        resume=sesion_previa,
        include_partial_messages=True,
        hooks=hooks,
        env={
            "ANTHROPIC_API_KEY": ajustes.anthropic_api_key,
            # Aislamiento de tu ~/.claude (CLAUDE.md global, MCP, plugins).
            "CLAUDE_CONFIG_DIR": str(ajustes.config_claude.resolve()),
            "CLAUDE_CODE_DISABLE_AUTO_MEMORY": "1",
            # Etiqueta para la observabilidad (OpenTelemetry), cuando la encendamos.
            "OTEL_RESOURCE_ATTRIBUTES": f"enduser.id={usuario_id}",
        },
        stderr=lambda linea: log.debug("claude: %s", linea.rstrip()),
    )


def resumir(nombre: str, entrada: dict[str, Any], cwd: Path) -> str:
    """Una línea legible de qué hace la herramienta, con rutas relativas."""

    def rel(valor: Any) -> str:
        if not isinstance(valor, str) or not valor:
            return ""
        p = Path(valor)
        try:
            return str((p if p.is_absolute() else cwd / p).resolve().relative_to(cwd))
        except ValueError:
            return p.name

    if nombre in ("Read", "Write", "Edit"):
        return rel(entrada.get("file_path"))
    if nombre == "Grep":
        donde = rel(entrada.get("path")) or "todo el material"
        return f'"{entrada.get("pattern", "")}" en {donde}'
    if nombre == "Glob":
        return str(entrada.get("pattern", ""))
    if nombre == "Bash":
        return str(entrada.get("description") or entrada.get("command", ""))[:120]
    if nombre == "Skill":
        return str(entrada.get("skill") or entrada.get("command") or "")
    if nombre in HERRAMIENTAS_SUBAGENTE:
        return str(entrada.get("description", ""))
    return ""


async def _consultar_sdk(
    perfil: Perfil,
    mensaje: str,
    sesion_previa: str | None,
    usuario_id: str,
    ajuste: Ajuste,
    registro: Registro,
) -> AsyncIterator[dict[str, Any]]:
    if not ajustes.anthropic_api_key:
        registro.error = "configuracion"
        yield evento("error", codigo="configuracion", mensaje="Falta ANTHROPIC_API_KEY en backend/.env.")
        return

    cwd = ajustes.agente_cwd.resolve()
    opciones = construir_opciones(perfil, sesion_previa=sesion_previa, usuario_id=usuario_id, ajuste=ajuste)

    hay_texto = False       # ya se pintó algo de la respuesta
    separar = False         # hubo herramientas desde el último texto
    texto_bloques = ""      # respaldo, por si no llegaran los deltas
    error_emitido = False
    abiertas: dict[str, dict[str, Any]] = {}

    try:
        async for m in query(prompt=mensaje, options=opciones):
            if isinstance(m, SystemMessage):
                if m.subtype == "init":
                    registro.sesion_sdk = m.data.get("session_id")
                    registro.modelo = m.data.get("model")
                    registro.fuente_llave = m.data.get("apiKeySource")
                    if registro.fuente_llave not in (None, "ANTHROPIC_API_KEY"):
                        log.warning("El agente no está usando la API key del laboratorio: %s", registro.fuente_llave)
                continue

            if isinstance(m, StreamEvent):
                if m.parent_tool_use_id:
                    continue
                ev = m.event
                if ev.get("type") == "content_block_delta":
                    delta = ev.get("delta") or {}
                    if delta.get("type") == "text_delta" and delta.get("text"):
                        if separar and hay_texto:
                            yield evento("texto", delta="\n\n")
                        separar = False
                        hay_texto = True
                        yield evento("texto", delta=delta["text"])
                continue

            if isinstance(m, AssistantMessage):
                if m.error and not error_emitido:
                    codigo, texto = ERROR_POR_FALLA_API.get(m.error, ("motor", "El agente falló al responder."))
                    registro.error = codigo
                    error_emitido = True
                    yield evento("error", codigo=codigo, mensaje=texto)
                for bloque in m.content:
                    if isinstance(bloque, TextBlock) and m.parent_tool_use_id is None:
                        texto_bloques += bloque.text
                    elif isinstance(bloque, ToolUseBlock):
                        es_subagente = bloque.name in HERRAMIENTAS_SUBAGENTE
                        info = {
                            "id": bloque.id,
                            "clase": "subagente" if es_subagente else "herramienta",
                            "nombre": (bloque.input.get("subagent_type") or "subagente") if es_subagente else bloque.name,
                            "detalle": resumir(bloque.name, bloque.input, cwd),
                            "dentroDe": m.parent_tool_use_id,
                        }
                        abiertas[bloque.id] = info
                        registro.herramientas.append(bloque.name)
                        if m.parent_tool_use_id is None:
                            separar = True
                        yield evento("actividad", fase="inicio", ok=None, **info)
                continue

            if isinstance(m, UserMessage):
                if isinstance(m.content, list):
                    for bloque in m.content:
                        if isinstance(bloque, ToolResultBlock) and bloque.tool_use_id in abiertas:
                            info = abiertas.pop(bloque.tool_use_id)
                            yield evento("actividad", fase="fin", ok=not bloque.is_error, **info)
                continue

            if isinstance(m, ResultMessage):
                if not hay_texto and (texto_bloques or m.result):
                    yield evento("texto", delta=texto_bloques or m.result or "")
                uso = m.usage or {}
                registro.sesion_sdk = m.session_id or registro.sesion_sdk
                registro.costo_usd = m.total_cost_usd
                registro.vueltas = m.num_turns
                registro.duracion_ms = m.duration_ms
                registro.tokens = {
                    "entrada": int(uso.get("input_tokens") or 0),
                    "salida": int(uso.get("output_tokens") or 0),
                    "cacheLectura": int(uso.get("cache_read_input_tokens") or 0),
                    "cacheEscritura": int(uso.get("cache_creation_input_tokens") or 0),
                }
                if m.is_error and not error_emitido:
                    codigo, texto = ERROR_POR_SUBTIPO.get(m.subtype, ("motor", "El agente no pudo terminar la respuesta."))
                    registro.error = codigo
                    error_emitido = True
                    yield evento("error", codigo=codigo, mensaje=texto)
                yield _evento_fin(registro)
    except ClaudeSDKError:
        log.exception("Falló el subproceso del agente")
        registro.error = "motor"
        if not error_emitido:
            yield evento("error", codigo="motor", mensaje="El agente falló al responder.")


def _evento_fin(registro: Registro) -> dict[str, Any]:
    return evento(
        "fin",
        costoUsd=registro.costo_usd,
        vueltas=registro.vueltas,
        duracionMs=registro.duracion_ms,
        tokens=registro.tokens,
        modelo=registro.modelo,
    )


# ────────────────────────────── Motor de prueba ─────────────────────────────


async def _consultar_prueba(
    mensaje: str, sesion_previa: str | None, registro: Registro
) -> AsyncIterator[dict[str, Any]]:
    """Habla el MISMO protocolo que el motor real, sin gastar tokens."""
    inicio = time.monotonic()
    registro.sesion_sdk = sesion_previa or f"prueba-{uuid.uuid4()}"
    registro.modelo = "motor-de-prueba"

    pasos = [("Read", "estado/indice-temas.md"), ("Grep", '"mediana" en estado/inventario')]
    for i, (nombre, detalle) in enumerate(pasos):
        info = {"id": f"prueba-{i}", "clase": "herramienta", "nombre": nombre, "detalle": detalle, "dentroDe": None}
        registro.herramientas.append(nombre)
        yield evento("actividad", fase="inicio", ok=None, **info)
        await asyncio.sleep(0.5)
        yield evento("actividad", fase="fin", ok=True, **info)

    texto = (
        "**Motor de prueba.** Recibí tu pregunta:\n\n"
        f"> {mensaje}\n\n"
        "Esta respuesta no viene de Claude: sirve para probar el protocolo y la interfaz "
        "sin gastar tokens. Cambia `MOTOR=sdk` en `backend/.env` para usar el agente real.\n"
    )
    for pieza in re.findall(r"\S+\s*", texto):
        await asyncio.sleep(random.uniform(0.015, 0.04))
        yield evento("texto", delta=pieza)

    registro.costo_usd = 0.0
    registro.vueltas = len(pasos) + 1
    registro.duracion_ms = int((time.monotonic() - inicio) * 1000)
    registro.tokens = {"entrada": 0, "salida": 0, "cacheLectura": 0, "cacheEscritura": 0}
    yield _evento_fin(registro)
