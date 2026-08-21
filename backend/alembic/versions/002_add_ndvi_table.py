"""Add ndvi_data table for Sentinel-2 satellite sync

Revision ID: 002_ndvi
Revises: 001_initial_schema
Create Date: 2026-08-22
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_ndvi'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'ndvi_data',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('market', sa.String(), nullable=False),
        sa.Column('ndvi_mean', sa.Float(), nullable=False),
        sa.Column('date', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ndvi_data_market'), 'ndvi_data', ['market'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_ndvi_data_market'), table_name='ndvi_data')
    op.drop_table('ndvi_data')
