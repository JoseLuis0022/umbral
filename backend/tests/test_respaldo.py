"""El respaldo diario: copia íntegra de la base y rotación de las viejas."""

import sqlite3
from pathlib import Path

import pytest

from app import respaldo


def test_respaldo_copia_y_rota(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    base = tmp_path / "umbral.db"
    con = sqlite3.connect(base)
    con.execute("PRAGMA journal_mode = WAL")
    con.execute("CREATE TABLE usuarios (correo TEXT)")
    con.execute("INSERT INTO usuarios VALUES ('ana@ejemplo.com')")
    con.commit()  # la conexión sigue abierta, como la del backend

    destino = tmp_path / "respaldos"
    destino.mkdir()
    for viejo in ("2026-01-01_0000", "2026-01-02_0000", "2026-01-03_0000"):
        (destino / f"umbral-{viejo}.db").write_bytes(b"")
    monkeypatch.setattr(respaldo, "BASE", base)
    monkeypatch.setattr(respaldo, "DESTINO", destino)
    monkeypatch.setattr(respaldo, "CONSERVAR", 2)

    nuevo = respaldo.respaldar()

    copia = sqlite3.connect(nuevo)
    assert copia.execute("SELECT correo FROM usuarios").fetchall() == [("ana@ejemplo.com",)]
    copia.close()
    con.close()
    # Se quedan el nuevo y el más reciente de los viejos; sin archivos a medias.
    assert sorted(p.name for p in destino.iterdir()) == ["umbral-2026-01-03_0000.db", nuevo.name]
