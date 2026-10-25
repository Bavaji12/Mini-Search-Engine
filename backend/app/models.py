"""
Database Models (SQLAlchemy ORM)
Documents, Search Logs, and Index Metadata for PostgreSQL.
"""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class DocumentModel(Base):
    """Stores source documents with metadata in PostgreSQL."""
    __tablename__ = "documents"

    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    author = Column(String(128), nullable=True)
    category = Column(String(64), nullable=True, index=True)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class SearchLogModel(Base):
    """Stores query execution history and latency telemetry."""
    __tablename__ = "search_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    query = Column(String(255), nullable=False, index=True)
    algorithm = Column(String(32), nullable=False)  # 'bm25', 'tfidf', 'phrase'
    match_count = Column(Integer, nullable=False)
    latency_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
