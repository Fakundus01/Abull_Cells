from flask import current_app, jsonify, request
from werkzeug.exceptions import NotFound

from models import Order, Product, User, db


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
        current_app.logger.exception(f"Error inesperado en POST /api/admin/products: {exc}")
        db.session.rollback()
        return jsonify({"msg": "Error interno al crear el producto"}), 500


def admin_update_product(product_id: int):
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
        current_app.logger.exception(
            f"Error inesperado en PUT /api/admin/products/{product_id}: {exc}"
        )
        db.session.rollback()
        return jsonify({"msg": "Error interno al actualizar el producto"}), 500


def admin_delete_product(product_id: int):
    try:
        product = Product.query.get_or_404(product_id)
        db.session.delete(product)
        db.session.commit()
        return jsonify({"msg": "Producto eliminado correctamente"})
    except NotFound:
        return jsonify({"msg": "Producto no encontrado"}), 404
    except Exception as exc:
        current_app.logger.exception(
            f"Error inesperado en DELETE /api/admin/products/{product_id}: {exc}"
        )
        db.session.rollback()
        return jsonify({"msg": "Error interno al eliminar el producto"}), 500


def admin_list_orders():
    try:
        orders = Order.query.order_by(Order.created_at.desc()).all()
        return jsonify([o.to_dict() for o in orders])
    except Exception as exc:
        current_app.logger.exception(f"Error inesperado en GET /api/admin/orders: {exc}")
        return jsonify({"msg": "Error al obtener órdenes"}), 500


def admin_update_order_status(order_id: int):
    try:
        data = request.get_json() or {}
        new_status = data.get("status")

        if not new_status:
            return jsonify({"msg": "El campo 'status' es obligatorio"}), 400

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
        current_app.logger.exception(
            f"Error inesperado en PUT /api/admin/orders/{order_id}/status: {exc}"
        )
        db.session.rollback()
        return jsonify({"msg": "Error interno al actualizar estado de la orden"}), 500


def admin_list_users():
    users = User.query.order_by(User.id.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]}), 200