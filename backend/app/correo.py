"""Correo saliente (Gmail con contraseña de aplicación) y sus plantillas HTML.

La configuración la pone el admin desde la interfaz (Ajustes → Correo), no en
`.env`: así la contraseña nunca pasa por un chat ni por el repositorio.

  - La contraseña de aplicación se guarda CIFRADA (Fernet) con una clave
    derivada de `JWT_SECRETO`: quien copie solo la base no puede leerla.
  - La API nunca la devuelve: solo dice si está configurada.
  - Gmail exige verificación en 2 pasos para crear contraseñas de aplicación
    (myaccount.google.com/apppasswords) y permite ~500 correos al día.
"""

import asyncio
import base64
import hashlib
import html
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr

from cryptography.fernet import Fernet, InvalidToken

from . import db
from .config import ajustes

log = logging.getLogger("lab.correo")

SERVIDOR_SMTP = "smtp.gmail.com"
PUERTO_SMTP = 465
URL_PUBLICA_POR_DEFECTO = "http://localhost:5173"


def _fernet() -> Fernet:
    clave = hashlib.sha256(b"umbral-correo:" + ajustes.jwt_secreto.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(clave))


@dataclass
class ConfigCorreo:
    usuario: str | None
    contrasena: str | None
    remitente: str
    contacto: str | None
    url_publica: str

    @property
    def listo(self) -> bool:
        return bool(self.usuario and self.contrasena)


def leer_config() -> ConfigCorreo:
    cifrada = db.config("correo.contrasena")
    contrasena = None
    if cifrada:
        try:
            contrasena = _fernet().decrypt(cifrada.encode()).decode()
        except InvalidToken:
            # Cambió JWT_SECRETO: la guardada ya no se puede leer; hay que volver a pegarla.
            log.warning("La contraseña de aplicación guardada no se pudo descifrar (¿cambió JWT_SECRETO?)")
    usuario = db.config("correo.usuario")
    return ConfigCorreo(
        usuario=usuario,
        contrasena=contrasena,
        remitente=db.config("correo.remitente") or "Umbral",
        contacto=db.config("correo.contacto") or usuario,
        url_publica=(db.config("correo.url_publica") or URL_PUBLICA_POR_DEFECTO).rstrip("/"),
    )


def guardar_config(
    usuario: str | None, contrasena: str | None, remitente: str | None, contacto: str | None, url_publica: str | None
) -> None:
    """`contrasena` None = no cambiarla; cadena vacía = borrarla."""
    db.guardar_config("correo.usuario", (usuario or "").strip().lower() or None)
    if contrasena is not None:
        limpia = contrasena.replace(" ", "")  # Google la muestra en bloques de 4 con espacios
        db.guardar_config("correo.contrasena", _fernet().encrypt(limpia.encode()).decode() if limpia else None)
    db.guardar_config("correo.remitente", (remitente or "").strip() or None)
    db.guardar_config("correo.contacto", (contacto or "").strip().lower() or None)
    db.guardar_config("correo.url_publica", (url_publica or "").strip().rstrip("/") or None)


class CorreoNoConfigurado(Exception):
    pass


class FalloEnvio(Exception):
    """El mensaje es para la persona: dice qué revisar."""


def _enviar_sincrono(cfg: ConfigCorreo, para: str, asunto: str, cuerpo_html: str, cuerpo_texto: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = asunto
    msg["From"] = formataddr((cfg.remitente, cfg.usuario or ""))
    msg["To"] = para
    if cfg.contacto and cfg.contacto != cfg.usuario:
        msg["Reply-To"] = cfg.contacto
    msg.set_content(cuerpo_texto)
    msg.add_alternative(cuerpo_html, subtype="html")
    try:
        with smtplib.SMTP_SSL(SERVIDOR_SMTP, PUERTO_SMTP, context=ssl.create_default_context(), timeout=20) as smtp:
            smtp.login(cfg.usuario or "", cfg.contrasena or "")
            smtp.send_message(msg)
    except smtplib.SMTPAuthenticationError:
        raise FalloEnvio(
            "Gmail rechazó el usuario o la contraseña. Usa una CONTRASEÑA DE APLICACIÓN (no tu contraseña normal) "
            "y revisa que la cuenta tenga la verificación en 2 pasos activa."
        ) from None
    except (smtplib.SMTPException, OSError) as exc:
        raise FalloEnvio(f"No se pudo enviar el correo: {exc}") from None


async def enviar(para: str, asunto: str, cuerpo_html: str, cuerpo_texto: str) -> None:
    cfg = leer_config()
    if not cfg.listo:
        raise CorreoNoConfigurado()
    # smtplib bloquea: se manda en un hilo para no congelar el servidor.
    await asyncio.to_thread(_enviar_sincrono, cfg, para, asunto, cuerpo_html, cuerpo_texto)


# ── Plantillas ───────────────────────────────────────────────────────────────
# HTML de correo: tablas y estilos EN LÍNEA (Gmail y Outlook ignoran <style> y
# casi todo el CSS moderno). Ancho fijo de 560 px, que se lee bien en teléfono.

AZUL = "#2F5FE4"
TINTA = "#0F172A"
GRIS = "#475569"
SUAVE = "#94A3B8"


def _plantilla(titulo: str, parrafos: list[str], boton: tuple[str, str] | None, pie: str) -> str:
    cuerpo = "".join(
        f'<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:{GRIS};">{p}</p>' for p in parrafos
    )
    accion = ""
    if boton:
        texto, url = boton
        accion = (
            f'<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td '
            f'style="border-radius:12px;background:{AZUL};"><a href="{html.escape(url)}" '
            f'style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;'
            f'text-decoration:none;border-radius:12px;">{html.escape(texto)}</a></td></tr></table>'
            f'<p style="margin:0 0 8px;font-size:12px;line-height:18px;color:{SUAVE};">Si el botón no funciona, '
            f'copia este enlace en tu navegador:<br><a href="{html.escape(url)}" style="color:{AZUL};word-break:break-all;">'
            f"{html.escape(url)}</a></p>"
        )
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:#F4F6FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
    <tr><td style="padding:0 8px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:36px;height:36px;border-radius:10px;background:{AZUL};text-align:center;vertical-align:middle;
                   font-size:18px;font-weight:700;color:#ffffff;">M</td>
        <td style="padding-left:10px;font-size:16px;font-weight:600;color:{TINTA};">Umbral</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border-radius:20px;padding:36px 32px;
                   box-shadow:0 1px 2px rgba(15,23,42,.06),0 8px 24px rgba(15,23,42,.06);">
      <h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:{TINTA};">{html.escape(titulo)}</h1>
      {cuerpo}
      {accion}
    </td></tr>
    <tr><td style="padding:20px 8px 0;font-size:12px;line-height:18px;color:{SUAVE};">{pie}</td></tr>
  </table>
</td></tr></table>
</body></html>"""


def correo_verificacion(nombre: str, url: str, horas: int) -> tuple[str, str, str]:
    """(asunto, html, texto) del correo para confirmar la cuenta."""
    primer = html.escape(nombre.split()[0] if nombre.strip() else "")
    asunto = "Confirma tu correo para entrar a Umbral"
    cuerpo = _plantilla(
        f"Hola{', ' + primer if primer else ''}: confirma tu correo",
        [
            "Gracias por registrarte en <strong>Umbral</strong>, el asistente de estudio de Procesamiento Digital "
            "de Imágenes.",
            "Para activar tu cuenta, confirma que este correo es tuyo:",
        ],
        ("Confirmar mi correo", url),
        f"El enlace vence en {horas} horas. Si no creaste esta cuenta, ignora este correo: sin confirmar, nadie puede usarla.",
    )
    texto = (
        f"Hola{', ' + nombre.split()[0] if nombre.strip() else ''}:\n\n"
        "Gracias por registrarte en Umbral. Para activar tu cuenta, abre este enlace:\n\n"
        f"{url}\n\nVence en {horas} horas. Si no creaste esta cuenta, ignora este correo."
    )
    return asunto, cuerpo, texto


def correo_prueba(para: str) -> tuple[str, str, str]:
    asunto = "Prueba de correo de Umbral"
    cuerpo = _plantilla(
        "El correo de Umbral funciona",
        [
            f"Este mensaje llegó a <strong>{html.escape(para)}</strong> usando la contraseña de aplicación que "
            "configuraste.",
            "A partir de ahora, quien se registre recibirá su enlace de verificación con este mismo diseño.",
        ],
        None,
        "Lo mandaste tú desde Ajustes → Correo.",
    )
    return asunto, cuerpo, f"El correo de Umbral funciona: este mensaje llegó a {para}."
