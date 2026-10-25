"""
Comprehensive Unit Tests for Inverted Index Engine
Tests:
- Tokenization & stopword removal
- Index construction & posting lists
- Document addition, update, and deletion
- Exact phrase search using positional indexes
- TF-IDF and Okapi BM25 relevance ranking
- Empty and invalid queries
- KWIC snippet generation
"""

import unittest
from backend.app.indexer import InvertedIndex, Tokenizer


class TestTokenizer(unittest.TestCase):
    def setUp(self):
        self.tokenizer = Tokenizer(remove_stopwords=True)

    def test_basic_tokenization(self):
        tokens = self.tokenizer.tokenize("Distributed systems in 2026!")
        self.assertIn("distributed", tokens)
        self.assertIn("systems", tokens)
        self.assertIn("2026", tokens)

    def test_stopwords_removal(self):
        # 'the', 'in', 'and' should be removed
        tokens = self.tokenizer.tokenize("The cat and the dog in the yard")
        self.assertEqual(tokens, ["cat", "dog", "yard"])

    def test_positions_tracking(self):
        tokens_with_pos = self.tokenizer.tokenize_with_positions("Quick brown fox jumps")
        # All words are non-stopwords here
        words = [t[0] for t in tokens_with_pos]
        positions = [t[1] for t in tokens_with_pos]
        self.assertEqual(words, ["quick", "brown", "fox", "jumps"])
        self.assertEqual(positions, [0, 1, 2, 3])

    def test_empty_string(self):
        self.assertEqual(self.tokenizer.tokenize(""), [])
        self.assertEqual(self.tokenizer.tokenize("   !!! ???  "), [])


class TestInvertedIndex(unittest.TestCase):
    def setUp(self):
        self.index = InvertedIndex(remove_stopwords=True)
        # Seed 3 documents
        self.index.add_document(
            doc_id="doc1",
            title="Introduction to Information Retrieval",
            text="An inverted index is the core data structure used in modern search engines."
        )
        self.index.add_document(
            doc_id="doc2",
            title="Database Indexing Fundamentals",
            text="B-Trees and hash tables are common indexing structures in relational databases."
        )
        self.index.add_document(
            doc_id="doc3",
            title="Modern Search Architecture",
            text="Search engines rank documents using TF-IDF and BM25 scoring models."
        )

    def test_postings_generation(self):
        postings = self.index.get_posting_list("index")
        doc_ids = [p.doc_id for p in postings]
        self.assertIn("doc1", doc_ids)

        postings_search = self.index.get_posting_list("search")
        search_doc_ids = [p.doc_id for p in postings_search]
        self.assertIn("doc1", search_doc_ids)
        self.assertIn("doc3", search_doc_ids)

    def test_document_update(self):
        # Update doc1 text
        self.index.add_document(
            doc_id="doc1",
            title="Updated Title",
            text="Completely new content about quantum cryptography."
        )
        # Old terms should not have doc1
        postings = self.index.get_posting_list("retrieval")
        self.assertEqual([p.doc_id for p in postings], [])

        # New term should have doc1
        quantum_postings = self.index.get_posting_list("quantum")
        self.assertEqual([p.doc_id for p in quantum_postings], ["doc1"])

    def test_document_deletion(self):
        self.assertEqual(self.index.total_docs, 3)
        deleted = self.index.remove_document("doc2")
        self.assertTrue(deleted)
        self.assertEqual(self.index.total_docs, 2)

        # Non-existent doc deletion returns False
        self.assertFalse(self.index.remove_document("non_existent"))

        # Term from doc2 only should be cleaned up
        postings = self.index.get_posting_list("relational")
        self.assertEqual(postings, [])

    def test_exact_phrase_search(self):
        # "search engines" appears in doc1 ("modern search engines") and doc3 ("Search engines rank")
        results = self.index.search_phrase("search engines")
        doc_ids = [r[0] for r in results]
        self.assertIn("doc1", doc_ids)
        self.assertIn("doc3", doc_ids)

        # Non-matching phrase
        no_match = self.index.search_phrase("quantum gravity")
        self.assertEqual(no_match, [])

    def test_tfidf_ranking(self):
        results = self.index.rank_tfidf("search engines")
        self.assertTrue(len(results) >= 2)
        top_doc_id = results[0][0]
        self.assertIn(top_doc_id, ["doc1", "doc3"])
        # Scores should be non-negative and descending
        scores = [r[1] for r in results]
        self.assertEqual(scores, sorted(scores, reverse=True))
        for score in scores:
            self.assertGreater(score, 0)

    def test_bm25_ranking(self):
        results = self.index.rank_bm25("search engines", k1=1.5, b=0.75)
        self.assertTrue(len(results) >= 2)
        scores = [r[1] for r in results]
        self.assertEqual(scores, sorted(scores, reverse=True))

    def test_empty_query(self):
        self.assertEqual(self.index.rank_tfidf(""), [])
        self.assertEqual(self.index.rank_bm25(""), [])
        self.assertEqual(self.index.search_phrase(""), [])

    def test_snippet_extraction(self):
        snippet = self.index.extract_snippet(
            "In computing, an inverted index is an index data structure storing a mapping from words to locations in a document.",
            "inverted index",
            window_size=60
        )
        self.assertIn("inverted", snippet.lower())
        self.assertIn("index", snippet.lower())


if __name__ == "__main__":
    unittest.main()
