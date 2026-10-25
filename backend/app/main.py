"""
FastAPI Main Application
Production-ready REST API for Mini Search Engine.
"""

import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.app.config import settings
from backend.app.database import get_db, engine
from backend.app.models import Base, DocumentModel, SearchLogModel
from backend.app.schemas import (
    DocumentCreate, DocumentUpdate, DocumentResponse,
    SearchResponse, SearchResultItem, IndexStats, TermPostingResponse, PostingDetail
)
from backend.app.indexer import InvertedIndex

# Global In-Memory Inverted Index
# Synchronized with PostgreSQL persistence
index = InvertedIndex(remove_stopwords=True)

# Performance telemetry counters
search_counter = 0
total_search_time_ms = 0.0


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes DB tables and bootstraps the inverted index from PostgreSQL."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Full-text search engine with inverted index, positional phrase matching, and TF-IDF/BM25 ranking.",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- DOCUMENT ENDPOINTS ---

@app.post("/api/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(doc_in: DocumentCreate, db: AsyncSession = Depends(get_db)):
    doc_id = doc_in.id or str(uuid.uuid4())
    
    # Check if ID exists
    existing = await db.get(DocumentModel, doc_id)
    if existing:
        raise HTTPException(status_code=400, detail=f"Document with ID '{doc_id}' already exists.")

    token_count = len(index.tokenizer.tokenize(f"{doc_in.title} {doc_in.content}"))
    doc_model = DocumentModel(
        id=doc_id,
        title=doc_in.title,
        content=doc_in.content,
        author=doc_in.author,
        category=doc_in.category,
        token_count=token_count
    )
    db.add(doc_model)
    await db.commit()
    await db.refresh(doc_model)

    # Update Inverted Index
    index.add_document(
        doc_id=doc_id,
        title=doc_in.title,
        text=doc_in.content,
        metadata={"category": doc_in.category, "author": doc_in.author}
    )

    return doc_model


@app.get("/api/documents", response_model=List[DocumentResponse])
async def list_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(DocumentModel).order_by(DocumentModel.created_at.desc())
    if category:
        query = query.where(DocumentModel.category == category)
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@app.get("/api/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(DocumentModel, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.put("/api/documents/{doc_id}", response_model=DocumentResponse)
async def update_document(doc_id: str, doc_update: DocumentUpdate, db: AsyncSession = Depends(get_db)):
    doc = await db.get(DocumentModel, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc_update.title is not None:
        doc.title = doc_update.title
    if doc_update.content is not None:
        doc.content = doc_update.content
    if doc_update.author is not None:
        doc.author = doc_update.author
    if doc_update.category is not None:
        doc.category = doc_update.category

    doc.token_count = len(index.tokenizer.tokenize(f"{doc.title} {doc.content}"))
    await db.commit()
    await db.refresh(doc)

    # Sync inverted index
    index.add_document(
        doc_id=doc.id,
        title=doc.title,
        text=doc.content,
        metadata={"category": doc.category, "author": doc.author}
    )

    return doc


@app.delete("/api/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    doc = await db.get(DocumentModel, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    await db.delete(doc)
    await db.commit()

    # Remove from inverted index
    index.remove_document(doc_id)
    return None


# --- SEARCH ENDPOINTS ---

@app.get("/api/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1, description="Search query string"),
    algorithm: str = Query("bm25", regex="^(bm25|tfidf|phrase)$"),
    k1: float = Query(settings.DEFAULT_BM25_K1, ge=0.0, le=5.0),
    b: float = Query(settings.DEFAULT_BM25_B, ge=0.0, le=1.0),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    global search_counter, total_search_time_ms
    start_time = time.perf_counter()

    clean_query = q.strip()
    if not clean_query:
        return SearchResponse(
            query=q,
            algorithm=algorithm,
            total_matches=0,
            latency_ms=0.0,
            page=page,
            page_size=page_size,
            results=[]
        )

    # Perform algorithm ranking
    if algorithm == "bm25":
        ranked_items = index.rank_bm25(clean_query, k1=k1, b=b)
    elif algorithm == "tfidf":
        ranked_items = index.rank_tfidf(clean_query)
    elif algorithm == "phrase":
        # Phrase search with match count score
        phrase_matches = index.search_phrase(clean_query)
        ranked_items = [(doc_id, float(count), {"phrase_occurrences": count}) for doc_id, count in phrase_matches]
    else:
        raise HTTPException(status_code=400, detail="Unsupported algorithm.")

    latency_ms = round((time.perf_counter() - start_time) * 1000, 3)

    # Update telemetry
    search_counter += 1
    total_search_time_ms += latency_ms

    # Optional async log recording
    try:
        log_entry = SearchLogModel(
            query=clean_query,
            algorithm=algorithm,
            match_count=len(ranked_items),
            latency_ms=latency_ms
        )
        db.add(log_entry)
        await db.commit()
    except Exception:
        pass  # Don't fail search if telemetry logging has transient error

    # Pagination
    total_matches = len(ranked_items)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    page_items = ranked_items[start_idx:end_idx]

    results: List[SearchResultItem] = []
    for doc_id, score, breakdown in page_items:
        doc_meta = index.documents.get(doc_id, {})
        title = doc_meta.get("title", f"Document {doc_id}")
        raw_text = doc_meta.get("text", "")
        snippet = index.extract_snippet(raw_text, clean_query, window_size=settings.SNIPPET_WINDOW_SIZE)
        
        results.append(SearchResultItem(
            id=doc_id,
            title=title,
            snippet=snippet,
            score=round(score, 4),
            category=doc_meta.get("category", "General"),
            token_count=index.doc_lengths.get(doc_id, 0),
            score_breakdown=breakdown
        ))

    return SearchResponse(
        query=q,
        algorithm=algorithm,
        total_matches=total_matches,
        latency_ms=latency_ms,
        page=page,
        page_size=page_size,
        results=results
    )


# --- INDEX INSPECTION & DASHBOARD ---

@app.get("/api/stats", response_model=IndexStats)
async def get_index_stats():
    total_docs = index.total_docs
    vocab_size = len(index.index)
    total_postings = sum(len(postings) for postings in index.index.values())
    avg_latency = round((total_search_time_ms / search_counter), 3) if search_counter > 0 else 0.0

    return IndexStats(
        total_documents=total_docs,
        total_vocabulary_terms=vocab_size,
        total_postings=total_postings,
        avg_document_length=round(index.avg_doc_length, 2),
        total_queries_executed=search_counter,
        avg_latency_ms=avg_latency
    )


@app.get("/api/postings/{term}", response_model=TermPostingResponse)
async def get_term_postings(term: str):
    normalized = term.lower().strip()
    postings = index.get_posting_list(normalized)
    
    return TermPostingResponse(
        term=normalized,
        document_frequency=len(postings),
        postings=[
            PostingDetail(
                doc_id=p.doc_id,
                term_frequency=p.term_frequency,
                positions=p.positions
            )
            for p in postings
        ]
    )
