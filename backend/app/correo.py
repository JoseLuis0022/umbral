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
from pathlib import Path
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
    if f"cid:{CID_LOGO}" in cuerpo_html:
        # Incrustado en el mensaje (no un enlace): se ve aunque Umbral no esté
        # publicado y no depende de que el cliente cargue imágenes remotas.
        msg.get_payload()[1].add_related(LOGO_PNG, "image", "png", cid=f"<{CID_LOGO}>", filename="umbral.png")
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
# Estilo de los correos transaccionales serios (GitHub, Linear, Stripe): fondo
# blanco, logo pequeño, el contenido en una caja con borde fino de 1 px y sin
# sombras, título de peso normal, frases cortas, un solo botón y un pie gris
# que explica POR QUÉ te llegó. Tablas y estilos en línea: Gmail y Outlook
# ignoran <style> y casi todo el CSS moderno. 544 px de ancho, como GitHub.

LOGO_PNG = (Path(__file__).parent / "recursos" / "logo-correo.png").read_bytes()
CID_LOGO = "logo-umbral"

AZUL = "#2F5FE4"          # acento de Umbral
AZUL_BORDE = "#1D41A3"    # tinta del acento (borde del botón)
TEXTO = "#1E293B"
TEXTO_2 = "#475569"
TEXTO_3 = "#64748B"
BORDE = "#E2E8F0"
FUENTE = "-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif"


def _p(contenido: str, *, color: str = TEXTO, tam: int = 14, alto: int = 22, margen: str = "0 0 16px") -> str:
    return f'<p style="margin:{margen};font-size:{tam}px;line-height:{alto}px;color:{color};">{contenido}</p>'


def _boton(texto: str, url: str) -> str:
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr>'
        f'<td style="border-radius:6px;background:{AZUL};border:1px solid {AZUL_BORDE};">'
        f'<a href="{html.escape(url)}" target="_blank" style="display:inline-block;padding:10px 20px;font-family:{FUENTE};'
        f'font-size:14px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">'
        f"{html.escape(texto)}</a></td></tr></table>"
    )


def _plantilla(*, previa: str, titulo: str, caja: str, pie: str) -> str:
    """`previa`: el texto que la bandeja muestra junto al asunto (no se ve al abrir)."""
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
<title>{html.escape(titulo)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:{FUENTE};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">{html.escape(previa)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
<tr><td align="center" style="padding:32px 16px 40px;">
  <table role="presentation" width="544" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:544px;table-layout:fixed;">
    <tr><td style="padding:0 0 24px;">
      <img src="cid:{CID_LOGO}" width="32" height="32" alt="Umbral" style="display:block;border:0;outline:none;width:32px;height:32px;">
    </td></tr>
    <tr><td style="padding:0 0 16px;font-size:24px;line-height:32px;font-weight:400;color:{TEXTO};">{html.escape(titulo)}</td></tr>
    <tr><td style="border:1px solid {BORDE};border-radius:6px;padding:24px;font-family:{FUENTE};">{caja}</td></tr>
    <tr><td style="padding:16px 0 0;">{_p(pie, color=TEXTO_3, tam=12, alto=18, margen="0")}</td></tr>
    <tr><td style="padding:24px 0 0;"><div style="border-top:1px solid {BORDE};line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
    <tr><td style="padding:16px 0 0;">{_p("<strong style='color:" + TEXTO_2 + ";font-weight:600;'>Umbral</strong> · Asistente de estudio de Procesamiento Digital de Imágenes", color=TEXTO_3, tam=12, alto=18, margen="0")}</td></tr>
  </table>
</td></tr></table>
</body></html>"""


def correo_verificacion(nombre: str, para: str, url: str, horas: int) -> tuple[str, str, str]:
    """(asunto, html, texto) del correo para confirmar la cuenta."""
    primer = nombre.split()[0] if nombre.strip() else ""
    saludo = f"Hola, {html.escape(primer)}:" if primer else "Hola:"
    asunto = "Confirma tu correo para Umbral"
    caja = (
        _p(saludo)
        + _p(f"Para terminar de crear tu cuenta de Umbral, confirma que <strong>{html.escape(para)}</strong> es tu correo.")
        + _boton("Confirmar correo", url)
        + _p("Al confirmarlo podrás usar Umbral en modo invitado.", color=TEXTO_2, margen="0 0 16px")
        + _p(
            f'¿El botón no funciona? Copia este enlace en tu navegador:<br>'
            f'<a href="{html.escape(url)}" style="color:{AZUL};text-decoration:none;word-break:break-all;overflow-wrap:anywhere;">{html.escape(url)}</a>',
            color=TEXTO_3,
            tam=12,
            alto=18,
            margen="0",
        )
    )
    pie = (
        f"Recibes este correo porque se creó una cuenta de Umbral con esta dirección. El enlace vence en {horas} horas. "
        "Si no fuiste tú, ignóralo: sin confirmar, nadie puede usar la cuenta."
    )
    cuerpo = _plantilla(previa="Confirma tu correo para terminar de crear tu cuenta de Umbral.", titulo="Confirma tu correo", caja=caja, pie=pie)
    texto = (
        f"{'Hola, ' + primer + ':' if primer else 'Hola:'}\n\n"
        f"Para terminar de crear tu cuenta de Umbral, confirma que {para} es tu correo abriendo este enlace:\n\n"
        f"{url}\n\n"
        f"El enlace vence en {horas} horas. Si no fuiste tú, ignora este correo: sin confirmar, nadie puede usar la cuenta.\n\n"
        "— Umbral · Asistente de estudio de Procesamiento Digital de Imágenes"
    )
    return asunto, cuerpo, texto


def correo_prueba(para: str) -> tuple[str, str, str]:
    asunto = "Prueba de correo de Umbral"
    caja = (
        _p(f"Umbral ya puede enviar correos desde <strong>{html.escape(para)}</strong>.")
        + _p("Así verán el correo de confirmación quienes se registren.", color=TEXTO_2, margen="0")
    )
    cuerpo = _plantilla(
        previa=f"Umbral ya puede enviar correos desde {para}.",
        titulo="Tu correo de envío funciona",
        caja=caja,
        pie="Enviaste esta prueba desde Ajustes → Registro público.",
    )
    texto = f"Umbral ya puede enviar correos desde {para}.\n\nEnviaste esta prueba desde Ajustes → Registro público."
    return asunto, cuerpo, texto
