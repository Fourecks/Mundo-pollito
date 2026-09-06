import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Minus,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  AlertCircle,
  Terminal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Type,
  Palette,
  Indent,
  Outdent,
  Subscript,
  Superscript,
  Eraser,
  Undo,
  Redo,
  ChevronDown,
  X,
  Plus,
} from 'lucide-react';
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  COLOR_SWATCHES,
  HIGHLIGHT_SWATCHES,
} from './NotesTypes';

interface NotesToolbarProps {
  onApplyCommand: (command: string, value?: string) => void;
  onApplyStyle: (styleProperty: string, value: string) => void;
  onInsertHtml: (html: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedFont?: string;
  onSelectFont?: (font: string) => void;
}

export const NotesToolbar: React.FC<NotesToolbarProps> = ({
  onApplyCommand,
  onApplyStyle,
  onInsertHtml,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  selectedFont: propSelectedFont,
  onSelectFont,
}) => {
  const [selectedFont, setSelectedFont] = useState<string>(
    propSelectedFont || FONT_FAMILY_OPTIONS[0].value
  );
  const [selectedFontSize, setSelectedFontSize] = useState<number>(16);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
  const [customTextColor, setCustomTextColor] = useState('#1e293b');
  const [customHighlightColor, setCustomHighlightColor] = useState('#fef08a');

  // Active formats state for toolbar buttons
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    subscript: false,
    superscript: false,
    unorderedList: false,
    orderedList: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    justifyFull: false,
    code: false,
    blockquote: false,
    formatBlock: '',
  });
  
  // Modals
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  const fontMenuRef = useRef<HTMLDivElement>(null);
  const sizeMenuRef = useRef<HTMLDivElement>(null);
  const colorMenuRef = useRef<HTMLDivElement>(null);
  const highlightMenuRef = useRef<HTMLDivElement>(null);
  const headingMenuRef = useRef<HTMLDivElement>(null);
  const alignMenuRef = useRef<HTMLDivElement>(null);
  const calloutMenuRef = useRef<HTMLDivElement>(null);

  // Synchronize active formatting states from active DOM selection
  const updateActiveFormats = useCallback(() => {
    if (typeof document === 'undefined') return;
    const sel = window.getSelection();
    let inCode = false;
    let inBlockquote = false;
    let blockTag = '';

    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.anchorNode;
      while (node && node !== document.body) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const tagName = el.tagName.toLowerCase();
          if (tagName === 'code' || tagName === 'pre') inCode = true;
          if (tagName === 'blockquote') inBlockquote = true;
          if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].includes(tagName) && !blockTag) {
            blockTag = `<${tagName}>`;
          }
        }
        node = node.parentNode;
      }
    }

    try {
      const isBold = document.queryCommandState('bold');
      const isItalic = document.queryCommandState('italic');
      const isUnderline = document.queryCommandState('underline');
      const isStrike = document.queryCommandState('strikeThrough');
      const isSub = document.queryCommandState('subscript');
      const isSuper = document.queryCommandState('superscript');
      const isUl = document.queryCommandState('insertUnorderedList');
      const isOl = document.queryCommandState('insertOrderedList');
      const isLeft = document.queryCommandState('justifyLeft');
      const isCenter = document.queryCommandState('justifyCenter');
      const isRight = document.queryCommandState('justifyRight');
      const isJustify = document.queryCommandState('justifyFull');
      const fbVal = (document.queryCommandValue('formatBlock') || '').toLowerCase();

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strikeThrough: isStrike,
        subscript: isSub,
        superscript: isSuper,
        unorderedList: isUl,
        orderedList: isOl,
        justifyLeft: isLeft,
        justifyCenter: isCenter,
        justifyRight: isRight,
        justifyFull: isJustify,
        code: inCode,
        blockquote: inBlockquote,
        formatBlock: blockTag || (fbVal ? `<${fbVal.replace(/[<>]/g, '')}>` : ''),
      });
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => {
      document.removeEventListener('selectionchange', updateActiveFormats);
    };
  }, [updateActiveFormats]);

  const runCommand = (command: string, value?: string) => {
    onApplyCommand(command, value);
    setTimeout(updateActiveFormats, 40);
  };

  const getButtonClass = (isActive: boolean) => {
    return `p-1.5 rounded-md transition-all cursor-pointer ${
      isActive
        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs ring-1 ring-zinc-800 dark:ring-zinc-200'
        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
    }`;
  };

  useEffect(() => {
    if (propSelectedFont) {
      setSelectedFont(propSelectedFont);
    }
  }, [propSelectedFont]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (fontMenuRef.current && !fontMenuRef.current.contains(target)) setShowFontMenu(false);
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(target)) setShowSizeMenu(false);
      if (colorMenuRef.current && !colorMenuRef.current.contains(target)) setShowColorMenu(false);
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(target)) setShowHighlightMenu(false);
      if (headingMenuRef.current && !headingMenuRef.current.contains(target)) setShowHeadingMenu(false);
      if (alignMenuRef.current && !alignMenuRef.current.contains(target)) setShowAlignMenu(false);
      if (calloutMenuRef.current && !calloutMenuRef.current.contains(target)) setShowCalloutMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to prevent mousedown from losing editor/title focus
  const preventFocusLoss = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Handle Font Family Change
  const handleSelectFont = (fontValue: string) => {
    setSelectedFont(fontValue);
    setShowFontMenu(false);
    if (onSelectFont) onSelectFont(fontValue);
    onApplyStyle('font-family', fontValue);
    setTimeout(updateActiveFormats, 40);
  };

  // Handle Numeric Font Size in Pixels
  const handleSelectFontSize = (sizePx: number) => {
    setSelectedFontSize(sizePx);
    setShowSizeMenu(false);
    onApplyStyle('font-size', `${sizePx}px`);
    setTimeout(updateActiveFormats, 40);
  };

  const handleStepFontSize = (delta: number) => {
    const newSize = Math.max(10, Math.min(64, selectedFontSize + delta));
    setSelectedFontSize(newSize);
    onApplyStyle('font-size', `${newSize}px`);
    setTimeout(updateActiveFormats, 40);
  };

  // Handle Color Application
  const handleApplyColor = (color: string, shouldClose: boolean = false) => {
    if (color && color !== 'inherit') {
      setCustomTextColor(color);
    }
    if (shouldClose) {
      setShowColorMenu(false);
    }
    onApplyStyle('color', color);
    setTimeout(updateActiveFormats, 40);
  };

  // Handle Highlight Application
  const handleApplyHighlight = (color: string, shouldClose: boolean = false) => {
    if (color && color !== 'transparent') {
      setCustomHighlightColor(color);
    }
    if (shouldClose) {
      setShowHighlightMenu(false);
    }
    onApplyStyle('background-color', color);
    setTimeout(updateActiveFormats, 40);
  };

  // Insert Checklist Item
  const handleInsertChecklist = () => {
    const checklistHtml = `<div class="note-task-item flex items-start gap-2 my-1.5"><input type="checkbox" class="note-checkbox mt-1 w-4 h-4 rounded accent-zinc-800 dark:accent-zinc-200 cursor-pointer" /><span class="task-text flex-1">Nueva tarea...</span></div><p><br></p>`;
    onInsertHtml(checklistHtml);
    setTimeout(updateActiveFormats, 40);
  };

  // Insert Table
  const handleCreateTable = () => {
    if (tableRows < 1 || tableCols < 1) return;
    let tableHtml = `<table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 my-4 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"><thead><tr class="bg-zinc-50 dark:bg-zinc-900">`;
    for (let c = 1; c <= tableCols; c++) {
      tableHtml += `<th class="px-3 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">Columna ${c}</th>`;
    }
    tableHtml += `</tr></thead><tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">`;
    for (let r = 1; r <= tableRows; r++) {
      tableHtml += `<tr>`;
      for (let c = 1; c <= tableCols; c++) {
        tableHtml += `<td class="px-3 py-2 text-xs text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">Dato ${r},${c}</td>`;
      }
      tableHtml += `</tr>`;
    }
    tableHtml += `</tbody></table><p><br></p>`;
    onInsertHtml(tableHtml);
    setShowTableModal(false);
    setTimeout(updateActiveFormats, 40);
  };

  // Insert Callouts
  const handleInsertCallout = (type: 'info' | 'warning' | 'success' | 'danger' | 'tip') => {
    setShowCalloutMenu(false);
    const configs = {
      info: { title: 'Información', class: 'note-callout-info' },
      warning: { title: 'Advertencia', class: 'note-callout-warning' },
      success: { title: 'Destacado', class: 'note-callout-success' },
      danger: { title: 'Importante', class: 'note-callout-danger' },
      tip: { title: 'Nota', class: 'note-callout-tip' },
    };
    const c = configs[type];
    const calloutHtml = `<div class="note-callout relative group ${c.class} p-3.5 my-3 rounded-xl flex items-start gap-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60"><div class="flex-1 text-xs leading-relaxed"><strong>${c.title}:</strong> Escribe aquí el detalle...</div><button contenteditable="false" class="callout-delete-btn opacity-0 group-hover:opacity-100 absolute top-1.5 right-1.5 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-all cursor-pointer" title="Eliminar cuadro">✕</button></div><p><br></p>`;
    onInsertHtml(calloutHtml);
    setTimeout(updateActiveFormats, 40);
  };

  // Insert Link
  const handleInsertLink = () => {
    if (!linkUrl.trim()) return;
    const finalUrl = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') || linkUrl.startsWith('mailto:') 
      ? linkUrl 
      : `https://${linkUrl}`;
    const displayText = linkText.trim() || linkUrl;
    const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" class="text-zinc-900 dark:text-zinc-100 underline underline-offset-2 font-medium">${displayText}</a>&nbsp;`;
    onInsertHtml(linkHtml);
    setLinkUrl('');
    setLinkText('');
    setShowLinkModal(false);
  };

  // Insert Image
  const handleInsertImage = () => {
    if (!imageUrl.trim()) return;
    const imgHtml = `<figure class="my-3 text-center"><img src="${imageUrl}" alt="${imageAlt || 'Imagen de la nota'}" class="max-w-full rounded-xl mx-auto my-2 border border-zinc-200 dark:border-zinc-800" /><figcaption class="text-[11px] text-zinc-400 italic">${imageAlt || ''}</figcaption></figure><p><br></p>`;
    onInsertHtml(imgHtml);
    setImageUrl('');
    setImageAlt('');
    setShowImageModal(false);
  };

  const currentFontObj = FONT_FAMILY_OPTIONS.find(f => f.value === selectedFont) || FONT_FAMILY_OPTIONS[0];

  return (
    <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center gap-1 bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 select-none text-xs relative z-40">
      
      {/* 1. Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => {
            if (onUndo) onUndo();
            else onApplyCommand('undo');
          }}
          disabled={!canUndo}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            !canUndo 
              ? 'opacity-30 cursor-not-allowed text-zinc-400 dark:text-zinc-600' 
              : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => {
            if (onRedo) onRedo();
            else onApplyCommand('redo');
          }}
          disabled={!canRedo}
          className={`p-1.5 rounded-md transition-colors cursor-pointer ${
            !canRedo 
              ? 'opacity-30 cursor-not-allowed text-zinc-400 dark:text-zinc-600' 
              : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
          title="Rehacer (Ctrl+Y)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 2. Font Family Selector */}
      <div className="relative flex-shrink-0" ref={fontMenuRef}>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => setShowFontMenu(!showFontMenu)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors min-w-[120px] justify-between cursor-pointer"
          title="Tipo de fuente (aplica al texto seleccionado o a la nota)"
        >
          <span className="truncate" style={{ fontFamily: currentFontObj.value }}>
            {currentFontObj.preview}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
        </button>

        {showFontMenu && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100] max-h-64 overflow-y-auto custom-scrollbar"
          >
            <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Tipografías Disponibles
            </div>
            {FONT_FAMILY_OPTIONS.map((f) => (
              <button
                key={f.name}
                onMouseDown={preventFocusLoss}
                onClick={() => handleSelectFont(f.value)}
                className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  selectedFont === f.value ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                <span style={{ fontFamily: f.value }} className="text-sm">
                  {f.name}
                </span>
                <span className="text-[10px] text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                  {f.category}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Numeric Font Size in Pixels */}
      <div className="flex items-center gap-0.5 flex-shrink-0" ref={sizeMenuRef}>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => handleStepFontSize(-2)}
          className="px-1.5 py-1 rounded-l-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 border-r-0 cursor-pointer"
          title="Reducir tamaño de letra (-2px)"
        >
          A-
        </button>

        <div className="relative">
          <button
            onMouseDown={preventFocusLoss}
            onClick={() => setShowSizeMenu(!showSizeMenu)}
            className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border-y border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 min-w-[54px] justify-center cursor-pointer"
            title="Tamaño de fuente numérico (px)"
          >
            <span>{selectedFontSize}px</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          </button>

          {showSizeMenu && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100] max-h-56 overflow-y-auto custom-scrollbar"
            >
              <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Tamaño en Píxeles
              </div>
              {FONT_SIZE_OPTIONS.map((s) => (
                <button
                  key={s.label}
                  onMouseDown={preventFocusLoss}
                  onClick={() => handleSelectFontSize(s.sizePx)}
                  className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    selectedFontSize === s.sizePx ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold' : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span>{s.label}</span>
                  <span className="text-[10px] font-mono text-zinc-400">{s.sizePx}px</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onMouseDown={preventFocusLoss}
          onClick={() => handleStepFontSize(2)}
          className="px-1.5 py-1 rounded-r-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 border-l-0 cursor-pointer"
          title="Aumentar tamaño de letra (+2px)"
        >
          A+
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 4. Headings & Block Formats */}
      <div className="relative flex-shrink-0" ref={headingMenuRef}>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border cursor-pointer ${
            ['<h1>', '<h2>', '<h3>', '<h4>'].includes(activeFormats.formatBlock)
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 font-semibold shadow-xs'
              : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800'
          }`}
          title="Formato de bloque / Encabezados"
        >
          <Type className="w-3.5 h-3.5" />
          <span>
            {activeFormats.formatBlock === '<h1>'
              ? 'H1'
              : activeFormats.formatBlock === '<h2>'
              ? 'H2'
              : activeFormats.formatBlock === '<h3>'
              ? 'H3'
              : activeFormats.formatBlock === '<h4>'
              ? 'H4'
              : 'Formato'}
          </span>
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>

        {showHeadingMenu && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100]"
          >
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { runCommand('formatBlock', '<p>'); setShowHeadingMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer ${
                activeFormats.formatBlock === '<p>' ? 'font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-700 dark:text-zinc-200'
              }`}
            >
              <span className="w-5 text-zinc-400 font-mono">P</span>
              <span>Párrafo normal</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { runCommand('formatBlock', activeFormats.formatBlock === '<h1>' ? '<p>' : '<h1>'); setShowHeadingMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-2 cursor-pointer ${
                activeFormats.formatBlock === '<h1>' ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-800 dark:text-zinc-100'
              }`}
            >
              <Heading1 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 1</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { runCommand('formatBlock', activeFormats.formatBlock === '<h2>' ? '<p>' : '<h2>'); setShowHeadingMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                activeFormats.formatBlock === '<h2>' ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-800 dark:text-zinc-100'
              }`}
            >
              <Heading2 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 2</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { runCommand('formatBlock', activeFormats.formatBlock === '<h3>' ? '<p>' : '<h3>'); setShowHeadingMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-2 cursor-pointer ${
                activeFormats.formatBlock === '<h3>' ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-800 dark:text-zinc-100'
              }`}
            >
              <Heading3 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 3</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { runCommand('formatBlock', activeFormats.formatBlock === '<h4>' ? '<p>' : '<h4>'); setShowHeadingMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium flex items-center gap-2 cursor-pointer ${
                activeFormats.formatBlock === '<h4>' ? 'text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-800 dark:text-zinc-100'
              }`}
            >
              <Heading4 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 4</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 5. Bold, Italic, Underline, Strike, Sub, Super, Code */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('bold')}
          className={getButtonClass(activeFormats.bold)}
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('italic')}
          className={getButtonClass(activeFormats.italic)}
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('underline')}
          className={getButtonClass(activeFormats.underline)}
          title="Subrayado (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('strikeThrough')}
          className={getButtonClass(activeFormats.strikeThrough)}
          title="Tachado"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('subscript')}
          className={getButtonClass(activeFormats.subscript)}
          title="Subíndice (X₂)"
        >
          <Subscript className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('superscript')}
          className={getButtonClass(activeFormats.superscript)}
          title="Superíndice (X²)"
        >
          <Superscript className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
              const selectedText = sel.toString();
              onInsertHtml(`<code class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">${selectedText || 'código'}</code>`);
            } else {
              onInsertHtml(`<code class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">código</code>&nbsp;`);
            }
            setTimeout(updateActiveFormats, 40);
          }}
          className={getButtonClass(activeFormats.code)}
          title="Código en línea"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 6. Text Color & Highlight */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Color de texto */}
        <div className="relative" ref={colorMenuRef}>
          <button
            onMouseDown={preventFocusLoss}
            onClick={() => setShowColorMenu(!showColorMenu)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Color de texto"
          >
            <Palette className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          </button>

          {showColorMenu && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 z-[100]"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Color de Texto
                </span>
                <button
                  onClick={() => setShowColorMenu(false)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Cerrar paleta"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Swatches */}
              <div className="grid grid-cols-6 gap-1.5 mb-2.5">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    onMouseDown={preventFocusLoss}
                    onClick={() => handleApplyColor(swatch.color, true)}
                    className="w-7 h-7 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center cursor-pointer shadow-xs"
                    style={{ backgroundColor: swatch.color === 'inherit' ? '#f4f4f5' : swatch.color }}
                    title={swatch.name}
                  >
                    {swatch.color === 'inherit' && <span className="text-[10px] font-bold text-zinc-700">A</span>}
                  </button>
                ))}
              </div>

              {/* Custom Color Picker & Hex Input */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  Personalizado
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 flex-shrink-0 cursor-pointer shadow-xs">
                    <input
                      type="color"
                      value={customTextColor}
                      onInput={(e) => handleApplyColor((e.target as HTMLInputElement).value, false)}
                      onChange={(e) => handleApplyColor(e.target.value, false)}
                      className="absolute inset-0 w-[150%] h-[150%] -top-2 -left-2 cursor-pointer border-0 bg-transparent p-0"
                      title="Seleccionar color personalizado"
                    />
                  </div>
                  <input
                    type="text"
                    value={customTextColor}
                    onChange={(e) => {
                      setCustomTextColor(e.target.value);
                      if (/^#([0-9A-F]{3}){1,2}$/i.test(e.target.value)) {
                        handleApplyColor(e.target.value, false);
                      }
                    }}
                    placeholder="#1e293b"
                    className="flex-1 px-2 py-1 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                  <button
                    onClick={() => handleApplyColor(customTextColor, true)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Resaltador */}
        <div className="relative" ref={highlightMenuRef}>
          <button
            onMouseDown={preventFocusLoss}
            onClick={() => setShowHighlightMenu(!showHighlightMenu)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Resaltador de texto"
          >
            <Highlighter className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          </button>

          {showHighlightMenu && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 z-[100]"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Color de Resaltado
                </span>
                <button
                  onClick={() => setShowHighlightMenu(false)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Cerrar paleta"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Swatches */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {HIGHLIGHT_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    onMouseDown={preventFocusLoss}
                    onClick={() => handleApplyHighlight(swatch.color, true)}
                    className="h-7 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center cursor-pointer shadow-xs px-1"
                    style={{ backgroundColor: swatch.color === 'transparent' ? '#ffffff' : swatch.color }}
                    title={swatch.name}
                  >
                    <span className="text-[10px] font-medium text-zinc-800">
                      {swatch.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Highlight Picker */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                <div className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">
                  Personalizado
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-zinc-300 dark:border-zinc-700 flex-shrink-0 cursor-pointer shadow-xs">
                    <input
                      type="color"
                      value={customHighlightColor}
                      onInput={(e) => handleApplyHighlight((e.target as HTMLInputElement).value, false)}
                      onChange={(e) => handleApplyHighlight(e.target.value, false)}
                      className="absolute inset-0 w-[150%] h-[150%] -top-2 -left-2 cursor-pointer border-0 bg-transparent p-0"
                      title="Seleccionar resaltador personalizado"
                    />
                  </div>
                  <input
                    type="text"
                    value={customHighlightColor}
                    onChange={(e) => {
                      setCustomHighlightColor(e.target.value);
                      if (/^#([0-9A-F]{3}){1,2}$/i.test(e.target.value)) {
                        handleApplyHighlight(e.target.value, false);
                      }
                    }}
                    placeholder="#fef08a"
                    className="flex-1 px-2 py-1 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                  <button
                    onClick={() => handleApplyHighlight(customHighlightColor, true)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 7. Alignment Selector */}
      <div className="relative flex-shrink-0" ref={alignMenuRef}>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => setShowAlignMenu(!showAlignMenu)}
          className={`flex items-center gap-1 p-1.5 rounded-md transition-colors cursor-pointer ${
            activeFormats.justifyCenter || activeFormats.justifyRight || activeFormats.justifyFull
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs ring-1 ring-zinc-800 dark:ring-zinc-200'
              : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
          }`}
          title="Alineación de texto"
        >
          {activeFormats.justifyCenter ? (
            <AlignCenter className="w-3.5 h-3.5" />
          ) : activeFormats.justifyRight ? (
            <AlignRight className="w-3.5 h-3.5" />
          ) : activeFormats.justifyFull ? (
            <AlignJustify className="w-3.5 h-3.5" />
          ) : (
            <AlignLeft className="w-3.5 h-3.5" />
          )}
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>

        {showAlignMenu && (
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100]"
          >
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { const targetAlign = activeFormats.justifyLeft ? 'left' : 'left'; onApplyStyle('text-align', targetAlign); runCommand('justifyLeft'); setShowAlignMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer ${
                activeFormats.justifyLeft ? 'font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Izquierda</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { const targetAlign = activeFormats.justifyCenter ? 'left' : 'center'; onApplyStyle('text-align', targetAlign); runCommand(targetAlign === 'left' ? 'justifyLeft' : 'justifyCenter'); setShowAlignMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer ${
                activeFormats.justifyCenter ? 'font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <AlignCenter className="w-3.5 h-3.5" />
              <span>Centrado</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { const targetAlign = activeFormats.justifyRight ? 'left' : 'right'; onApplyStyle('text-align', targetAlign); runCommand(targetAlign === 'left' ? 'justifyLeft' : 'justifyRight'); setShowAlignMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer ${
                activeFormats.justifyRight ? 'font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <AlignRight className="w-3.5 h-3.5" />
              <span>Derecha</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { const targetAlign = activeFormats.justifyFull ? 'left' : 'justify'; onApplyStyle('text-align', targetAlign); runCommand(targetAlign === 'left' ? 'justifyLeft' : 'justifyFull'); setShowAlignMenu(false); }}
              className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer ${
                activeFormats.justifyFull ? 'font-bold text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800' : 'text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Justificado</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 8. Lists, Tasks, Indent */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('insertUnorderedList')}
          className={getButtonClass(activeFormats.unorderedList)}
          title="Lista con viñetas"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('insertOrderedList')}
          className={getButtonClass(activeFormats.orderedList)}
          title="Lista numerada"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={handleInsertChecklist}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Lista de tareas / Checklist interactivo"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('indent')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Aumentar sangría"
        >
          <Indent className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('outdent')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Disminuir sangría"
        >
          <Outdent className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 9. Rich Inserts: Quote, Code Block, Table, Callouts, Link, Image, HR */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('formatBlock', '<blockquote>')}
          className={getButtonClass(activeFormats.blockquote)}
          title="Cita destacada"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          onMouseDown={preventFocusLoss}
          onClick={() => runCommand('formatBlock', '<pre>')}
          className={getButtonClass(activeFormats.formatBlock === '<pre>')}
          title="Bloque de código"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        <button
          onMouseDown={preventFocusLoss}
          onClick={() => setShowTableModal(true)}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Insertar Tabla"
        >
          <TableIcon className="w-3.5 h-3.5" />
        </button>

        {/* Callouts Dropdown */}
        <div className="relative" ref={calloutMenuRef}>
          <button
            onMouseDown={preventFocusLoss}
            onClick={() => setShowCalloutMenu(!showCalloutMenu)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Cuadro de llamada / Mensaje destacado"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          </button>

          {showCalloutMenu && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100]"
            >
              <button
                onMouseDown={preventFocusLoss}
                onClick={() => handleInsertCallout('info')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                Información
              </button>
              <button
                onMouseDown={preventFocusLoss}
                onClick={() => handleInsertCallout('warning')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                Advertencia
              </button>
              <button
                onMouseDown={preventFocusLoss}
                onClick={() => handleInsertCallout('success')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                Destacado
              </button>
              <button
                onMouseDown={preventFocusLoss}
                onClick={() => handleInsertCallout('danger')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                Importante
              </button>
              <button
                onMouseDown={preventFocusLoss}
                onClick={() => handleInsertCallout('tip')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 cursor-pointer"
              >
                Nota
              </button>
            </div>
          )}
        </div>

        <button
          onMouseDown={preventFocusLoss}
          onClick={() => setShowLinkModal(true)}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Insertar Enlace web"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onMouseDown={preventFocusLoss}
          onClick={() => setShowImageModal(true)}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Insertar Imagen por URL"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('insertHorizontalRule')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Línea divisoria horizontal"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 10. Clear Formatting */}
      <button
        onMouseDown={preventFocusLoss}
        onClick={() => {
          onApplyCommand('removeFormat');
          onApplyStyle('font-family', "'Fredoka', sans-serif");
          onApplyStyle('font-size', '16px');
          onApplyStyle('color', 'inherit');
          onApplyStyle('background-color', 'transparent');
        }}
        className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex-shrink-0 cursor-pointer"
        title="Limpiar formato"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>

      {/* Modals rendered to body via portal */}
      {typeof document !== 'undefined' && showTableModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 w-full max-w-xs text-left">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                Insertar Tabla
              </h4>
              <button
                onClick={() => setShowTableModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Filas:</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Columnas:</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTableModal(false)}
                className="flex-1 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateTable}
                className="flex-1 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg font-semibold transition-colors cursor-pointer"
              >
                Insertar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Link Modal */}
      {typeof document !== 'undefined' && showLinkModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 w-full max-w-sm text-left">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                Insertar Enlace
              </h4>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Texto a mostrar (opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: Abrir documento..."
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">URL / Dirección web:</label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleInsertLink}
                disabled={!linkUrl.trim()}
                className="flex-1 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Insertar Enlace
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image Modal */}
      {typeof document !== 'undefined' && showImageModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-5 w-full max-w-sm text-left">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                Insertar Imagen por URL
              </h4>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">URL de la imagen:</label>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/foto.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Pie de foto / Descripción (opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: Diagrama de arquitectura"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowImageModal(false)}
                className="flex-1 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg font-medium transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleInsertImage}
                disabled={!imageUrl.trim()}
                className="flex-1 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              >
                Insertar Imagen
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
