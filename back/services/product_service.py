from flask import current_app, jsonify

from models import Product


def health():
    return jsonify({"status": "ok", "app": "abul_cells_api"})


def get_products():
    try:
        products = Product.query.all()
        return jsonify([p.to_dict() for p in products])
    except Exception as exc:
        current_app.logger.exception(f"Error inesperado en /api/products: {exc}")
        return jsonify({"msg": "Error al obtener productos"}), 500