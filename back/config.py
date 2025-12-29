# config.py
import os
BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SQLALCHEMY_DATABASE_URI = (
        os.getenv("DATABASE_URL")
        or f"sqlite:///{os.path.join(BASE_DIR, 'app.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Claves para sesiones/JWT (para dev, después las pasamos a variables de entorno)
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-abulcells")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-abulcells")
