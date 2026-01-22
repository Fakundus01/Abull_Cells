# config.py
import os
from datetime import timedelta
from urllib.parse import urlparse
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
    _frontend_url = (os.getenv("FRONTEND_URL", "") or "").strip().lower()
    _backend_url = (os.getenv("RENDER_EXTERNAL_URL", "") or "").strip().lower()

    _frontend_parsed = urlparse(_frontend_url) if _frontend_url else None
    _backend_parsed = urlparse(_backend_url) if _backend_url else None
    _frontend_host = _frontend_parsed.netloc if _frontend_parsed else ""
    _backend_host = _backend_parsed.netloc if _backend_parsed else ""
    _frontend_host = _frontend_host.split(":")[0]
    _backend_host = _backend_host.split(":")[0]

    def _base_domain(host: str) -> str:
        parts = [p for p in host.split(".") if p]
        if len(parts) < 2:
            return host
        return ".".join(parts[-2:])

    _frontend_is_https = _frontend_url.startswith("https://")
    _frontend_is_local = "localhost" in _frontend_url or "127.0.0.1" in _frontend_url
    _is_cross_site = bool(_frontend_host and _backend_host and _frontend_host != _backend_host)
    _shared_base_domain = ""
    if _frontend_host and _backend_host:
        frontend_base = _base_domain(_frontend_host)
        backend_base = _base_domain(_backend_host)
        if frontend_base == backend_base:
            _shared_base_domain = frontend_base
    _secure_default = _frontend_is_https and not _frontend_is_local

    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE")
    if not JWT_COOKIE_SAMESITE:
        JWT_COOKIE_SAMESITE = "None" if (_secure_default and _is_cross_site) else "Lax"

    _jwt_cookie_secure_env = os.getenv("JWT_COOKIE_SECURE")
    if _jwt_cookie_secure_env is None:
        JWT_COOKIE_SECURE = _secure_default
    else:
        JWT_COOKIE_SECURE = _jwt_cookie_secure_env.lower() == "true"
    JWT_COOKIE_DOMAIN = os.getenv("JWT_COOKIE_DOMAIN")
    if not JWT_COOKIE_DOMAIN:
        if _shared_base_domain and not _frontend_is_local:
            JWT_COOKIE_DOMAIN = f".{_shared_base_domain}"
        else:
            JWT_COOKIE_DOMAIN = None

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
