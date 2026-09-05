import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, Note, NoteVersion } from '../types';
import {
  FileText,
  FilePlus,
  Trash2,
  X,
  Edit3,
  ChevronLeft,
  Star,
  Pin,
  Archive,
  RotateCcw,
  Sparkles,
  Share2,
  Printer,
  Download,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  CloudLightning,
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { normalizeNoteContentForEditor, sanitizeAndCleanHtml } from '../utils/textCleaner';
import { getAll, syncableCreate, ensureDB } from '../db';
import { NoteView, SortOrder } from './notes/NotesTypes';
import { NotesNavigationSidebar } from './notes/NotesNavigationSidebar';
import { NotesToolbar } from './notes/NotesToolbar';
import { NoteDetailsPanel } from './notes/NoteDetailsPanel';
import { NoteVersionHistoryModal } from './notes/NoteVersionHistoryModal';

interface NotesSectionProps {
  folders: Folder[];
  notes: Note[];
  onAddFolder: (name: string, projectId?: number, subjectId?: string) => Promise<Folder | null>;
  onUpdateFolder: (folderId: number, name: string) => Promise<void>;
  onDeleteFolder: (folderId: number) => Promise<void>;
  onAddNote: (folderId: number | null, projectId?: number, subjectId?: string) => Promise<Note | null>;
  onUpdateNote: (note: Note) => Promise<void>;
  onDeleteNote: (noteId: number, folderId: number | null) => Promise<void>;
  isMobile?: boolean;
  projectId?: number;
  subjectId?: string;
}

const NotesSection: React.FC<NotesSectionProps> = ({
  folders: allFolders,
  notes: allNotes,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  isMobile = false,
  projectId,
  subjectId,
}) => {
  // Navigation State
  const [currentView, setCurrentView] = useState<NoteView>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('updated');

  // Editor State
  const [activeNoteTitle, setActiveNoteTitle] = useState('');
  const [activeNoteContent, setActiveNoteContent] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [noteVersions, setNoteVersions] = useState<NoteVersion[]>([]);

  // Modals for Destructive Confirmations
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [noteToTrash, setNoteToTrash] = useState<Note | null>(null);
  const [noteToArchive, setNoteToArchive] = useState<Note | null>(null);
  const [noteToPermanentDelete, setNoteToPermanentDelete] = useState<Note | null>(null);

  // Folder Renaming
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Refs
  const editorRef = useRef<HTMLDivElement>(null);
  const activeNoteIdRef = useRef<number | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<{ title: string; content: string }>({ title: '', content: '' });

  // Filter notes and folders if scoped to project or subject
  const folders = React.useMemo(() => {
    return allFolders.filter(f =>
      projectId ? f.project_id === projectId : subjectId ? f.subject_id === subjectId : (!f.project_id && !f.subject_id)
    );
  }, [allFolders, projectId, subjectId]);

  const notes = React.useMemo(() => {
    return allNotes.filter(n =>
      projectId ? n.project_id === projectId : subjectId ? n.subject_id === subjectId : (!n.project_id && !n.subject_id)
    );
  }, [allNotes, projectId, subjectId]);

  // Selected note object
  const selectedNote = React.useMemo(() => {
    return notes.find(n => n.id === selectedNoteId) || null;
  }, [notes, selectedNoteId]);

  // Sync ref with selected note id
  useEffect(() => {
    activeNoteIdRef.current = selectedNoteId;
  }, [selectedNoteId]);

  // Filter and sort notes for the active view
  const filteredNotes = React.useMemo(() => {
    let result = notes.filter(n => {
      // Trash view
      if (currentView === 'trash') {
        return !!n.deleted_at;
      }
      // Non-trash views: must not be in trash
      if (n.deleted_at) return false;

      // Archived view
      if (currentView === 'archived') {
        return !!n.is_archived;
      }
      // Non-archived views: must not be archived
      if (n.is_archived) return false;

      if (currentView === 'favorites') return !!n.is_favorite;
      if (currentView === 'pinned') return !!n.is_pinned;
      if (currentView === 'folder') return n.folder_id === selectedFolderId;
      if (currentView === 'tag' && selectedTag) return (n.tags || []).includes(selectedTag);

      // 'all' or 'recent'
      return true;
    });

    // Apply text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n =>
        (n.title && n.title.toLowerCase().includes(term)) ||
        (n.content && n.content.toLowerCase().includes(term)) ||
        (n.tags && n.tags.some(t => t.toLowerCase().includes(term)))
      );
    }

    // Apply sorting
    return result.sort((a, b) => {
      // Always prioritize pinned notes at the top in normal views
      if (currentView !== 'trash' && currentView !== 'archived') {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
      }

      if (sortOrder === 'title-asc') return (a.title || '').localeCompare(b.title || '');
      if (sortOrder === 'title-desc') return (b.title || '').localeCompare(a.title || '');
      if (sortOrder === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, currentView, selectedFolderId, selectedTag, searchTerm, sortOrder]);

  // Load note into editor when selection changes
  useEffect(() => {
    if (selectedNote) {
      setActiveNoteTitle(selectedNote.title || '');
      const cleanContent = normalizeNoteContentForEditor(selectedNote.content || '');
      setActiveNoteContent(cleanContent);
      lastSavedContentRef.current = { title: selectedNote.title || '', content: cleanContent };

      if (editorRef.current) {
        editorRef.current.innerHTML = cleanContent;
      }
      loadNoteVersions(selectedNote.id);
    } else {
      setActiveNoteTitle('');
      setActiveNoteContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [selectedNoteId]);

  // Load note versions from IndexedDB
  const loadNoteVersions = async (noteId: number) => {
    try {
      await ensureDB();
      const allVer = await getAll<NoteVersion>('note_versions');
      const filtered = allVer
        .filter(v => v.note_id === noteId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNoteVersions(filtered);
    } catch (e) {
      console.warn('Could not load note versions:', e);
    }
  };

  // Create version snapshot
  const createVersionSnapshot = async (note: Note) => {
    try {
      await ensureDB();
      await syncableCreate('note_versions', {
        note_id: note.id,
        title: note.title || '',
        content: note.content || '',
        created_at: new Date().toISOString(),
      });
      loadNoteVersions(note.id);
    } catch (e) {
      console.warn('Error saving note snapshot:', e);
    }
  };

  // Auto-Save Mechanism
  const executeSave = useCallback(
    async (titleToSave: string, contentToSave: string) => {
      const activeId = activeNoteIdRef.current;
      if (!activeId) return;

      const current = notes.find(n => n.id === activeId);
      if (!current) return;

      // Check if unchanged
      if (
        titleToSave === lastSavedContentRef.current.title &&
        contentToSave === lastSavedContentRef.current.content
      ) {
        return;
      }

      setSaveStatus('saving');
      try {
        const sanitized = sanitizeAndCleanHtml(contentToSave);
        const updated: Note = {
          ...current,
          title: titleToSave,
          content: sanitized,
          updated_at: new Date().toISOString(),
        };

        await onUpdateNote(updated);
        lastSavedContentRef.current = { title: titleToSave, content: sanitized };
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error saving note:', err);
        setSaveStatus('error');
      }
    },
    [notes, onUpdateNote]
  );

  const scheduleAutoSave = (newTitle: string, newContent: string) => {
    setSaveStatus('saving');
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      executeSave(newTitle, newContent);
    }, 800);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setActiveNoteTitle(newTitle);
    scheduleAutoSave(newTitle, activeNoteContent);
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    isTypingRef.current = true;
    const newContent = editorRef.current.innerHTML;
    setActiveNoteContent(newContent);
    scheduleAutoSave(activeNoteTitle, newContent);
  };

  // Rich Text Commands
  const handleApplyCommand = (command: string, value: string = '') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const handleInsertHtml = (html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand('insertHTML', false, html);
    handleEditorInput();
  };

  // Navigation Handlers
  const handleSelectView = (view: NoteView, folderId: number | null = null, tag: string | null = null) => {
    setCurrentView(view);
    setSelectedFolderId(folderId);
    setSelectedTag(tag);
  };

  const handleCreateNote = async () => {
    const folderToUse = currentView === 'folder' ? selectedFolderId : null;
    const newNote = await onAddNote(folderToUse, projectId, subjectId);
    if (newNote) {
      setSelectedNoteId(newNote.id);
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt('Nombre de la nueva carpeta:');
    if (name && name.trim()) {
      await onAddFolder(name.trim(), projectId, subjectId);
    }
  };

  const handleStartRenameFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleSaveRenameFolder = async () => {
    if (editingFolderId && editingFolderName.trim()) {
      await onUpdateFolder(editingFolderId, editingFolderName.trim());
      setEditingFolderId(null);
      setEditingFolderName('');
    }
  };

  // Confirmations & Destructive Actions
  const handleConfirmArchiveNote = async () => {
    if (!noteToArchive) return;
    try {
      const updated: Note = {
        ...noteToArchive,
        is_archived: true,
        updated_at: new Date().toISOString(),
      };
      await onUpdateNote(updated);
      if (selectedNoteId === noteToArchive.id) {
        setSelectedNoteId(null);
      }
      setNoteToArchive(null);
    } catch (e) {
      console.error('Error archiving note:', e);
    }
  };

  const handleConfirmTrashNote = async () => {
    if (!noteToTrash) return;
    try {
      const updated: Note = {
        ...noteToTrash,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await onUpdateNote(updated);
      if (selectedNoteId === noteToTrash.id) {
        setSelectedNoteId(null);
      }
      setNoteToTrash(null);
    } catch (e) {
      console.error('Error moving note to trash:', e);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!noteToPermanentDelete) return;
    try {
      await onDeleteNote(noteToPermanentDelete.id, noteToPermanentDelete.folder_id);
      if (selectedNoteId === noteToPermanentDelete.id) {
        setSelectedNoteId(null);
      }
      setNoteToPermanentDelete(null);
    } catch (e) {
      console.error('Error deleting note permanently:', e);
    }
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    try {
      await onDeleteFolder(folderToDelete.id);
      if (selectedFolderId === folderToDelete.id) {
        setSelectedFolderId(null);
        setCurrentView('all');
      }
      setFolderToDelete(null);
    } catch (e) {
      console.error('Error deleting folder:', e);
    }
  };

  const handleRestoreNote = async (note: Note) => {
    try {
      const updated: Note = {
        ...note,
        deleted_at: null,
        is_archived: false,
        updated_at: new Date().toISOString(),
      };
      await onUpdateNote(updated);
    } catch (e) {
      console.error('Error restoring note:', e);
    }
  };

  // Note Attribute Toggles
  const handleTogglePin = async () => {
    if (!selectedNote) return;
    const updated: Note = {
      ...selectedNote,
      is_pinned: !selectedNote.is_pinned,
      updated_at: new Date().toISOString(),
    };
    await onUpdateNote(updated);
  };

  const handleToggleFavorite = async () => {
    if (!selectedNote) return;
    const updated: Note = {
      ...selectedNote,
      is_favorite: !selectedNote.is_favorite,
      updated_at: new Date().toISOString(),
    };
    await onUpdateNote(updated);
  };

  const handleUpdateNoteFolder = async (folderId: number | null) => {
    if (!selectedNote) return;
    const updated: Note = {
      ...selectedNote,
      folder_id: folderId,
      updated_at: new Date().toISOString(),
    };
    await onUpdateNote(updated);
  };

  const handleAddTag = async (tag: string) => {
    if (!selectedNote) return;
    const existingTags = selectedNote.tags || [];
    if (!existingTags.includes(tag)) {
      const updated: Note = {
        ...selectedNote,
        tags: [...existingTags, tag],
        updated_at: new Date().toISOString(),
      };
      await onUpdateNote(updated);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedNote) return;
    const existingTags = selectedNote.tags || [];
    const updated: Note = {
      ...selectedNote,
      tags: existingTags.filter(t => t !== tagToRemove),
      updated_at: new Date().toISOString(),
    };
    await onUpdateNote(updated);
  };

  // Version Restore
  const handleRestoreVersion = async (version: NoteVersion) => {
    if (!selectedNote) return;
    setActiveNoteTitle(version.title);
    setActiveNoteContent(version.content);
    if (editorRef.current) {
      editorRef.current.innerHTML = version.content;
    }
    const updated: Note = {
      ...selectedNote,
      title: version.title,
      content: version.content,
      updated_at: new Date().toISOString(),
    };
    await onUpdateNote(updated);
    setShowVersionModal(false);
  };

  // Export & Print
  const handleExportMarkdown = () => {
    if (!selectedNote) return;
    const textOnly = editorRef.current?.innerText || '';
    const blob = new Blob([`# ${selectedNote.title || 'Nota'}\n\n${textOnly}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedNote.title || 'nota'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintNote = () => {
    window.print();
  };

  return (
    <div className={`flex h-[calc(100vh-4rem)] bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden relative ${isFocusMode ? 'z-50' : ''}`}>
      
      {/* 1. SINGLE DRILL-DOWN NAVIGATION SIDEBAR */}
      {!isFocusMode && (!isMobile || !selectedNoteId) && (
        <NotesNavigationSidebar
          currentView={currentView}
          selectedFolderId={selectedFolderId}
          selectedTag={selectedTag}
          selectedNoteId={selectedNoteId}
          folders={folders}
          notes={notes}
          filteredNotes={filteredNotes}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          sortOrder={sortOrder}
          onSortOrderChange={setSortOrder}
          onSelectView={handleSelectView}
          onSelectNote={setSelectedNoteId}
          onCreateFolder={handleCreateFolder}
          onCreateNote={handleCreateNote}
          onStartRenameFolder={handleStartRenameFolder}
          onRequestDeleteFolder={setFolderToDelete}
          onRequestArchiveNote={setNoteToArchive}
          onRequestTrashNote={setNoteToTrash}
          onRequestPermanentDeleteNote={setNoteToPermanentDelete}
          onRestoreNote={handleRestoreNote}
          editingFolderId={editingFolderId}
          editingFolderName={editingFolderName}
          onEditingFolderNameChange={setEditingFolderName}
          onSaveRenameFolder={handleSaveRenameFolder}
          isMobile={isMobile}
        />
      )}

      {/* 2. NOTE EDITOR MAIN CANVAS */}
      {(!isMobile || selectedNoteId) && (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-950 relative">
          {selectedNote ? (
            <div className="flex flex-col h-full overflow-hidden">
              
              {/* Note Header / Meta Bar */}
              <div className="px-5 py-2.5 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md flex items-center justify-between gap-3 select-none flex-shrink-0">
                
                {/* Left side: Back on mobile, Pin, Favorite, Status */}
                <div className="flex items-center gap-2 min-w-0">
                  {isMobile && (
                    <button
                      onClick={() => setSelectedNoteId(null)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mr-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={handleTogglePin}
                    className={`p-1.5 rounded-lg transition-colors ${
                      selectedNote.is_pinned
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={selectedNote.is_pinned ? 'Desfijar nota' : 'Fijar nota al inicio'}
                  >
                    <Pin className="w-4 h-4" fill={selectedNote.is_pinned ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    className={`p-1.5 rounded-lg transition-colors ${
                      selectedNote.is_favorite
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-500'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={selectedNote.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <Star className="w-4 h-4" fill={selectedNote.is_favorite ? 'currentColor' : 'none'} />
                  </button>

                  {/* Save Indicator */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 ml-1">
                    {saveStatus === 'saving' && (
                      <span className="flex items-center gap-1 text-sky-500">
                        <CloudLightning className="w-3.5 h-3.5 animate-pulse" />
                        <span className="hidden sm:inline">Guardando...</span>
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Guardado</span>
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-rose-500 font-semibold">Error al guardar</span>
                    )}
                  </div>
                </div>

                {/* Right side: Restore / Archive / Trash / Focus / Details */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  
                  {/* IF IN ARCHIVE OR TRASH: SHOW RESTORE BUTTON */}
                  {(selectedNote.is_archived || selectedNote.deleted_at) ? (
                    <button
                      onClick={() => handleRestoreNote(selectedNote)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all"
                      title="Restaurar nota a activas"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar Nota</span>
                    </button>
                  ) : (
                    /* IF ACTIVE: SHOW COLORED ARCHIVE AND TRASH BUTTONS */
                    <>
                      {/* Archivar (Ámbar) */}
                      <button
                        onClick={() => setNoteToArchive(selectedNote)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        title="Archivar nota"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Archivar</span>
                      </button>

                      {/* Enviar a Papelera (Rojo) */}
                      <button
                        onClick={() => setNoteToTrash(selectedNote)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-xs font-semibold flex items-center gap-1.5 transition-all"
                        title="Mover nota a la papelera"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Papelera</span>
                      </button>
                    </>
                  )}

                  <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

                  {/* Export Markdown */}
                  <button
                    onClick={handleExportMarkdown}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Exportar como Markdown"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Print */}
                  <button
                    onClick={handlePrintNote}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Imprimir nota"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {/* Focus Mode Toggle */}
                  <button
                    onClick={() => setIsFocusMode(!isFocusMode)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isFocusMode
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title={isFocusMode ? 'Salir de modo enfoque' : 'Modo enfoque'}
                  >
                    {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {/* Details Panel Toggle */}
                  <button
                    onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showDetailsPanel
                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                    title="Detalles y estadísticas"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                </div>
              </div>

              {/* 3. ROBUST RICH TEXT TOOLBAR */}
              <NotesToolbar
                onApplyCommand={handleApplyCommand}
                onInsertHtml={handleInsertHtml}
              />

              {/* 4. Canvas Body Area with Optional Details Panel */}
              <div className="flex-1 flex overflow-hidden">
                
                {/* Editor Surface */}
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 md:p-10 max-w-4xl mx-auto w-full">
                  {/* Note Title Input */}
                  <input
                    type="text"
                    placeholder="Título de la nota..."
                    value={activeNoteTitle}
                    onChange={handleTitleChange}
                    className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 bg-transparent border-0 focus:outline-none focus:ring-0 mb-4 tracking-tight"
                  />

                  {/* ContentEditable Div */}
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={handleEditorInput}
                    data-placeholder="Escribe tus pensamientos, notas de estudio, tareas o presiona la barra de herramientas para dar formato..."
                    className="flex-1 focus:outline-none note-editor-content leading-relaxed text-slate-800 dark:text-slate-200 min-h-[400px]"
                  />
                </div>

                {/* Optional Details Panel */}
                {showDetailsPanel && (
                  <NoteDetailsPanel
                    note={selectedNote}
                    folders={folders}
                    onUpdateFolder={handleUpdateNoteFolder}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    onOpenVersionHistory={() => setShowVersionModal(true)}
                    onClose={() => setShowDetailsPanel(false)}
                  />
                )}

              </div>

            </div>
          ) : (
            /* Empty State: No note selected */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
              <div className="w-16 h-16 rounded-3xl bg-sky-50 dark:bg-sky-950/40 text-sky-500 flex items-center justify-center mb-4 shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
                Ninguna nota seleccionada
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-5 leading-relaxed">
                Selecciona una nota del panel lateral para editarla, o crea una nueva nota para comenzar.
              </p>
              <button
                onClick={handleCreateNote}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all"
              >
                <FilePlus className="w-4 h-4" />
                <span>Crear Nueva Nota</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIRMATION MODALS FOR DESTRUCTIVE ACTIONS               */}
      {/* ========================================================= */}

      {/* 1. Confirm Archive Note */}
      {noteToArchive && (
        <ConfirmationModal
          isOpen={true}
          title="¿Archivar esta nota?"
          message={`La nota "${noteToArchive.title || 'Sin título'}" se moverá a la sección de Archivadas. Podrás consultarla o restaurarla cuando quieras.`}
          confirmText="Archivar Nota"
          cancelText="Cancelar"
          confirmVariant="warning"
          onConfirm={handleConfirmArchiveNote}
          onCancel={() => setNoteToArchive(null)}
        />
      )}

      {/* 2. Confirm Trash Note */}
      {noteToTrash && (
        <ConfirmationModal
          isOpen={true}
          title="¿Mover a la papelera?"
          message={`La nota "${noteToTrash.title || 'Sin título'}" se enviará a la papelera. Se cerrará del editor y podrás restaurarla desde la sección Papelera.`}
          confirmText="Mover a Papelera"
          cancelText="Cancelar"
          confirmVariant="danger"
          onConfirm={handleConfirmTrashNote}
          onCancel={() => setNoteToTrash(null)}
        />
      )}

      {/* 3. Confirm Permanent Delete Note */}
      {noteToPermanentDelete && (
        <ConfirmationModal
          isOpen={true}
          title="¿Eliminar definitivamente?"
          message={`La nota "${noteToPermanentDelete.title || 'Sin título'}" se eliminará permanentemente. Esta acción es irreversible.`}
          confirmText="Eliminar Permanentemente"
          cancelText="Cancelar"
          confirmVariant="danger"
          onConfirm={handleConfirmPermanentDelete}
          onCancel={() => setNoteToPermanentDelete(null)}
        />
      )}

      {/* 4. Confirm Delete Folder */}
      {folderToDelete && (
        <ConfirmationModal
          isOpen={true}
          title="¿Eliminar esta carpeta?"
          message={`Se eliminará la carpeta "${folderToDelete.name}". Las notas dentro de ella se conservarán en la vista general.`}
          confirmText="Eliminar Carpeta"
          cancelText="Cancelar"
          confirmVariant="danger"
          onConfirm={handleConfirmDeleteFolder}
          onCancel={() => setFolderToDelete(null)}
        />
      )}

      {/* 5. Version History Modal */}
      {showVersionModal && selectedNote && (
        <NoteVersionHistoryModal
          note={selectedNote}
          versions={noteVersions}
          onRestoreVersion={handleRestoreVersion}
          onClose={() => setShowVersionModal(false)}
        />
      )}

    </div>
  );
};

export default NotesSection;
