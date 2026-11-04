"""Contraseñas, tokens y las dependencias que protegen cada endpoint.

Regla de oro: la identidad sale del TOKEN firmado, nunca del cuerpo de la
petición. Y el rol se lee de la base en cada petición, no del token: si le
quitas el rol de admin a alguien, deja de serlo en su siguiente petición, sin
esperar a que su token expire.
"""

from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from . import db
from .config import ajustes
from .perfiles import tiene_permiso

_hasher = PasswordHasher()

# Se verifica contra este hash cuando el correo no existe. Así "correo
# inexistente" tarda lo mismo que "contraseña incorrecta", y un atacante no
# puede medir el tiempo de respuesta para descubrir qué correos tienen cuenta.
_HASH_SEÑUELO = _hasher.hash("señuelo-sin-cuenta")

ALGORITMO = "HS256"


def hashear(contrasena: str) -> str:
    return _hasher.hash(contrasena)


def verificar(hash_guardado: str | None, contrasena: str) -> bool:
    try:
        _hasher.verify(hash_guardado or _HASH_SEÑUELO, contrasena)
    except (VerificationError, InvalidHashError):
        return False
    return hash_guardado is not None


def emitir_token(usuario: db.Usuario) -> str:
    momento = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": usuario.id, "rol": usuario.rol, "iat": momento, "exp": momento + timedelta(hours=ajustes.jwt_horas)},
        ajustes.jwt_secreto,
        algorithm=ALGORITMO,
    )


def _no_autorizado(detalle: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detalle, headers={"WWW-Authenticate": "Bearer"})


_bearer = HTTPBearer(auto_error=False)


def usuario_actual(credencial: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> db.Usuario:
    if credencial is None:
        raise _no_autorizado("Inicia sesión para continuar.")
    try:
        datos = jwt.decode(
            credencial.credentials,
            ajustes.jwt_secreto,
            algorithms=[ALGORITMO],  # fijo: nunca aceptar el algoritmo que diga el token
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise _no_autorizado("Tu sesión expiró. Vuelve a iniciar sesión.") from None
    except jwt.InvalidTokenError:
        raise _no_autorizado("Sesión inválida. Vuelve a iniciar sesión.") from None

    usuario = db.usuario_por_id(datos["sub"])
    if usuario is None:
        raise _no_autorizado("Tu cuenta ya no existe.")
    return usuario


def requiere_permiso(permiso: str):
    def dependencia(usuario: db.Usuario = Depends(usuario_actual)) -> db.Usuario:
        if not tiene_permiso(usuario.rol, permiso):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Tu cuenta no tiene permiso para esto.")
        return usuario

    return dependencia
