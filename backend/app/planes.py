"""Planes de uso: cuánto le queda a una cuenta con tope (el invitado).

Dos topes, y los dos se cuentan con el gasto REGISTRADO en la base (que ya
incluye las consultas en curso con su estimado en vivo):

  - Por cuenta: `Rol.presupuesto_total_usd` (invitado: $0.30 en total).
  - Global: todos los invitados juntos no pasan de TOPE_MENSUAL_INVITADOS_USD
    al mes. Es la defensa contra quien cree muchas cuentas: aunque lo logre,
    el laboratorio no gasta más que eso.
"""

from dataclasses import dataclass
from datetime import datetime, timezone

from . import correo, db
from .perfiles import ROL_REGISTRO, TOPE_MENSUAL_INVITADOS_USD, rol


@dataclass
class EstadoPlan:
    tipo: str
    gastado_usd: float
    limite_usd: float
    modelo: str | None
    contacto: str | None
    cupo_global_agotado: bool

    @property
    def restante_usd(self) -> float:
        return max(0.0, self.limite_usd - self.gastado_usd)

    @property
    def agotado(self) -> bool:
        # Por debajo de un centavo ya no alcanza para una respuesta completa.
        return self.restante_usd < 0.01 or self.cupo_global_agotado


def inicio_de_mes() -> datetime:
    return datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def estado(usuario: db.Usuario) -> EstadoPlan | None:
    r = rol(usuario.rol)
    if r.presupuesto_total_usd is None:
        return None
    global_gastado = db.gasto_rol_desde(ROL_REGISTRO, inicio_de_mes()) if usuario.rol == ROL_REGISTRO else 0.0
    return EstadoPlan(
        tipo=usuario.rol,
        gastado_usd=db.gasto_usuario(usuario.id),
        limite_usd=r.presupuesto_total_usd,
        modelo=r.modelo_forzado,
        contacto=correo.leer_config().contacto,
        cupo_global_agotado=global_gastado >= TOPE_MENSUAL_INVITADOS_USD,
    )
