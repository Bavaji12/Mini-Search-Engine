"""
Pydantic v2 validation schemas for API requests and responses.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Document title")
    content: str = Field(..., min_length=1, description="Raw document text to index")
    author: Optional[str] = Field(None, max_length=128)
    category: Optional[str] = Field("General", max_length=64)


class DocumentCreate(DocumentBase):
    id: Optional[str] = Field(None, description="Optional custom ID. Auto-generated if omitted.")


class DocumentUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    author: Optional[str] = None
    category: Optional[str] = None


class DocumentResponse(DocumentBase):
    id: str
    token_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SearchResultItem(BaseModel):
    id: str
    title: str
    snippet: str
    score: float
    category: Optional[str]
    token_count: int
    score_breakdown: Optional[Dict[str, Any]] = None


class SearchResponse(BaseModel):
    query: str
    algorithm: str
    total_matches: int
    latency_ms: float
    page: int
    page_size: int
    results: List[SearchResultItem]


class IndexStats(BaseModel):
    total_documents: int
    total_vocabulary_terms: int
    total_postings: int
    avg_document_length: float
    total_queries_executed: int
    avg_latency_ms: float


class PostingDetail(BaseModel):
    doc_id: str
    term_frequency: int
    positions: List[int]


class TermPostingResponse(BaseModel):
    term: str
    document_frequency: int
    postings: List[PostingDetail]
