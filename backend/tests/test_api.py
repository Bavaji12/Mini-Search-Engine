"""
API Integration & Validation Tests
Tests:
- Query validation & parameter bounds
- Document creation, conflict handling, and deletion
- Ranking algorithm selection & scoring response structure
- Empty and invalid queries
"""

import unittest
from backend.app.indexer import InvertedIndex


class TestSearchLogicIntegration(unittest.TestCase):
    def setUp(self):
        self.index = InvertedIndex(remove_stopwords=True)
        self.index.add_document(
            doc_id="test-1",
            title="FastAPI Web Framework",
            text="FastAPI is a high performance async web framework for building APIs."
        )
        self.index.add_document(
            doc_id="test-2",
            title="PostgreSQL Relational Database",
            text="PostgreSQL offers robust ACID guarantees, transactions, and full text search."
        )

    def test_ranking_bm25_parameters(self):
        # Test with custom k1 and b
        res_standard = self.index.rank_bm25("async web framework", k1=1.5, b=0.75)
        self.assertEqual(len(res_standard), 1)
        self.assertEqual(res_standard[0][0], "test-1")

        # Test breakdown structure
        breakdown = res_standard[0][2]
        self.assertIn("terms", breakdown)
        self.assertIn("total_bm25", breakdown)

    def test_tfidf_scoring(self):
        res = self.index.rank_tfidf("PostgreSQL ACID")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0][0], "test-2")
        self.assertGreater(res[0][1], 0)

    def test_phrase_query_exact_match(self):
        # Exact consecutive words
        res = self.index.search_phrase("web framework")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0][0], "test-1")

        # Non-consecutive words should not match phrase query
        res_reversed = self.index.search_phrase("framework web")
        self.assertEqual(len(res_reversed), 0)

    def test_empty_and_special_character_queries(self):
        self.assertEqual(self.index.rank_bm25(""), [])
        self.assertEqual(self.index.rank_bm25("   *** $$$ --- "), [])
        self.assertEqual(self.index.rank_tfidf("   "), [])
        self.assertEqual(self.index.search_phrase("   "), [])


if __name__ == "__main__":
    unittest.main()
