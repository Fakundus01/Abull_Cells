from __future__ import annotations

from datetime import datetime
import os
import re
import secrets
from functools import wraps

from flask import current_app, jsonify, request
from flask_jwt_extended import ( # type: ignore
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    set_access_cookies,
    set_refresh_cookies,
    unset_jwt_cookies,
    verify_jwt_in_request,
) 
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from werkzeug.security import check_password_hash, generate_password_hash

from email_utils import send_password_reset_email, send_verify_code_email
from models import User, db
from services.rate_limit import rate_limit_exceeded, rate_limit_key


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _get_reset_serializer() -> URLSafeTimedSerializer:
    secret = current_app.config.get("SECRET_KEY") or os.getenv("SECRET_KEY") or "dev-secret"
    return URLSafeTimedSerializer(secret, salt="pwd-reset")


def _claims_for(user: User) -> dict:
    return {
        "role": user.role,
        "email": user.email,
        "token_version": user.token_version,
    }


def register():
    try:
        data = request.get_json() or {}
        name = (data.get("name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        if rate_limit_exceeded(
            rate_limit_key(request, "register", email),
            current_app.config.get("AUTH_RATE_LIMIT_REGISTER", 5),
            current_app.config.get("AUTH_RATE_LIMIT_WINDOW", 900),
        ):
           return jsonify({"msg": "Demasiados intentos. Probá más tarde."}), 429

        if not name:
            return jsonify({"msg": "El nombre es obligatorio"}), 400
        if not email or not _EMAIL_RE.match(email):
            return jsonify({"msg": "Email inválido"}), 400
        if not password or len(password) < 8:
            return jsonify({"msg": "La contraseña debe tener al menos 8 caracteres"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"msg": "Ya existe un usuario con ese email"}), 409

        base = email.split("@")[0].lower().strip()
        base = re.sub(r"[^a-z0-9._-]", "", base)
        username = base
        i = 2
        while User.query.filter_by(username=username).first():
            username = f"{base}{i}"
            i += 1

        user = User(name=name, email=email, role="user", username=username)
        user.set_password(password)

        db.session.add(user)
        db.session.commit()

        code = f"{secrets.randbelow(1000000):06d}"

        user.email_verified = False
        user.email_verify_code_hash = generate_password_hash(code)
        user.email_verify_code_sent_at = datetime.utcnow()
        db.session.commit()

        try:
            send_verify_code_email(user.email, code, user.name)
        except Exception as exc:
            current_app.logger.exception(f"[MAIL] Error enviando verificación: {exc}")

        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=_claims_for(user),
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims=_claims_for(user),
        )

        resp = jsonify({"user": user.to_dict()})
        set_access_cookies(resp, access_token)
        set_refresh_cookies(resp, refresh_token)

        return resp, 201

    except Exception as exc:
        current_app.logger.exception(f"Error inesperado en /api/auth/register: {exc}")
        db.session.rollback()
        return jsonify({"msg": "Error interno al registrar"}), 500


def login():
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        if rate_limit_exceeded(
            rate_limit_key(request, "login", email),
            current_app.config.get("AUTH_RATE_LIMIT_LOGIN", 10),
            current_app.config.get("AUTH_RATE_LIMIT_WINDOW", 900),
        ):
            return jsonify({"msg": "Demasiados intentos. Probá más tarde."}), 429

        if not email or not password:
            return jsonify({"msg": "Email y contraseña son obligatorios"}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({
                "code": "EMAIL_NOT_FOUND",
                "msg": "Ese email no está registrado.",
            }), 404

        if not user.check_password(password):
            return jsonify({
                "code": "INVALID_PASSWORD",
                "msg": "Contraseña incorrecta.",
            }), 401

        if not user.email_verified:
            return jsonify({
                "code": "EMAIL_NOT_VERIFIED",
                "msg": "Verificá tu email para continuar.",
            }), 403
        
        access_token = create_access_token(
            identity=str(user.id),
            additional_claims=_claims_for(user),
        )
        refresh_token = create_refresh_token(
            identity=str(user.id),
            additional_claims=_claims_for(user),
        )

        resp = jsonify({"user": user.to_dict()})
        set_access_cookies(resp, access_token)
        set_refresh_cookies(resp, refresh_token)

        return resp, 200

    except Exception as exc:
        current_app.logger.exception(f"Error inesperado en /api/auth/login: {exc}")
        return jsonify({"msg": "Error interno al iniciar sesión"}), 500


def logout():
    resp = jsonify({"msg": "logout ok"})
    unset_jwt_cookies(resp)
    return resp, 200


def me():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    return jsonify({"user": user.to_dict()})


def send_verify_email_endpoint():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    if rate_limit_exceeded(
        rate_limit_key(request, "verify-send", user.email),
        current_app.config.get("AUTH_RATE_LIMIT_RESEND", 3),
        current_app.config.get("AUTH_RATE_LIMIT_WINDOW", 900),
    ):
        return jsonify({"msg": "Demasiados intentos. Probá más tarde."}), 429

    if user.email_verified:
        return jsonify({"ok": True, "msg": "Ya está verificado"}), 200

    token = secrets.token_urlsafe(32)
    user.email_verify_token = token
    user.email_verify_sent_at = datetime.utcnow()
    db.session.commit()

    frontend_base = os.getenv("FRONTEND_URL", "http://localhost:5173")
    verify_url = f"{frontend_base}/verify-email?token={token}"

    try:
        send_verify_code_email(user.email, verify_url, user.name)
    except Exception as exc:
        current_app.logger.exception(f"[MAIL] Error enviando verificación: {exc}")
        return jsonify({"msg": "No se pudo enviar el mail"}), 500

    return jsonify({"ok": True}), 200


def verify_email():
    data = request.get_json() or {}
    code = (data.get("code") or "").strip()
    if rate_limit_exceeded(
        rate_limit_key(request, "verify"),
        current_app.config.get("AUTH_RATE_LIMIT_VERIFY", 8),
        current_app.config.get("AUTH_RATE_LIMIT_WINDOW", 900),
    ):
        return jsonify({"msg": "Demasiados intentos. Probá más tarde."}), 429

    if not code or len(code) != 6 or not code.isdigit():
        return jsonify({"msg": "Código inválido"}), 400

    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    if user.email_verified:
        return jsonify({"ok": True, "already": True}), 200

    if not user.email_verify_code_hash:
        return jsonify({"msg": "No hay un código activo. Pedí reenviar."}), 400

    ok = check_password_hash(user.email_verify_code_hash, code)
    if not ok:
        return jsonify({"msg": "Código incorrecto"}), 400

    user.email_verified = True
    user.email_verify_code_hash = None
    user.email_verify_sent_at = None
    db.session.commit()

    return jsonify({"ok": True}), 200


def resend_verify():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    if rate_limit_exceeded(
        rate_limit_key(request, "verify-resend", user.email),
        current_app.config.get("AUTH_RATE_LIMIT_RESEND", 3),
        current_app.config.get("AUTH_RATE_LIMIT_WINDOW", 900),
    ):
        return jsonify({"msg": "Demasiados intentos. Probá más tarde."}), 429

    if user.email_verified:
        return jsonify({"ok": True, "already": True}), 200

    code = f"{secrets.randbelow(1_000_000):06d}"
    user.email_verify_code_hash = generate_password_hash(code)
    user.email_verify_sent_at = datetime.utcnow()
    db.session.commit()

    try:
        send_verify_code_email(user.email, code, user.name)
    except Exception as exc:
        current_app.logger.exception(f"[MAIL] Error enviando verificación: {exc}")

    return jsonify({"ok": True}), 200


def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=_claims_for(user),
    )

    resp = jsonify({"ok": True})
    set_access_cookies(resp, access_token)
    return resp, 200


def role():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id)) if user_id else None
    if not user:
        return jsonify({"msg": "Usuario no encontrado"}), 404
    return jsonify({"role": user.role}), 200


def forgot_password():
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        if rate_limit_exceeded(
            rate_limit_key(request, "forgot", email),
            current_app.config.get("AUTH_RATE_LIMIT_FORGOT", 5),
            current_app.config.get("AUTH_RATE_LIMIT_WINDOW", 900),
        ):
            return jsonify({"ok": True}), 200

        if not email:
            return jsonify({"msg": "Email es obligatorio"}), 400

        user = User.query.filter_by(email=email).first()

        if not user:
            return jsonify({"ok": True}), 200

        serializer = _get_reset_serializer()
        token = serializer.dumps({"uid": user.id, "email": user.email})

        front = os.getenv("FRONT_URL") or os.getenv("FRONTEND_URL") or "http://localhost:5173"
        reset_url = f"{front}/reset-password?token={token}"

        try:
            send_password_reset_email(user.email, user.name, reset_url)
        except Exception as exc:
            current_app.logger.exception(f"[MAIL] Error password reset: {exc}")
            return jsonify({"ok": True}), 200

        return jsonify({"ok": True}), 200

    except Exception as exc:
        current_app.logger.exception(f"[AUTH] forgot-password error: {exc}")
        return jsonify({"msg": "Error interno"}), 500


def reset_password():
    try:
        data = request.get_json() or {}
        token = (data.get("token") or "").strip()
        new_password = data.get("password") or ""
        if rate_limit_exceeded(
            rate_limit_key(request, "reset"),
            current_app.config.get("AUTH_RATE_LIMIT_RESET", 5),
            current_app.config.get("AUTH_RATE_LIMIT_WINDOW", 900),
        ):
            return jsonify({"msg": "Demasiados intentos. Probá más tarde."}), 429

        if not token:
            return jsonify({"msg": "Token requerido"}), 400

        if not new_password or len(new_password) < 8:
            return jsonify({"msg": "La contraseña debe tener al menos 8 caracteres"}), 400

        serializer = _get_reset_serializer()

        try:
            payload = serializer.loads(token, max_age=60 * 60)
        except SignatureExpired:
            return jsonify({"msg": "El link expiró. Pedí uno nuevo."}), 400
        except BadSignature:
            return jsonify({"msg": "Token inválido. Pedí uno nuevo."}), 400

        uid = payload.get("uid")
        email = payload.get("email")

        user = User.query.get(int(uid)) if uid else None
        if not user or user.email != email:
            return jsonify({"msg": "Token inválido. Pedí uno nuevo."}), 400

        user.set_password(new_password)
        db.session.commit()

        return jsonify({"ok": True}), 200

    except Exception as exc:
        current_app.logger.exception(f"[AUTH] reset-password error: {exc}")
        db.session.rollback()
        return jsonify({"msg": "Error interno"}), 500


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = get_jwt_identity()
        user = db.session.get(User, int(user_id)) if user_id else None
        if not user or user.role != "admin":
            return jsonify({"msg": "Admin requerido"}), 403
        return fn(*args, **kwargs)
    
    return wrapper