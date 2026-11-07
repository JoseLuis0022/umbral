"""/api/auth — registro con verificación por correo, inicio de sesión y quién soy.

Registro (self-service):

    POST /registro  {nombre, correo, contrasena}
        → crea la cuenta SIN verificar (rol invitado) y manda un correo con
          un enlace de un solo uso: {url_publica}/verificar?token=…
    POST /verificar {token}  → activa la cuenta y entra (devuelve la sesión)
    POST /reenviar  {correo} → otro enlace (como mucho uno por minuto)

Defensas contra el abuso (el gasto real lo acota el tope mensual de invitados,
ver planes.py; esto evita la avalancha de cuentas):

  - Una cuenta sin verificar no puede entrar ni gastar.
  - Máximo REGISTROS_POR_IP_DIA cuentas por IP al día.
  - Se rechazan dominios de correo desechable conocidos.
  - Una cuenta YA VERIFICADA se avisa tal cual ("ya tienes cuenta, inicia
    sesión"): sin ese aviso, quien se registra dos veces se queda esperando un
    correo que nunca llega. Es lo que hace casi cualquier sitio; a cambio, el
    registro revela que ese correo tiene cuenta (no su contraseña ni sus datos).
    Para cuentas inexistentes o sin verificar la respuesta sigue siendo la misma.

Login: tras FALLOS_POR_CORREO intentos fallidos contra una cuenta, o
FALLOS_POR_IP desde una misma red, se responde 429 durante VENTANA_FALLOS_S.
Así adivinar contraseñas por fuerza bruta deja de ser práctico.
"""

import hashlib
import logging
import re
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status

from . import correo, db
from .esquemas import Credenciales, Registro, SesionIniciada, SoloCorreo, TokenVerificacion, Yo, publico
from .perfiles import ROL_REGISTRO
from .seguridad import emitir_token, hashear, usuario_actual, verificar

log = logging.getLogger("lab.auth")
router = APIRouter(prefix="/auth", tags=["auth"])

HORAS_VALIDEZ_ENLACE = 24
SEGUNDOS_ENTRE_REENVIOS = 60
REGISTROS_POR_IP_DIA = 3

FALLOS_POR_CORREO = 5
FALLOS_POR_IP = 20
VENTANA_FALLOS_S = 15 * 60
# En memoria: el backend corre en un solo proceso (ver trabajos.py). Un
# reinicio borra la cuenta de fallos, lo cual es aceptable para este tope.
_fallos: defaultdict[str, deque[float]] = defaultdict(deque)

_RX_CORREO = re.compile(r"^[^@\s]+@[^@\s]+\.[a-z]{2,}$", re.I)
# Los más comunes; no pretende ser exhaustiva (el tope mensual es la defensa real).
DOMINIOS_DESECHABLES = {
    "mailinator.com", "guerrillamail.com", "guerrillamail.info", "sharklasers.com", "10minutemail.com",
    "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com", "getnada.com", "dispostable.com",
    "maildrop.cc", "fakeinbox.com", "throwawaymail.com", "mohmal.com", "emailondeck.com", "mintemail.com",
}

MENSAJE_YA_VERIFICADA = "Este correo ya tiene una cuenta verificada. Inicia sesión con tu contraseña."
MENSAJE_ENVIADO = "Si el correo es válido, te enviamos un enlace para activar tu cuenta. Revisa también la carpeta de spam."


def _ip(request: Request) -> str:
    # Detrás de Cloudflare la IP real viene en CF-Connecting-IP.
    return request.headers.get("cf-connecting-ip") or (request.client.host if request.client else "desconocida")


def _recientes(llave: str, ahora: float) -> deque[float]:
    marcas = _fallos[llave]
    while marcas and ahora - marcas[0] > VENTANA_FALLOS_S:
        marcas.popleft()
    if not marcas:
        _fallos.pop(llave, None)  # que el dict no crezca con llaves viejas
        return deque()
    return marcas


def _frenar_si_abusa(ip: str, direccion: str) -> None:
    ahora = time.monotonic()
    for llave, tope in ((f"ip:{ip}", FALLOS_POR_IP), (f"correo:{direccion}", FALLOS_POR_CORREO)):
        marcas = _recientes(llave, ahora)
        if len(marcas) >= tope:
            espera = int(VENTANA_FALLOS_S - (ahora - marcas[0])) + 1
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                f"Demasiados intentos fallidos. Espera {max(1, round(espera / 60))} min e intenta de nuevo.",
                headers={"Retry-After": str(espera)},
            )


def _anotar_fallo(ip: str, direccion: str) -> None:
    ahora = time.monotonic()
    _fallos[f"ip:{ip}"].append(ahora)
    _fallos[f"correo:{direccion}"].append(ahora)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def _mandar_enlace(usuario: db.Usuario) -> None:
    token = secrets.token_urlsafe(32)
    db.guardar_verificacion(_hash_token(token), usuario.id, datetime.now(timezone.utc) + timedelta(hours=HORAS_VALIDEZ_ENLACE))
    url = f"{correo.leer_config().url_publica}/verificar?token={token}"
    asunto, cuerpo_html, cuerpo_texto = correo.correo_verificacion(usuario.nombre, usuario.correo, url, HORAS_VALIDEZ_ENLACE)
    await correo.enviar(usuario.correo, asunto, cuerpo_html, cuerpo_texto)


@router.post("/registro", status_code=status.HTTP_202_ACCEPTED)
async def registrarse(datos: Registro, request: Request) -> dict[str, str]:
    if not correo.leer_config().listo:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "El registro está cerrado por ahora. Intenta más tarde.")
    direccion = datos.correo.strip().lower()
    if not _RX_CORREO.match(direccion):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Escribe un correo válido.")
    if direccion.rsplit("@", 1)[1] in DOMINIOS_DESECHABLES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Usa un correo permanente; los desechables no se aceptan.")

    ip = _ip(request)
    if db.registros_desde_ip(ip, datetime.now(timezone.utc) - timedelta(days=1)) >= REGISTROS_POR_IP_DIA:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Se crearon demasiadas cuentas desde tu red hoy. Intenta mañana.")

    existente = db.usuario_por_correo(direccion)
    try:
        if existente is None:
            nuevo = db.crear_usuario_pendiente(direccion, datos.nombre, ROL_REGISTRO, hashear(datos.contrasena), ip)
            await _mandar_enlace(nuevo)
            log.info("registro · %s · ip %s", direccion, ip)
        elif not existente.verificado:
            # Se registró y no confirmó: otro enlace (sin cambiar su contraseña).
            await _mandar_enlace(existente)
        else:
            raise HTTPException(status.HTTP_409_CONFLICT, MENSAJE_YA_VERIFICADA)
    except correo.FalloEnvio:
        log.exception("No se pudo mandar el correo de verificación a %s", direccion)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No pudimos enviar el correo de verificación. Intenta en unos minutos.") from None
    return {"mensaje": MENSAJE_ENVIADO}


@router.post("/verificar", response_model=SesionIniciada)
def verificar_correo(datos: TokenVerificacion) -> SesionIniciada:
    encontrado = db.verificacion(_hash_token(datos.token))
    if encontrado is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El enlace no es válido o ya se usó. Si ya confirmaste, inicia sesión.")
    usuario_id, expira = encontrado
    if expira < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_410_GONE, "El enlace venció. Pide uno nuevo desde la pantalla de inicio de sesión.")
    db.marcar_verificado(usuario_id)
    usuario = db.usuario_por_id(usuario_id)
    if usuario is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Esa cuenta ya no existe.")
    log.info("verificado · %s", usuario.correo)
    return SesionIniciada(token=emitir_token(usuario), **publico(usuario).model_dump())


@router.post("/reenviar", status_code=status.HTTP_202_ACCEPTED)
async def reenviar(datos: SoloCorreo) -> dict[str, str | bool]:
    usuario = db.usuario_por_correo(datos.correo.strip().lower())
    if usuario and usuario.verificado:
        return {"mensaje": MENSAJE_YA_VERIFICADA, "verificada": True}
    if usuario and not usuario.verificado and correo.leer_config().listo:
        ultima = db.ultima_verificacion(usuario.id)
        if ultima is None or (datetime.now(timezone.utc) - ultima).total_seconds() >= SEGUNDOS_ENTRE_REENVIOS:
            try:
                await _mandar_enlace(usuario)
            except correo.FalloEnvio:
                log.exception("No se pudo reenviar la verificación a %s", usuario.correo)
    return {"mensaje": MENSAJE_ENVIADO}


@router.post("/login", response_model=SesionIniciada)
def iniciar_sesion(credenciales: Credenciales, request: Request) -> SesionIniciada:
    direccion = credenciales.correo.strip().lower()
    ip = _ip(request)
    _frenar_si_abusa(ip, direccion)
    usuario = db.usuario_por_correo(direccion)
    # Se verifica SIEMPRE (contra un hash señuelo si el correo no existe), y el
    # mensaje es el mismo en los dos casos: ni por el tiempo ni por el texto se
    # puede saber qué correos tienen cuenta.
    valida = verificar(usuario.hash if usuario else None, credenciales.contrasena)
    if usuario is None or not valida:
        _anotar_fallo(ip, direccion)
        log.info("login fallido · %s · ip %s", direccion, ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    # Solo DESPUÉS de comprobar la contraseña se dice que falta verificar: así
    # este aviso no delata qué correos se registraron.
    if not usuario.verificado:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Confirma tu correo antes de entrar: abre el enlace que te enviamos (revisa el spam)."
        )
    _fallos.pop(f"correo:{direccion}", None)
    return SesionIniciada(token=emitir_token(usuario), **publico(usuario).model_dump())


@router.get("/yo", response_model=Yo)
def yo(usuario: db.Usuario = Depends(usuario_actual)) -> Yo:
    return publico(usuario)
