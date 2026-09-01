"""Add email column to users table.

Revision ID: 004_add_user_email
Revises: 001_initial
Create Date: 2026-09-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# Revision identifiers, used by Alembic.
revision = '004_add_user_email'
down_revision = '51e4696a1f79'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add optional email column to users — existing rows will default to NULL.
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('email', sa.String(), nullable=True))
    op.create_index('ix_users_email', 'users', ['email'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_email', table_name='users')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('email')
