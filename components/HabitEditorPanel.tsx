import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Habit, HabitFrequency, FrequencyType } from '../types';
import CloseIcon from './icons/CloseIcon';

interface HabitEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string, frequency: HabitFrequency) => void;
  habitToEdit: Habit | null;
}

const weekdayLabels = [
  { label: 'Dom', index: 0 },
  { label: 'Lun', index: 1 },
  { label: 'Mar', index: 2 },
  { label: 'Mié', index: 3 },
  { label: 'Jue', index: 4 },
  { label: 'Vie', index: 5 },
  { label: 'Sáb', index: 6 }
];

const EMOJI_CATEGORIES = [
  {
    name: 'Salud y Bienestar',
    emojis: ['💧', '🏃', '🚴', '🧘', '🥗', '💤', '🍎', '💊', '🚶', '🏋️', '🛏️', '🥑']
  },
  {
    name: 'Mente y Estudio',
    emojis: ['📚', '✍️', '🧠', '🎯', '🎨', '🎸', '📖', '🎧', '💻', '💡', '📝', '⚡']
  },
  {
    name: 'Rutina y Estilo',
    emojis: ['☀️', '🌙', '🪴', '🧹', '☕', '🍳', '🧼', '🎒', '🐕', '🔑', '⏰', '✨']
  }
];

const HabitEditorPanel: React.FC<HabitEditorPanelProps> = ({ isOpen, onClose, onSave, habitToEdit }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💧');
  const [frequency, setFrequency] = useState<HabitFrequency>({ type: 'daily' });
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setEmoji(habitToEdit.emoji || '💧');
        setFrequency(habitToEdit.frequency || { type: 'daily' });
      } else {
        setName('');
        setEmoji('💧');
        setFrequency({ type: 'daily' });
      }
      setIsEmojiPickerOpen(false);
    }
  }, [isOpen, habitToEdit]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    if (isEmojiPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), emoji || '💧', frequency);
    }
  };

  const handleFrequencyTypeChange = (type: FrequencyType) => {
    switch (type) {
      case 'daily':
        setFrequency({ type: 'daily' });
        break;
      case 'specific_days':
        setFrequency({ type: 'specific_days', days: [1, 2, 3, 4, 5] });
        break;
      case 'times_per_week':
        setFrequency({ type: 'times_per_week', count: 3 });
        break;
      case 'interval':
        setFrequency({ type: 'interval', days: 2, startDate: new Date().toISOString().split('T')[0] });
        break;
    }
  };
  
  const handleDayToggle = (dayIndex: number) => {
    if (frequency.type === 'specific_days') {
      const currentDays = frequency.days || [];
      const newDays = currentDays.includes(dayIndex)
        ? currentDays.filter(d => d !== dayIndex)
        : [...currentDays, dayIndex];
      setFrequency({ ...frequency, days: newDays.sort((a, b) => a - b) });
    }
  };

  const QUICK_EMOJIS = ['💧', '🏃', '📚', '🧘', '🥗', '💤', '☕', '🎯', '✍️', '✨'];

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100010] flex items-start sm:items-center justify-center pt-2 sm:pt-6 px-3 sm:px-4 pb-20 overflow-y-auto bg-black/60 backdrop-blur-xs animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col z-[100011] overflow-hidden max-h-[92vh] my-1 sm:my-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Native Drag Handle */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <header className="flex-shrink-0 px-5 py-3 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              {habitToEdit ? 'Editar Hábito' : 'Nuevo Hábito'}
            </h3>
            <p className="text-xs text-zinc-500">
              {habitToEdit ? 'Ajusta tu hábito diario' : 'Comienza una nueva rutina diaria'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
            aria-label="Cerrar modal"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-grow overflow-hidden">
          <main className="flex-grow p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 text-left">
            
            {/* Field 1: Name and Emoji */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Nombre del Hábito
              </label>
              <div className="flex gap-2 items-center">
                {/* Emoji Trigger Button */}
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                    className="w-12 h-11 flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    title="Cambiar emoji"
                  >
                    {emoji || '💧'}
                  </button>

                  {/* Emoji Dropdown Picker */}
                  {isEmojiPickerOpen && (
                    <div className="absolute left-0 top-14 w-72 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl z-[90002] animate-pop-in space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Seleccionar icono</span>
                        <input
                          type="text"
                          value={emoji || ''}
                          onChange={(e) => setEmoji(e.target.value)}
                          placeholder="Emoji"
                          maxLength={4}
                          className="w-14 text-center text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                      </div>

                      <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2.5 pt-1">
                        {EMOJI_CATEGORIES.map(cat => (
                          <div key={cat.name}>
                            <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">
                              {cat.name}
                            </div>
                            <div className="grid grid-cols-6 gap-1">
                              {cat.emojis.map(e => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => {
                                    setEmoji(e);
                                    setIsEmojiPickerOpen(false);
                                  }}
                                  className={`w-8 h-8 rounded-xl text-base transition-all flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                                    emoji === e ? 'bg-zinc-200 dark:bg-zinc-700 font-bold scale-110' : ''
                                  }`}
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Habit Name Input */}
                <input 
                  type="text" 
                  required
                  value={name || ''} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="Ej. Beber 2L de agua, Leer 20 min..." 
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder:text-zinc-400"
                />
              </div>

              {/* Quick Emojis Row for Native Easy Creation */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                <span className="text-[10px] text-zinc-400 uppercase font-semibold mr-1 shrink-0">Rápido:</span>
                {QUICK_EMOJIS.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEmoji(item)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center shrink-0 transition-transform ${
                      emoji === item 
                        ? 'bg-zinc-200 dark:bg-zinc-800 ring-2 ring-zinc-400 scale-110' 
                        : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800/80" />

            {/* Field 2: Frequency Selection - Native Minimalist */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Frecuencia
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'daily', label: 'Diario', desc: 'Todos los días' },
                  { id: 'specific_days', label: 'Días selectos', desc: 'Días de la semana' },
                  { id: 'times_per_week', label: 'Meta semanal', desc: 'X veces por semana' },
                  { id: 'interval', label: 'Intervalo', desc: 'Cada N días' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleFrequencyTypeChange(item.id as FrequencyType)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      frequency.type === item.id 
                        ? 'border-zinc-900 dark:border-white bg-zinc-900/5 dark:bg-white/10 text-zinc-900 dark:text-white font-medium shadow-xs' 
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{item.desc}</div>
                  </button>
                ))}
              </div>

              {frequency.type === 'specific_days' && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
                  <span className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400">
                    Días activos:
                  </span>
                  <div className="flex justify-between gap-1">
                    {weekdayLabels.map(({ label, index }) => {
                      const isSelected = frequency.days?.includes(index);
                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleDayToggle(index)}
                          className={`flex-1 py-2 text-xs rounded-xl font-bold transition-all ${
                            isSelected
                              ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                              : 'bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {frequency.type === 'times_per_week' && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Meta semanal:
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="1" 
                      max="7" 
                      value={frequency.count ?? 3} 
                      onChange={e => setFrequency({ ...frequency, count: Math.min(7, Math.max(1, parseInt(e.target.value) || 1)) })} 
                      className="w-16 text-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                    <span className="text-xs text-zinc-500">veces / sem</span>
                  </div>
                </div>
              )}

              {frequency.type === 'interval' && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Repetir cada:
                    </span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="2" 
                        value={frequency.days ?? 2} 
                        onChange={e => setFrequency({ ...frequency, days: Math.max(2, parseInt(e.target.value) || 2) })} 
                        className="w-16 text-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      />
                      <span className="text-xs text-zinc-500">días</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                      Fecha de inicio:
                    </label>
                    <input 
                      type="date" 
                      value={frequency.startDate || ''} 
                      onChange={e => setFrequency({ ...frequency, startDate: e.target.value })} 
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                  </div>
                </div>
              )}
            </div>

          </main>

          {/* Modal Footer - Mobile Optimized */}
          <footer className="flex-shrink-0 px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-end gap-2.5">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!name.trim()} 
              className="px-5 py-2.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl transition-all disabled:opacity-40 shadow-xs active:scale-95"
            >
              {habitToEdit ? 'Guardar Cambios' : 'Crear Hábito'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default HabitEditorPanel;
