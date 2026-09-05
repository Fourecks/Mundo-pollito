import React, { useState } from 'react';
import {
  Folder as FolderIconLucide,
  FolderPlus,
  FileText,
  FilePlus,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Star,
  Clock,
  Pin,
  Archive,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Tag,
  Check,
  X,
  Sparkles,
  ArchiveRestore,
} from 'lucide-react';
import { Folder, Note } from '../../types';
import { NoteView, SortOrder } from './NotesTypes';
import { cleanToPlainText } from '../../utils/textCleaner';

interface NotesNavigationSidebarProps {
  currentView: NoteView;
  selectedFolderId: number | null;
  selectedTag: string | null;
  selectedNoteId: number | null;
  folders: Folder[];
  notes: Note[];
  filteredNotes: Note[];
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (order: SortOrder) => void;
  onSelectView: (view: NoteView, folderId?: number | null, tag?: string | null) => void;
  onSelectNote: (noteId: number) => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
  onStartRenameFolder: (folder: Folder) => void;
  onRequestDeleteFolder: (folder: Folder) => void;
  onRequestArchiveNote: (note: Note) => void;
  onRequestTrashNote: (note: Note) => void;
  onRequestPermanentDeleteNote: (note: Note) => void;
  onRestoreNote: (note: Note) => void;
  editingFolderId: number | null;
  editingFolderName: string;
  onEditingFolderNameChange: (name: string) => void;
  onSaveRenameFolder: () => void;
  isMobile?: boolean;
}

export const NotesNavigationSidebar: React.FC<NotesNavigationSidebarProps> = ({
  currentView,
  selectedFolderId,
  selectedTag,
  selectedNoteId,
  folders,
  notes,
  filteredNotes,
  searchTerm,
  onSearchTermChange,
  sortOrder,
  onSortOrderChange,
  onSelectView,
  onSelectNote,
  onCreateFolder,
  onCreateNote,
  onStartRenameFolder,
  onRequestDeleteFolder,
  onRequestArchiveNote,
  onRequestTrashNote,
  onRequestPermanentDeleteNote,
  onRestoreNote,
  editingFolderId,
  editingFolderName,
  onEditingFolderNameChange,
  onSaveRenameFolder,
  isMobile = false,
}) => {
  // Sidebar drill-down level: 'menu' | 'notes'
  const [sidebarLevel, setSidebarLevel] = useState<'menu' | 'notes'>('menu');
  const [folderMenuOpen, setFolderMenuOpen] = useState<number | null>(null);

  // Note counts
  const activeNotes = notes.filter(n => !n.deleted_at && !n.is_archived);
  const totalActiveCount = activeNotes.length;
  const favoritesCount = notes.filter(n => !n.deleted_at && !n.is_archived && n.is_favorite).length;
  const pinnedCount = notes.filter(n => !n.deleted_at && !n.is_archived && n.is_pinned).length;
  const archivedCount = notes.filter(n => !n.deleted_at && n.is_archived).length;
  const trashCount = notes.filter(n => !!n.deleted_at).length;

  // Extract all unique tags with count
  const tagCounts: { [tag: string]: number } = {};
  activeNotes.forEach(n => {
    (n.tags || []).forEach(t => {
      if (t) tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const allTags = Object.keys(tagCounts);

  // Current view title helper
  const getViewTitle = () => {
    if (currentView === 'folder') {
      const f = folders.find(folder => folder.id === selectedFolderId);
      return f ? f.name : 'Carpeta';
    }
    if (currentView === 'tag' && selectedTag) {
      return `#${selectedTag}`;
    }
    switch (currentView) {
      case 'favorites': return '⭐ Favoritos';
      case 'pinned': return '📌 Notas Fijadas';
      case 'recent': return '🕒 Recientes';
      case 'archived': return '📦 Archivadas';
      case 'trash': return '🗑️ Papelera';
      case 'all':
      default:
        return 'Todas las notas';
    }
  };

  const handleDrilldownToView = (view: NoteView, folderId?: number | null, tag?: string | null) => {
    onSelectView(view, folderId, tag);
    setSidebarLevel('notes');
  };

  const handleBackToMenu = () => {
    setSidebarLevel('menu');
  };

  return (
    <div className="w-full md:w-80 flex-shrink-0 flex flex-col h-full bg-slate-50/80 dark:bg-slate-900/80 border-r border-slate-200/80 dark:border-slate-800 backdrop-blur-md select-none">
      
      {/* ========================================================= */}
      {/* LEVEL 1: MAIN NAVIGATION MENU                             */}
      {/* ========================================================= */}
      {sidebarLevel === 'menu' && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Mis Notas
              </h2>
            </div>
            <button
              onClick={() => {
                onCreateNote();
                setSidebarLevel('notes');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs shadow-sm transition-all"
              title="Crear nueva nota rápida"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Nueva</span>
            </button>
          </div>

          {/* Quick Search in Main Menu */}
          <div className="p-3 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en todas las notas..."
                value={searchTerm}
                onChange={(e) => {
                  onSearchTermChange(e.target.value);
                  if (e.target.value.trim().length > 0) {
                    onSelectView('all');
                    setSidebarLevel('notes');
                  }
                }}
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
          </div>

          {/* Nav Categories Scrollable Area */}
          <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-4">
            
            {/* 1. Core Smart Categories */}
            <div className="space-y-1">
              <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Vistas
              </div>

              <button
                onClick={() => handleDrilldownToView('all')}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span>Todas las notas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {totalActiveCount}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => handleDrilldownToView('favorites')}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5" fill="currentColor" />
                  </div>
                  <span>Favoritos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {favoritesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                      {favoritesCount}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => handleDrilldownToView('pinned')}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
                    <Pin className="w-3.5 h-3.5" fill="currentColor" />
                  </div>
                  <span>Fijadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {pinnedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                      {pinnedCount}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => handleDrilldownToView('recent')}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span>Recientes</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* 2. Folders Section */}
            <div className="space-y-1 pt-1">
              <div className="px-2 flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Carpetas ({folders.length})
                </span>
                <button
                  onClick={onCreateFolder}
                  className="p-1 rounded-md text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/40 transition-colors flex items-center gap-1 text-[11px] font-bold"
                  title="Crear nueva carpeta"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Crear</span>
                </button>
              </div>

              {folders.map(folder => {
                const folderNoteCount = notes.filter(n => n.folder_id === folder.id && !n.deleted_at && !n.is_archived).length;
                const isEditing = editingFolderId === folder.id;

                return (
                  <div key={folder.id} className="relative group">
                    {isEditing ? (
                      <div className="p-1.5 px-2 bg-white dark:bg-slate-800 rounded-xl border border-sky-300 dark:border-sky-700 flex items-center gap-1 shadow-xs">
                        <FolderIconLucide className="w-4 h-4 text-sky-500 flex-shrink-0" />
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => onEditingFolderNameChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRenameFolder();
                            if (e.key === 'Escape') onEditingFolderNameChange(folder.name);
                          }}
                          autoFocus
                          className="w-full text-xs font-semibold bg-transparent focus:outline-none text-slate-800 dark:text-slate-100"
                        />
                        <button
                          onClick={onSaveRenameFolder}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleDrilldownToView('folder', folder.id)}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800/90 hover:shadow-xs transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-6 h-6 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                            <FolderIconLucide className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate">{folder.name}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] text-slate-400 font-bold">
                            {folderNoteCount}
                          </span>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartRenameFolder(folder);
                              }}
                              className="p-1 text-slate-400 hover:text-sky-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title="Renombrar carpeta"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestDeleteFolder(folder);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Eliminar carpeta"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {folders.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-400 italic">
                  No hay carpetas creadas.
                </div>
              )}
            </div>

            {/* 3. Tags Section */}
            {allTags.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Etiquetas
                </div>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleDrilldownToView('tag', null, tag)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 hover:border-sky-400 hover:text-sky-600 transition-all shadow-xs"
                    >
                      <Tag className="w-2.5 h-2.5 text-sky-500" />
                      <span>#{tag}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({tagCounts[tag]})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Archived & Trash Section */}
            <div className="space-y-1 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Organización
              </div>

              {/* Archived */}
              <button
                onClick={() => handleDrilldownToView('archived')}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-50/80 dark:hover:bg-amber-950/30 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Archive className="w-3.5 h-3.5" />
                  </div>
                  <span>Archivadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/60 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                    {archivedCount}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Trash */}
              <button
                onClick={() => handleDrilldownToView('trash')}
                className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50/80 dark:hover:bg-rose-950/30 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Papelera</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/60 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                    {trashCount}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* LEVEL 2: NOTES LIST INSIDE ACTIVE VIEW / FOLDER          */}
      {/* ========================================================= */}
      {sidebarLevel === 'notes' && (
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Header with Back button and Create Note */}
          <div className="p-3 px-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex items-center justify-between gap-2">
            <button
              onClick={handleBackToMenu}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-sky-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all group shadow-xs"
              title="Volver al menú de carpetas y categorías"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Menú</span>
            </button>

            <div className="flex-1 min-w-0 text-center px-1">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {getViewTitle()}
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                {filteredNotes.length} {filteredNotes.length === 1 ? 'nota' : 'notas'}
              </span>
            </div>

            {currentView !== 'archived' && currentView !== 'trash' && (
              <button
                onClick={onCreateNote}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-sm transition-all flex-shrink-0"
                title="Crear nueva nota en esta sección"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>Nota</span>
              </button>
            )}
          </div>

          {/* Search bar & Sorting Selector */}
          <div className="p-2.5 px-3 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar notas..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Sort order selector */}
            <select
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value as SortOrder)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 py-1 px-1.5 focus:outline-none"
              title="Ordenar notas"
            >
              <option value="updated">Recientes</option>
              <option value="created">Creación</option>
              <option value="title-asc">A - Z</option>
              <option value="title-desc">Z - A</option>
            </select>
          </div>

          {/* Notes Cards List */}
          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1.5">
            {filteredNotes.map(note => {
              const isSelected = selectedNoteId === note.id;
              const plainSummary = note.content ? cleanToPlainText(note.content) : 'Sin contenido';
              const date = new Date(note.updated_at);
              const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-sky-50/90 dark:bg-sky-950/40 border-sky-300 dark:border-sky-700 shadow-sm'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-xs font-bold truncate flex-1 ${
                      isSelected ? 'text-sky-800 dark:text-sky-200' : 'text-slate-800 dark:text-slate-100'
                    }`}>
                      {note.title || 'Nota sin título'}
                    </h4>

                    {/* Quick status icons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {note.is_pinned && <Pin className="w-3 h-3 text-rose-500 fill-rose-500" />}
                      {note.is_favorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {plainSummary}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
                    <span>{formattedDate}</span>

                    {/* Action buttons on card hover */}
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {/* IF IN ARCHIVE OR TRASH: SHOW RESTORE BUTTON */}
                      {currentView === 'archived' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRestoreNote(note);
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1 shadow-2xs"
                          title="Restaurar nota archivada"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>Restaurar</span>
                        </button>
                      )}

                      {currentView === 'trash' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRestoreNote(note);
                            }}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 flex items-center gap-1 shadow-2xs"
                            title="Restaurar de la papelera"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Restaurar</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestPermanentDeleteNote(note);
                            }}
                            className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* IF IN ACTIVE NOTES: SHOW COLORED ARCHIVE & TRASH BUTTONS */}
                      {currentView !== 'archived' && currentView !== 'trash' && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          {/* Archivar (Ámbar) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestArchiveNote(note);
                            }}
                            className="p-1 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                            title="Archivar nota"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                          {/* Papelera (Rojo) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestTrashNote(note);
                            }}
                            className="p-1 rounded-md text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Enviar a papelera"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredNotes.length === 0 && (
              <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="font-semibold">No hay notas en esta sección.</p>
                {currentView !== 'archived' && currentView !== 'trash' && (
                  <button
                    onClick={onCreateNote}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-sky-500 text-white font-semibold text-xs shadow-sm hover:bg-sky-600 transition-colors mt-2"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Crear Nota</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
