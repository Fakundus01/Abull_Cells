from __future__ import annotations

import json
from datetime import datetime, timedelta

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity # type: ignore
from sqlalchemy import update

from email_utils import (
    send_order_confirmation_email,
    send_admin_product_out_of_stock_email,
    send_admin_order_ticket_to_printer,
    send_buyer_order_email,
)
from helpers import get_effective_price, parse_discount_percent
from models import Order, OrderItem, Product, User, db
from services.reservation_service import release_expired_reservations


def create_order():
    """
    Crea una orden a partir del carrito del usuario logueado.
    Body esperado:
    {
    "customer": { "phone": "...", "notes": "..." },
    "items": [ { "productId": 1, "quantity": 2 }, ... ],
    "paymentMethod": "efectivo" | "transferencia_alias"
    }
    """
    try:
        data = request.get_json() or {}
        release_expired_reservations()

        user_id = get_jwt_identity()
        user = User.query.get(int(user_id)) if user_id else None
        if not user:
            return jsonify({"msg": "Usuario no encontrado"}), 404
        if not user.email_verified:
            return jsonify({"msg": "Verificá tu email para continuar"}), 403
        
        customer = data.get("customer") or {}
        items_payload = data.get("items") or []
        if not items_payload:
            return jsonify({"msg": "Carrito vacío"}), 400

        payment_method = (data.get("paymentMethod") or "").strip().lower()
        payment_aliases = {
            "mercadopago": "transferencia_alias",
            "mercado_pago": "transferencia_alias",
            "mercado pago": "transferencia_alias",
            "transferencia": "transferencia_alias",
        }
        payment_method = payment_aliases.get(payment_method, payment_method)
        
        valid_methods = ["efectivo", "transferencia_alias"]
        if payment_method not in valid_methods:
            current_app.logger.warning(
                f"[ORDER] Método de pago inválido recibido: {payment_method!r}"
            )
            return jsonify({"msg": "Método de pago inválido"}), 400

        if payment_method == "transferencia_alias":
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

        product_ids = [int(pid) for pid in merged.keys()]
        products = Product.query.filter(Product.id.in_(product_ids)).all()
        products_by_id = {product.id: product for product in products}

        missing_ids = [pid for pid in product_ids if pid not in products_by_id]
        if missing_ids:
            return jsonify({
                "msg": f"Producto no encontrado (id={missing_ids[0]})",
            }), 404

        agotados = []
        for product_id, quantity in merged.items():
            product = products_by_id[product_id]   

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

            result = db.session.execute(
                    update(Product)
                    .where(
                        Product.id == product.id,
                        Product.stock >= quantity,
                    )
                    .values(stock=Product.stock - quantity)
                    .returning(Product.stock)
                )
            row = result.fetchone()
            if row is None:
                db.session.rollback()
                return jsonify({
                    "msg": (
                        f"Sin stock suficiente para '{product.name}'. "
                        "Intentá nuevamente."
                    ),
                    "productId": product.id,
                    "requested": quantity,
                }), 409

            new_stock = int(row[0])
            if new_stock == 0:
                agotados.append(product)

        subtotal = total_amount
        total = total_amount
        promo_code = (data.get("promoCode") or "").strip().upper()
        if promo_code:
            discount_percent = parse_discount_percent(promo_code)
            if discount_percent is not None:
                total = int(subtotal * (1 - discount_percent / 100))

        delivery_method = (data.get("deliveryMethod") or "").strip().lower()
        if delivery_method not in {"pickup", "delivery"}:
            delivery_method = "pickup"
        delivery_snapshot = None
        if delivery_method == "delivery":
            delivery_snapshot = {
                "addressId": data.get("addressId"),
                "manualAddress": data.get("manualAddress"),
            }

        reservation_expires_at = None
        if payment_method == "transferencia_alias":
            reservation_minutes = int(
                current_app.config.get("ORDER_RESERVATION_MINUTES", 30)
            )
            reservation_expires_at = datetime.utcnow() + timedelta(
                minutes=reservation_minutes
            )

        order = Order(
            customer_name=(customer.get("name") or user.name),
            email=(customer.get("email") or user.email),
            phone=(customer.get("phone") or user.phone),
            status=status,
            total_amount=total,
            payment_method=payment_method,
            payment_brand=payment_brand,
            payment_last4=payment_last4,
            payment_txid=payment_txid,
            stock_reserved=payment_method == "transferencia_alias",
            reservation_expires_at=reservation_expires_at,
            notes=(customer.get("notes") or "").strip() or None,
            delivery_method=delivery_method,
            delivery_address=json.dumps(delivery_snapshot) if delivery_snapshot else None,
        )
        db.session.add(order)
        db.session.flush()

        for item in order_items:
            db.session.add(OrderItem(order_id=order.id, **item))

        db.session.commit()
        current_app.logger.info(
            "[ORDER] created order_id=%s user_id=%s payment_method=%s status=%s",
            order.id,
            user.id,
            payment_method,
            status,
        )
        
        try:
            send_order_confirmation_email(order, order.items)
        except Exception as exc:
            current_app.logger.exception(f"[MAIL] Error mail confirmación: {exc}")

        if payment_method == "efectivo":
            try:
                send_admin_order_ticket_to_printer(order, order.items, reason="cash_created")
            except Exception as exc:
                current_app.logger.exception(
                    f"[PRINT] Error imprimiendo ticket efectivo: {exc}"
                )
            try:
                send_buyer_order_email(order, order.items, mode="cash_created")
            except Exception as exc:
                current_app.logger.exception(f"[MAIL] Error mail comprador efectivo: {exc}")

            if agotados:
                try:
                    for product in agotados:
                        send_admin_product_out_of_stock_email(product)
                except Exception as exc:
                    current_app.logger.exception(f"[MAIL] Error mail stock agotado: {exc}")

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

    is_admin = user.role == "admin"
    if not is_admin and order.email != user.email:
        return jsonify({"msg": "No tenés permiso para ver esta orden"}), 403
    return jsonify(order.to_dict())