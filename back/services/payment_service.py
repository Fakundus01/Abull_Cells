from __future__ import annotations

import os

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity # type: ignore
from sqlalchemy import update

from email_utils import (
    send_admin_order_paid_email,
    send_admin_product_out_of_stock_email,
    send_buyer_order_email,
)
from models import Order, Product, User, db


def create_mp_preference():
    mp_client = current_app.config.get("MP_CLIENT")
    if not mp_client:
        return jsonify({"msg": "Mercado Pago no está configurado"}), 500

    try:
        data = request.get_json() or {}
        current_app.logger.info(f"[MP] /create_preference - payload recibido: {data}")

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

        if order.email != user.email:
            return jsonify({"msg": "No tenés permiso para pagar esta orden"}), 403

        if order.payment_method != "mercadopago":
            return jsonify({"msg": "La orden no es de Mercado Pago"}), 400

        if not order.items:
            return jsonify({"msg": "La orden no tiene ítems"}), 400

        if order.status not in ("pending_payment", "pending"):
            return jsonify({
                "msg": f"No se puede pagar una orden con estado '{order.status}'",
            }), 409

        if order.payment_txid and str(order.payment_txid).startswith("MP_PREF:"):
            return jsonify({"msg": "La preferencia ya fue creada para esta orden"}), 409

        mp_items = []
        for item in order.items:
            mp_items.append({
                "title": item.product_name,
                "quantity": int(item.quantity),
                "currency_id": "ARS",
                "unit_price": float(item.unit_price),
            })

        success_url = os.getenv("MP_SUCCESS_URL")
        failure_url = os.getenv("MP_FAILURE_URL")
        pending_url = os.getenv("MP_PENDING_URL")

        webhook_url = os.getenv("MP_WEBHOOK_URL")
        if not webhook_url:
            return jsonify({
                "msg": (
                    "Falta MP_WEBHOOK_URL (debe ser HTTPS público, ej: ngrok) "
                    "para usar webhook."
                )
            }), 500

        preference_data = {
            "external_reference": str(order.id),
            "notification_url": webhook_url,
            "items": mp_items,
        }

        back_url = {}
        if success_url:
            back_url["success"] = success_url
        if failure_url:
            back_url["failure"] = failure_url
        if pending_url:
            back_url["pending"] = pending_url
        if back_url:
            preference_data["back_url"] = back_url

        if success_url and success_url.startswith("https://"):
            preference_data["auto_return"] = "approved"

        current_app.logger.info(f"[MP] preference_data armado: {preference_data}")

        preference = mp_client.preference().create(preference_data)
        current_app.logger.info(f"[MP] Respuesta bruta de MP: {preference}")

        pref_response = preference.get("response", {}) or {}
        pref_id = pref_response.get("id")
        init_point = pref_response.get("init_point") or pref_response.get("sandbox_init_point")

        if not init_point or not pref_id:
            return jsonify({"msg": "No se pudo crear la preferencia de pago"}), 500

        order.payment_txid = f"MP_PREF:{pref_id}"
        db.session.commit()

        return jsonify({"initPoint": init_point, "preferenceId": pref_id}), 200

    except Exception as exc:
        current_app.logger.exception(f"[MP] Error create_preference: {exc}")
        return jsonify({"msg": "No se pudo crear la preferencia de pago"}), 500


def mp_webhook():
    mp_client = current_app.config.get("MP_CLIENT")
    if not mp_client:
        return "", 200

    try:
        payload = request.get_json(silent=True) or {}

        event_type = payload.get("type")
        if event_type and event_type != "payment":
            return "", 200

        payment_id = (payload.get("data") or {}).get("id")
        payment_id = payment_id or request.args.get("data.id") or request.args.get("id")

        if not payment_id:
            return "", 200

        payment = mp_client.payment().get(payment_id)
        payment_data = (payment.get("response") or {}) if isinstance(payment, dict) else {}

        status = payment_data.get("status")
        external_ref = payment_data.get("external_reference")

        if not external_ref:
            return "", 200

        order = Order.query.get(int(external_ref))
        if not order:
            return "", 200

        if order.status == "paid" and order.payment_txid == f"MP_PAY:{payment_id}":
            return "", 200

        if status == "approved":
            order.status = "paid"
            agotados = []
            if not order.stock_reserved:
                for item in order.items or []:
                    product = Product.query.get(item.product_id)
                    if not product:
                        continue

                    prev_stock = int(product.stock or 0)
                    product.stock = max(0, prev_stock - int(item.quantity or 0))

                    if prev_stock > 0 and product.stock == 0:
                        agotados.append(product)
            else:
                order.stock_reserved = False

            try:
                send_admin_order_paid_email(order)
            except Exception as exc:
                current_app.logger.exception(f"[MAIL] Error mail admin pago aprobado: {exc}")

            try:
                send_buyer_order_email(order, order.items, mode="mp_paid")
            except Exception as exc:
                current_app.logger.exception(f"[MAIL] Error mail comprador mp_paid: {exc}")

            if agotados:
                try:
                    for product in agotados:
                        send_admin_product_out_of_stock_email(product)
                except Exception as exc:
                    current_app.logger.exception(f"[MAIL] Error mail stock agotado: {exc}")

        elif status in ("pending", "in_process"):
            order.status = "pending"
        else:
            order.status = "cancelled"
            if order.stock_reserved:
                for item in order.items or []:
                    db.session.execute(
                        update(Product)
                        .where(Product.id == item.product_id)
                        .values(stock=Product.stock + int(item.quantity or 0))
                    )
                order.stock_reserved = False

        order.payment_txid = f"MP_PAY:{payment_id}"
        order.payment_brand = payment_data.get("payment_method_id")
        card = payment_data.get("card") or {}
        last4 = card.get("last_four_digits")
        if last4:
            order.payment_last4 = last4

        db.session.commit()

        return "", 200

    except Exception as exc:
        current_app.logger.exception(f"[MP] Error webhook: {exc}")
        return "", 200