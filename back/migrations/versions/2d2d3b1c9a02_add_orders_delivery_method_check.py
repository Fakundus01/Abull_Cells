"""add orders delivery method check

Revision ID: 2d2d3b1c9a02
Revises: bf8f809cb00e
Create Date: 2026-01-19 06:25:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "2d2d3b1c9a02"
down_revision = "bf8f809cb00e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_orders_delivery_method_valid",
        "orders",
        "delivery_method IN ('pickup', 'delivery')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_orders_delivery_method_valid", "orders", type_="check")