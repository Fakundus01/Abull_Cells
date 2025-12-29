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
        "Datos de envio/facturacion:",
        f"Direccion: {to_ascii_safe(order.address)}",
        f"Ciudad: {to_ascii_safe(order.city)}",
        f"Provincia: {to_ascii_safe(order.province)}",
        f"Codigo postal: {to_ascii_safe(order.postal_code)}",
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
