"""add orders status check

Revision ID: 5a7f5bf9b2d0
Revises: 1c2c42f8e1b5
Create Date: 2026-01-19 06:15:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "5a7f5bf9b2d0"
down_revision = "1c2c42f8e1b5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_orders_status_valid",
        "orders",
        "status IN ('pending', 'pending_payment', 'paid', 'cancelled')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_orders_status_valid", "orders", type_="check")