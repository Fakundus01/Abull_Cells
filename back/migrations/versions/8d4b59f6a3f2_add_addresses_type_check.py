"""add addresses type check

Revision ID: 8d4b59f6a3f2
Revises: 7fb8b42c21c1
Create Date: 2026-01-19 06:55:00.000000

"""
from __future__ import annotations

from alembic import op #type: ignore


# revision identifiers, used by Alembic.
revision = "8d4b59f6a3f2"
down_revision = "7fb8b42c21c1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_check_constraint(
        "ck_addresses_type_valid",
        "addresses",
        "type IN ('house', 'apartment', 'office', 'other')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_addresses_type_valid", "addresses", type_="check")