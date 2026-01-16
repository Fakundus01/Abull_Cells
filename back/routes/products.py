from flask import Blueprint

from services import product_service


products_bp = Blueprint("products", __name__)


@products_bp.route("/api/health", methods=["GET"])
def health():
    return product_service.health()


@products_bp.route("/api/products", methods=["GET"])
def get_products():
    return product_service.get_products()