from routes.admin import admin_bp
from routes.auth import auth_bp
from routes.orders import orders_bp
from routes.payments import payments_bp
from routes.products import products_bp

__all__ = [
    "admin_bp",
    "auth_bp",
    "orders_bp",
    "payments_bp",
    "products_bp",
]