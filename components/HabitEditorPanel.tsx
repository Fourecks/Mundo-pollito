import React, { useState, useEffect, useRef } from 'react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90000] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs" onClick={onClose} />
      
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl flex flex-col z-[90001] overflow-visible max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="flex-shrink-0 px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-t-2xl">
          <div>
            <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
              {habitToEdit ? 'Editar Hábito' : 'Nuevo Hábito'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {habitToEdit ? 'Modifica los detalles de tu hábito' : 'Configura una nueva rutina diaria'}
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-grow overflow-hidden rounded-b-2xl">
          <main className="flex-grow p-5 overflow-y-auto custom-scrollbar space-y-4 text-left">
            
            {/* Field 1: Name and Emoji Trigger */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Nombre del Hábito
                </label>
                <div className="flex gap-2 items-center">
                  {/* Emoji Trigger Button */}
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      type="button"
                      onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
                      className="w-12 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      title="Seleccionar emoji"
                    >
                      {emoji || '💧'}
                    </button>

                    {/* Emoji Dropdown Picker */}
                    {isEmojiPickerOpen && (
                      <div className="absolute left-0 top-12 w-64 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-[90002] animate-pop-in space-y-2">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-700">
                          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Seleccionar icono</span>
                          <input
                            type="text"
                            value={emoji || ''}
                            onChange={(e) => setEmoji(e.target.value)}
                            placeholder="Emoji"
                            maxLength={4}
                            className="w-14 text-center text-xs bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2.5 pt-1">
                          {EMOJI_CATEGORIES.map(cat => (
                            <div key={cat.name}>
                              <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
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
                                    className={`w-8 h-8 rounded-md text-base transition-transform flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 ${
                                      emoji === e ? 'bg-emerald-100 dark:bg-emerald-900/60 ring-2 ring-emerald-500' : ''
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
                    placeholder="Ej. Leer 20 min, Beber agua..." 
                    className="flex-1 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Field 2: Frequency Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                Frecuencia
              </label>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'daily', label: 'Diariamente', desc: 'Todos los días' },
                  { id: 'specific_days', label: 'Días específicos', desc: 'Seleccionar días' },
                  { id: 'times_per_week', label: 'Meta semanal', desc: 'X veces por semana' },
                  { id: 'interval', label: 'Intervalo', desc: 'Cada N días' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleFrequencyTypeChange(item.id as FrequencyType)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      frequency.type === item.id 
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 font-medium' 
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{item.desc}</div>
                  </button>
                ))}
              </div>

              {frequency.type === 'specific_days' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
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
                          className={`flex-1 py-1.5 text-xs rounded-md font-semibold transition-colors ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
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
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Meta semanal:
                  </span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="1" 
                      max="7" 
                      value={frequency.count ?? 3} 
                      onChange={e => setFrequency({ ...frequency, count: Math.min(7, Math.max(1, parseInt(e.target.value) || 1)) })} 
                      className="w-16 text-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-1 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">veces por semana</span>
                  </div>
                </div>
              )}

              {frequency.type === 'interval' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Repetir cada:
                    </span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        min="2" 
                        value={frequency.days ?? 2} 
                        onChange={e => setFrequency({ ...frequency, days: Math.max(2, parseInt(e.target.value) || 2) })} 
                        className="w-16 text-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-1 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">días</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Fecha de inicio:
                    </label>
                    <input 
                      type="date" 
                      value={frequency.startDate || ''} 
                      onChange={e => setFrequency({ ...frequency, startDate: e.target.value })} 
                      className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>

          </main>

          {/* Modal Footer */}
          <footer className="flex-shrink-0 px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-end gap-2 rounded-b-2xl">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!name.trim()} 
              className="px-5 py-2 text-xs font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white rounded-lg transition-colors disabled:opacity-40"
            >
              {habitToEdit ? 'Guardar Cambios' : 'Crear Hábito'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default HabitEditorPanel;
