# init_db.py
from app import create_app
from models import db, Product, User

app = create_app()

with app.app_context():
    print("Recreando base de datos...")
    db.drop_all()
    db.create_all()

    # --- Usuario admin por defecto ---
    admin = User(
        name="Facundo Moreno",
        email="facumoreno2001@gmail.com",
        username="Facundomoreno",
        role="admin",
    )
    admin.set_password("Kassadin01")  # contraseña de ejemplo
    db.session.add(admin)

    # --- Productos de ejemplo ---
    sample_products = [
        Product(
            name="Samsung Galaxy A54",
            slug="samsung-galaxy-a54",
            description="Pantalla Super AMOLED, 8GB RAM, 256GB almacenamiento.",
            price=450000,
            category="Celulares",
            image_url="https://images.pexels.com/photos/47261/pexels-photo-47261.jpeg?auto=compress&cs=tinysrgb&w=800",
            is_offer=True,
            offer_label="10% OFF",
            stock=10,
        ),
        Product(
            name="iPhone 14 Pro",
            slug="iphone-14-pro",
            description="Última generación, ideal para fotografía y video.",
            price=950000,
            category="Celulares",
            image_url="https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=800",
            is_offer=False,
            stock=5,
        ),
        Product(
            name="Notebook Gamer Lenovo",
            slug="notebook-gamer-lenovo",
            description="RTX 4060, 16GB RAM, SSD 1TB. Lista para jugar.",
            price=1200000,
            category="Notebooks",
            image_url="https://images.pexels.com/photos/160107/pexels-photo-160107.jpeg?auto=compress&cs=tinysrgb&w=800",
            is_offer=True,
            offer_label="OFERTA",
            stock=3,
        ),
        Product(
            name="Auriculares Bluetooth JBL",
            slug="auriculares-bluetooth-jbl",
            description="Sonido potente, batería de larga duración.",
            price=95000,
            category="Accesorios",
            image_url="https://images.pexels.com/photos/3394664/pexels-photo-3394664.jpeg?auto=compress&cs=tinysrgb&w=800",
            is_offer=False,
            stock=20,
        ),
    ]

    db.session.add_all(sample_products)
    db.session.commit()
    print("Base de datos inicializada con usuario admin + productos de ejemplo.")
