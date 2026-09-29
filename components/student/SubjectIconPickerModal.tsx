import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Check } from 'lucide-react';
import { SUBJECT_ICONS, SUBJECT_COLOR_PALETTES, SubjectIconOption } from './subjectIcons';

interface SubjectIconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIconId: string;
  onSelectIcon: (iconId: string) => void;
  selectedColor: string;
  onSelectColor: (color: string) => void;
}

export const SubjectIconPickerModal: React.FC<SubjectIconPickerModalProps> = ({
  isOpen,
  onClose,
  selectedIconId,
  onSelectIcon,
  selectedColor,
  onSelectColor,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');

  if (!isOpen) return null;

  const categories = ['Todos', 'Técnico', 'Ciencias', 'Salud', 'Humanidades', 'Artes', 'Economía', 'General'];

  const filteredIcons = SUBJECT_ICONS.filter(item => {
    if (activeCategory !== 'Todos' && item.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#16141f] rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-150 dark:border-white/10 p-5 sm:p-6 space-y-4 max-h-[85vh] flex flex-col shadow-2xl pb-safe"
      >
        <div className="w-12 h-1 bg-gray-300 dark:bg-white/20 rounded-full mx-auto my-1 shrink-0 sm:hidden" />

        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5 shrink-0">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Seleccionar Ícono y Color</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Elige el ícono específico y tono para tu materia</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Color Palette Selector */}
        <div className="space-y-1.5 shrink-0">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500">Color de la Materia</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {SUBJECT_COLOR_PALETTES.map(pal => {
              const isSelected = selectedColor.toLowerCase() === pal.color.toLowerCase();
              return (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => onSelectColor(pal.color)}
                  className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center transition-all ${
                    isSelected ? 'ring-2 ring-offset-2 ring-black dark:ring-white scale-110 shadow-sm' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: pal.color }}
                  title={pal.label}
                >
                  {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar ícono por nombre o materia..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-zinc-900/80 border border-gray-200 dark:border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Icons Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 overflow-y-auto pr-1 flex-1 min-h-[220px]">
          {filteredIcons.map(item => {
            const IconComp = item.icon;
            const isSelected = selectedIconId === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectIcon(item.id);
                }}
                className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-black dark:border-white bg-black/5 dark:bg-white/10 shadow-sm scale-102'
                    : 'border-gray-150/80 dark:border-white/5 bg-gray-50/50 dark:bg-zinc-900/40 hover:bg-gray-100 dark:hover:bg-zinc-800'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: isSelected ? selectedColor : `${selectedColor}18`,
                    color: isSelected ? '#ffffff' : selectedColor
                  }}
                >
                  <IconComp className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 text-center line-clamp-1 leading-tight w-full">
                  {item.name.split('/')[0].trim()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-transform"
          >
            Listo
          </button>
        </div>
      </motion.div>
    </div>
  );
};
