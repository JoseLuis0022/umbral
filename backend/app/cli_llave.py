"""Guarda la API key de Anthropic en backend/.env, validándola primero.

    .venv/bin/python -m app.cli_llave             # diálogo nativo de macOS (texto oculto)
    .venv/bin/python -m app.cli_llave --terminal  # pide la llave sin eco en la terminal
    .venv/bin/python -m app.cli_llave --activar-sdk   # además pone MOTOR=sdk

Por qué así y no un formulario en la app web: la llave va directo del diálogo a
este proceso y de aquí a .env. No pasa por el navegador, ni por un endpoint del
backend (que habría que proteger), ni por el historial de la terminal, ni por
el chat. Este script NUNCA imprime la llave: solo si es válida y sus últimos 4
caracteres.

La validación es `GET /v1/models`: confirma que la llave existe y está activa
sin generar texto, así que no gasta tokens.
"""

import argparse
import getpass
import os
import platform
import subprocess
import sys
import tempfile
from pathlib import Path

import httpx

RUTA_ENV = Path(__file__).resolve().parent.parent / ".env"
URL_MODELOS = "https://api.anthropic.com/v1/models"

DIALOGO = (
    'display dialog "Pega tu API key de Anthropic.\\n\\n'
    "Se valida contra Anthropic y se guarda en backend/.env, que solo tu usuario puede leer. "
    'No se muestra en ningún lado." '
    'default answer "" with hidden answer with title "Laboratorio de agentes" '
    'buttons {"Cancelar", "Guardar"} default button "Guardar" cancel button "Cancelar" '
    "with icon note giving up after 600"
)


def pedir_con_dialogo() -> str | None:
    r = subprocess.run(["osascript", "-e", DIALOGO, "-e", "text returned of result"], capture_output=True, text=True)
    if r.returncode != 0:
        return None  # canceló
    return r.stdout.strip() or None


def enmascarar(llave: str) -> str:
    return f"{llave[:7]}…{llave[-4:]}" if len(llave) > 12 else "…"


def validar(llave: str) -> tuple[bool, str]:
    try:
        r = httpx.get(
            URL_MODELOS,
            headers={"x-api-key": llave, "anthropic-version": "2023-06-01"},
            timeout=20,
        )
    except httpx.HTTPError as e:
        return False, f"No se pudo conectar con Anthropic ({type(e).__name__}). Revisa tu conexión."
    if r.status_code == 200:
        modelos = [m.get("id") for m in r.json().get("data", [])]
        return True, f"Llave válida. Modelos disponibles: {', '.join(modelos[:6])}{'…' if len(modelos) > 6 else ''}"
    if r.status_code == 401:
        return False, "Anthropic rechazó la llave (401). Revisa que la copiaste completa."
    if r.status_code == 403:
        return False, "La llave existe pero no tiene permiso para la API (403)."
    return False, f"Anthropic respondió {r.status_code}. Intenta de nuevo en un momento."


def escribir_env(valores: dict[str, str]) -> None:
    lineas = RUTA_ENV.read_text(encoding="utf-8").splitlines() if RUTA_ENV.exists() else []
    pendientes = dict(valores)
    nuevas = []
    for linea in lineas:
        clave = linea.split("=", 1)[0].strip()
        if clave in pendientes:
            nuevas.append(f"{clave}={pendientes.pop(clave)}")
        else:
            nuevas.append(linea)
    nuevas += [f"{k}={v}" for k, v in pendientes.items()]
    # Escritura atómica con permisos 600 desde el primer byte: nunca existe un
    # .env legible por otros, ni a medias.
    fd, temporal = tempfile.mkstemp(dir=RUTA_ENV.parent, prefix=".env.")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write("\n".join(nuevas) + "\n")
    os.chmod(temporal, 0o600)
    os.replace(temporal, RUTA_ENV)


def main() -> None:
    p = argparse.ArgumentParser(prog="cli_llave", description="Guarda ANTHROPIC_API_KEY en backend/.env")
    p.add_argument("--terminal", action="store_true", help="Pedir la llave en la terminal en vez del diálogo")
    p.add_argument("--activar-sdk", action="store_true", help="Además, poner MOTOR=sdk")
    args = p.parse_args()

    if args.terminal or platform.system() != "Darwin":
        llave = getpass.getpass("API key de Anthropic (no se muestra): ").strip() or None
    else:
        print("Abriendo el diálogo en tu Mac…", flush=True)
        llave = pedir_con_dialogo()

    if not llave:
        sys.exit("Cancelado: no se cambió nada.")
    if not llave.startswith("sk-ant-"):
        sys.exit("Eso no parece una API key de Anthropic (empiezan con sk-ant-). No se cambió nada.")

    ok, mensaje = validar(llave)
    print(mensaje)
    if not ok:
        sys.exit("No se guardó la llave.")

    valores = {"ANTHROPIC_API_KEY": llave}
    if args.activar_sdk:
        valores["MOTOR"] = "sdk"
    escribir_env(valores)
    print(f"Guardada en {RUTA_ENV.name}: {enmascarar(llave)} (permisos 600)" + (" · MOTOR=sdk" if args.activar_sdk else ""))


if __name__ == "__main__":
    main()
