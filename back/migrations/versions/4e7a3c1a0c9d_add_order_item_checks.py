"""add order item checks

Revision ID: 4e7a3c1a0c9d
Revises: 78c93b3c2a11
Create Date: 2026-01-19 05:55:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "4e7a3c1a0c9d"
down_revision = "78c93b3c2a11"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_order_items_quantity_positive",
        "order_items",
        "quantity > 0",
    )
    op.create_check_constraint(
        "ck_order_items_unit_price_nonnegative",
        "order_items",
        "unit_price >= 0",
    )
    op.create_check_constraint(
        "ck_order_items_subtotal_nonnegative",
        "order_items",
        "subtotal >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_order_items_subtotal_nonnegative", "order_items", type_="check")
    op.drop_constraint("ck_order_items_unit_price_nonnegative", "order_items", type_="check")
    op.drop_constraint("ck_order_items_quantity_positive", "order_items", type_="check")