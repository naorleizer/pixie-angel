"""Increase password_hash column length

Revision ID: 6a7b8c9d0e1f
Revises: 5f157178c1f5
Create Date: 2026-01-27 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6a7b8c9d0e1f'
down_revision = '5f157178c1f5'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('password_hash',
               existing_type=sa.VARCHAR(128),
               type_=sa.VARCHAR(256),
               existing_nullable=True)


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.alter_column('password_hash',
               existing_type=sa.VARCHAR(256),
               type_=sa.VARCHAR(128),
               existing_nullable=True)
