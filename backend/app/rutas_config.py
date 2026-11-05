"""/api/admin/correo — configurar el correo de envío desde la interfaz.

Solo para quien administra cuentas (permiso "usuarios"). La contraseña de
aplicación entra por aquí y se guarda cifrada (correo.py); NUNCA sale: la
lectura solo dice si está configurada.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from . import correo, db
from .esquemas import ConfigCorreoEntrada, ConfigCorreoPublica
from .seguridad import requiere_permiso

router = APIRouter(prefix="/admin/correo", tags=["admin"])


def _publica() -> ConfigCorreoPublica:
    cfg = correo.leer_config()
    return ConfigCorreoPublica(
        usuario=cfg.usuario,
        configurada=cfg.listo,
        remitente=cfg.remitente,
        contacto=db.config("correo.contacto"),
        url_publica=cfg.url_publica,
    )


@router.get("", response_model=ConfigCorreoPublica)
def leer(_admin: db.Usuario = Depends(requiere_permiso("usuarios"))) -> ConfigCorreoPublica:
    return _publica()


@router.put("", response_model=ConfigCorreoPublica)
def guardar(datos: ConfigCorreoEntrada, _admin: db.Usuario = Depends(requiere_permiso("usuarios"))) -> ConfigCorreoPublica:
    correo.guardar_config(datos.usuario, datos.contrasena, datos.remitente, datos.contacto, datos.url_publica)
    return _publica()


@router.post("/prueba")
async def probar(_admin: db.Usuario = Depends(requiere_permiso("usuarios"))) -> dict[str, str]:
    """Manda un correo de prueba, con el diseño real, al PROPIO Gmail configurado.

    No a la cuenta del admin: esa puede ser un correo interno o inventado
    (admin@umbral.lab) y Gmail devolvería un rebote "Address not found" que
    parece un fallo de configuración sin serlo.
    """
    destino = correo.leer_config().usuario
    if not destino:
        raise HTTPException(status.HTTP_409_CONFLICT, "Primero guarda el correo de Gmail y la contraseña de aplicación.")
    asunto, cuerpo_html, cuerpo_texto = correo.correo_prueba(destino)
    try:
        await correo.enviar(destino, asunto, cuerpo_html, cuerpo_texto)
    except correo.CorreoNoConfigurado:
        raise HTTPException(status.HTTP_409_CONFLICT, "Primero guarda el correo de Gmail y la contraseña de aplicación.") from None
    except correo.FalloEnvio as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, str(exc)) from None
    return {"mensaje": f"Listo: revisa la bandeja de {destino}."}
