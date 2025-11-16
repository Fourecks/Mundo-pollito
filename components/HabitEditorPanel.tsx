

import React, { useState, useEffect } from 'react';
import { Habit, HabitFrequency, FrequencyType } from '../types';
import CloseIcon from './icons/CloseIcon';

interface HabitEditorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string, frequency: HabitFrequency) => void;
  habitToEdit: Habit | null;
}

const weekdayLabels = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const HabitEditorPanel: React.FC<HabitEditorPanelProps> = ({ isOpen, onClose, onSave, habitToEdit }) => {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💧');
  const [frequency, setFrequency] = useState<HabitFrequency>({ type: 'daily' });

  useEffect(() => {
    if (isOpen) {
      if (habitToEdit) {
        setName(habitToEdit.name);
        setEmoji(habitToEdit.emoji || '💧');
        setFrequency(habitToEdit.frequency || { type: 'daily' });
      } else {
        // Reset for new habit
        setName('');
        setEmoji('💧');
        setFrequency({ type: 'daily' });
      }
    }
  }, [isOpen, habitToEdit]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim(), emoji, frequency);
    }
  };

  const handleFrequencyTypeChange = (type: FrequencyType) => {
    switch (type) {
        case 'daily':
            setFrequency({ type: 'daily' });
            break;
        case 'specific_days':
            setFrequency({ type: 'specific_days', days: [1, 2, 3, 4, 5] }); // Default Mon-Fri
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
        setFrequency({ ...frequency, days: newDays.sort((a,b) => a - b) });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60000] animate-fade-in" onClick={onClose}></div>
      <div className="fixed bottom-0 left-0 right-0 max-h-[90vh] bg-secondary-lighter dark:bg-gray-800 rounded-t-2xl shadow-2xl flex flex-col z-[60001] animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="flex-shrink-0 p-3 text-center relative border-b border-secondary-light/50 dark:border-gray-700/50 flex items-center justify-between">
          <h3 className="font-bold text-lg text-primary-dark dark:text-primary w-full text-center">{habitToEdit ? 'Editar Hábito' : 'Nuevo Hábito'}</h3>
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5">
            <CloseIcon />
          </button>
        </header>
        <main className="flex-grow p-4 overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-sm mx-auto space-y-4">
            <div>
              <label className="font-medium text-gray-700 dark:text-gray-200 text-sm">Nombre del Hábito</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Beber agua" className="mt-1 w-full bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary"/>
            </div>
            <div>
              <label className="font-medium text-gray-700 dark:text-gray-200 text-sm">Emoji</label>
              <input type="text" value={emoji || ''} onChange={(e) => setEmoji(e.target.value)} placeholder="💧" className="mt-1 w-full bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl" maxLength={4} />
            </div>
            <div>
                <label className="font-medium text-gray-700 dark:text-gray-200 text-sm">Frecuencia</label>
                <select value={frequency.type} onChange={e => handleFrequencyTypeChange(e.target.value as FrequencyType)} className="mt-1 w-full bg-white/80 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-2 border-secondary-light dark:border-gray-600 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="daily">Diariamente</option>
                    <option value="specific_days">Días específicos</option>
                    <option value="times_per_week">Meta semanal</option>
                    <option value="interval">Intervalo de días</option>
                </select>
            </div>
            
            {frequency.type === 'specific_days' && (
                <div className="bg-white/60 dark:bg-gray-700/60 p-2 rounded-lg animate-pop-in">
                    <div className="flex justify-around gap-1">
                        {weekdayLabels.map((dayLabel, index) => (
                            <button key={index} onClick={() => handleDayToggle(index)} className={`w-8 h-8 text-xs rounded-full transition-colors font-semibold ${frequency.days.includes(index) ? 'bg-primary text-white shadow' : 'hover:bg-yellow-100 text-gray-700'}`}>{dayLabel}</button>
                        ))}
                    </div>
                </div>
            )}
            
            {frequency.type === 'times_per_week' && (
                <div className="bg-white/60 dark:bg-gray-700/60 p-3 rounded-lg flex items-center justify-between animate-pop-in">
                    <label className="font-medium text-gray-700 dark:text-gray-200 text-sm">Completar</label>
                    <div className="flex items-center gap-2">
                        <input type="number" min="1" max="7" value={frequency.count} onChange={e => setFrequency({ ...frequency, count: Math.min(7, Math.max(1, parseInt(e.target.value) || 1)) })} className="w-20 text-center bg-white/80 dark:bg-gray-700 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1"/>
                        <span className="text-sm text-gray-600 dark:text-gray-300">veces por semana</span>
                    </div>
                </div>
            )}
            
            {frequency.type === 'interval' && (
                <div className="bg-white/60 dark:bg-gray-700/60 p-3 rounded-lg space-y-2 animate-pop-in">
                     <div className="flex items-center justify-between">
                        <label className="font-medium text-gray-700 dark:text-gray-200 text-sm">Repetir cada</label>
                         <div className="flex items-center gap-2">
                            <input type="number" min="2" value={frequency.days} onChange={e => setFrequency({ ...frequency, days: Math.max(2, parseInt(e.target.value) || 2) })} className="w-20 text-center bg-white/80 dark:bg-gray-700 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1"/>
                            <span className="text-sm text-gray-600 dark:text-gray-300">días</span>
                        </div>
                    </div>
                    <div>
                        <label className="font-medium text-gray-700 dark:text-gray-200 text-xs">Empezando desde</label>
                        <input type="date" value={frequency.startDate} onChange={e => setFrequency({ ...frequency, startDate: e.target.value })} className="mt-1 w-full bg-white/80 dark:bg-gray-700 border-2 border-secondary-light dark:border-gray-600 rounded-lg p-1.5"/>
                    </div>
                </div>
            )}
            
          </div>
        </main>
        <footer className="flex-shrink-0 p-4 border-t border-secondary-light/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
          <button onClick={handleSave} disabled={!name.trim()} className="w-full bg-primary text-white font-bold rounded-full px-6 py-3 shadow-md hover:bg-primary-dark transform active:scale-95 transition-all duration-200 disabled:opacity-50">
            Guardar
          </button>
        </footer>
      </div>
    </>
  );
};

export default HabitEditorPanel;