import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Code2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export const InterviewGuideTab: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Why use an Inverted Index instead of a database LIKE query or Full Table Scan?',
      a: `A relational database table scan with "WHERE content LIKE '%search%'" requires inspecting every single row and byte in the table (O(N · L) where N is document count and L is average length). In contrast, an Inverted Index precomputes a dictionary of terms mapping to Posting Lists.
Looking up a term in the inverted index dictionary is O(1) in a hash table or O(log V) in a B-Tree/FST (Finite State Transducer). Once found, we only touch documents that are proven to contain the term. For a 100-million document corpus, an inverted index executes queries in sub-milliseconds rather than tens of seconds.`,
    },
    {
      q: 'How does Okapi BM25 improve upon raw TF-IDF?',
      a: `Traditional TF-IDF has two fatal flaws in production search:
1. Term Frequency Linearity: If a spam document repeats the word "database" 500 times, raw TF-IDF scales linearly, allowing spam or keyword-stuffed documents to dominate. BM25 solves this via an asymptotic saturation curve controlled by parameter k1 (typically 1.2–1.5). As term frequency increases, additional occurrences provide diminishing marginal score gains.
2. Uncontrolled Document Length: Longer documents naturally contain more words. TF-IDF often over-penalizes or under-penalizes long documents. BM25 uses parameter b (typically 0.75) to normalize by document length relative to average document length (avgdl). If a document is longer than average, its term frequency is damped proportionally.`,
    },
    {
      q: 'How does Positional Indexing enable exact phrase queries without false positives?',
      a: `A standard inverted index only stores { doc_id, term_frequency }. If a user searches for the exact phrase "distributed systems", checking standard posting lists only tells you that both words exist in the document, but not whether they appear adjacent to each other.
With a Positional Inverted Index, each posting entry stores the array of token offsets:
e.g. "distributed" -> doc_1 @ [4, 18], and "systems" -> doc_1 @ [5, 42].
To verify the phrase, the query processor iterates through the positions of the first term and checks if (pos_first + 1) exists in the second term's position list. This runs in O(min(p1, p2)) time and guarantees zero false positives.`,
    },
    {
      q: 'How would you scale this Inverted Index to 100+ million documents?',
      a: `In production search systems (like Apache Lucene / Elasticsearch):
1. Immutable Segments (LSM Architecture): New documents are written in memory (memtable / indexing buffer). When full, they flush to disk as an immutable index segment (SSTable). Background threads continuously merge smaller segments into larger ones (Tiered Merge Policy).
2. Distributed Sharding: The corpus is partitioned across multiple shards using consistent hashing on document ID. Each shard maintains its own independent inverted index.
3. Scatter-Gather Query Execution: A coordinator node broadcasts the query to all shards in parallel. Each shard computes its local top-K results with BM25. The coordinator gathers the scores, merges the priority queues, and normalizes IDF across shards (using distributed score calculation or DFS query-then-fetch).
4. Compression: Postings are compressed using Variable Byte Encoding (VByte) or SIMD-PForDelta to store delta gaps (d-gaps) rather than raw 32-bit integers, reducing index size by 75–85%.`,
    },
    {
      q: 'What is the algorithmic complexity of posting list intersection?',
      a: `For multi-term AND queries, we intersect the posting lists of each term:
- Standard Two-Pointer Merge: O(p1 + p2), where p1 and p2 are the lengths of the posting lists.
- Skip Lists Optimization: Posting lists with skip pointers every sqrt(P) elements achieve O(p1 + p2/skip), allowing the engine to jump over long stretches of non-matching doc IDs.
- Branchless SIMD Bitmaps: For frequent terms, bitwise AND operations (AVX-512) can intersect 512 document IDs per CPU instruction cycle.`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Intro Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          <span>System Architecture & Technical Interview Defense</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Comprehensive explanations of data structures, algorithmic complexities, mathematical derivations, and production trade-offs designed for senior software engineering interviews.
        </p>
      </div>

      {/* Complexity Reference Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-600" />
          <span>Algorithm Time & Space Complexity Reference</span>
        </h4>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Operation</th>
                <th className="py-3 px-4">Algorithm / Structure</th>
                <th className="py-3 px-4">Time Complexity</th>
                <th className="py-3 px-4">Space Complexity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">Document Indexing</td>
                <td className="py-3 px-4">Tokenize + Append Postings</td>
                <td className="py-3 px-4 font-mono text-indigo-700">O(L)</td>
                <td className="py-3 px-4 font-mono">O(V + P)</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">Term Dictionary Lookup</td>
                <td className="py-3 px-4">Hash Map / FST</td>
                <td className="py-3 px-4 font-mono text-indigo-700">O(1) avg</td>
                <td className="py-3 px-4 font-mono">O(V)</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">Posting Intersection (AND)</td>
                <td className="py-3 px-4">Two-Pointer Merge / Skip Lists</td>
                <td className="py-3 px-4 font-mono text-indigo-700">O(p1 + p2)</td>
                <td className="py-3 px-4 font-mono">O(min(p1, p2))</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">Exact Phrase Match</td>
                <td className="py-3 px-4">Positional Index Sequential Scan</td>
                <td className="py-3 px-4 font-mono text-indigo-700">O(K · min(P) · avg_pos)</td>
                <td className="py-3 px-4 font-mono">O(M)</td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-medium text-slate-900">Okapi BM25 Ranking</td>
                <td className="py-3 px-4">Accumulator Hash Map + Min-Heap</td>
                <td className="py-3 px-4 font-mono text-indigo-700">O(∑|Pt| + M log K)</td>
                <td className="py-3 px-4 font-mono">O(M)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Accordion: Technical Interview FAQ */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-600" />
          <span>Technical Interview Defense Questions & Verbatim Answers</span>
        </h4>
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-slate-200 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-semibold text-slate-900">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-4 bg-white border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line font-sans">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
