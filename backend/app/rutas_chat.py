"""/api/chat — la frontera entre la capa 2 y la capa 3.

Antes de abrir el stream, la capa 2 revisa (y aquí sí responde con códigos HTTP):

    401  ¿hay token válido?                 (seguridad.usuario_actual)
    404  ¿existe el perfil que pidió?
    403  ¿su rol incluye ese perfil?  ¿puede mandar parámetros?
    429  ¿le quedan consultas hoy?
    409  ¿el perfil es exclusivo y ya está ocupado?

Si todo pasa, abre el stream SSE y le entrega el trabajo al motor. A partir de
ahí los problemas viajan como eventos `error`, porque los encabezados HTTP ya se
enviaron.
"""

import asyncio
import logging
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from . import db
from .config import ajustes
from .esquemas import ParametrosChat, PeticionChat
from .motor import ESFUERZO_POR_NIVEL, Ajuste, Registro, consultar
from .perfiles import PERFILES, Perfil, puede_usar, rol, tiene_permiso
from .protocolo import LATIDO, a_sse, evento
from .seguridad import usuario_actual

log = logging.getLogger("lab.chat")
router = APIRouter(tags=["chat"])

# Cuántos agentes corren a la vez en toda la máquina. Los demás esperan turno
# (recibiendo latidos) en vez de tumbar la laptop.
_semaforo = asyncio.Semaphore(ajustes.agentes_simultaneos)
# Un candado por perfil exclusivo (el generador escribe archivos compartidos).
_candados: dict[str, asyncio.Lock] = {}

SEGUNDOS_ENTRE_LATIDOS = 10
_FIN = object()


@router.post("/chat")
async def chat(peticion: PeticionChat, usuario: db.Usuario = Depends(usuario_actual)) -> StreamingResponse:
    perfil = PERFILES.get(peticion.perfil)
    if perfil is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese modo no existe.")
    if not puede_usar(usuario.rol, perfil.id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta no tiene acceso a ese modo.")

    parametros = peticion.parametros or ParametrosChat()
    if parametros.pide_ajustes() and not tiene_permiso(usuario.rol, "parametros"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo un administrador puede cambiar el modelo o el system prompt.")

    limite = rol(usuario.rol).consultas_por_dia
    if limite is not None:
        hace_un_dia = datetime.now(timezone.utc) - timedelta(days=1)
        if db.consultas_desde(usuario.id, hace_un_dia) >= limite:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Llegaste al límite de {limite} consultas por día.")

    candado = None
    if perfil.exclusivo:
        candado = _candados.setdefault(perfil.id, asyncio.Lock())
        if candado.locked():
            raise HTTPException(status.HTTP_409_CONFLICT, "Ese modo ya está trabajando en otra tarea. Intenta cuando termine.")

    sesion_previa = None if parametros.reiniciar_memoria else db.sesion_de(usuario.id, peticion.conversacion_id, perfil.id)
    ajuste = Ajuste(
        modelo=parametros.modelo or None,
        esfuerzo=ESFUERZO_POR_NIVEL.get(parametros.nivel_pensamiento or ""),
        system_prompt=parametros.system_prompt or None,
    )

    return StreamingResponse(
        _transmitir(usuario, peticion, perfil, sesion_previa, ajuste, candado),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


async def _transmitir(
    usuario: db.Usuario,
    peticion: PeticionChat,
    perfil: Perfil,
    sesion_previa: str | None,
    ajuste: Ajuste,
    candado: asyncio.Lock | None,
) -> AsyncIterator[str]:
    registro = Registro()
    cola: asyncio.Queue[object] = asyncio.Queue()

    async def correr_motor() -> None:
        eventos = consultar(
            perfil,
            peticion.mensaje,
            sesion_previa=sesion_previa,
            usuario_id=usuario.id,
            ajuste=ajuste,
            registro=registro,
        )
        async for ev in eventos:
            await cola.put(ev)

    async def producir() -> None:
        try:
            async with _semaforo:
                if candado is None:
                    await correr_motor()
                else:
                    async with candado:
                        await correr_motor()
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("Falló la consulta")
            registro.error = registro.error or "motor"
            await cola.put(evento("error", codigo="motor", mensaje="El agente falló al responder."))
        finally:
            cola.put_nowait(_FIN)

    terminada = False
    tarea = asyncio.create_task(producir())
    try:
        yield a_sse(evento("inicio", conversacionId=peticion.conversacion_id, perfil=perfil.id, motor=ajustes.motor))
        while True:
            try:
                ev = await asyncio.wait_for(cola.get(), timeout=SEGUNDOS_ENTRE_LATIDOS)
            except TimeoutError:
                yield LATIDO  # el modelo sigue pensando; la conexión sigue viva
                continue
            if ev is _FIN:
                break
            yield a_sse(ev)  # type: ignore[arg-type]
        terminada = True
    finally:
        # Si el navegador se fue (botón Detener, pestaña cerrada), se cancela
        # el motor: cancelar la tarea cierra el subproceso `claude`.
        if not tarea.done():
            tarea.cancel()
        estado = "error" if registro.error else ("completa" if terminada else "cancelada")
        if registro.sesion_sdk:
            db.guardar_sesion(usuario.id, peticion.conversacion_id, perfil.id, registro.sesion_sdk)
        db.registrar_consulta(
            usuario_id=usuario.id,
            conversacion_id=peticion.conversacion_id,
            perfil=perfil.id,
            motor=ajustes.motor,
            pregunta=peticion.mensaje,
            sesion_sdk=registro.sesion_sdk,
            costo_usd=registro.costo_usd,
            vueltas=registro.vueltas,
            duracion_ms=registro.duracion_ms,
            tokens=registro.tokens,
            herramientas=registro.herramientas,
            modelo=registro.modelo,
            estado=estado,
            error=registro.error,
        )
        log.info(
            "consulta %s · %s · %s · $%s · %s vueltas",
            estado, usuario.correo, perfil.id, registro.costo_usd, registro.vueltas,
        )
