"""SQLite del laboratorio: usuarios, sesiones del agente y registro de consultas.

Tres tablas, tres preguntas:
    usuarios   ¿quién eres y qué rol tienes?
    sesiones   ¿qué sesión del SDK reanudo para esta conversación?
    consultas  ¿qué se preguntó, qué hizo el agente y cuánto costó?  (el "oro")

La llave de `sesiones` incluye al usuario: los ids de conversación los genera
el front ("c-1", "c-2"…) y se repiten entre usuarios. Sin el usuario en la
llave, tu amigo podría reanudar TU conversación con solo adivinar "c-1".
"""

import json
import sqlite3
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .config import ajustes

ESQUEMA = """
CREATE TABLE IF NOT EXISTS usuarios (
    id         TEXT PRIMARY KEY,
    correo     TEXT NOT NULL UNIQUE COLLATE NOCASE,
    nombre     TEXT NOT NULL,
    area       TEXT NOT NULL DEFAULT '',
    rol        TEXT NOT NULL,
    hash       TEXT NOT NULL,
    creado_en  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
    usuario_id      TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    conversacion_id TEXT NOT NULL,
    perfil          TEXT NOT NULL,
    sesion_sdk      TEXT NOT NULL,
    actualizado_en  TEXT NOT NULL,
    PRIMARY KEY (usuario_id, conversacion_id, perfil)
);

CREATE TABLE IF NOT EXISTS consultas (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    creado_en        TEXT NOT NULL,
    usuario_id       TEXT NOT NULL,
    conversacion_id  TEXT NOT NULL,
    perfil           TEXT NOT NULL,
    motor            TEXT NOT NULL,
    pregunta         TEXT NOT NULL,
    respuesta        TEXT,      -- el texto que vio la persona (sin razonamiento)
    sesion_sdk       TEXT,
    costo_usd        REAL,
    vueltas          INTEGER,
    duracion_ms      INTEGER,
    tokens           TEXT,      -- JSON {entrada, salida, cacheLectura, cacheEscritura}
    herramientas     TEXT,      -- JSON ["Read", "Grep", …]
    modelo           TEXT,
    estado           TEXT NOT NULL,   -- completa | cancelada | error
    error            TEXT
);

CREATE INDEX IF NOT EXISTS consultas_usuario_fecha ON consultas (usuario_id, creado_en);
CREATE INDEX IF NOT EXISTS consultas_fecha ON consultas (creado_en);
"""

# Columnas que se agregaron después de la primera versión del esquema. En una
# base nueva ya vienen en ESQUEMA; en una vieja, `iniciar()` las agrega. Es
# idempotente: solo se agrega la que falta.
_COLUMNAS_NUEVAS: dict[str, dict[str, str]] = {
    "consultas": {"respuesta": "TEXT"},
}


@dataclass(frozen=True)
class Usuario:
    id: str
    correo: str
    nombre: str
    area: str
    rol: str
    hash: str


def ahora() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def conexion() -> Iterator[sqlite3.Connection]:
    con = sqlite3.connect(ajustes.db_ruta, timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    try:
        with con:  # commit al salir, rollback si hubo excepción
            yield con
    finally:
        con.close()


def iniciar() -> None:
    ajustes.db_ruta.parent.mkdir(parents=True, exist_ok=True)
    with conexion() as con:
        con.execute("PRAGMA journal_mode = WAL")
        con.executescript(ESQUEMA)
        for tabla, columnas in _COLUMNAS_NUEVAS.items():
            existentes = {f["name"] for f in con.execute(f"PRAGMA table_info({tabla})")}
            for nombre, tipo in columnas.items():
                if nombre not in existentes:
                    con.execute(f"ALTER TABLE {tabla} ADD COLUMN {nombre} {tipo}")


def _usuario(fila: sqlite3.Row | None) -> Usuario | None:
    if fila is None:
        return None
    return Usuario(fila["id"], fila["correo"], fila["nombre"], fila["area"], fila["rol"], fila["hash"])


# ── Usuarios ────────────────────────────────────────────────────────────────


def usuario_por_correo(correo: str) -> Usuario | None:
    with conexion() as con:
        return _usuario(con.execute("SELECT * FROM usuarios WHERE correo = ?", (correo,)).fetchone())


def usuario_por_id(usuario_id: str) -> Usuario | None:
    with conexion() as con:
        return _usuario(con.execute("SELECT * FROM usuarios WHERE id = ?", (usuario_id,)).fetchone())


def crear_usuario(correo: str, nombre: str, rol: str, hash_: str, area: str = "") -> Usuario:
    usuario = Usuario(f"u-{uuid.uuid4().hex[:12]}", correo.strip().lower(), nombre.strip(), area.strip(), rol, hash_)
    with conexion() as con:
        con.execute(
            "INSERT INTO usuarios (id, correo, nombre, area, rol, hash, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (usuario.id, usuario.correo, usuario.nombre, usuario.area, usuario.rol, usuario.hash, ahora()),
        )
    return usuario


def listar_usuarios() -> list[Usuario]:
    with conexion() as con:
        return [u for f in con.execute("SELECT * FROM usuarios ORDER BY creado_en") if (u := _usuario(f))]


def actualizar_usuario(usuario_id: str, *, rol: str | None = None, hash_: str | None = None) -> None:
    with conexion() as con:
        if rol is not None:
            con.execute("UPDATE usuarios SET rol = ? WHERE id = ?", (rol, usuario_id))
        if hash_ is not None:
            con.execute("UPDATE usuarios SET hash = ? WHERE id = ?", (hash_, usuario_id))


def eliminar_usuario(usuario_id: str) -> None:
    with conexion() as con:
        con.execute("DELETE FROM usuarios WHERE id = ?", (usuario_id,))


# ── Sesiones del SDK ────────────────────────────────────────────────────────


def sesion_de(usuario_id: str, conversacion_id: str, perfil: str) -> str | None:
    with conexion() as con:
        fila = con.execute(
            "SELECT sesion_sdk FROM sesiones WHERE usuario_id = ? AND conversacion_id = ? AND perfil = ?",
            (usuario_id, conversacion_id, perfil),
        ).fetchone()
    return fila["sesion_sdk"] if fila else None


def guardar_sesion(usuario_id: str, conversacion_id: str, perfil: str, sesion_sdk: str) -> None:
    with conexion() as con:
        con.execute(
            """INSERT INTO sesiones (usuario_id, conversacion_id, perfil, sesion_sdk, actualizado_en)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT (usuario_id, conversacion_id, perfil)
               DO UPDATE SET sesion_sdk = excluded.sesion_sdk, actualizado_en = excluded.actualizado_en""",
            (usuario_id, conversacion_id, perfil, sesion_sdk, ahora()),
        )


# ── Registro de consultas ───────────────────────────────────────────────────


def registrar_consulta(**campos: Any) -> None:
    campos = {**campos, "creado_en": ahora()}
    for llave in ("tokens", "herramientas"):
        if llave in campos and campos[llave] is not None:
            campos[llave] = json.dumps(campos[llave], ensure_ascii=False)
    columnas = ", ".join(campos)
    marcas = ", ".join("?" for _ in campos)
    with conexion() as con:
        con.execute(f"INSERT INTO consultas ({columnas}) VALUES ({marcas})", tuple(campos.values()))


def consultas_desde(usuario_id: str, desde: datetime) -> int:
    with conexion() as con:
        fila = con.execute(
            "SELECT COUNT(*) AS n FROM consultas WHERE usuario_id = ? AND creado_en >= ?",
            (usuario_id, desde.isoformat()),
        ).fetchone()
    return int(fila["n"])


# ── Auditoría (solo lectura, para el administrador) ─────────────────────────

LARGO_EXTRACTO = 280

_SELECT_CONSULTA = """
    SELECT c.*, u.nombre AS usuario_nombre, u.correo AS usuario_correo, u.rol AS usuario_rol
    FROM consultas c LEFT JOIN usuarios u ON u.id = c.usuario_id
"""


def _consulta(fila: sqlite3.Row) -> dict[str, Any]:
    datos = dict(fila)
    for llave, vacio in (("tokens", {}), ("herramientas", [])):
        try:
            datos[llave] = json.loads(datos[llave]) if datos[llave] else vacio
        except (TypeError, ValueError):
            datos[llave] = vacio
    return datos


def _like(texto: str) -> str:
    # Los comodines de LIKE que escriba la persona se buscan literales.
    return "%" + texto.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"


def listar_consultas(
    *,
    usuario_id: str | None = None,
    perfil: str | None = None,
    estado: str | None = None,
    texto: str | None = None,
    desde: str | None = None,
    hasta: str | None = None,
    antes_de: int | None = None,
    limite: int = 50,
) -> list[dict[str, Any]]:
    """Consultas más recientes primero. Paginación por cursor (`antes_de` = id)."""
    condiciones: list[str] = []
    valores: list[Any] = []
    if usuario_id:
        condiciones.append("c.usuario_id = ?")
        valores.append(usuario_id)
    if perfil:
        condiciones.append("c.perfil = ?")
        valores.append(perfil)
    if estado:
        condiciones.append("c.estado = ?")
        valores.append(estado)
    if texto:
        condiciones.append("(c.pregunta LIKE ? ESCAPE '\\' OR c.respuesta LIKE ? ESCAPE '\\')")
        valores += [_like(texto), _like(texto)]
    if desde:
        condiciones.append("c.creado_en >= ?")
        valores.append(desde)
    if hasta:
        condiciones.append("c.creado_en <= ?")
        valores.append(hasta)
    if antes_de is not None:
        condiciones.append("c.id < ?")
        valores.append(antes_de)
    donde = (" WHERE " + " AND ".join(condiciones)) if condiciones else ""
    with conexion() as con:
        filas = con.execute(f"{_SELECT_CONSULTA}{donde} ORDER BY c.id DESC LIMIT ?", (*valores, limite)).fetchall()
    return [_consulta(f) for f in filas]


def consulta_por_id(consulta_id: int) -> dict[str, Any] | None:
    with conexion() as con:
        fila = con.execute(f"{_SELECT_CONSULTA} WHERE c.id = ?", (consulta_id,)).fetchone()
    return _consulta(fila) if fila else None


def resumen_consultas(desde: str) -> dict[str, Any]:
    """Totales históricos y desgloses (por persona, modelo y día UTC) desde `desde`."""
    with conexion() as con:
        historico = con.execute(
            "SELECT COUNT(*) AS consultas, COALESCE(SUM(costo_usd), 0) AS costo FROM consultas"
        ).fetchone()
        periodo = con.execute(
            "SELECT COUNT(*) AS consultas, COALESCE(SUM(costo_usd), 0) AS costo FROM consultas WHERE creado_en >= ?",
            (desde,),
        ).fetchone()
        por_usuario = con.execute(
            """SELECT c.usuario_id, u.nombre, u.correo, u.rol,
                      COUNT(*) AS consultas, COALESCE(SUM(c.costo_usd), 0) AS costo,
                      MAX(c.creado_en) AS ultima
               FROM consultas c LEFT JOIN usuarios u ON u.id = c.usuario_id
               WHERE c.creado_en >= ?
               GROUP BY c.usuario_id ORDER BY costo DESC, consultas DESC""",
            (desde,),
        ).fetchall()
        por_modelo = con.execute(
            """SELECT COALESCE(modelo, '') AS modelo, COUNT(*) AS consultas, COALESCE(SUM(costo_usd), 0) AS costo
               FROM consultas WHERE creado_en >= ?
               GROUP BY COALESCE(modelo, '') ORDER BY costo DESC, consultas DESC""",
            (desde,),
        ).fetchall()
        por_dia = con.execute(
            """SELECT substr(creado_en, 1, 10) AS dia, COUNT(*) AS consultas, COALESCE(SUM(costo_usd), 0) AS costo
               FROM consultas WHERE creado_en >= ?
               GROUP BY dia ORDER BY dia""",
            (desde,),
        ).fetchall()
        por_estado = con.execute(
            "SELECT estado, COUNT(*) AS consultas FROM consultas WHERE creado_en >= ? GROUP BY estado",
            (desde,),
        ).fetchall()
    return {
        "historico": dict(historico),
        "periodo": dict(periodo),
        "por_usuario": [dict(f) for f in por_usuario],
        "por_modelo": [dict(f) for f in por_modelo],
        "por_dia": [dict(f) for f in por_dia],
        "por_estado": [dict(f) for f in por_estado],
    }
