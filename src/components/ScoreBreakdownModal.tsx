import React from 'react';
import { X, Calculator, Info } from 'lucide-react';
import { SearchResult } from '../types';

interface ScoreBreakdownModalProps {
  result: SearchResult | null;
  algorithm: 'bm25' | 'tfidf' | 'phrase';
  k1: number;
  b: number;
  onClose: () => void;
}

export const ScoreBreakdownModal: React.FC<ScoreBreakdownModalProps> = ({
  result,
  algorithm,
  k1,
  b,
  onClose,
}) => {
  if (!result) return null;

  const terms = Object.entries(result.breakdown.terms || {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900">
              Relevance Score Breakdown: {result.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Box */}
          <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-900 font-medium uppercase tracking-wider">
                Total Score ({algorithm.toUpperCase()})
              </p>
              <p className="text-2xl font-bold text-indigo-900 mt-1">{result.score}</p>
            </div>
            <div className="text-right text-xs text-slate-600 space-y-1">
              <p>Doc Length: <span className="font-semibold text-slate-900">{result.tokenCount} tokens</span></p>
              {algorithm === 'bm25' && (
                <p>Parameters: <span className="font-mono font-medium">k1={k1}, b={b}</span></p>
              )}
            </div>
          </div>

          {/* Formula Reference */}
          <div className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              <span>Applied Mathematical Formula:</span>
            </div>
            {algorithm === 'bm25' ? (
              <p className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                Score = ∑ IDF(t) × [ f(t,D) × (k1 + 1) ] / [ f(t,D) + k1 × (1 - b + b × (|D| / avgdl)) ]
              </p>
            ) : algorithm === 'tfidf' ? (
              <p className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                Score = ∑ [ f(t,D) / |D| ] × [ ln((N + 1) / (DF(t) + 1)) + 1 ]
              </p>
            ) : (
              <p className="font-mono text-slate-700 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                Score = Exact sequential phrase matches verified via positional postings
              </p>
            )}
          </div>

          {/* Term Table */}
          {terms.length > 0 ? (
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-2">
                Contribution per Query Term
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Term</th>
                      <th className="py-2.5 px-3">Raw TF</th>
                      <th className="py-2.5 px-3">IDF</th>
                      {algorithm === 'bm25' && <th className="py-2.5 px-3">TF Weight</th>}
                      <th className="py-2.5 px-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {terms.map(([term, data]) => (
                      <tr key={term} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-medium text-indigo-700">{term}</td>
                        <td className="py-2.5 px-3 font-mono">{data.rawTf}</td>
                        <td className="py-2.5 px-3 font-mono">{data.idf}</td>
                        {algorithm === 'bm25' && (
                          <td className="py-2.5 px-3 font-mono text-slate-500">{data.tfWeight}</td>
                        )}
                        <td className="py-2.5 px-3 font-mono text-right font-semibold text-slate-900">
                          {data.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Exact phrase matches found: {result.breakdown.phraseOccurrences ?? 1} occurrence(s).
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
