"""Trabajos: la consulta vive en el servidor, no en la conexión.

Antes, la respuesta del agente vivía DENTRO de la petición HTTP: si el
navegador se iba (otra pantalla, recarga, cerrar la pestaña, el wifi), la
conexión se cortaba y el agente moría con ella. Para una pregunta de 10
segundos da igual; para el Generador, que tarda minutos, era perder el trabajo.

Ahora cada consulta es un `Trabajo`:

    POST /api/chat ──► crea el Trabajo ──► asyncio.Task corre el motor
                            │                      │
                            │               cada evento se GUARDA en
                            │               `trabajo.eventos` (en orden)
                            ▼
                    la respuesta HTTP es solo un OBSERVADOR: repite los
                    eventos desde el índice que le pidan y sigue en vivo.

Si el observador se va, el trabajo sigue. Para volver a verlo:

    GET  /api/trabajos                      los del usuario (en curso y recientes)
    GET  /api/trabajos/{id}/eventos?desde=N SSE: repite desde N y sigue en vivo
    POST /api/trabajos/{id}/detener         la ÚNICA forma de cancelar

Los trabajos viven en la memoria de ESTE proceso: si el servidor se reinicia,
los que estaban corriendo se pierden (el front lo detecta con un 404 y ofrece
reintentar). Los terminados se conservan RETENCION_S para que el navegador
pueda recoger la respuesta aunque haya estado cerrado.
"""

import asyncio
import logging
import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass, field
from typing import Any, Literal

from .protocolo import LATIDO, a_sse

log = logging.getLogger("lab.trabajos")

EstadoTrabajo = Literal["corriendo", "completa", "error", "cancelada"]

# Una hora: suficiente para cerrar la laptop, volver y encontrar la respuesta.
RETENCION_S = 60 * 60
SEGUNDOS_ENTRE_LATIDOS = 10


@dataclass
class Trabajo:
    id: str
    usuario_id: str
    conversacion_id: str
    perfil: str
    pregunta: str
    creado: float = field(default_factory=time.time)
    terminado_en: float | None = None
    estado: EstadoTrabajo = "corriendo"
    eventos: list[dict[str, Any]] = field(default_factory=list)
    # Para la barra de progreso: cuántos pasos lleva y qué está haciendo.
    pasos: int = 0
    actividad: str | None = None
    costo_usd: float | None = None
    tarea: asyncio.Task[None] | None = None
    _cambio: asyncio.Event = field(default_factory=asyncio.Event)

    def agregar(self, ev: dict[str, Any]) -> None:
        self.eventos.append(ev)
        if ev.get("tipo") == "actividad" and ev.get("fase") == "inicio" and not ev.get("dentroDe"):
            self.pasos += 1
            self.actividad = ev.get("descripcion")
        elif ev.get("tipo") == "reintento":
            self.actividad = ev.get("motivo")
        elif ev.get("tipo") == "texto":
            self.actividad = "Escribiendo la respuesta"
        elif ev.get("tipo") == "fin":
            self.costo_usd = ev.get("costoUsd")
        self._avisar()

    def cerrar(self, estado: EstadoTrabajo) -> None:
        self.estado = estado
        self.terminado_en = time.time()
        self.actividad = None
        self._avisar()

    def _avisar(self) -> None:
        # Despierta a todos los observadores y prepara el siguiente aviso.
        self._cambio.set()
        self._cambio = asyncio.Event()

    @property
    def corriendo(self) -> bool:
        return self.estado == "corriendo"

    def publico(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "conversacionId": self.conversacion_id,
            "perfil": self.perfil,
            "pregunta": self.pregunta,
            "estado": self.estado,
            "creadoEn": _iso(self.creado),
            "terminadoEn": _iso(self.terminado_en) if self.terminado_en else None,
            "pasos": self.pasos,
            "actividad": self.actividad,
            "costoUsd": self.costo_usd,
            "eventos": len(self.eventos),
        }


def _iso(t: float) -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(t)) + f".{int((t % 1) * 1000):03d}Z"


_trabajos: dict[str, Trabajo] = {}


def _limpiar() -> None:
    limite = time.time() - RETENCION_S
    for tid in [t.id for t in _trabajos.values() if t.terminado_en and t.terminado_en < limite]:
        del _trabajos[tid]


def crear(usuario_id: str, conversacion_id: str, perfil: str, pregunta: str) -> Trabajo:
    _limpiar()
    t = Trabajo(id=f"t-{uuid.uuid4().hex[:12]}", usuario_id=usuario_id, conversacion_id=conversacion_id, perfil=perfil, pregunta=pregunta[:120])
    _trabajos[t.id] = t
    return t


def arrancar(t: Trabajo, correr: Callable[[Trabajo], Awaitable[None]]) -> None:
    """Corre `correr(t)` como tarea propia: no depende de ninguna petición HTTP."""
    t.tarea = asyncio.create_task(correr(t), name=t.id)


def de(usuario_id: str, trabajo_id: str) -> Trabajo | None:
    t = _trabajos.get(trabajo_id)
    return t if t and t.usuario_id == usuario_id else None


def del_usuario(usuario_id: str) -> list[Trabajo]:
    _limpiar()
    return sorted((t for t in _trabajos.values() if t.usuario_id == usuario_id), key=lambda t: t.creado, reverse=True)


def en_curso(usuario_id: str, conversacion_id: str | None = None) -> list[Trabajo]:
    return [
        t
        for t in _trabajos.values()
        if t.usuario_id == usuario_id and t.corriendo and (conversacion_id is None or t.conversacion_id == conversacion_id)
    ]


def detener(t: Trabajo) -> None:
    if t.corriendo and t.tarea and not t.tarea.done():
        t.tarea.cancel()


async def observar(t: Trabajo, desde: int = 0) -> AsyncIterator[str]:
    """SSE de un trabajo: repite lo que ya pasó desde `desde` y sigue en vivo.

    Si el navegador se desconecta, este generador se cancela y el trabajo sigue.
    """
    i = max(0, desde)
    while True:
        # El aviso se toma ANTES de leer: un evento que llegue mientras se
        # transmite lo dispara, y la espera de abajo regresa al instante.
        espera = t._cambio
        while i < len(t.eventos):
            yield a_sse(t.eventos[i])
            i += 1
        if not t.corriendo:
            return
        try:
            await asyncio.wait_for(espera.wait(), timeout=SEGUNDOS_ENTRE_LATIDOS)
        except TimeoutError:
            yield LATIDO  # el agente sigue trabajando; la conexión sigue viva
