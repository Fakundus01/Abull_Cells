"""add orders total amount check

Revision ID: 1c2c42f8e1b5
Revises: 4e7a3c1a0c9d
Create Date: 2026-01-19 06:05:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "1c2c42f8e1b5"
down_revision = "4e7a3c1a0c9d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_orders_total_amount_nonnegative",
        "orders",
        "total_amount >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_orders_total_amount_nonnegative", "orders", type_="check")