# init_db.py
from app import create_app
from models import db, User

app = create_app()

with app.app_context():
    print("Recreando base de datos...")
    db.drop_all()
    db.create_all()

    # --- Usuario admin por defecto ---
    admin = User(
        name="Abul Admin",
        email="Abulcell185@gmail.com",
        username="Abulcell185",
        role="admin",
    )
    admin.set_password("Kassadin01")  # contraseña de ejemplo
    db.session.add(admin)

    db.session.commit()
    print("Base de datos inicializada solo con usuario admin.")
