import os
import uuid

from flask import current_app, jsonify, request
from werkzeug.exceptions import NotFound
from werkzeug.utils import secure_filename
from services.cloudinary_service import upload_product_image #type: ignore

from models import Order, Product, ProductImage, User, db


def _parse_bool(value):
    if value is None:
        return None
    return str(value).strip().lower() in {"1", "true", "on", "yes"}


def _parse_product_payload():
    is_multipart = request.content_type and "multipart/form-data" in request.content_type
    image_files = []

    if is_multipart:
        data = request.form or {}
        image_files = request.files.getlist("images") or []
        legacy_image = request.files.get("image")
        if legacy_image:
            image_files.append(legacy_image)
        image_urls = data.getlist("imageUrls") or data.getlist("image_urls")
    else:
        data = request.get_json() or {}
        image_urls = data.get("imageUrls") or data.get("image_urls")   

    payload = {
        "name": data.get("name"),
        "slug": data.get("slug"),
        "price": data.get("price"),
        "category": data.get("category"),
        "imageUrl": data.get("imageUrl") or data.get("image_url"),
        "imageUrls": image_urls,
        "mainImageIndex": data.get("mainImageIndex") or data.get("main_image_index"),
        "isOffer": data.get("isOffer"),
        "offerLabel": data.get("offerLabel"),
        "stock": data.get("stock"),
        "is_active": data.get("is_active") if "is_active" in data else data.get("isActive"),
        "description": data.get("description"),
    }

    if is_multipart:
        payload["isOffer"] = _parse_bool(payload["isOffer"])
        payload["is_active"] = _parse_bool(payload["is_active"])
    else:
        # si viene JSON puede venir boolean o string igual
        payload["isOffer"] = _parse_bool(payload["isOffer"]) if payload["isOffer"] is not None else None
        payload["is_active"] = (
            _parse_bool(payload["is_active"]) if payload["is_active"] is not None else None
        )

    return payload, image_files


def _parse_main_image_index(value):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError("Índice de imagen principal inválido.")
    

def _save_product_image(image_file):
    if not image_file or not image_file.filename:
        return None

    allowed_mime = current_app.config.get("ALLOWED_PRODUCT_IMAGE_MIME", set())
    mime_type = (image_file.mimetype or "").lower()
    if allowed_mime and mime_type not in allowed_mime:
        raise ValueError("Tipo de imagen no permitido (solo JPG/PNG/WEBP).")

    filename = secure_filename(image_file.filename)
    if not filename:
        raise ValueError("Nombre de archivo inválido.")
    
    storage_backend = current_app.config.get("PRODUCT_IMAGE_STORAGE", "local").lower()
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    
    if storage_backend == "cloudinary":
        folder = current_app.config.get("CLOUDINARY_PRODUCT_FOLDER", "products")
        try:
            return upload_product_image(
                image_file,
                folder=folder,
                public_id=os.path.splitext(unique_name)[0],
            )
        except Exception as exc:
            current_app.logger.exception(f"[Cloudinary] Error al subir imagen: {exc!r}")
            raise ValueError("No se pudo subir la imagen a Cloudinary.") from exc

    upload_dir = current_app.config["PRODUCT_UPLOAD_DIR"]
    os.makedirs(upload_dir, exist_ok=True)
    image_file.save(os.path.join(upload_dir, unique_name))

    base_path = current_app.config.get("PRODUCT_IMAGE_BASE_URL", "/uploads/products").rstrip("/")
    return f"{base_path}/{unique_name}"


def _save_product_images(image_files):
    saved = []
    for image_file in image_files:
        if not image_file or not image_file.filename:
            continue
        saved.append(_save_product_image(image_file))
    return saved


def _coerce_image_urls(raw):
    if not raw:
        return []
    if isinstance(raw, list):
        return [item for item in raw if item]
    return [raw]


def _sync_product_images(product, image_urls):
    if image_urls is None:
        return
    normalized = [url for url in image_urls if url]
    existing_map = {img.image_url: img for img in product.images or []}
    for img in list(product.images or []):
        if img.image_url not in normalized:
            product.images.remove(img)
    for index, url in enumerate(normalized):
        image = existing_map.get(url)
        if not image:
            image = ProductImage(image_url=url, position=index)
            product.images.append(image)
        image.position = index


def _enforce_image_limit(product, new_images):
    existing = {img.image_url for img in (product.images or [])}
    incoming = [url for url in new_images if url and url not in existing]
    total = len(existing) + len(incoming)
    if total > 5:
        raise ValueError("Podés subir hasta 5 imágenes por producto.")


def admin_create_product():
    try:
        data, image_files = _parse_product_payload()
        name = data.get("name")
        slug = data.get("slug")
        price = data.get("price")
        category = data.get("category")
        image_url = data.get("imageUrl")
        image_urls = _coerce_image_urls(data.get("imageUrls"))
        main_image_index = _parse_main_image_index(data.get("mainImageIndex"))
        is_offer = data.get("isOffer", False)
        offer_label = data.get("offerLabel")
        stock = data.get("stock", 0)
        is_active = data.get("is_active", True)
        if is_active is None:
            is_active = True           
        description = data.get("description")

        if not name or not slug or price is None:
            return jsonify({"msg": "Nombre, slug y precio son obligatorios"}), 400

        if Product.query.filter_by(slug=slug).first():
            return jsonify({"msg": "Ya existe un producto con ese slug"}), 400
        
        uploaded_images = _save_product_images(image_files)
        if main_image_index is not None:
            if not uploaded_images:
                raise ValueError("Tenés que subir imágenes nuevas para elegir la principal.")
            if main_image_index < 0 or main_image_index >= len(uploaded_images):
                raise ValueError("La imagen principal seleccionada no existe.")
            image_url = uploaded_images[main_image_index]
        elif uploaded_images and not image_url:
            image_url = uploaded_images[0]

        combined_images = [url for url in image_urls if url]
        combined_images.extend(uploaded_images)
        if image_url:
            if image_url not in combined_images:
                combined_images.insert(0, image_url)
            else:
                combined_images = [image_url] + [url for url in combined_images if url != image_url]

        product = Product(
            name=name,
            slug=slug,
            price=int(price),
            category=category,
            image_url=image_url,
            is_offer=is_offer,
            offer_label=offer_label,
            stock=int(stock or 0),
            is_active=is_active,
            description=description,
        )
        _enforce_image_limit(product, combined_images)
        db.session.add(product)
        db.session.flush()
        _sync_product_images(product, combined_images)
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
        data, image_files = _parse_product_payload()
        name = data.get("name")
        slug = data.get("slug")
        price = data.get("price")
        category = data.get("category")
        image_url = data.get("imageUrl")
        image_urls = _coerce_image_urls(data.get("imageUrls"))
        main_image_index = _parse_main_image_index(data.get("mainImageIndex"))
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

        uploaded_images = _save_product_images(image_files)
        combined_images = [url for url in image_urls if url]
        combined_images.extend(uploaded_images)
        _enforce_image_limit(product, combined_images)

        if main_image_index is not None:
            if not uploaded_images:
                raise ValueError("Tenés que subir imágenes nuevas para elegir la principal.")
            if main_image_index < 0 or main_image_index >= len(uploaded_images):
                raise ValueError("La imagen principal seleccionada no existe.")
            image_url = uploaded_images[main_image_index]
        elif uploaded_images and not image_url:
            image_url = uploaded_images[0]

        if image_url is None or image_url == "":
            image_url = combined_images[0] if combined_images else None
            if image_url not in combined_images:
                combined_images.insert(0, image_url)
                
            else:
                combined_images = [image_url] + [url for url in combined_images if url != image_url]

        else:
            product.image_url = None

        _sync_product_images(product, combined_images)

        if stock is not None and stock != "":
            product.stock = int(stock)

        if description is not None:
            product.description = description

        if is_offer is not None:
            parsed = _parse_bool(is_offer)
            if parsed is not None:
                product.is_offer = parsed

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