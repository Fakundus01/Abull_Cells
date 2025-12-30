# app.py
from flask import Flask, jsonify, request
import re
import mercadopago # type: ignore
import os
from functools import wraps
from flask_cors import CORS
from flask_jwt_extended import ( # type: ignore
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)

from dotenv import load_dotenv
from werkzeug.exceptions import NotFound  # arriba, con los imports
from config import Config
from models import db, Product, User, Order, OrderItem
from email_utils import send_contact_message_to_admin, send_contact_autoreply, send_order_confirmation_email

load_dotenv()  # 👈 carga las variables desde .env


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

    jwt = JWTManager(app)

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
        "items": [ { "productId": 1, "quantity": 2 }, ... ]
        }
        """
        try:
            data = request.get_json() or {}
            user_id = get_jwt_identity()
            user = User.query.get(int(user_id)) if user_id else None
            if not user:
                return jsonify({"msg": "Usuario no encontrado"}), 404

            customer = data.get("customer") or {}
            items = data.get("items") or []
            payment_method = "mercadopago"
            valid_methods = ["efectivo","mercadopago"]

            if payment_method not in valid_methods:
                print(f"[ORDER] Método de pago inválido recibido: {payment_method}")
                return jsonify({"msg": "Método de pago inválido"}), 400
            
            status = "pending"
            payment_brand = None
            payment_last4 = None
            payment_txid = None

            if not mp_client:
                return jsonify({"msg": "Mercado Pago no está configurado"}), 500

            elif payment_method == "mercadopago":
                status = "pending"

            # Validaciones básicas  
            if not items:
                return jsonify({"msg": "La orden no tiene ítems"}), 400

            # Calcular totales en el servidor
            total_amount = 0
            order_items = []

            for item in items:
                    product_id = item.get("productId")
                    quantity = int(item.get("quantity", 1))

                    if not product_id:
                        return jsonify({"msg": "Cada ítem debe tener productId"}), 400

                    product = Product.query.get(product_id)
                    if not product:
                        return jsonify({"msg": f"Producto no encontrado (id={product_id})"}), 404

                    if quantity <= 0:
                        return jsonify({"msg": "Cantidad inválida"}), 400

                    # Validar stock (opcional pero recomendado)
                    if product.stock is not None and quantity > int(product.stock):
                        return jsonify({"msg": f"Sin stock suficiente para '{product.name}'"}), 409

                    price = int(product.price)
                    subtotal = price * quantity
                    total_amount += subtotal

                    order_items.append(
                        {
                            "product_id": product.id,
                            "product_name": product.name,
                            "unit_price": price,
                            "quantity": quantity,
                            "subtotal": subtotal,
                        }
                    )

            order = Order(
                customer_name=user.name,
                email=user.email,
                phone=customer.get("phone"),              
                notes=customer.get("notes"),
                payment_method=payment_method,
                total_amount=total_amount,
                status=status,
                payment_brand=payment_brand,
                payment_last4=payment_last4,
                payment_txid=payment_txid,
            )

            db.session.add(order)
            db.session.flush()  # para tener order.id

            for oi in order_items:
                item = OrderItem(
                    order_id=order.id,
                    product_id=oi["product_id"],
                    product_name=oi["product_name"],
                    unit_price=oi["unit_price"],
                    quantity=oi["quantity"],
                    subtotal=oi["subtotal"],
                )
                db.session.add(item)

            db.session.commit()    

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
        """
        Crea una preferencia de pago de Mercado Pago para una orden ya creada.
        Espera:
        {
        "orderId": 123,
        "items": [
            { "name": "...", "quantity": 1, "price": 10000 }
        ]
        }
        """
        if not mp_client:
            print("[MP] Intento de crear preferencia sin mp_client inicializado.")
            return jsonify({"msg": "Mercado Pago no está configurado"}), 500

        try:
            data = request.get_json() or {}
            print(f"[MP] /create_preference - payload recibido: {data}")

            user_id = get_jwt_identity()
            user = User.query.get(int(user_id)) if user_id else None
            if not user:
                return jsonify({"msg": "Usuario no encontrado"}), 404

            order_id = data.get("orderId")
            if not order_id:
                return jsonify({"msg": "Falta orderId"}), 400

            order = Order.query.get(order_id)
            if not order:
                return jsonify({"msg": "Orden no encontrada"}), 404

            is_admin = (get_jwt().get("role") == "admin")
            if not is_admin and order.email != user.email:
                return jsonify({"msg": "No tenés permiso para pagar esta orden"}), 403

            if order.payment_method != "mercadopago":
                return jsonify({"msg": "La orden no es de Mercado Pago"}), 400

            if not order.items:
                return jsonify({"msg": "La orden no tiene ítems"}), 400
            
            # ✅ Estado válido para generar preferencia
            if order.status != "pending":
                return jsonify({"msg": f"No se puede pagar una orden con estado '{order.status}'"}), 409
            
            if order.payment_txid and str(order.payment_txid).startswith("MP_PREF:"):
                return jsonify({"msg": "La preferencia ya fue creada para esta orden"}), 409

            mp_items = []
            for it in order.items:
                mp_items.append(
                    {
                        "title": it.product_name,
                        "quantity": int(it.quantity),
                        "currency_id": "ARS",
                        "unit_price": float(it.unit_price),
                    }
                )

            success_url = os.getenv("MP_SUCCESS_URL")
            failure_url = os.getenv("MP_FAILURE_URL")
            pending_url = os.getenv("MP_PENDING_URL")

            preference_data = {
            "items": mp_items,
            "external_reference": str(order.id),
            }

            back_urls = {}
            if success_url:
                back_urls["success"] = success_url
            if failure_url:
                back_urls["failure"] = failure_url
            if pending_url:
                back_urls["pending"] = pending_url

            if back_urls:
                preference_data["back_urls"] = back_urls

            print(f"[MP] preference_data armado: {preference_data}")

            preference = mp_client.preference().create(preference_data)
            print(f"[MP] Respuesta bruta de MP: {preference}")

            pref_response = preference.get("response", {})
            print(f"[MP] response interno de MP: {pref_response}")

            print(f"[MP] Respuesta bruta de MP: {preference}")
            print(f"[MP] response interno de MP: {pref_response}")

            # 👇 En test, muchas veces viene sandbox_init_point
            init_point = (
                pref_response.get("init_point")
                or pref_response.get("sandbox_init_point")
            )
            pref_id = pref_response.get("id")

            if not init_point:
                print("[MP] No se recibió ni init_point ni sandbox_init_point en la respuesta de MP.")
                return jsonify({"msg": "No se pudo crear la preferencia de pago"}), 500

            # opcional: guardar id de preferencia en la orden
            order.payment_method = "mercadopago"
            order.payment_txid = f"MP_PREF:{pref_id}"
            db.session.commit()
            print(
                f"[MP] Preferencia creada OK. preference_id={pref_id}, init_point={init_point}"
            )

            return jsonify(
                {
                    "initPoint": init_point,
                    "preferenceId": pref_id,
                }
            )
        except Exception as exc:
            print("========== EXCEPCION EN create_mp_preference ==========")
            print("Tipo:", type(exc))
            print("Detalle:", repr(exc))
            app.logger.exception(f"Error al crear preferencia MP: {exc}")
            print("========== FIN EXCEPCION create_mp_preference ==========")
            return jsonify({"msg": "Error al crear preferencia de pago"}), 500


    @app.route("/api/payments/mp/webhook", methods=["POST"])
    def mp_webhook():
        if not mp_client:
            print("[MP] Webhook recibido pero mp_client no está configurado.")
            return "MP not configured", 500

        topic = request.args.get("topic") or request.args.get("type")
        payment_id = request.args.get("id") or request.args.get("data.id")
        order.payment_txid = f"MP_PAY:{payment_id}"

        print(f"[MP] Webhook recibido. topic={topic}, payment_id={payment_id}")
        print(f"[MP] request.args = {dict(request.args)}")
        try:
            body_json = request.get_json(silent=True) or {}
            if not payment_id:
                payment_id = (
                    (body_json.get("data") or {}).get("id")
                    or body_json.get("id")
                )
            print(f"[MP] request.json = {body_json}")
        except Exception:
            body_json = {}
            print("[MP] No se pudo parsear request.json del webhook.")

        try:
            if topic == "payment" and payment_id:
                payment = mp_client.payment().get(payment_id)
                resp = payment.get("response", {})
                print(f"[MP] Detalle de pago desde MP: {resp}")

                status = resp.get("status")
                external_reference = resp.get("external_reference")

                print(
                    f"[MP] Pago status={status}, external_reference={external_reference}"
                )

                if external_reference:
                    order = Order.query.get(int(external_reference))
                    if order:
                        previous_status = order.status

                        if status == "approved":
                            order.status = "paid"
                        elif status in ("rejected", "cancelled"):
                            order.status = "cancelled"
                        else:
                            order.status = status or order.status

                        order.payment_txid = f"MP_PAY:{payment_id}"
                        db.session.commit()

                        if previous_status != "paid" and order.status == "paid":
                            try:
                                send_order_confirmation_email(order)  # cliente (y CC admin si tenés EMAIL_ADMIN)
                            except Exception as ex:
                                app.logger.exception(f"[MAIL] Error enviando mail cliente orden pagada: {ex!r}")

                            try:
                                # si agregaste la función nueva:
                                from email_utils import send_admin_order_paid_email
                                send_admin_order_paid_email(order)
                            except Exception as ex:
                                app.logger.exception(f"[MAIL] Error enviando aviso admin orden pagada: {ex!r}")   

                        print(f"[MP] Orden {order.id} actualizada a status='{order.status}'.")

                    else:
                        print(f"[MP] No se encontró la orden con id={external_reference} para actualizar.")

            return "OK", 200
        except Exception as exc:
            print("========== EXCEPCION EN mp_webhook ==========")
            print("Tipo:", type(exc))
            print("Detalle:", repr(exc))
            app.logger.exception(f"Error en webhook MP: {exc}")
            print("========== FIN EXCEPCION mp_webhook ==========")
            return "ERROR", 500
        
    @app.route("/api/contact", methods=["POST"])
    @jwt_required(optional=True)
    def contact():
        data = request.get_json() or {}

        # Si está logueado, podemos usar sus datos como fallback
        user = None
        user_id = get_jwt_identity()
        if user_id:
            user = User.query.get(int(user_id))

        name = (data.get("name") or (user.name if user else "") or "").strip()
        email = (data.get("email") or (user.email if user else "") or "").strip().lower()
        subject = (data.get("subject") or "").strip()
        message = (data.get("message") or "").strip()

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

        ok_admin = send_contact_message_to_admin(name, email, subject, message)
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

    # -------- AUTH --------

    _EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

    def _claims_for(user: User) -> dict:
        return {"role": user.role, "name": user.name}

    def _create_tokens_for(user: User) -> dict:
        claims = _claims_for(user)
        return {
            "access_token": create_access_token(identity=str(user.id), additional_claims=claims),
            "refresh_token": create_refresh_token(identity=str(user.id), additional_claims=claims),
        }

    @app.route("/api/auth/register", methods=["POST"])
    def register():
        """Registro simple (rol fijo: customer)."""
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

            user = User(name=name, email=email, role="customer")
            user.set_password(password)

            db.session.add(user)
            db.session.commit()

            tokens = _create_tokens_for(user)
            return jsonify({**tokens, "user": user.to_dict()}), 201
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
            if not user or not user.check_password(password):
                return jsonify({"msg": "Credenciales inválidas"}), 401

            tokens = _create_tokens_for(user)
            return jsonify({**tokens, "user": user.to_dict()})
        except Exception as exc:
            app.logger.exception(f"Error inesperado en /api/auth/login: {exc}")
            return jsonify({"msg": "Error interno al iniciar sesión"}), 500

    @app.route("/api/auth/me", methods=["GET"])
    @jwt_required()
    def me():
        """Devuelve el usuario logueado (para persistir sesión en el front)."""
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        return jsonify({"user": user.to_dict()})

    @app.route("/api/auth/refresh", methods=["POST"])
    @jwt_required(refresh=True)
    def refresh():
        """Entrega un nuevo access_token usando refresh_token."""
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=_claims_for(user),
        )
        return jsonify({"access_token": access_token})

    # -------- HELPERS --------

    def role_required(*roles):
        """Decorator: requiere JWT y que el claim role esté dentro de roles."""
        def decorator(fn):
            @wraps(fn)
            @jwt_required()
            def wrapper(*args, **kwargs):
                claims = get_jwt()
                if claims.get("role") not in roles:
                    return jsonify({"msg": "No autorizado"}), 403
                return fn(*args, **kwargs)
            return wrapper
        return decorator

    # Decorator específico para admin
    admin_required = role_required("admin")

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

    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
