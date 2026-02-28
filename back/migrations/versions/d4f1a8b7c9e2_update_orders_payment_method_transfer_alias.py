"""update orders payment method to transfer alias

Revision ID: d4f1a8b7c9e2
Revises: c2f0b5a7d1c0
Create Date: 2026-02-28 00:00:00.000000

"""
from __future__ import annotations

from alembic import op  # type: ignore


# revision identifiers, used by Alembic.
revision = "d4f1a8b7c9e2"
down_revision = "c2f0b5a7d1c0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET payment_method = 'transferencia_alias'
        WHERE payment_method = 'mercadopago'
        """
    )
    op.drop_constraint("ck_orders_payment_method_valid", "orders", type_="check")
    op.create_check_constraint(
        "ck_orders_payment_method_valid",
        "orders",
        "payment_method IN ('efectivo', 'transferencia_alias', 'tarjeta')",
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE orders
        SET payment_method = 'mercadopago'
        WHERE payment_method = 'transferencia_alias'
        """
    )
    op.drop_constraint("ck_orders_payment_method_valid", "orders", type_="check")
    op.create_check_constraint(
        "ck_orders_payment_method_valid",
        "orders",
        "payment_method IN ('efectivo', 'mercadopago', 'tarjeta')",
    )