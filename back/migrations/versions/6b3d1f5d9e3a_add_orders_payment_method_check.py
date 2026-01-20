"""add orders payment method check

Revision ID: 6b3d1f5d9e3a
Revises: 2d2d3b1c9a02
Create Date: 2026-01-19 06:35:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "6b3d1f5d9e3a"
down_revision = "2d2d3b1c9a02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_orders_payment_method_valid",
        "orders",
        "payment_method IN ('efectivo', 'mercadopago', 'tarjeta')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_orders_payment_method_valid", "orders", type_="check")