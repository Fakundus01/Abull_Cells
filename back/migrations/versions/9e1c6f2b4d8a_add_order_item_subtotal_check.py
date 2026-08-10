"""add order item subtotal check

Revision ID: 9e1c6f2b4d8a
Revises: 8d4b59f6a3f2
Create Date: 2026-01-19 07:05:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "9e1c6f2b4d8a"
down_revision = "8d4b59f6a3f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_order_items_subtotal_matches_price_qty",
        "order_items",
        "subtotal = unit_price * quantity",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_order_items_subtotal_matches_price_qty",
        "order_items",
        type_="check",
    )