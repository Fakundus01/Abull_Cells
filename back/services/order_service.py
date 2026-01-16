from __future__ import annotations

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity # type: ignore

from email_utils import (
    send_order_confirmation_email,
)
from helpers import get_effective_price, parse_discount_percent
from models import Order, OrderItem, Product, User, db


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
            current_app.logger.warning(
                f"[ORDER] Método de pago inválido recibido: {payment_method!r}"
            )
            return jsonify({"msg": "Método de pago inválido"}), 400

        if payment_method == "mercadopago":
            if not current_app.config.get("MP_CLIENT"):
                return jsonify({"msg": "Mercado Pago no está configurado"}), 500
            status = "pending_payment"
        else:
            status = "pending"

        payment_brand = None
        payment_last4 = None
        payment_txid = None

        total_amount = 0
        order_items = []

        merged = {}
        for item in items_payload:
            product_id = item.get("productId")
            qty = int(item.get("quantity", 1))
            if not product_id:
                return jsonify({"msg": "Cada ítem debe tener productId"}), 400
            if qty <= 0:
                return jsonify({"msg": "Cantidad inválida"}), 400
            merged[product_id] = merged.get(product_id, 0) + qty

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

        subtotal = total_amount
        total = total_amount
        applied_discount_percent = None

        promo_code = (data.get("promoCode") or "").strip().upper()
        if promo_code:
            discount_percent = parse_discount_percent(promo_code)
            if discount_percent is not None:
                applied_discount_percent = discount_percent
                total = int(subtotal * (1 - discount_percent / 100))

        order = Order(
            user_id=user.id,
            name=user.name,
            email=user.email,
            phone=(customer.get("phone") or user.phone),
            status=status,
            total_amount=total,
            subtotal_amount=subtotal,
            discount_percent=applied_discount_percent,
            payment_method=payment_method,
            payment_brand=payment_brand,
            payment_last4=payment_last4,
            payment_txid=payment_txid,
            notes=(customer.get("notes") or "").strip() or None,
        )
        db.session.add(order)
        db.session.flush()

        for item in order_items:
            db.session.add(OrderItem(order_id=order.id, **item))

        db.session.commit()

        try:
            send_order_confirmation_email(order, order.items)
        except Exception as exc:
            current_app.logger.exception(f"[MAIL] Error mail confirmación: {exc}")

        return jsonify({"order": order.to_dict()}), 201

    except Exception as exc:
        current_app.logger.exception(f"Error inesperado en /api/orders: {exc}")
        db.session.rollback()
        return jsonify({"msg": "Error interno al crear la orden"}), 500


def list_my_orders():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    orders = (
        Order.query.filter(Order.email == user.email)
        .order_by(Order.created_at.desc())
        .all()
    )
    return jsonify([o.to_dict() for o in orders])


def my_order_detail(order_id: int):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    order = Order.query.get_or_404(order_id)

    is_admin = get_jwt().get("role") == "admin"
    if not is_admin and order.email != user.email:
        return jsonify({"msg": "No tenés permiso para ver esta orden"}), 403

    return jsonify(order.to_dict())