"""merge heads

Revision ID: 73592e6159a5
Revises: 5a7f5bf9b2d0, 9e1c6f2b4d8a
Create Date: 2026-01-20 12:29:56.590534

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '73592e6159a5'
down_revision = ('5a7f5bf9b2d0', '9e1c6f2b4d8a')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass