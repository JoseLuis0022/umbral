"""La guardia de rutas: el modo Consulta (invitados) no sale de la carpeta del agente.

Se llama directo al hook PreToolUse, igual que lo haría el CLI antes de cada
herramienta. "deny" = la herramienta no se ejecuta.
"""

import asyncio
from typing import Any

import pytest

from app.guardias import hook_rutas_bloqueadas
from app.perfiles import PERFILES

from .conftest import AGENTE

BLOQUEADAS = PERFILES["consulta"].rutas_bloqueadas


def decision(herramienta: str, entrada: dict[str, Any], *, solo_dentro: bool = True) -> str:
    gancho = hook_rutas_bloqueadas(AGENTE, BLOQUEADAS, solo_dentro=solo_dentro).hooks[0]
    salida = asyncio.run(gancho({"tool_name": herramienta, "tool_input": entrada}, None, None))  # type: ignore[arg-type]
    return salida.get("hookSpecificOutput", {}).get("permissionDecision", "allow")


@pytest.mark.parametrize(
    ("herramienta", "entrada"),
    [
        ("Read", {"file_path": "Apuntes/Tema 01 - Histograma.html"}),
        ("Read", {"file_path": str(AGENTE / "Clases/Transcripciones/Clase 1 - 1 ago.txt")}),
        ("Grep", {"pattern": "mediana|promedio", "path": "Clases"}),
        ("Grep", {"pattern": "mediana", "glob": "*.txt"}),
        ("Glob", {"pattern": "Apuntes/**/*.html"}),
        ("Glob", {"pattern": "**/*.txt"}),
    ],
)
def test_permite_el_material_del_curso(herramienta: str, entrada: dict[str, Any]) -> None:
    assert decision(herramienta, entrada) == "allow"


@pytest.mark.parametrize(
    ("herramienta", "entrada"),
    [
        # Salir de la carpeta con rutas relativas o absolutas.
        ("Read", {"file_path": "../secreto.env"}),
        ("Read", {"file_path": str(AGENTE.parent / "secreto.env")}),
        ("Read", {"file_path": "/etc/passwd"}),
        ("Grep", {"pattern": "API_KEY", "path": ".."}),
        ("Glob", {"pattern": "../*.env"}),
        ("Glob", {"pattern": str(AGENTE.parent) + "/*.env"}),
        # El hueco de la revisión: `..` escondido DESPUÉS del primer comodín.
        ("Glob", {"pattern": "**/../../backend/.env"}),
        ("Glob", {"pattern": "Apuntes/*/../../../secreto.env"}),
        # El `glob` de Grep también es un patrón de archivos.
        ("Grep", {"pattern": "API_KEY", "glob": "../*.env"}),
        ("Grep", {"pattern": "API_KEY", "glob": "**/../../*.env"}),
    ],
)
def test_niega_salir_de_la_carpeta(herramienta: str, entrada: dict[str, Any]) -> None:
    assert decision(herramienta, entrada) == "deny"


@pytest.mark.parametrize(
    ("herramienta", "entrada"),
    [
        ("Read", {"file_path": "Prácticas/Práctica 1.pdf"}),
        ("Glob", {"pattern": "Prácticas/**/*.pdf"}),
        ("Grep", {"pattern": "calificada", "path": "Prácticas"}),
        ("Read", {"file_path": ".umbral/prompts/consulta.md"}),
        ("Grep", {"pattern": "prompt", "path": ".umbral"}),
    ],
)
def test_niega_las_carpetas_privadas(herramienta: str, entrada: dict[str, Any]) -> None:
    assert decision(herramienta, entrada) == "deny"


def test_un_modo_con_bash_no_se_confina_pero_si_respeta_las_privadas() -> None:
    # El Generador trabaja con Bash: confinarlo no protege nada (ver guardias.py),
    # pero las carpetas privadas siguen negadas para las herramientas de archivos.
    assert decision("Read", {"file_path": "../secreto.env"}, solo_dentro=False) == "allow"
    assert decision("Read", {"file_path": "Prácticas/Práctica 1.pdf"}, solo_dentro=False) == "deny"


def test_el_modo_consulta_no_tiene_bash_ni_escritura() -> None:
    herramientas = set(PERFILES["consulta"].herramientas)
    assert herramientas == {"Read", "Grep", "Glob"}
