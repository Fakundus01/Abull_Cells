# config.py
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    SECRET_KEY = os.getenv("SECRET_KEY")
    #SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/abul_cells",
    )
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

    # ✅ Tokens en cookies (no en headers)
    JWT_TOKEN_LOCATION = ["cookies"]

    # ✅ Nombres de cookies
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_REFRESH_COOKIE_NAME = "refresh_token_cookie"

    # ✅ CSRF Protection (obligatorio si usás cookies)
    JWT_COOKIE_CSRF_PROTECT = True
    JWT_ACCESS_CSRF_COOKIE_NAME = "csrf_access_token"
    JWT_REFRESH_CSRF_COOKIE_NAME = "csrf_refresh_token"

    # ✅ Cookies seguras
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_DOMAIN = os.getenv("JWT_COOKIE_DOMAIN") or None

    # Opcional: tiempos (ajustalos a gusto)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)        # ✅ 2 horas
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=14)       # ✅ 14 días (ok)

    #✅ Configuraciones de subida de archivos
    MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "8"))
    ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    
    UPLOAD_STORAGE_BACKEND = os.getenv("UPLOAD_STORAGE_BACKEND", "local").lower()
    UPLOAD_TEMP_DIR = os.getenv("UPLOAD_TEMP_DIR", "/tmp/abul_cells_uploads")
    UPLOAD_BUCKET = os.getenv("UPLOAD_BUCKET", "")
    UPLOAD_PREFIX = os.getenv("UPLOAD_PREFIX", "contact-uploads/")
    UPLOAD_PUBLIC_BASE_URL = os.getenv("UPLOAD_PUBLIC_BASE_URL", "")

    PRODUCT_UPLOAD_DIR = os.getenv(
        "PRODUCT_UPLOAD_DIR",
        os.path.join(BASE_DIR, "uploads", "products"),
    )
    PRODUCT_IMAGE_BASE_URL = os.getenv("PRODUCT_IMAGE_BASE_URL", "/uploads/products")
    ALLOWED_PRODUCT_IMAGE_MIME = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    ORDER_RESERVATION_MINUTES = int(os.getenv("ORDER_RESERVATION_MINUTES", "30"))

    AUTH_RATE_LIMIT_WINDOW = int(os.getenv("AUTH_RATE_LIMIT_WINDOW", "900"))
    AUTH_RATE_LIMIT_LOGIN = int(os.getenv("AUTH_RATE_LIMIT_LOGIN", "10"))
    AUTH_RATE_LIMIT_REGISTER = int(os.getenv("AUTH_RATE_LIMIT_REGISTER", "5"))
    AUTH_RATE_LIMIT_FORGOT = int(os.getenv("AUTH_RATE_LIMIT_FORGOT", "5"))
    AUTH_RATE_LIMIT_RESET = int(os.getenv("AUTH_RATE_LIMIT_RESET", "5"))
    AUTH_RATE_LIMIT_VERIFY = int(os.getenv("AUTH_RATE_LIMIT_VERIFY", "8"))
    AUTH_RATE_LIMIT_RESEND = int(os.getenv("AUTH_RATE_LIMIT_RESEND", "3"))
