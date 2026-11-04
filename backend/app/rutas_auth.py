"""/api/auth — iniciar sesión y saber quién soy."""

from fastapi import APIRouter, Depends, HTTPException, status

from . import db
from .esquemas import Credenciales, SesionIniciada, Yo, publico
from .seguridad import emitir_token, usuario_actual, verificar

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=SesionIniciada)
def iniciar_sesion(credenciales: Credenciales) -> SesionIniciada:
    usuario = db.usuario_por_correo(credenciales.correo.strip().lower())
    # Se verifica SIEMPRE (contra un hash señuelo si el correo no existe), y el
    # mensaje es el mismo en los dos casos: ni por el tiempo ni por el texto se
    # puede saber qué correos tienen cuenta.
    valida = verificar(usuario.hash if usuario else None, credenciales.contrasena)
    if usuario is None or not valida:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos.")
    return SesionIniciada(token=emitir_token(usuario), **publico(usuario).model_dump())


@router.get("/yo", response_model=Yo)
def yo(usuario: db.Usuario = Depends(usuario_actual)) -> Yo:
    return publico(usuario)
