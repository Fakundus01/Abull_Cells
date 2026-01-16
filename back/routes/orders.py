from flask import Blueprint
from flask_jwt_extended import jwt_required # type: ignore

from services import address_service, checkout_service, contact_service, order_service


orders_bp = Blueprint("orders", __name__)


@orders_bp.route("/api/orders", methods=["POST"])
@jwt_required()
def create_order():
    return order_service.create_order()


@orders_bp.route("/api/my/orders", methods=["GET"])
@jwt_required()
def list_my_orders():
    return order_service.list_my_orders()


@orders_bp.route("/api/my/orders/<int:order_id>", methods=["GET"])
@jwt_required()
def my_order_detail(order_id: int):
    return order_service.my_order_detail(order_id)


@orders_bp.route("/api/contact", methods=["POST"])
@jwt_required(optional=True)
def contact():
    return contact_service.contact()


@orders_bp.route("/api/checkout/validate", methods=["POST"])
@jwt_required()
def validate_checkout():
    return checkout_service.validate_checkout()


@orders_bp.route("/api/checkout/success/<int:order_id>", methods=["GET"])
@jwt_required()
def checkout_success_guard(order_id: int):
    return checkout_service.checkout_success_guard(order_id)


@orders_bp.route("/api/addresses", methods=["GET"])
@jwt_required()
def list_addresses():
    return address_service.list_addresses()


@orders_bp.route("/api/addresses", methods=["POST"])
@jwt_required()
def create_address():
    return address_service.create_address()


@orders_bp.route("/api/addresses/<int:address_id>", methods=["PUT"])
@jwt_required()
def update_address(address_id: int):
    return address_service.update_address(address_id)


@orders_bp.route("/api/addresses/<int:address_id>", methods=["DELETE"])
@jwt_required()
def delete_address(address_id: int):
    return address_service.delete_address(address_id)


@orders_bp.route("/api/addresses/<int:address_id>/default", methods=["POST"])
@jwt_required()
def set_default_address(address_id: int):
    return address_service.set_default_address(address_id)