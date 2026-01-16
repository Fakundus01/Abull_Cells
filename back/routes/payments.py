from flask import Blueprint
from flask_jwt_extended import jwt_required # type: ignore

from services import payment_service


payments_bp = Blueprint("payments", __name__)


@payments_bp.route("/api/payments/mp/create_preference", methods=["POST"])
@jwt_required()
def create_mp_preference():
    return payment_service.create_mp_preference()


@payments_bp.route("/api/payments/mp/webhook", methods=["POST", "GET"])
def mp_webhook():
    return payment_service.mp_webhook()