"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-06-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("password", sa.String(255), nullable=True),
        sa.Column("provider", sa.String(50), server_default="local"),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_users_email", "users", ["email"])

    op.create_table(
        "workbooks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("file_size", sa.BigInteger, nullable=False),
        sa.Column("file_url", sa.Text, nullable=False),
        sa.Column("status", sa.String(50), server_default="processing"),
        sa.Column("sheet_count", sa.Integer, server_default="0"),
        sa.Column("row_count", sa.BigInteger, server_default="0"),
        sa.Column("meta", JSONB, server_default="{}"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_workbooks_user_id", "workbooks", ["user_id"])

    op.create_table(
        "sheets",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workbook_id", UUID(as_uuid=True), sa.ForeignKey("workbooks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("index", sa.Integer, nullable=False),
        sa.Column("row_count", sa.Integer, server_default="0"),
        sa.Column("col_count", sa.Integer, server_default="0"),
        sa.Column("columns", JSONB, server_default="[]"),
        sa.Column("data", JSONB, nullable=True),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_sheets_workbook_id", "sheets", ["workbook_id"])

    op.create_table(
        "dashboards",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workbook_id", UUID(as_uuid=True), sa.ForeignKey("workbooks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("layout", JSONB, server_default="[]"),
        sa.Column("is_public", sa.Boolean, server_default="false"),
        sa.Column("share_token", sa.String(64), unique=True, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_dashboards_workbook_id", "dashboards", ["workbook_id"])

    op.create_table(
        "charts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("dashboard_id", UUID(as_uuid=True), sa.ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sheet_id", UUID(as_uuid=True), sa.ForeignKey("sheets.id"), nullable=True),
        sa.Column("title", sa.String(255), nullable=True),
        sa.Column("chart_type", sa.String(50), nullable=False),
        sa.Column("config", JSONB, nullable=False),
        sa.Column("position", JSONB, server_default="{}"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_charts_dashboard_id", "charts", ["dashboard_id"])

    op.create_table(
        "formulas",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("sheet_id", UUID(as_uuid=True), sa.ForeignKey("sheets.id"), nullable=True),
        sa.Column("expression", sa.Text, nullable=False),
        sa.Column("result", JSONB, nullable=True),
        sa.Column("explanation", sa.Text, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_formulas_user_id", "formulas", ["user_id"])

    op.create_table(
        "chat_messages",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("workbook_id", UUID(as_uuid=True), sa.ForeignKey("workbooks.id"), nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("metadata", JSONB, server_default="{}"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_chat_messages_user", "chat_messages", ["user_id", "workbook_id"])


def downgrade() -> None:
    op.drop_table("chat_messages")
    op.drop_table("formulas")
    op.drop_table("charts")
    op.drop_table("dashboards")
    op.drop_table("sheets")
    op.drop_table("workbooks")
    op.drop_table("users")
