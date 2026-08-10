from flask import Blueprint
from flask_jwt_extended import jwt_required # type: ignore

from services import auth_service


auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/register", methods=["POST"])
def register():
    return auth_service.register()


@auth_bp.route("/api/auth/login", methods=["POST"])
def login():
    return auth_service.login()


@auth_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    return auth_service.logout()


@auth_bp.route("/api/auth/me", methods=["GET"])
@jwt_required()
def me():
    return auth_service.me()


@auth_bp.route("/api/auth/send-verify-email", methods=["POST"])
@jwt_required()
def send_verify_email_endpoint():
    return auth_service.send_verify_email_endpoint()


@auth_bp.route("/api/auth/verify-email", methods=["POST"])
@jwt_required()
def verify_email():
    return auth_service.verify_email()


@auth_bp.route("/api/auth/resend-verify", methods=["POST"])
@jwt_required()
def resend_verify():
    return auth_service.resend_verify()


@auth_bp.route("/api/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    return auth_service.refresh()


@auth_bp.route("/api/auth/role", methods=["GET"])
@jwt_required()
def role():
    return auth_service.role()


@auth_bp.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    return auth_service.forgot_password()


@auth_bp.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    return auth_service.reset_password()