import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, Note } from '../types';
import { 
  Inbox,
  Star,
  Clock,
  Pin,
  Archive,
  Link,
  Image as ImageIcon,
  Table as TableIcon,
  AlertCircle,
  Terminal,
  CloudLightning,
  CheckCircle2,
  Folder as FolderIconLucide, 
  FolderPlus, 
  FileText, 
  FilePlus, 
  Trash2,
  X, 
  Edit3, 
  ChevronLeft, 
  MoreVertical, 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3, 
  List, 
  ListOrdered, 
  CheckSquare, 
  Quote, 
  Code, 
  Minus, 
  Copy, 
  Check, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Columns, 
  Maximize2, 
  Minimize2,
  Search,
} from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { normalizeNoteContentForEditor, sanitizeAndCleanHtml, cleanToPlainText } from '../utils/textCleaner';

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
  type NoteView = 'all' | 'inbox' | 'favorites' | 'recent' | 'pinned' | 'archived' | 'trash' | 'folder';
  const [currentView, setCurrentView] = useState<NoteView>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);

  // Filter notes and folders if scoped to project or subject
  const folders = React.useMemo(() => {
    return allFolders.filter(f => 
      (projectId ? f.project_id === projectId : subjectId ? f.subject_id === subjectId : (!f.project_id && !f.subject_id))
    );
  }, [allFolders, projectId, subjectId]);

  const notes = React.useMemo(() => {
    return allNotes.filter(n => 
      (projectId ? n.project_id === projectId : subjectId ? n.subject_id === subjectId : (!n.project_id && !n.subject_id))
    );
  }, [allNotes, projectId, subjectId]);

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);

  // Active Note State
  const [activeNoteTitle, setActiveNoteTitle] = useState('');
  const [activeNoteContent, setActiveNoteContent] = useState('');
  const activeNoteIdRef = useRef<number | null>(null);

  // Modals and menus
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [folderMenuOpen, setFolderMenuOpen] = useState<number | null>(null);
  const [noteMenuOpen, setNoteMenuOpen] = useState<number | null>(null);

  // Renaming state
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteTitle, setEditingNoteTitle] = useState('');

  // Sidebar visibility (focus mode)
  const [showFolders, setShowFolders] = useState(true);
  const [showNotesList, setShowNotesList] = useState(true);
  const [sortOrder, setSortOrder] = useState<'updated' | 'created' | 'title-asc' | 'title-desc'>('updated');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [toc, setToc] = useState<{level: number, text: string}[]>([]);


  // Textarea / Editor ref for inserting text tools
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set default selected folder
  useEffect(() => {
    if (!isMobile && (!selectedFolderId || !folders.some(f => f.id === selectedFolderId)) && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId, isMobile]);

  // Set default selected note in folder
  useEffect(() => {
    const currentFolder = folders.find(f => f.id === selectedFolderId);
    if (!isMobile && currentFolder) {
      if ((!selectedNoteId || !currentFolder.notes.some(n => n.id === selectedNoteId)) && currentFolder.notes.length > 0) {
        setSelectedNoteId(currentFolder.notes[0].id);
      } else if (currentFolder.notes.length === 0) {
        setSelectedNoteId(null);
      }
    }
  }, [selectedFolderId, folders, selectedNoteId, isMobile]);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const selectedNote = notes.find(n => n.id === selectedNoteId);

  // Parse TOC
  const parseTOC = (html: string) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headings = doc.querySelectorAll('h1, h2, h3');
    const parsedToc: {level: number, text: string}[] = [];
    headings.forEach(h => {
       const level = parseInt(h.tagName.substring(1));
       parsedToc.push({ level, text: h.textContent || '' });
    });
    setToc(parsedToc);
  };

  // Sync active note state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      activeNoteIdRef.current = selectedNote.id;
      parseTOC(selectedNote.content || '');
      setActiveNoteTitle(selectedNote.title || '');
      const htmlContent = normalizeNoteContentForEditor(selectedNote.content || '');
      setActiveNoteContent(htmlContent);
      if (editorRef.current && editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    } else {
      activeNoteIdRef.current = null;
      setActiveNoteTitle('');
      setActiveNoteContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [selectedNote?.id]);

  // Auto-save logic
  const saveCurrentNote = useCallback((title: string, content: string) => {
    if (!selectedNote || selectedNote.id !== activeNoteIdRef.current) return;
    if (selectedNote.title === title && selectedNote.content === content) return;

    onUpdateNote({
      ...selectedNote,
      title: title.trim() || 'Nota sin título',
      content: content,
      updated_at: new Date().toISOString()
    });
  }, [selectedNote, onUpdateNote]);

  const handleTitleChange = (newTitle: string) => {
    setActiveNoteTitle(newTitle);
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentNote(newTitle, activeNoteContent);
      setSaveStatus('saved');
    }, 600);
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      setActiveNoteContent(html);
      parseTOC(html);
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        saveCurrentNote(activeNoteTitle, html);
        setSaveStatus('saved');
      }, 600);
    }
  };

  const handleBlurSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveCurrentNote(activeNoteTitle, activeNoteContent);
  };

  // Intercept paste to clean external tags and verse markup from websites/documents
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');

    let contentToInsert = '';
    if (htmlData) {
      contentToInsert = sanitizeAndCleanHtml(htmlData);
    } else if (textData) {
      if (/<[a-z][\s\S]*>/i.test(textData) || /&lt;[a-z][\s\S]*&gt;/i.test(textData)) {
        contentToInsert = sanitizeAndCleanHtml(textData);
      } else {
        contentToInsert = textData
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
      }
    }

    if (contentToInsert) {
      document.execCommand('insertHTML', false, contentToInsert);
      handleEditorInput();
    }
  };

  // Apply visual rich text formatting command
  const applyRichCommand = (command: string, value: string = '') => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  // Copy note content
  const handleCopyNote = () => {
    if (!activeNoteContent && !activeNoteTitle) return;
    const plainContent = cleanToPlainText(activeNoteContent);
    const cleanTitle = cleanToPlainText(activeNoteTitle);
    const fullText = `${cleanTitle}\n\n${plainContent}`.trim();
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Folder Actions
  const handleCreateFolder = async () => {
    const name = `Carpeta ${folders.length + 1}`;
    const newF = await onAddFolder(name, projectId, subjectId);
    if (newF) {
      setSelectedFolderId(newF.id);
      setEditingFolderId(newF.id);
      setEditingFolderName(newF.name);
    }
  };

  const handleStartRenameFolder = (f: Folder) => {
    setEditingFolderId(f.id);
    setEditingFolderName(f.name);
    setFolderMenuOpen(null);
  };

  const handleSaveRenameFolder = async () => {
    if (editingFolderId && editingFolderName.trim()) {
      await onUpdateFolder(editingFolderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
  };

  const confirmDeleteFolder = async () => {
    if (folderToDelete) {
      await onDeleteFolder(folderToDelete.id);
      if (selectedFolderId === folderToDelete.id) {
        const remaining = folders.filter(f => f.id !== folderToDelete.id);
        setSelectedFolderId(remaining.length > 0 ? remaining[0].id : null);
      }
      setFolderToDelete(null);
    }
  };

  // Note Actions
  const handleCreateNote = async () => {
    const folderId = currentView === 'folder' ? selectedFolderId : null;
    const newN = await onAddNote(folderId, projectId, subjectId);
    if (newN) {
      setSelectedNoteId(newN.id);
      if (currentView !== 'folder' && currentView !== 'inbox' && currentView !== 'all') {
         setCurrentView('inbox'); // Redirect to a view that will show the new note, or just 'all'
      }
    }
  };

  const handleStartRenameNote = (n: Note) => {
    setEditingNoteId(n.id);
    setEditingNoteTitle(n.title);
    setNoteMenuOpen(null);
  };

  const handleSaveRenameNote = async () => {
    if (editingNoteId && selectedFolder) {
      const targetNote = selectedFolder.notes.find(n => n.id === editingNoteId);
      if (targetNote && editingNoteTitle.trim()) {
        await onUpdateNote({
          ...targetNote,
          title: editingNoteTitle.trim()
        });
        if (selectedNoteId === editingNoteId) {
          setActiveNoteTitle(editingNoteTitle.trim());
        }
      }
    }
    setEditingNoteId(null);
  };

  const confirmDeleteNote = async () => {
    if (noteToDelete) {
      const currentNotes = filteredNotes;
      const noteIndex = currentNotes.findIndex(n => n.id === noteToDelete.id);
      await onDeleteNote(noteToDelete.id, noteToDelete.folder_id);
      if (selectedNoteId === noteToDelete.id) {
        const nextNote = currentNotes[noteIndex + 1] || currentNotes[noteIndex - 1] || null;
        setSelectedNoteId(nextNote ? nextNote.id : null);
      }
      setNoteToDelete(null);
    }
  };

  // Extract all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags || [])));

  // Filter notes based on view
  const filteredNotes = notes.filter(note => {
    const matchesSearch = (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (note.content || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    if (selectedTag && (!note.tags || !note.tags.includes(selectedTag))) return false;

    // Default: don't show deleted notes unless in trash
    const isDeleted = !!note.deleted_at;
    if (currentView === 'trash') return isDeleted;
    if (isDeleted) return false;

    switch (currentView) {
      case 'all': return !note.is_archived;
      case 'inbox': return !note.folder_id && !note.is_archived;
      case 'favorites': return note.is_favorite && !note.is_archived;
      case 'recent': return !note.is_archived; // sorted by date
      case 'pinned': return note.is_pinned && !note.is_archived;
      case 'archived': return note.is_archived;
      case 'folder': return note.folder_id === selectedFolderId && !note.is_archived;
      default: return true;
    }
  }).sort((a, b) => {
     if (currentView === 'recent') {
       return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
     }
     switch(sortOrder) {
       case 'created': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
       case 'title-asc': return a.title.localeCompare(b.title);
       case 'title-desc': return b.title.localeCompare(a.title);
       case 'updated':
       default:
         return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
     }
  });

  // Word count helper
  const wordCount = activeNoteContent.trim() ? activeNoteContent.trim().split(/\s+/).length : 0;
  const charCount = activeNoteContent.length;

  // ===================== MOBILE VIEW =====================
  if (isMobile) {
    if (!selectedFolderId) {
      // 1. Mobile Folder List
      return (
        <div className="flex flex-col h-full w-full bg-stone-50/50 dark:bg-stone-900/50 p-4 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-stone-800 dark:text-stone-100 flex items-center gap-2">
              <FolderIconLucide className="w-5 h-5 text-sky-500" />
              Carpetas
            </h2>
            <button
              onClick={handleCreateFolder}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 text-white font-medium text-xs shadow-sm active:scale-95 transition-transform"
            >
              <FolderPlus className="w-4 h-4" />
              Nueva Carpeta
            </button>
          </div>

          <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200/70 dark:border-stone-700/70 flex-grow overflow-y-auto divide-y divide-stone-100 dark:divide-stone-700/50">
            {folders.map(folder => (
              <div key={folder.id} className="p-3 flex items-center justify-between gap-3">
                {editingFolderId === folder.id ? (
                  <div className="flex items-center gap-2 flex-grow">
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onBlur={handleSaveRenameFolder}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRenameFolder(); }}
                      autoFocus
                      className="flex-grow px-2 py-1 bg-stone-100 dark:bg-stone-700 text-stone-900 dark:text-stone-100 rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    <button onClick={handleSaveRenameFolder} className="text-xs text-sky-600 dark:text-sky-400 font-semibold px-2">
                      Listo
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="flex items-center gap-3 flex-grow text-left truncate"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center flex-shrink-0">
                        <FolderIconLucide className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <h4 className="font-semibold text-sm text-stone-800 dark:text-stone-100 truncate">{folder.name}</h4>
                        <p className="text-xs text-stone-400 dark:text-stone-500">{folder.notes.length} {folder.notes.length === 1 ? 'nota' : 'notas'}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartRenameFolder(folder)}
                        className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-md hover:bg-stone-100 dark:hover:bg-stone-700/50"
                        title="Renombrar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFolderToDelete(folder)}
                        className="p-1.5 text-stone-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
                        title="Eliminar carpeta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            {folders.length === 0 && (
              <div className="p-8 text-center text-sm text-stone-400">
                No tienes carpetas aún. Crea una para comenzar.
              </div>
            )}
          </div>

          <ConfirmationModal
            isOpen={!!folderToDelete}
            onClose={() => setFolderToDelete(null)}
            onConfirm={confirmDeleteFolder}
            title="Eliminar Carpeta"
            message={`¿Seguro que deseas eliminar "${folderToDelete?.name}" y todas las notas que contiene?`}
          />
        </div>
      );
    } else if (selectedFolderId && !selectedNoteId) {
      // 2. Mobile Notes List inside Folder
      return (
        <div className="flex flex-col h-full w-full bg-stone-50/50 dark:bg-stone-900/50 p-4 pt-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              onClick={() => setSelectedFolderId(null)}
              className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              Carpetas
            </button>
            <h3 className="font-bold text-sm text-stone-800 dark:text-stone-100 truncate">{selectedFolder?.name}</h3>
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-500 text-white font-medium text-xs shadow-sm active:scale-95 transition-transform"
            >
              <FilePlus className="w-4 h-4" />
              Nota
            </button>
          </div>

          <div className="relative mb-3">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-stone-800 rounded-xl text-xs border border-stone-200/70 dark:border-stone-700/70 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="bg-white/80 dark:bg-stone-800/80 backdrop-blur-md rounded-2xl shadow-sm border border-stone-200/70 dark:border-stone-700/70 flex-grow overflow-y-auto divide-y divide-stone-100 dark:divide-stone-700/50">
            {filteredNotes.map(note => (
              <div key={note.id} className="p-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedNoteId(note.id)}
                  className="flex-grow text-left truncate"
                >
                  <h4 className="font-semibold text-sm text-stone-800 dark:text-stone-100 truncate">{note.title || 'Nota sin título'}</h4>
                  <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">{cleanToPlainText(note.content) || 'Sin contenido'}</p>
                </button>
                <button
                  onClick={() => setNoteToDelete(note)}
                  className="p-1.5 text-stone-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                  title="Eliminar nota"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="p-8 text-center text-sm text-stone-400">
                No hay notas en esta carpeta.
              </div>
            )}
          </div>

          <ConfirmationModal
            isOpen={!!noteToDelete}
            onClose={() => setNoteToDelete(null)}
            onConfirm={confirmDeleteNote}
            title="Eliminar Nota"
            message="¿Seguro que deseas eliminar esta nota?"
          />
        </div>
      );
    } else {
      // 3. Mobile Note Editor View
      return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-stone-900">
          {/* Header */}
          <div className="p-3 border-b border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-2 bg-stone-50/80 dark:bg-stone-800/80 backdrop-blur-md">
            <button
              onClick={() => { handleBlurSave(); setSelectedNoteId(null); }}
              className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300"
            >
              <ChevronLeft className="w-4 h-4" />
              Volver
            </button>
            <div className="flex items-center gap-1">
              {saveStatus === 'saving' && <span className="text-[10px] text-sky-500 flex items-center gap-1"><CloudLightning className="w-3 h-3"/> Guardando</span>}
              {saveStatus === 'saved' && <span className="text-[10px] text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/></span>}
              <button onClick={() => { onUpdateNote({ ...selectedNote!, is_favorite: !selectedNote?.is_favorite }); }} className={`p-1.5 rounded-lg ${selectedNote?.is_favorite ? 'text-amber-500' : 'text-stone-400'}`}><Star className="w-4 h-4" fill={selectedNote?.is_favorite ? "currentColor" : "none"} /></button>
              <button onClick={() => setNoteToDelete(selectedNote || null)} className="p-1.5 text-stone-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="px-2 py-1.5 border-b border-stone-200/60 dark:border-stone-800/80 flex items-center gap-1 overflow-x-auto custom-scrollbar bg-stone-50/30 dark:bg-stone-900/30 text-stone-600 dark:text-stone-300">
              <button onClick={() => applyRichCommand('bold')} className="p-1.5 rounded"><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('italic')} className="p-1.5 rounded"><Italic className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('formatBlock', '<h2>')} className="p-1.5 rounded"><Heading2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('insertUnorderedList')} className="p-1.5 rounded"><List className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const calloutHtml = `<div class="p-3 my-2 bg-sky-50 dark:bg-sky-900/20 border-l-2 border-sky-500 rounded-r flex gap-2"><div class="text-sky-500 text-xs font-bold">💡</div><div class="text-xs text-stone-800 dark:text-stone-200 flex-grow">Nota...</div></div><p><br></p>`;
                applyRichCommand('insertHTML', calloutHtml);
              }} className="p-1.5 rounded text-sky-500"><AlertCircle className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex-grow flex flex-col p-4 overflow-y-auto">
            <input
              type="text"
              value={activeNoteTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Título de la nota..."
              className="text-xl font-bold text-stone-900 dark:text-stone-100 bg-transparent focus:outline-none mb-3 placeholder:text-stone-300 dark:placeholder:text-stone-600"
            />
            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onPaste={handlePaste}
                onBlur={handleBlurSave}
                data-placeholder="Escribe tu nota aquí..."
                onKeyDown={(e) => {
                  if (e.key === '/') {
                    const selection = window.getSelection();
                    if (selection && selection.rangeCount > 0) {
                       const range = selection.getRangeAt(0);
                       const rect = range.getBoundingClientRect();
                       setSlashMenuPos({ top: rect.bottom, left: rect.left });
                       setSlashMenuOpen(true);
                    }
                  } else if (slashMenuOpen && e.key === 'Escape') {
                    setSlashMenuOpen(false);
                  }
                }}
                className="note-editor-content flex-grow w-full bg-transparent focus:outline-none text-sm text-stone-800 dark:text-stone-200 leading-relaxed custom-scrollbar min-h-[300px] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400 dark:empty:before:text-stone-600 empty:before:pointer-events-none relative"
            />
          </div>
          <ConfirmationModal
            isOpen={!!noteToDelete}
            onClose={() => setNoteToDelete(null)}
            onConfirm={confirmDeleteNote}
            title="Eliminar Nota"
            message="¿Seguro que deseas eliminar esta nota?"
          />
        </div>
      );
    }
  }

  // ===================== DESKTOP VIEW =====================
  return (
    <div className="flex h-full w-full overflow-hidden bg-white/70 dark:bg-stone-900/70 backdrop-blur-md rounded-2xl border border-stone-200/70 dark:border-stone-800/80 shadow-xl">
      {/* 1. FOLDERS SIDEBAR */}
      {showFolders && (
        <div className="w-56 lg:w-64 flex-shrink-0 flex flex-col border-r border-stone-200/70 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40 h-full">
          <div className="p-3 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300">Navigation</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowFolders(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
                title="Hide sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-4">
            
            {/* Main Views */}
            <div className="space-y-0.5">
              {[
                { id: 'all', label: 'Todas las notas', icon: FileText, color: 'text-stone-500' },
                { id: 'inbox', label: 'Inbox', icon: Inbox, color: 'text-blue-500' },
                { id: 'favorites', label: 'Favoritos', icon: Star, color: 'text-amber-500' },
                { id: 'recent', label: 'Recientes', icon: Clock, color: 'text-emerald-500' },
                { id: 'pinned', label: 'Fijadas', icon: Pin, color: 'text-rose-500' },
              ].map(view => (
                <button
                  key={view.id}
                  onClick={() => { setCurrentView(view.id as NoteView); setSelectedFolderId(null); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-all ${
                    currentView === view.id
                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <view.icon className={`w-4 h-4 ${view.color}`} />
                  {view.label}
                </button>
              ))}
            </div>

            {/* Folders */}
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Carpetas</span>
                <button onClick={handleCreateFolder} className="text-stone-400 hover:text-sky-500 transition-colors">
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="space-y-0.5">
                {folders.map(folder => (
                  <div key={folder.id} className="relative group">
                    {editingFolderId === folder.id ? (
                      <div className="p-1 flex items-center gap-1 bg-white dark:bg-stone-800 rounded border border-sky-400">
                        <input
                          type="text"
                          value={editingFolderName}
                          onChange={(e) => setEditingFolderName(e.target.value)}
                          onBlur={handleSaveRenameFolder}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRenameFolder();
                            if (e.key === 'Escape') setEditingFolderId(null);
                          }}
                          autoFocus
                          className="flex-grow px-1 py-0.5 bg-transparent text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none min-w-0"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => { setCurrentView('folder'); setSelectedFolderId(folder.id); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs font-medium transition-all ${
                          currentView === 'folder' && selectedFolderId === folder.id
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                            : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FolderIconLucide className={`w-3.5 h-3.5 flex-shrink-0 ${currentView === 'folder' && selectedFolderId === folder.id ? 'text-sky-500' : 'text-stone-400'}`} />
                          <span className="truncate">{folder.name}</span>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleStartRenameFolder(folder); }}
                            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                            title="Renombrar"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}
                            className="p-1 text-stone-400 hover:text-red-500"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </button>
                    )}
                  </div>
                ))}
                {folders.length === 0 && (
                  <div className="px-2 py-2 text-xs text-stone-400 italic">Sin carpetas</div>
                )}
              </div>
            </div>

            {/* Tags */}
            {allTags.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mt-4 mb-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Etiquetas</span>
              </div>
              <div className="flex flex-wrap gap-1 px-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${selectedTag === tag ? 'bg-sky-500 text-white' : 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-700'}`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Trash & Archive */}
            <div className="space-y-0.5 pt-2 border-t border-stone-200/50 dark:border-stone-800">
               <button
                  onClick={() => { setCurrentView('archived'); setSelectedFolderId(null); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-all ${
                    currentView === 'archived'
                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <Archive className="w-4 h-4 text-stone-400" />
                  Archivadas
                </button>
                <button
                  onClick={() => { setCurrentView('trash'); setSelectedFolderId(null); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium transition-all ${
                    currentView === 'trash'
                      ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold'
                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                  }`}
                >
                  <Trash2 className="w-4 h-4 text-stone-400" />
                  Papelera
                </button>
            </div>

          </div>
        </div>
      )}

      {/* 2. NOTES LIST SIDEBAR */}
      {showNotesList && (
        <div className="w-60 lg:w-72 flex-shrink-0 flex flex-col border-r border-stone-200/70 dark:border-stone-800 bg-white/50 dark:bg-stone-900/40">
          <div className="p-3 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2">
            {!showFolders && (
              <button
                onClick={() => setShowFolders(true)}
                className="p-1 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                title="Mostrar carpetas"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div className="relative flex-grow">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar nota..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-2 py-1 bg-stone-100 dark:bg-stone-800/80 rounded-lg text-xs border border-transparent focus:border-stone-300 dark:focus:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none"
              />
            </div>
            <button
              onClick={handleCreateNote}
              className="p-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white shadow-sm transition-colors flex-shrink-0"
              title="Nueva nota"
            >
              <FilePlus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowNotesList(false)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
              title="Ocultar lista de notas"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1.5">
            {filteredNotes.map(note => (
              <div key={note.id} className="relative group">
                <button
                  onClick={() => setSelectedNoteId(note.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all ${
                    selectedNoteId === note.id
                      ? 'bg-sky-500/10 dark:bg-sky-500/15 border border-sky-200/80 dark:border-sky-800/60 shadow-sm'
                      : 'hover:bg-stone-100/80 dark:hover:bg-stone-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 pr-6">
                    <h4 className={`text-xs font-semibold truncate ${
                      selectedNoteId === note.id ? 'text-sky-800 dark:text-sky-200' : 'text-stone-800 dark:text-stone-100'
                    }`}>
                      {note.title || 'Nota sin título'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 truncate mt-1">
                    {note.content ? cleanToPlainText(note.content) : 'Sin contenido'}
                  </p>
                </button>

                <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setNoteToDelete(note); }}
                    className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                    title="Eliminar nota"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {filteredNotes.length === 0 && (
              <div className="p-6 text-center text-xs text-stone-400">
                No hay notas aquí.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. NOTE EDITOR */}
      <div className="flex-grow flex flex-col min-w-0 bg-white dark:bg-stone-900/90">
        {selectedNote ? (
          <>
            {/* Editor Top Bar */}
            <div className="p-2.5 px-4 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between gap-2 bg-stone-50/40 dark:bg-stone-900/60">
              <div className="flex items-center gap-2">
                {(!showFolders || !showNotesList) && (
                  <div className="flex items-center gap-1.5">
                    {!showFolders && (
                      <button
                        onClick={() => setShowFolders(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition-colors"
                        title="Ver carpetas"
                      >
                        <FolderIconLucide className="w-3.5 h-3.5" />
                        <span>Carpetas</span>
                      </button>
                    )}
                    {!showNotesList && (
                      <button
                        onClick={() => setShowNotesList(true)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition-colors"
                        title="Ver lista de notas"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Notas</span>
                      </button>
                    )}
                  </div>
                )}
                <div className="text-[11px] font-medium text-stone-400 dark:text-stone-500 flex items-center gap-2">
                  <span>{currentView === 'folder' ? selectedFolder?.name : currentView.toUpperCase()} / <span className="text-stone-600 dark:text-stone-300 font-semibold">{activeNoteTitle || 'Sin título'}</span></span>
                  {saveStatus === 'saving' && <span className="text-sky-500 flex items-center gap-1"><CloudLightning className="w-3 h-3"/> Guardando...</span>}
                  {saveStatus === 'saved' && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Guardado</span>}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-stone-400 dark:text-stone-500 hidden sm:inline mr-2">
                  {wordCount} palabras · {charCount} car.
                </span>

                <button
                  onClick={handleCopyNote}
                  className="p-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Copiar texto"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => {
                     const isFav = !selectedNote?.is_favorite;
                     onUpdateNote({ ...selectedNote!, is_favorite: isFav });
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${selectedNote?.is_favorite ? 'text-amber-500 hover:bg-amber-50' : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                  title={selectedNote?.is_favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                >
                  <Star className="w-4 h-4" fill={selectedNote?.is_favorite ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => {
                     const isPinned = !selectedNote?.is_pinned;
                     onUpdateNote({ ...selectedNote!, is_pinned: isPinned });
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${selectedNote?.is_pinned ? 'text-rose-500 hover:bg-rose-50' : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                  title={selectedNote?.is_pinned ? "Desfijar" : "Fijar"}
                >
                  <Pin className="w-4 h-4" fill={selectedNote?.is_pinned ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => {
                     if (selectedNote?.deleted_at) {
                       onUpdateNote({ ...selectedNote!, deleted_at: null });
                     } else if (selectedNote?.is_archived) {
                       onUpdateNote({ ...selectedNote!, is_archived: false });
                     } else {
                       onUpdateNote({ ...selectedNote!, is_archived: true });
                     }
                  }}
                  className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title={selectedNote?.deleted_at ? "Restaurar" : (selectedNote?.is_archived ? "Desarchivar" : "Archivar")}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    if (selectedNote?.deleted_at) {
                      setNoteToDelete(selectedNote); // permanently delete
                    } else {
                      onUpdateNote({ ...selectedNote!, deleted_at: new Date().toISOString() }); // move to trash
                      setSelectedNoteId(null);
                    }
                  }}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title={selectedNote?.deleted_at ? "Eliminar permanentemente" : "Mover a papelera"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Focus mode toggle */}
                <button
                  onClick={() => {
                    const toggle = showFolders || showNotesList;
                    setShowFolders(!toggle);
                    setShowNotesList(!toggle);
                  }}
                  className={`p-1.5 rounded-lg transition-colors ${
                    (!showFolders && !showNotesList)
                      ? 'bg-sky-500 text-white'
                      : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                  title={(!showFolders && !showNotesList) ? 'Salir de modo enfoque' : 'Modo Enfoque (Ocultar paneles)'}
                >
                  {(!showFolders && !showNotesList) ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Rich Formatting Toolbar */}
            <div className="px-4 py-1.5 border-b border-stone-200/60 dark:border-stone-800/80 flex items-center gap-1 overflow-x-auto custom-scrollbar bg-stone-50/30 dark:bg-stone-900/30 text-stone-600 dark:text-stone-300">
              <button onClick={() => applyRichCommand('bold')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Negrita"><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('italic')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Cursiva"><Italic className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('underline')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Subrayado"><UnderlineIcon className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('strikeThrough')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></button>

              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => applyRichCommand('formatBlock', '<h1>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 1"><Heading1 className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('formatBlock', '<h2>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 2"><Heading2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('formatBlock', '<h3>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 3"><Heading3 className="w-3.5 h-3.5" /></button>

              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => applyRichCommand('insertUnorderedList')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Lista con viñetas"><List className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('insertOrderedList')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></button>
              
              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => applyRichCommand('formatBlock', '<blockquote>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Cita"><Quote className="w-3.5 h-3.5" /></button>
              <button onClick={() => applyRichCommand('formatBlock', '<pre>')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Bloque de código"><Terminal className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const url = prompt('Ingrese URL del enlace:');
                if (url) applyRichCommand('createLink', url);
              }} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Enlace"><Link className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const url = prompt('Ingrese URL de la imagen:');
                if (url) applyRichCommand('insertImage', url);
              }} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Imagen"><ImageIcon className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const tableHtml = `<table class="min-w-full divide-y divide-stone-300 dark:divide-stone-700 my-4 border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                  <thead class="bg-stone-50 dark:bg-stone-900"><tr><th class="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase">Header 1</th><th class="px-3 py-2 text-left text-xs font-medium text-stone-500 uppercase">Header 2</th></tr></thead>
                  <tbody class="divide-y divide-stone-200 dark:divide-stone-800"><tr><td class="px-3 py-2 text-sm">Data 1</td><td class="px-3 py-2 text-sm">Data 2</td></tr></tbody>
                </table><p><br></p>`;
                applyRichCommand('insertHTML', tableHtml);
              }} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Tabla"><TableIcon className="w-3.5 h-3.5" /></button>
              
              <button onClick={() => {
                const calloutHtml = `<div class="p-4 my-4 bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500 rounded-r-lg flex gap-3">
                  <div class="text-sky-500 font-bold">💡</div>
                  <div class="text-sm text-stone-800 dark:text-stone-200 flex-grow">Llamado de atención / Idea...</div>
                </div><p><br></p>`;
                applyRichCommand('insertHTML', calloutHtml);
              }} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Callout (Idea/Nota)"><AlertCircle className="w-3.5 h-3.5" /></button>
              
              <button onClick={() => applyRichCommand('insertHorizontalRule')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Línea divisoria"><Minus className="w-3.5 h-3.5" /></button>
            </div>
            
            {/* Note Editor Inputs */}
            <div className="flex-grow overflow-hidden flex">
              <div className="flex-grow flex flex-col p-6 overflow-y-auto max-w-4xl w-full mx-auto relative">
                <input
                  type="text"
                  value={activeNoteTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={handleBlurSave}
                  placeholder="Título de la nota..."
                  className="text-2xl font-bold text-stone-900 dark:text-stone-100 bg-transparent focus:outline-none mb-4 placeholder:text-stone-300 dark:placeholder:text-stone-600"
                />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onPaste={handlePaste}
                  onBlur={handleBlurSave}
                  data-placeholder="Comienza a escribir tu nota aquí..."
                  className="note-editor-content flex-grow w-full bg-transparent focus:outline-none text-sm text-stone-800 dark:text-stone-200 leading-relaxed custom-scrollbar min-h-[300px] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-stone-400 dark:empty:before:text-stone-600 empty:before:pointer-events-none"
                />
                {slashMenuOpen && (
                  <div 
                    className="fixed z-50 w-48 bg-white dark:bg-stone-800 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-700 py-2 flex flex-col"
                    style={{ top: slashMenuPos.top + 10, left: slashMenuPos.left }}
                  >
                    <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">Bloques</div>
                    <button onClick={() => { applyRichCommand('formatBlock', '<h1>'); setSlashMenuOpen(false); }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><Heading1 className="w-4 h-4"/> Heading 1</button>
                    <button onClick={() => { applyRichCommand('formatBlock', '<h2>'); setSlashMenuOpen(false); }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><Heading2 className="w-4 h-4"/> Heading 2</button>
                    <button onClick={() => { applyRichCommand('insertUnorderedList'); setSlashMenuOpen(false); }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><List className="w-4 h-4"/> Lista</button>
                    <button onClick={() => { applyRichCommand('formatBlock', '<pre>'); setSlashMenuOpen(false); }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><Terminal className="w-4 h-4"/> Código</button>
                    <button onClick={() => { 
                        const calloutHtml = `<div class="p-4 my-4 bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500 rounded-r-lg flex gap-3"><div class="text-sky-500 font-bold">💡</div><div class="text-sm text-stone-800 dark:text-stone-200 flex-grow">Idea...</div></div><p><br></p>`;
                      applyRichCommand('insertHTML', calloutHtml); setSlashMenuOpen(false); 
                    }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Callout</button>
                    <div className="px-3 py-1 mt-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-t border-stone-100 dark:border-stone-700 pt-2">Plantillas</div>
                    <button onClick={() => {
                      const template = `<h1>Acta de Reunión</h1><p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p><h2>Asistentes</h2><ul><li></li></ul><h2>Agenda</h2><ol><li></li></ol><h2>Decisiones & Tareas</h2><ul><li></li></ul>`;
                      applyRichCommand('insertHTML', template); setSlashMenuOpen(false);
                    }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><FileText className="w-4 h-4"/> Acta de Reunión</button>
                    <button onClick={() => {
                      const template = `<h1>Nota Diaria</h1><p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p><h2>Top 3 Tareas de Hoy</h2><ol><li></li><li></li><li></li></ol><h2>Reflexiones</h2><p><br></p><h2>Notas Aleatorias</h2><ul><li></li></ul>`;
                      applyRichCommand('insertHTML', template); setSlashMenuOpen(false);
                    }} className="px-3 py-1.5 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"><FileText className="w-4 h-4"/> Nota Diaria</button>
                  </div>
                )}
              </div>
              {/* DETAILS PANEL */}
              {showDetails && (
                <div className="w-64 flex-shrink-0 border-l border-stone-200/70 dark:border-stone-800 bg-stone-50/30 dark:bg-stone-900/40 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-6 text-xs text-stone-600 dark:text-stone-400">
                  {/* Table of Contents */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Tabla de Contenidos</h4>
                    {toc.length > 0 ? (
                      <div className="space-y-1.5">
                        {toc.map((h, i) => (
                          <div key={i} className={`truncate hover:text-sky-500 cursor-pointer transition-colors ${h.level === 1 ? 'pl-0 font-semibold' : h.level === 2 ? 'pl-2' : 'pl-4'}`}>
                            {h.text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] italic">Sin encabezados</span>
                    )}
                  </div>
                  {/* Metadata */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Detalles</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between"><span>Modificada:</span> <span>{new Date(selectedNote.updated_at).toLocaleDateString()}</span></div>
                      <div className="flex items-center justify-between"><span>Palabras:</span> <span>{cleanToPlainText(activeNoteContent).split(/\s+/).filter(w => w.length>0).length}</span></div>
                    </div>
                  </div>
                  {/* Tags */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Etiquetas</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedNote.tags?.map(tag => (
                        <span key={tag} className="bg-stone-200 dark:bg-stone-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          #{tag}
                          <button onClick={() => {
                            const newTags = (selectedNote.tags || []).filter(t => t !== tag);
                            onUpdateNote({ ...selectedNote, tags: newTags });
                          }} className="hover:text-red-500"><X className="w-2.5 h-2.5"/></button>
                        </span>
                      ))}
                      <button onClick={() => {
                        const tag = prompt('Nueva etiqueta:');
                        if (tag && tag.trim()) {
                            const newTags = [...(selectedNote.tags || []), tag.trim().replace(/^#/, '')];
                            onUpdateNote({ ...selectedNote, tags: newTags });
                        }
                      }} className="bg-transparent border border-dashed border-stone-300 dark:border-stone-700 hover:border-sky-500 px-2 py-0.5 rounded-full hover:text-sky-500 transition-colors">
                        + tag
                      </button>
                    </div>
                  </div>
                  {/* Backlinks */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Menciones (Backlinks)</h4>
                    <div className="space-y-1">
                      {notes.filter(n => n.id !== selectedNote.id && (n.content?.includes(`[[${selectedNote.title}]]`) || n.title?.includes(selectedNote.title))).length > 0 ? 
                        notes.filter(n => n.id !== selectedNote.id && (n.content?.includes(`[[${selectedNote.title}]]`) || n.title?.includes(selectedNote.title))).map(bn => (
                          <button key={bn.id} onClick={() => { setSelectedNoteId(bn.id); if (bn.folder_id) setSelectedFolderId(bn.folder_id); }} className="w-full text-left text-xs truncate hover:text-sky-500 transition-colors text-stone-500">
                            • {bn.title}
                          </button>
                        )) : (
                        <span className="text-[10px] italic">No hay enlaces a esta nota</span>
                      )}
                    </div>
                  </div>
                  {/* Note Link */}
                  <div>
                    <h4 className="font-bold uppercase tracking-wider text-[10px] text-stone-400 mb-2">Compartir</h4>
                    <button onClick={() => {
                      navigator.clipboard.writeText(`[[${selectedNote.title}]]`);
                      alert('Enlace interno copiado al portapapeles');
                    }} className="flex items-center gap-2 px-2 py-1.5 bg-stone-200/50 dark:bg-stone-800/50 rounded-lg w-full justify-center hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors mb-2">
                      <Link className="w-3.5 h-3.5"/> Copiar Link de Nota
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-stone-400 dark:text-stone-500 p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-stone-700 dark:text-stone-300">Ninguna nota seleccionada</h4>
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">Selecciona una nota de la lista o crea una nueva.</p>
            </div>
            {selectedFolder && (
              <button
                onClick={handleCreateNote}
                className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white font-medium text-xs shadow-sm transition-all flex items-center gap-1.5 mt-2"
              >
                <FilePlus className="w-4 h-4" />
                Crear nota
              </button>
            )}

            {(!showFolders || !showNotesList) && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-4 pt-3 border-t border-stone-200/60 dark:border-stone-800/60">
                {!showFolders && (
                  <button
                    onClick={() => setShowFolders(true)}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <FolderIconLucide className="w-4 h-4 text-sky-500" />
                    Ver Carpetas
                  </button>
                )}
                {!showNotesList && (
                  <button
                    onClick={() => setShowNotesList(true)}
                    className="px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-sky-500" />
                    Ver Notas
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deletion confirmation modals */}
      <ConfirmationModal
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={confirmDeleteFolder}
        title="Eliminar Carpeta"
        message={`¿Seguro que deseas eliminar la carpeta "${folderToDelete?.name}" y todas sus notas? Esta acción no se puede deshacer.`}
      />

      <ConfirmationModal
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={confirmDeleteNote}
        title="Eliminar Nota"
        message={`¿Seguro que deseas eliminar esta nota?`}
      />
    </div>
  );
};

export default NotesSection;
