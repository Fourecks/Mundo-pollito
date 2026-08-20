import React, { useState, useEffect } from 'react';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { FolderPlus, FolderEdit, X, Check, Smile, Sparkles, Ban } from 'lucide-react';
import { Project } from '../types';

interface ProjectEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string | null, color: string | null) => void;
  projectToEdit: Project | null;
}

const PROJECT_COLORS = [
  { hex: '#ef4444', name: 'Rojo' },
  { hex: '#f97316', name: 'Naranja' },
  { hex: '#f59e0b', name: 'Ámbar' },
  { hex: '#10b981', name: 'Esmeralda' },
  { hex: '#14b8a6', name: 'Menta' },
  { hex: '#06b6d4', name: 'Cian' },
  { hex: '#3b82f6', name: 'Azul' },
  { hex: '#6366f1', name: 'Índigo' },
  { hex: '#8b5cf6', name: 'Púrpura' },
  { hex: '#ec4899', name: 'Rosa' },
  { hex: '#64748b', name: 'Pizarra' },
  { hex: '#1e293b', name: 'Oscuro' },
];

const EMOJI_CATEGORIES = [
  {
    id: 'popular',
    label: 'Populares',
    emojis: ['🎯', '📁', '🚀', '⭐', '💼', '📚', '🏠', '🔥', '💡', '🎨', '📝', '🏆', '🌿', '☕', '🛠️', '✨'],
  },
  {
    id: 'work',
    label: 'Trabajo',
    emojis: ['💼', '📁', '📊', '📈', '💻', '⚙️', '📝', '📌', '✉️', '📅', '🧠', '🏢'],
  },
  {
    id: 'goals',
    label: 'Metas',
    emojis: ['🎯', '🚀', '🏁', '🏆', '⭐', '🔥', '💎', '🌟', '🥇', '⚡', '💪', '🌱'],
  },
  {
    id: 'study',
    label: 'Estudio',
    emojis: ['📚', '🎓', '📖', '✍️', '🔬', '🧪', '📐', '🎨', '🎵', '💻', '🧩', '🗣️'],
  },
  {
    id: 'life',
    label: 'Personal',
    emojis: ['🏠', '🌿', '🏋️', '🍎', '✈️', '🛒', '💖', '☕', '🍕', '🎮', '🎬', '💰'],
  },
];

const ProjectEditorPanel: React.FC<ProjectEditorPanelProps> = ({ isOpen, onClose, onSave, projectToEdit }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>('📁');
  const [color, setColor] = useState<string | null>(PROJECT_COLORS[6].hex); // Default Blue
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<string>('popular');
  const [showFullPicker, setShowFullPicker] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      if (projectToEdit) {
        setName(projectToEdit.name);
        setEmoji(projectToEdit.emoji || null);
        setColor(projectToEdit.color || PROJECT_COLORS[6].hex);
      } else {
        setName('');
        setEmoji('🎯');
        setColor(PROJECT_COLORS[6].hex);
      }
      setShowFullPicker(false);
      setActiveEmojiCategory('popular');
    }
  }, [isOpen, projectToEdit]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), emoji, color);
    }
  };

  if (!isOpen) return null;

  const activeCategoryObj = EMOJI_CATEGORIES.find(c => c.id === activeEmojiCategory) || EMOJI_CATEGORIES[0];
  const currentColor = color || PROJECT_COLORS[6].hex;

  return (
    <div className="fixed inset-0 z-[60000] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col z-[60001] overflow-hidden border border-gray-200 dark:border-gray-800 animate-slide-up max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        {/* Color accent bar at top */}
        <div 
          className="h-1.5 w-full transition-colors duration-300" 
          style={{ backgroundColor: currentColor }} 
        />

        {/* Header */}
        <header className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm transition-colors duration-300"
              style={{ backgroundColor: currentColor }}
            >
              {emoji || (projectToEdit ? <FolderEdit size={20} /> : <FolderPlus size={20} />)}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">
                {projectToEdit ? 'Editar Proyecto' : 'Crear Nuevo Proyecto'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                Organiza tus tareas y objetivos en un espacio dedicado
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </header>

        {/* Main Body */}
        <form onSubmit={handleSave} className="flex-grow p-5 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Live Card Preview */}
          <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800/80">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Vista previa del proyecto
            </span>
            <div 
              className="bg-white dark:bg-gray-900 p-3.5 rounded-xl border shadow-sm flex items-center gap-3 transition-all"
              style={{ borderColor: `${currentColor}40` }}
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-xs"
                style={{ backgroundColor: `${currentColor}15`, color: currentColor }}
              >
                {emoji || '📁'}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                  {name.trim() || 'Nombre del proyecto...'}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-300" 
                      style={{ width: '0%', backgroundColor: currentColor }} 
                    />
                  </div>
                  <span className="text-[11px] text-gray-400 font-medium">0 tareas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Name Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
              Nombre del Proyecto <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Ej: Rediseño Web, Campaña de Verano, Tesis..." 
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-3.5 focus:outline-none focus:ring-2 font-medium text-sm transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              style={{ focusRingColor: currentColor }}
              autoFocus
            />
          </div>

          {/* Selectable Emoji Picker */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Icono / Emoji
              </label>
              <div className="flex items-center gap-2">
                {emoji && (
                  <button
                    type="button"
                    onClick={() => setEmoji(null)}
                    className="text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Ban size={12} />
                    <span>Sin emoji</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFullPicker(!showFullPicker)}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                >
                  <Smile size={13} />
                  <span>{showFullPicker ? 'Ver selección rápida' : 'Buscar en catálogo completó'}</span>
                </button>
              </div>
            </div>

            {showFullPicker ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-xs">
                <EmojiPicker 
                  onEmojiClick={(data) => setEmoji(data.emoji)} 
                  theme={document.documentElement.classList.contains('dark') ? EmojiTheme.DARK : EmojiTheme.LIGHT} 
                  width="100%" 
                  height={280} 
                  lazyLoadEmojis={true} 
                  searchPlaceHolder="Buscar emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-800/40 p-3 rounded-xl border border-gray-200/80 dark:border-gray-800">
                {/* Category Selector Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 custom-scrollbar border-b border-gray-200/60 dark:border-gray-700/60 mb-2.5">
                  {EMOJI_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveEmojiCategory(cat.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                        activeEmojiCategory === cat.id
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-semibold'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Emoji Grid */}
                <div className="grid grid-cols-8 gap-1.5">
                  {activeCategoryObj.emojis.map((em) => {
                    const isSelected = emoji === em;
                    return (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEmoji(em)}
                        className={`w-9 h-9 text-xl rounded-xl flex items-center justify-center transition-all transform ${
                          isSelected
                            ? 'bg-white dark:bg-gray-700 ring-2 ring-blue-500 shadow-xs scale-110'
                            : 'hover:bg-white/80 dark:hover:bg-gray-700/50 hover:scale-105 text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {em}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Color del Tema
            </label>
            <div className="grid grid-cols-6 gap-2.5">
              {PROJECT_COLORS.map(c => {
                const isSelected = color === c.hex;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    className={`h-9 rounded-xl transition-all duration-200 flex items-center justify-center relative shadow-xs ${
                      isSelected 
                        ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-offset-gray-900 dark:ring-white scale-105' 
                        : 'hover:scale-105 opacity-90 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <Check size={16} className="text-white drop-shadow-xs" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

        </form>

        {/* Footer Actions */}
        <footer className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-end gap-2.5 flex-shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="button"
            onClick={() => handleSave()} 
            disabled={!name.trim()} 
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-sm transition-all duration-200 hover:opacity-95 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ backgroundColor: currentColor }}
          >
            <Sparkles size={16} />
            <span>{projectToEdit ? 'Guardar Cambios' : 'Crear Proyecto'}</span>
          </button>
        </footer>

      </div>
    </div>
  );
};

export default ProjectEditorPanel;
