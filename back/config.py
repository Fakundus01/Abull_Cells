# config.py
import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///app.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-dev-secret")

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
    JWT_COOKIE_SAMESITE = "Lax" # para ecommerce suele ir bien
    JWT_COOKIE_SECURE = False    # EN PRODUCCIÓN: True (requiere HTTPS)
    JWT_COOKIE_DOMAIN = None     # en prod podés setear tu dominio

    # Opcional: tiempos (ajustalos a gusto)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)        # ✅ 2 horas
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=14)       # ✅ 14 días (ok)
