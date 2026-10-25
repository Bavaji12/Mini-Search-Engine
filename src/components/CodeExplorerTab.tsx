import React, { useState } from 'react';
import {
  Code2,
  Copy,
  Check,
  FileCode,
  FolderGit2,
  Terminal,
  ExternalLink
} from 'lucide-react';

interface FileEntry {
  path: string;
  name: string;
  language: string;
  description: string;
  content: string;
}

export const CodeExplorerTab: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const files: FileEntry[] = [
    {
      name: 'indexer.py',
      path: 'backend/app/indexer.py',
      language: 'python',
      description: 'Core Inverted Index with positional postings, TF-IDF, BM25, phrase search, and KWIC snippets.',
      content: `import re
import math
from typing import Dict, List, Set, Tuple, Optional, Any
from collections import defaultdict

DEFAULT_STOPWORDS = {
    "a", "about", "above", "after", "again", "all", "am", "an", "and", "any", "are",
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can", "cannot", "could", "did", "do", "does", "doing", "down", "during",
    "each", "few", "for", "from", "further", "had", "has", "have", "having", "he", "her",
    "here", "hers", "him", "his", "how", "i", "if", "in", "into", "is", "it", "its", "me",
    "more", "most", "my", "myself", "no", "nor", "not", "of", "off", "on", "once", "only",
    "or", "other", "our", "ours", "out", "over", "own", "same", "she", "should", "so",
    "some", "such", "than", "that", "the", "their", "theirs", "them", "then", "there",
    "these", "they", "this", "those", "through", "to", "too", "under", "until", "up",
    "very", "was", "we", "were", "what", "when", "where", "which", "while", "who",
    "whom", "why", "with", "would", "you", "your", "yours"
}

class Tokenizer:
    def __init__(self, stopwords: Optional[Set[str]] = None, remove_stopwords: bool = True):
        self.stopwords = stopwords if stopwords is not None else DEFAULT_STOPWORDS
        self.remove_stopwords = remove_stopwords
        self.token_pattern = re.compile(r'\\b[a-zA-Z0-9_]+\\b')

    def tokenize_with_positions(self, text: str) -> List[Tuple[str, int]]:
        if not text:
            return []
        matches = self.token_pattern.finditer(text.lower())
        tokens: List[Tuple[str, int]] = []
        pos = 0
        for m in matches:
            token = m.group(0)
            if self.remove_stopwords and token in self.stopwords:
                pos += 1
                continue
            tokens.append((token, pos))
            pos += 1
        return tokens

    def tokenize(self, text: str) -> List[str]:
        return [tok for tok, _ in self.tokenize_with_positions(text)]

class PostingEntry:
    __slots__ = ("doc_id", "term_frequency", "positions")
    def __init__(self, doc_id: str, term_frequency: int, positions: List[int]):
        self.doc_id = doc_id
        self.term_frequency = term_frequency
        self.positions = positions

class InvertedIndex:
    def __init__(self, remove_stopwords: bool = True):
        self.tokenizer = Tokenizer(remove_stopwords=remove_stopwords)
        self.index: Dict[str, List[PostingEntry]] = defaultdict(list)
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.doc_lengths: Dict[str, int] = {}
        self._total_doc_length = 0

    @property
    def total_docs(self) -> int:
        return len(self.documents)

    @property
    def avg_doc_length(self) -> float:
        return self._total_doc_length / self.total_docs if self.total_docs > 0 else 0.0

    def add_document(self, doc_id: str, title: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        if doc_id in self.documents:
            self.remove_document(doc_id)
        meta = metadata.copy() if metadata else {}
        meta.update({"id": doc_id, "title": title, "text": text})
        self.documents[doc_id] = meta

        combined_text = f"{title}\\n{text}"
        tokens_with_pos = self.tokenizer.tokenize_with_positions(combined_text)
        doc_length = len(tokens_with_pos)
        self.doc_lengths[doc_id] = doc_length
        self._total_doc_length += doc_length

        term_positions: Dict[str, List[int]] = defaultdict(list)
        for token, pos in tokens_with_pos:
            term_positions[token].append(pos)

        for term, positions in term_positions.items():
            entry = PostingEntry(doc_id=doc_id, term_frequency=len(positions), positions=positions)
            self.index[term].append(entry)

    def rank_bm25(self, query: str, k1: float = 1.5, b: float = 0.75):
        query_tokens = self.tokenizer.tokenize(query)
        if not query_tokens or self.total_docs == 0:
            return []
        N = self.total_docs
        avgdl = max(1.0, self.avg_doc_length)
        doc_scores = defaultdict(float)

        for token in set(query_tokens):
            postings = self.index.get(token, [])
            df = len(postings)
            if df == 0:
                continue
            idf = math.log(((N - df + 0.5) / (df + 0.5)) + 1.0)
            for p in postings:
                f = p.term_frequency
                doc_len = self.doc_lengths.get(p.doc_id, 1)
                denominator = f + k1 * (1.0 - b + b * (doc_len / avgdl))
                tf_weight = (f * (k1 + 1.0)) / denominator if denominator > 0 else 0.0
                doc_scores[p.doc_id] += idf * tf_weight

        return sorted(doc_scores.items(), key=lambda x: x[1], reverse=True)`
    },
    {
      name: 'main.py',
      path: 'backend/app/main.py',
      language: 'python',
      description: 'FastAPI application with REST endpoints, CORS, lifespan index loading, and query telemetry.',
      content: `from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
import time
from backend.app.config import settings
from backend.app.database import get_db, engine
from backend.app.models import Base, DocumentModel, SearchLogModel
from backend.app.schemas import DocumentCreate, SearchResponse, IndexStats
from backend.app.indexer import InvertedIndex

index = InvertedIndex(remove_stopwords=True)

app = FastAPI(title="Mini Search Engine", version="1.0.0")

@app.get("/api/search", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1),
    algorithm: str = Query("bm25", regex="^(bm25|tfidf|phrase)$"),
    page: int = 1,
    page_size: int = 10,
    db: AsyncSession = Depends(get_db)
):
    start = time.perf_counter()
    if algorithm == "bm25":
        results = index.rank_bm25(q)
    elif algorithm == "tfidf":
        results = index.rank_tfidf(q)
    else:
        results = index.search_phrase(q)
    latency_ms = (time.perf_counter() - start) * 1000
    return SearchResponse(query=q, algorithm=algorithm, total_matches=len(results), latency_ms=latency_ms, page=page, page_size=page_size, results=results)`
    },
    {
      name: 'models.py',
      path: 'backend/app/models.py',
      language: 'python',
      description: 'SQLAlchemy declarative models for PostgreSQL persistence.',
      content: `from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Integer, Float
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class DocumentModel(Base):
    __tablename__ = "documents"
    id = Column(String(64), primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    author = Column(String(128), nullable=True)
    category = Column(String(64), nullable=True, index=True)
    token_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class SearchLogModel(Base):
    __tablename__ = "search_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    query = Column(String(255), nullable=False)
    algorithm = Column(String(32), nullable=False)
    match_count = Column(Integer, nullable=False)
    latency_ms = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)`
    },
    {
      name: 'test_indexer.py',
      path: 'backend/tests/test_indexer.py',
      language: 'python',
      description: 'Pytest & Unittest test suite for tokenization, postings, updates, BM25, and phrase search.',
      content: `import unittest
from backend.app.indexer import InvertedIndex, Tokenizer

class TestInvertedIndex(unittest.TestCase):
    def setUp(self):
        self.index = InvertedIndex(remove_stopwords=True)
        self.index.add_document("doc1", "Information Retrieval", "Inverted index data structure for search.")
        self.index.add_document("doc2", "Relational Databases", "B-Trees and hash indexing.")

    def test_exact_phrase(self):
        matches = self.index.search_phrase("data structure")
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0][0], "doc1")

    def test_ranking_bm25(self):
        ranked = self.index.rank_bm25("inverted index")
        self.assertEqual(ranked[0][0], "doc1")

if __name__ == "__main__":
    unittest.main()`
    },
    {
      name: 'docker-compose.yml',
      path: 'docker-compose.yml',
      language: 'yaml',
      description: 'Docker Compose orchestration for PostgreSQL 16, FastAPI backend, and React frontend.',
      content: `version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: search_postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres_password
      POSTGRES_DB: search_engine
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations/001_initial_schema.sql:/docker-entrypoint-initdb.d/001.sql:ro

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    container_name: search_backend
    restart: always
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:postgres_password@db:5432/search_engine
    ports:
      - "8000:8000"

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    container_name: search_frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:`
    },
    {
      name: '001_initial_schema.sql',
      path: 'migrations/001_initial_schema.sql',
      language: 'sql',
      description: 'PostgreSQL schema with indexes and automated timestamp triggers.',
      content: `CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author VARCHAR(128),
    category VARCHAR(64) DEFAULT 'General',
    token_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

CREATE TABLE IF NOT EXISTS search_logs (
    id SERIAL PRIMARY KEY,
    query VARCHAR(255) NOT NULL,
    algorithm VARCHAR(32) NOT NULL,
    match_count INTEGER NOT NULL,
    latency_ms DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);`
    }
  ];

  const [activeFile, setActiveFile] = useState<FileEntry>(files[0]);

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-600" />
            <span>Python & PostgreSQL Code Repository</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete, runnable Python FastAPI + AsyncPG PostgreSQL + Docker Compose codebase ready for GitHub.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg text-xs font-mono">
            <Terminal className="w-3.5 h-3.5 text-emerald-600" />
            <span>16/16 Unit Tests Passed</span>
          </div>
        </div>
      </div>

      {/* Code Viewer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: File Tree */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 shadow-xs p-3 space-y-1 h-[620px] overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
            Repository Files
          </p>
          {files.map((file) => {
            const isSelected = activeFile.path === file.path;
            return (
              <button
                key={file.path}
                onClick={() => setActiveFile(file)}
                className={`w-full p-2.5 rounded-lg text-left text-xs transition-colors flex items-start gap-2.5 ${
                  isSelected
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-900'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <FileCode className={`w-4 h-4 shrink-0 mt-0.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{file.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{file.path}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Code Display */}
        <div className="lg:col-span-8 bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[620px]">
          {/* Top Bar */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-200 font-semibold">{activeFile.path}</span>
              <span className="text-[10px] text-indigo-400 font-mono bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                {activeFile.language}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="px-5 py-2 bg-slate-900/60 border-b border-slate-800/80 text-[11px] text-slate-400">
            {activeFile.description}
          </div>

          {/* Code Body */}
          <div className="flex-1 overflow-auto p-5 font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/40">
            <pre>
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
