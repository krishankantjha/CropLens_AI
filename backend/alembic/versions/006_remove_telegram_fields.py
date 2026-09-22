"""Remove Telegram fields from alert subscriptions.

Revision ID: 006_remove_telegram_fields
Revises: 005_merge_existing_heads
Create Date: 2026-09-18
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "006_remove_telegram_fields"
down_revision: Union[str, Sequence[str], None] = "005_merge_existing_heads"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE alert_subscriptions "
            "SET channel = 'whatsapp' "
            "WHERE channel IN ('telegram', 'both')"
        )
    )
    with op.batch_alter_table("alert_subscriptions", schema=None) as batch_op:
        batch_op.drop_column("telegram_chat_id")


def downgrade() -> None:
    with op.batch_alter_table("alert_subscriptions", schema=None) as batch_op:
        batch_op.add_column(sa.Column("telegram_chat_id", sa.String(), nullable=True))
