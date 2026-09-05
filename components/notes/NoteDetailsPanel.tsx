import React, { useState, useEffect } from 'react';
import {
  Folder as FolderIconLucide,
  Tag,
  Hash,
  Clock,
  FileText,
  History,
  Link,
  Check,
  X,
  Plus,
  BookOpen,
  ChevronRight,
  ListTree,
} from 'lucide-react';
import { Folder, Note } from '../../types';

interface NoteDetailsPanelProps {
  note: Note;
  folders: Folder[];
  onUpdateFolder: (folderId: number | null) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onOpenVersionHistory: () => void;
  onClose: () => void;
}

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export const NoteDetailsPanel: React.FC<NoteDetailsPanelProps> = ({
  note,
  folders,
  onUpdateFolder,
  onAddTag,
  onRemoveTag,
  onOpenVersionHistory,
  onClose,
}) => {
  const [newTagInput, setNewTagInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [tocItems, setTocItems] = useState<TocItem[]>([]);

  // Calculate stats
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = note.content || '';
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Extract headings for Table of Contents (TOC)
  useEffect(() => {
    const headings = tempDiv.querySelectorAll('h1, h2, h3');
    const items: TocItem[] = [];
    headings.forEach((h, index) => {
      const text = h.textContent?.trim() || '';
      if (text) {
        items.push({
          id: `heading-${index}`,
          text,
          level: parseInt(h.tagName.substring(1)) || 1,
        });
      }
    });
    setTocItems(items);
  }, [note.content]);

  const handleAddTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagInput.trim().replace(/^#/, '').toLowerCase();
    if (cleanTag && !(note.tags || []).includes(cleanTag)) {
      onAddTag(cleanTag);
      setNewTagInput('');
    }
  };

  const handleCopyNoteLink = () => {
    const link = `${window.location.origin}/#note-${note.id}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-72 flex-shrink-0 h-full bg-slate-50/90 dark:bg-slate-900/90 border-l border-slate-200/80 dark:border-slate-800 flex flex-col p-4 text-xs select-none custom-scrollbar overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/70 dark:border-slate-800 mb-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-sm">
          <BookOpen className="w-4 h-4 text-sky-500" />
          Detalles de la Nota
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Block */}
      <div className="space-y-2 mb-4 p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Estadísticas
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span>Palabras:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">{wordCount}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span>Caracteres:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">{charCount}</span>
        </div>
        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
          <span>Tiempo de lectura:</span>
          <span className="font-semibold text-sky-600 dark:text-sky-400 font-mono">~{readingTimeMin} min</span>
        </div>
      </div>

      {/* Folder Assignment */}
      <div className="space-y-1.5 mb-4">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Carpeta
        </label>
        <div className="relative">
          <select
            value={note.folder_id || ''}
            onChange={(e) => onUpdateFolder(e.target.value ? Number(e.target.value) : null)}
            className="w-full pl-8 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 appearance-none text-xs"
          >
            <option value="">(Sin carpeta / Raíz)</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>
                📁 {f.name}
              </option>
            ))}
          </select>
          <FolderIconLucide className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Tags Manager */}
      <div className="space-y-2 mb-4">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Etiquetas
        </label>
        
        {/* Existing Tags */}
        <div className="flex flex-wrap gap-1.5 min-h-[28px]">
          {(note.tags || []).map(t => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-semibold"
            >
              #{t}
              <button
                onClick={() => onRemoveTag(t)}
                className="hover:text-rose-500 rounded-full"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {(note.tags || []).length === 0 && (
            <span className="text-[11px] text-slate-400 italic">Sin etiquetas</span>
          )}
        </div>

        {/* Add Tag Form */}
        <form onSubmit={handleAddTagSubmit} className="flex gap-1">
          <div className="relative flex-1">
            <Hash className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nueva etiqueta..."
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              className="w-full pl-6 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!newTagInput.trim()}
            className="p-1.5 rounded-lg bg-sky-500 disabled:opacity-40 text-white font-bold hover:bg-sky-600 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Table of Contents / Outline */}
      {tocItems.length > 0 && (
        <div className="space-y-1.5 mb-4 flex-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ListTree className="w-3 h-3" />
            <span>Índice / Estructura</span>
          </div>
          <div className="space-y-1 max-h-44 overflow-y-auto custom-scrollbar p-2 bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-800">
            {tocItems.map((item, idx) => (
              <div
                key={idx}
                className="text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer truncate py-0.5"
                style={{ paddingLeft: `${(item.level - 1) * 8}px` }}
              >
                <span className="opacity-40 mr-1">#</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Utility Actions */}
      <div className="mt-auto pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-2">
        <button
          onClick={onOpenVersionHistory}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:border-sky-400 transition-all shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-sky-500" />
            <span>Historial de Versiones</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>

        <button
          onClick={handleCopyNoteLink}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:border-sky-400 transition-all shadow-2xs"
        >
          <div className="flex items-center gap-2">
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copiedLink ? '¡Enlace copiado!' : 'Copiar Enlace Directo'}</span>
          </div>
        </button>
      </div>

    </div>
  );
};
