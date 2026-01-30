# back/email_utils.py
import os
import ssl
import smtplib
import mimetypes
import re
import html
from datetime import datetime
from email.message import EmailMessage

import requests #type: ignore

# ----------------------------
# Text / encoding helpers
# ----------------------------
def to_text_safe(text: str) -> str:
    """
    Mantiene UTF-8 (acentos/ñ/emojis). No convierte a ASCII.
    """
    if text is None:
        return ""
    return str(text)


# Detecta rangos horarios tipo:
# 9 a 18 | 09 a 18 | 9-18 | 09:00-18:00 | 9 hasta 18 | 9hs a 18hs
_HOURS_RANGE_RE = re.compile(
    r"\b\d{1,2}(:\d{2})?\s*(hs)?\s*(a|-|hasta)\s*\d{1,2}(:\d{2})?\s*(hs)?\b",
    re.IGNORECASE,
)


def normalize_hours(hours: str) -> str:
    """
    Si detecta un rango horario simple (ej: '9 a 18'),
    reemplaza por un texto estándar configurable por ENV.
    """
    if not hours:
        return ""

    if _HOURS_RANGE_RE.search(hours):
        return os.getenv(
            "LOCAL_PICKUP_SCHEDULE",
            "Lunes a Viernes de 8 a 18. Sabados de 8 a 15. Domingos de 8 a 13.",
        )

    return hours


# ----------------------------
# SMTP core
# ----------------------------
def send_email(
    to_email: str,
    subject: str,
    body: str,
    cc: str | None = None,
    reply_to: str | None = None,
    html_body: str | None = None,
) -> bool:
    """
    Envia un email usando Gmail SMTP (EMAIL_SENDER / EMAIL_PASSWORD) con UTF-8.
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

    # ✅ Reply-To correcto (sin el bug del módulo 'email')
    if reply_to:
        em["Reply-To"] = reply_to

    # ✅ Subject en UTF-8 (EmailMessage lo codifica correctamente)
    em["Subject"] = to_text_safe(subject).strip()

    # ✅ Body en UTF-8
    em.set_content(to_text_safe(body), charset="utf-8")
    if html_body:
        em.add_alternative(to_text_safe(html_body), subtype="html", charset="utf-8")

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


# ----------------------------
# Utils for orders
# ----------------------------
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


def _format_datetime(value) -> str:
    if not value:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%d/%m/%Y %H:%M")
    if isinstance(value, str):
        iso = value.strip()
        if iso.endswith("Z"):
            iso = iso[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(iso)
            return parsed.strftime("%d/%m/%Y %H:%M")
        except ValueError:
            return value
    return str(value)


# ----------------------------
# Admin order emails
# ----------------------------
def build_admin_order_ticket(order, items=None) -> tuple[str, str, str]:

    order_id = _get(order, "id")
    customer_name = _get(order, "customer_name") or _get(order, "customerName") or "—"
    customer_email = _get(order, "email") or "—"
    phone = _get(order, "phone") or "—"
    notes = _get(order, "notes") or ""
    notes_u = notes.upper()
    delivery_method = _get(order, "delivery_method") or _get(order, "deliveryMethod") or ""
    is_delivery = delivery_method == "delivery" or ("ENVÍO" in notes_u) or ("ENVIO" in notes_u)
    payment_method = _get(order, "payment_method") or _get(order, "paymentMethod") or "—"
    status = _get(order, "status") or "—"
    status_map = {
        "pendingpayment": "pago pendiente",
        "pending_payment": "pago pendiente",
    }
    status_label = status_map.get(str(status).lower(), status)
    total_amount = _get(order, "total_amount") or _get(order, "totalAmount") or 0
    created_at = _get(order, "created_at") or _get(order, "createdAt")
    created_at_fmt = _format_datetime(created_at)
    subject = f"🧾 Ticket de orden #{order_id} · {payment_method} · {status}"

    store_name = os.getenv("STORE_NAME", "Abul Cell")
    store_address = os.getenv("STORE_ADDRESS", "")
    store_contact = os.getenv("STORE_CONTACT", "")

    def _sep(width: int = 32) -> str:
        return "-" * width

    def _row(left: str, right: str = "", width: int = 32) -> str:
        left = to_text_safe(left)
        right = to_text_safe(right)
        if right:
            space = width - len(left) - len(right)
            space = 1 if space < 1 else space
            return f"{left}{' ' * space}{right}"
        return left

    def _truncate(text: str, width: int) -> str:
        text = to_text_safe(text)
        return text if len(text) <= width else f"{text[: max(0, width - 1)]}…"

    lines = [
        _row(store_name.upper()),
        *([_row(store_address)] if store_address else []),
        *([_row(store_contact)] if store_contact else []),
        _sep(),
        _row("TICKET DE COMPRA"),
        _sep(),
        _row("Orden", f"#{order_id}"),
        *([_row("Fecha", created_at_fmt)] if created_at_fmt else []),
        _row("Cliente", _truncate(customer_name, 18)),
        _row("Email", _truncate(customer_email, 18)),
        _row("Tel", _truncate(phone, 18)),
        _row("Pago", _truncate(payment_method, 18)),
        _row("Estado", _truncate(status_label, 18)),
        _sep(),
        _row("ITEMS", "IMPORTE"),
        _sep(),
    ]

    if not items:
        lines.append(_row("— Sin ítems"))
    else:
        grand = 0
        for it in items:
            name = _get(it, "product_name") or _get(it, "productName") or "Producto"
            qty = _get(it, "quantity", 0) or 0
            unit = _get(it, "unit_price") or _get(it, "unitPrice") or 0
            sub = _get(it, "subtotal")

            if sub is None:
                try:
                    sub = int(unit) * int(qty)
                except Exception:
                    sub = 0

            try:
                grand += int(sub)
            except Exception:
                pass

            item_label = f"{_truncate(name, 18)} x{qty}"
            lines.append(_row(item_label, _money(sub)))

        lines += [
        _sep(),
        _row("TOTAL", _money(total_amount)),
    ]

    if notes.strip():
        lines += [_sep(), _row("Notas"), _row(_truncate(notes.strip(), 32))]

    if not is_delivery:
        lines += [
            _sep(),
            _row("Retiro"),
            _row("Presentar orden + email"),
        ]

    lines += [
        _sep(),
        _row("Acción: preparar y coordinar"),
    ]

    body = "\n".join(lines)
    html_body = (
        "<div style=\"font-family: 'Courier New', monospace; font-size: 12px; "
        "white-space: pre; line-height: 1.3;\">"
        f"{html.escape(body)}"
        "</div>"
    )
    return subject, body, html_body


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

    subject, body, html_body = build_admin_order_ticket(order, items)
    return send_email(admin_email, subject, body, cc=None, html_body=html_body)


def send_admin_order_ticket_to_printer(order, items=None, reason: str = "order_created") -> bool:
    print_url = os.getenv("PRINT_SERVICE_URL", "").strip()
    if not print_url:
        print("[PRINT] PRINT_SERVICE_URL no configurado, no se imprime ticket.")
        return False

    token = os.getenv("PRINT_SERVICE_TOKEN", "").strip()
    subject, body, html_body = build_admin_order_ticket(order, items)
    payload = {
        "order_id": _get(order, "id"),
        "reason": reason,
        "subject": subject,
        "body": body,
        "html": html_body,
    }
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        response = requests.post(print_url, json=payload, headers=headers, timeout=5)
        response.raise_for_status()
        print(f"[PRINT] Ticket enviado a servicio local ({reason}).")
        return True
    except Exception as ex:
        print(f"[PRINT] Error enviando ticket a servicio local: {ex!r}")
        return False
    
    
def _format_mp_payment_summary(payment_data: dict) -> list[str]:
    if not payment_data:
        return []

    lines = []
    payment_id = payment_data.get("id") or payment_data.get("payment_id")
    status = payment_data.get("status")
    status_detail = payment_data.get("status_detail")
    method = payment_data.get("payment_method_id")
    payment_type = payment_data.get("payment_type_id")
    installments = payment_data.get("installments")
    amount = payment_data.get("transaction_amount")
    approved_at = payment_data.get("date_approved")
    external_ref = payment_data.get("external_reference")
    receipt_url = (
        (payment_data.get("point_of_interaction") or {})
        .get("transaction_data", {})
        .get("ticket_url")
    )

    lines.append("💳 Datos del pago (Mercado Pago):")
    if payment_id:
        lines.append(f"- ID de pago: {payment_id}")
    if status:
        lines.append(f"- Estado: {status}")
    if status_detail:
        lines.append(f"- Detalle: {status_detail}")
    if method or payment_type:
        lines.append(f"- Método: {method or '—'} ({payment_type or '—'})")
    if installments:
        lines.append(f"- Cuotas: {installments}")
    if amount is not None:
        lines.append(f"- Monto acreditado: ${amount}")
    if approved_at:
        lines.append(f"- Fecha acreditación: {approved_at}")
    if external_ref:
        lines.append(f"- Referencia externa: {external_ref}")
    if receipt_url:
        lines.append(f"- Comprobante: {receipt_url}")

    return lines


def send_admin_order_paid_email(order, payment_data: dict | None = None):
    """Notifica al email admin que una orden fue PAGADA (Mercado Pago aprobado)."""
    admin_email = os.getenv("EMAIL_ADMIN")
    if not admin_email:
        print("[MAIL] EMAIL_ADMIN no configurado, no se envía aviso admin.")
        return False

    subject = f"✅ Pago aprobado - Orden #{order.id}"
    notes = getattr(order, "notes", "") or ""
    notes_u = notes.upper()
    delivery_method = getattr(order, "delivery_method", "") or getattr(order, "deliveryMethod", "")
    is_delivery = delivery_method == "delivery" or ("ENVÍO" in notes_u) or ("ENVIO" in notes_u)
    
    lines = [
        "Se aprobó el pago de Mercado Pago.",
        "",
        f"Orden: #{order.id}",
        f"Cliente: {order.customer_name} <{order.email}>",
        f"Total: ${order.total_amount}",
        f"Estado: {order.status}",
        "",
        "Items:",
        *[f"- {i.product_name} x{i.quantity} (${i.unit_price})" for i in (order.items or [])],
    ]

    if not is_delivery:
        lines += [
            "",
            "🧾 Verificación para retiro:",
            "Solicitar N° de orden + nombre y apellido o email del cliente.",
        ]

    if payment_data:
        lines += ["", *_format_mp_payment_summary(payment_data)]

    body = "\n".join(lines)

    return send_email(admin_email, subject, body, cc=None)


# ----------------------------
# Contact emails (admin + autoreply)
# ----------------------------
def send_contact_message_to_admin(
    name: str,
    email: str,
    subject: str,
    message: str,
    attachments: list[str] | None = None,
    attachment_links: list[str] | None = None,
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

    # ✅ No ASCII-strip: mantenemos acentos/ñ
    safe_subject = to_text_safe(subject).strip()
    subject_final = f"[CONTACTO] {safe_subject}" if safe_subject else "[CONTACTO] Nuevo mensaje"

    body_lines = [
        "Nuevo mensaje desde Contáctanos:",
        "",
        f"Nombre: {to_text_safe(name)}",
        f"Email: {to_text_safe(email)}",
        "",
        "Mensaje:",
        to_text_safe(message),
    ]
    if attachment_links:
        body_lines += ["", "Adjuntos cargados:", *[to_text_safe(x) for x in attachment_links]]

    body = "\n".join(body_lines)

    em = EmailMessage()
    em["From"] = email_sender
    em["To"] = admin_email

    # ✅ Reply-To para responder directo al cliente
    if email:
        em["Reply-To"] = email

    em["Subject"] = subject_final
    em.set_content(body, charset="utf-8")

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

    subject = "Recibimos tu consulta - Abul Cell"

    greet_name = to_text_safe(name).strip() if name else "!"
    body = (
        f"Hola {greet_name}\n\n"
        "Recibimos tu mensaje y te vamos a responder lo antes posible.\n\n"
        "Saludos,\n"
        "Abul Cell"
    )

    em = EmailMessage()
    em["From"] = email_sender
    em["To"] = email_receiver
    em["Subject"] = subject
    em.set_content(body, charset="utf-8")

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


# ----------------------------
# Stock alerts
# ----------------------------
def send_admin_product_out_of_stock_email(product):
    admin_email = os.getenv("EMAIL_ADMIN")
    if not admin_email:
        print("[MAIL] EMAIL_ADMIN no configurado, no se envía aviso admin.")
        return False

    subject = f"⚠️ Stock agotado: {product.name} (ID {product.id})"
    body = (
        "Se agotó el producto.\n\n"
        f"Producto: {product.name}\n"
        f"ID: {product.id}\n"
        f"Categoría: {product.category}\n"
        f"Precio: ${product.price}\n"
        f"Stock actual: {product.stock}\n\n"
        "Acción: reponer o editar stock desde el panel admin."
    )
    return send_email(admin_email, subject, body, cc=None)


# ----------------------------
# Buyer emails
# ----------------------------
def send_buyer_order_email(order, items, mode: str, payment_data: dict | None = None):
    """
    mode: "cash_created" | "mp_paid"
    """
    address = os.getenv("LOCAL_PICKUP_ADDRESS", "Dirección no configurada")

    # ✅ Normaliza horarios si detecta un rango simple (ej: 9 a 18)
    hours = normalize_hours(os.getenv("LOCAL_PICKUP_HOURS", ""))

    whatsapp = os.getenv("LOCAL_PICKUP_WHATSAPP", "")
    notes = (getattr(order, "notes", "") or "")
    notes_u = notes.upper()
    is_delivery = ("ENVÍO" in notes_u) or ("ENVIO" in notes_u)
    lines = []

    to_email = getattr(order, "email", None)
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

    # (opcional) Intro / Pago (no estaba en tu body original, lo agrego para que tenga contenido útil)
    lines += [intro, pay_line, ""]

    # --- Detalle de items (soporta dicts) ---
    if items:
        lines.append("🧾 Detalle de ítems:")
        for it in (items or []):
            name = (it.get("product_name") if isinstance(it, dict) else getattr(it, "product_name", None)) or "Producto"
            qty = (it.get("quantity") if isinstance(it, dict) else getattr(it, "quantity", 1)) or 1
            unit = (it.get("unit_price") if isinstance(it, dict) else getattr(it, "unit_price", 0)) or 0
            sub = (it.get("subtotal") if isinstance(it, dict) else getattr(it, "subtotal", None))
            if sub is None:
                sub = int(unit) * int(qty)

            lines.append(f"- {name} x{qty} · ${int(unit)} c/u · Subtotal: ${int(sub)}")
        lines.append("")

    # ✅ Entrega: Retiro vs Envío
    if is_delivery:
        # ✅ Normaliza también delivery_hours si viene como rango simple
        delivery_hours = normalize_hours(os.getenv("DELIVERY_HOURS", ""))  # opcional

        lines += [
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
            "📍 Retiro en:",
            address,
            "",
            "🧾 Para retirar, presentá el N° de orden + nombre y apellido o email.",
        ]

        if hours:
            lines += ["", f"🕒 Horarios: {hours}"]
        if whatsapp:
            lines += ["", f"📲 WhatsApp: {whatsapp}"]

    if mode == "mp_paid" and payment_data:
        lines += ["", *_format_mp_payment_summary(payment_data)]

    lines += ["", "Gracias por tu compra 🙌"]

    body = "\n".join(lines)
    return send_email(to_email, subject, body, cc=None)


# ----------------------------
# Auth emails
# ----------------------------
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

Hacé click aquí para crear una nueva:
{reset_url}

Si vos no pediste esto, podés ignorar este correo.
"""
    html_body = f"""
      <div style="font-family: Arial, sans-serif; color: #0f172a;">
        <p>Hola {name or ""}!</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>
          <a href="{reset_url}" style="color: #2563eb; font-weight: 700;">
            Click aquí
          </a>
          para crear una nueva.
        </p>
        <p>Si vos no pediste esto, podés ignorar este correo.</p>
      </div>
    """

    return send_email(
        to_email=to_email,
        subject=subject,
        body=body,
        html_body=html_body,
        reply_to=None,
    )
