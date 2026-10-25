import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  Layers,
  Sparkles,
  ListTree,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { ClientInvertedIndex } from '../engine/InvertedIndex';

interface IndexInspectorTabProps {
  indexEngine: ClientInvertedIndex;
  onViewDocument: (docId: string) => void;
}

export const IndexInspectorTab: React.FC<IndexInspectorTabProps> = ({
  indexEngine,
  onViewDocument,
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string>('index');
  const [sandboxText, setSandboxText] = useState(
    'An inverted index maps words to their positional locations in modern search engines.'
  );
  const [filterStopwords, setFilterStopwords] = useState(true);

  // Vocabulary entries
  const vocabulary = useMemo(() => {
    const list: Array<{ term: string; df: number; totalTf: number }> = [];
    for (const [term, postings] of indexEngine.index.entries()) {
      const totalTf = postings.reduce((sum, p) => sum + p.termFrequency, 0);
      list.push({ term, df: postings.length, totalTf });
    }
    list.sort((a, b) => b.df - a.df || a.term.localeCompare(b.term));
    return list;
  }, [indexEngine.totalDocs]);

  const filteredVocab = useMemo(() => {
    if (!filterText.trim()) return vocabulary;
    const lower = filterText.toLowerCase();
    return vocabulary.filter((v) => v.term.includes(lower));
  }, [vocabulary, filterText]);

  // Selected term's posting list
  const activePostings = useMemo(() => {
    if (!selectedTerm) return [];
    return indexEngine.getPostingList(selectedTerm);
  }, [selectedTerm, indexEngine.totalDocs]);

  // Tokenizer Sandbox Analysis
  const sandboxAnalysis = useMemo(() => {
    const tokenizer = indexEngine.tokenizer;
    const rawTokens = sandboxText.toLowerCase().match(/\b[a-zA-Z0-9_]+\b/g) || [];
    const withPositions = tokenizer.tokenizeWithPositions(sandboxText);
    const stoppedCount = rawTokens.length - withPositions.length;

    return {
      rawTokens,
      withPositions,
      stoppedCount,
    };
  }, [sandboxText, filterStopwords, indexEngine.tokenizer]);

  return (
    <div className="space-y-8">
      {/* Overview stats banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-medium">Unique Vocabulary Terms</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{indexEngine.index.size}</p>
          <p className="text-xs text-slate-400 mt-1">Hash map dictionary entries</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-medium">Total Postings</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {Array.from(indexEngine.index.values()).reduce((sum, p) => sum + p.length, 0)}
          </p>
          <p className="text-xs text-slate-400 mt-1">PostingEntry records in memory</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-medium">Average Document Length</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {indexEngine.avgDocLength.toFixed(1)}{' '}
            <span className="text-sm font-normal text-slate-500">tokens</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">Used for BM25 normalization</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 uppercase font-medium">Index Memory Footprint</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">
            ~{Math.round((indexEngine.totalDocLength * 16) / 1024)} KB
          </p>
          <p className="text-xs text-slate-400 mt-1">Estimated compressed memory</p>
        </div>
      </div>

      {/* Posting List Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dictionary / Vocabulary Table */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[560px]">
          <div className="p-4 border-b border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTree className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-slate-900">Term Dictionary</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {filteredVocab.length} terms
              </span>
            </div>
            {/* Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter vocabulary..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg text-xs outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredVocab.map((item) => {
              const isSelected = selectedTerm === item.term;
              return (
                <button
                  key={item.term}
                  onClick={() => setSelectedTerm(item.term)}
                  className={`w-full px-4 py-2.5 flex items-center justify-between text-left transition-colors ${
                    isSelected ? 'bg-indigo-50/80 text-indigo-900' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-mono text-xs font-semibold">{item.term}</span>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span>DF: <strong className="text-slate-700">{item.df}</strong></span>
                    <span>TF: <strong className="text-slate-700">{item.totalTf}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Posting List for Selected Term */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[560px]">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Posting List for <code className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-mono">"{selectedTerm}"</code>
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Found in <strong className="text-slate-800">{activePostings.length}</strong> document(s)
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {activePostings.length > 0 ? (
              activePostings.map((p) => {
                const doc = indexEngine.documents.get(p.docId);
                return (
                  <div
                    key={p.docId}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <button
                          onClick={() => onViewDocument(p.docId)}
                          className="text-xs font-semibold text-slate-900 hover:text-indigo-600 text-left transition-colors"
                        >
                          {doc?.title || p.docId}
                        </button>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Doc ID: <span className="font-mono text-slate-600">{p.docId}</span> · Category: {doc?.category || 'General'}
                        </p>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono font-medium">
                        TF: {p.termFrequency}
                      </div>
                    </div>

                    {/* Positions */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[11px] text-slate-500 mb-1.5 font-medium">
                        Positional Index Offsets ({p.positions.length}):
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {p.positions.map((pos) => (
                          <span
                            key={pos}
                            className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-mono text-[11px]"
                          >
                            pos {pos}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs">
                Select a term on the left to inspect its posting list and token positions.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Tokenizer & Normalization Pipeline Sandbox */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Interactive Tokenizer & Preprocessing Sandbox</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Type or paste arbitrary text below to inspect step-by-step tokenization, stopword removal, and position indexing.
            </p>
          </div>
        </div>

        {/* Input Textarea */}
        <textarea
          rows={3}
          value={sandboxText}
          onChange={(e) => setSandboxText(e.target.value)}
          placeholder="Type any sentence to see how the search engine normalizes it..."
          className="w-full p-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl text-xs sm:text-sm font-sans outline-none resize-none"
        />

        {/* Results Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Step 1: Raw tokens */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-800">1. Raw Alphanumeric Tokens</h4>
              <span className="text-[11px] font-mono text-slate-500">{sandboxAnalysis.rawTokens.length} tokens</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
              {sandboxAnalysis.rawTokens.map((t, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-mono text-[11px]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Step 2: Stopwords Filtered */}
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-amber-900">2. Stopwords Discarded</h4>
              <span className="text-[11px] font-mono text-amber-700">{sandboxAnalysis.stoppedCount} pruned</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Common stop words (e.g. <em>an</em>, <em>to</em>, <em>their</em>, <em>in</em>) are removed during indexing to save space and avoid low-discrimination posting bloat.
            </p>
          </div>

          {/* Step 3: Positional Indexed Tokens */}
          <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-indigo-900">3. Positional Tokens</h4>
              <span className="text-[11px] font-mono text-indigo-700">{sandboxAnalysis.withPositions.length} indexed</span>
            </div>
            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
              {sandboxAnalysis.withPositions.map((item, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-white border border-indigo-200 text-indigo-800 font-mono text-[11px] flex items-center gap-1"
                >
                  <strong>{item.token}</strong>
                  <span className="text-[10px] text-indigo-400">@{item.position}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
