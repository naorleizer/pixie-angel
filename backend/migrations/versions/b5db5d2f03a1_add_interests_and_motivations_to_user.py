"""add interests and motivations to user

Revision ID: b5db5d2f03a1
Revises: 33c7922a4f37
Create Date: 2026-01-23 12:20:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b5db5d2f03a1'
down_revision = '33c7922a4f37'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('interests', sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column('motivations', sa.JSON(), nullable=True))


def downgrade():
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('motivations')
        batch_op.drop_column('interests')
