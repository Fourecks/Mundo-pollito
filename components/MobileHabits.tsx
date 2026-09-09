import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Habit, HabitRecord } from '../types';

interface MobileHabitsProps {
    habits: Habit[];
    records: HabitRecord[];
    onOpenHabitCreator: () => void;
    onOpenHabitEditor: (habit: Habit) => void;
    onDeleteHabit: (id: string) => void;
    onToggleRecord: (habitId: string, dateStr: string, completed: boolean, value?: number) => void;
}

const MobileHabits: React.FC<MobileHabitsProps> = ({
    habits,
    records,
    onOpenHabitCreator,
    onOpenHabitEditor,
    onToggleRecord
}) => {
    const [selectedDate, setSelectedDate] = useState(new Date());

    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
    const isToday = isSameDay(selectedDate, new Date());
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const getRecordForHabit = (habitId: number) => {
        return records.find(r => r.habit_id === habitId && r.date === dateStr);
    };

    const handleToggle = (habitId: number, currentCompleted: boolean) => {
        onToggleRecord(habitId.toString(), dateStr, !currentCompleted);
    };

    const completedCount = habits.filter(h => getRecordForHabit(h.id)?.completed).length;
    const progress = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-28 pt-12 px-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Hábitos</h1>
                    <p className="text-sm font-medium text-zinc-500 mt-1">{habits.length} activos hoy</p>
                </div>
                <button 
                    onClick={onOpenHabitCreator}
                    className="w-12 h-12 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center active:scale-95 transition-transform shadow-xl"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>

            <div className="flex items-center justify-between mb-8 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-full border border-zinc-100 dark:border-zinc-800">
                <button onClick={handlePrevDay} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-zinc-200 dark:active:bg-zinc-800 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-zinc-500" />
                </button>
                <div className="flex items-center gap-2 font-medium">
                    <CalendarIcon className="w-4 h-4 text-zinc-400" />
                    <span>{isToday ? 'Hoy' : format(selectedDate, "d 'de' MMMM", { locale: es })}</span>
                </div>
                <button onClick={handleNextDay} className="w-10 h-10 flex items-center justify-center rounded-full active:bg-zinc-200 dark:active:bg-zinc-800 transition-colors">
                    <ChevronRight className="w-5 h-5 text-zinc-500" />
                </button>
            </div>

            {habits.length > 0 && (
                <div className="mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <h2 className="text-sm font-medium text-zinc-500">Progreso diario</h2>
                        <span className="text-sm font-bold">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-green-500 transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {habits.map(habit => {
                    const record = getRecordForHabit(habit.id);
                    const isCompleted = record?.completed ?? false;

                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={habit.id}
                            className={`flex items-center p-4 rounded-3xl border transition-all ${
                                isCompleted 
                                    ? 'bg-zinc-50 dark:bg-zinc-900/50 border-transparent opacity-60' 
                                    : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm'
                            }`}
                        >
                            <button 
                                onClick={() => handleToggle(habit.id, isCompleted)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors mr-4 ${
                                    isCompleted 
                                        ? 'bg-green-500 border-green-500 text-white' 
                                        : 'border-zinc-300 dark:border-zinc-700 active:bg-zinc-100 dark:active:bg-zinc-800'
                                }`}
                            >
                                {isCompleted && <Check className="w-5 h-5" />}
                            </button>
                            <div 
                                className="flex-1 min-w-0"
                                onClick={() => onOpenHabitEditor(habit)}
                            >
                                <h3 className={`text-base font-medium truncate ${isCompleted ? 'text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                    {habit.emoji && <span className="mr-2">{habit.emoji}</span>}
                                    {habit.name}
                                </h3>
                            </div>
                        </motion.div>
                    );
                })}

                {habits.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-zinc-500 font-medium mb-2">No tienes hábitos activos.</p>
                        <p className="text-sm text-zinc-400">Toca el botón + para crear uno.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileHabits;
