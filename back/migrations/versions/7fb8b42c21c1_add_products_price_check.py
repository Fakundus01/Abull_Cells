"""add products price check

Revision ID: 7fb8b42c21c1
Revises: 6b3d1f5d9e3a
Create Date: 2026-01-19 06:45:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "7fb8b42c21c1"
down_revision = "6b3d1f5d9e3a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_products_price_nonnegative",
        "products",
        "price >= 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_products_price_nonnegative", "products", type_="check")