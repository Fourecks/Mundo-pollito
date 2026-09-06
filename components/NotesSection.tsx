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
  Printer,
  Download,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  CloudLightning,
  BookOpen,
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
  const [isReadingMode, setIsReadingMode] = useState(false);
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const activeNoteIdRef = useRef<number | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<{ title: string; content: string }>({ title: '', content: '' });
  const lastActiveTargetRef = useRef<'title' | 'body'>('body');
  const savedRangeRef = useRef<Range | null>(null);

  // Undo / Redo History Engine
  const historyStackRef = useRef<Array<{ title: string; content: string }>>([]);
  const historyIndexRef = useRef<number>(-1);
  const isHistoryApplyingRef = useRef<boolean>(false);
  const typingHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
      const plainTitle = selectedNote.title || '';
      setActiveNoteTitle(plainTitle);
      if (titleRef.current) {
        titleRef.current.innerHTML = plainTitle;
      }
      const cleanContent = normalizeNoteContentForEditor(selectedNote.content || '');
      setActiveNoteContent(cleanContent);
      lastSavedContentRef.current = { title: plainTitle, content: cleanContent };

      if (editorRef.current) {
        editorRef.current.innerHTML = cleanContent;
      }

      // Initialize undo/redo history stack for the freshly selected note
      historyStackRef.current = [{ title: plainTitle, content: cleanContent }];
      historyIndexRef.current = 0;
      setCanUndo(false);
      setCanRedo(false);

      loadNoteVersions(selectedNote.id);
    } else {
      setActiveNoteTitle('');
      setActiveNoteContent('');
      if (titleRef.current) {
        titleRef.current.innerHTML = '';
      }
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      historyStackRef.current = [];
      historyIndexRef.current = -1;
      setCanUndo(false);
      setCanRedo(false);
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
        const sanitizedContent = sanitizeAndCleanHtml(contentToSave);
        const updated: Note = {
          ...current,
          title: titleToSave,
          content: sanitizedContent,
          updated_at: new Date().toISOString(),
        };

        await onUpdateNote(updated);
        lastSavedContentRef.current = { title: titleToSave, content: sanitizedContent };
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

  // Push state snapshot to custom Undo/Redo stack
  const pushHistorySnapshot = useCallback((customTitle?: string, customContent?: string) => {
    if (isHistoryApplyingRef.current) return;
    const currentTitle = customTitle !== undefined ? customTitle : (titleRef.current ? titleRef.current.innerHTML : activeNoteTitle);
    const currentContent = customContent !== undefined ? customContent : (editorRef.current ? editorRef.current.innerHTML : activeNoteContent);

    const stack = historyStackRef.current;
    const currentIndex = historyIndexRef.current;

    // Don't push identical consecutive states
    if (currentIndex >= 0 && currentIndex < stack.length) {
      const last = stack[currentIndex];
      if (last.title === currentTitle && last.content === currentContent) {
        return;
      }
    }

    // Truncate redo stack when new changes are made
    const nextStack = stack.slice(0, currentIndex + 1);
    nextStack.push({ title: currentTitle, content: currentContent });

    // Limit maximum undo stack history to 60 snapshots
    if (nextStack.length > 60) {
      nextStack.shift();
    }

    historyStackRef.current = nextStack;
    historyIndexRef.current = nextStack.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, [activeNoteTitle, activeNoteContent]);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;

    // Capture any pending live typing into current position if we are at top
    const currentTitle = titleRef.current ? titleRef.current.innerHTML : activeNoteTitle;
    const currentContent = editorRef.current ? editorRef.current.innerHTML : activeNoteContent;
    const currentSnapshot = historyStackRef.current[historyIndexRef.current];

    if (currentSnapshot && (currentSnapshot.title !== currentTitle || currentSnapshot.content !== currentContent)) {
      historyStackRef.current[historyIndexRef.current] = { title: currentTitle, content: currentContent };
    }

    historyIndexRef.current -= 1;
    const target = historyStackRef.current[historyIndexRef.current];
    if (!target) return;

    isHistoryApplyingRef.current = true;
    if (titleRef.current) titleRef.current.innerHTML = target.title;
    if (editorRef.current) editorRef.current.innerHTML = target.content;
    setActiveNoteTitle(target.title);
    setActiveNoteContent(target.content);
    scheduleAutoSave(target.title, target.content);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyStackRef.current.length - 1);

    setTimeout(() => {
      isHistoryApplyingRef.current = false;
    }, 40);
  }, [activeNoteTitle, activeNoteContent]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyStackRef.current.length - 1) return;

    historyIndexRef.current += 1;
    const target = historyStackRef.current[historyIndexRef.current];
    if (!target) return;

    isHistoryApplyingRef.current = true;
    if (titleRef.current) titleRef.current.innerHTML = target.title;
    if (editorRef.current) editorRef.current.innerHTML = target.content;
    setActiveNoteTitle(target.title);
    setActiveNoteContent(target.content);
    scheduleAutoSave(target.title, target.content);
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyStackRef.current.length - 1);

    setTimeout(() => {
      isHistoryApplyingRef.current = false;
    }, 40);
  }, [activeNoteTitle, activeNoteContent]);

  const scheduleTypingSnapshot = () => {
    if (typingHistoryTimeoutRef.current) {
      clearTimeout(typingHistoryTimeoutRef.current);
    }
    typingHistoryTimeoutRef.current = setTimeout(() => {
      pushHistorySnapshot();
    }, 500);
  };

  const handleTitleInput = () => {
    if (!titleRef.current) return;
    isTypingRef.current = true;
    const newTitle = titleRef.current.innerHTML;
    setActiveNoteTitle(newTitle);
    scheduleAutoSave(newTitle, activeNoteContent);
    scheduleTypingSnapshot();
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    isTypingRef.current = true;
    const newContent = editorRef.current.innerHTML;
    setActiveNoteContent(newContent);
    scheduleAutoSave(activeNoteTitle, newContent);
    scheduleTypingSnapshot();
  };

  // Save active selection range across editor & title
  const saveActiveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (titleRef.current && titleRef.current.contains(range.commonAncestorContainer)) {
        lastActiveTargetRef.current = 'title';
        savedRangeRef.current = range.cloneRange();
      } else if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        lastActiveTargetRef.current = 'body';
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  // Apply CSS Styles (Fonts, Sizes, Colors, Alignments) directly to Selection or Element
  const handleApplyStyle = (styleProperty: string, value: string) => {
    // Record history snapshot before modification
    pushHistorySnapshot();

    const sel = window.getSelection();
    let range: Range | null = null;

    if (sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    } else if (savedRangeRef.current) {
      range = savedRangeRef.current;
    }

    const isInsideTitle = !!(titleRef.current && range && titleRef.current.contains(range.commonAncestorContainer));
    const isInsideEditor = !!(editorRef.current && range && editorRef.current.contains(range.commonAncestorContainer));

    // Case 1: Active text selection inside title or body
    if (range && !range.collapsed && (isInsideTitle || isInsideEditor)) {
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }

      const span = document.createElement('span');
      span.style.setProperty(styleProperty, value);
      if (styleProperty === 'font-size') span.style.lineHeight = '1.35';
      if (styleProperty === 'background-color' && value !== 'transparent') {
        span.style.padding = '1px 3px';
        span.style.borderRadius = '3px';
      }

      try {
        const contents = range.extractContents();
        span.appendChild(contents);
        range.insertNode(span);

        if (sel) {
          sel.removeAllRanges();
          const newRange = document.createRange();
          newRange.selectNodeContents(span);
          sel.addRange(newRange);
          savedRangeRef.current = newRange.cloneRange();
        }
      } catch (err) {
        console.warn('Could not wrap selection:', err);
      }

      if (isInsideTitle) {
        handleTitleInput();
      } else {
        handleEditorInput();
      }
      pushHistorySnapshot();
      return;
    }

    // Case 2: Direct styling on element or caret position
    if (lastActiveTargetRef.current === 'title' && titleRef.current) {
      titleRef.current.focus();
      if (styleProperty === 'font-family') {
        titleRef.current.style.fontFamily = value;
      } else if (styleProperty === 'font-size') {
        titleRef.current.style.fontSize = value;
      } else if (styleProperty === 'color') {
        titleRef.current.style.color = value === 'inherit' ? '' : value;
      } else if (styleProperty === 'background-color') {
        titleRef.current.style.backgroundColor = value === 'transparent' ? '' : value;
      } else if (styleProperty === 'text-align') {
        titleRef.current.style.textAlign = value;
      }
      handleTitleInput();
    } else if (editorRef.current) {
      editorRef.current.focus();
      if (range && isInsideEditor) {
        const span = document.createElement('span');
        span.style.setProperty(styleProperty, value);
        span.innerHTML = '&#8203;';
        range.insertNode(span);
        const newRange = document.createRange();
        newRange.setStart(span.firstChild || span, 1);
        newRange.collapse(true);
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedRangeRef.current = newRange.cloneRange();
        }
      } else {
        if (styleProperty === 'font-family') {
          editorRef.current.style.fontFamily = value;
        } else if (styleProperty === 'text-align') {
          if (value === 'center') document.execCommand('justifyCenter');
          else if (value === 'right') document.execCommand('justifyRight');
          else if (value === 'justify') document.execCommand('justifyFull');
          else document.execCommand('justifyLeft');
        }
      }
      handleEditorInput();
    }

    pushHistorySnapshot();
  };

  // Rich Text Commands
  const handleApplyCommand = (command: string, value: string = '') => {
    if (command === 'undo') {
      handleUndo();
      return;
    }
    if (command === 'redo') {
      handleRedo();
      return;
    }

    pushHistorySnapshot();

    const targetEl = lastActiveTargetRef.current === 'title' ? titleRef.current : editorRef.current;
    if (!targetEl) return;
    targetEl.focus();

    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }

    try {
      document.execCommand('styleWithCSS', false, 'true');
    } catch (e) {
      // Ignore if not supported
    }

    document.execCommand(command, false, value);

    if (lastActiveTargetRef.current === 'title') {
      handleTitleInput();
    } else {
      handleEditorInput();
    }

    pushHistorySnapshot();
  };

  const handleInsertHtml = (html: string) => {
    pushHistorySnapshot();

    const targetEl = lastActiveTargetRef.current === 'title' ? titleRef.current : editorRef.current;
    if (!targetEl) return;
    targetEl.focus();

    if (savedRangeRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }

    document.execCommand('insertHTML', false, html);

    if (lastActiveTargetRef.current === 'title') {
      handleTitleInput();
    } else {
      handleEditorInput();
    }

    pushHistorySnapshot();
  };

  // Editor Keyboard shortcuts for Undo/Redo
  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd) {
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        handleUndo();
        return;
      }
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        handleRedo();
        return;
      }
    }
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
        setIsFocusMode(false);
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
        setIsFocusMode(false);
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
        setIsFocusMode(false);
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

  // Close Note & flush pending save
  const handleCloseNote = useCallback(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    if (activeNoteIdRef.current && (activeNoteTitle !== lastSavedContentRef.current.title || activeNoteContent !== lastSavedContentRef.current.content)) {
      executeSave(activeNoteTitle, activeNoteContent);
    }
    setSelectedNoteId(null);
    setIsReadingMode(false);
  }, [activeNoteTitle, activeNoteContent, executeSave]);

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
    if (!selectedNote) return;
    const folderName = folders.find(f => f.id === selectedNote.folder_id)?.name;
    const noteTitle = selectedNote.title || 'Sin título';
    const noteContent = editorRef.current ? editorRef.current.innerHTML : (selectedNote.content || '');
    const dateFormatted = new Date(selectedNote.updated_at || selectedNote.created_at).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const tagsHtml = (selectedNote.tags || []).length > 0 
      ? `<div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
          ${(selectedNote.tags || []).map(t => `<span style="font-size: 11px; background: #f4f4f5; color: #3f3f46; border: 1px solid #e4e4e7; border-radius: 4px; padding: 2px 6px;">#${t}</span>`).join('')}
         </div>`
      : '';

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.id = 'print-note-iframe';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${noteTitle}</title>
        <style>
          @page {
            margin: 20mm;
            size: auto;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #18181b;
            background: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.65;
            font-size: 14px;
          }
          .header {
            border-bottom: 2px solid #e4e4e7;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .title {
            font-size: 26px;
            font-weight: 700;
            margin: 0 0 8px 0;
            color: #09090b;
          }
          .meta {
            font-size: 12px;
            color: #71717a;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }
          .content {
            font-size: 14px;
            color: #27272a;
          }
          .content h1 { font-size: 22px; font-weight: 700; margin-top: 20px; margin-bottom: 8px; }
          .content h2 { font-size: 18px; font-weight: 600; margin-top: 16px; margin-bottom: 6px; }
          .content h3 { font-size: 16px; font-weight: 600; margin-top: 14px; margin-bottom: 4px; }
          .content p { margin: 0 0 12px 0; }
          .content ul, .content ol { margin: 0 0 12px 0; padding-left: 24px; }
          .content blockquote {
            border-left: 3px solid #3b82f6;
            margin: 12px 0;
            padding: 6px 12px;
            background: #f8fafc;
            color: #475569;
            font-style: italic;
          }
          .content pre, .content code {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            background: #f4f4f5;
            padding: 2px 5px;
            border-radius: 4px;
            font-size: 13px;
          }
          .content pre {
            padding: 12px;
            overflow-x: auto;
            border: 1px solid #e4e4e7;
          }
          .content table {
            width: 100%;
            border-collapse: collapse;
            margin: 14px 0;
          }
          .content th, .content td {
            border: 1px solid #e4e4e7;
            padding: 8px 10px;
            text-align: left;
            font-size: 13px;
          }
          .content th {
            background: #f4f4f5;
            font-weight: 600;
          }
          .content hr {
            border: 0;
            border-top: 1px solid #e4e4e7;
            margin: 16px 0;
          }
          .content img {
            max-width: 100%;
            height: auto;
          }
          .callout {
            padding: 10px 14px;
            border-radius: 6px;
            margin: 12px 0;
            border-left: 4px solid;
          }
          .callout-info { background: #eff6ff; border-color: #3b82f6; color: #1e40af; }
          .callout-warning { background: #fffbeb; border-color: #f59e0b; color: #92400e; }
          .callout-success { background: #f0fdf4; border-color: #22c55e; color: #166534; }
          .callout-danger { background: #fef2f2; border-color: #ef4444; color: #991b1b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${noteTitle}</h1>
          <div class="meta">
            ${folderName ? `<span>📁 Carpeta: <strong>${folderName}</strong></span>` : ''}
            <span>🕒 Modificado: ${dateFormatted}</span>
          </div>
          ${tagsHtml}
        </div>
        <div class="content">
          ${noteContent}
        </div>
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    }, 250);
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
        <div className="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-zinc-950 relative overflow-hidden">
          {selectedNote ? (
            <div className="flex flex-col h-full min-h-0 relative">
              
              {/* Note Header / Meta Bar */}
              <div className="px-5 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex items-center justify-between gap-3 select-none flex-shrink-0 relative z-20">
                
                {/* Left side: Back on mobile, Pin, Favorite, Status */}
                <div className="flex items-center gap-2 min-w-0">
                  {isMobile && (
                    <button
                      onClick={() => setSelectedNoteId(null)}
                      className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mr-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={handleTogglePin}
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedNote.is_pinned
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title={selectedNote.is_pinned ? 'Desfijar nota' : 'Fijar nota al inicio'}
                  >
                    <Pin className="w-4 h-4" fill={selectedNote.is_pinned ? 'currentColor' : 'none'} />
                  </button>

                  <button
                    onClick={handleToggleFavorite}
                    className={`p-1.5 rounded-md transition-colors ${
                      selectedNote.is_favorite
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold'
                        : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title={selectedNote.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <Star className="w-4 h-4" fill={selectedNote.is_favorite ? 'currentColor' : 'none'} />
                  </button>

                  {/* Save Indicator */}
                  <div className="flex items-center gap-1 text-[11px] text-zinc-400 ml-1 relative group cursor-default">
                    {saveStatus === 'saving' && (
                      <span className="flex items-center gap-1 text-zinc-500">
                        <CloudLightning className="w-3.5 h-3.5 animate-pulse" />
                        <span className="hidden md:inline">Guardando...</span>
                      </span>
                    )}
                    {saveStatus === 'saved' && (
                      <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Guardado</span>
                      </span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="flex items-center gap-1 text-zinc-900 dark:text-zinc-100 font-semibold">
                        Error <span className="hidden md:inline">al guardar</span>
                      </span>
                    )}
                    
                    {/* Tooltip for small screens */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-[10px] font-medium rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-[100] md:hidden">
                      {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado' : 'Error al guardar'}
                    </div>
                  </div>
                </div>

                {/* Right side: Restore / Archive / Trash / Reading / Export / Print / Focus / Details / Close */}
                <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                  
                  {/* IF IN ARCHIVE OR TRASH: SHOW RESTORE BUTTON */}
                  {(selectedNote.is_archived || selectedNote.deleted_at) ? (
                    <button
                      onClick={() => handleRestoreNote(selectedNote)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white transition-all cursor-pointer flex items-center justify-center"
                      title="Restaurar nota a activas"
                      aria-label="Restaurar nota a activas"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  ) : (
                    /* IF ACTIVE: SHOW ARCHIVE AND TRASH BUTTONS */
                    <>
                      {/* Archivar */}
                      <button
                        onClick={() => setNoteToArchive(selectedNote)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-center"
                        title="Archivar nota"
                        aria-label="Archivar nota"
                      >
                        <Archive className="w-4 h-4" />
                      </button>

                      {/* Enviar a Papelera */}
                      <button
                        onClick={() => setNoteToTrash(selectedNote)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer flex items-center justify-center"
                        title="Mover a la papelera"
                        aria-label="Mover nota a la papelera"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Reading Mode Toggle */}
                  <button
                    onClick={() => {
                      setIsReadingMode(!isReadingMode);
                      if (!isReadingMode) {
                        setShowDetailsPanel(false);
                      }
                    }}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                      isReadingMode
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700'
                    }`}
                    title={isReadingMode ? 'Salir de Modo Lectura' : 'Modo Lectura (oculta herramientas y optimiza tipografía)'}
                    aria-label={isReadingMode ? 'Salir de Modo Lectura' : 'Modo Lectura'}
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-0.5" />

                  {/* Export Markdown */}
                  <button
                    onClick={handleExportMarkdown}
                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Exportar como Markdown"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {/* Print */}
                  <button
                    onClick={handlePrintNote}
                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Imprimir nota"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {/* Focus Mode Toggle */}
                  <button
                    onClick={() => setIsFocusMode(!isFocusMode)}
                    className={`p-1.5 rounded-md transition-colors ${
                      isFocusMode
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title={isFocusMode ? 'Salir de modo enfoque' : 'Modo enfoque'}
                  >
                    {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>

                  {/* Details Panel Toggle */}
                  <button
                    onClick={() => setShowDetailsPanel(!showDetailsPanel)}
                    className={`p-1.5 rounded-md transition-colors ${
                      showDetailsPanel
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                    title="Detalles y estadísticas"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1" />

                  {/* Close Note Button */}
                  <button
                    onClick={handleCloseNote}
                    className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="Cerrar nota abierta"
                  >
                    <X className="w-4 h-4" />
                  </button>

                </div>
              </div>

              {/* 3. ROBUST RICH TEXT TOOLBAR (Hidden in Reading Mode) */}
              {!isReadingMode && (
                <div className="relative z-30 flex-shrink-0">
                  <NotesToolbar
                    onApplyCommand={handleApplyCommand}
                    onInsertHtml={handleInsertHtml}
                    onApplyStyle={handleApplyStyle}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                  />
                </div>
              )}

              {/* Reading Mode banner / subtle helper */}
              {isReadingMode && (
                <div className="bg-amber-50/80 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-900/40 px-6 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-200">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span><strong>Modo Lectura Activo</strong> — Herramientas ocultas y espaciado tipográfico optimizado</span>
                  </div>
                  <button
                    onClick={() => setIsReadingMode(false)}
                    className="px-2.5 py-1 rounded bg-amber-200/80 dark:bg-amber-900/70 hover:bg-amber-300 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 font-medium transition-colors cursor-pointer text-[11px]"
                  >
                    Salir de lectura
                  </button>
                </div>
              )}

              {/* 4. Canvas Body Area with Optional Details Panel */}
              <div 
                className="flex-1 min-h-0 flex overflow-hidden relative z-10"
                onKeyDown={handleEditorKeyDown}
              >
                
                {/* Editor Surface */}
                <div className={`flex-1 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-200 ${
                  isReadingMode
                    ? 'p-8 md:p-14 max-w-3xl mx-auto w-full'
                    : 'p-6 md:p-10 max-w-4xl mx-auto w-full'
                }`}>
                  {/* Rich Note Title */}
                  <h1
                    ref={titleRef}
                    contentEditable={!isReadingMode}
                    suppressContentEditableWarning
                    data-placeholder="Título de la nota..."
                    onInput={handleTitleInput}
                    onFocus={() => {
                      lastActiveTargetRef.current = 'title';
                      saveActiveSelection();
                    }}
                    onBlur={saveActiveSelection}
                    onMouseUp={saveActiveSelection}
                    onKeyUp={saveActiveSelection}
                    onSelect={saveActiveSelection}
                    onKeyDown={(e) => {
                      handleEditorKeyDown(e);
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        editorRef.current?.focus();
                      }
                    }}
                    className={`font-bold text-zinc-900 dark:text-white placeholder-zinc-300 dark:placeholder-zinc-700 bg-transparent border-0 focus:outline-none focus:ring-0 tracking-tight min-h-[1.4em] empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-300 dark:empty:before:text-zinc-600 empty:before:pointer-events-none transition-all ${
                      isReadingMode
                        ? 'text-3xl md:text-4xl pb-4 mb-6 border-b border-zinc-200/80 dark:border-zinc-800/80 leading-tight font-serif'
                        : 'text-2xl md:text-3xl mb-4'
                    }`}
                  />

                  {/* ContentEditable Div */}
                  <div
                    ref={editorRef}
                    contentEditable={!isReadingMode}
                    suppressContentEditableWarning
                    onInput={handleEditorInput}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('.callout-delete-btn')) {
                        e.preventDefault();
                        const callout = target.closest('.note-callout');
                        if (callout) {
                          callout.remove();
                          handleEditorInput();
                        }
                      } else {
                        const link = target.closest('a');
                        if (link && link.hasAttribute('href')) {
                          window.open(link.getAttribute('href')!, '_blank');
                        }
                      }
                    }}
                    onFocus={() => {
                      lastActiveTargetRef.current = 'body';
                      saveActiveSelection();
                    }}
                    onBlur={saveActiveSelection}
                    onMouseUp={saveActiveSelection}
                    onKeyUp={saveActiveSelection}
                    onSelect={saveActiveSelection}
                    onKeyDown={handleEditorKeyDown}
                    data-placeholder="Escribe tus notas aquí..."
                    className={`flex-1 focus:outline-none note-editor-content min-h-[400px] transition-all ${
                      isReadingMode
                        ? 'text-lg md:text-xl leading-relaxed md:leading-loose text-zinc-800 dark:text-zinc-200 selection:bg-amber-200 dark:selection:bg-amber-900/60 font-serif'
                        : 'leading-relaxed text-zinc-800 dark:text-zinc-200'
                    }`}
                  />
                </div>

                {/* Optional Details Panel */}
                {!isReadingMode && showDetailsPanel && (
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
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center mb-4 border border-zinc-200 dark:border-zinc-700">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                Ninguna nota seleccionada
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mb-5 leading-relaxed">
                Selecciona una nota del panel lateral para editarla, o crea una nueva.
              </p>
              <button
                onClick={handleCreateNote}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white font-medium text-xs transition-all shadow-xs"
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
          onClose={() => setNoteToArchive(null)}
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
          onClose={() => setNoteToTrash(null)}
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
          onClose={() => setNoteToPermanentDelete(null)}
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
          onClose={() => setFolderToDelete(null)}
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
