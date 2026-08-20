"""Initial schema for users, alert subscriptions, and alert logs.

Revision ID: 001_initial
Revises: 
Create Date: 2026-08-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('mobile_number', sa.String(), unique=True, index=True, nullable=False),
        sa.Column('full_name', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('role', sa.String(), nullable=False, server_default='farmer'),
        sa.Column('home_mandi', sa.String(), nullable=False, server_default='Azadpur'),
        sa.Column('preferred_commodity', sa.String(), nullable=False, server_default='Tomato'),
        sa.Column('language', sa.String(), nullable=False, server_default='en'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )

    # Create alert_subscriptions table
    op.create_table(
        'alert_subscriptions',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('mobile_number', sa.String(), nullable=False, index=True),
        sa.Column('telegram_chat_id', sa.String(), nullable=True),
        sa.Column('channel', sa.String(), nullable=False, server_default='whatsapp'),
        sa.Column('crop', sa.String(), nullable=False, server_default='Potato'),
        sa.Column('mandi', sa.String(), nullable=False, server_default='Agra'),
        sa.Column('delivery_time', sa.String(), nullable=False, server_default='07:00 AM'),
        sa.Column('language', sa.String(), nullable=False, server_default='hi'),
        sa.Column('is_active', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('last_dispatched_at', sa.DateTime(), nullable=True),
    )

    # Create alert_logs table
    op.create_table(
        'alert_logs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('subscription_id', sa.Integer(), sa.ForeignKey('alert_subscriptions.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('recipient', sa.String(), nullable=False),
        sa.Column('channel', sa.String(), nullable=False),
        sa.Column('crop', sa.String(), nullable=False),
        sa.Column('mandi', sa.String(), nullable=False),
        sa.Column('message_text', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False, server_default='success'),
        sa.Column('dispatched_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('alert_logs')
    op.drop_table('alert_subscriptions')
    op.drop_table('users')
