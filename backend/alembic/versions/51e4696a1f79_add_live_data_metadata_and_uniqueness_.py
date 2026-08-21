"""Add live data metadata and uniqueness indexes.

Revision ID: 51e4696a1f79
Revises: ca5c9b8af625
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "51e4696a1f79"
down_revision: Union[str, None] = "ca5c9b8af625"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    market_columns = {column["name"] for column in inspector.get_columns("market_data")}

    additions = {
        "state": sa.String(),
        "district": sa.String(),
        "variety": sa.String(),
        "grade": sa.String(),
        "min_price": sa.Float(),
        "max_price": sa.Float(),
    }
    for name, column_type in additions.items():
        if name not in market_columns:
            op.add_column(
                "market_data",
                sa.Column(name, column_type, nullable=True),
            )

    index_names = {
        index["name"] for index in inspector.get_indexes("market_data")
    }
    if "uq_market_data_commodity_market_date" not in index_names:
        op.create_index(
            "uq_market_data_commodity_market_date",
            "market_data",
            ["commodity", "market", "date"],
            unique=True,
        )

    weather_index_names = {
        index["name"] for index in inspector.get_indexes("weather_data")
    }
    if "uq_weather_data_market_date" not in weather_index_names:
        op.create_index(
            "uq_weather_data_market_date",
            "weather_data",
            ["market", "date"],
            unique=True,
        )


def downgrade() -> None:
    op.drop_index("uq_weather_data_market_date", table_name="weather_data")
    op.drop_index("uq_market_data_commodity_market_date", table_name="market_data")
    op.drop_column("market_data", "max_price")
    op.drop_column("market_data", "min_price")
    op.drop_column("market_data", "grade")
    op.drop_column("market_data", "variety")
    op.drop_column("market_data", "district")
    op.drop_column("market_data", "state")
