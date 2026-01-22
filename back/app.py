# app.py
from flask import Flask, jsonify, send_from_directory
import mercadopago  # type: ignore
import os
from functools import wraps
from flask_cors import CORS
from helpers import get_effective_price, parse_discount_percent
from flask_jwt_extended import JWTManager # type: ignore
from dotenv import load_dotenv
from config import Config
from models import User, db
from routes import admin_bp, auth_bp, orders_bp, payments_bp, products_bp
from flask_migrate import Migrate # type: ignore

                         
load_dotenv()  # 👈 carga las variables desde .env
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)
    frontend_url = os.getenv("FRONTEND_URL", "").rstrip("/")
    if not frontend_url:
        raise RuntimeError("FRONTEND_URL no configurado para CORS.")
    CORS(
        app,
        resources={r"/*": {"origins": [frontend_url]}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "X-CSRF-TOKEN"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )

    jwt = JWTManager(app)

    @jwt.unauthorized_loader
    def _missing_token(reason):
        return jsonify({"msg": "Falta el token de autorización"}), 401

    @jwt.invalid_token_loader
    def _invalid_token(reason):
        return jsonify({"msg": "Token inválido"}), 422

    @jwt.expired_token_loader
    def _expired_token(jwt_header, jwt_payload):
        return jsonify({"msg": "Token expirado"}), 401

    @jwt.revoked_token_loader
    def _revoked_token(jwt_header, jwt_payload):
        return jsonify({"msg": "Token revocado"}), 401
    
    @jwt.token_in_blocklist_loader
    def _token_in_blocklist(jwt_header, jwt_payload):
        user_id = jwt_payload.get("sub")
        token_version = jwt_payload.get("token_version")
        if not user_id:
            return True

        user = db.session.get(User, int(user_id))
        if not user:
            return True
        return int(user.token_version or 0) != int(token_version or 0)
    
    # app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "uploads")
    # app.config["MAX_UPLOAD_MB"] = int(os.getenv("MAX_UPLOAD_MB", "8"))
    # app.config["ALLOWED_MIME"] = {"image/jpeg", "image/png", "image/webp", "application/pdf"}

    mp_access_token = os.getenv("MP_ACCESS_TOKEN")

    if not mp_access_token:
        app.logger.warning("[MP] MP_ACCESS_TOKEN no configurado. Pagos reales deshabilitados.")
        mp_client = None
    else:
        app.logger.info("[MP] Inicializando cliente de Mercado Pago...")
        try:
            mp_client = mercadopago.SDK(mp_access_token)
            app.logger.info("[MP] Cliente de Mercado Pago inicializado correctamente.")

        except Exception as exc:
            app.logger.exception(f"[MP] Error al inicializar SDK de Mercado Pago: {exc!r}")
            mp_client = None

    app.config["MP_CLIENT"] = mp_client

    app.register_blueprint(products_bp)
    app.register_blueprint(orders_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)

    def _ensure_admin_user() -> None:
        admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
        admin_password = os.getenv("ADMIN_PASSWORD", "")
        admin_name = os.getenv("ADMIN_NAME", "Administrador")

        if not admin_email or not admin_password:
            app.logger.info("[ADMIN] ADMIN_EMAIL/ADMIN_PASSWORD no configurados. Seed omitido.")
            return

        try:
            user = User.query.filter_by(email=admin_email).first()
            if not user:
                base = admin_email.split("@")[0].strip().lower()
                username = base or "admin"
                suffix = 2
                while User.query.filter_by(username=username).first():
                    username = f"{base}{suffix}"
                    suffix += 1

                user = User(name=admin_name, email=admin_email, username=username, role="admin")
                user.set_password(admin_password)
                db.session.add(user)
                db.session.commit()
                app.logger.info("[ADMIN] Usuario admin creado: %s", admin_email)
                return

            if user.role != "admin":
                user.role = "admin"
                db.session.commit()
                app.logger.info("[ADMIN] Rol admin asegurado para %s", admin_email)
        except Exception as exc:
            app.logger.exception(f"[ADMIN] Error asegurando admin: {exc!r}")
            db.session.rollback()

    with app.app_context():
        _ensure_admin_user()

    @app.route("/uploads/products/<path:filename>")
    def product_uploads(filename: str):
        upload_dir = app.config["PRODUCT_UPLOAD_DIR"]
        return send_from_directory(upload_dir, filename)


    return app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True)
