"""add stock reserved to orders

Revision ID: 6f2e1d2a4b2d
Revises: a3fea3ac7a97
Create Date: 2026-01-19 03:10:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "6f2e1d2a4b2d"
down_revision = "a3fea3ac7a97"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("stock_reserved", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.alter_column("orders", "stock_reserved", server_default=None)


def downgrade() -> None:
    op.drop_column("orders", "stock_reserved")