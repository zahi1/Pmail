# Migration to add deadline column to jobs table

from backend.models.database import db
from sqlalchemy import Column, DateTime
from alembic import op
import sqlalchemy as sa

def upgrade():
    """Add deadline column to jobs table"""
    op.add_column('jobs', sa.Column('deadline', sa.DateTime, nullable=True))
    print("Added deadline column to jobs table")

def downgrade():
    """Remove deadline column from jobs table"""
    op.drop_column('jobs', 'deadline')
    print("Removed deadline column from jobs table")
