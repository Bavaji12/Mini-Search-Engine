/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { SearchTab } from './components/SearchTab';
import { IndexInspectorTab } from './components/IndexInspectorTab';
import { DocumentStudioTab } from './components/DocumentStudioTab';
import { BenchmarkLabTab } from './components/BenchmarkLabTab';
import { InterviewGuideTab } from './components/InterviewGuideTab';
import { CodeExplorerTab } from './components/CodeExplorerTab';
import { DocumentDetailModal } from './components/DocumentDetailModal';
import { ClientInvertedIndex } from './engine/InvertedIndex';
import { COMPUTER_SCIENCE_DATASET } from './engine/sampleData';
import { DocumentItem, TelemetryMetrics } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [documents, setDocuments] = useState<DocumentItem[]>(COMPUTER_SCIENCE_DATASET);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  // Inverted Index instance
  const indexEngine = useMemo(() => {
    const engine = new ClientInvertedIndex(true);
    for (const doc of documents) {
      engine.addDocument(doc);
    }
    return engine;
  }, [documents]);

  // Telemetry state
  const [telemetry, setTelemetry] = useState<TelemetryMetrics>({
    totalQueries: 0,
    avgLatencyMs: 0,
    p50LatencyMs: 0,
    p95LatencyMs: 0,
    p99LatencyMs: 0,
    queryHistory: [],
  });

  const allLatenciesRef = useRef<number[]>([]);

  // Telemetry logger callback
  const handleRecordQuery = useCallback((
    query: string,
    algorithm: string,
    latencyMs: number,
    matchCount: number
  ) => {
    allLatenciesRef.current.push(latencyMs);
    const sorted = [...allLatenciesRef.current].sort((a, b) => a - b);
    const total = sorted.reduce((sum, v) => sum + v, 0);
    const avg = total / sorted.length;

    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    setTelemetry((prev) => ({
      totalQueries: prev.totalQueries + 1,
      avgLatencyMs: Number(avg.toFixed(3)),
      p50LatencyMs: Number(p50.toFixed(3)),
      p95LatencyMs: Number(p95.toFixed(3)),
      p99LatencyMs: Number(p99.toFixed(3)),
      queryHistory: [
        {
          query,
          algorithm,
          latencyMs,
          matchCount,
          timestamp: Date.now(),
        },
        ...prev.queryHistory.slice(0, 49),
      ],
    }));
  }, []);

  const handleClearTelemetry = () => {
    allLatenciesRef.current = [];
    setTelemetry({
      totalQueries: 0,
      avgLatencyMs: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      queryHistory: [],
    });
  };

  // Document Management Callbacks
  const handleAddDocument = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleUpdateDocument = (updatedDoc: DocumentItem) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
    );
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));
  };

  const handleLoadDataset = (dataset: DocumentItem[]) => {
    setDocuments(dataset);
  };

  const viewingDocument = useMemo(() => {
    if (!viewingDocId) return null;
    return documents.find((d) => d.id === viewingDocId) || null;
  }, [viewingDocId, documents]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        documentCount={documents.length}
        vocabSize={indexEngine.index.size}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'search' && (
          <SearchTab
            indexEngine={indexEngine}
            onRecordQuery={handleRecordQuery}
            onViewDocument={(id) => setViewingDocId(id)}
          />
        )}

        {activeTab === 'index' && (
          <IndexInspectorTab
            indexEngine={indexEngine}
            onViewDocument={(id) => setViewingDocId(id)}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentStudioTab
            documents={documents}
            onAddDocument={handleAddDocument}
            onUpdateDocument={handleUpdateDocument}
            onDeleteDocument={handleDeleteDocument}
            onLoadDataset={handleLoadDataset}
            onViewDocument={(id) => setViewingDocId(id)}
          />
        )}

        {activeTab === 'benchmark' && (
          <BenchmarkLabTab
            indexEngine={indexEngine}
            telemetry={telemetry}
            onClearTelemetry={handleClearTelemetry}
          />
        )}

        {activeTab === 'guide' && <InterviewGuideTab />}

        {activeTab === 'code' && <CodeExplorerTab />}
      </main>

      {/* Document Detail Modal */}
      <DocumentDetailModal
        document={viewingDocument}
        onClose={() => setViewingDocId(null)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            Mini Search Engine with Inverted Index & Positional Postings · Portfolio Project
          </p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>FastAPI Backend</span>
            <span aria-hidden="true">·</span>
            <span>PostgreSQL 16</span>
            <span aria-hidden="true">·</span>
            <span>Docker Compose</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
