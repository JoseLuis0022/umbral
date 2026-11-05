"""Precios para estimar el costo EN VIVO, que se calibran solos.

El costo exacto lo da el agente al terminar: `ResultMessage.model_usage` trae,
por modelo, los tokens y `costUSD` (Claude Code lo calcula con los precios de
su versión, incluidos los escalonados: Haiku cobra más por encima de 100K
tokens de prompt, por ejemplo). Pero ese número solo llega al FINAL; si la
consulta falla, se cancela o tarda 20 minutos, hay que estimar mientras corre.

Para que el estimado no dependa de una tabla escrita a mano:

    estimado = tokens × precio_base × factor(modelo)

y cada consulta que termina bien corrige `factor` comparando el estimado con
el costo real (promedio móvil). Si Anthropic cambia precios, el estimado se
ajusta solo en una o dos consultas. `PRECIOS_BASE_MTOK` es solo el punto de
partida: (entrada, salida, lectura de caché) por millón de tokens.
"""

import logging
from typing import Any

from . import db

log = logging.getLogger("lab.precios")

PRECIOS_BASE_MTOK: dict[str, tuple[float, float, float]] = {
    "claude-opus-5-5": (4.0, 20.0, 0.20),
    "claude-sonnet-5-5": (2.0, 10.0, 0.20),
    "claude-haiku-5-5": (0.10, 0.50, 0.01),
}
MULTIPLICADOR_ESCRITURA_CACHE = 1.25
# Peso de cada consulta nueva en el factor: rápido para adaptarse, sin que una
# consulta rara lo mueva entero.
PESO_NUEVA = 0.3

_factores: dict[str, float] | None = None


def _base(modelo: str | None) -> tuple[str, tuple[float, float, float]]:
    for prefijo, precio in PRECIOS_BASE_MTOK.items():
        if modelo and modelo.startswith(prefijo):
            return prefijo, precio
    # Modelo desconocido: el más caro, para no subestimar el gasto.
    return "claude-opus-5-5", PRECIOS_BASE_MTOK["claude-opus-5-5"]


def factor(modelo: str | None) -> float:
    global _factores
    if _factores is None:
        _factores = db.factores_precio()
    return _factores.get(_base(modelo)[0], 1.0)


def precio(modelo: str | None) -> tuple[float, float, float]:
    """(entrada, salida, lectura de caché) por millón, ya calibrados."""
    f = factor(modelo)
    entrada, salida, lectura = _base(modelo)[1]
    return entrada * f, salida * f, lectura * f


def estimar(modelo: str | None, entrada: int, salida: int, cache_escritura: int, cache_lectura: int, calibrado: bool = True) -> float:
    pe, ps, pl = precio(modelo) if calibrado else _base(modelo)[1]
    return (entrada * pe + cache_escritura * pe * MULTIPLICADOR_ESCRITURA_CACHE + cache_lectura * pl + salida * ps) / 1_000_000


def calibrar(model_usage: dict[str, Any] | None) -> None:
    """Corrige el factor de cada modelo con el costo real que reportó el agente."""
    global _factores
    if not model_usage:
        return
    for modelo, uso in model_usage.items():
        try:
            real = float(uso["costUSD"])
            estimado = estimar(
                modelo,
                int(uso.get("inputTokens") or 0),
                int(uso.get("outputTokens") or 0),
                int(uso.get("cacheCreationInputTokens") or 0),
                int(uso.get("cacheReadInputTokens") or 0),
                calibrado=False,
            )
        except (KeyError, TypeError, ValueError):
            continue
        if real <= 0 or estimado <= 0:
            continue
        clave = _base(modelo)[0]
        observado = real / estimado
        previo = factor(modelo)
        nuevo = observado if previo == 1.0 and not db.factores_precio().get(clave) else previo * (1 - PESO_NUEVA) + observado * PESO_NUEVA
        db.guardar_factor_precio(clave, nuevo)
        _factores = None  # se recarga en la siguiente estimación
        if abs(nuevo - previo) / previo > 0.2:
            log.info("precio de %s recalibrado: factor %.2f → %.2f (real $%.4f, base $%.4f)", clave, previo, nuevo, real, estimado)
