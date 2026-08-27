"""Align NDVI uniqueness with the ORM contract.

Revision ID: 003_ndvi_unique
Revises: 002_ndvi
"""

from typing import Sequence, Union

from alembic import op


revision: str = "003_ndvi_unique"
down_revision: Union[str, None] = "002_ndvi"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Prevent duplicate NDVI observations for the same market and date."""
    op.create_index(
        "uq_ndvi_data_market_date",
        "ndvi_data",
        ["market", "date"],
        unique=True,
    )


def downgrade() -> None:
    """Remove the composite uniqueness index."""
    op.drop_index("uq_ndvi_data_market_date", table_name="ndvi_data")
