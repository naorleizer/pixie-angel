"""Merge migration heads

Revision ID: 27ecb6bf66a3
Revises: 9d3b1a1c2e3f, d0de0cea5bd7
Create Date: 2026-01-24 15:23:59.890255

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '27ecb6bf66a3'
down_revision = ('9d3b1a1c2e3f', 'd0de0cea5bd7')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
