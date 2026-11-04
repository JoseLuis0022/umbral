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
"""


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
