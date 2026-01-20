from flask import jsonify, request
from flask_jwt_extended import get_jwt_identity # type: ignore

from models import Order, Product, User


def validate_checkout():
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

    return jsonify({"ok": True, "items": validated_items, "totalAmount": total_amount})


def checkout_success_guard(order_id: int):
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    order = Order.query.get_or_404(order_id)

    is_admin = user.role == "admin"
    if not is_admin and order.email != user.email:
        return jsonify({"msg": "No autorizado"}), 403

    if order.status != "paid":
        return jsonify({"msg": "La orden aún no está pagada"}), 409

    return jsonify({"ok": True, "order": order.to_dict()})