"""add user location and preference flags

Revision ID: 9d3b1a1c2e3f
Revises: 2087e23832fb
Create Date: 2026-01-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '9d3b1a1c2e3f'
down_revision = '2087e23832fb'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('location_enabled', sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column('interests_and_motivation_enabled', sa.Boolean(), nullable=True, server_default=sa.false()))
        batch_op.add_column(sa.Column('communication_style', sa.Boolean(), nullable=True, server_default=sa.false()))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('communication_style')
        batch_op.drop_column('interests_and_motivation_enabled')
        batch_op.drop_column('location_enabled')
