"""add user token version

Revision ID: 3b6d6f8f0e14
Revises: 9a1f2b1f3f42
Create Date: 2026-01-19 05:20:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "3b6d6f8f0e14"
down_revision = "9a1f2b1f3f42"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("users", "token_version", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "token_version")