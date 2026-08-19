import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Folder, Note } from '../types';
import { 
  Folder as FolderIconLucide, 
  FolderPlus, 
  FileText, 
  FilePlus, 
  Trash2, 
  Edit3, 
  Sparkles, 
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
  X
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ConfirmationModal from './ConfirmationModal';

interface NotesSectionProps {
  folders: Folder[];
  onAddFolder: (name: string) => Promise<Folder | null>;
  onUpdateFolder: (folderId: number, name: string) => Promise<void>;
  onDeleteFolder: (folderId: number) => Promise<void>;
  onAddNote: (folderId: number) => Promise<Note | null>;
  onUpdateNote: (note: Note) => Promise<void>;
  onDeleteNote: (noteId: number, folderId: number) => Promise<void>;
  isMobile?: boolean;
}

const NotesSection: React.FC<NotesSectionProps> = ({
  folders,
  onAddFolder,
  onUpdateFolder,
  onDeleteFolder,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  isMobile = false,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
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

  // Textarea ref for inserting text tools
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
  const selectedNote = selectedFolder?.notes.find(n => n.id === selectedNoteId);

  // Sync active note state when selected note changes
  useEffect(() => {
    if (selectedNote) {
      activeNoteIdRef.current = selectedNote.id;
      setActiveNoteTitle(selectedNote.title || '');
      setActiveNoteContent(selectedNote.content || '');
    } else {
      activeNoteIdRef.current = null;
      setActiveNoteTitle('');
      setActiveNoteContent('');
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
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentNote(newTitle, activeNoteContent);
    }, 600);
  };

  const handleContentChange = (newContent: string) => {
    setActiveNoteContent(newContent);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentNote(activeNoteTitle, newContent);
    }, 600);
  };

  const handleBlurSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveCurrentNote(activeNoteTitle, activeNoteContent);
  };

  // Formatting tools helper
  const insertFormat = (prefix: string, suffix: string = '', defaultPlaceholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selected = currentVal.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selected}${suffix}`;
    const updated = currentVal.substring(0, start) + replacement + currentVal.substring(end);

    handleContentChange(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const currentVal = textarea.value;
    const lineStart = currentVal.lastIndexOf('\n', start - 1) + 1;
    const updated = currentVal.substring(0, lineStart) + prefix + currentVal.substring(lineStart);

    handleContentChange(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length);
    }, 10);
  };

  // Magic Note with Gemini
  const handleMagicNote = async () => {
    if (!activeNoteContent || isAiLoading) return;
    setIsAiLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analiza las siguientes notas y genera un resumen claro con 3 puntos clave accionables:\n\n"${activeNoteContent}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      const resultText = response.text || '';

      const updated = `${activeNoteContent}\n\n---\n✨ **Resumen Inteligente:**\n${resultText}`;
      handleContentChange(updated);
    } catch (error) {
      console.error("Gemini AI Error in Notes:", error);
      const updated = `${activeNoteContent}\n\n✨ No se pudo generar el resumen inteligente.`;
      handleContentChange(updated);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Copy note content
  const handleCopyNote = () => {
    if (!activeNoteContent && !activeNoteTitle) return;
    const fullText = `${activeNoteTitle}\n\n${activeNoteContent}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Folder Actions
  const handleCreateFolder = async () => {
    const name = `Carpeta ${folders.length + 1}`;
    const newF = await onAddFolder(name);
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
    if (!selectedFolderId) return;
    const newN = await onAddNote(selectedFolderId);
    if (newN) {
      setSelectedNoteId(newN.id);
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
    if (noteToDelete && selectedFolderId) {
      const currentNotes = selectedFolder?.notes || [];
      const noteIndex = currentNotes.findIndex(n => n.id === noteToDelete.id);
      await onDeleteNote(noteToDelete.id, selectedFolderId);
      if (selectedNoteId === noteToDelete.id) {
        const nextNote = currentNotes[noteIndex + 1] || currentNotes[noteIndex - 1] || null;
        setSelectedNoteId(nextNote ? nextNote.id : null);
      }
      setNoteToDelete(null);
    }
  };

  // Filter notes
  const filteredNotes = selectedFolder?.notes.filter(note =>
    (note.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.content || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

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
                  <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">{note.content || 'Sin contenido'}</p>
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
              <button
                onClick={handleMagicNote}
                disabled={isAiLoading || !activeNoteContent}
                className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-lg disabled:opacity-40"
                title="Resumen Mágico"
              >
                <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleCopyNote}
                className="p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-lg"
                title="Copiar"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setNoteToDelete(selectedNote || null)}
                className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tools Bar (Mobile) */}
          <div className="px-2 py-1.5 border-b border-stone-200/60 dark:border-stone-800/80 flex items-center gap-1 overflow-x-auto custom-scrollbar bg-stone-50/40 dark:bg-stone-900/40">
            <button onClick={() => insertFormat('**', '**', 'negrita')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><Bold className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertFormat('*', '*', 'cursiva')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><Italic className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertFormat('~~', '~~', 'tachado')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><Strikethrough className="w-3.5 h-3.5" /></button>
            <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />
            <button onClick={() => insertLinePrefix('# ')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><Heading1 className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertLinePrefix('## ')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><Heading2 className="w-3.5 h-3.5" /></button>
            <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-0.5" />
            <button onClick={() => insertLinePrefix('- ')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><List className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertLinePrefix('1. ')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><ListOrdered className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertLinePrefix('- [ ] ')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><CheckSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => insertLinePrefix('> ')} className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300"><Quote className="w-3.5 h-3.5" /></button>
          </div>

          {/* Editor Body */}
          <div className="flex-grow flex flex-col p-4 overflow-y-auto">
            <input
              type="text"
              value={activeNoteTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Título de la nota..."
              className="text-xl font-bold text-stone-900 dark:text-stone-100 bg-transparent focus:outline-none mb-3 placeholder:text-stone-300 dark:placeholder:text-stone-600"
            />
            <textarea
              ref={textareaRef}
              value={activeNoteContent}
              onChange={(e) => handleContentChange(e.target.value)}
              onBlur={handleBlurSave}
              placeholder="Escribe tu nota aquí..."
              className="flex-grow w-full bg-transparent focus:outline-none resize-none text-sm text-stone-800 dark:text-stone-200 leading-relaxed custom-scrollbar placeholder:text-stone-400"
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
        <div className="w-56 lg:w-64 flex-shrink-0 flex flex-col border-r border-stone-200/70 dark:border-stone-800 bg-stone-50/70 dark:bg-stone-950/40">
          <div className="p-3 border-b border-stone-200/70 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderIconLucide className="w-4 h-4 text-sky-500" />
              <span className="font-bold text-xs uppercase tracking-wider text-stone-600 dark:text-stone-300">Carpetas</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCreateFolder}
                className="p-1 rounded-lg text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
                title="Nueva carpeta"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowFolders(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-800 transition-colors"
                title="Ocultar carpetas"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar p-2 space-y-1">
            {folders.map(folder => (
              <div key={folder.id} className="relative group">
                {editingFolderId === folder.id ? (
                  <div className="p-1.5 flex items-center gap-2 bg-white dark:bg-stone-800 rounded-lg border border-sky-400">
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
                      className="flex-grow px-1 py-0.5 bg-transparent text-xs font-semibold text-stone-900 dark:text-stone-100 focus:outline-none"
                    />
                    <button
                      onClick={handleSaveRenameFolder}
                      className="text-[11px] font-bold text-sky-600 dark:text-sky-400"
                    >
                      OK
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-medium transition-all ${
                      selectedFolderId === folder.id
                        ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300 font-semibold border border-sky-200/60 dark:border-sky-800/50'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderIconLucide className={`w-3.5 h-3.5 flex-shrink-0 ${selectedFolderId === folder.id ? 'text-sky-500' : 'text-stone-400'}`} />
                      <span className="truncate">{folder.name}</span>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-200/60 dark:bg-stone-800 text-stone-500 dark:text-stone-400 font-bold">
                        {folder.notes.length}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartRenameFolder(folder); }}
                          className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 rounded"
                          title="Renombrar"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}
                          className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            ))}
            {folders.length === 0 && (
              <div className="p-4 text-center text-xs text-stone-400">
                Sin carpetas
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. NOTES LIST SIDEBAR */}
      {showNotesList && selectedFolder && (
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
                    {note.content || 'Sin contenido'}
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
                No hay notas en esta carpeta.
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
                  <button
                    onClick={() => { setShowFolders(true); setShowNotesList(true); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition-colors"
                    title="Mostrar paneles laterales"
                  >
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                    <span>Mostrar paneles</span>
                  </button>
                )}
                <div className="text-[11px] font-medium text-stone-400 dark:text-stone-500">
                  {selectedFolder?.name} / <span className="text-stone-600 dark:text-stone-300 font-semibold">{activeNoteTitle || 'Sin título'}</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-stone-400 dark:text-stone-500 hidden sm:inline mr-2">
                  {wordCount} palabras · {charCount} car.
                </span>

                <button
                  onClick={handleMagicNote}
                  disabled={isAiLoading || !activeNoteContent}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-300/40 dark:border-amber-700/40 disabled:opacity-40 transition-colors"
                  title="Resumen inteligente con IA"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">IA Resumen</span>
                </button>

                <button
                  onClick={handleCopyNote}
                  className="p-1.5 rounded-lg text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                  title="Copiar texto"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setNoteToDelete(selectedNote)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Eliminar nota"
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
              <button onClick={() => insertFormat('**', '**', 'negrita')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Negrita (**texto**)">
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormat('*', '*', 'cursiva')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Cursiva (*texto*)">
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormat('<u>', '</u>', 'subrayado')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Subrayado">
                <UnderlineIcon className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormat('~~', '~~', 'tachado')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Tachado (~~texto~~)">
                <Strikethrough className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => insertLinePrefix('# ')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 1 (#)">
                <Heading1 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertLinePrefix('## ')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 2 (##)">
                <Heading2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertLinePrefix('### ')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Encabezado 3 (###)">
                <Heading3 className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => insertLinePrefix('- ')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Lista con viñetas (-)">
                <List className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertLinePrefix('1. ')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Lista numerada (1.)">
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertLinePrefix('- [ ] ')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Lista de tareas (- [ ])">
                <CheckSquare className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => insertLinePrefix('> ')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Cita (> )">
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertFormat('```\n', '\n```', 'código')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Bloque de código (```)">
                <Code className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => insertLinePrefix('---\n')} className="p-1.5 rounded hover:bg-stone-200/70 dark:hover:bg-stone-800 transition-colors" title="Línea divisoria (---)">
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Note Editor Inputs */}
            <div className="flex-grow flex flex-col p-6 overflow-y-auto max-w-4xl w-full mx-auto">
              <input
                type="text"
                value={activeNoteTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Título de la nota..."
                className="text-2xl font-bold text-stone-900 dark:text-stone-100 bg-transparent focus:outline-none mb-4 placeholder:text-stone-300 dark:placeholder:text-stone-600"
              />
              <textarea
                ref={textareaRef}
                value={activeNoteContent}
                onChange={(e) => handleContentChange(e.target.value)}
                onBlur={handleBlurSave}
                placeholder="Comienza a escribir tu nota aquí..."
                className="flex-grow w-full bg-transparent focus:outline-none resize-none text-sm text-stone-800 dark:text-stone-200 leading-relaxed custom-scrollbar placeholder:text-stone-400 min-h-[300px]"
              />
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
