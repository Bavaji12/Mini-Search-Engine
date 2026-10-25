import React from 'react';
import { Search, Database, FileText, Cpu, BookOpen, Code2 } from 'lucide-react';

export type ActiveTab = 'search' | 'index' | 'documents' | 'benchmark' | 'guide' | 'code';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  documentCount: number;
  vocabSize: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  documentCount,
  vocabSize,
}) => {
  const navItems: Array<{ id: ActiveTab; label: string; icon: React.ReactNode }> = [
    { id: 'search', label: 'Search & Ranking', icon: <Search className="w-4 h-4" /> },
    { id: 'index', label: 'Index Inspector', icon: <Database className="w-4 h-4" /> },
    { id: 'documents', label: 'Document Studio', icon: <FileText className="w-4 h-4" /> },
    { id: 'benchmark', label: 'Benchmark Lab', icon: <Cpu className="w-4 h-4" /> },
    { id: 'guide', label: 'Architecture & Defense', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'code', label: 'Python & Docker Code', icon: <Code2 className="w-4 h-4" /> },
  ];

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                  Mini Search Engine
                </span>
                <span className="text-xs text-indigo-700 bg-indigo-50 font-medium px-2 py-0.5 rounded-md border border-indigo-100">
                  Inverted Index
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                BM25 · TF-IDF · Positional Phrase Search · Python/Postgres Architecture
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="hidden md:flex items-center gap-5 text-xs text-slate-500 border-l border-slate-200 pl-5">
            <div>
              <span className="text-slate-400">Indexed Docs:</span>{' '}
              <span className="font-semibold text-slate-900">{documentCount}</span>
            </div>
            <div>
              <span className="text-slate-400">Unique Vocabulary:</span>{' '}
              <span className="font-semibold text-slate-900">{vocabSize} terms</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto pb-2 scrollbar-none">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
