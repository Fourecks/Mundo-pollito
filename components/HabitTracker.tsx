import React, { useState, useMemo } from 'react';
import { Habit, HabitRecord } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import PlusIcon from './icons/PlusIcon';
import GoldenEggIcon from './icons/GoldenEggIcon';
import TrashIcon from './icons/TrashIcon';

interface HabitTrackerProps {
  habits: Habit[];
  records: HabitRecord[];
  onAddHabit: (name: string, emoji: string, frequency: 'daily' | 'weekly') => void;
  onDeleteHabit: (habitId: number) => void;
  onToggleRecord: (habitId: number, date: string) => void;
}

const HabitTracker: React.FC<HabitTrackerProps> = ({ habits, records, onAddHabit, onDeleteHabit, onToggleRecord }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitEmoji, setNewHabitEmoji] = useState('💧');

  const { weekStart, weekDates } = useMemo(() => {
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    const dayOfWeek = (today.getDay() + 6) % 7; // Monday is 0, Sunday is 6
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);

    const dates = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });
    return { weekStart, weekDates: dates };
  }, [weekOffset]);

  const handleAddHabit = () => {
    if (newHabitName.trim()) {
      onAddHabit(newHabitName.trim(), newHabitEmoji, 'daily');
      setNewHabitName('');
      setNewHabitEmoji('💧');
      setIsAdding(false);
    }
  };
  
  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const completedRecords = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => set.add(`${r.habit_id}-${r.completed_at}`));
    return set;
  }, [records]);

  return (
    <div className="flex flex-col h-full bg-secondary-lighter/30 dark:bg-gray-900/30">
      <header className="flex-shrink-0 p-3 border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-primary-dark dark:text-primary">Mis Hábitos</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 w-24 text-center">
            {weekStart.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronRightIcon /></button>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-3">
        {habits.map(habit => (
          <div key={habit.id} className="bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl shadow-sm flex items-center gap-3">
            <div className="flex items-center gap-2 flex-grow">
              <span className="text-2xl">{habit.emoji}</span>
              <p className="font-semibold text-gray-700 dark:text-gray-200 truncate">{habit.name}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {weekDates.map(date => {
                const dateKey = formatDateKey(date);
                const isCompleted = completedRecords.has(`${habit.id}-${dateKey}`);
                return (
                  <button 
                    key={dateKey} 
                    onClick={() => onToggleRecord(habit.id, dateKey)}
                    className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${isCompleted ? 'bg-secondary-light dark:bg-secondary/30 transform scale-110' : 'bg-gray-200/70 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                  >
                    {isCompleted ? <GoldenEggIcon /> : <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{date.getDate()}</span>}
                  </button>
                )
              })}
            </div>
             <button onClick={() => onDeleteHabit(habit.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full"><TrashIcon className="h-4 w-4"/></button>
          </div>
        ))}
        
        {isAdding ? (
          <div className="bg-white/80 dark:bg-gray-800/80 p-3 rounded-xl shadow-sm flex items-center gap-2 animate-pop-in">
             <input type="text" value={newHabitEmoji} onChange={(e) => setNewHabitEmoji(e.target.value)} className="w-10 h-10 text-2xl bg-gray-200/70 dark:bg-gray-700/50 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary" maxLength={2} />
            <input type="text" value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="Nombre del hábito" className="flex-grow bg-transparent focus:outline-none text-gray-700 dark:text-gray-200 font-semibold"/>
            <button onClick={handleAddHabit} className="bg-primary text-white font-bold rounded-lg px-4 py-2 text-sm">Guardar</button>
            <button onClick={() => setIsAdding(false)} className="text-gray-500 text-sm">Cancelar</button>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)} className="w-full bg-white/50 dark:bg-gray-800/50 border-2 border-dashed border-secondary-light dark:border-gray-600 rounded-xl p-3 text-center text-primary-dark dark:text-primary font-semibold hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors flex items-center justify-center gap-2">
            <PlusIcon />
            Añadir Hábito
          </button>
        )}
      </div>
    </div>
  );
};

export default HabitTracker;