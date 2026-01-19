from __future__ import annotations

from datetime import datetime

from sqlalchemy import update

from models import Order, Product, db


def release_order_reservation(order: Order) -> None:
    for item in order.items or []:
        db.session.execute(
            update(Product)
            .where(Product.id == item.product_id)
            .values(stock=Product.stock + int(item.quantity or 0))
        )

    order.stock_reserved = False
    order.status = "cancelled"
    order.reservation_expires_at = None


def release_expired_reservations(now: datetime | None = None) -> int:
    now = now or datetime.utcnow()
    expired_orders = (
        Order.query.filter(
            Order.stock_reserved.is_(True),
            Order.reservation_expires_at.isnot(None),
            Order.reservation_expires_at <= now,
            Order.status.in_(["pending_payment", "pending"]),
        )
        .all()
    )

    if not expired_orders:
        return 0

    for order in expired_orders:
        release_order_reservation(order)

    db.session.commit()
    return len(expired_orders)