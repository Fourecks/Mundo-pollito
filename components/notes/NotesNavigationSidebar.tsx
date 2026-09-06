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
      case 'favorites': return 'Favoritos';
      case 'pinned': return 'Notas Fijadas';
      case 'recent': return 'Recientes';
      case 'archived': return 'Archivadas';
      case 'trash': return 'Papelera';
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
    <div className="w-full md:w-80 flex-shrink-0 flex flex-col h-full bg-zinc-50/90 dark:bg-zinc-900/90 border-r border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md select-none text-zinc-800 dark:text-zinc-200">
      
      {/* ========================================================= */}
      {/* LEVEL 1: MAIN NAVIGATION MENU                             */}
      {/* ========================================================= */}
      {sidebarLevel === 'menu' && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-3.5 px-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-semibold">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Notas
              </h2>
            </div>
            <button
              onClick={() => {
                onCreateNote();
                setSidebarLevel('notes');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs transition-colors shadow-2xs"
              title="Crear nueva nota rápida"
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Nueva</span>
            </button>
          </div>

          {/* Quick Search in Main Menu */}
          <div className="p-3 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
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
                className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>
          </div>

          {/* Nav Categories Scrollable Area */}
          <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-4">
            
            {/* 1. Core Smart Categories */}
            <div className="space-y-0.5">
              <div className="px-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                Vistas
              </div>

              <button
                onClick={() => handleDrilldownToView('all')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span>Todas las notas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {totalActiveCount}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => handleDrilldownToView('favorites')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  </div>
                  <span>Favoritos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {favoritesCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {favoritesCount}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => handleDrilldownToView('pinned')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                    <Pin className="w-3.5 h-3.5" />
                  </div>
                  <span>Fijadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {pinnedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {pinnedCount}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => handleDrilldownToView('recent')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <span>Recientes</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* 2. Folders Section */}
            <div className="space-y-0.5 pt-1">
              <div className="px-2 flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Carpetas ({folders.length})
                </span>
                <button
                  onClick={onCreateFolder}
                  className="p-1 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1 text-[11px] font-medium"
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
                      <div className="p-1.5 px-2 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-400 dark:border-zinc-600 flex items-center gap-1">
                        <FolderIconLucide className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => onEditingFolderNameChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onSaveRenameFolder();
                            if (e.key === 'Escape') onEditingFolderNameChange(folder.name);
                          }}
                          autoFocus
                          className="w-full text-xs font-medium bg-transparent focus:outline-none text-zinc-800 dark:text-zinc-100"
                        />
                        <button
                          onClick={onSaveRenameFolder}
                          className="p-1 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleDrilldownToView('folder', folder.id)}
                        className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-6 h-6 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center flex-shrink-0">
                            <FolderIconLucide className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate">{folder.name}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 text-[10px] text-zinc-400 font-medium">
                            {folderNoteCount}
                          </span>

                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartRenameFolder(folder);
                              }}
                              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              title="Renombrar carpeta"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRequestDeleteFolder(folder);
                              }}
                              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              title="Eliminar carpeta"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {folders.length === 0 && (
                <div className="p-2 text-center text-xs text-zinc-400 italic">
                  No hay carpetas.
                </div>
              )}
            </div>

            {/* 3. Tags Section */}
            {allTags.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="px-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Etiquetas
                </div>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleDrilldownToView('tag', null, tag)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors shadow-2xs"
                    >
                      <Tag className="w-2.5 h-2.5 text-zinc-400" />
                      <span>#{tag}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">({tagCounts[tag]})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Archived & Trash Section */}
            <div className="space-y-0.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
              <div className="px-2 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                Archivo
              </div>

              {/* Archived */}
              <button
                onClick={() => handleDrilldownToView('archived')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                    <Archive className="w-3.5 h-3.5" />
                  </div>
                  <span>Archivadas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {archivedCount}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>

              {/* Trash */}
              <button
                onClick={() => handleDrilldownToView('trash')}
                className="w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800/80 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </div>
                  <span>Papelera</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {trashCount}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
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
          <div className="p-3 px-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-100/50 dark:bg-zinc-900/50 flex items-center justify-between gap-2">
            <button
              onClick={handleBackToMenu}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium transition-colors group"
              title="Volver al menú"
            >
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Menú</span>
            </button>

            <div className="flex-1 min-w-0 text-center px-1">
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {getViewTitle()}
              </h3>
              <span className="text-[10px] text-zinc-400 font-normal">
                {filteredNotes.length} {filteredNotes.length === 1 ? 'nota' : 'notas'}
              </span>
            </div>

            {currentView !== 'archived' && currentView !== 'trash' && (
              <button
                onClick={onCreateNote}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs transition-colors flex-shrink-0"
                title="Crear nueva nota"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>Nota</span>
              </button>
            )}
          </div>

          {/* Search bar & Sorting Selector */}
          <div className="p-2.5 px-3 border-b border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3 h-3 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar notas..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="w-full pl-7 pr-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-xs text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            {/* Sort order selector */}
            <select
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value as SortOrder)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-[11px] font-medium text-zinc-600 dark:text-zinc-300 py-1 px-1.5 focus:outline-none"
              title="Ordenar notas"
            >
              <option value="updated">Recientes</option>
              <option value="created">Creación</option>
              <option value="title-asc">A - Z</option>
              <option value="title-desc">Z - A</option>
            </select>
          </div>

          {/* Notes Cards List */}
          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredNotes.map(note => {
              const isSelected = selectedNoteId === note.id;
              const plainSummary = note.content ? cleanToPlainText(note.content) : 'Sin contenido';
              const date = new Date(note.updated_at);
              const formattedDate = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-zinc-200/70 dark:bg-zinc-800/90 border-zinc-300 dark:border-zinc-600 shadow-2xs'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className={`text-xs font-semibold truncate flex-1 ${
                      isSelected ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-800 dark:text-zinc-200'
                    }`}>
                      {note.title || 'Nota sin título'}
                    </h4>

                    {/* Quick status icons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {note.is_pinned && <Pin className="w-3 h-3 text-zinc-500 fill-zinc-500" />}
                      {note.is_favorite && <Star className="w-3 h-3 text-zinc-500 fill-zinc-500" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {plainSummary}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-zinc-100 dark:border-zinc-800 text-[10px] text-zinc-400">
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
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1"
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
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center gap-1"
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
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* IF IN ACTIVE NOTES: SHOW ARCHIVE & TRASH BUTTONS */}
                      {currentView !== 'archived' && currentView !== 'trash' && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestArchiveNote(note);
                            }}
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            title="Archivar nota"
                          >
                            <Archive className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestTrashNote(note);
                            }}
                            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
              <div className="p-8 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-30 text-zinc-400" />
                <p className="font-medium">No hay notas en esta sección.</p>
                {currentView !== 'archived' && currentView !== 'trash' && (
                  <button
                    onClick={onCreateNote}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium text-xs hover:bg-zinc-800 dark:hover:bg-white transition-colors mt-2"
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
