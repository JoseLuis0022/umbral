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
    estado           TEXT NOT NULL,   -- corriendo | completa | cancelada | error
    error            TEXT
);

CREATE INDEX IF NOT EXISTS consultas_usuario_fecha ON consultas (usuario_id, creado_en);
CREATE INDEX IF NOT EXISTS consultas_fecha ON consultas (creado_en);

-- Conversaciones del chat, una fila por conversación con su documento JSON
-- completo (mensajes, proceso, archivos, fijada, cola…): el chat siempre lee
-- y escribe la conversación entera, así que el formato es el mismo del front.
-- Antes vivían solo en el localStorage de cada navegador.
CREATE TABLE IF NOT EXISTS conversaciones (
    id              TEXT PRIMARY KEY,
    usuario_id      TEXT NOT NULL,
    datos           TEXT NOT NULL,
    actualizado_en  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS conversaciones_usuario ON conversaciones (usuario_id, actualizado_en);

-- Enlaces de verificación del registro. Se guarda el HASH del token, nunca el
-- token: quien lea la base no puede activar cuentas ajenas.
CREATE TABLE IF NOT EXISTS verificaciones (
    token_hash  TEXT PRIMARY KEY,
    usuario_id  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    creado_en   TEXT NOT NULL,
    expira_en   TEXT NOT NULL
);

-- Ajustes que el admin cambia desde la interfaz (correo de envío, contacto…).
-- La contraseña de aplicación se guarda CIFRADA (ver correo.py).
CREATE TABLE IF NOT EXISTS configuracion (
    clave  TEXT PRIMARY KEY,
    valor  TEXT NOT NULL
);

-- Factor de corrección del precio estimado por modelo (ver precios.py): se
-- recalibra con el costo real que reporta el agente al terminar cada consulta.
CREATE TABLE IF NOT EXISTS precios_calibrados (
    modelo       TEXT PRIMARY KEY,
    factor       REAL NOT NULL,
    actualizado  TEXT NOT NULL
);
"""

# Columnas que se agregaron después de la primera versión del esquema. En una
# base nueva ya vienen en ESQUEMA; en una vieja, `iniciar()` las agrega. Es
# idempotente: solo se agrega la que falta.
_COLUMNAS_NUEVAS: dict[str, dict[str, str]] = {
    "consultas": {"respuesta": "TEXT"},
    # Las cuentas creadas a mano (CLI) nacen verificadas; las del registro
    # público, no, hasta que abren el enlace del correo.
    "usuarios": {"verificado": "INTEGER NOT NULL DEFAULT 1", "registro_ip": "TEXT"},
}


@dataclass(frozen=True)
class Usuario:
    id: str
    correo: str
    nombre: str
    area: str
    rol: str
    hash: str
    verificado: bool = True


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
    return Usuario(
        fila["id"], fila["correo"], fila["nombre"], fila["area"], fila["rol"], fila["hash"], bool(fila["verificado"])
    )


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


def crear_usuario_pendiente(correo: str, nombre: str, rol: str, hash_: str, ip: str | None) -> Usuario:
    """Cuenta del registro público: no puede entrar hasta verificar su correo."""
    usuario = Usuario(f"u-{uuid.uuid4().hex[:12]}", correo.strip().lower(), nombre.strip(), "", rol, hash_, False)
    with conexion() as con:
        con.execute(
            "INSERT INTO usuarios (id, correo, nombre, area, rol, hash, creado_en, verificado, registro_ip) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)",
            (usuario.id, usuario.correo, usuario.nombre, "", usuario.rol, usuario.hash, ahora(), ip),
        )
    return usuario


def registros_desde_ip(ip: str, desde: datetime) -> int:
    with conexion() as con:
        fila = con.execute(
            "SELECT COUNT(*) AS n FROM usuarios WHERE registro_ip = ? AND creado_en >= ?", (ip, desde.isoformat())
        ).fetchone()
    return int(fila["n"])


def marcar_verificado(usuario_id: str) -> None:
    with conexion() as con:
        con.execute("UPDATE usuarios SET verificado = 1 WHERE id = ?", (usuario_id,))
        con.execute("DELETE FROM verificaciones WHERE usuario_id = ?", (usuario_id,))


def guardar_verificacion(token_hash: str, usuario_id: str, expira: datetime) -> None:
    with conexion() as con:
        con.execute(
            "INSERT INTO verificaciones (token_hash, usuario_id, creado_en, expira_en) VALUES (?, ?, ?, ?)",
            (token_hash, usuario_id, ahora(), expira.isoformat()),
        )


def verificacion(token_hash: str) -> tuple[str, datetime] | None:
    """(usuario_id, expira) del enlace, o None si no existe o ya se usó."""
    with conexion() as con:
        fila = con.execute("SELECT usuario_id, expira_en FROM verificaciones WHERE token_hash = ?", (token_hash,)).fetchone()
    return (fila["usuario_id"], datetime.fromisoformat(fila["expira_en"])) if fila else None


def ultima_verificacion(usuario_id: str) -> datetime | None:
    with conexion() as con:
        fila = con.execute("SELECT MAX(creado_en) AS t FROM verificaciones WHERE usuario_id = ?", (usuario_id,)).fetchone()
    return datetime.fromisoformat(fila["t"]) if fila and fila["t"] else None


def gasto_usuario(usuario_id: str) -> float:
    """Todo lo que ha gastado una cuenta (incluye consultas en curso, con su estimado)."""
    with conexion() as con:
        fila = con.execute("SELECT COALESCE(SUM(costo_usd), 0) AS t FROM consultas WHERE usuario_id = ?", (usuario_id,)).fetchone()
    return float(fila["t"])


def gasto_rol_desde(rol: str, desde: datetime) -> float:
    with conexion() as con:
        fila = con.execute(
            "SELECT COALESCE(SUM(c.costo_usd), 0) AS t FROM consultas c JOIN usuarios u ON u.id = c.usuario_id "
            "WHERE u.rol = ? AND c.creado_en >= ?",
            (rol, desde.isoformat()),
        ).fetchone()
    return float(fila["t"])


def config(clave: str) -> str | None:
    with conexion() as con:
        fila = con.execute("SELECT valor FROM configuracion WHERE clave = ?", (clave,)).fetchone()
    return fila["valor"] if fila else None


def guardar_config(clave: str, valor: str | None) -> None:
    with conexion() as con:
        if valor is None:
            con.execute("DELETE FROM configuracion WHERE clave = ?", (clave,))
        else:
            con.execute(
                "INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor",
                (clave, valor),
            )


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
        # Su historial de chat se va con la cuenta (la auditoría de consultas se
        # conserva: es el registro del gasto, y ya mostraba "Cuenta eliminada").
        con.execute("DELETE FROM conversaciones WHERE usuario_id = ?", (usuario_id,))
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


def _serializar(campos: dict[str, Any]) -> dict[str, Any]:
    campos = dict(campos)
    for llave in ("tokens", "herramientas"):
        if llave in campos and campos[llave] is not None:
            campos[llave] = json.dumps(campos[llave], ensure_ascii=False)
    return campos


def abrir_consulta(**campos: Any) -> int:
    """Registra la consulta AL EMPEZAR (estado "corriendo") y devuelve su id.

    Antes solo se registraba al terminar: una tarea larga no aparecía en el
    Tablero hasta el final, y una que fallaba o se cortaba gastaba sin que el
    gasto quedara en ningún lado.
    """
    campos = _serializar({**campos, "creado_en": ahora(), "estado": "corriendo"})
    columnas = ", ".join(campos)
    marcas = ", ".join("?" for _ in campos)
    with conexion() as con:
        cursor = con.execute(f"INSERT INTO consultas ({columnas}) VALUES ({marcas})", tuple(campos.values()))
        return int(cursor.lastrowid or 0)


def actualizar_consulta(consulta_id: int, **campos: Any) -> None:
    """Actualiza el avance (costo estimado, vueltas…) o el cierre de una consulta."""
    if not campos:
        return
    campos = _serializar(campos)
    asignaciones = ", ".join(f"{c} = ?" for c in campos)
    with conexion() as con:
        con.execute(f"UPDATE consultas SET {asignaciones} WHERE id = ?", (*campos.values(), consulta_id))


def cerrar_huerfanas() -> int:
    """Al arrancar: las consultas que seguían "corriendo" murieron con el proceso anterior."""
    with conexion() as con:
        cursor = con.execute(
            "UPDATE consultas SET estado = 'error', error = COALESCE(error, 'interrumpido') WHERE estado = 'corriendo'"
        )
        return cursor.rowcount


def conversaciones_de(usuario_id: str) -> list[dict[str, Any]]:
    with conexion() as con:
        filas = con.execute(
            "SELECT datos FROM conversaciones WHERE usuario_id = ? ORDER BY actualizado_en DESC", (usuario_id,)
        ).fetchall()
    return [json.loads(f["datos"]) for f in filas]


def dueno_conversacion(conversacion_id: str) -> str | None:
    with conexion() as con:
        fila = con.execute("SELECT usuario_id FROM conversaciones WHERE id = ?", (conversacion_id,)).fetchone()
    return fila["usuario_id"] if fila else None


def guardar_conversacion(usuario_id: str, conversacion_id: str, datos: dict[str, Any]) -> None:
    with conexion() as con:
        con.execute(
            "INSERT INTO conversaciones (id, usuario_id, datos, actualizado_en) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET datos = excluded.datos, actualizado_en = excluded.actualizado_en "
            "WHERE conversaciones.usuario_id = excluded.usuario_id",
            (conversacion_id, usuario_id, json.dumps(datos, ensure_ascii=False), ahora()),
        )


def eliminar_conversacion(usuario_id: str, conversacion_id: str) -> None:
    with conexion() as con:
        con.execute("DELETE FROM conversaciones WHERE id = ? AND usuario_id = ?", (conversacion_id, usuario_id))


def factores_precio() -> dict[str, float]:
    with conexion() as con:
        return {f["modelo"]: float(f["factor"]) for f in con.execute("SELECT modelo, factor FROM precios_calibrados")}


def guardar_factor_precio(modelo: str, factor: float) -> None:
    with conexion() as con:
        con.execute(
            "INSERT INTO precios_calibrados (modelo, factor, actualizado) VALUES (?, ?, ?) "
            "ON CONFLICT(modelo) DO UPDATE SET factor = excluded.factor, actualizado = excluded.actualizado",
            (modelo, factor, ahora()),
        )


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
