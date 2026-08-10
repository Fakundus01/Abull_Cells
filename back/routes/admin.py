from flask import Blueprint, request

from services import admin_service, auth_service


admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/api/admin/products", methods=["GET", "POST"])
@auth_service.admin_required
def admin_products():
    if request.method == "GET":
        return admin_service.admin_list_products()
    return admin_service.admin_create_product()


@admin_bp.route("/api/admin/cloudinary/assets", methods=["GET"])
@auth_service.admin_required
def admin_list_cloudinary_assets():
    return admin_service.admin_list_cloudinary_assets()


@admin_bp.route("/api/admin/products/ai-suggest", methods=["POST"])
@auth_service.admin_required
def admin_ai_suggest_products():
    return admin_service.admin_ai_suggest_products()


@admin_bp.route("/api/admin/products/bulk", methods=["POST"])
@auth_service.admin_required
def admin_bulk_create_products():
    return admin_service.admin_bulk_create_products()


@admin_bp.route("/api/admin/products/<int:product_id>/duplicate", methods=["POST"])
@auth_service.admin_required
def admin_duplicate_product(product_id: int):
    return admin_service.admin_duplicate_product(product_id)


@admin_bp.route("/api/admin/products/<int:product_id>", methods=["PUT"])
@auth_service.admin_required
def admin_update_product(product_id: int):
    return admin_service.admin_update_product(product_id)


@admin_bp.route("/api/admin/products/<int:product_id>", methods=["DELETE"])
@auth_service.admin_required
def admin_delete_product(product_id: int):
    return admin_service.admin_delete_product(product_id)


@admin_bp.route("/api/admin/products/<int:product_id>/active", methods=["PATCH"])
@auth_service.admin_required
def admin_set_product_active(product_id: int):
    return admin_service.admin_set_product_active(product_id)


@admin_bp.route("/api/admin/orders", methods=["GET"])
@auth_service.admin_required
def admin_list_orders():
    return admin_service.admin_list_orders()


@admin_bp.route("/api/admin/orders/<int:order_id>/status", methods=["PUT"])
@auth_service.admin_required
def admin_update_order_status(order_id: int):
    return admin_service.admin_update_order_status(order_id)


@admin_bp.route("/api/admin/users", methods=["GET"])
@auth_service.admin_required
def admin_list_users():
    return admin_service.admin_list_users()