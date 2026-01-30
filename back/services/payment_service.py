from __future__ import annotations

import json
import os
from datetime import datetime, timedelta

from flask import current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity # type: ignore
from sqlalchemy import update

from email_utils import (
    send_admin_order_paid_email,
    send_admin_product_out_of_stock_email,
    send_buyer_order_email,
    send_admin_order_ticket_to_printer,
)
from models import Order, Product, User, db
from services.reservation_service import release_order_reservation


def _bool_env(value: str | None) -> bool | None:
    if value is None:
        return None
    return value.strip().lower() in ("1", "true", "yes", "on")


def _parse_csv(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _iso_utc(dt: datetime) -> str:
    return dt.replace(microsecond=0).isoformat() + "Z"


def _get_payment_methods_config() -> dict | None:
    env_json = os.getenv("MP_PAYMENT_METHODS_JSON")
    if env_json:
        try:
            data = json.loads(env_json)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            current_app.logger.warning(
                "[MP] MP_PAYMENT_METHODS_JSON inválido, se ignora."
            )

    config = {}
    installments = os.getenv("MP_INSTALLMENTS")
    if installments and installments.isdigit():
        config["installments"] = int(installments)

    excluded_types = _parse_csv(os.getenv("MP_EXCLUDED_PAYMENT_TYPES"))
    if excluded_types:
        config["excluded_payment_types"] = [{"id": item} for item in excluded_types]

    excluded_methods = _parse_csv(os.getenv("MP_EXCLUDED_PAYMENT_METHODS"))
    if excluded_methods:
        config["excluded_payment_methods"] = [{"id": item} for item in excluded_methods]

    return config or None


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

        if (
                order.stock_reserved
                and order.reservation_expires_at
                and order.reservation_expires_at <= datetime.utcnow()
                ):
                release_order_reservation(order)
                db.session.commit()
                return jsonify({"msg": "La reserva de stock expiró"}), 409
        
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

        frontend_url = (os.getenv("FRONTEND_URL") or "").rstrip("/")
        if not frontend_url:
            frontend_url = (request.headers.get("Origin") or "").rstrip("/")
        success_url = os.getenv("MP_SUCCESS_URL") or (
            f"{frontend_url}/checkout/success" if frontend_url else None
        )
        failure_url = os.getenv("MP_FAILURE_URL") or (
            f"{frontend_url}/checkout/failure" if frontend_url else None
        )
        pending_url = os.getenv("MP_PENDING_URL") or (
            f"{frontend_url}/checkout/pending" if frontend_url else None
        )

        webhook_url = os.getenv("MP_WEBHOOK_URL")
        if not webhook_url:
            return jsonify({
                "msg": (
                    "Falta MP_WEBHOOK_URL (debe ser HTTPS público, ej: ngrok) "
                    "para usar webhook."
                )
            }), 500
        
        payer_phone_raw = order.phone or user.phone
        payer_phone = None
        if payer_phone_raw:
            digits = "".join([c for c in str(payer_phone_raw) if c.isdigit()])
            if digits:
                payer_phone = {"number": digits}

        preference_data = {
            "external_reference": str(order.id),
            "notification_url": webhook_url,
            "items": mp_items,
            "payer": {
                "name": order.customer_name,
                "email": order.email,
                **({"phone": payer_phone} if payer_phone else {}),
            },
            "metadata": {
                "order_id": order.id,
                "user_id": user.id,
                "customer_email": order.email,
                "payment_method": order.payment_method,
            },
            "additional_info": {
                "items": mp_items,
                "payer": {
                    "first_name": order.customer_name,
                    "email": order.email,
                },
            },
        }

        statement_descriptor = os.getenv("MP_STATEMENT_DESCRIPTOR")
        if statement_descriptor:
            preference_data["statement_descriptor"] = statement_descriptor

        purpose = os.getenv("MP_PURPOSE")
        if purpose:
            preference_data["purpose"] = purpose

        binary_mode = _bool_env(os.getenv("MP_BINARY_MODE"))
        if binary_mode is not None:
            preference_data["binary_mode"] = binary_mode

        back_urls = {}
        if success_url:
            back_urls["success"] = success_url
        if failure_url:
            back_urls["failure"] = failure_url
        if pending_url:
            back_urls["pending"] = pending_url
        if back_urls:
            preference_data["back_urls"] = back_urls

        if success_url and success_url.startswith("https://"):
            preference_data["auto_return"] = "approved"
        
        payment_methods = _get_payment_methods_config()
        if payment_methods:
            preference_data["payment_methods"] = payment_methods

        expires_flag = _bool_env(os.getenv("MP_PREFERENCE_EXPIRES"))
        expiration_minutes_env = os.getenv("MP_PREFERENCE_EXPIRES_MINUTES")
        expiration_minutes = (
            int(expiration_minutes_env)
            if expiration_minutes_env and expiration_minutes_env.isdigit()
            else current_app.config.get("ORDER_RESERVATION_MINUTES", 30)
        )
        if (expires_flag or expires_flag is None) and expiration_minutes > 0:
            now = datetime.utcnow()
            preference_data["expires"] = True
            preference_data["expiration_date_from"] = _iso_utc(now)
            preference_data["expiration_date_to"] = _iso_utc(
                now + timedelta(minutes=expiration_minutes)
            )

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


def _apply_mp_payment(order: Order, payment_id: str, payment_data: dict) -> None:
    status = payment_data.get("status")

    if order.status == "paid" and order.payment_txid == f"MP_PAY:{payment_id}":
        return

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
            order.reservation_expires_at = None

        if not order.email_sent_paid:
            try:
                send_admin_order_paid_email(order, payment_data)
            except Exception as exc:
                current_app.logger.exception(
                    f"[MAIL] Error mail admin pago aprobado: {exc}"
                )

            try:
                send_admin_order_ticket_to_printer(order, order.items, reason="mp_paid")
            except Exception as exc:
                current_app.logger.exception(
                    f"[PRINT] Error imprimiendo ticket mp_paid: {exc}"
                )
                
            try:
                send_buyer_order_email(
                    order,
                    order.items,
                    mode="mp_paid",
                    payment_data=payment_data,
                )
            except Exception as exc:
                current_app.logger.exception(
                    f"[MAIL] Error mail comprador mp_paid: {exc}"
                )
            order.email_sent_paid = True

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
            order.reservation_expires_at = None

    order.payment_txid = f"MP_PAY:{payment_id}"
    order.payment_brand = payment_data.get("payment_method_id")
    card = payment_data.get("card") or {}
    last4 = card.get("last_four_digits")
    if last4:
        order.payment_last4 = last4

    current_app.logger.info(
        "[MP] payment order_id=%s payment_id=%s status=%s reserved=%s",
        order.id,
        payment_id,
        order.status,
        order.stock_reserved,
    )


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

        external_ref = payment_data.get("external_reference")
        if not external_ref:
            return "", 200

        order = Order.query.get(int(external_ref))
        if not order:
            return "", 200

        _apply_mp_payment(order, str(payment_id), payment_data)
        db.session.commit()

        return "", 200

    except Exception as exc:
        current_app.logger.exception(f"[MP] Error webhook: {exc}")
        return "", 200


def mp_confirm_payment():
    mp_client = current_app.config.get("MP_CLIENT")
    if not mp_client:
        return jsonify({"msg": "Mercado Pago no está configurado"}), 500
    
    try:
        payload = request.get_json(silent=True) or {}
        payment_id = (
            payload.get("paymentId")
            or payload.get("payment_id")
            or request.args.get("payment_id")
            or request.args.get("collection_id")
        )
        order_id = payload.get("orderId") or request.args.get("external_reference")

        if not payment_id:
            return jsonify({"msg": "Falta payment_id"}), 400

        payment = mp_client.payment().get(payment_id)
        payment_data = (payment.get("response") or {}) if isinstance(payment, dict) else {}

        external_ref = payment_data.get("external_reference") or order_id
        if not external_ref:
            return jsonify({"msg": "Falta external_reference"}), 400

        order = Order.query.get(int(external_ref))
        if not order:
            return jsonify({"msg": "Orden no encontrada"}), 404

        _apply_mp_payment(order, str(payment_id), payment_data)          
        db.session.commit()

        return jsonify({"order": order.to_dict()}), 200

    except Exception as exc:
        current_app.logger.exception(f"[MP] Error confirm payment: {exc}")
        return jsonify({"msg": "No se pudo confirmar el pago"}), 500