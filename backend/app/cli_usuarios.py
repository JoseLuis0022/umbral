"""Administrar cuentas desde la terminal (desde backend/):

    .venv/bin/python -m app.cli_usuarios crear --correo tu@correo.mx --nombre "Tu Nombre" --rol admin
    .venv/bin/python -m app.cli_usuarios crear --correo amigo@correo.mx --nombre "Amigo" --rol usuario --generar
    .venv/bin/python -m app.cli_usuarios listar
    .venv/bin/python -m app.cli_usuarios rol --correo amigo@correo.mx --rol especialista
    .venv/bin/python -m app.cli_usuarios contrasena --correo amigo@correo.mx [--generar]
    .venv/bin/python -m app.cli_usuarios eliminar --correo amigo@correo.mx

Las contraseñas se piden sin eco (getpass) o se generan con --generar: nunca
viajan como argumento, porque quedarían en el historial de la terminal.
"""

import argparse
import getpass
import secrets
import sys

from . import db
from .perfiles import ROLES
from .seguridad import hashear

MINIMO = 10


def _pedir_contrasena(generar: bool) -> str:
    if generar:
        contrasena = secrets.token_urlsafe(12)
        print(f"Contraseña generada (cópiala ahora, no se vuelve a mostrar): {contrasena}")
        return contrasena
    contrasena = getpass.getpass("Contraseña: ")
    if len(contrasena) < MINIMO:
        sys.exit(f"La contraseña debe tener al menos {MINIMO} caracteres.")
    if getpass.getpass("Repítela: ") != contrasena:
        sys.exit("Las contraseñas no coinciden.")
    return contrasena


def _buscar(correo: str) -> db.Usuario:
    usuario = db.usuario_por_correo(correo.strip().lower())
    if usuario is None:
        sys.exit(f"No existe una cuenta con el correo {correo}.")
    return usuario


def main() -> None:
    p = argparse.ArgumentParser(prog="cli_usuarios", description="Cuentas del laboratorio")
    sub = p.add_subparsers(dest="accion", required=True)

    c = sub.add_parser("crear")
    c.add_argument("--correo", required=True)
    c.add_argument("--nombre", required=True)
    c.add_argument("--rol", required=True, choices=sorted(ROLES))
    c.add_argument("--area", default="")
    c.add_argument("--generar", action="store_true")

    sub.add_parser("listar")

    r = sub.add_parser("rol")
    r.add_argument("--correo", required=True)
    r.add_argument("--rol", required=True, choices=sorted(ROLES))

    k = sub.add_parser("contrasena")
    k.add_argument("--correo", required=True)
    k.add_argument("--generar", action="store_true")

    e = sub.add_parser("eliminar")
    e.add_argument("--correo", required=True)

    args = p.parse_args()
    db.iniciar()

    if args.accion == "crear":
        if db.usuario_por_correo(args.correo.strip().lower()):
            sys.exit("Ya existe una cuenta con ese correo.")
        usuario = db.crear_usuario(args.correo, args.nombre, args.rol, hashear(_pedir_contrasena(args.generar)), args.area)
        print(f"Cuenta creada: {usuario.correo} · rol {usuario.rol}")
    elif args.accion == "listar":
        for u in db.listar_usuarios():
            print(f"{u.correo:40} {u.rol:13} {u.nombre}")
    elif args.accion == "rol":
        usuario = _buscar(args.correo)
        db.actualizar_usuario(usuario.id, rol=args.rol)
        print(f"{usuario.correo}: {usuario.rol} → {args.rol}")
    elif args.accion == "contrasena":
        usuario = _buscar(args.correo)
        db.actualizar_usuario(usuario.id, hash_=hashear(_pedir_contrasena(args.generar)))
        print(f"Contraseña actualizada para {usuario.correo}")
    elif args.accion == "eliminar":
        usuario = _buscar(args.correo)
        db.eliminar_usuario(usuario.id)
        print(f"Cuenta eliminada: {usuario.correo}")


if __name__ == "__main__":
    main()
