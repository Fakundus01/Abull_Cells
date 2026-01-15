# app.py
from flask import Flask, json, jsonify, request
from datetime import datetime
import mimetypes
import secrets
import re
import mercadopago # type: ignore
import os
from functools import wraps
from flask_cors import CORS
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask_jwt_extended import ( #type: ignore
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
    verify_jwt_in_request
)
from helpers import get_effective_price, parse_discount_percent
from dotenv import load_dotenv
from werkzeug.exceptions import NotFound  # arriba, con los imports
from werkzeug.utils import secure_filename, secure_filename
from config import Config
from models import db, Product, User, Order, OrderItem, Address
from email_utils import (
    send_contact_message_to_admin, send_contact_autoreply, send_order_confirmation_email, 
    send_admin_product_out_of_stock_email, send_buyer_order_email, send_verify_code_email, send_admin_order_paid_email,
    send_password_reset_email
    )
from werkzeug.security import generate_password_hash, check_password_hash
                         
load_dotenv()  # 👈 carga las variables desde .env

def create_app():
    app = Flask(__name__)
    def _get_reset_serializer(app: Flask):
        secret = app.config.get("SECRET_KEY") or os.getenv("SECRET_KEY") or "dev-secret"
        return URLSafeTimedSerializer(secret, salt="pwd-reset")
    app.config.from_object(Config)

    db.init_app(app)
    CORS(
    app,
    resources={r"/api/*": {"origins": ["http://localhost:5173"]}},
    supports_credentials=True
    )

    jwt = JWTManager(app)

    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "8"))
    ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    def _total_upload_size(file_list):
        total = 0
        for f in file_list:
            pos = f.stream.tell()
            f.stream.seek(0, os.SEEK_END)
            total += f.stream.tell()
            f.stream.seek(pos)
        return total

    # -------- JWT HANDLERS (respuestas consistentes) --------

    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify({"msg": "Falta el token de autorización"}), 401

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        return jsonify({"msg": "Token inválido"}), 422

    @jwt.expired_token_loader
    def _expired_token(jwt_header, jwt_payload):
        return jsonify({"msg": "Token expirado"}), 401

    @jwt.revoked_token_loader
    def _revoked_token(jwt_header, jwt_payload):
        return jsonify({"msg": "Token revocado"}), 401

    mp_access_token = os.getenv("MP_ACCESS_TOKEN")

    if not mp_access_token:
        print("[MP] MP_ACCESS_TOKEN no configurado. Pagos reales deshabilitados.")
        mp_client = None
    else:
        print("[MP] Inicializando cliente de Mercado Pago...")
        try:
            mp_client = mercadopago.SDK(mp_access_token)
            print("[MP] Cliente de Mercado Pago inicializado correctamente.")
        except Exception as ex:
            print(f"[MP] Error al inicializar SDK de Mercado Pago: {ex!r}")
            mp_client = None


    # -------- RUTAS PÚBLICAS --------

    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "app": "abul_cells_api"})

    @app.route("/api/products", methods=["GET"])
    def get_products():
        try:
            products = Product.query.all()
            return jsonify([p.to_dict() for p in products])
        except Exception as exc:
            app.logger.exception(f"Error inesperado en /api/products: {exc}")
            return jsonify({"msg": "Error al obtener productos"}), 500
        
    @app.route("/api/orders", methods=["POST"])
    @jwt_required()
    def create_order():
        """
        Crea una orden a partir del carrito del usuario logueado.
        Body esperado:
        {
        "customer": { "phone": "...", "notes": "..." },
        "items": [ { "productId": 1, "quantity": 2 }, ... ],
        "paymentMethod": "efectivo" | "mercadopago"
        }
        """
        try:
            data = request.get_json() or {}

            user_id = get_jwt_identity()
            user = User.query.get(int(user_id)) if user_id else None
            if not user:
                return jsonify({"msg": "Usuario no encontrado"}), 404

            customer = data.get("customer") or {}
            items_payload = data.get("items") or []
            if not items_payload:
                return jsonify({"msg": "Carrito vacío"}), 400

            payment_method = (data.get("paymentMethod") or "").strip().lower()
            valid_methods = ["efectivo", "mercadopago"]
            if payment_method not in valid_methods:
                app.logger.warning(f"[ORDER] Método de pago inválido recibido: {payment_method!r}")
                return jsonify({"msg": "Método de pago inválido"}), 400

            # ✅ Estado distinto para MP (recomendado)
            if payment_method == "mercadopago":
                if not mp_client:
                    return jsonify({"msg": "Mercado Pago no está configurado"}), 500
                status = "pending_payment"   # ✅ recomendado
            else:
                status = "pending"

            payment_brand = None
            payment_last4 = None
            payment_txid = None

            # ---------------------------
            # 1) Validar stock + calcular total (sin descontar aún)
            # ---------------------------
            total_amount = 0
            order_items = []

            merged = {}
            for it in items_payload:
                pid = it.get("productId")
                qty = int(it.get("quantity", 1))
                if not pid:
                    return jsonify({"msg": "Cada ítem debe tener productId"}), 400
                if qty <= 0:
                    return jsonify({"msg": "Cantidad inválida"}), 400
                merged[pid] = merged.get(pid, 0) + qty

            for product_id, quantity in merged.items():
                product = Product.query.get(int(product_id))
                if not product:
                    return jsonify({"msg": f"Producto no encontrado (id={product_id})"}), 404

                stock = int(product.stock or 0)
                if quantity > stock:
                    return jsonify({
                        "msg": f"Sin stock suficiente para '{product.name}'. Disponible: {stock}",
                        "productId": product.id,
                        "available": stock,
                        "requested": quantity,
                    }), 409

                unit_price = get_effective_price(product)
                subtotal = unit_price * quantity
                total_amount += subtotal

                order_items.append({
                    "product_id": product.id,
                    "product_name": product.name,
                    "unit_price": unit_price,
                    "quantity": quantity,
                    "subtotal": subtotal,
                })

            # ---------------------------
            # 2) Descontar stock SOLO si es EFECTIVO
            # (MP: NO tocar stock acá; se descontará al aprobar pago)
            # ---------------------------
            agotados = []

            if payment_method == "efectivo":
                for pid, qty in merged.items():
                    product = (
                        db.session.query(Product)
                        .filter(Product.id == pid)
                        .with_for_update()
                        .first()
                    )
                    if not product:
                        return jsonify({"msg": f"Producto no encontrado (id={pid})"}), 404

                    prev_stock = int(product.stock or 0)
                    if qty > prev_stock:
                        return jsonify({
                            "msg": f"Sin stock suficiente para '{product.name}'. Disponible: {prev_stock}",
                            "productId": pid,
                            "available": prev_stock
                        }), 409

                    product.stock = prev_stock - qty

            delivery_method = data.get("deliveryMethod", "pickup")
            delivery_address_snapshot = None
            if delivery_method == "delivery":
                address_id = data.get("addressId")
                if not address_id:
                    return jsonify({"msg": "Dirección requerida para envío"}), 400

                address = Address.query.filter_by(
                    id=address_id,
                    user_id=user.id
                ).first()

                if not address:
                    return jsonify({"msg": "Dirección inválida"}), 400

                delivery_address_snapshot = json.dumps(address.to_dict(), ensure_ascii=False)

            # ---------------------------
            # 3) Crear Order + OrderItems
            # ---------------------------
            order = Order(
                customer_name=user.name,
                email=user.email,
                phone=customer.get("phone"),
                notes=customer.get("notes"),
                payment_method=payment_method,
                total_amount=total_amount,
                status=status,                 # ✅ pending / pending_payment
                payment_brand=payment_brand,
                payment_last4=payment_last4,
                payment_txid=payment_txid,
                delivery_method=delivery_method,
                delivery_address=delivery_address_snapshot,
            )

            db.session.add(order)
            db.session.flush()  # para tener order.id

            for oi in order_items:
                db.session.add(OrderItem(
                    order_id=order.id,
                    product_id=oi["product_id"],
                    product_name=oi["product_name"],
                    unit_price=oi["unit_price"],
                    quantity=oi["quantity"],
                    subtotal=oi["subtotal"],
                ))

            db.session.commit()

            # ---------------------------
            # 4) Mails de orden (admin + comprador)
            # ---------------------------

            try:
                # ✅ Mail al admin: “se creó una orden”
                send_order_confirmation_email(order, order_items)  
            except Exception as mail_exc:
                app.logger.exception(f"[MAIL] Error enviando mail admin por nueva orden: {mail_exc}")

                # ✅ Mail al comprador:
                # - EFECTIVO: se manda ahora (orden confirmada para retiro)
                # - MP: NO se manda “exitosa” ahora; solo “pendiente de pago” (opcional) o nada
            try:
                if payment_method == "efectivo":
                    send_buyer_order_email(order, order_items, mode="cash_created")
            except Exception as mail_exc:
                app.logger.exception(f"[MAIL] Error enviando mail comprador: {mail_exc}")

            # ---------------------------
            # Mail stock agotado (SOLO si efectivo descontó)
            # ---------------------------
            if agotados:
                try:
                    for p in agotados:
                        send_admin_product_out_of_stock_email(p)
                except Exception as mail_exc:
                    app.logger.exception(f"[MAIL] Error enviando aviso stock agotado: {mail_exc}")

            return jsonify(order.to_dict()), 201

        except Exception as exc:
            app.logger.exception(f"Error inesperado en POST /api/orders: {exc}")
            db.session.rollback()
            return jsonify({"msg": "Error interno al crear la orden"}), 500
        
    @app.route("/api/my/orders", methods=["GET"])
    @jwt_required()
    def my_orders():
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        orders = (
            Order.query
            .filter(Order.email == user.email)
            .order_by(Order.created_at.desc())
            .all()
        )
        return jsonify([o.to_dict() for o in orders])


    @app.route("/api/my/orders/<int:order_id>", methods=["GET"])
    @jwt_required()
    def my_order_detail(order_id):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        order = Order.query.get_or_404(order_id)

        # Dueño o admin
        is_admin = (get_jwt().get("role") == "admin")
        if not is_admin and order.email != user.email:
            return jsonify({"msg": "No tenés permiso para ver esta orden"}), 403

        return jsonify(order.to_dict())


    @app.route("/api/payments/mp/create_preference", methods=["POST"])
    @jwt_required()
    def create_mp_preference():
        if not mp_client:
            return jsonify({"msg": "Mercado Pago no está configurado"}), 500

        try:
            data = request.get_json() or {}
            print(f"[MP] /create_preference - payload recibido: {data}")

            order_id = data.get("orderId")
            if not order_id:
                return jsonify({"msg": "Falta orderId"}), 400

            user_id = get_jwt_identity()
            user = db.session.get(User, int(user_id)) if user_id else None
            if not user:
                return jsonify({"msg": "Usuario no encontrado"}), 404

            order = db.session.get(Order, int(order_id))
            if not order:
                return jsonify({"msg": "Orden no encontrada"}), 404

            # seguridad: el user puede pagar su propia orden
            if order.email != user.email:
                return jsonify({"msg": "No tenés permiso para pagar esta orden"}), 403

            if order.payment_method != "mercadopago":
                return jsonify({"msg": "La orden no es de Mercado Pago"}), 400

            if not order.items:
                return jsonify({"msg": "La orden no tiene ítems"}), 400

            # ✅ permitir estado correcto de MP
            if order.status not in ("pending_payment", "pending"):
                return jsonify({"msg": f"No se puede pagar una orden con estado '{order.status}'"}), 409

            # si ya existe pref guardada, evitamos duplicar
            if order.payment_txid and str(order.payment_txid).startswith("MP_PREF:"):
                return jsonify({"msg": "La preferencia ya fue creada para esta orden"}), 409

            # items MP desde la orden
            mp_items = []
            for it in order.items:
                mp_items.append({
                    "title": it.product_name,
                    "quantity": int(it.quantity),
                    "currency_id": "ARS",
                    "unit_price": float(it.unit_price),
                })

            success_url = os.getenv("MP_SUCCESS_URL")
            failure_url = os.getenv("MP_FAILURE_URL")
            pending_url = os.getenv("MP_PENDING_URL")

            # ✅ webhook REAL (público https). No localhost.
            webhook_url = os.getenv("MP_WEBHOOK_URL")
            if not webhook_url:
                return jsonify({
                    "msg": "Falta MP_WEBHOOK_URL (debe ser HTTPS público, ej: ngrok) para usar webhook."
                }), 500

            preference_data = {
                "external_reference": str(order.id),
                "notification_url": webhook_url,
                "items": mp_items,
            }

            # back_url (singular, como venís usando)
            back_url = {}
            if success_url: back_url["success"] = success_url
            if failure_url: back_url["failure"] = failure_url
            if pending_url: back_url["pending"] = pending_url
            if back_url:
                preference_data["back_url"] = back_url

            # ✅ auto_return SOLO si success es https
            if success_url and success_url.startswith("https://"):
                preference_data["auto_return"] = "approved"

            print(f"[MP] preference_data armado: {preference_data}")

            preference = mp_client.preference().create(preference_data)
            print(f"[MP] Respuesta bruta de MP: {preference}")

            pref_response = preference.get("response", {}) or {}
            pref_id = pref_response.get("id")
            init_point = pref_response.get("init_point") or pref_response.get("sandbox_init_point")

            if not init_point or not pref_id:
                return jsonify({"msg": "No se pudo crear la preferencia de pago"}), 500

            order.payment_txid = f"MP_PREF:{pref_id}"
            db.session.commit()

            return jsonify({"initPoint": init_point, "preferenceId": pref_id}), 200

        except Exception as exc:
            app.logger.exception(f"[MP] Error create_preference: {exc}")
            return jsonify({"msg": "No se pudo crear la preferencia de pago"}), 500


    @app.route("/api/payments/mp/webhook", methods=["POST", "GET"])
    def mp_webhook():
        """
        Webhook Mercado Pago:
        - Recibe notificación
        - Obtiene payment_id
        - Consulta el pago a /v1/payments/{id}
        - Usa external_reference = order.id para actualizar la orden
        """
        if not mp_client:
            return "", 200

        try:

            payload = request.get_json(silent=True) or {}

            event_type = payload.get("type")
            if event_type and event_type != "payment":
                return "", 200

            # MP puede mandar el id en body o por querystring
            payment_id = None

            # Formato recomendado:
            # { "data": { "id": "123" }, "type": "payment" }
            payment_id = (payload.get("data") or {}).get("id")

            # fallback: query params
            payment_id = payment_id or request.args.get("data.id") or request.args.get("id")

            if not payment_id:
                return "", 200

            payment = mp_client.payment().get(payment_id)
            payment_data = (payment.get("response") or {}) if isinstance(payment, dict) else {}

            status = payment_data.get("status")            # approved / pending / rejected...
            #status_detail = payment_data.get("status_detail")
            external_ref = payment_data.get("external_reference")  # acá viene el order.id

            if not external_ref:
                return "", 200

            order = Order.query.get(int(external_ref))
            if not order:
                return "", 200
            
            if order.status == "paid" and order.payment_txid == f"MP_PAY:{payment_id}":
                 return "", 200

            # Mapear a tu status interno
            if status == "approved":
                order.status = "paid"
                # ✅ descontar stock ahora (pago confirmado)
                agotados = []
                for it in (order.items or []):
                    product = Product.query.get(it.product_id)
                    if not product:
                        continue

                    prev_stock = int(product.stock or 0)
                    product.stock = max(0, prev_stock - int(it.quantity or 0))

                    if prev_stock > 0 and product.stock == 0:
                        agotados.append(product)

                # ✅ mails post-pago
                try:
                    send_admin_order_paid_email(order)
                except Exception as e:
                    app.logger.exception(f"[MAIL] Error mail admin pago aprobado: {e}")

                try:
                    # mail comprador “pago aprobado”
                    send_buyer_order_email(order, order.items, mode="mp_paid")
                except Exception as e:
                    app.logger.exception(f"[MAIL] Error mail comprador mp_paid: {e}")

                if agotados:
                    try:
                        for p in agotados:
                            send_admin_product_out_of_stock_email(p)
                    except Exception as e:
                        app.logger.exception(f"[MAIL] Error mail stock agotado: {e}")

            elif status in ("pending", "in_process"):
                order.status = "pending"
            else:
                order.status = "cancelled"

            order.payment_txid = f"MP_PAY:{payment_id}"

            # Si es tarjeta, a veces hay info en payment_method_id / card
            order.payment_brand = payment_data.get("payment_method_id")
            card = payment_data.get("card") or {}
            last4 = card.get("last_four_digits")
            if last4:
                order.payment_last4 = last4

            db.session.commit()

            return "", 200

        except Exception as exc:
            app.logger.exception(f"[MP] Error webhook: {exc}")
            return "", 200
        
    @app.route("/api/contact", methods=["POST"])
    @jwt_required(optional=True)
    def contact():
        # Si está logueado, podemos usar sus datos como fallback
        user = None
        user_id = get_jwt_identity()
        if user_id:
            user = User.query.get(int(user_id))

        is_multipart = request.content_type and "multipart/form-data" in request.content_type

        if is_multipart:
            name = (request.form.get("name") or (user.name if user else "") or "").strip()
            email = (request.form.get("email") or (user.email if user else "") or "").strip().lower()
            subject = (request.form.get("subject") or "").strip()
            message = (request.form.get("message") or "").strip()
            files = request.files.getlist("files")
        else:
            data = request.get_json() or {}
            name = (data.get("name") or (user.name if user else "") or "").strip()
            email = (data.get("email") or (user.email if user else "") or "").strip().lower()
            subject = (data.get("subject") or "").strip()
            message = (data.get("message") or "").strip()
            files = []

        # Validaciones mínimas
        email_re = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
        if not name:
            return jsonify({"msg": "El nombre es obligatorio"}), 400
        if not email or not email_re.match(email):
            return jsonify({"msg": "Email inválido"}), 400
        if not subject:
            return jsonify({"msg": "El asunto es obligatorio"}), 400
        if not message or len(message) < 10:
            return jsonify({"msg": "El mensaje debe tener al menos 10 caracteres"}), 400

        # ✅ Validar adjuntos (tipo + tamaño total)
        saved_files = []
        if files:
            total = _total_upload_size(files)
            max_bytes = MAX_UPLOAD_MB * 1024 * 1024
            if total > max_bytes:
                return jsonify({"msg": f"Adjuntos demasiado grandes (max {MAX_UPLOAD_MB}MB)"}), 400

            for f in files:
                if not f or not f.filename:
                    continue
                mt = (f.mimetype or "").lower()
                if mt not in ALLOWED_MIME:
                    return jsonify({"msg": "Tipo de archivo no permitido (solo imágenes o PDF)"}), 400

            # Guardar
            for f in files:
                if not f or not f.filename:
                    continue

                filename = secure_filename(f.filename)
                base, ext = os.path.splitext(filename)
                final_path = os.path.join(UPLOAD_FOLDER, filename)

                i = 1
                while os.path.exists(final_path):
                    final_path = os.path.join(UPLOAD_FOLDER, f"{base}_{i}{ext}")
                    i += 1

                f.save(final_path)
                saved_files.append(final_path)

        ok_admin = send_contact_message_to_admin(name, email, subject, message, attachments=saved_files)
        if not ok_admin:
            return jsonify({"msg": "No se pudo enviar el mensaje (config mail)"}), 500

        # Autoreply (si falla no rompemos)
        try:
            send_contact_autoreply(email, name)
        except Exception as ex:
            app.logger.exception(f"[MAIL] Error autoreply contacto: {ex!r}")

        return jsonify({"ok": True}), 200
    
    @app.route("/api/checkout/validate", methods=["POST"])
    @jwt_required()
    def validate_checkout():
        """
        Valida carrito contra el servidor para permitir entrar al checkout.
        Body:
        { "items": [ { "productId": 1, "quantity": 2 }, ... ] }
        """
        data = request.get_json() or {}
        items = data.get("items") or []

        if not items:
            return jsonify({"msg": "Carrito vacío"}), 400

        validated_items = []
        total_amount = 0

        for item in items:
            product_id = item.get("productId")
            quantity = int(item.get("quantity", 1))

            if not product_id:
                return jsonify({"msg": "Cada ítem debe tener productId"}), 400
            if quantity <= 0:
                return jsonify({"msg": "Cantidad inválida"}), 400

            product = Product.query.get(product_id)
            if not product:
                return jsonify({"msg": f"Producto no encontrado (id={product_id})"}), 404

            if product.stock is not None and quantity > int(product.stock):
                return jsonify({"msg": f"Sin stock suficiente para '{product.name}'"}), 409

            unit_price = int(product.price)
            subtotal = unit_price * quantity
            total_amount += subtotal

            validated_items.append({
                "productId": product.id,
                "name": product.name,
                "unitPrice": unit_price,
                "quantity": quantity,
                "subtotal": subtotal,
                "stock": product.stock,
            })

        return jsonify({
            "ok": True,
            "items": validated_items,
            "totalAmount": total_amount
        })
    
    @app.route("/api/checkout/success/<int:order_id>", methods=["GET"])
    @jwt_required()
    def checkout_success_guard(order_id):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        order = Order.query.get_or_404(order_id)

        is_admin = (get_jwt().get("role") == "admin")
        if not is_admin and order.email != user.email:
            return jsonify({"msg": "No autorizado"}), 403

        if order.status != "paid":
            return jsonify({"msg": "La orden aún no está pagada"}), 409

        return jsonify({"ok": True, "order": order.to_dict()})
    
    def _require_user_id():
        user_id = get_jwt_identity()
        if not user_id:
            return None
        return int(user_id)

    @app.route("/api/addresses", methods=["GET"])
    @jwt_required()
    def list_addresses():
        user_id = _require_user_id()
        rows = Address.query.filter_by(user_id=user_id).order_by(Address.is_default.desc(), Address.id.desc()).all()
        return jsonify([a.to_dict() for a in rows]), 200


    @app.route("/api/addresses", methods=["POST"])
    @jwt_required()
    def create_address():
        user_id = _require_user_id()
        data = request.get_json() or {}

        label = (data.get("label") or "").strip()
        street = (data.get("street") or "").strip()
        city = (data.get("city") or "").strip()
        province = (data.get("province") or "").strip()

        if not label or not street or not city or not province:
            return jsonify({"msg": "Completá label, calle, ciudad y provincia."}), 400

        is_default = bool(data.get("isDefault"))
        if is_default:
            # ✅ nunca 2 predeterminadas
            Address.query.filter_by(user_id=user_id, is_default=True).update({"is_default": False})

        addr = Address(
            user_id=user_id,
            label=label,
            street=street,
            city=city,
            province=province,
            postal_code=(data.get("postalCode") or "").strip() or None,
            type=(data.get("type") or "house"),
            apartment=(data.get("apartment") or "").strip() or None,
            floor=(data.get("floor") or "").strip() or None,
            bell=(data.get("bell") or "").strip() or None,
            notes=(data.get("notes") or "").strip() or None,
            is_default=is_default,
        )

        db.session.add(addr)
        db.session.commit()
        return jsonify(addr.to_dict()), 201


    @app.route("/api/addresses/<int:address_id>", methods=["PUT"])
    @jwt_required()
    def update_address(address_id):
        user_id = _require_user_id()
        addr = Address.query.filter_by(id=address_id, user_id=user_id).first()
        if not addr:
            return jsonify({"msg": "Dirección no encontrada"}), 404

        data = request.get_json() or {}

        # campos editables
        def _s(v): return (v or "").strip()

        if "label" in data: addr.label = _s(data.get("label"))
        if "street" in data: addr.street = _s(data.get("street"))
        if "city" in data: addr.city = _s(data.get("city"))
        if "province" in data: addr.province = _s(data.get("province"))
        if "postalCode" in data: addr.postal_code = _s(data.get("postalCode")) or None

        if "type" in data: addr.type = data.get("type") or "house"
        if "apartment" in data: addr.apartment = _s(data.get("apartment")) or None
        if "floor" in data: addr.floor = _s(data.get("floor")) or None
        if "bell" in data: addr.bell = _s(data.get("bell")) or None
        if "notes" in data: addr.notes = _s(data.get("notes")) or None

        if "isDefault" in data:
            make_default = bool(data.get("isDefault"))
            if make_default:
                Address.query.filter_by(user_id=user_id, is_default=True).update({"is_default": False})
                addr.is_default = True
            else:
                # permitir desmarcar, pero si desmarca la predeterminada y no hay otra,
                # queda sin predeterminada (ok).
                addr.is_default = False

        db.session.commit()
        return jsonify(addr.to_dict()), 200


    @app.route("/api/addresses/<int:address_id>", methods=["DELETE"])
    @jwt_required()
    def delete_address(address_id):
        user_id = _require_user_id()
        addr = Address.query.filter_by(id=address_id, user_id=user_id).first()
        if not addr:
            return jsonify({"msg": "Dirección no encontrada"}), 404

        db.session.delete(addr)
        db.session.commit()
        return jsonify({"ok": True}), 200


    @app.route("/api/addresses/<int:address_id>/default", methods=["POST"])
    @jwt_required()
    def set_default_address(address_id):
        user_id = _require_user_id()
        addr = Address.query.filter_by(id=address_id, user_id=user_id).first()
        if not addr:
            return jsonify({"msg": "Dirección no encontrada"}), 404

        # ✅ único default
        Address.query.filter_by(user_id=user_id, is_default=True).update({"is_default": False})
        addr.is_default = True

        db.session.commit()
        return jsonify(addr.to_dict()), 200

    # -------- AUTH --------

    _EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    def _claims_for(user: User) -> dict:
        return {"role": user.role, "email": user.email}

    # def _create_tokens_for(user: User) -> dict:
    #     claims = _claims_for(user)
    #     return {
    #         "access_token": create_access_token(identity=str(user.id), additional_claims=claims),
    #         "refresh_token": create_refresh_token(identity=str(user.id), additional_claims=claims),
    #     }

    @app.route("/api/auth/register", methods=["POST"])
    def register():
        try:
            data = request.get_json() or {}
            name = (data.get("name") or "").strip()
            email = (data.get("email") or "").strip().lower()
            password = data.get("password") or ""

            if not name:
                return jsonify({"msg": "El nombre es obligatorio"}), 400
            if not email or not _EMAIL_RE.match(email):
                return jsonify({"msg": "Email inválido"}), 400
            if not password or len(password) < 8:
                return jsonify({"msg": "La contraseña debe tener al menos 8 caracteres"}), 400

            if User.query.filter_by(email=email).first():
                return jsonify({"msg": "Ya existe un usuario con ese email"}), 409
            
            base = email.split("@")[0].lower().strip()
            base = re.sub(r"[^a-z0-9._-]", "", base)
            username = base
            i = 2
            while User.query.filter_by(username=username).first():
                username = f"{base}{i}"
                i += 1

            user = User(name=name, email=email, role="user", username=username)
            user.set_password(password)

            db.session.add(user)
            db.session.commit()

            # ✅ generar CÓDIGO + enviar mail de verificación
            code = f"{secrets.randbelow(1000000):06d}"  # 000000 - 999999

            user.email_verified = False
            user.email_verify_code_hash = generate_password_hash(code)
            user.email_verify_code_sent_at = datetime.utcnow()
            db.session.commit()

            try:
                send_verify_code_email(user.email, code, user.name)  # <- email_utils.py
            except Exception as e:
                app.logger.exception(f"[MAIL] Error enviando verificación: {e}")

            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=_claims_for(user),
            )
            refresh_token = create_refresh_token(
                identity=str(user.id),
                additional_claims=_claims_for(user),
            )

            resp = jsonify({"user": user.to_dict()})
            set_access_cookies(resp, access_token)
            set_refresh_cookies(resp, refresh_token)

            return resp, 201

        except Exception as exc:
            app.logger.exception(f"Error inesperado en /api/auth/register: {exc}")
            db.session.rollback()
            return jsonify({"msg": "Error interno al registrar"}), 500

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        try:
            data = request.get_json() or {}
            email = (data.get("email") or "").strip().lower()
            password = data.get("password") or ""

            if not email or not password:
                return jsonify({"msg": "Email y contraseña son obligatorios"}), 400

            user = User.query.filter_by(email=email).first()

            if not user:
                return jsonify({
                    "code": "EMAIL_NOT_FOUND",
                    "msg": "Ese email no está registrado."
                }), 404

            if not user.check_password(password):
                return jsonify({
                    "code": "INVALID_PASSWORD",
                    "msg": "Contraseña incorrecta."
                }), 401

            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=_claims_for(user),
            )
            refresh_token = create_refresh_token(
                identity=str(user.id),
                additional_claims=_claims_for(user),
            )

            resp = jsonify({"user": user.to_dict()})
            set_access_cookies(resp, access_token)
            set_refresh_cookies(resp, refresh_token)

            return resp, 200

        except Exception as exc:
            app.logger.exception(f"Error inesperado en /api/auth/login: {exc}")
            return jsonify({"msg": "Error interno al iniciar sesión"}), 500
        
    @app.route("/api/auth/logout", methods=["POST"])
    def logout():
        resp = jsonify({"msg": "logout ok"})
        unset_jwt_cookies(resp)
        return resp, 200

    @app.route("/api/auth/me", methods=["GET"])
    @jwt_required()
    def me():
        """Devuelve el usuario logueado (para persistir sesión en el front)."""
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        return jsonify({"user": user.to_dict()})
    
    @app.route("/api/auth/send-verify-email", methods=["POST"])
    @jwt_required()
    def send_verify_email_endpoint():
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        if user.email_verified:
            return jsonify({"ok": True, "msg": "Ya está verificado"}), 200

        token = secrets.token_urlsafe(32)
        user.email_verify_token = token
        user.email_verify_sent_at = datetime.utcnow()
        db.session.commit()

        frontend_base = os.getenv("FRONTEND_URL", "http://localhost:5173")
        verify_url = f"{frontend_base}/verify-email?token={token}"

        try:
            send_verify_code_email(user.email, verify_url, user.name)
        except Exception as e:
            app.logger.exception(f"[MAIL] Error enviando verificación: {e}")
            return jsonify({"msg": "No se pudo enviar el mail"}), 500

        return jsonify({"ok": True}), 200
    
    @app.route("/api/auth/verify-email", methods=["POST"])
    @jwt_required()
    def verify_email():
        data = request.get_json() or {}
        code = (data.get("code") or "").strip()

        if not code or len(code) != 6 or not code.isdigit():
            return jsonify({"msg": "Código inválido"}), 400

        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        if user.email_verified:
            return jsonify({"ok": True, "already": True}), 200

        if not user.email_verify_code_hash:
            return jsonify({"msg": "No hay un código activo. Pedí reenviar."}), 400

        # ✅ ACA está la magia:
        ok = check_password_hash(user.email_verify_code_hash, code)
        if not ok:
            return jsonify({"msg": "Código incorrecto"}), 400

        # ✅ marcar verificado y borrar hash (ya no se necesita)
        user.email_verified = True
        user.email_verify_code_hash = None
        user.email_verify_sent_at = None
        db.session.commit()

        return jsonify({"ok": True}), 200
    
    @app.route("/api/auth/resend-verify", methods=["POST"])
    @jwt_required()
    def resend_verify():
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        if user.email_verified:
            return jsonify({"ok": True, "already": True}), 200

        code = f"{secrets.randbelow(1_000_000):06d}"
        user.email_verify_code_hash = generate_password_hash(code)
        user.email_verify_sent_at = datetime.utcnow()
        db.session.commit()

        try:
            send_verify_code_email(user.email, code, user.name)
        except Exception as e:
            app.logger.exception(f"[MAIL] Error enviando verificación: {e}")

        return jsonify({"ok": True}), 200

    @app.route("/api/auth/refresh", methods=["POST"])
    @jwt_required(refresh=True)
    def refresh():
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=_claims_for(user),
        )

        resp = jsonify({"ok": True})
        set_access_cookies(resp, access_token)
        return resp, 200


    @app.route("/api/auth/role", methods=["GET"])
    @jwt_required()
    def role():
        user_id = get_jwt_identity()
        user = db.session.get(User, int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        return jsonify({"role": user.role}), 200
    
    @app.route("/api/auth/forgot-password", methods=["POST"])
    def forgot_password():
        try:
            data = request.get_json() or {}
            email = (data.get("email") or "").strip().lower()

            if not email:
                return jsonify({"msg": "Email es obligatorio"}), 400

            user = User.query.filter_by(email=email).first()

            # ✅ respuesta genérica para no filtrar si existe o no
            if not user:
                return jsonify({"ok": True}), 200

            s = _get_reset_serializer(app)
            token = s.dumps({"uid": user.id, "email": user.email})

            front = os.getenv("FRONT_URL") or os.getenv("FRONTEND_URL") or "http://localhost:5173"
            reset_url = f"{front}/reset-password?token={token}"

            try:
                # 👇 agregá este import arriba con tus otros imports de email_utils
                # send_password_reset_email
                send_password_reset_email(user.email, user.name, reset_url)
            except Exception as e:
                app.logger.exception(f"[MAIL] Error password reset: {e}")
                # igual devolvemos ok (no revelamos internamente)
                return jsonify({"ok": True}), 200

            return jsonify({"ok": True}), 200

        except Exception as exc:
            app.logger.exception(f"[AUTH] forgot-password error: {exc}")
            return jsonify({"msg": "Error interno"}), 500


    @app.route("/api/auth/reset-password", methods=["POST"])
    def reset_password():
        try:
            data = request.get_json() or {}
            token = (data.get("token") or "").strip()
            new_password = data.get("password") or ""

            if not token:
                return jsonify({"msg": "Token requerido"}), 400

            if not new_password or len(new_password) < 8:
                return jsonify({"msg": "La contraseña debe tener al menos 8 caracteres"}), 400

            s = _get_reset_serializer(app)

            try:
                payload = s.loads(token, max_age=60 * 60)  # 1 hora
            except SignatureExpired:
                return jsonify({"msg": "El link expiró. Pedí uno nuevo."}), 400
            except BadSignature:
                return jsonify({"msg": "Token inválido. Pedí uno nuevo."}), 400

            uid = payload.get("uid")
            email = payload.get("email")

            user = User.query.get(int(uid)) if uid else None
            if not user or user.email != email:
                return jsonify({"msg": "Token inválido. Pedí uno nuevo."}), 400

            user.set_password(new_password)
            db.session.commit()

            return jsonify({"ok": True}), 200

        except Exception as exc:
            app.logger.exception(f"[AUTH] reset-password error: {exc}")
            db.session.rollback()
            return jsonify({"msg": "Error interno"}), 500
    
    # -------- HELPERS --------

    def role_required(*roles):
        """Decorator: requiere JWT y que el claim role esté dentro de roles."""
        def decorator(fn):
            @wraps(fn)
            @jwt_required()
            def wrapper(*args, **kwargs):
                claims = get_jwt() or {}
                if claims.get("role") not in roles:
                    return jsonify({"msg": "No autorizado"}), 403
                return fn(*args, **kwargs)
            return wrapper
        return decorator

    # Decorator específico para admin
    admin_required = role_required("admin")

    def admin_required(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt() or {}
            if claims.get("role") != "admin":
                return jsonify({"msg": "Admin requerido"}), 403
            return fn(*args, **kwargs)
        return wrapper

    # -------- RUTAS ADMIN (PROTEGIDAS) --------

    @app.route("/api/admin/products", methods=["POST"])
    @admin_required
    def admin_create_product():

        try:
            data = request.get_json() or {}
            name = data.get("name")
            slug = data.get("slug")
            price = data.get("price")
            category = data.get("category")
            image_url = data.get("imageUrl")
            is_offer = data.get("isOffer", False)
            offer_label = data.get("offerLabel")
            stock = data.get("stock", 0)
            description = data.get("description")

            if not name or not slug or price is None:
                return jsonify({"msg": "Nombre, slug y precio son obligatorios"}), 400

            if Product.query.filter_by(slug=slug).first():
                return jsonify({"msg": "Ya existe un producto con ese slug"}), 400

            product = Product(
                name=name,
                slug=slug,
                price=price,
                category=category,
                image_url=image_url,
                is_offer=is_offer,
                offer_label=offer_label,
                stock=stock,
                description=description,
            )
            db.session.add(product)
            db.session.commit()

            return jsonify(product.to_dict()), 201
        except Exception as exc:
            app.logger.exception(f"Error inesperado en POST /api/admin/products: {exc}")
            db.session.rollback()
            return jsonify({"msg": "Error interno al crear el producto"}), 500
        
    @app.route("/api/admin/products/<int:product_id>", methods=["PUT"])
    @admin_required
    def admin_update_product(product_id):

        try:
            product = Product.query.get_or_404(product_id)
            data = request.get_json() or {}
            name = data.get("name")
            slug = data.get("slug")
            price = data.get("price")
            category = data.get("category")
            image_url = data.get("imageUrl")
            is_offer = data.get("isOffer")
            offer_label = data.get("offerLabel")
            stock = data.get("stock")
            description = data.get("description")

            if name:
                product.name = name

            if slug:
                # verificar que no exista otro producto con el mismo slug
                existing = Product.query.filter_by(slug=slug).first()
                if existing and existing.id != product.id:
                    return jsonify({"msg": "Ya existe otro producto con ese slug"}), 400
                product.slug = slug

            if price is not None:
                product.price = price

            if category is not None:
                product.category = category

            if image_url is not None:
                product.image_url = image_url

            if stock is not None:
                product.stock = stock

            if description is not None:
                product.description = description

            if is_offer is not None:
                product.is_offer = bool(is_offer)
            if offer_label is not None:
                product.offer_label = offer_label

            db.session.commit()
            return jsonify(product.to_dict())
        except NotFound:
            return jsonify({"msg": "Producto no encontrado"}), 404
        except Exception as exc:
            app.logger.exception(f"Error inesperado en PUT /api/admin/products/{product_id}: {exc}")
            db.session.rollback()
            return jsonify({"msg": "Error interno al actualizar el producto"}), 500
        
    @app.route("/api/admin/products/<int:product_id>", methods=["DELETE"])
    @admin_required
    def admin_delete_product(product_id):

        try:
            product = Product.query.get_or_404(product_id)
            db.session.delete(product)
            db.session.commit()
            return jsonify({"msg": "Producto eliminado correctamente"})
        except NotFound:
            return jsonify({"msg": "Producto no encontrado"}), 404
        except Exception as exc:
            app.logger.exception(f"Error inesperado en DELETE /api/admin/products/{product_id}: {exc}")
            db.session.rollback()
            return jsonify({"msg": "Error interno al eliminar el producto"}), 500
        
    @app.route("/api/admin/orders", methods=["GET"])
    @admin_required
    def admin_list_orders():

        try:
            orders = Order.query.order_by(Order.created_at.desc()).all()
            return jsonify([o.to_dict() for o in orders])
        except Exception as exc:
            app.logger.exception(f"Error inesperado en GET /api/admin/orders: {exc}")
            return jsonify({"msg": "Error al obtener órdenes"}), 500
        
    @app.route("/api/admin/orders/<int:order_id>/status", methods=["PUT"])
    @admin_required
    def admin_update_order_status(order_id):

        try:
            data = request.get_json() or {}
            new_status = data.get("status")

            if not new_status:
                return jsonify({"msg": "El campo 'status' es obligatorio"}), 400

            # Podés ajustar estos estados como quieras
            allowed_status = {"pending", "paid", "cancelled"}
            if new_status not in allowed_status:
                return jsonify({"msg": "Estado inválido"}), 400

            order = Order.query.get_or_404(order_id)
            order.status = new_status
            db.session.commit()

            return jsonify(order.to_dict())
        except NotFound:
            return jsonify({"msg": "Orden no encontrada"}), 404
        except Exception as exc:
            app.logger.exception(
                f"Error inesperado en PUT /api/admin/orders/{order_id}/status: {exc}"
            )
            db.session.rollback()
            return jsonify({"msg": "Error interno al actualizar estado de la orden"}), 500
        
    @app.route("/api/admin/users", methods=["GET"])
    @admin_required
    def admin_list_users():
        users = User.query.order_by(User.id.desc()).all()
        return jsonify({"users": [u.to_dict() for u in users]}), 200

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
