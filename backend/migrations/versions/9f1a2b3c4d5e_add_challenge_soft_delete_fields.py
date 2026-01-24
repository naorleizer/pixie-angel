"""Add soft-delete fields to Challenge

Revision ID: 9f1a2b3c4d5e
Revises: 2087e23832fb
Create Date: 2026-01-24 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9f1a2b3c4d5e'
down_revision = '2087e23832fb'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('challenge', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text('0')))
        batch_op.add_column(sa.Column('deleted_at', sa.DateTime(), nullable=True))
    # Remove server default so future rows rely on ORM default
    with op.batch_alter_table('challenge', schema=None) as batch_op:
        batch_op.alter_column('is_deleted', server_default=None)


def downgrade():
    with op.batch_alter_table('challenge', schema=None) as batch_op:
        batch_op.drop_column('deleted_at')
        batch_op.drop_column('is_deleted')
