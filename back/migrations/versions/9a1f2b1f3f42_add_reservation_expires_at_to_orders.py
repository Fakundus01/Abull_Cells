"""add reservation expires at to orders

Revision ID: 9a1f2b1f3f42
Revises: 6f2e1d2a4b2d
Create Date: 2026-01-19 04:05:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "9a1f2b1f3f42"
down_revision = "6f2e1d2a4b2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("reservation_expires_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "reservation_expires_at")