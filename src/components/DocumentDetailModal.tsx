import React from 'react';
import { X, FileText, Calendar, User, Tag, Hash } from 'lucide-react';
import { DocumentItem } from '../types';

interface DocumentDetailModalProps {
  document: DocumentItem | null;
  onClose: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  document,
  onClose,
}) => {
  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {document.title}
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
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span>{document.category}</span>
            </div>
            {document.author && (
              <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>{document.author}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md">
              <Hash className="w-3.5 h-3.5 text-slate-500" />
              <span>{document.tokenCount} indexed tokens</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] ml-auto">
              <span>ID: {document.id}</span>
            </div>
          </div>

          {/* Full Content */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Document Text
            </h4>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-sans text-sm text-slate-700 leading-relaxed whitespace-pre-wrap select-text">
              {document.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
