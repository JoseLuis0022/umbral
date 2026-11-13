"""El chat de punta a punta con MOTOR=prueba (mismo protocolo, cero tokens),
los topes de gasto de invitados y lo que la API deja ver en producción."""

import json

from fastapi.testclient import TestClient

from app import db

from .conftest import autorizacion, crear_cuenta


def _eventos(cuerpo: str) -> list[tuple[str, dict]]:
    eventos = []
    for bloque in cuerpo.strip().split("\n\n"):
        lineas = dict(linea.split(": ", 1) for linea in bloque.splitlines() if ": " in linea)
        if "event" in lineas:
            eventos.append((lineas["event"], json.loads(lineas.get("data", "{}"))))
    return eventos


def _preguntar(cliente: TestClient, token: str, mensaje: str = "¿Qué es el filtro de mediana?", conversacion: str = "c-1", **extra: object):
    return cliente.post(
        "/api/chat",
        json={"conversacionId": conversacion, "mensaje": mensaje, "perfil": "consulta", **extra},
        headers=autorizacion(token),
    )


def test_chat_completo(cliente: TestClient) -> None:
    usuario, token = crear_cuenta("usuario")
    r = _preguntar(cliente, token)
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/event-stream")

    eventos = _eventos(r.text)
    tipos = [t for t, _ in eventos]
    assert tipos[0] == "inicio" and tipos[-1] == "fin"
    assert "actividad" in tipos and "texto" in tipos
    texto = "".join(d["delta"] for t, d in eventos if t == "texto")
    assert "filtro de mediana" in texto

    # Las rutas internas no se le muestran a quien no es admin.
    assert all(d.get("detalle") is None for t, d in eventos if t == "actividad")

    # Queda registrada para la auditoría, con la respuesta que vio la persona.
    with db.conexion() as con:
        fila = con.execute("SELECT estado, respuesta, costo_usd FROM consultas WHERE usuario_id = ?", (usuario.id,)).fetchone()
    assert fila["estado"] == "completa"
    assert "filtro de mediana" in fila["respuesta"]
    assert fila["costo_usd"] == 0.0


def test_chat_sin_sesion_401(cliente: TestClient) -> None:
    assert cliente.post("/api/chat", json={"conversacionId": "c", "mensaje": "hola"}).status_code == 401


def test_modo_no_permitido_403(cliente: TestClient) -> None:
    _, token = crear_cuenta("usuario")
    r = cliente.post("/api/chat", json={"conversacionId": "c", "mensaje": "hola", "perfil": "generador"}, headers=autorizacion(token))
    assert r.status_code == 403


def test_solo_admin_cambia_el_modelo(cliente: TestClient) -> None:
    _, token = crear_cuenta("usuario")
    r = _preguntar(cliente, token, parametros={"modelo": "claude-opus-5-5"})
    assert r.status_code == 403


# ─── Topes de gasto (modo invitado) ──────────────────────────────────────────


def _gastar(usuario_id: str, usd: float) -> None:
    db.registrar_consulta(
        usuario_id=usuario_id, conversacion_id="previa", perfil="consulta", motor="prueba",
        pregunta="previa", costo_usd=usd, estado="completa",
    )


def test_invitado_con_credito_puede_preguntar(cliente: TestClient) -> None:
    invitado, token = crear_cuenta("invitado")
    _gastar(invitado.id, 0.10)
    assert _preguntar(cliente, token).status_code == 200


def test_invitado_sin_credito_402(cliente: TestClient) -> None:
    invitado, token = crear_cuenta("invitado")
    _gastar(invitado.id, 0.30)
    r = _preguntar(cliente, token)
    assert r.status_code == 402
    assert "crédito" in r.json()["detail"]


def test_cupo_global_de_invitados_agotado_402(cliente: TestClient) -> None:
    # Muchas cuentas no sirven para gastar más: el tope mensual es de todos.
    otro, _ = crear_cuenta("invitado")
    _gastar(otro.id, 20.0)
    _, token = crear_cuenta("invitado")
    r = _preguntar(cliente, token)
    assert r.status_code == 402
    assert "cupo" in r.json()["detail"]
    db.actualizar_usuario(otro.id, rol="usuario")  # no contaminar las demás pruebas


# ─── Lo que la API deja ver ─────────────────────────────────────────────────


def test_salud_no_revela_configuracion(cliente: TestClient) -> None:
    assert cliente.get("/api/salud").json() == {"ok": True}


def test_docs_apagados_por_defecto(cliente: TestClient) -> None:
    assert cliente.get("/api/docs").status_code == 404
    assert cliente.get("/api/openapi.json").status_code == 404
