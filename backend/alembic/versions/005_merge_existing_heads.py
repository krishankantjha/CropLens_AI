"""Merge the existing schema migration branches.

Revision ID: 005_merge_existing_heads
Revises: 003_ndvi_unique, 004_add_user_email
Create Date: 2026-09-01

This revision intentionally performs no schema operations. It joins the NDVI
and user-email branches after both branches have applied their own changes,
leaving one canonical Alembic head without rewriting released revision IDs.
"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "005_merge_existing_heads"
down_revision: Union[str, Sequence[str], None] = (
    "003_ndvi_unique",
    "004_add_user_email",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge existing migration branches; no schema operation is required."""


def downgrade() -> None:
    """Re-expose the two historical heads when downgrading past the merge."""
