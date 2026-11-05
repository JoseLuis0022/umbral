"""Nuestro protocolo de eventos: la API pública del chat.

El navegador nunca ve los mensajes crudos del SDK (traen rutas absolutas,
entradas de herramientas, system prompt, razonamiento). Ve SOLO estos eventos,
tipados igual en `frontend/src/types/index.ts`:

    inicio       {conversacionId, perfil, motor, trabajoId}
                  trabajoId: para volver a ver la consulta (GET /api/trabajos/{id}/eventos)
                  o detenerla (POST /api/trabajos/{id}/detener)
    pensamiento  {delta}                                 ← solo con permiso "parametros"
    texto        {delta}                                 ← muchas veces
    actividad    {id, clase, nombre, descripcion, detalle, fase, ok, dentroDe}
                  descripcion: para todos, sin rutas · detalle: solo con permiso (o null)
    archivo      {ruta, nombre, formato, tamanoBytes, coleccion}
                  material que el agente mandó (compartir_archivo); se descarga
                  con GET /api/archivos?ruta=…, que vuelve a validar la ruta
    fin          {costoUsd, vueltas, duracionMs, tokens, modelo, contexto}
    reintento    {capa, intento, maximo, esperaMs, motivo}
                  capa "api": el CLI reintenta una llamada a Anthropic (429, 5xx, red)
                  capa "agente": la consulta entera se repite; lo que se mostró de
                  ese intento (pasos, razonamiento) se descarta. Solo ocurre si
                  aún no salió texto ni archivos.
    error        {codigo, mensaje, detalle?}
                  detalle: la causa técnica, solo con permiso "parametros"

`contexto` = {usados, maximo, porcentaje, umbralCompactacion, categorias:
[{nombre, tokens, diferida}]}: lo mismo que muestra /context en Claude Code.

Transporte: SSE (`text/event-stream`). Cada evento es

    event: <tipo>
    data: <json>

y una línea en blanco. Las líneas que empiezan con ":" son latidos (comentarios
SSE): mantienen viva la conexión mientras el modelo piensa.
"""

import json
from typing import Any, Literal

TipoEvento = Literal["inicio", "pensamiento", "texto", "actividad", "archivo", "reintento", "fin", "error"]

# Códigos de error estables: el front decide el mensaje y el tono por código.
CodigoError = Literal[
    "configuracion",   # falta la API key u otra pieza del servidor
    "credenciales",    # la API key es inválida
    "saldo",           # sin créditos en la cuenta de Anthropic
    "limite_api",      # rate limit de Anthropic
    "limite_vueltas",  # el agente agotó max_vueltas
    "limite_presupuesto",  # el agente agotó el tope en USD de la consulta
    "conexion",        # no se pudo hablar con Anthropic (red caída o Anthropic caído)
    "interrumpido",    # el servidor se reinició a media respuesta
    "motor",           # el subproceso falló
    "cancelada",       # alguien la detuvo (POST /api/trabajos/{id}/detener)
]

LATIDO = ": latido\n\n"


def evento(tipo: TipoEvento, **datos: Any) -> dict[str, Any]:
    return {"tipo": tipo, **datos}


def a_sse(ev: dict[str, Any]) -> str:
    datos = {k: v for k, v in ev.items() if k != "tipo"}
    return f"event: {ev['tipo']}\ndata: {json.dumps(datos, ensure_ascii=False)}\n\n"
