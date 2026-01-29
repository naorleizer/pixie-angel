"""add persona quiz completion flag

Revision ID: 1b2c3d4e5f6a
Revises: 2087e23832fb
Create Date: 2026-01-18 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1b2c3d4e5f6a'
down_revision = 'b5db5d2f03a1'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'users',
        sa.Column('has_completed_persona_quiz', sa.Boolean(), server_default=sa.text('FALSE'), nullable=False)
    )
    # Backfill explicit False for existing rows (safety for databases that ignore server_default on add_column)
    op.execute("UPDATE users SET has_completed_persona_quiz = FALSE WHERE has_completed_persona_quiz IS NULL")


def downgrade():
    op.drop_column('users', 'has_completed_persona_quiz')
