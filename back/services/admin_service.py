import os
import re
import unicodedata
import uuid
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from flask import current_app, jsonify, request
from werkzeug.exceptions import NotFound
from werkzeug.utils import secure_filename
from services import ai_service
from services.cloudinary_service import list_product_assets, upload_product_image #type: ignore

from models import Order, Product, ProductImage, User, db

# Tope de productos por lote. Evita que un pegado accidental de una planilla
# entera bloquee la base con una transaccion gigante.
BULK_MAX_ITEMS = 200

# Tope de imagenes por tanda de subida. Mas que esto y el request tarda
# demasiado desde un celular con datos moviles.
UPLOAD_MAX_FILES = 20

# Tope de una imagen embebida como data URL. El front la reduce a 512px antes
# de mandarla, asi que ~1,5 MB en base64 es holgado y frena un envio accidental
# de la foto original de 4 MB.
AI_MAX_DATA_URL_CHARS = 1_500_000


def _parse_bool(value):
    if value is None:
        return None
    return str(value).strip().lower() in {"1", "true", "on", "yes"}


def _slugify(value) -> str:
    """Convierte 'Funda iPhone 15 Pro' en 'funda-iphone-15-pro'."""
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "producto"


def _unique_slug(base, taken=None) -> str:
    """
    Devuelve un slug libre. `taken` permite reservar los slugs de un mismo lote,
    que todavia no estan commiteados y por lo tanto no aparecen en la query.
    """
    taken = taken if taken is not None else set()
    root = _slugify(base)
    slug = root
    suffix = 2
    while slug in taken or Product.query.filter_by(slug=slug).first():
        slug = f"{root}-{suffix}"
        suffix += 1
    return slug


def _parse_price(value):
    """
    Acepta '$ 12.500', '12500', '12.500,50' y devuelve un entero de pesos.

    El precio se guarda como Integer, asi que no hay decimales que preservar.
    La regla es: solo se considera decimal lo que viene despues del ultimo
    separador si son 1 o 2 digitos. Cualquier otro punto o coma es separador
    de miles. Sin esto '12.500' se leeria como 12,5 en vez de 12500.
    """
    if value is None or str(value).strip() == "":
        raise ValueError("El precio es obligatorio.")
    if isinstance(value, (int, float)):
        return int(round(value))

    text = re.sub(r"[^\d,.\-]", "", str(value)).strip()
    if not text or text in {"-", ".", ","}:
        raise ValueError(f"Precio invalido: {value!r}")

    decimals = re.search(r"[.,](\d{1,2})$", text)
    try:
        if decimals:
            whole = re.sub(r"[.,]", "", text[: decimals.start()]) or "0"
            # ROUND_HALF_UP y no round(): el round() de Python usa redondeo
            # bancario (12500.5 -> 12500) y el Math.round() del front redondea
            # para arriba (12501). Sin esto el preview del importador muestra
            # un precio y se guarda otro.
            return int(
                Decimal(f"{whole}.{decimals.group(1)}").quantize(
                    Decimal("1"), rounding=ROUND_HALF_UP
                )
            )
        return int(re.sub(r"[.,]", "", text))
    except (ValueError, InvalidOperation) as exc:
        raise ValueError(f"Precio invalido: {value!r}") from exc


def _parse_int(value, default=0, field="valor"):
    if value is None or str(value).strip() == "":
        return default
    if isinstance(value, (int, float)):
        return int(value)
    text = re.sub(r"[^\d\-]", "", str(value))
    if not text or text == "-":
        raise ValueError(f"{field} invalido: {value!r}")
    return int(text)


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
                asset_folder=current_app.config.get("CLOUDINARY_ASSET_FOLDER"),
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


def admin_duplicate_product(product_id: int):
    """
    Clona un producto existente, incluidas sus imagenes.

    Las imagenes se reusan por URL en vez de resubirse: ya viven en Cloudinary,
    asi que duplicar no cuesta ancho de banda ni cuota.
    """
    source = Product.query.get_or_404(product_id)
    try:
        data = request.get_json(silent=True) or {}

        name = (data.get("name") or "").strip() or f"{source.name} (copia)"
        slug = _unique_slug(data.get("slug") or name)

        copy = Product(
            name=name,
            slug=slug,
            price=_parse_price(data.get("price")) if data.get("price") is not None else source.price,
            category=data.get("category", source.category),
            image_url=source.image_url,
            is_offer=source.is_offer,
            offer_label=source.offer_label,
            stock=_parse_int(data.get("stock"), source.stock or 0, "Stock"),
            is_active=source.is_active,
            description=source.description,
        )
        if copy.stock < 0:
            raise ValueError("El stock no puede ser negativo.")

        db.session.add(copy)
        db.session.flush()

        for image in sorted(source.images or [], key=lambda i: i.position):
            copy.images.append(
                ProductImage(image_url=image.image_url, position=image.position)
            )

        db.session.commit()
        return jsonify(copy.to_dict()), 201
    except ValueError as exc:
        db.session.rollback()
        return jsonify({"msg": str(exc)}), 400
    except Exception as exc:
        current_app.logger.exception(f"Error duplicando producto {product_id}: {exc}")
        db.session.rollback()
        return jsonify({"msg": "Error interno al duplicar el producto"}), 500


def admin_bulk_create_products():
    """
    Alta masiva desde JSON.

    Es todo-o-nada: si una fila falla no se crea ninguna, y se devuelven los
    errores indexados para que el front marque exactamente cual corregir.
    Crear un subconjunto dejaria al admin adivinando que entro y que no.
    """
    payload = request.get_json(silent=True)
    items = payload.get("items") if isinstance(payload, dict) else payload

    if not isinstance(items, list) or not items:
        return jsonify({"msg": "Enviá una lista de productos en 'items'."}), 400
    if len(items) > BULK_MAX_ITEMS:
        return jsonify(
            {"msg": f"Máximo {BULK_MAX_ITEMS} productos por lote (enviaste {len(items)})."}
        ), 400

    errors = []
    prepared = []
    slugs_in_batch = set()

    for index, raw in enumerate(items):
        if not isinstance(raw, dict):
            errors.append({"index": index, "msg": "Fila con formato invalido."})
            continue

        name = str(raw.get("name") or "").strip()
        try:
            if not name:
                raise ValueError("El nombre es obligatorio.")

            price = _parse_price(raw.get("price"))
            if price < 0:
                raise ValueError("El precio no puede ser negativo.")

            stock = _parse_int(raw.get("stock"), 0, "Stock")
            if stock < 0:
                raise ValueError("El stock no puede ser negativo.")

            slug = _unique_slug(raw.get("slug") or name, slugs_in_batch)
            slugs_in_batch.add(slug)

            image_urls = _coerce_image_urls(raw.get("imageUrls") or raw.get("imageUrl"))
            if len(image_urls) > 5:
                raise ValueError("Hasta 5 imágenes por producto.")

            prepared.append(
                {
                    "name": name,
                    "slug": slug,
                    "price": price,
                    "stock": stock,
                    "category": (str(raw.get("category")).strip() or None)
                    if raw.get("category")
                    else None,
                    "description": (str(raw.get("description")).strip() or None)
                    if raw.get("description")
                    else None,
                    "is_offer": bool(_parse_bool(raw.get("isOffer"))),
                    "offer_label": (str(raw.get("offerLabel")).strip() or None)
                    if raw.get("offerLabel")
                    else None,
                    "image_urls": image_urls,
                }
            )
        except ValueError as exc:
            errors.append({"index": index, "name": name, "msg": str(exc)})

    if errors:
        return jsonify(
            {
                "msg": f"{len(errors)} de {len(items)} filas tienen errores. No se creó ningún producto.",
                "errors": errors,
            }
        ), 400

    try:
        created = []
        for item in prepared:
            image_urls = item.pop("image_urls")
            product = Product(image_url=image_urls[0] if image_urls else None, **item)
            db.session.add(product)
            db.session.flush()
            for position, url in enumerate(image_urls):
                product.images.append(ProductImage(image_url=url, position=position))
            created.append(product)

        db.session.commit()
        return jsonify(
            {
                "created": len(created),
                "products": [p.to_dict() for p in created],
            }
        ), 201
    except Exception as exc:
        current_app.logger.exception(f"Error en alta masiva de productos: {exc}")
        db.session.rollback()
        return jsonify({"msg": "Error interno al crear los productos. No se guardó ninguno."}), 500


def admin_list_cloudinary_assets():
    """
    Devuelve las imágenes de Cloudinary para armar productos a partir de ellas.

    Marca las que ya usa algún producto (`usedBy`) para que el admin no cargue
    dos veces la misma foto al reconstruir el catálogo.
    """
    if (current_app.config.get("PRODUCT_IMAGE_STORAGE") or "local").lower() != "cloudinary":
        return jsonify(
            {"msg": "El almacenamiento de imágenes no está configurado en Cloudinary."}
        ), 400

    try:
        cursor = request.args.get("cursor") or None
        # Solo la carpeta de este cliente. Las demas carpetas de la cuenta de
        # Cloudinary son de otros clientes y no deben aparecer nunca aca.
        asset_folder = request.args.get("folder") or current_app.config.get(
            "CLOUDINARY_ASSET_FOLDER"
        )

        result = list_product_assets(asset_folder=asset_folder, cursor=cursor)

        # Un producto puede referenciar la imagen desde products.image_url o
        # desde product_images, asi que se miran las dos.
        used = {}
        for product in Product.query.all():
            urls = {product.image_url} | {img.image_url for img in (product.images or [])}
            for url in urls:
                if url:
                    used[url] = {"id": product.id, "name": product.name}

        for asset in result["assets"]:
            asset["usedBy"] = used.get(asset["url"])

        return jsonify(result)
    except Exception as exc:
        current_app.logger.exception(f"Error listando assets de Cloudinary: {exc}")
        return jsonify({"msg": "No se pudieron listar las imágenes de Cloudinary."}), 502


def admin_ai_suggest_products():
    """
    Sugiere título, descripción y categoría a partir de las fotos elegidas.

    Es solo asistencia de carga: el admin revisa todo y pone el precio a mano.
    """
    if not ai_service.is_configured():
        return jsonify(
            {"msg": "Falta configurar OPENAI_API_KEY para usar las sugerencias."}
        ), 400

    payload = request.get_json(silent=True) or {}
    images = payload.get("images")

    if not isinstance(images, list) or not images:
        return jsonify({"msg": "Enviá una lista de imágenes en 'images'."}), 400
    if len(images) > ai_service.MAX_IMAGES:
        return jsonify(
            {"msg": f"Máximo {ai_service.MAX_IMAGES} imágenes por tanda."}
        ), 400

    cleaned = []
    for item in images:
        url = (item or {}).get("url") if isinstance(item, dict) else None
        url = str(url or "")
        # Se acepta data: además de https porque el formulario de producto
        # manda la foto elegida antes de subirla a Cloudinary.
        is_https = url.startswith("https://")
        is_data = url.startswith("data:image/")

        if not (is_https or is_data):
            return jsonify(
                {"msg": "Cada imagen necesita una url https o una imagen embebida."}
            ), 400
        if is_data and len(url) > AI_MAX_DATA_URL_CHARS:
            return jsonify(
                {"msg": "La imagen es demasiado grande. Reducila antes de enviarla."}
            ), 413

        cleaned.append({"id": (item.get("id") or url[:120]), "url": url})

    try:
        return jsonify(ai_service.suggest_for_images(cleaned))
    except Exception as exc:
        current_app.logger.exception(f"Error en sugerencias de IA: {exc}")
        return jsonify({"msg": "No se pudieron generar las sugerencias."}), 502


def admin_upload_cloudinary_assets():
    """
    Sube imágenes a la biblioteca sin crear productos todavía.

    Sirve para el caso normal a futuro: sacás las fotos de 15 productos nuevos,
    las subís todas juntas y quedan disponibles en el selector. Como no las usa
    ningún producto, aparecen sin filtrar en la carga masiva.
    """
    if (current_app.config.get("PRODUCT_IMAGE_STORAGE") or "local").lower() != "cloudinary":
        return jsonify(
            {"msg": "El almacenamiento de imágenes no está configurado en Cloudinary."}
        ), 400

    files = request.files.getlist("images")
    if not files:
        return jsonify({"msg": "No llegó ninguna imagen."}), 400
    if len(files) > UPLOAD_MAX_FILES:
        return jsonify(
            {"msg": f"Máximo {UPLOAD_MAX_FILES} imágenes por tanda (mandaste {len(files)})."}
        ), 400

    uploaded, errors = [], []
    for image_file in files:
        name = getattr(image_file, "filename", "") or "sin nombre"
        try:
            url = _save_product_image(image_file)
            if url:
                uploaded.append({"filename": name, "url": url})
        except ValueError as exc:
            errors.append({"filename": name, "msg": str(exc)})
        except Exception as exc:
            current_app.logger.exception(f"[Cloudinary] Error subiendo {name}: {exc}")
            errors.append({"filename": name, "msg": "No se pudo subir."})

    # Subida parcial a proposito: que una foto salga mal no tiene por que tirar
    # abajo las otras catorce que si subieron.
    status = 201 if uploaded else 400
    return jsonify({"uploaded": uploaded, "errors": errors}), status


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

        product.image_url = image_url or None

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