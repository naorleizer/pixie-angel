"""merge persona quiz and challenge soft delete heads

Revision ID: d0de0cea5bd7
Revises: 1b2c3d4e5f6a, 9f1a2b3c4d5e
Create Date: 2026-01-24 13:02:14.475953

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd0de0cea5bd7'
down_revision = ('1b2c3d4e5f6a', '9f1a2b3c4d5e')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
