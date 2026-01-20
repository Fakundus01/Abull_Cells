"""add product stock nonnegative check

Revision ID: 78c93b3c2a11
Revises: 3b6d6f8f0e14
Create Date: 2026-01-19 05:45:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "78c93b3c2a11"
down_revision = "3b6d6f8f0e14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_products_stock_nonnegative",
        "products",
        "stock >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_products_stock_nonnegative", "products", type_="check")