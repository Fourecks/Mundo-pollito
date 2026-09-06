import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface CommandAction {
  id: string;
  title: string;
  icon: React.ReactNode;
  shortcut?: string;
  macShortcut?: string;
  onSelect: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.userAgent || navigator.platform || '');

  // Filter actions based on query
  const filteredActions = actions.filter(action => {
    const searchString = `${action.title} ${action.keywords?.join(' ') || ''}`.toLowerCase();
    return searchString.includes(query.toLowerCase());
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].onSelect();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[110000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="relative bg-white dark:bg-[#0a0a0a] w-full max-w-2xl rounded-3xl border border-gray-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-pop-in flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-zinc-800">
          <Search className="w-5 h-5 text-gray-400 dark:text-zinc-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent border-none outline-none text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 font-medium h-10"
            placeholder="Buscar comandos, aplicaciones, acciones..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-md text-[10px] font-semibold text-gray-500 dark:text-zinc-400 ml-2">
            ESC
          </div>
        </div>

        <div className="overflow-y-auto p-2 custom-scrollbar">
          {filteredActions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-zinc-400">
              No se encontraron comandos para "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filteredActions.map((action, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.onSelect();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-colors ${
                      isSelected 
                        ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100' 
                        : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white dark:bg-zinc-700 shadow-sm' : 'bg-transparent'} transition-colors`}>
                        {action.icon}
                      </div>
                      <span className="text-sm font-medium">{action.title}</span>
                    </div>
                    {(() => {
                      const displayShortcut = isMac ? (action.macShortcut || action.shortcut) : (action.shortcut || action.macShortcut);
                      if (!displayShortcut) return null;
                      return (
                        <div className="flex items-center gap-1">
                          {displayShortcut.split('+').map(key => (
                            <span key={key} className="px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-md text-[10px] font-semibold uppercase shadow-sm text-gray-600 dark:text-zinc-400">
                              {key}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;
