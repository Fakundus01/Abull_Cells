"""add is_active to products

Revision ID: b1c2d3e4f5a6
Revises: 73592e6159a5
Create Date: 2025-01-19 00:00:00.000000
"""
from alembic import op #type: ignore
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b1c2d3e4f5a6"
down_revision = "73592e6159a5"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "products",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.create_index("ix_products_is_active", "products", ["is_active"])


def downgrade():
    op.drop_index("ix_products_is_active", table_name="products")
    op.drop_column("products", "is_active")