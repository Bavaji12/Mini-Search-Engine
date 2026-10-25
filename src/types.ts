export interface PostingEntry {
  docId: string;
  termFrequency: number;
  positions: number[];
}

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  author?: string;
  category: string;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TermScoreBreakdown {
  rawTf: number;
  tfWeight?: number;
  idf: number;
  docLen: number;
  avgdl?: number;
  score: number;
}

export interface ScoreBreakdown {
  terms: Record<string, TermScoreBreakdown>;
  totalScore: number;
  phraseOccurrences?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  score: number;
  category: string;
  tokenCount: number;
  breakdown: ScoreBreakdown;
  matchedTerms: string[];
}

export interface SearchStats {
  query: string;
  algorithm: 'bm25' | 'tfidf' | 'phrase';
  totalMatches: number;
  latencyMs: number;
  page: number;
  pageSize: number;
}

export interface TelemetryMetrics {
  totalQueries: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  queryHistory: Array<{
    query: string;
    algorithm: string;
    latencyMs: number;
    matchCount: number;
    timestamp: number;
  }>;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTimeMs: number;
  minMs: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}
