import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import {
  FONT_FAMILY_OPTIONS,
  FONT_SIZE_OPTIONS,
  COLOR_SWATCHES,
  HIGHLIGHT_SWATCHES,
} from './NotesTypes';

interface NotesToolbarProps {
  onApplyCommand: (command: string, value?: string) => void;
  onInsertHtml: (html: string) => void;
}

export const NotesToolbar: React.FC<NotesToolbarProps> = ({
  onApplyCommand,
  onInsertHtml,
}) => {
  const [selectedFont, setSelectedFont] = useState<string>(FONT_FAMILY_OPTIONS[0].value);
  const [selectedFontSize, setSelectedFontSize] = useState<number>(16);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showAlignMenu, setShowAlignMenu] = useState(false);
  const [showCalloutMenu, setShowCalloutMenu] = useState(false);
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

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) setShowFontMenu(false);
      if (sizeMenuRef.current && !sizeMenuRef.current.contains(e.target as Node)) setShowSizeMenu(false);
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) setShowColorMenu(false);
      if (highlightMenuRef.current && !highlightMenuRef.current.contains(e.target as Node)) setShowHighlightMenu(false);
      if (headingMenuRef.current && !headingMenuRef.current.contains(e.target as Node)) setShowHeadingMenu(false);
      if (alignMenuRef.current && !alignMenuRef.current.contains(e.target as Node)) setShowAlignMenu(false);
      if (calloutMenuRef.current && !calloutMenuRef.current.contains(e.target as Node)) setShowCalloutMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Font Family Change
  const handleSelectFont = (fontValue: string) => {
    setSelectedFont(fontValue);
    setShowFontMenu(false);
    // Apply fontName or wrap selection in styled span
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      document.execCommand('fontName', false, fontValue);
    } else {
      // Create a styled span marker
      onApplyCommand('fontName', fontValue);
    }
  };

  // Handle numeric font size in px
  const handleSelectFontSize = (sizePx: number) => {
    setSelectedFontSize(sizePx);
    setShowSizeMenu(false);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = `${sizePx}px`;
      span.style.lineHeight = '1.4';
      span.appendChild(range.extractContents());
      range.insertNode(span);
      // Move selection after span
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
      onApplyCommand('fontSize', '3'); // trigger input event
    } else {
      onInsertHtml(`<span style="font-size: ${sizePx}px;">&#8203;</span>`);
    }
  };

  const handleStepFontSize = (delta: number) => {
    const newSize = Math.max(10, Math.min(60, selectedFontSize + delta));
    handleSelectFontSize(newSize);
  };

  // Handle Color Application
  const handleApplyColor = (color: string) => {
    setShowColorMenu(false);
    if (color === 'inherit') {
      onApplyCommand('removeFormat');
    } else {
      onApplyCommand('foreColor', color);
    }
  };

  // Handle Highlight Application
  const handleApplyHighlight = (color: string) => {
    setShowHighlightMenu(false);
    if (color === 'transparent') {
      onApplyCommand('hiliteColor', 'transparent');
      onApplyCommand('backColor', 'transparent');
    } else {
      onApplyCommand('hiliteColor', color);
      onApplyCommand('backColor', color);
    }
  };

  // Insert Checklist Item
  const handleInsertChecklist = () => {
    const checklistHtml = `<div class="note-task-item flex items-start gap-2 my-1.5"><input type="checkbox" class="note-checkbox mt-1 w-4 h-4 rounded accent-zinc-800 dark:accent-zinc-200 cursor-pointer" /><span class="task-text flex-1">Nueva tarea...</span></div><p><br></p>`;
    onInsertHtml(checklistHtml);
  };

  // Insert Table
  const handleCreateTable = () => {
    if (tableRows < 1 || tableCols < 1) return;
    let tableHtml = `<table class="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 my-4 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"><thead><tr class="bg-zinc-50 dark:bg-zinc-900">`;
    for (let c = 1; c <= tableCols; c++) {
      tableHtml += `<th class="px-3 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800">Encabezado ${c}</th>`;
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
    const calloutHtml = `<div class="note-callout ${c.class} p-3.5 my-3 rounded-xl flex items-start gap-2.5 border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60"><div class="flex-1 text-xs leading-relaxed"><strong>${c.title}:</strong> Escribe aquí el detalle...</div></div><p><br></p>`;
    onInsertHtml(calloutHtml);
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
    <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center gap-1 overflow-x-auto custom-scrollbar bg-zinc-50/80 dark:bg-zinc-900/80 text-zinc-700 dark:text-zinc-200 select-none text-xs">
      
      {/* 1. Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => onApplyCommand('undo')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Deshacer (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('redo')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Rehacer (Ctrl+Y)"
        >
          <Redo className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 2. Font Family Selector */}
      <div className="relative flex-shrink-0" ref={fontMenuRef}>
        <button
          onClick={() => setShowFontMenu(!showFontMenu)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors min-w-[110px] justify-between"
          title="Tipo de fuente"
        >
          <span className="truncate" style={{ fontFamily: currentFontObj.value }}>
            {currentFontObj.preview}
          </span>
          <ChevronDown className="w-3 h-3 opacity-50 flex-shrink-0" />
        </button>

        {showFontMenu && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-[100] max-h-64 overflow-y-auto custom-scrollbar">
            <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
              Tipografías
            </div>
            {FONT_FAMILY_OPTIONS.map((f) => (
              <button
                key={f.name}
                onClick={() => handleSelectFont(f.value)}
                className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs transition-colors ${
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
          onClick={() => handleStepFontSize(-2)}
          className="px-1.5 py-1 rounded-l-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 border-r-0"
          title="Reducir tamaño de letra"
        >
          A-
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSizeMenu(!showSizeMenu)}
            className="flex items-center gap-1 px-2 py-1 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 border-y border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 min-w-[54px] justify-center"
            title="Tamaño de fuente numérico"
          >
            <span>{selectedFontSize}px</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          </button>

          {showSizeMenu && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-[100] max-h-56 overflow-y-auto custom-scrollbar">
              <div className="px-3 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                Tamaño (px)
              </div>
              {FONT_SIZE_OPTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => handleSelectFontSize(s.sizePx)}
                  className={`w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between text-xs transition-colors ${
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
          onClick={() => handleStepFontSize(2)}
          className="px-1.5 py-1 rounded-r-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 border-l-0"
          title="Aumentar tamaño de letra"
        >
          A+
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 4. Headings Menu */}
      <div className="relative flex-shrink-0" ref={headingMenuRef}>
        <button
          onClick={() => setShowHeadingMenu(!showHeadingMenu)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors border border-zinc-200 dark:border-zinc-800"
          title="Formato de bloque / Encabezados"
        >
          <Type className="w-3.5 h-3.5 text-zinc-500" />
          <span>Formato</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>

        {showHeadingMenu && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-[100]">
            <button
              onClick={() => { onApplyCommand('formatBlock', '<p>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-200 flex items-center gap-2"
            >
              <span className="w-5 text-zinc-400 font-mono">P</span>
              <span>Párrafo normal</span>
            </button>
            <button
              onClick={() => { onApplyCommand('formatBlock', '<h1>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 font-bold flex items-center gap-2"
            >
              <Heading1 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 1</span>
            </button>
            <button
              onClick={() => { onApplyCommand('formatBlock', '<h2>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 font-semibold flex items-center gap-2"
            >
              <Heading2 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 2</span>
            </button>
            <button
              onClick={() => { onApplyCommand('formatBlock', '<h3>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 font-medium flex items-center gap-2"
            >
              <Heading3 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 3</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 5. Bold, Italic, Underline, Strike, Inline Code */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => onApplyCommand('bold')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 font-bold transition-colors"
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('italic')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 italic transition-colors"
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('underline')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 underline transition-colors"
          title="Subrayado (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('strikeThrough')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Tachado"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('subscript')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Subíndice (X₂)"
        >
          <Subscript className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('superscript')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Superíndice (X²)"
        >
          <Superscript className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
              const range = sel.getRangeAt(0);
              const code = document.createElement('code');
              code.className = "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs";
              code.appendChild(range.extractContents());
              range.insertNode(code);
            } else {
              onInsertHtml(`<code class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded font-mono text-xs">código</code>&nbsp;`);
            }
          }}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 font-mono text-xs transition-colors"
          title="Código en línea"
        >
          <Code className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 6. Text Color & Highlight Pickers */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Text Color */}
        <div className="relative" ref={colorMenuRef}>
          <button
            onClick={() => setShowColorMenu(!showColorMenu)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
            title="Color de texto"
          >
            <Palette className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          </button>

          {showColorMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-2.5 z-[100]">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Color de Texto
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    onClick={() => handleApplyColor(swatch.color)}
                    className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700 hover:scale-105 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: swatch.color === 'inherit' ? '#f4f4f5' : swatch.color }}
                    title={swatch.name}
                  >
                    {swatch.color === 'inherit' && <span className="text-[9px] font-semibold text-zinc-600">A</span>}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Personalizado:</span>
                <input
                  type="color"
                  onChange={(e) => handleApplyColor(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Highlighter Color */}
        <div className="relative" ref={highlightMenuRef}>
          <button
            onClick={() => setShowHighlightMenu(!showHighlightMenu)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
            title="Resaltador de texto"
          >
            <Highlighter className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          </button>

          {showHighlightMenu && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-2.5 z-[100]">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Color de Resaltado
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {HIGHLIGHT_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    onClick={() => handleApplyHighlight(swatch.color)}
                    className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700 hover:scale-105 transition-transform flex items-center justify-center"
                    style={{ backgroundColor: swatch.color === 'transparent' ? '#ffffff' : swatch.color }}
                    title={swatch.name}
                  >
                    {swatch.color === 'transparent' && <span className="text-[9px] font-semibold text-zinc-400">∅</span>}
                  </button>
                ))}
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">Personalizado:</span>
                <input
                  type="color"
                  onChange={(e) => handleApplyHighlight(e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 7. Alignment Selector */}
      <div className="relative flex-shrink-0" ref={alignMenuRef}>
        <button
          onClick={() => setShowAlignMenu(!showAlignMenu)}
          className="flex items-center gap-1 p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Alineación de texto"
        >
          <AlignLeft className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>

        {showAlignMenu && (
          <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-[100]">
            <button
              onClick={() => { onApplyCommand('justifyLeft'); setShowAlignMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Izquierda</span>
            </button>
            <button
              onClick={() => { onApplyCommand('justifyCenter'); setShowAlignMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2"
            >
              <AlignCenter className="w-3.5 h-3.5" />
              <span>Centrado</span>
            </button>
            <button
              onClick={() => { onApplyCommand('justifyRight'); setShowAlignMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2"
            >
              <AlignRight className="w-3.5 h-3.5" />
              <span>Derecha</span>
            </button>
            <button
              onClick={() => { onApplyCommand('justifyFull'); setShowAlignMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2"
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
          onClick={() => onApplyCommand('insertUnorderedList')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Lista con viñetas"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('insertOrderedList')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Lista numerada"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleInsertChecklist}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Lista de tareas / Checklist interactivo"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('indent')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Aumentar sangría"
        >
          <Indent className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onApplyCommand('outdent')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Disminuir sangría"
        >
          <Outdent className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 9. Rich Inserts: Quote, Code Block, Table, Callouts, Link, Image, HR */}
      <div className="flex items-center gap-0.5 flex-shrink-0">
        <button
          onClick={() => onApplyCommand('formatBlock', '<blockquote>')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Cita destacada"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onApplyCommand('formatBlock', '<pre>')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Bloque de código"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowTableModal(true)}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
          title="Insertar Tabla"
        >
          <TableIcon className="w-3.5 h-3.5" />
        </button>

        {/* Callouts Dropdown */}
        <div className="relative" ref={calloutMenuRef}>
          <button
            onClick={() => setShowCalloutMenu(!showCalloutMenu)}
            className="flex items-center gap-1 p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
            title="Cuadro de llamada"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <ChevronDown className="w-2.5 h-2.5 opacity-50" />
          </button>

          {showCalloutMenu && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg py-1 z-[100]">
              <button
                onClick={() => handleInsertCallout('info')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
              >
                Información
              </button>
              <button
                onClick={() => handleInsertCallout('warning')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
              >
                Advertencia
              </button>
              <button
                onClick={() => handleInsertCallout('success')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
              >
                Destacado
              </button>
              <button
                onClick={() => handleInsertCallout('danger')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
              >
                Importante
              </button>
              <button
                onClick={() => handleInsertCallout('tip')}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-200"
              >
                Nota
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowLinkModal(true)}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Insertar Enlace web"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowImageModal(true)}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Insertar Imagen por URL"
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onApplyCommand('insertHorizontalRule')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
          title="Línea divisoria horizontal"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="w-[1px] h-4 bg-zinc-200 dark:bg-zinc-800 mx-1 flex-shrink-0" />

      {/* 10. Clear Formatting */}
      <button
        onClick={() => onApplyCommand('removeFormat')}
        className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex-shrink-0"
        title="Limpiar formato"
      >
        <Eraser className="w-3.5 h-3.5" />
      </button>

      {/* Table Insertion Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-5 w-full max-w-xs text-left">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                Insertar Tabla
              </h4>
              <button
                onClick={() => setShowTableModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Filas:
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Columnas:
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateTable}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-lg shadow-xs"
              >
                Insertar Tabla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-5 w-full max-w-sm text-left">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                Insertar Enlace
              </h4>
              <button
                onClick={() => setShowLinkModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Texto del enlace (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ej: Ver documentación"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  URL del enlace:
                </label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleInsertLink}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-lg shadow-xs"
              >
                Insertar Enlace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-5 w-full max-w-sm text-left">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                Insertar Imagen
              </h4>
              <button
                onClick={() => setShowImageModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  URL de la imagen:
                </label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400 block mb-1">
                  Pie o descripción (opcional):
                </label>
                <input
                  type="text"
                  placeholder="Descripción de la imagen"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-lg shadow-xs"
              >
                Insertar Imagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
