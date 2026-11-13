"""Tokens de sesión: firma, algoritmo, vencimiento y el rol leído de la base."""

from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from app import db
from app.config import ajustes

from .conftest import autorizacion, crear_cuenta


def _token(sub: str, *, secreto: str | None = None, algoritmo: str = "HS256", horas: float = 1, rol: str = "admin") -> str:
    ahora = datetime.now(timezone.utc)
    return jwt.encode({"sub": sub, "rol": rol, "iat": ahora, "exp": ahora + timedelta(hours=horas)}, secreto or ajustes.jwt_secreto, algorithm=algoritmo)


def test_token_valido_entra(cliente: TestClient) -> None:
    usuario, token = crear_cuenta()
    r = cliente.get("/api/auth/yo", headers=autorizacion(token))
    assert r.status_code == 200
    assert r.json()["usuario"]["correo"] == usuario.correo


def test_sin_token_401(cliente: TestClient) -> None:
    assert cliente.get("/api/auth/yo").status_code == 401


def test_rechaza_algoritmo_none(cliente: TestClient) -> None:
    usuario, _ = crear_cuenta()
    # Un token sin firma que dice ser admin: el clásico ataque `alg: none`.
    sin_firma = jwt.encode({"sub": usuario.id, "rol": "admin", "exp": datetime.now(timezone.utc) + timedelta(hours=1)}, key=None, algorithm="none")
    assert cliente.get("/api/auth/yo", headers=autorizacion(sin_firma)).status_code == 401


def test_rechaza_otro_secreto(cliente: TestClient) -> None:
    usuario, _ = crear_cuenta()
    falso = _token(usuario.id, secreto="otro-secreto-que-no-es-el-del-servidor-1234")
    assert cliente.get("/api/auth/yo", headers=autorizacion(falso)).status_code == 401


def test_rechaza_token_vencido(cliente: TestClient) -> None:
    usuario, _ = crear_cuenta()
    vencido = _token(usuario.id, horas=-1)
    r = cliente.get("/api/auth/yo", headers=autorizacion(vencido))
    assert r.status_code == 401
    assert "expiró" in r.json()["detail"]


def test_rechaza_cuenta_borrada(cliente: TestClient) -> None:
    usuario, token = crear_cuenta()
    db.eliminar_usuario(usuario.id)
    assert cliente.get("/api/auth/yo", headers=autorizacion(token)).status_code == 401


def test_el_rol_sale_de_la_base_no_del_token(cliente: TestClient) -> None:
    # El token dice "admin", pero la cuenta es "usuario": manda la base.
    usuario, _ = crear_cuenta("usuario")
    token_inflado = _token(usuario.id, rol="admin")
    assert cliente.get("/api/admin/resumen", headers=autorizacion(token_inflado)).status_code == 403

    # Y al revés: si se le quita el rol de admin, deja de serlo en su siguiente
    # petición, sin esperar a que el token venza.
    admin, token_admin = crear_cuenta("admin")
    assert cliente.get("/api/admin/resumen", headers=autorizacion(token_admin)).status_code == 200
    db.actualizar_usuario(admin.id, rol="usuario")
    assert cliente.get("/api/admin/resumen", headers=autorizacion(token_admin)).status_code == 403
