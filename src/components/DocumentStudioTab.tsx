import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Upload,
  RefreshCw,
  Search,
  BookOpen,
  Check,
  AlertCircle
} from 'lucide-react';
import { DocumentItem } from '../types';
import { COMPUTER_SCIENCE_DATASET, HISTORY_LITERATURE_DATASET } from '../engine/sampleData';

interface DocumentStudioTabProps {
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  onUpdateDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
  onLoadDataset: (dataset: DocumentItem[]) => void;
  onViewDocument: (docId: string) => void;
}

export const DocumentStudioTab: React.FC<DocumentStudioTabProps> = ({
  documents,
  onAddDocument,
  onUpdateDocument,
  onDeleteDocument,
  onLoadDataset,
  onViewDocument,
}) => {
  const [filterText, setFilterText] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('Search Systems');
  const [formAuthor, setFormAuthor] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formError, setFormError] = useState('');

  const filteredDocs = documents.filter((d) => {
    const q = filterText.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q) ||
      (d.author && d.author.toLowerCase().includes(q))
    );
  });

  const handleOpenCreate = () => {
    setFormTitle('');
    setFormCategory('General');
    setFormAuthor('');
    setFormContent('');
    setFormError('');
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (doc: DocumentItem) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormCategory(doc.category);
    setFormAuthor(doc.author || '');
    setFormContent(doc.content);
    setFormError('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      setFormError('Title and document content are required.');
      return;
    }

    if (editingDoc) {
      // Update
      const updated: DocumentItem = {
        ...editingDoc,
        title: formTitle.trim(),
        category: formCategory.trim() || 'General',
        author: formAuthor.trim() || undefined,
        content: formContent.trim(),
        updatedAt: new Date().toISOString(),
      };
      onUpdateDocument(updated);
      setEditingDoc(null);
    } else {
      // Create
      const newDoc: DocumentItem = {
        id: `doc-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory.trim() || 'General',
        author: formAuthor.trim() || undefined,
        content: formContent.trim(),
        tokenCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onAddDocument(newDoc);
      setIsCreateOpen(false);
    }
  };

  // Batch file upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) return;

        // Try JSON parse if .json file
        if (file.name.endsWith('.json')) {
          try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
              parsed.forEach((item, idx) => {
                onAddDocument({
                  id: item.id || `uploaded-${Date.now()}-${idx}`,
                  title: item.title || `Document ${idx + 1}`,
                  category: item.category || 'Imported',
                  author: item.author || 'File Upload',
                  content: item.content || item.text || '',
                  tokenCount: 0,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              });
              return;
            }
          } catch (err) {
            console.error('Invalid JSON file', err);
          }
        }

        // Default text or markdown file
        onAddDocument({
          id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          category: 'Uploaded Files',
          author: 'User Upload',
          content: text,
          tokenCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Document Repository & Indexing Manager
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your corpus. Adding, editing, or deleting documents automatically updates posting lists.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset dataset dropdown */}
          <button
            onClick={() => onLoadDataset(COMPUTER_SCIENCE_DATASET)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
            <span>Load CS Dataset ({COMPUTER_SCIENCE_DATASET.length})</span>
          </button>

          <button
            onClick={() => onLoadDataset(HISTORY_LITERATURE_DATASET)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Load Classic Science ({HISTORY_LITERATURE_DATASET.length})</span>
          </button>

          {/* Upload Button */}
          <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Upload (.txt/.json)</span>
            <input
              type="file"
              multiple
              accept=".txt,.md,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Add Document */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Document</span>
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search documents by title, author, or category..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs outline-none shadow-xs"
          />
        </div>
        <span className="text-xs text-slate-400">
          Showing <strong className="text-slate-700">{filteredDocs.length}</strong> of {documents.length} documents
        </span>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs divide-y divide-slate-200">
          <thead className="bg-slate-50 text-slate-700 font-semibold">
            <tr>
              <th className="py-3 px-4">Title</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Author</th>
              <th className="py-3 px-4">Length</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4">
                  <button
                    onClick={() => onViewDocument(doc.id)}
                    className="font-medium text-slate-900 hover:text-indigo-600 text-left transition-colors"
                  >
                    {doc.title}
                  </button>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">{doc.id}</p>
                </td>
                <td className="py-3 px-4">
                  <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {doc.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-600">{doc.author || 'Anonymous'}</td>
                <td className="py-3 px-4 font-mono text-slate-600">{doc.tokenCount} tokens</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onViewDocument(doc.id)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100"
                      title="View full document"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(doc)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100"
                      title="Edit document"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${doc.title}" from the index?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50"
                      title="Delete document"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400">
                  No documents found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Create or Edit Document */}
      {(isCreateOpen || editingDoc) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingDoc ? 'Edit Document' : 'Add New Document to Index'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingDoc(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Document Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Distributed Hash Tables: Chord Protocol"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Category</label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Distributed Systems"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Author</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="e.g. Ion Stoica"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Document Content (Searchable Text) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Paste or write document text here. Text will be tokenized, normalized, and indexed automatically..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-lg outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingDoc(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  {editingDoc ? 'Update & Re-Index' : 'Index Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
