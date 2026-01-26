"""add product images table

Revision ID: c2f0b5a7d1c0
Revises: b1c2d3e4f5a6
Create Date: 2025-02-14 00:00:00.000000
"""

from alembic import op #type: ignore
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c2f0b5a7d1c0"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "product_images",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=500), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_product_images_product_id"), "product_images", ["product_id"])


def downgrade():
    op.drop_index(op.f("ix_product_images_product_id"), table_name="product_images")
    op.drop_table("product_images")