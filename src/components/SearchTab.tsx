import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  SlidersHorizontal,
  Clock,
  Sparkles,
  ArrowUpDown,
  FileQuestion,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Tag,
  ExternalLink
} from 'lucide-react';
import { ClientInvertedIndex } from '../engine/InvertedIndex';
import { SearchResult } from '../types';
import { ScoreBreakdownModal } from './ScoreBreakdownModal';

interface SearchTabProps {
  indexEngine: ClientInvertedIndex;
  onRecordQuery: (query: string, algorithm: string, latencyMs: number, matchCount: number) => void;
  onViewDocument: (docId: string) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({
  indexEngine,
  onRecordQuery,
  onViewDocument,
}) => {
  const [query, setQuery] = useState('inverted index search');
  const [algorithm, setAlgorithm] = useState<'bm25' | 'tfidf' | 'phrase'>('bm25');
  const [k1, setK1] = useState(1.5);
  const [b, setB] = useState(0.75);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'score' | 'title' | 'tokens' | 'date'>('score');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [showTuning, setShowTuning] = useState(false);
  const [selectedResultForBreakdown, setSelectedResultForBreakdown] = useState<SearchResult | null>(null);

  // Available categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const doc of indexEngine.documents.values()) {
      if (doc.category) cats.add(doc.category);
    }
    return ['All', ...Array.from(cats).sort()];
  }, [indexEngine.totalDocs]);

  // Execute Search
  const { results, latencyMs, rawMatchesCount } = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return { results: [], latencyMs: 0, rawMatchesCount: 0 };
    }

    const t0 = performance.now();
    let rawResults: SearchResult[] = [];

    if (algorithm === 'bm25') {
      rawResults = indexEngine.rankBm25(trimmed, k1, b);
    } else if (algorithm === 'tfidf') {
      rawResults = indexEngine.rankTfidf(trimmed);
    } else {
      rawResults = indexEngine.rankPhrase(trimmed);
    }

    const t1 = performance.now();
    const elapsed = Number((t1 - t0).toFixed(3));

    // Apply category filter
    let filtered = rawResults;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    // Apply sorting
    if (sortBy === 'title') {
      filtered.sort((x, y) => x.title.localeCompare(y.title));
    } else if (sortBy === 'tokens') {
      filtered.sort((x, y) => y.tokenCount - x.tokenCount);
    } else {
      filtered.sort((x, y) => y.score - x.score);
    }

    return {
      results: filtered,
      latencyMs: elapsed,
      rawMatchesCount: rawResults.length,
    };
  }, [query, algorithm, k1, b, selectedCategory, sortBy, indexEngine.totalDocs]);

  // Safely record query telemetry in useEffect after render
  const lastRecordedKeyRef = useRef<string>('');
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const key = `${trimmed}|${algorithm}|${k1}|${b}|${rawMatchesCount}|${latencyMs}`;
    if (lastRecordedKeyRef.current !== key) {
      lastRecordedKeyRef.current = key;
      onRecordQuery(trimmed, algorithm, latencyMs, rawMatchesCount);
    }
  }, [query, algorithm, k1, b, latencyMs, rawMatchesCount, onRecordQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Helper for highlighting keywords in snippet and title
  const highlightText = (text: string, matchedTerms: string[]) => {
    if (!matchedTerms || matchedTerms.length === 0) return text;
    const escaped = matchedTerms.filter(Boolean).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (escaped.length === 0) return text;

    const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-amber-100 text-amber-900 font-semibold px-0.5 rounded-xs"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const sampleQueries = [
    'inverted index search',
    '"inverted index"',
    'okapi bm25 ranking',
    'distributed systems raft',
    'postgresql gin index',
    'storage engines lsm',
  ];

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Main Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="w-5 h-5 text-indigo-600" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search documents using terms or exact phrase like &quot;inverted index&quot;..."
              className="w-full pl-11 pr-24 py-3 bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 rounded-xl text-slate-900 placeholder-slate-400 text-sm sm:text-base outline-none transition-all shadow-xs"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setPage(1);
                }}
                className="absolute inset-y-0 right-3 my-auto h-7 px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Query Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-400">Try queries:</span>
            {sampleQueries.map((sq) => (
              <button
                key={sq}
                onClick={() => {
                  setQuery(sq);
                  if (sq.startsWith('"')) {
                    setAlgorithm('phrase');
                  } else {
                    setAlgorithm('bm25');
                  }
                  setPage(1);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono transition-colors"
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Controls Bar: Algorithm Picker, Tuning Button, Sorting */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            {/* Algorithm Segmented Controls */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                onClick={() => {
                  setAlgorithm('bm25');
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  algorithm === 'bm25'
                    ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Okapi BM25
              </button>
              <button
                onClick={() => {
                  setAlgorithm('tfidf');
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  algorithm === 'tfidf'
                    ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Smooth TF-IDF
              </button>
              <button
                onClick={() => {
                  setAlgorithm('phrase');
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  algorithm === 'phrase'
                    ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Exact Phrase
              </button>
            </div>

            {/* Tuning Toggle & Filters */}
            <div className="flex items-center gap-2">
              {algorithm === 'bm25' && (
                <button
                  onClick={() => setShowTuning(!showTuning)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    showTuning
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Tune (k1, b)</span>
                </button>
              )}

              {/* Category Filter */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 hidden sm:inline">Category:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-1 text-xs">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="score">Sort by Score</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="tokens">Doc Length</option>
                </select>
              </div>
            </div>
          </div>

          {/* BM25 Tuning Panel */}
          {algorithm === 'bm25' && showTuning && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-in fade-in">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-800">
                    k1 (Term Saturation): <span className="font-mono text-indigo-700">{k1}</span>
                  </label>
                  <span className="text-slate-400 text-[11px]">Recommended: 1.2 - 2.0</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={k1}
                  onChange={(e) => setK1(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Controls how quickly term frequency saturates. Higher k1 rewards documents with repeated query terms more strongly.
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-800">
                    b (Length Normalization): <span className="font-mono text-indigo-700">{b}</span>
                  </label>
                  <span className="text-slate-400 text-[11px]">Recommended: 0.75</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={b}
                  onChange={(e) => setB(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Controls document length penalty. 1.0 fully penalizes long documents; 0.0 disables length normalization completely.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Telemetry & Summary Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span>Found <strong className="text-slate-900">{results.length}</strong> matching documents</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
            <Clock className="w-3 h-3 text-emerald-600" />
            <span>{latencyMs} ms latency</span>
          </span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">Model: <strong className="text-slate-700 uppercase font-mono">{algorithm}</strong></span>
        </div>

        {results.length > 0 && (
          <div>
            <span>Page <strong className="text-slate-900">{currentPage}</strong> of <strong className="text-slate-900">{totalPages}</strong></span>
          </div>
        )}
      </div>

      {/* Results List */}
      {paginatedResults.length > 0 ? (
        <div className="space-y-4">
          {paginatedResults.map((result) => {
            const rawDoc = indexEngine.documents.get(result.id);
            return (
              <article
                key={result.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                {/* Header: Title and Relevance Score */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3
                      onClick={() => onViewDocument(result.id)}
                      className="text-base font-semibold text-slate-900 hover:text-indigo-600 cursor-pointer transition-colors"
                    >
                      {highlightText(result.title, result.matchedTerms)}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span>{result.category}</span>
                      {rawDoc?.author && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>by {rawDoc.author}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span>{result.tokenCount} tokens</span>
                    </div>
                  </div>

                  {/* Score Pill & Breakdown Trigger */}
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => setSelectedResultForBreakdown(result)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors text-indigo-800 text-xs font-mono font-medium"
                      title="Inspect term-by-term score calculation"
                    >
                      <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Score: {result.score}</span>
                    </button>
                    <span className="text-[10px] text-slate-400">Click to view math</span>
                  </div>
                </div>

                {/* KWIC Snippet */}
                <p className="text-sm text-slate-600 leading-relaxed font-sans">
                  {highlightText(result.snippet, result.matchedTerms)}
                </p>

                {/* Footer metadata & Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>Matched terms:</span>
                    <div className="flex flex-wrap gap-1">
                      {result.matchedTerms.map((t) => (
                        <span
                          key={t}
                          className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => onViewDocument(result.id)}
                    className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    <span>Read Full Document</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </article>
            );
          })}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                disabled={currentPage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1 text-xs">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`w-8 h-8 rounded-lg font-medium transition-colors ${
                      pNum === currentPage
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {pNum}
                  </button>
                ))}
              </div>

              <button
                disabled={currentPage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <FileQuestion className="w-6 h-6 text-slate-500" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-base font-semibold text-slate-900">
              No matching documents found
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              No document in the current index matches your query with algorithm{' '}
              <span className="font-mono font-medium text-slate-700">
                {algorithm}
              </span>
              .
            </p>
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-md mx-auto text-left space-y-2">
            <p className="font-semibold text-slate-800">Search troubleshooting tips:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
              <li>If using quotes (phrase search), ensure the words appear in exact consecutive order.</li>
              <li>Check for typos or uncommon words that might be filtered out.</li>
              <li>Switch from <em>Exact Phrase</em> to <em>Okapi BM25</em> for broad matching.</li>
              <li>Load the pre-indexed Computer Science dataset in the Document Studio.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Mathematical Breakdown Modal */}
      <ScoreBreakdownModal
        result={selectedResultForBreakdown}
        algorithm={algorithm}
        k1={k1}
        b={b}
        onClose={() => setSelectedResultForBreakdown(null)}
      />
    </div>
  );
};
