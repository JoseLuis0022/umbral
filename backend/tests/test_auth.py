"""Login, registro con verificación (enlace y código) y los límites contra abuso."""

import re

import pytest
from fastapi.testclient import TestClient

from app.config import ajustes

from .conftest import CONTRASENA, correo_unico, crear_cuenta


_ips = iter(f"10.9.{n // 250}.{n % 250}" for n in range(10_000))


def _registrar(cliente: TestClient, direccion: str, ip: str | None = None, **encabezados: str) -> int:
    # Una IP nueva por registro, salvo que la prueba quiera repetirla: la base
    # dura toda la sesión y el límite de 3 por IP al día también.
    ip = ip or next(_ips)
    r = cliente.post(
        "/api/auth/registro",
        json={"nombre": "Ana Prueba", "correo": direccion, "contrasena": CONTRASENA},
        headers={"X-Real-IP": ip, **encabezados},
    )
    return r.status_code


def _enlace_y_codigo(buzon: list[dict[str, str]]) -> tuple[str, str]:
    texto = buzon[-1]["texto"]
    token = re.search(r"verificar\?token=([\w-]+)", texto)
    codigo = re.search(r"código en Umbral: (\d{6})", texto)
    assert token and codigo
    return token.group(1), codigo.group(1)


# ─── Login ──────────────────────────────────────────────────────────────────


def test_login_correcto(cliente: TestClient) -> None:
    usuario, _ = crear_cuenta()
    r = cliente.post("/api/auth/login", json={"correo": usuario.correo.upper(), "contrasena": CONTRASENA})
    assert r.status_code == 200
    assert r.json()["token"]


def test_login_no_revela_que_correos_existen(cliente: TestClient) -> None:
    usuario, _ = crear_cuenta()
    mala = cliente.post("/api/auth/login", json={"correo": usuario.correo, "contrasena": "otra-contrasena"})
    inexistente = cliente.post("/api/auth/login", json={"correo": correo_unico("nadie"), "contrasena": "otra-contrasena"})
    assert mala.status_code == inexistente.status_code == 401
    assert mala.json()["detail"] == inexistente.json()["detail"]


def test_login_se_bloquea_tras_5_fallos(cliente: TestClient) -> None:
    usuario, _ = crear_cuenta()
    for _ in range(5):
        assert cliente.post("/api/auth/login", json={"correo": usuario.correo, "contrasena": "mala"}).status_code == 401
    # Bloqueada: ni la contraseña correcta entra hasta que pase la ventana.
    r = cliente.post("/api/auth/login", json={"correo": usuario.correo, "contrasena": CONTRASENA})
    assert r.status_code == 429
    assert "Retry-After" in r.headers


# ─── Registro y verificación ────────────────────────────────────────────────


def test_cuenta_sin_verificar_no_entra(cliente: TestClient, buzon: list) -> None:
    direccion = correo_unico()
    assert _registrar(cliente, direccion) == 202
    r = cliente.post("/api/auth/login", json={"correo": direccion, "contrasena": CONTRASENA})
    assert r.status_code == 403


def test_registro_con_codigo(cliente: TestClient, buzon: list) -> None:
    direccion = correo_unico()
    assert _registrar(cliente, direccion) == 202
    _, codigo = _enlace_y_codigo(buzon)
    assert codigo in buzon[-1]["asunto"]

    malo = "000000" if codigo != "000000" else "111111"
    assert cliente.post("/api/auth/verificar-codigo", json={"correo": direccion, "codigo": malo}).status_code == 400

    r = cliente.post("/api/auth/verificar-codigo", json={"correo": direccion, "codigo": codigo})
    assert r.status_code == 200
    assert r.json()["sesion"]["token"]
    assert cliente.post("/api/auth/login", json={"correo": direccion, "contrasena": CONTRASENA}).status_code == 200


def test_el_codigo_se_invalida_tras_5_intentos(cliente: TestClient, buzon: list) -> None:
    direccion = correo_unico()
    _registrar(cliente, direccion)
    _, codigo = _enlace_y_codigo(buzon)
    malo = "000000" if codigo != "000000" else "111111"
    for _ in range(5):
        cliente.post("/api/auth/verificar-codigo", json={"correo": direccion, "codigo": malo})
    r = cliente.post("/api/auth/verificar-codigo", json={"correo": direccion, "codigo": codigo})
    assert r.status_code == 429  # freno de fallos: ni el correcto pasa


def test_enlace_reabierto_dice_verificada_sin_abrir_sesion(cliente: TestClient, buzon: list) -> None:
    # El caso real de producción: el lector de enlaces de Gmail abre el enlace
    # antes que la persona.
    direccion = correo_unico()
    _registrar(cliente, direccion)
    token, _ = _enlace_y_codigo(buzon)
    primera = cliente.post("/api/auth/verificar", json={"token": token})
    assert primera.status_code == 200 and primera.json()["sesion"] is not None
    segunda = cliente.post("/api/auth/verificar", json={"token": token})
    assert segunda.status_code == 200
    assert segunda.json() == {"verificada": True, "sesion": None}


def test_enlace_inventado_400(cliente: TestClient) -> None:
    assert cliente.post("/api/auth/verificar", json={"token": "x" * 40}).status_code == 400


def test_registro_de_cuenta_verificada_409(cliente: TestClient, buzon: list) -> None:
    usuario, _ = crear_cuenta()
    assert _registrar(cliente, usuario.correo) == 409


def test_rechaza_correos_desechables(cliente: TestClient, buzon: list) -> None:
    assert _registrar(cliente, "alguien@mailinator.com") == 422


# ─── IP del cliente ─────────────────────────────────────────────────────────


def test_limite_de_registros_por_ip(cliente: TestClient, buzon: list) -> None:
    for _ in range(3):
        assert _registrar(cliente, correo_unico(), ip="10.1.1.1") == 202
    assert _registrar(cliente, correo_unico(), ip="10.1.1.1") == 429


def test_cf_connecting_ip_inventado_no_salta_el_limite(cliente: TestClient, buzon: list) -> None:
    # Sin CONFIAR_CLOUDFLARE, cambiar el encabezado en cada petición no sirve:
    # cuenta la IP que vio nginx (X-Real-IP).
    for n in range(3):
        assert _registrar(cliente, correo_unico(), ip="10.2.2.2", **{"CF-Connecting-IP": f"1.1.1.{n}"}) == 202
    assert _registrar(cliente, correo_unico(), ip="10.2.2.2", **{"CF-Connecting-IP": "1.1.1.99"}) == 429


def test_con_cloudflare_confiable_cuenta_la_ip_de_cloudflare(cliente: TestClient, buzon: list, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ajustes, "confiar_cloudflare", True)
    # Detrás del túnel, nginx ve a cloudflared (la misma IP para todos): la IP
    # real es la de Cloudflare.
    for n in range(4):
        assert _registrar(cliente, correo_unico(), ip="172.17.0.1", **{"CF-Connecting-IP": f"2.2.2.{n}"}) == 202
