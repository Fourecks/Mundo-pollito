import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Palette,
  Undo,
  Redo,
  MessageSquare,
  Download,
  Printer,
  Star,
  Pin,
  Check,
  Loader2,
  Minus,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Note } from '../types';

interface ProjectNoteEditorModalProps {
  isOpen: boolean;
  note: Note | null;
  projectName?: string;
  onClose: () => void;
  onSave: (updatedNote: Note) => void;
  onShareToChannel: (note: Note) => void;
  onDelete?: (noteId: number) => void;
}

const TEXT_COLORS = [
  { label: 'Predeterminado', value: 'inherit' },
  { label: 'Azul', value: '#2563eb' },
  { label: 'Verde', value: '#16a34a' },
  { label: 'Rojo', value: '#dc2626' },
  { label: 'Púrpura', value: '#9333ea' },
  { label: 'Ámbar', value: '#d97706' },
];

const HIGHLIGHT_COLORS = [
  { label: 'Sin resaltar', value: 'transparent' },
  { label: 'Amarillo suave', value: '#fef08a' },
  { label: 'Verde suave', value: '#bbf7d0' },
  { label: 'Azul suave', value: '#bfdbfe' },
  { label: 'Rosa suave', value: '#fbcfe8' },
  { label: 'Naranja suave', value: '#fed7aa' },
];

export const ProjectNoteEditorModal: React.FC<ProjectNoteEditorModalProps> = ({
  isOpen,
  note,
  projectName,
  onClose,
  onSave,
  onShareToChannel,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const noteIdRef = useRef<number | null>(null);

  // Initialize state when modal opens or note changes
  useEffect(() => {
    if (note && isOpen) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setIsFavorite(!!note.is_favorite);
      setIsPinned(!!note.is_pinned);
      setSaveStatus('saved');
      noteIdRef.current = note.id;

      if (editorRef.current) {
        editorRef.current.innerHTML = note.content || '';
      }
    }
  }, [note, isOpen]);

  // Clean plain text helper for word count
  const getPlainText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  const plainText = getPlainText(content);
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Perform save
  const triggerSave = useCallback(
    (newTitle: string, newContent: string, newFav?: boolean, newPin?: boolean) => {
      if (!note) return;
      setSaveStatus('saving');
      const updated: Note = {
        ...note,
        title: newTitle.trim() || 'Nota sin título',
        content: newContent,
        is_favorite: newFav !== undefined ? newFav : isFavorite,
        is_pinned: newPin !== undefined ? newPin : isPinned,
        updated_at: new Date().toISOString(),
      };
      onSave(updated);
      setTimeout(() => {
        setSaveStatus('saved');
      }, 400);
    },
    [note, isFavorite, isPinned, onSave]
  );

  // Auto-save debounce
  const queueAutoSave = useCallback(
    (newTitle: string, newContent: string) => {
      setSaveStatus('unsaved');
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      autoSaveTimerRef.current = setTimeout(() => {
        triggerSave(newTitle, newContent);
      }, 600);
    },
    [triggerSave]
  );

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    queueAutoSave(newTitle, content);
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      const newHtml = editorRef.current.innerHTML;
      setContent(newHtml);
      queueAutoSave(title, newHtml);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = () => {
    const nextVal = !isFavorite;
    setIsFavorite(nextVal);
    triggerSave(title, content, nextVal, isPinned);
  };

  // Toggle pin
  const handleTogglePin = () => {
    const nextVal = !isPinned;
    setIsPinned(nextVal);
    triggerSave(title, content, isFavorite, nextVal);
  };

  // Execute formatting command
  const execCmd = (command: string, value: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  // Insert custom HTML element
  const insertHtml = (html: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand('insertHTML', false, html);
    handleEditorInput();
  };

  // Checklist insertion helper
  const insertChecklist = () => {
    const checkId = 'chk-' + Date.now();
    const html = `<div class="flex items-center gap-2 my-1" contenteditable="false"><input type="checkbox" id="${checkId}" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" /><label for="${checkId}" contenteditable="true" class="text-zinc-800 dark:text-zinc-200 outline-none">Tarea pendiente...</label></div><p></p>`;
    insertHtml(html);
  };

  // Export note
  const handleExportMarkdown = () => {
    const textToExport = `# ${title || 'Nota'}\n\n${plainText}`;
    const blob = new Blob([textToExport], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'nota').replace(/[^\w\s-]/gi, '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Print note
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title || 'Nota'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #111; line-height: 1.6; }
          h1 { font-size: 26px; border-bottom: 2px solid #eee; padding-bottom: 8px; margin-bottom: 16px; }
          .meta { font-size: 12px; color: #666; margin-bottom: 24px; }
          blockquote { border-left: 3px solid #3b82f6; margin: 12px 0; padding: 6px 12px; background: #f8fafc; color: #475569; }
          pre, code { font-family: monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>${title || 'Nota sin título'}</h1>
        <div class="meta">Proyecto: ${projectName || 'General'} | Fecha: ${new Date().toLocaleDateString()}</div>
        <div>${content || ''}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // Handle manual close with flush
  const handleClose = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    triggerSave(title, content);
    onClose();
  };

  if (!isOpen || !note) return null;

  return (
    <div
      className="fixed inset-0 z-[95000] flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-[#121212] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col h-[90vh] max-h-[880px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. TOP HEADER BAR */}
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-white dark:bg-[#121212] shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Nota del Proyecto
                </span>
                {projectName && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium truncate max-w-[140px]">
                    {projectName}
                  </span>
                )}
                <div className="flex items-center gap-1 text-[11px] text-zinc-400 ml-1">
                  {saveStatus === 'saving' && (
                    <span className="flex items-center gap-1 text-amber-500 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Guardando...
                    </span>
                  )}
                  {saveStatus === 'saved' && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check className="w-3 h-3" /> Guardado
                    </span>
                  )}
                  {saveStatus === 'unsaved' && (
                    <span className="text-zinc-400 text-[10px]">Cambios pendientes</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions & Close */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Star Favorite */}
            <button
              type="button"
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isFavorite
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={isFavorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
            >
              <Star className="w-4 h-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </button>

            {/* Pin note */}
            <button
              type="button"
              onClick={handleTogglePin}
              className={`p-2 rounded-lg transition-colors cursor-pointer ${
                isPinned
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title={isPinned ? 'Desfijar nota' : 'Fijar nota'}
            >
              <Pin className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} />
            </button>

            {/* Share to channel button (Direct feature requested) */}
            <button
              type="button"
              onClick={() => {
                triggerSave(title, content);
                onShareToChannel({
                  ...note,
                  title: title || 'Nota sin título',
                  content,
                });
              }}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Compartir esta nota en un canal (público o privado con contraseña)"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compartir en Canal</span>
            </button>

            {/* Export Markdown */}
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Exportar como Markdown (.md)"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Imprimir nota"
            >
              <Printer className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
              title="Guardar y cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. TITLE INPUT */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Título de la nota..."
            className="w-full text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white bg-transparent border-0 border-b border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-0 px-0 py-1 placeholder-zinc-300 dark:placeholder-zinc-600 transition-colors"
          />
        </div>

        {/* 3. RICH TEXT TOOLBAR (Full tools for rich text creation) */}
        <div className="px-5 py-2 border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-wrap items-center gap-1 select-none shrink-0 relative z-20">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => execCmd('undo')}
              className="p-1.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Deshacer (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('redo')}
              className="p-1.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Rehacer (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => execCmd('formatBlock', '<h1>')}
              className="p-1.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer font-bold text-xs"
              title="Encabezado 1 (Título principal)"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('formatBlock', '<h2>')}
              className="p-1.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer font-bold text-xs"
              title="Encabezado 2 (Subtítulo)"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('formatBlock', '<h3>')}
              className="p-1.5 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer font-bold text-xs"
              title="Encabezado 3 (Sección)"
            >
              <Heading3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('formatBlock', '<p>')}
              className="px-2 py-1 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer font-medium text-xs"
              title="Párrafo normal"
            >
              P
            </button>
          </div>

          {/* Basic Text Formatting */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => execCmd('bold')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Negrita (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('italic')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Cursiva (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('underline')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Subrayado (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('strikeThrough')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Tachado"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
          </div>

          {/* Lists & Checklist */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => execCmd('insertUnorderedList')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Lista con viñetas"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertOrderedList')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Lista numerada"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={insertChecklist}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Lista de tareas (Casilla de verificación)"
            >
              <CheckSquare className="w-4 h-4" />
            </button>
          </div>

          {/* Blockquotes & Code */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => execCmd('formatBlock', '<blockquote>')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Cita destacada"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('formatBlock', '<pre>')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Bloque de código"
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertHorizontalRule')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Línea divisoria horizontal"
            >
              <Minus className="w-4 h-4" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-0.5 px-1.5 border-r border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => execCmd('justifyLeft')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Alinear a la izquierda"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyCenter')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Centrar"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyRight')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Alinear a la derecha"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('justifyFull')}
              className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Justificar"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Color & Highlight Menus */}
          <div className="flex items-center gap-1 pl-1 relative">
            {/* Text Color */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false);
                }}
                className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                title="Color del texto"
              >
                <Palette className="w-4 h-4" />
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 flex flex-col gap-1 w-36">
                  <span className="text-[10px] font-semibold text-zinc-400 px-1 mb-1">Color de Texto</span>
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        execCmd('foreColor', c.value);
                        setShowColorPicker(false);
                      }}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-left"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-zinc-300 dark:border-zinc-600"
                        style={{ backgroundColor: c.value === 'inherit' ? '#000' : c.value }}
                      />
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Highlight */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false);
                }}
                className="p-1.5 rounded text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-1"
                title="Resaltador de texto"
              >
                <Highlighter className="w-4 h-4" />
              </button>
              {showHighlightPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl z-50 flex flex-col gap-1 w-40">
                  <span className="text-[10px] font-semibold text-zinc-400 px-1 mb-1">Resaltar</span>
                  {HIGHLIGHT_COLORS.map((h) => (
                    <button
                      key={h.value}
                      type="button"
                      onClick={() => {
                        execCmd('hiliteColor', h.value);
                        setShowHighlightPicker(false);
                      }}
                      className="flex items-center gap-2 px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-left"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-zinc-300 dark:border-zinc-600"
                        style={{ backgroundColor: h.value === 'transparent' ? '#fff' : h.value }}
                      />
                      <span>{h.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. EDITOR SURFACE AREA */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white dark:bg-[#121212]">
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            data-placeholder="Escribe el contenido de tu nota aquí... Puedes usar negritas, listas, subtítulos y más."
            className="w-full min-h-[350px] outline-none text-zinc-800 dark:text-zinc-200 leading-relaxed text-sm sm:text-base selection:bg-blue-100 dark:selection:bg-blue-900/60 empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-300 dark:empty:before:text-zinc-600 empty:before:pointer-events-none prose prose-zinc dark:prose-invert max-w-none"
            style={{ minHeight: '320px' }}
          />
        </div>

        {/* 5. FOOTER INFO & CONFIRMATION BAR */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400 shrink-0">
          <div className="flex items-center gap-3">
            <span>{wordCount} palabras</span>
            <span>•</span>
            <span>{charCount} caracteres</span>
            <span>•</span>
            <span>~{readTimeMin} min de lectura</span>
          </div>

          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (note && window.confirm('¿Deseas eliminar esta nota?')) {
                    onDelete(note.id);
                    onClose();
                  }
                }}
                className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
              >
                Eliminar Nota
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 dark:bg-white text-white dark:text-black rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-xs cursor-pointer"
            >
              Guardar y Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProjectNoteEditorModal;
