"""Nuestro protocolo de eventos: la API pública del chat.

El navegador nunca ve los mensajes crudos del SDK (traen rutas absolutas,
entradas de herramientas, system prompt, razonamiento). Ve SOLO estos eventos,
tipados igual en `frontend/src/types/index.ts`:

    inicio     {conversacionId, perfil, motor}
    texto      {delta}                                   ← muchas veces
    actividad  {id, clase, nombre, detalle, fase, ok, dentroDe}
    fin        {costoUsd, vueltas, duracionMs, tokens, modelo}
    error      {codigo, mensaje}

Transporte: SSE (`text/event-stream`). Cada evento es

    event: <tipo>
    data: <json>

y una línea en blanco. Las líneas que empiezan con ":" son latidos (comentarios
SSE): mantienen viva la conexión mientras el modelo piensa.
"""

import json
from typing import Any, Literal

TipoEvento = Literal["inicio", "texto", "actividad", "fin", "error"]

# Códigos de error estables: el front decide el mensaje y el tono por código.
CodigoError = Literal[
    "configuracion",   # falta la API key u otra pieza del servidor
    "credenciales",    # la API key es inválida
    "saldo",           # sin créditos en la cuenta de Anthropic
    "limite_api",      # rate limit de Anthropic
    "limite_vueltas",  # el agente agotó max_vueltas
    "limite_presupuesto",  # el agente agotó el tope en USD de la consulta
    "motor",           # el subproceso falló
]

LATIDO = ": latido\n\n"


def evento(tipo: TipoEvento, **datos: Any) -> dict[str, Any]:
    return {"tipo": tipo, **datos}


def a_sse(ev: dict[str, Any]) -> str:
    datos = {k: v for k, v in ev.items() if k != "tipo"}
    return f"event: {ev['tipo']}\ndata: {json.dumps(datos, ensure_ascii=False)}\n\n"
