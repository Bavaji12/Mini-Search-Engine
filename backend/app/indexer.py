"""
Inverted Index & Text Processing Engine
Implements tokenization, stopword removal, positional indexing,
phrase search, and relevance ranking (TF-IDF & BM25).
"""

import re
import math
from typing import Dict, List, Set, Tuple, Optional, Any
from collections import defaultdict, Counter

# Standard 120 common English stopwords
DEFAULT_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", 
    "but", "by", "can", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", 
    "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", 
    "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", 
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", 
    "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", 
    "me", "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", 
    "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", 
    "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", 
    "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", 
    "there", "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", 
    "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", 
    "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", 
    "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", 
    "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", 
    "yours", "yourself", "yourselves"
}


class Tokenizer:
    """Handles text normalization, alphanumeric tokenization, and stopword filtering."""

    def __init__(self, stopwords: Optional[Set[str]] = None, remove_stopwords: bool = True):
        self.stopwords = stopwords if stopwords is not None else DEFAULT_STOPWORDS
        self.remove_stopwords = remove_stopwords
        # Tokenizer regex matches sequences of alphanumeric characters
        self.token_pattern = re.compile(r'\b[a-zA-Z0-9_]+\b')

    def tokenize_with_positions(self, text: str) -> List[Tuple[str, int]]:
        """
        Tokenizes text into a list of (normalized_token, position) pairs.
        Position counts sequential token index to enable phrase queries.
        """
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
        """Simple list of normalized tokens without position tracking."""
        return [tok for tok, _ in self.tokenize_with_positions(text)]


class PostingEntry:
    """Represents an entry in a term's posting list for a specific document."""
    __slots__ = ("doc_id", "term_frequency", "positions")

    def __init__(self, doc_id: str, term_frequency: int, positions: List[int]):
        self.doc_id = doc_id
        self.term_frequency = term_frequency
        self.positions = positions

    def to_dict(self) -> Dict[str, Any]:
        return {
            "doc_id": self.doc_id,
            "term_frequency": self.term_frequency,
            "positions": self.positions,
        }


class InvertedIndex:
    """
    Inverted Index data structure with positional postings.
    Supports:
      - Incremental document addition, update, and deletion
      - Fast term dictionary lookup
      - Multi-term boolean queries (AND / OR)
      - Exact phrase queries using positional posting list verification
      - TF-IDF and Okapi BM25 ranking
    """

    def __init__(self, remove_stopwords: bool = True):
        self.tokenizer = Tokenizer(remove_stopwords=remove_stopwords)
        # index: term -> list of PostingEntry
        self.index: Dict[str, List[PostingEntry]] = defaultdict(list)
        # document registry: doc_id -> metadata dictionary
        self.documents: Dict[str, Dict[str, Any]] = {}
        # document lengths for BM25 normalization
        self.doc_lengths: Dict[str, int] = {}
        # cache for total document length
        self._total_doc_length = 0

    @property
    def total_docs(self) -> int:
        return len(self.documents)

    @property
    def avg_doc_length(self) -> float:
        if self.total_docs == 0:
            return 0.0
        return self._total_doc_length / self.total_docs

    def add_document(self, doc_id: str, title: str, text: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Indexes or replaces a document in the inverted index."""
        if doc_id in self.documents:
            self.remove_document(doc_id)

        meta = metadata.copy() if metadata else {}
        meta.update({
            "id": doc_id,
            "title": title,
            "text": text,
        })
        self.documents[doc_id] = meta

        # Tokenize full searchable text (title + text)
        combined_text = f"{title}\n{text}"
        tokens_with_pos = self.tokenizer.tokenize_with_positions(combined_text)
        doc_length = len(tokens_with_pos)
        self.doc_lengths[doc_id] = doc_length
        self._total_doc_length += doc_length

        # Aggregate positions and frequencies per term
        term_positions: Dict[str, List[int]] = defaultdict(list)
        for token, pos in tokens_with_pos:
            term_positions[token].append(pos)

        # Append to posting lists
        for term, positions in term_positions.items():
            entry = PostingEntry(
                doc_id=doc_id,
                term_frequency=len(positions),
                positions=positions
            )
            self.index[term].append(entry)

    def remove_document(self, doc_id: str) -> bool:
        """Removes a document from the registry and cleans its postings."""
        if doc_id not in self.documents:
            return False

        doc_len = self.doc_lengths.pop(doc_id, 0)
        self._total_doc_length = max(0, self._total_doc_length - doc_len)
        del self.documents[doc_id]

        # Purge postings for this doc_id
        terms_to_delete = []
        for term, postings in self.index.items():
            self.index[term] = [p for p in postings if p.doc_id != doc_id]
            if not self.index[term]:
                terms_to_delete.append(term)

        for term in terms_to_delete:
            del self.index[term]

        return True

    def get_posting_list(self, term: str) -> List[PostingEntry]:
        """Returns the posting list for a normalized term."""
        normalized = term.lower()
        return self.index.get(normalized, [])

    def search_phrase(self, phrase: str) -> List[Tuple[str, int]]:
        """
        Executes exact phrase search by inspecting consecutive positions.
        Returns list of (doc_id, match_count).
        """
        tokens = self.tokenizer.tokenize(phrase)
        if not tokens:
            return []
        if len(tokens) == 1:
            postings = self.get_posting_list(tokens[0])
            return [(p.doc_id, p.term_frequency) for p in postings]

        # For multi-word phrase, retrieve posting lists for all words
        posting_lists = [self.get_posting_list(t) for t in tokens]
        if any(len(p) == 0 for p in posting_lists):
            return []

        # Find documents that contain all terms
        doc_sets = [{p.doc_id for p in p_list} for p_list in posting_lists]
        candidate_docs = set.intersection(*doc_sets)
        if not candidate_docs:
            return []

        matches: List[Tuple[str, int]] = []
        # Build doc_id -> list of positions map for each term
        for doc_id in candidate_docs:
            positions_by_term: List[List[int]] = []
            for p_list in posting_lists:
                for entry in p_list:
                    if entry.doc_id == doc_id:
                        positions_by_term.append(entry.positions)
                        break

            # Check consecutive offsets: pos[i] == pos[0] + i
            phrase_occurrences = 0
            first_term_positions = positions_by_term[0]
            
            for start_pos in first_term_positions:
                is_phrase = True
                for i in range(1, len(tokens)):
                    expected_pos = start_pos + i
                    # Binary search or fast set lookup
                    if expected_pos not in positions_by_term[i]:
                        is_phrase = False
                        break
                if is_phrase:
                    phrase_occurrences += 1

            if phrase_occurrences > 0:
                matches.append((doc_id, phrase_occurrences))

        return matches

    def rank_tfidf(self, query: str) -> List[Tuple[str, float, Dict[str, Any]]]:
        """
        Ranks matching documents using standard Smooth TF-IDF:
          TF(t, d) = term_frequency(t, d) / doc_length(d)
          IDF(t) = log((N + 1) / (DF(t) + 1)) + 1
          Score(Q, d) = sum(TF(t, d) * IDF(t))
        """
        query_tokens = self.tokenizer.tokenize(query)
        if not query_tokens or self.total_docs == 0:
            return []

        # Document frequency: number of documents containing term
        doc_scores: Dict[str, float] = defaultdict(float)
        score_breakdowns: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"terms": {}, "total_tf_idf": 0.0})

        N = self.total_docs
        for token in set(query_tokens):
            postings = self.get_posting_list(token)
            df = len(postings)
            if df == 0:
                continue

            # Smooth IDF
            idf = math.log((N + 1) / (df + 1)) + 1.0

            for p in postings:
                doc_len = max(1, self.doc_lengths.get(p.doc_id, 1))
                tf = p.term_frequency / doc_len
                tfidf = tf * idf

                doc_scores[p.doc_id] += tfidf
                score_breakdowns[p.doc_id]["terms"][token] = {
                    "tf": round(tf, 5),
                    "raw_tf": p.term_frequency,
                    "doc_len": doc_len,
                    "idf": round(idf, 4),
                    "score": round(tfidf, 5)
                }

        results = []
        for doc_id, score in doc_scores.items():
            breakdown = score_breakdowns[doc_id]
            breakdown["total_tf_idf"] = round(score, 5)
            results.append((doc_id, score, breakdown))

        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def rank_bm25(self, query: str, k1: float = 1.5, b: float = 0.75) -> List[Tuple[str, float, Dict[str, Any]]]:
        """
        Ranks matching documents using Okapi BM25:
          IDF(t) = ln((N - DF(t) + 0.5) / (DF(t) + 0.5) + 1.0)
          TF_weight = (f(t, d) * (k1 + 1)) / (f(t, d) + k1 * (1 - b + b * (doc_len / avgdl)))
          Score = sum(IDF(t) * TF_weight)
        """
        query_tokens = self.tokenizer.tokenize(query)
        if not query_tokens or self.total_docs == 0:
            return []

        N = self.total_docs
        avgdl = max(1.0, self.avg_doc_length)

        doc_scores: Dict[str, float] = defaultdict(float)
        score_breakdowns: Dict[str, Dict[str, Any]] = defaultdict(lambda: {"terms": {}, "total_bm25": 0.0})

        for token in set(query_tokens):
            postings = self.get_posting_list(token)
            df = len(postings)
            if df == 0:
                continue

            # Standard Probabilistic / Lucene-style BM25 IDF
            idf = math.log(((N - df + 0.5) / (df + 0.5)) + 1.0)

            for p in postings:
                f = p.term_frequency
                doc_len = self.doc_lengths.get(p.doc_id, 1)
                denominator = f + k1 * (1.0 - b + b * (doc_len / avgdl))
                tf_weight = (f * (k1 + 1.0)) / denominator if denominator > 0 else 0.0
                bm25_term_score = idf * tf_weight

                doc_scores[p.doc_id] += bm25_term_score
                score_breakdowns[p.doc_id]["terms"][token] = {
                    "raw_tf": f,
                    "doc_len": doc_len,
                    "avgdl": round(avgdl, 2),
                    "idf": round(idf, 4),
                    "tf_weight": round(tf_weight, 4),
                    "score": round(bm25_term_score, 5)
                }

        results = []
        for doc_id, score in doc_scores.items():
            breakdown = score_breakdowns[doc_id]
            breakdown["total_bm25"] = round(score, 5)
            results.append((doc_id, score, breakdown))

        results.sort(key=lambda x: x[1], reverse=True)
        return results

    def extract_snippet(self, text: str, query: str, window_size: int = 160) -> str:
        """
        Extracts a Key Word In Context (KWIC) snippet around highest match density.
        """
        if not text:
            return ""

        query_tokens = set(self.tokenizer.tokenize(query))
        if not query_tokens:
            return text[:window_size] + ("..." if len(text) > window_size else "")

        # Find all match indices in raw text
        matches = []
        for q in query_tokens:
            for m in re.finditer(re.escape(q), text, re.IGNORECASE):
                matches.append(m.start())

        if not matches:
            return text[:window_size] + ("..." if len(text) > window_size else "")

        # Target center around the first dense cluster or first match
        first_match = min(matches)
        start = max(0, first_match - (window_size // 3))
        end = min(len(text), start + window_size)

        # Adjust start/end to word boundaries
        if start > 0:
            prev_space = text.rfind(" ", 0, start)
            if prev_space != -1 and (start - prev_space) < 20:
                start = prev_space + 1
        if end < len(text):
            next_space = text.find(" ", end)
            if next_space != -1 and (next_space - end) < 20:
                end = next_space

        prefix = "..." if start > 0 else ""
        suffix = "..." if end < len(text) else ""
        return prefix + text[start:end].strip() + suffix
