import React, { useState } from 'react';
import {
  Cpu,
  Play,
  RotateCcw,
  Clock,
  Activity,
  Zap,
  BarChart2,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { ClientInvertedIndex } from '../engine/InvertedIndex';
import { TelemetryMetrics, BenchmarkResult } from '../types';

interface BenchmarkLabTabProps {
  indexEngine: ClientInvertedIndex;
  telemetry: TelemetryMetrics;
  onClearTelemetry: () => void;
}

export const BenchmarkLabTab: React.FC<BenchmarkLabTabProps> = ({
  indexEngine,
  telemetry,
  onClearTelemetry,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResult[] | null>(null);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);

  const calculatePercentile = (sortedArr: number[], p: number): number => {
    if (sortedArr.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sortedArr.length) - 1;
    return Number(sortedArr[Math.max(0, Math.min(idx, sortedArr.length - 1))].toFixed(3));
  };

  // Run the repeatable benchmark test suite
  const runBenchmarkSuite = async () => {
    setIsRunning(true);
    setBenchmarkProgress(10);

    // Yield control to let React render progress state
    await new Promise((r) => setTimeout(r, 50));

    const testSuites = [
      {
        name: 'Single-Term Queries (BM25)',
        queries: [
          'database', 'search', 'consensus', 'index', 'python',
          'algorithm', 'storage', 'retrieval', 'distributed', 'fastapi',
          'vector', 'raft', 'engine', 'posting', 'cluster',
          'systems', 'query', 'document', 'token', 'model'
        ],
        run: (q: string) => indexEngine.rankBm25(q),
      },
      {
        name: 'Multi-Term Boolean Queries (BM25)',
        queries: [
          'inverted index search',
          'distributed systems raft',
          'postgresql gin full text search',
          'storage engines lsm trees btrees',
          'vector embeddings sparse lexical search',
          'okapi bm25 probabilistic ranking',
          'high performance concurrency python asyncio',
          'tokenization stemming porter algorithm'
        ],
        run: (q: string) => indexEngine.rankBm25(q),
      },
      {
        name: 'Exact Phrase Queries (Positional Matching)',
        queries: [
          '"inverted index"',
          '"search engines"',
          '"storage engines"',
          '"consensus algorithm"',
          '"relational databases"',
          '"information retrieval"',
          '"full text search"'
        ],
        run: (q: string) => indexEngine.rankPhrase(q.replace(/"/g, '')),
      },
      {
        name: 'Smooth TF-IDF Queries',
        queries: [
          'inverted index search',
          'distributed systems',
          'postgresql full text',
          'consensus raft protocol',
          'storage engines'
        ],
        run: (q: string) => indexEngine.rankTfidf(q),
      },
    ];

    const results: BenchmarkResult[] = [];
    const totalSuites = testSuites.length;

    for (let sIdx = 0; sIdx < totalSuites; sIdx++) {
      const suite = testSuites[sIdx];
      const latencies: number[] = [];
      const iterationsPerQuery = 5; // 5 repeats to ensure stable statistical sampling

      for (let i = 0; i < iterationsPerQuery; i++) {
        for (const q of suite.queries) {
          const t0 = performance.now();
          suite.run(q);
          const t1 = performance.now();
          latencies.push(t1 - t0);
        }
      }

      latencies.sort((a, b) => a - b);
      const totalTime = latencies.reduce((a, b) => a + b, 0);
      const avg = totalTime / latencies.length;

      results.push({
        name: suite.name,
        iterations: latencies.length,
        totalTimeMs: Number(totalTime.toFixed(2)),
        minMs: Number(latencies[0].toFixed(3)),
        avgMs: Number(avg.toFixed(3)),
        p50Ms: calculatePercentile(latencies, 50),
        p95Ms: calculatePercentile(latencies, 95),
        maxMs: Number(latencies[latencies.length - 1].toFixed(3)),
      });

      setBenchmarkProgress(Math.round(((sIdx + 1) / totalSuites) * 100));
      await new Promise((r) => setTimeout(r, 20));
    }

    setBenchmarkResults(results);
    setIsRunning(false);
  };

  return (
    <div className="space-y-8">
      {/* Top Telemetry Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <span>Real-Time Search Telemetry & Latency Dashboard</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              High-resolution timing tracked via <code>performance.now()</code>. No synthetic or hallucinated results.
            </p>
          </div>

          <button
            onClick={onClearTelemetry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors w-fit"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Telemetry Log</span>
          </button>
        </div>

        {/* Real-time Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium uppercase">Total Queries</span>
            <p className="text-xl font-bold text-slate-900 mt-1">{telemetry.totalQueries}</p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[11px] text-slate-500 font-medium uppercase">Avg Latency</span>
            <p className="text-xl font-bold text-slate-900 mt-1">
              {telemetry.avgLatencyMs.toFixed(3)}{' '}
              <span className="text-xs font-normal text-slate-500">ms</span>
            </p>
          </div>

          <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
            <span className="text-[11px] text-indigo-900 font-medium uppercase">p50 Median</span>
            <p className="text-xl font-bold text-indigo-700 mt-1">
              {telemetry.p50LatencyMs.toFixed(3)}{' '}
              <span className="text-xs font-normal text-indigo-500">ms</span>
            </p>
          </div>

          <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/60">
            <span className="text-[11px] text-amber-900 font-medium uppercase">p95 Latency</span>
            <p className="text-xl font-bold text-amber-700 mt-1">
              {telemetry.p95LatencyMs.toFixed(3)}{' '}
              <span className="text-xs font-normal text-amber-600">ms</span>
            </p>
          </div>

          <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200/60 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-rose-900 font-medium uppercase">p99 Latency</span>
            <p className="text-xl font-bold text-rose-700 mt-1">
              {telemetry.p99LatencyMs.toFixed(3)}{' '}
              <span className="text-xs font-normal text-rose-500">ms</span>
            </p>
          </div>
        </div>
      </div>

      {/* Repeatable Automated Benchmark Suite Runner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600" />
              <span>Automated Benchmark Suite Runner</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Executes a repeatable battery of 100+ queries across Single-Word, Multi-Word, Exact Phrase, and TF-IDF models to measure latency distribution.
            </p>
          </div>

          <button
            disabled={isRunning}
            onClick={runBenchmarkSuite}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isRunning ? `Benchmarking (${benchmarkProgress}%)...` : 'Run Benchmark Suite'}</span>
          </button>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${benchmarkProgress}%` }}
            />
          </div>
        )}

        {/* Benchmark Results Table */}
        {benchmarkResults && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Benchmark completed successfully on active corpus ({indexEngine.totalDocs} documents,{' '}
                {indexEngine.index.size} vocabulary terms).
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Benchmark Test Suite</th>
                    <th className="py-3 px-4">Samples</th>
                    <th className="py-3 px-4">Min (ms)</th>
                    <th className="py-3 px-4">Mean (ms)</th>
                    <th className="py-3 px-4">p50 Median</th>
                    <th className="py-3 px-4">p95</th>
                    <th className="py-3 px-4 text-right">Max (ms)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {benchmarkResults.map((b) => (
                    <tr key={b.name} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{b.name}</td>
                      <td className="py-3 px-4 font-mono">{b.iterations}</td>
                      <td className="py-3 px-4 font-mono text-emerald-700">{b.minMs}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">{b.avgMs}</td>
                      <td className="py-3 px-4 font-mono text-indigo-700 font-semibold">{b.p50Ms}</td>
                      <td className="py-3 px-4 font-mono text-amber-700">{b.p95Ms}</td>
                      <td className="py-3 px-4 font-mono text-right text-slate-500">{b.maxMs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Live Recent Query Log */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Recent Query Log ({telemetry.queryHistory.length} logged)</span>
        </h3>

        {telemetry.queryHistory.length > 0 ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Query String</th>
                  <th className="py-2.5 px-4">Algorithm</th>
                  <th className="py-2.5 px-4">Matches</th>
                  <th className="py-2.5 px-4 text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {telemetry.queryHistory.slice(0, 15).map((q, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-900">{q.query}</td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[11px] uppercase bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {q.algorithm}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono">{q.matchCount} docs</td>
                    <td className="py-2.5 px-4 text-right font-mono font-medium text-emerald-700">
                      {q.latencyMs} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 py-6 text-center">
            No queries logged yet. Type queries in the Search tab or run the benchmark suite above.
          </p>
        )}
      </div>
    </div>
  );
};
