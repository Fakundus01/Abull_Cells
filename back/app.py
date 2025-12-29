# app.py
from flask import Flask, jsonify, request
import random
import mercadopago
import os
import string
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt,
    get_jwt_identity,
)

from dotenv import load_dotenv
from werkzeug.exceptions import NotFound  # arriba, con los imports
from config import Config
from models import db, Product, User, Order, OrderItem
from email_utils import send_order_confirmation_email  # 👈 NUEVO

load_dotenv()  # 👈 carga las variables desde .env


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

    jwt = JWTManager(app)
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
    def create_order():
        """
        Crea una orden a partir del carrito y los datos del cliente.
        Body esperado:
        {
          "customer": { ... },
          "items": [ ... ],
          "paymentMethod": "tarjeta" | "efectivo" | "transferencia"
        }
        """
        try:
            data = request.get_json() or {}
            customer = data.get("customer") or {}
            items = data.get("items") or []
            payment_method = data.get("paymentMethod") or "tarjeta"
            valid_methods = ["tarjeta", "efectivo", "transferencia", "mercadopago"]

            if payment_method not in valid_methods:
                print(f"[ORDER] Método de pago inválido recibido: {payment_method}")
                return jsonify({"msg": "Método de pago inválido"}), 400
            
            payment_result = data.get("paymentResult") or {}
            status = "pending"
            payment_brand = None
            payment_last4 = None
            payment_txid = None

            if payment_method == "tarjeta":
                if payment_result.get("status") == "approved":
                    status = "paid"
                    payment_brand = payment_result.get("brand")
                    payment_last4 = payment_result.get("last4")
                    payment_txid = payment_result.get("transactionId")
                else:
                    # si vino tarjeta pero sin approved, la dejamos pendiente
                    status = "pending"

            elif payment_method == "mercadopago":
                status = "pending"

            # Validaciones básicas
            required_fields = ["name", "email", "address", "city", "province", "postalCode"]    
            missing = [f for f in required_fields if not customer.get(f)]
            if missing:
                return jsonify({"msg": f"Faltan campos obligatorios: {', '.join(missing)}"}), 400

            if not items:
                return jsonify({"msg": "La orden no tiene ítems"}), 400

            # Calcular totales en el servidor
            total_amount = 0
            order_items = []

            for item in items:
                product_id = item.get("productId")
                name = item.get("name")
                price = item.get("price")
                quantity = item.get("quantity", 1)

                if not name or price is None:
                    return jsonify({"msg": "Cada ítem debe tener nombre y precio"}), 400

                quantity = int(quantity)
                price = int(price)
                subtotal = price * quantity
                total_amount += subtotal

                order_items.append(
                    {
                        "product_id": product_id,
                        "product_name": name,
                        "unit_price": price,
                        "quantity": quantity,
                        "subtotal": subtotal,
                    }
                )

            order = Order(
                customer_name=customer["name"],
                email=customer["email"],
                phone=customer.get("phone"),
                address=customer["address"],
                city=customer["city"],
                province=customer["province"],
                postal_code=customer["postalCode"],
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

             # Intentamos enviar el correo de confirmación.
            # Si falla, NO afectamos el resultado de la API.
            # 🔍 DEBUG DEL MAIL
            try:
                print("[MAIL] Voy a intentar enviar email de prueba...")
                resultado = send_order_confirmation_email(order)
                print(f"[MAIL] Resultado de send_order_confirmation_email: {resultado}")
            except Exception as ex:
                # Logs bien detallados
                print("========= EXCEPCION EN ENVIO DE MAIL =========")
                print("Tipo:", type(ex))
                print("Args:", ex.args)
                print("Repr:", repr(ex))
                app.logger.exception(
                    f"[MAIL] Excepcion cruda al enviar email: {ex!r}"
                )
                print("========= FIN EXCEPCION EN ENVIO DE MAIL =========")
                # Opcional: comentar el raise si queres que NO rompa el flujo
                raise

            return jsonify(order.to_dict()), 201
        except Exception as exc:
            app.logger.exception(f"Error inesperado en POST /api/orders: {exc}")
            db.session.rollback()
            return jsonify({"msg": "Error interno al crear la orden"}), 500

    @app.route("/api/payments/mock-charge", methods=["POST"])
    def mock_charge():
        """
        Simula un cobro con tarjeta.
        NO hace un cobro real, solo devuelve aprobado/rechazado.
        Regla: si la tarjeta termina en 0000 => rechazado.
        """
        data = request.get_json() or {}
        amount = data.get("amount")
        card = data.get("card") or {}

        card_number = (card.get("number") or "").replace(" ", "")
        exp_month = card.get("expMonth")
        exp_year = card.get("expYear")
        cvc = card.get("cvc")

        if not amount or amount <= 0:
            return jsonify({"msg": "Monto inválido"}), 400

        if not card_number or not exp_month or not exp_year or not cvc:
            return jsonify({"msg": "Datos de tarjeta incompletos"}), 400

        # Regla tonta para simular rechazo
        if card_number.endswith("0000"):
            return jsonify(
                {
                    "status": "declined",
                    "msg": "La tarjeta fue rechazada (simulado). Usa otra tarjeta de prueba.",
                }
            ), 402

        # Detección simple de marca
        brand = "Desconocida"
        if card_number.startswith("4"):
            brand = "Visa"
        elif card_number.startswith("5"):
            brand = "Mastercard"
        elif card_number.startswith("3"):
            brand = "Amex"

        last4 = card_number[-4:]

        txid = "TEST-" + "".join(
            random.choices(string.ascii_uppercase + string.digits, k=10)
        )

        return jsonify(
            {
                "status": "approved",
                "transactionId": txid,
                "brand": brand,
                "last4": last4,
            }
        )

    @app.route("/api/payments/mp/create_preference", methods=["POST"])
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

            order_id = data.get("orderId")
            items = data.get("items") or []

            if not order_id:
                print("[MP] Falla: falta orderId en el payload.")
                return jsonify({"msg": "Falta orderId"}), 400
            if not items:
                print("[MP] Falla: la lista de items viene vacía.")
                return jsonify({"msg": "La orden no tiene ítems"}), 400

            order = Order.query.get(order_id)
            if not order:
                print(f"[MP] Falla: no se encontró la orden con id={order_id}.")
                return jsonify({"msg": "Orden no encontrada"}), 404

            mp_items = []
            for it in items:
                name = it.get("name")
                qty = it.get("quantity", 1)
                price = it.get("price")

                if not name or price is None:
                    print(f"[MP] Falla: ítem inválido: {it}")
                    return jsonify({"msg": "Cada ítem debe tener nombre y precio"}), 400

                mp_items.append(
                    {
                        "title": name,
                        "quantity": int(qty),
                        "currency_id": "ARS",
                        "unit_price": float(price),
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
            order.payment_txid = pref_id
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

        print(f"[MP] Webhook recibido. topic={topic}, payment_id={payment_id}")
        print(f"[MP] request.args = {dict(request.args)}")
        try:
            body_json = request.get_json(silent=True) or {}
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
                        if status == "approved":
                            order.status = "paid"
                        elif status in ("rejected", "cancelled"):
                            order.status = "cancelled"
                        else:
                            order.status = status or order.status

                        db.session.commit()
                        print(
                            f"[MP] Orden {order.id} actualizada a status='{order.status}'."
                        )
                    else:
                        print(
                            f"[MP] No se encontró la orden con id={external_reference} para actualizar."
                        )

            return "OK", 200
        except Exception as exc:
            print("========== EXCEPCION EN mp_webhook ==========")
            print("Tipo:", type(exc))
            print("Detalle:", repr(exc))
            app.logger.exception(f"Error en webhook MP: {exc}")
            print("========== FIN EXCEPCION mp_webhook ==========")
            return "ERROR", 500

    # -------- AUTH --------

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        try:
            data = request.get_json() or {}
            email = data.get("email", "").strip().lower()
            password = data.get("password", "")

            if not email or not password:
                return jsonify({"msg": "Email y contraseña son obligatorios"}), 400

            user = User.query.filter_by(email=email).first()
            if not user or not user.check_password(password):
                return jsonify({"msg": "Credenciales inválidas"}), 401

            additional_claims = {"role": user.role, "name": user.name}

            access_token = create_access_token(
                identity=str(user.id),
                additional_claims=additional_claims,
            )

            return jsonify(
                {
                    "access_token": access_token,
                    "user": user.to_dict(),
                }
            )
        except Exception as exc:
            app.logger.exception(f"Error inesperado en /api/auth/login: {exc}")
            return jsonify({"msg": "Error interno al iniciar sesión"}), 500



    # -------- HELPERS --------

    def admin_required():
        """Valida que el usuario sea admin usando los claims del JWT."""
        claims = get_jwt()
        if claims.get("role") != "admin":
            return False
        return True

    # -------- RUTAS ADMIN (PROTEGIDAS) --------

    @app.route("/api/admin/products", methods=["POST"])
    @jwt_required()
    def admin_create_product():
        if not admin_required():
            return jsonify({"msg": "Solo administradores"}), 403

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
    @jwt_required()
    def admin_update_product(product_id):
        if not admin_required():
            return jsonify({"msg": "Solo administradores"}), 403

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
    @jwt_required()
    def admin_delete_product(product_id):
        if not admin_required():
            return jsonify({"msg": "Solo administradores"}), 403

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
    @jwt_required()
    def admin_list_orders():
        if not admin_required():
            return jsonify({"msg": "Solo administradores"}), 403

        try:
            orders = Order.query.order_by(Order.created_at.desc()).all()
            return jsonify([o.to_dict() for o in orders])
        except Exception as exc:
            app.logger.exception(f"Error inesperado en GET /api/admin/orders: {exc}")
            return jsonify({"msg": "Error al obtener órdenes"}), 500
        
    @app.route("/api/admin/orders/<int:order_id>/status", methods=["PUT"])
    @jwt_required()
    def admin_update_order_status(order_id):
        if not admin_required():
            return jsonify({"msg": "Solo administradores"}), 403

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
