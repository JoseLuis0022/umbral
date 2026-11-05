"""/api/conversaciones — el historial del chat, guardado en el servidor.

Antes las conversaciones vivían solo en el localStorage de cada navegador:
otro navegador u otro dispositivo no las veía, se perdían al limpiar el
navegador y caducaban a las 12 horas. Ahora el servidor es la fuente de verdad
y el navegador guarda solo una copia para pintar la lista al instante.

Cada conversación es un documento JSON (el mismo `Conversacion` del front).
El dueño lo dice el TOKEN, nunca el cuerpo: `usuarioId` se reescribe aquí, y
nadie puede leer, pisar ni borrar la conversación de otra cuenta.
"""

from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, Request, status

from . import db
from .seguridad import usuario_actual

router = APIRouter(prefix="/conversaciones", tags=["conversaciones"])

# Una conversación con mucho proceso y miniaturas ronda los cientos de KB; esto
# deja margen sin permitir que alguien use el historial como disco.
MAX_BYTES_CONVERSACION = 5 * 1024 * 1024


@router.get("")
def listar(usuario: db.Usuario = Depends(usuario_actual)) -> list[dict[str, Any]]:
    return db.conversaciones_de(usuario.id)


@router.put("/{conversacion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def guardar(
    conversacion_id: str,
    request: Request,
    datos: dict[str, Any] = Body(...),
    usuario: db.Usuario = Depends(usuario_actual),
) -> None:
    if int(request.headers.get("content-length") or 0) > MAX_BYTES_CONVERSACION:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "La conversación es demasiado grande para guardarla.")
    if datos.get("id") != conversacion_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El id de la conversación no coincide.")
    dueno = db.dueno_conversacion(conversacion_id)
    if dueno is not None and dueno != usuario.id:
        # Mismo mensaje que si no existiera: no se confirma que el id es de otro.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa conversación no existe.")
    db.guardar_conversacion(usuario.id, conversacion_id, {**datos, "usuarioId": usuario.id})


@router.delete("/{conversacion_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(conversacion_id: str, usuario: db.Usuario = Depends(usuario_actual)) -> None:
    db.eliminar_conversacion(usuario.id, conversacion_id)
