import React, { useState, useRef, useEffect } from 'react';
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
  selectedFont?: string;
  onSelectFont?: (font: string) => void;
}

export const NotesToolbar: React.FC<NotesToolbarProps> = ({
  onApplyCommand,
  onApplyStyle,
  onInsertHtml,
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

  useEffect(() => {
    if (propSelectedFont) {
      setSelectedFont(propSelectedFont);
    }
  }, [propSelectedFont]);

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
  };

  // Handle Numeric Font Size in Pixels
  const handleSelectFontSize = (sizePx: number) => {
    setSelectedFontSize(sizePx);
    setShowSizeMenu(false);
    onApplyStyle('font-size', `${sizePx}px`);
  };

  const handleStepFontSize = (delta: number) => {
    const newSize = Math.max(10, Math.min(64, selectedFontSize + delta));
    setSelectedFontSize(newSize);
    onApplyStyle('font-size', `${newSize}px`);
  };

  // Handle Color Application
  const handleApplyColor = (color: string) => {
    setShowColorMenu(false);
    onApplyStyle('color', color);
  };

  // Handle Highlight Application
  const handleApplyHighlight = (color: string) => {
    setShowHighlightMenu(false);
    onApplyStyle('background-color', color);
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
    <div className="px-3 py-1.5 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-wrap items-center gap-1 bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-700 dark:text-zinc-200 select-none text-xs relative z-40">
      
      {/* 1. Undo / Redo */}
      <div className="flex items-center gap-0.5">
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('undo')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Deshacer (Ctrl+Z)"
        >
          <Undo className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('redo')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
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
          <div className="absolute top-full left-0 mt-1 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100] max-h-64 overflow-y-auto custom-scrollbar">
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
            <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100] max-h-56 overflow-y-auto custom-scrollbar">
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
          className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-colors border border-zinc-200 dark:border-zinc-800 cursor-pointer"
          title="Formato de bloque / Encabezados"
        >
          <Type className="w-3.5 h-3.5 text-zinc-500" />
          <span>Formato</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>

        {showHeadingMenu && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100]">
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyCommand('formatBlock', '<p>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-700 dark:text-zinc-200 flex items-center gap-2 cursor-pointer"
            >
              <span className="w-5 text-zinc-400 font-mono">P</span>
              <span>Párrafo normal</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyCommand('formatBlock', '<h1>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 font-bold flex items-center gap-2 cursor-pointer"
            >
              <Heading1 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 1</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyCommand('formatBlock', '<h2>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 font-semibold flex items-center gap-2 cursor-pointer"
            >
              <Heading2 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 2</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyCommand('formatBlock', '<h3>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 font-medium flex items-center gap-2 cursor-pointer"
            >
              <Heading3 className="w-4 h-4 text-zinc-500" />
              <span>Encabezado 3</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyCommand('formatBlock', '<h4>'); setShowHeadingMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs text-zinc-800 dark:text-zinc-100 font-medium flex items-center gap-2 cursor-pointer"
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
          onClick={() => onApplyCommand('bold')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 font-bold transition-colors cursor-pointer"
          title="Negrita (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('italic')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 italic transition-colors cursor-pointer"
          title="Cursiva (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('underline')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 underline transition-colors cursor-pointer"
          title="Subrayado (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('strikeThrough')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Tachado"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('subscript')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Subíndice (X₂)"
        >
          <Subscript className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('superscript')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Superíndice (X²)"
        >
          <Superscript className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
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
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 font-mono text-xs transition-colors cursor-pointer"
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
            <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 z-[100]">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Color de Texto
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    onMouseDown={preventFocusLoss}
                    onClick={() => handleApplyColor(swatch.color)}
                    className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700 hover:scale-105 transition-transform flex items-center justify-center cursor-pointer"
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
            <div className="absolute top-full left-0 mt-1 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-2.5 z-[100]">
              <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Color de Resaltado
              </div>
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {HIGHLIGHT_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.name}
                    onMouseDown={preventFocusLoss}
                    onClick={() => handleApplyHighlight(swatch.color)}
                    className="w-7 h-7 rounded-md border border-zinc-200 dark:border-zinc-700 hover:scale-105 transition-transform flex items-center justify-center cursor-pointer"
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
          onMouseDown={preventFocusLoss}
          onClick={() => setShowAlignMenu(!showAlignMenu)}
          className="flex items-center gap-1 p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Alineación de texto"
        >
          <AlignLeft className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-50" />
        </button>

        {showAlignMenu && (
          <div className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100]">
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyStyle('text-align', 'left'); onApplyCommand('justifyLeft'); setShowAlignMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Izquierda</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyStyle('text-align', 'center'); onApplyCommand('justifyCenter'); setShowAlignMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer"
            >
              <AlignCenter className="w-3.5 h-3.5" />
              <span>Centrado</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyStyle('text-align', 'right'); onApplyCommand('justifyRight'); setShowAlignMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer"
            >
              <AlignRight className="w-3.5 h-3.5" />
              <span>Derecha</span>
            </button>
            <button
              onMouseDown={preventFocusLoss}
              onClick={() => { onApplyStyle('text-align', 'justify'); onApplyCommand('justifyFull'); setShowAlignMenu(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs flex items-center gap-2 cursor-pointer"
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
          onClick={() => onApplyCommand('insertUnorderedList')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Lista con viñetas"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('insertOrderedList')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Lista numerada"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={handleInsertChecklist}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Lista de tareas / Checklist interactivo"
        >
          <CheckSquare className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('indent')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Aumentar sangría"
        >
          <Indent className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('outdent')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
          onClick={() => onApplyCommand('formatBlock', '<blockquote>')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          title="Cita destacada"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>

        <button
          onMouseDown={preventFocusLoss}
          onClick={() => onApplyCommand('formatBlock', '<pre>')}
          className="p-1.5 rounded-md hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
            <div className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl py-1 z-[100]">
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-fade-in">
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
