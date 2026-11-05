"""/api/chat — la frontera entre la capa 2 y la capa 3.

Antes de abrir el stream, la capa 2 revisa (y aquí sí responde con códigos HTTP):

    401  ¿hay token válido?                 (seguridad.usuario_actual)
    404  ¿existe el perfil que pidió?
    403  ¿su rol incluye ese perfil?  ¿puede mandar parámetros?
    429  ¿le quedan consultas hoy?
    409  ¿esta conversación ya trabaja? (un perfil exclusivo ocupado NO rechaza: espera)
    429  ¿ya tiene MAX_TRABAJOS_POR_USUARIO tareas en curso?

Si todo pasa, crea un TRABAJO (ver trabajos.py) que corre el agente por su
cuenta, y la respuesta SSE solo lo observa: cerrar la pestaña ya no cancela.
A partir de ahí los problemas viajan como eventos `error`, porque los
encabezados HTTP ya se enviaron.
"""

import asyncio
import contextlib
import logging
import time
from collections.abc import AsyncIterator
from typing import Any
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from . import db
from .config import ajustes
from .esquemas import ModeloDisponible, ParametrosChat, PeticionChat
from . import planes, trabajos
from .motor import Ajuste, Registro, consultar
from .perfiles import PERFILES, Perfil, puede_usar, rol, tiene_permiso
from .protocolo import evento
from .seguridad import requiere_permiso, usuario_actual

log = logging.getLogger("lab.chat")
router = APIRouter(tags=["chat"])

# Cuántos agentes corren a la vez en toda la máquina. Los demás esperan turno
# (recibiendo latidos) en vez de tumbar la laptop.
_semaforo = asyncio.Semaphore(ajustes.agentes_simultaneos)
# Un candado por perfil exclusivo (el generador escribe archivos compartidos).
_candados: dict[str, asyncio.Lock] = {}

# Tareas en curso por persona (en distintas conversaciones). Cada una es un
# subproceso del agente: sin tope, una cuenta podría acaparar la máquina.
MAX_TRABAJOS_POR_USUARIO = 3
# Cada cuánto se escribe en la base el gasto de una consulta que sigue corriendo.
SEGUNDOS_ENTRE_GUARDADOS = 5

# Los modelos de la cuenta casi nunca cambian: se le pregunta a Anthropic una
# vez cada 10 minutos, no en cada apertura del chat.
_CACHE_MODELOS: dict[str, object] = {"vence": 0.0, "lista": []}
SEGUNDOS_CACHE_MODELOS = 600


@router.get("/modelos", response_model=list[ModeloDisponible])
async def modelos(_usuario: db.Usuario = Depends(requiere_permiso("parametros"))) -> list[ModeloDisponible]:
    """Los modelos que tiene la cuenta de la API key del laboratorio."""
    if ajustes.motor == "prueba" or not ajustes.anthropic_api_key:
        return [ModeloDisponible(id="motor-de-prueba", nombre="Motor de prueba")]
    if time.monotonic() < float(_CACHE_MODELOS["vence"]):  # type: ignore[arg-type]
        return _CACHE_MODELOS["lista"]  # type: ignore[return-value]
    try:
        async with httpx.AsyncClient(timeout=15) as cliente:
            r = await cliente.get(
                "https://api.anthropic.com/v1/models",
                params={"limit": 100},
                headers={"x-api-key": ajustes.anthropic_api_key, "anthropic-version": "2023-06-01"},
            )
        r.raise_for_status()
    except httpx.HTTPError:
        log.warning("No se pudo listar los modelos", exc_info=True)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No pudimos consultar los modelos de Anthropic.") from None
    lista = [ModeloDisponible(id=m["id"], nombre=m.get("display_name") or m["id"]) for m in r.json().get("data", [])]
    _CACHE_MODELOS.update(vence=time.monotonic() + SEGUNDOS_CACHE_MODELOS, lista=lista)
    return lista


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

    # Un perfil exclusivo (el Generador escribe archivos compartidos) no corre
    # dos veces a la vez, pero tampoco RECHAZA: la tarea nueva espera su turno
    # y arranca sola (evento `espera`). Así se pueden tener varias
    # conversaciones abiertas sin que la segunda falle.
    # Cuentas con tope (invitado): crédito propio y cupo mensual de todos los
    # invitados. 402 = "pago requerido": el front lo muestra como el aviso de
    # "modo invitado" con el contacto para pedir más.
    plan = planes.estado(usuario)
    if plan is not None:
        if plan.cupo_global_agotado:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                "El cupo de prueba de este mes ya se agotó. Escríbeme para seguir usando Umbral.",
            )
        if plan.agotado:
            raise HTTPException(
                status.HTTP_402_PAYMENT_REQUIRED,
                f"Usaste tu crédito de prueba (US${plan.limite_usd:.2f}). Escríbeme para seguir usando Umbral.",
            )

    candado = _candados.setdefault(perfil.id, asyncio.Lock()) if perfil.exclusivo else None

    sesion_previa = None if parametros.reiniciar_memoria else db.sesion_de(usuario.id, peticion.conversacion_id, perfil.id)
    ajuste = Ajuste(
        modelo=parametros.modelo or None,
        esfuerzo=parametros.esfuerzo,
        system_prompt=parametros.system_prompt or None,
        # Razonamiento y rutas de archivos: solo para quien ya puede cambiar el
        # modelo y el system prompt. Los demás ven el "qué", no el "dónde".
        ver_interno=tiene_permiso(usuario.rol, "parametros"),
    )
    if plan is not None:
        # El modelo lo decide el rol (invitado: Haiku) y la consulta no puede
        # gastar más de lo que le queda: lo corta el propio agente.
        ajuste.modelo = rol(usuario.rol).modelo_forzado or ajuste.modelo
        ajuste.presupuesto_usd = plan.restante_usd

    if trabajos.en_curso(usuario.id, peticion.conversacion_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Esta conversación ya está trabajando. Espera a que termine o detenla.")
    if len(trabajos.en_curso(usuario.id)) >= MAX_TRABAJOS_POR_USUARIO:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Ya tienes {MAX_TRABAJOS_POR_USUARIO} tareas en curso. Espera a que termine alguna.",
        )

    pregunta = (
        peticion.mensaje
        + (f" [+{len(peticion.imagenes)} imagen(es)]" if peticion.imagenes else "")
        + (f" [+{', '.join(d.nombre for d in peticion.documentos)}]" if peticion.documentos else "")
    )
    trabajo = trabajos.crear(usuario.id, peticion.conversacion_id, perfil.id, pregunta)
    trabajo.agregar(
        evento("inicio", conversacionId=peticion.conversacion_id, perfil=perfil.id, motor=ajustes.motor, trabajoId=trabajo.id)
    )
    trabajos.arrancar(trabajo, lambda t: _ejecutar(t, usuario, peticion, pregunta, perfil, sesion_previa, ajuste, candado))

    # La respuesta HTTP solo OBSERVA el trabajo: si el navegador se va, el
    # agente sigue y se puede volver a ver con GET /api/trabajos/{id}/eventos.
    return _sse(trabajos.observar(trabajo))


@contextlib.asynccontextmanager
async def _sin_candado() -> AsyncIterator[None]:
    yield


def _sse(flujo: AsyncIterator[str]) -> StreamingResponse:
    return StreamingResponse(
        flujo,
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/trabajos")
async def listar_trabajos(usuario: db.Usuario = Depends(usuario_actual)) -> list[dict[str, Any]]:
    """Los trabajos del usuario: los que corren y los terminados en la última hora."""
    return [t.publico() for t in trabajos.del_usuario(usuario.id)]


@router.get("/trabajos/{trabajo_id}/eventos")
async def eventos_trabajo(trabajo_id: str, desde: int = 0, usuario: db.Usuario = Depends(usuario_actual)) -> StreamingResponse:
    """Volver a ver un trabajo: repite sus eventos desde `desde` y sigue en vivo."""
    trabajo = trabajos.de(usuario.id, trabajo_id)
    if trabajo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa tarea ya no existe. Si el servidor se reinició, vuelve a pedirla.")
    return _sse(trabajos.observar(trabajo, desde))


@router.post("/trabajos/{trabajo_id}/detener", status_code=status.HTTP_204_NO_CONTENT)
async def detener_trabajo(trabajo_id: str, usuario: db.Usuario = Depends(usuario_actual)) -> None:
    """Detener es una ORDEN explícita: cerrar la pestaña ya no cancela nada."""
    trabajo = trabajos.de(usuario.id, trabajo_id)
    if trabajo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa tarea ya no existe.")
    trabajos.detener(trabajo)


async def _ejecutar(
    trabajo: trabajos.Trabajo,
    usuario: db.Usuario,
    peticion: PeticionChat,
    pregunta: str,
    perfil: Perfil,
    sesion_previa: str | None,
    ajuste: Ajuste,
    candado: asyncio.Lock | None,
) -> None:
    """Corre el agente de principio a fin, haya o no alguien mirando."""
    registro = Registro()
    # La consulta queda registrada DESDE QUE EMPIEZA (estado "corriendo") y su
    # gasto se actualiza mientras corre: el Tablero ve las tareas largas en vivo
    # y una que falla o se cancela no se lleva su gasto sin dejar rastro.
    consulta_id = db.abrir_consulta(
        usuario_id=usuario.id,
        conversacion_id=peticion.conversacion_id,
        perfil=perfil.id,
        motor=ajustes.motor,
        pregunta=pregunta,
    )
    ultimo_guardado = time.monotonic()
    # Lo que la persona ve como respuesta, para la auditoría. Solo `texto`: el
    # razonamiento (`pensamiento`) no es parte de la respuesta.
    partes_respuesta: list[str] = []
    estado: trabajos.EstadoTrabajo = "completa"

    async def correr_motor() -> None:
        eventos = consultar(
            perfil,
            peticion.mensaje,
            peticion.imagenes,
            peticion.documentos,
            sesion_previa=sesion_previa,
            usuario_id=usuario.id,
            ajuste=ajuste,
            registro=registro,
        )
        nonlocal ultimo_guardado
        async for ev in eventos:
            if ev.get("tipo") == "error":
                # ¿Se puede CONTINUAR en vez de empezar de cero? Si el agente ya
                # avanzó (usó herramientas), su sesión guarda todo lo que hizo.
                ev = {**ev, "reanudable": bool(registro.herramientas) and bool(registro.sesion_sdk)}
            if ev.get("tipo") == "texto":
                partes_respuesta.append(str(ev.get("delta") or ""))
            elif ev.get("tipo") == "archivo":
                # En Auditoría se ve qué material se mandó, junto a la respuesta.
                partes_respuesta.append(f"\n\n📎 {ev.get('nombre')} ({ev.get('ruta')})")
            trabajo.agregar(ev)
            trabajo.costo_usd = registro.costo_conocido
            if time.monotonic() - ultimo_guardado >= SEGUNDOS_ENTRE_GUARDADOS:
                ultimo_guardado = time.monotonic()
                db.actualizar_consulta(
                    consulta_id,
                    costo_usd=registro.costo_conocido,
                    sesion_sdk=registro.sesion_sdk,
                    modelo=registro.modelo,
                    herramientas=registro.herramientas,
                )

    try:
        if candado is not None and candado.locked():
            trabajo.agregar(evento("espera", motivo=f"En espera: el modo {perfil.nombre} está terminando otra tarea"))
        async with candado if candado is not None else _sin_candado():
            if _semaforo.locked():
                trabajo.agregar(evento("espera", motivo="En espera: el servidor está atendiendo otras consultas"))
            async with _semaforo:
                await correr_motor()
    except asyncio.CancelledError:
        # Solo llega aquí por POST /detener (o al apagar el servidor). Cancelar
        # la tarea cierra el subproceso `claude`. Quien siga observando (otra
        # pestaña) se entera por este evento, no por un corte mudo.
        estado = "cancelada"
        trabajo.agregar(evento("error", codigo="cancelada", mensaje="Se detuvo esta respuesta."))
    except Exception:
        log.exception("Falló la consulta")
        registro.error = registro.error or "motor"
        trabajo.agregar(evento("error", codigo="motor", mensaje="El agente falló al responder."))
    finally:
        if estado != "cancelada" and registro.error:
            estado = "error"
        # La sesión se guarda si terminó bien O si avanzó antes de fallar o de
        # que la detuvieran: así "Continuar" retoma con todo lo que ya hizo.
        # Una que falló SIN avanzar no reemplaza la sesión buena anterior (la
        # siguiente pregunta reanudaría una sesión vacía o rota).
        if registro.sesion_sdk and (not registro.error or registro.herramientas or estado == "cancelada"):
            db.guardar_sesion(usuario.id, peticion.conversacion_id, perfil.id, registro.sesion_sdk)
        db.actualizar_consulta(
            consulta_id,
            respuesta="".join(partes_respuesta) or None,
            sesion_sdk=registro.sesion_sdk,
            # El exacto si el agente terminó; si no, lo estimado en vivo.
            costo_usd=registro.costo_conocido,
            vueltas=registro.vueltas,
            duracion_ms=registro.duracion_ms,
            tokens=registro.tokens,
            herramientas=registro.herramientas,
            modelo=registro.modelo,
            estado=estado,
            error=registro.error,
        )
        trabajo.costo_usd = registro.costo_conocido
        log.info(
            "consulta %s · %s · %s · $%s · %s vueltas · %s reintentos · %s",
            estado, usuario.correo, perfil.id,
            registro.costo_usd if registro.costo_usd is not None else f"{registro.costo_conocido} (estimado)",
            registro.vueltas, registro.reintentos, trabajo.id,
        )
        trabajo.cerrar(estado)
