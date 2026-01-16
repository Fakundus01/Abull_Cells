# back/email_utils.py
import email
import os
import ssl
import smtplib
from email.message import EmailMessage
import mimetypes


def to_ascii_safe(text: str) -> str:
    """
    Evita problemas de encoding eliminando acentos/ñ si hiciera falta.
    """
    if text is None:
        return ""
    return str(text).encode("ascii", errors="ignore").decode("ascii")

def send_email(to_email: str, subject: str, body: str, cc: str | None = None, reply_to: str | None = None) -> bool:
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
    if email:
        em["Reply-To"] = email
    if cc:
        em["Cc"] = cc
    if reply_to:
        em["Reply-To"] = reply_to
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


def _money(n):
    try:
        return f"${int(n):,}".replace(",", ".")  # 10000 -> $10.000 (AR)
    except Exception:
        return f"${n}"

def _get(obj, key, default=None):
    """Soporta dict o modelo."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)

def send_order_confirmation_email(order, items=None):
    """
    Envía mail al admin con el detalle de una orden.
    items puede ser:
      - lista de dicts (como tu order_items)
      - lista de modelos OrderItem (SQLAlchemy)
    """
    admin_email = os.getenv("EMAIL_ADMIN")
    if not admin_email:
        print("[MAIL] EMAIL_ADMIN no configurado, no se envía aviso admin.")
        return False

    order_id = _get(order, "id")
    customer_name = _get(order, "customer_name") or _get(order, "customerName") or "—"
    email = _get(order, "email") or "—"
    phone = _get(order, "phone") or "—"
    notes = _get(order, "notes") or ""
    payment_method = _get(order, "payment_method") or _get(order, "paymentMethod") or "—"
    status = _get(order, "status") or "—"
    total_amount = _get(order, "total_amount") or _get(order, "totalAmount") or 0
    created_at = _get(order, "created_at") or _get(order, "createdAt")

    subject = f"🧾 Nueva orden #{order_id} · {payment_method} · {status}"

    lines = []
    lines.append("📦 NUEVA ORDEN - ABUL CELLS")
    lines.append("")
    lines.append(f"Orden: #{order_id}")
    if created_at:
        lines.append(f"Fecha: {created_at}")
    lines.append(f"Cliente: {customer_name}")
    lines.append(f"Email: {email}")
    lines.append(f"Tel: {phone}")
    lines.append(f"Método de pago: {payment_method}")
    lines.append(f"Estado: {status}")
    lines.append(f"Total: {_money(total_amount)}")

    if notes.strip():
        lines.append("")
        lines.append(f"Notas: {notes.strip()}")

    # Items
    lines.append("")
    lines.append("🧾 Detalle de ítems:")
    if not items:
        lines.append("— (Sin detalle de ítems)")
    else:
        grand = 0
        for it in items:
            name = _get(it, "product_name") or _get(it, "productName") or "Producto"
            qty = _get(it, "quantity", 0) or 0
            unit = _get(it, "unit_price") or _get(it, "unitPrice") or 0
            sub = _get(it, "subtotal")

            # si subtotal no viene, lo calculamos
            if sub is None:
                try:
                    sub = int(unit) * int(qty)
                except Exception:
                    sub = 0

            try:
                grand += int(sub)
            except Exception:
                pass

            lines.append(f"- {name}  x{qty}  ({_money(unit)} c/u)  =>  {_money(sub)}")

        lines.append("")
        lines.append(f"Subtotal calculado (ítems): {_money(grand)}")

    lines.append("")
    lines.append("✅ Acción: preparar productos / reservar stock / coordinar entrega o retiro.")
    body = "\n".join(lines)

    return send_email(admin_email, subject, body, cc=None)
    
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
    
def send_contact_message_to_admin(
    name: str,
    email: str,
    subject: str,
    message: str,
    attachments: list[str] | None = None
) -> bool:
    """
    Envía al EMAIL_ADMIN el mensaje del formulario "Contáctanos".
    Soporta adjuntos (imágenes/PDF).
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
        "Nuevo mensaje desde Contáctanos:",
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

    # ✅ Reply-To para responder directo al cliente
    if email:
        em["Reply-To"] = email

    em["Subject"] = subject
    em.set_content(body)

    # ✅ Adjuntos
    attachments = attachments or []
    for path in attachments:
        try:
            if not path or not os.path.exists(path):
                continue

            mime, _ = mimetypes.guess_type(path)
            maintype, subtype = (mime.split("/", 1) if mime else ("application", "octet-stream"))

            with open(path, "rb") as fp:
                em.add_attachment(
                    fp.read(),
                    maintype=maintype,
                    subtype=subtype,
                    filename=os.path.basename(path),
                )
        except Exception as ex:
            print(f"[MAIL] No se pudo adjuntar {path!r}: {ex!r}")

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

    subject = to_ascii_safe("Recibimos tu consulta - Abul Cell")

    greet_name = to_ascii_safe(name) if name else "!"
    body = to_ascii_safe(
        f"Hola {greet_name}\n\n"
        "Recibimos tu mensaje y te vamos a responder lo antes posible.\n\n"
        "Saludos,\n"
        "Abul Cell"
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
    
def send_admin_product_out_of_stock_email(product):
    admin_email = os.getenv("EMAIL_ADMIN")
    if not admin_email:
        print("[MAIL] EMAIL_ADMIN no configurado, no se envía aviso admin.")
        return False

    subject = f"⚠️ Stock agotado: {product.name} (ID {product.id})"
    body = (
        f"Se agotó el producto.\n\n"
        f"Producto: {product.name}\n"
        f"ID: {product.id}\n"
        f"Categoría: {product.category}\n"
        f"Precio: ${product.price}\n"
        f"Stock actual: {product.stock}\n\n"
        f"Acción: reponer o editar stock desde el panel admin."
    )
    return send_email(admin_email, subject, body, cc=None)

def send_buyer_order_email(order, items, mode: str):
    """
    mode: "cash_created" | "mp_paid"
    """
    address = os.getenv("LOCAL_PICKUP_ADDRESS", "Dirección no configurada")
    hours = os.getenv("LOCAL_PICKUP_HOURS", "")
    whatsapp = os.getenv("LOCAL_PICKUP_WHATSAPP", "")
    notes = (order.notes or "")
    notes_u = notes.upper()
    is_delivery = ("ENVÍO" in notes_u) or ("ENVIO" in notes_u)
    lines = []

    to_email = order.email
    if not to_email:
        print("[MAIL] Orden sin email, no se envía mail al comprador.")
        return False

    if mode == "cash_created":
        subject = f"✅ Pedido #{order.id} registrado - Pago en efectivo al retirar"
        intro = "Tu pedido fue registrado correctamente."
        pay_line = "💵 Pagás en efectivo al retirar."
    elif mode == "mp_paid":
        subject = f"✅ Pago aprobado - Pedido #{order.id} confirmado"
        intro = "¡Tu pago fue aprobado! Tu compra fue confirmada."
        pay_line = "💳 Pago por Mercado Pago: aprobado."
    else:
        raise ValueError("mode inválido")

    # --- Detalle de items (soporta dicts) ---
    lines_items = []
    for it in (items or []):
        # soporta dicts o modelos
        name = (it.get("product_name") if isinstance(it, dict) else getattr(it, "product_name", None)) or "Producto"
        qty = (it.get("quantity") if isinstance(it, dict) else getattr(it, "quantity", 1)) or 1
        unit = (it.get("unit_price") if isinstance(it, dict) else getattr(it, "unit_price", 0)) or 0
        sub = (it.get("subtotal") if isinstance(it, dict) else getattr(it, "subtotal", None))
        if sub is None:
            sub = int(unit) * int(qty)

        lines_items.append(f"- {name} x{qty} · ${int(unit)} c/u · Subtotal: ${int(sub)}")

    # ✅ Entrega: Retiro vs Envío
    if is_delivery:
        delivery_hours = os.getenv("DELIVERY_HOURS", "")  # opcional (ej: "16:00 a 19:00")
        lines += [
            "",
            "🛵 Envío a domicilio:",
            "Estamos preparando tu paquete. Te lo enviaremos en el próximo horario de envíos.",
        ]

        if delivery_hours:
            lines += [f"🕒 Horario estimado de envío: {delivery_hours}"]

        # Mostramos la dirección que viene en notes (porque ahí agregamos "ENVÍO - ...")
        delivery_line = ""
        for ln in (notes or "").splitlines():
            if ln.upper().startswith("ENVÍO") or ln.upper().startswith("ENVIO"):
                delivery_line = ln
                break

        lines += ["", "📍 Dirección indicada:", delivery_line or "—"]

        if whatsapp:
            lines += ["", f"📲 WhatsApp: {whatsapp}"]

    else:
        lines += [
            "",
            "📍 Retiro en:",
            address,
        ]

        if hours:
            lines += ["", f"🕒 Horarios: {hours}"]
        if whatsapp:
            lines += ["", f"📲 WhatsApp: {whatsapp}"]

    lines += ["", "Gracias por tu compra 🙌"]

    body = "\n".join(lines)
    return send_email(to_email, subject, body, cc=None)

def send_verify_code_email(to_email: str, code: str, name: str = ""):
    subject = "🔐 Verificación de email - Abul Cell"
    body = (
        f"Hola {name or ''}!\n\n"
        f"Tu código de verificación es: {code}\n\n"
        "Si no fuiste vos, ignorá este mail.\n"
    )
    return send_email(to_email, subject, body, cc=None)

def send_password_reset_email(to_email: str, name: str, reset_url: str) -> bool:
    subject = "Recuperación de contraseña - Abul Cell"
    body = f"""Hola {name or ""}!

Recibimos una solicitud para restablecer tu contraseña.

Abrí este link para crear una nueva:
{reset_url}

Si vos no pediste esto, podés ignorar este correo.
"""

    return send_email(
        to_email=to_email,
        subject=subject,
        body=body,
        reply_to=None
    )
   