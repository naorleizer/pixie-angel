"""merge multiple heads

Revision ID: 8e28fb9599c9
Revises: 7a1b2c3d4e5f, c8325b5cdee5
Create Date: 2026-01-17 15:29:10.605085

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8e28fb9599c9'
down_revision = ('7a1b2c3d4e5f', 'c8325b5cdee5')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
