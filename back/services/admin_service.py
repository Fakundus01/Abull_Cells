import os
import uuid

from flask import current_app, jsonify, request
from werkzeug.exceptions import NotFound
from werkzeug.utils import secure_filename

from models import Order, Product, User, db


def _parse_bool(value):
    if value is None:
        return None
    return str(value).strip().lower() in {"1", "true", "on", "yes"}


def _parse_product_payload():
    is_multipart = request.content_type and "multipart/form-data" in request.content_type
    image_file = None

    if is_multipart:
        data = request.form or {}
        image_file = request.files.get("image")
    else:
        data = request.get_json() or {}

    payload = {
        "name": data.get("name"),
        "slug": data.get("slug"),
        "price": data.get("price"),
        "category": data.get("category"),
        "imageUrl": data.get("imageUrl"),
        "isOffer": data.get("isOffer"),
        "offerLabel": data.get("offerLabel"),
        "stock": data.get("stock"),
        "description": data.get("description"),
    }

    if is_multipart:
        payload["isOffer"] = _parse_bool(payload["isOffer"])

    return payload, image_file


def _save_product_image(image_file):
    if not image_file or not image_file.filename:
        return None

    allowed_mime = current_app.config.get("ALLOWED_PRODUCT_IMAGE_MIME", set())
    mime_type = (image_file.mimetype or "").lower()
    if allowed_mime and mime_type not in allowed_mime:
        raise ValueError("Tipo de imagen no permitido (solo JPG/PNG/WEBP).")

    upload_dir = current_app.config["PRODUCT_UPLOAD_DIR"]
    os.makedirs(upload_dir, exist_ok=True)

    filename = secure_filename(image_file.filename)
    if not filename:
        raise ValueError("Nombre de archivo inválido.")

    unique_name = f"{uuid.uuid4().hex}_{filename}"
    image_file.save(os.path.join(upload_dir, unique_name))

    base_url = current_app.config.get("PRODUCT_IMAGE_BASE_URL", "/uploads/products")
    return f"{base_url.rstrip('/')}/{unique_name}"

def admin_create_product():
    try:
        data, image_file = _parse_product_payload()
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
        
        if image_file:
            image_url = _save_product_image(image_file)

        product = Product(
            name=name,
            slug=slug,
            price=int(price),
            category=category,
            image_url=image_url,
            is_offer=is_offer,
            offer_label=offer_label,
            stock=int(stock or 0),
            description=description,
        )
        db.session.add(product)
        db.session.commit()

        return jsonify(product.to_dict()), 201
    except ValueError as exc:
        return jsonify({"msg": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception(f"Error inesperado en POST /api/admin/products: {exc}")
        db.session.rollback()
        return jsonify({"msg": "Error interno al crear el producto"}), 500


def admin_list_products():
    try:
        products = Product.query.order_by(Product.id.desc()).all()
        return jsonify([p.to_dict() for p in products])
    except Exception as exc:
        current_app.logger.exception(f"Error inesperado en GET /api/admin/products: {exc}")
        return jsonify({"msg": "Error al obtener productos"}), 500


def admin_update_product(product_id: int):
    try:
        product = Product.query.get_or_404(product_id)
        data, image_file = _parse_product_payload()
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

        if price is not None and price != "":
            product.price = int(price)

        if category is not None:
            product.category = category

        if image_file:
            image_url = _save_product_image(image_file)

        if image_url is not None and image_url != "":
            product.image_url = image_url

        if stock is not None and stock != "":
            product.stock = int(stock)

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
    except ValueError as exc:
        return jsonify({"msg": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception(
            f"Error inesperado en PUT /api/admin/products/{product_id}: {exc}"
        )
        db.session.rollback()
        return jsonify({"msg": "Error interno al actualizar el producto"}), 500


def admin_delete_product(product_id: int):
    try:
        product = Product.query.get_or_404(product_id)
        product.is_active = False
        db.session.commit()
        return jsonify({"msg": "Producto desactivado  correctamente"})
    except NotFound:
        return jsonify({"msg": "Producto no encontrado"}), 404
    except Exception as exc:
        current_app.logger.exception(
            f"Error inesperado en DELETE /api/admin/products/{product_id}: {exc}"
        )
        db.session.rollback()
        return jsonify({"msg": "Error interno al desactivar el producto"}), 500


def admin_set_product_active(product_id: int):
    try:
        data = request.get_json() or {}
        raw_is_active = data.get("is_active")
        is_active = _parse_bool(raw_is_active)
        if is_active is None:
            is_active = True
        product = Product.query.get_or_404(product_id)
        product.is_active = is_active
        db.session.commit()
        return jsonify({"msg": "OK", "product": product.to_dict()})
    except NotFound:
        return jsonify({"msg": "Producto no encontrado"}), 404
    except Exception as exc:
        current_app.logger.exception(
            f"Error inesperado en PATCH /api/admin/products/{product_id}/active: {exc}"
        )
        db.session.rollback()
        return jsonify({"msg": "Error interno al actualizar el producto"}), 500


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