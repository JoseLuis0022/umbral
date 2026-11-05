"""Capa 3: corre el agente y traduce sus mensajes a nuestro protocolo.

`consultar()` es lo único que la capa 2 conoce de aquí. Recibe un Perfil (no un
rol: el motor no sabe qué es un rol) y devuelve eventos del protocolo.

Qué emite el SDK y en qué se convierte:

    SystemMessage(init)          → (nada visible) guarda session_id, modelo
    StreamEvent thinking_delta   → pensamiento {delta}   ← solo si se pidió
    StreamEvent text_delta       → texto {delta}         ← token por token
    AssistantMessage ToolUse     → actividad {fase: inicio}
    UserMessage ToolResult       → actividad {fase: fin, ok}
                                   (+ archivo {…} si fue compartir_archivo y salió bien)
    ResultMessage                → (guarda costo, vueltas, tokens)
    get_context_usage()          → fin {…, contexto}     (+ error si falló)

Se usa `ClaudeSDKClient` y no `query()` porque, después de la respuesta, hay
que preguntarle al agente cuánto contexto ocupa la sesión
(`get_context_usage`), y eso solo existe con una conexión abierta.

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
from collections.abc import AsyncIterator, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from claude_agent_sdk import (
    AssistantMessage,
    ClaudeAgentOptions,
    ClaudeSDKClient,
    ClaudeSDKError,
    ResultMessage,
    StreamEvent,
    SystemMessage,
    ToolResultBlock,
    ToolUseBlock,
    UserMessage,
)

from . import archivos, corpus
from .config import ajustes
from .esquemas import DocumentoAdjunto, ImagenAdjunta
from .guardias import hook_rutas_bloqueadas, reglas_bloqueo
from .perfiles import Perfil, leer_prompt
from .protocolo import evento

log = logging.getLogger("lab.motor")

HERRAMIENTAS_SUBAGENTE = {"Task", "Agent"}

# Narración vs respuesta. Antes de usar una herramienta, el modelo a veces
# escribe su plan ("Necesito los seis pasos. Leo clase-04…") como texto normal.
# Eso NO es la respuesta: es proceso, y puede traer nombres de archivos. Cada
# bloque de texto se retiene hasta este largo; si antes llega una herramienta,
# era narración. Si lo supera o el turno termina, es respuesta y se transmite.
UMBRAL_NARRACION = 280

ERROR_POR_SUBTIPO = {
    "error_max_turns": ("limite_vueltas", "El agente llegó al máximo de pasos sin terminar."),
    "error_max_budget_usd": ("limite_presupuesto", "La consulta llegó al tope de gasto permitido."),
}

ERROR_POR_FALLA_API = {
    "authentication_failed": ("credenciales", "La API key de Anthropic no es válida."),
    "billing_error": ("saldo", "La cuenta de Anthropic no tiene saldo."),
    "rate_limit": ("limite_api", "Anthropic está limitando las peticiones. Intenta en un momento."),
    # Caída de red o de Anthropic: el CLI reintenta varios minutos y luego se rinde.
    "server_error": ("conexion", "No pudimos conectar con Anthropic. Revisa tu conexión a internet e intenta de nuevo."),
    "unknown": ("conexion", "No pudimos conectar con Anthropic. Revisa tu conexión a internet e intenta de nuevo."),
}


@dataclass
class Ajuste:
    """Lo que un rol con permiso puede sobreescribir (Laboratorio o barra del chat)."""

    modelo: str | None = None
    esfuerzo: str | None = None
    system_prompt: str | None = None
    # Transmitir lo INTERNO del agente: su razonamiento y el detalle técnico de
    # cada herramienta (rutas, patrones). Puede revelar la estructura de la
    # carpeta o detalles del prompt, así que la capa 2 solo lo enciende para
    # quien tenga permiso. Los demás reciben solo la `descripcion` humana.
    ver_interno: bool = False


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
    contexto: dict[str, Any] | None = None


def consultar(
    perfil: Perfil,
    mensaje: str,
    imagenes: Sequence[ImagenAdjunta] = (),
    documentos: Sequence[DocumentoAdjunto] = (),
    *,
    sesion_previa: str | None,
    usuario_id: str,
    ajuste: Ajuste,
    registro: Registro,
) -> AsyncIterator[dict[str, Any]]:
    if ajustes.motor == "prueba":
        return _consultar_prueba(mensaje, imagenes, documentos, sesion_previa, ajuste, registro)
    return _consultar_sdk(perfil, mensaje, imagenes, documentos, sesion_previa, usuario_id, ajuste, registro)


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
        # La herramienta propia (archivos.py) no es integrada: vive en un
        # servidor MCP dentro de este proceso y se aprueba aparte.
        mcp_servers={archivos.SERVIDOR_MCP: archivos.servidor_mcp(perfil.rutas_bloqueadas)},
        allowed_tools=[*perfil.herramientas, archivos.HERRAMIENTA],
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
        # Sin `display`, el razonamiento no se transmite (llega "omitted"). Se
        # pide resumido solo para quien puede verlo; a los demás ni se genera
        # la versión visible.
        thinking={"type": "adaptive", "display": "summarized"} if ajuste.ver_interno else None,
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


_RX_CLASE = re.compile(r"inventario/clase-0*(\d+)\.md$")
_RX_PRACTICA = re.compile(r"inventario/practica-(\d+)\.md$")
_RX_TEMA = re.compile(r"^Apuntes/Tema 0*(\d+)")
_RX_GRABACION = re.compile(r"Transcripciones/Clase (\d+)")


def describir(herramienta: str, entrada: dict[str, Any], cwd: Path, nombre: str) -> str:
    """Qué hace la herramienta, en palabras de persona y SIN rutas.

    Es lo único de la actividad que reciben las cuentas sin permiso: "Leyendo
    el resumen de la Clase 12", nunca `estado/inventario/clase-12.md`. Lo que no
    se reconoce cae en una frase genérica.
    """
    if herramienta in HERRAMIENTAS_SUBAGENTE:
        return f"Consultando a {nombre}"
    if herramienta == "Grep":
        patron = re.sub(r"^\(\?i\)", "", str(entrada.get("pattern", ""))).strip()
        # Un patrón con sintaxis de regex no le dice nada a una persona.
        if patron and len(patron) <= 40 and not re.search(r"[|()\[\]\\^$*+?{}]", patron):
            return f"Buscando «{patron}» en el material"
        return "Buscando en el material del curso"
    if herramienta in ("Write", "Edit"):
        return "Editando un archivo del agente"
    if herramienta == "Bash":
        return "Ejecutando un paso de procesamiento"
    if herramienta == "Skill":
        return "Siguiendo un procedimiento del agente"
    if herramienta == archivos.HERRAMIENTA:
        # Solo el nombre del archivo: es lo que el usuario va a recibir.
        nombre_archivo = Path(str(entrada.get("ruta", ""))).name
        return f"Preparando «{nombre_archivo}» para mandártelo" if nombre_archivo else "Preparando un archivo para mandártelo"

    ruta = resumir(herramienta, entrada, cwd)
    if ruta.endswith("indice-temas.md"):
        return "Revisando el índice de temas"
    if ruta.endswith("calendario.md"):
        return "Revisando el calendario del curso"
    if ruta.startswith("estado/diapositivas/"):
        return "Revisando las diapositivas del profesor"
    for rx, frase in (
        (_RX_CLASE, "Leyendo el resumen de la Clase {}"),
        (_RX_PRACTICA, "Leyendo qué pide la Práctica {}"),
        (_RX_TEMA, "Leyendo los apuntes del Tema {}"),
        (_RX_GRABACION, "Buscando en la grabación de la Clase {}"),
    ):
        if m := rx.search(ruta):
            return frase.format(int(m.group(1)))
    return "Revisando el material del curso"


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
    if nombre == archivos.HERRAMIENTA:
        return str(entrada.get("ruta", ""))
    return ""


def _mensaje_usuario(
    mensaje: str, imagenes: Sequence[ImagenAdjunta], documentos: Sequence[DocumentoAdjunto] = ()
) -> dict[str, Any]:
    """El mensaje del usuario como lo espera el agente.

    Documentos primero (la documentación de Anthropic recomienda el material
    largo ANTES de la pregunta), luego imágenes —cada una con su nombre, que en
    un video dice el minuto del fotograma— y al final el texto.
    """
    if imagenes or documentos:
        contenido: Any = []
        for d in documentos:
            fuente = (
                {"type": "base64", "media_type": "application/pdf", "data": d.datos}
                if d.formato == "pdf"
                else {"type": "text", "media_type": "text/plain", "data": d.datos}
            )
            contenido.append({"type": "document", "source": fuente, "title": d.nombre})
        for i in imagenes:
            contenido.append({"type": "text", "text": f"[{i.nombre}]"})
            contenido.append({"type": "image", "source": {"type": "base64", "media_type": i.tipo, "data": i.datos}})
        contenido.append({"type": "text", "text": mensaje.strip() or "Analiza lo que te adjunto."})
    else:
        contenido = mensaje
    return {
        "type": "user",
        "message": {"role": "user", "content": contenido},
        "parent_tool_use_id": None,
        "session_id": "default",
    }


async def _un_mensaje(mensaje: dict[str, Any]) -> AsyncIterator[dict[str, Any]]:
    yield mensaje


def _contexto_publico(uso: Any) -> dict[str, Any] | None:
    """Lo que el front necesita del /context de Claude Code, y nada más."""
    try:
        return {
            "usados": int(uso["totalTokens"]),
            "maximo": int(uso["maxTokens"]),
            "porcentaje": float(uso["percentage"]),
            "umbralCompactacion": int(uso.get("autoCompactThreshold") or 0) or None,
            "categorias": [
                {"nombre": c["name"], "tokens": int(c["tokens"]), "diferida": bool(c.get("isDeferred"))}
                for c in uso.get("categories", [])
            ],
        }
    except (KeyError, TypeError, ValueError):
        log.warning("get_context_usage devolvió una forma inesperada")
        return None


async def _consultar_sdk(
    perfil: Perfil,
    mensaje: str,
    imagenes: Sequence[ImagenAdjunta],
    documentos: Sequence[DocumentoAdjunto],
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
    error_emitido = False
    retenido = ""           # texto del bloque actual que aún no se sabe si es respuesta
    confirmado = False      # el bloque actual ya se está transmitiendo como respuesta
    resultado: ResultMessage | None = None

    def como_respuesta(texto: str) -> list[dict[str, Any]]:
        nonlocal separar, hay_texto
        salida = []
        if separar and hay_texto:
            salida.append(evento("texto", delta="\n\n"))
        separar = False
        hay_texto = True
        salida.append(evento("texto", delta=texto))
        return salida

    def como_narracion(texto: str) -> list[dict[str, Any]]:
        # Con permiso, se ve en el Proceso como razonamiento; sin permiso, no sale.
        return [evento("pensamiento", delta=texto.strip() + "\n")] if ajuste.ver_interno and texto.strip() else []
    abiertas: dict[str, dict[str, Any]] = {}
    # tool_use_id → ruta pedida a compartir_archivo, para emitir `archivo` al terminar.
    por_compartir: dict[str, str] = {}

    try:
        async with ClaudeSDKClient(options=opciones) as cliente:
            await cliente.query(_un_mensaje(_mensaje_usuario(mensaje, imagenes, documentos)))

            async for m in cliente.receive_response():
                if isinstance(m, SystemMessage):
                    if m.subtype == "init":
                        registro.sesion_sdk = m.data.get("session_id")
                        registro.modelo = m.data.get("model")
                        registro.fuente_llave = m.data.get("apiKeySource")
                        log.info("sesión %s · modelo %s · credencial %s", registro.sesion_sdk, registro.modelo, registro.fuente_llave)
                        if registro.fuente_llave not in (None, "ANTHROPIC_API_KEY"):
                            log.warning("El agente no está usando la API key del laboratorio: %s", registro.fuente_llave)
                    continue

                if isinstance(m, StreamEvent):
                    if m.parent_tool_use_id:
                        continue
                    ev = m.event
                    tipo_ev = ev.get("type")
                    if tipo_ev == "content_block_start":
                        tipo_bloque = (ev.get("content_block") or {}).get("type")
                        if tipo_bloque == "tool_use" and retenido:
                            for e in como_narracion(retenido):
                                yield e
                            retenido = ""
                        if tipo_bloque == "text":
                            confirmado = False
                    elif tipo_ev == "content_block_delta":
                        delta = ev.get("delta") or {}
                        if delta.get("type") == "text_delta" and delta.get("text"):
                            if confirmado:
                                yield evento("texto", delta=delta["text"])
                            else:
                                retenido += delta["text"]
                                if len(retenido) >= UMBRAL_NARRACION:
                                    for e in como_respuesta(retenido):
                                        yield e
                                    retenido = ""
                                    confirmado = True
                        elif delta.get("type") == "thinking_delta" and delta.get("thinking") and ajuste.ver_interno:
                            yield evento("pensamiento", delta=delta["thinking"])
                    elif tipo_ev == "message_delta" and retenido:
                        motivo = (ev.get("delta") or {}).get("stop_reason")
                        for e in como_narracion(retenido) if motivo == "tool_use" else como_respuesta(retenido):
                            yield e
                        retenido = ""
                    continue

                if isinstance(m, AssistantMessage):
                    if m.error and not error_emitido:
                        codigo, texto = ERROR_POR_FALLA_API.get(m.error, ("motor", "El agente falló al responder."))
                        registro.error = codigo
                        error_emitido = True
                        yield evento("error", codigo=codigo, mensaje=texto)
                    for bloque in m.content:
                        if isinstance(bloque, ToolUseBlock):
                            es_subagente = bloque.name in HERRAMIENTAS_SUBAGENTE
                            nombre = (bloque.input.get("subagent_type") or "subagente") if es_subagente else bloque.name
                            info = {
                                "id": bloque.id,
                                "clase": "subagente" if es_subagente else "herramienta",
                                "nombre": nombre,
                                # Para todos: qué hace, en palabras. Solo con permiso: la ruta.
                                "descripcion": describir(bloque.name, bloque.input, cwd, nombre),
                                "detalle": resumir(bloque.name, bloque.input, cwd) if ajuste.ver_interno else None,
                                "dentroDe": m.parent_tool_use_id,
                            }
                            abiertas[bloque.id] = info
                            if bloque.name == archivos.HERRAMIENTA:
                                por_compartir[bloque.id] = str(bloque.input.get("ruta", ""))
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
                                ruta = por_compartir.pop(bloque.tool_use_id, None)
                                if ruta is not None and not bloque.is_error:
                                    # Se valida OTRA vez aquí: el evento sale de lo
                                    # que dice el código, no de lo que dijo el modelo.
                                    try:
                                        yield evento("archivo", **archivos.ficha(*archivos.resolver_compartible(ruta, perfil.rutas_bloqueadas)))
                                    except archivos.NoCompartible:
                                        log.warning("compartir_archivo dijo que sí, pero la ruta no pasa: %s", ruta)
                    continue

                if isinstance(m, ResultMessage):
                    resultado = m

            # La respuesta terminó; la conexión sigue abierta. Es el único
            # momento en que se le puede preguntar al agente por su contexto.
            try:
                registro.contexto = _contexto_publico(await asyncio.wait_for(cliente.get_context_usage(), timeout=10))
            except Exception:
                log.warning("No se pudo leer el uso de contexto", exc_info=True)
    except ClaudeSDKError:
        log.exception("Falló el subproceso del agente")
        registro.error = "motor"
        if not error_emitido:
            yield evento("error", codigo="motor", mensaje="El agente falló al responder.")
        return

    if retenido:
        for e in como_respuesta(retenido):
            yield e
    if resultado is None:
        return
    # Respaldo si no llegaron deltas: `result` es SOLO la respuesta final. No se
    # usa `texto_bloques`, que incluye la narración previa a las herramientas.
    # Con error, `result` trae el mensaje crudo del CLI ("API Error: Connection
    # refused…"): ese ya salió traducido como evento `error`, no como respuesta.
    if not hay_texto and resultado.result and not (error_emitido or resultado.is_error):
        yield evento("texto", delta=resultado.result)
    uso = resultado.usage or {}
    registro.sesion_sdk = resultado.session_id or registro.sesion_sdk
    registro.costo_usd = resultado.total_cost_usd
    registro.vueltas = resultado.num_turns
    registro.duracion_ms = resultado.duration_ms
    registro.tokens = {
        "entrada": int(uso.get("input_tokens") or 0),
        "salida": int(uso.get("output_tokens") or 0),
        "cacheLectura": int(uso.get("cache_read_input_tokens") or 0),
        "cacheEscritura": int(uso.get("cache_creation_input_tokens") or 0),
    }
    if resultado.is_error and not error_emitido:
        codigo, texto = ERROR_POR_SUBTIPO.get(resultado.subtype, ("motor", "El agente no pudo terminar la respuesta."))
        if "ECONNREFUSED" in (resultado.result or "") or "Connection" in (resultado.result or ""):
            codigo, texto = ERROR_POR_FALLA_API["server_error"]
        registro.error = codigo
        yield evento("error", codigo=codigo, mensaje=texto)
    yield _evento_fin(registro)


def _evento_fin(registro: Registro) -> dict[str, Any]:
    return evento(
        "fin",
        costoUsd=registro.costo_usd,
        vueltas=registro.vueltas,
        duracionMs=registro.duracion_ms,
        tokens=registro.tokens,
        modelo=registro.modelo,
        contexto=registro.contexto,
    )


# ────────────────────────────── Motor de prueba ─────────────────────────────


async def _consultar_prueba(
    mensaje: str,
    imagenes: Sequence[ImagenAdjunta],
    documentos: Sequence[DocumentoAdjunto],
    sesion_previa: str | None,
    ajuste: Ajuste,
    registro: Registro,
) -> AsyncIterator[dict[str, Any]]:
    """Habla el MISMO protocolo que el motor real, sin gastar tokens."""
    inicio = time.monotonic()
    registro.sesion_sdk = sesion_previa or f"prueba-{uuid.uuid4()}"
    registro.modelo = "motor-de-prueba"

    if ajuste.ver_interno:
        for pieza in re.findall(r"\S+\s*", "Primero reviso el índice de temas para ubicar la clase, luego leo su resumen."):
            await asyncio.sleep(0.03)
            yield evento("pensamiento", delta=pieza)

    pasos = [
        ("Read", "Revisando el índice de temas", "estado/indice-temas.md"),
        ("Grep", "Buscando «mediana» en el material", '"mediana" en estado/inventario'),
    ]
    for i, (nombre, descripcion, detalle) in enumerate(pasos):
        info = {
            "id": f"prueba-{i}",
            "clase": "herramienta",
            "nombre": nombre,
            "descripcion": descripcion,
            "detalle": detalle if ajuste.ver_interno else None,
            "dentroDe": None,
        }
        registro.herramientas.append(nombre)
        yield evento("actividad", fase="inicio", ok=None, **info)
        await asyncio.sleep(0.5)
        yield evento("actividad", fase="fin", ok=True, **info)

    nombres = [i.nombre for i in imagenes] + [d.nombre for d in documentos]
    adjuntas = f"Recibí **{len(nombres)} adjunto(s)**: {', '.join(nombres)}.\n\n" if nombres else ""
    texto = (
        "**Motor de prueba.** Recibí tu pregunta:\n\n"
        f"> {mensaje}\n\n{adjuntas}"
        "Esta respuesta no viene de Claude: sirve para probar el protocolo y la interfaz "
        "sin gastar tokens. Cambia `MOTOR=sdk` en `backend/.env` para usar el agente real.\n"
    )
    for pieza in re.findall(r"\S+\s*", texto):
        await asyncio.sleep(random.uniform(0.015, 0.04))
        yield evento("texto", delta=pieza)

    # Si la pregunta pide un archivo, se manda el primer apunte compartible:
    # así la tarjeta se prueba sin gastar tokens.
    if re.search(r"m[aá]nd|p[aá]s[aá]me|archivo|pdf", mensaje, re.IGNORECASE):
        for relativa, (coleccion, _) in sorted(corpus.indice().items()):
            if coleccion.compartible:
                yield evento("archivo", **archivos.ficha(*archivos.resolver_compartible(relativa)))
                break

    registro.costo_usd = 0.0
    registro.vueltas = len(pasos) + 1
    registro.duracion_ms = int((time.monotonic() - inicio) * 1000)
    registro.tokens = {"entrada": 0, "salida": 0, "cacheLectura": 0, "cacheEscritura": 0}
    registro.contexto = {
        "usados": 24_800,
        "maximo": 200_000,
        "porcentaje": 12.4,
        "umbralCompactacion": 167_000,
        "categorias": [
            {"nombre": "System prompt", "tokens": 2_100, "diferida": False},
            {"nombre": "System tools", "tokens": 4_600, "diferida": False},
            {"nombre": "Messages", "tokens": 18_100, "diferida": False},
            {"nombre": "Free space", "tokens": 175_200, "diferida": False},
        ],
    }
    yield _evento_fin(registro)
