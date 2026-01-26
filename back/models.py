# models.py
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event, inspect
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime


db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    # ✅ Datos básicos
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(200), unique=True, nullable=False, index=True)
    username = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user")  # "admin" | "user"
    token_version = db.Column(db.Integer, default=0, nullable=False)

    # ✅ Verificación de email
   
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    email_verify_code_hash = db.Column(db.String(255), nullable=True)
    email_verify_code_sent_at = db.Column(db.DateTime, nullable=True)
    email_verify_token = db.Column(db.String(120), nullable=True, index=True)
    email_verify_sent_at = db.Column(db.DateTime, nullable=True)

    # ✅ Datos de perfil (para checkout/envíos)
    dni = db.Column(db.String(30), nullable=True)
    phone = db.Column(db.String(40), nullable=True)
    recovery_email = db.Column(db.String(200), nullable=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "username": self.username,
            "tokenVersion": self.token_version,
            "emailVerified": bool(self.email_verified),
            "dni": self.dni,
            "phone": self.phone,
            "recoveryEmail": self.recovery_email,
        }


@event.listens_for(User, "before_update")
def _bump_user_token_version(mapper, connection, target) -> None:
    state = inspect(target)
    if state.attrs.role.history.has_changes():
        target.token_version = int(target.token_version or 0) + 1


class Product(db.Model):
    __tablename__ = "products"
    __table_args__ = (
        db.CheckConstraint("stock >= 0", name="ck_products_stock_nonnegative"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    slug = db.Column(db.String(200), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(100), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    is_offer = db.Column(db.Boolean, default=False)
    offer_label = db.Column(db.String(100), nullable=True)
    stock = db.Column(db.Integer, default=0)
    is_active = db.Column(
        db.Boolean, nullable=False, default=True, server_default="true", index=True
    )

    def to_dict(self):
        image_url = self.image_url
        if image_url and not image_url.startswith(("http://", "https://", "/")):
            image_url = f"/uploads/products/{image_url}"
        return {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "description": self.description,
            "price": self.price,
            "category": self.category,
            "imageUrl": image_url,
            "is_active": bool(self.is_active),
            "isActive": bool(self.is_active),
            "isOffer": self.is_offer,
            "offerLabel": self.offer_label,
            "stock": self.stock,
        }
    
class Order(db.Model):
    __tablename__ = "orders"
    __table_args__ = (
        db.CheckConstraint("total_amount >= 0", name="ck_orders_total_amount_nonnegative"),
        db.CheckConstraint(
            "status IN ('pending', 'pending_payment', 'paid', 'cancelled')",
            name="ck_orders_status_valid",
        ),
        db.CheckConstraint(
            "delivery_method IN ('pickup', 'delivery')",
            name="ck_orders_delivery_method_valid",
        ),
        db.CheckConstraint(
            "payment_method IN ('efectivo', 'mercadopago', 'tarjeta')",
            name="ck_orders_payment_method_valid",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(200), nullable=False)
    email = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(50), nullable=True)
    email_sent_paid = db.Column(db.Boolean, default=False)
    delivery_method = db.Column(db.String(20), default="pickup")  # pickup | delivery
    delivery_address = db.Column(db.Text, nullable=True)  # snapshot JSON


    notes = db.Column(db.Text, nullable=True)

    # 🔹 NUEVO: método de pago
    payment_method = db.Column(db.String(50), nullable=False, default="tarjeta")

    stock_reserved = db.Column(db.Boolean, default=False, nullable=False)
    reservation_expires_at = db.Column(db.DateTime, nullable=True)

    total_amount = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(50), default="pending")  # pending, paid, cancelled, etc.

    # 🔹 NUEVO: detalles básicos de pago
    payment_brand = db.Column(db.String(50))   # Visa, Mastercard, etc.
    payment_last4 = db.Column(db.String(4))    # últimos 4
    payment_txid = db.Column(db.String(100))   # id de transacción (simulado)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    items = db.relationship("OrderItem", backref="order", lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "customerName": self.customer_name,
            "email": self.email,
            "phone": self.phone,
            "notes": self.notes,
            "paymentMethod": self.payment_method,
            "paymentBrand": self.payment_brand,
            "paymentLast4": self.payment_last4,
            "paymentTxId": self.payment_txid,
            "totalAmount": self.total_amount,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "reservationExpiresAt": (
                self.reservation_expires_at.isoformat()
                if self.reservation_expires_at
                else None
            ),
            "items": [item.to_dict() for item in self.items],
        }

class OrderItem(db.Model):
    __tablename__ = "order_items"
    __table_args__ = (
        db.CheckConstraint("quantity > 0", name="ck_order_items_quantity_positive"),
        db.CheckConstraint("unit_price >= 0", name="ck_order_items_unit_price_nonnegative"),
        db.CheckConstraint("subtotal >= 0", name="ck_order_items_subtotal_nonnegative"),
        db.CheckConstraint(
            "subtotal = unit_price * quantity",
            name="ck_order_items_subtotal_matches_price_qty",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)

    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=True)
    product_name = db.Column(db.String(200), nullable=False)
    unit_price = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    subtotal = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "productId": self.product_id,
            "productName": self.product_name,
            "unitPrice": self.unit_price,
            "quantity": self.quantity,
            "subtotal": self.subtotal,
        }

class Address(db.Model):
    __tablename__ = "addresses"
    __table_args__ = (
        db.CheckConstraint(
            "type IN ('house', 'apartment', 'office', 'other')",
            name="ck_addresses_type_valid",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    label = db.Column(db.String(80), nullable=False)  # Casa, Trabajo, etc.
    type = db.Column(db.String(20), default="house")
    street = db.Column(db.String(200), nullable=False)
    city = db.Column(db.String(120), nullable=False)
    province = db.Column(db.String(120), nullable=False)
    postal_code = db.Column(db.String(20), nullable=True)

    apartment = db.Column(db.String(20), nullable=True)
    floor = db.Column(db.String(20), nullable=True)
    bell = db.Column(db.String(60), nullable=True)
    notes = db.Column(db.String(255), nullable=True)

    is_default = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, server_default=db.func.now())

    user = db.relationship("User", backref=db.backref("addresses", lazy=True))

    def to_dict(self):
        return {
            "id": self.id,
            "label": self.label,
            "type": self.type,
            "street": self.street,
            "city": self.city,
            "province": self.province,
            "postalCode": self.postal_code,
            "apartment": self.apartment,
            "floor": self.floor,
            "bell": self.bell,
            "notes": self.notes,
            "isDefault": self.is_default,
        }
# --- FIN DE models.py ---
