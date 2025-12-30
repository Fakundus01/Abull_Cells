# back/email_utils.py
import os
import ssl
import smtplib
from email.message import EmailMessage


def to_ascii_safe(text: str) -> str:
    """
    Evita problemas de encoding eliminando acentos/ñ si hiciera falta.
    """
    if text is None:
        return ""
    return str(text).encode("ascii", errors="ignore").decode("ascii")

def send_email(to_email: str, subject: str, body: str, cc: str | None = None) -> bool:
    """
    Envia un email usando Gmail SMTP (EMAIL_SENDER / EMAIL_PASSWORD).
    """
    email_sender = os.getenv("EMAIL_SENDER")
    email_password = os.getenv("EMAIL_PASSWORD")

    if not email_sender or not email_password:
        print("[MAIL] Falta EMAIL_SENDER o EMAIL_PASSWORD. No se envia correo.")
        return False

    if not to_email:
        print("[MAIL] Falta destinatario (to_email).")
        return False

    em = EmailMessage()
    em["From"] = email_sender
    em["To"] = to_email
    if cc:
        em["Cc"] = cc
    em["Subject"] = to_ascii_safe(subject)
    em.set_content(to_ascii_safe(body))

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
            smtp.login(email_sender, email_password)
            smtp.send_message(em)

        print(f"[MAIL] Email enviado a {to_email}.")
        return True
    except Exception as ex:
        print(f"[MAIL] Error enviando email: {ex!r}")
        return False


def send_order_confirmation_email(order):
    """
    Envia un correo de confirmacion al cliente usando Gmail (SMTP_SSL),
    con un resumen simple de la orden.
    """

    email_sender = os.getenv("EMAIL_SENDER")
    email_password = os.getenv("EMAIL_PASSWORD")
    admin_email = os.getenv("EMAIL_ADMIN", None)

    if not email_sender or not email_password:
        print("[MAIL] Falta EMAIL_SENDER o EMAIL_PASSWORD. No se envia correo.")
        return False

    # si el cliente no tiene email, mandamos al admin (si existe)
    email_receiver = order.email or admin_email
    if not email_receiver:
        print("[MAIL] La orden no tiene email y tampoco EMAIL_ADMIN. No se envia.")
        return False

    subject = f"Confirmacion de compra - Abul Cells (Orden #{order.id})"
    subject = to_ascii_safe(subject)

    # cuerpo simple (sin tildes para no tentar a los dioses del encoding)
    lines = [
        f"Hola {to_ascii_safe(order.customer_name)},",
        "",
        "Gracias por tu compra en Abul Cells.",
        "",
        "Resumen de tu orden:",
    ]
    for item in order.items:
        lines.append(
            f"- {to_ascii_safe(item.product_name)} x {item.quantity} = ${item.subtotal}"
        )

    lines += [
        "",
        f"Metodo de pago: {to_ascii_safe(order.payment_method)}",
        f"Total: ${order.total_amount}",
        "",
        "Puedes retirar tu pedido en nuestra tienda (direccion de la tienda).",
        "",
        "Saludos,",
        "Abul Cells",
    ]

    body = "\n".join(lines)
    body = to_ascii_safe(body)

    em = EmailMessage()
    em["From"] = email_sender
    em["To"] = email_receiver
    if admin_email and admin_email != email_receiver:
        em["Cc"] = admin_email
    em["Subject"] = subject
    em.set_content(body)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
            smtp.login(email_sender, email_password)
            smtp.send_message(em)

        print(f"[MAIL] Email de confirmacion enviado a {email_receiver}.")
        return True
    except Exception as ex:
        print(f"[MAIL] Error al enviar email de confirmacion: {ex!r}")
        return False
    
def send_admin_order_paid_email(order):
    """Notifica al email admin que una orden fue PAGADA (Mercado Pago aprobado)."""
    admin_email = os.getenv("EMAIL_ADMIN")
    if not admin_email:
        print("[MAIL] EMAIL_ADMIN no configurado, no se envía aviso admin.")
        return False

    subject = f"✅ Pago aprobado - Orden #{order.id}"
    body = (
        f"Se aprobó el pago de Mercado Pago.\n\n"
        f"Orden: #{order.id}\n"
        f"Cliente: {order.customer_name} <{order.email}>\n"
        f"Total: ${order.total_amount}\n"
        f"Estado: {order.status}\n\n"
        f"Items:\n" +
        "\n".join([f"- {i.product_name} x{i.quantity} (${i.unit_price})" for i in (order.items or [])])
    )

    return send_email(admin_email, subject, body, cc=None)
    
def send_contact_message_to_admin(name: str, email: str, subject: str, message: str) -> bool:
    """
    Envia al EMAIL_ADMIN el mensaje del formulario "Contactanos".
    """
    email_sender = os.getenv("EMAIL_SENDER")
    email_password = os.getenv("EMAIL_PASSWORD")
    admin_email = os.getenv("EMAIL_ADMIN")

    if not email_sender or not email_password:
        print("[MAIL] Falta EMAIL_SENDER o EMAIL_PASSWORD. No se envia correo.")
        return False
    if not admin_email:
        print("[MAIL] Falta EMAIL_ADMIN. No se envia correo.")
        return False

    subject = to_ascii_safe(f"[CONTACTO] {subject}".strip() or "[CONTACTO] Nuevo mensaje")

    body_lines = [
        "Nuevo mensaje desde Contactanos:",
        "",
        f"Nombre: {to_ascii_safe(name)}",
        f"Email: {to_ascii_safe(email)}",
        "",
        "Mensaje:",
        to_ascii_safe(message),
    ]
    body = "\n".join(body_lines)

    em = EmailMessage()
    em["From"] = email_sender
    em["To"] = admin_email
    em["Subject"] = subject
    em.set_content(body)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
            smtp.login(email_sender, email_password)
            smtp.send_message(em)

        print(f"[MAIL] Mensaje de contacto enviado a admin: {admin_email}.")
        return True
    except Exception as ex:
        print(f"[MAIL] Error enviando contacto a admin: {ex!r}")
        return False


def send_contact_autoreply(email_receiver: str, name: str = "") -> bool:
    """
    Respuesta automatica al usuario confirmando recepcion.
    """
    email_sender = os.getenv("EMAIL_SENDER")
    email_password = os.getenv("EMAIL_PASSWORD")

    if not email_sender or not email_password:
        print("[MAIL] Falta EMAIL_SENDER o EMAIL_PASSWORD. No se envia autoreply.")
        return False
    if not email_receiver:
        return False

    subject = to_ascii_safe("Recibimos tu consulta - Abul Cells")

    greet_name = to_ascii_safe(name) if name else "!"
    body = to_ascii_safe(
        f"Hola {greet_name}\n\n"
        "Recibimos tu mensaje y te vamos a responder lo antes posible.\n\n"
        "Saludos,\n"
        "Abul Cells"
    )

    em = EmailMessage()
    em["From"] = email_sender
    em["To"] = email_receiver
    em["Subject"] = subject
    em.set_content(body)

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as smtp:
            smtp.login(email_sender, email_password)
            smtp.send_message(em)

        print(f"[MAIL] Autoreply enviado a {email_receiver}.")
        return True
    except Exception as ex:
        print(f"[MAIL] Error enviando autoreply: {ex!r}")
        return False
