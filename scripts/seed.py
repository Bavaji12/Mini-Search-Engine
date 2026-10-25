"""
Seed script to populate documents for testing and demonstration.
Can be executed standalone: python scripts/seed.py
"""

import sys
import os

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

SAMPLE_DOCUMENTS = [
    {
        "id": "doc-01",
        "title": "Introduction to Information Retrieval and Inverted Indexes",
        "category": "Search Systems",
        "author": "Christopher Manning",
        "content": "An inverted index is an essential data structure mapping words to locations in a set of documents. Unlike a forward index which lists words per document, an inverted index enables sub-millisecond full-text queries by providing posting lists for each unique term. Search engines like Lucene and Elasticsearch rely on inverted indexes for fast term intersection and phrase queries."
    },
    {
        "id": "doc-02",
        "title": "Understanding Okapi BM25 Ranking in Modern Search",
        "category": "Search Systems",
        "author": "Stephen Robertson",
        "content": "The Okapi BM25 ranking function is a non-linear probabilistic retrieval model that scores document relevance based on term frequency and document length normalization. Unlike raw TF-IDF where term frequency grows linearly, BM25 features term saturation governed by parameter k1, preventing documents with repeated spam words from dominating search results."
    },
    {
        "id": "doc-03",
        "title": "The Anatomy of a Large-Scale Hypertextual Web Search Engine",
        "category": "Search Systems",
        "author": "Sergey Brin & Larry Page",
        "content": "In this classic paper, the authors present Google, a prototype of a large-scale search engine which makes heavy use of the structure present in hypertext. It introduced PageRank, an objective measure of citation importance, and scalable inverted index architecture designed to crawl and index millions of web pages efficiently."
    },
    {
        "id": "doc-04",
        "title": "Designing Data-Intensive Applications: Reliable Storage Engines",
        "category": "Distributed Systems",
        "author": "Martin Kleppmann",
        "content": "Storage engines generally fall into two broad categories: Log-Structured Merge-trees (LSM-trees) and B-Trees. An LSM-tree writes sequentially to an in-memory memtable and flushes immutable SSTables to disk, which are subsequently merged. Inverted indexes in Lucene use an LSM-like architecture where segment files are merged in the background."
    },
    {
        "id": "doc-05",
        "title": "PostgreSQL Full-Text Search: GIN and GiST Indexing",
        "category": "Databases",
        "author": "Oleg Bartunov",
        "content": "PostgreSQL provides native full-text search capabilities using tsvector and tsquery types. The Generalized Inverted Index (GIN) stores a mapping of lexemes to tuple IDs, effectively acting as an inverted index inside the relational database engine. GIN indexes provide fast read access for multi-term queries and phrase matches."
    },
    {
        "id": "doc-06",
        "title": "Vector Embeddings vs Sparse Lexical Inverted Indexes",
        "category": "Artificial Intelligence",
        "author": "Andrej Karpathy",
        "content": "While dense vector search using approximate nearest neighbors (HNSW) excels at semantic understanding and conceptual similarity, traditional inverted indexes with BM25 remain superior for exact keyword matching, acronyms, code identifiers, and rare product SKUs. Modern hybrid search engines combine BM25 and dense vector ranking using Reciprocal Rank Fusion."
    },
    {
        "id": "doc-07",
        "title": "MapReduce: Simplified Data Processing on Large Clusters",
        "category": "Distributed Systems",
        "author": "Jeffrey Dean & Sanjay Ghemawat",
        "content": "MapReduce is a programming model and an associated implementation for processing and generating large datasets. Users specify a map function that processes a key/value pair to generate intermediate pairs, and a reduce function that merges all intermediate values associated with the same key. MapReduce was historically used to build massive inverted indexes across thousands of commodity machines."
    },
    {
        "id": "doc-08",
        "title": "Distributed Consensus and the Raft Protocol",
        "category": "Distributed Systems",
        "author": "Diego Ongaro & John Ousterhout",
        "content": "Raft is a consensus algorithm designed to be easy to understand. It is equivalent to Paxos in fault-tolerance and performance, but decomposed into leader election, log replication, and safety. Distributed search clusters use consensus algorithms like Raft to manage shard allocations, metadata state, and master node election."
    },
    {
        "id": "doc-09",
        "title": "High-Performance Concurrency in Python with AsyncIO and FastAPI",
        "category": "Software Engineering",
        "author": "Sebastián Ramírez",
        "content": "FastAPI is a modern, fast web framework for building APIs with Python based on standard Python type hints and Starlette. By leveraging asyncio and non-blocking event loops, FastAPI enables high-throughput concurrent request handling, making it suitable for serving low-latency search and ranking queries."
    },
    {
        "id": "doc-10",
        "title": "Tokenization and Stemming Algorithms: From Porter to WordPiece",
        "category": "NLP",
        "author": "Martin Porter",
        "content": "Text preprocessing is the foundational step in information retrieval. The Porter Stemming algorithm uses algorithmic rule-based suffix stripping to normalize words such as connecting, connection, and connections to their common root. Modern subword tokenizers like Byte-Pair Encoding (BPE) and WordPiece provide robust vocabularies for language models."
    }
]


def seed_in_memory():
    from backend.app.indexer import InvertedIndex
    idx = InvertedIndex(remove_stopwords=True)
    for doc in SAMPLE_DOCUMENTS:
        idx.add_document(
            doc_id=doc["id"],
            title=doc["title"],
            text=doc["content"],
            metadata={"category": doc["category"], "author": doc["author"]}
        )
    print(f"Successfully seeded {len(SAMPLE_DOCUMENTS)} documents.")
    print(f"Total vocabulary terms: {len(idx.index)}")
    print(f"Average document length: {idx.avg_doc_length:.2f} tokens")
    return idx


if __name__ == "__main__":
    seed_in_memory()
