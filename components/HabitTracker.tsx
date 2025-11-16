import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit, HabitRecord, HabitFrequency } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import PlusIcon from './icons/PlusIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import ConfirmationModal from './ConfirmationModal';
import ChartBarIcon from './icons/ChartBarIcon';
import ListIcon from './icons/ListIcon';

interface HabitTrackerProps {
  habits: Habit[];
  records: HabitRecord[];
  onOpenHabitCreator: () => void;
  onOpenHabitEditor: (habit: Habit) => void;
  onDeleteHabit: (habitId: number) => void;
  onToggleRecord: (habitId: number, date: string) => void;
}

const weekdayLabelsShort = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const getFrequencyText = (freq: HabitFrequency): string => {
    switch (freq.type) {
        case 'daily': return 'Diariamente';
        case 'specific_days': 
            const dayNames = freq.days.map(d => weekdayLabelsShort[d]).join(', ');
            return `Días: ${dayNames}`;
        case 'times_per_week': return `Meta: ${freq.count} ${freq.count > 1 ? 'veces' : 'vez'} por semana`;
        case 'interval': return `Cada ${freq.days} días`;
        default: return 'Diariamente';
    }
}

const isDayApplicable = (date: Date, freq: HabitFrequency): boolean => {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    switch (freq.type) {
        case 'daily':
        case 'times_per_week':
            return true;
        case 'specific_days':
            return freq.days.includes(utcDate.getUTCDay());
        case 'interval': {
            const startDate = new Date(freq.startDate + "T00:00:00Z");
            const diffTime = Math.abs(utcDate.getTime() - startDate.getTime());
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            return diffDays % freq.days === 0;
        }
        default:
            return true;
    }
};

const calculateStreak = (habit: Habit, records: HabitRecord[]): number => {
    const habitRecords = records.filter(r => r.habit_id === habit.id);
    if (habitRecords.length === 0) return 0;

    const completedDates = new Set(habitRecords.map(r => r.completed_at));
    const sortedDateStrings = Array.from(completedDates).sort((a, b) => b.localeCompare(a));
    
    if (sortedDateStrings.length === 0) return 0;
    
    const lastCompletionDate = new Date(sortedDateStrings[0] + "T00:00:00Z");

    if (habit.frequency.type === 'times_per_week') {
        let streak = 0;
        const count = habit.frequency.count;

        const lastDateWeekDay = lastCompletionDate.getUTCDay();
        const startOfLastCompletedWeek = new Date(lastCompletionDate);
        startOfLastCompletedWeek.setUTCDate(lastCompletionDate.getUTCDate() - lastDateWeekDay);

        for (let w = 0; w < 104; w++) {
            const weekStart = new Date(startOfLastCompletedWeek);
            weekStart.setUTCDate(startOfLastCompletedWeek.getUTCDate() - (w * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
            
            const completionsThisWeek = habitRecords.filter(r => {
                const recordDate = new Date(r.completed_at + "T00:00:00Z");
                return recordDate >= weekStart && recordDate <= weekEnd;
            }).length;
            
            if (completionsThisWeek >= count) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    let streak = 0;
    let currentDate = new Date(lastCompletionDate);

    for (let i = 0; i < 365; i++) {
        const dateToCheck = new Date(currentDate);
        dateToCheck.setUTCDate(currentDate.getUTCDate() - i);

        if (isDayApplicable(dateToCheck, habit.frequency)) {
            const dateKey = dateToCheck.toISOString().split('T')[0];
            if (completedDates.has(dateKey)) {
                streak++;
            } else {
                break;
            }
        }
    }

    return streak;
};

const calculateLongestStreak = (habit: Habit, records: HabitRecord[]): number => {
    const habitRecords = records.filter(r => r.habit_id === habit.id);
    if (habitRecords.length === 0) return 0;

    const completedDates = new Set(habitRecords.map(r => r.completed_at));
    const sortedDateStrings = Array.from(completedDates).sort();
    if (sortedDateStrings.length === 0) return 0;

    if (habit.frequency.type === 'times_per_week') {
        let longestStreak = 0;
        let currentStreak = 0;
        const count = habit.frequency.count;
        const firstDate = new Date(sortedDateStrings[0] + "T00:00:00Z");
        const firstDayOfWeek = firstDate.getUTCDay();
        const startOfWeek = new Date(firstDate);
        startOfWeek.setUTCDate(firstDate.getUTCDate() - firstDayOfWeek);
        const today = new Date();

        while (startOfWeek <= today) {
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
            
            const completionsThisWeek = habitRecords.filter(r => {
                const recordDate = new Date(r.completed_at + "T00:00:00Z");
                return recordDate >= startOfWeek && recordDate <= endOfWeek;
            }).length;

            if (completionsThisWeek >= count) {
                currentStreak++;
            } else {
                longestStreak = Math.max(longestStreak, currentStreak);
                currentStreak = 0;
            }
            startOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7);
        }
        return Math.max(longestStreak, currentStreak);
    }
    
    let longestStreak = 0;
    let currentStreak = 0;
    const firstDate = new Date(sortedDateStrings[0] + "T00:00:00Z");
    const lastDate = new Date(sortedDateStrings[sortedDateStrings.length - 1] + "T00:00:00Z");

    for (let d = firstDate; d <= lastDate; d.setUTCDate(d.getUTCDate() + 1)) {
        if (isDayApplicable(d, habit.frequency)) {
            const dateKey = d.toISOString().split('T')[0];
            if (completedDates.has(dateKey)) {
                currentStreak++;
            } else {
                longestStreak = Math.max(longestStreak, currentStreak);
                currentStreak = 0;
            }
        }
    }
    return Math.max(longestStreak, currentStreak);
};

const ActivityCalendar: React.FC<{ habit: Habit, records: HabitRecord[] }> = ({ habit, records }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const completedDates = useMemo(() => new Set(records.filter(r => r.habit_id === habit.id).map(r => r.completed_at)), [habit.id, records]);

    const handlePrevMonth = () => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

    const renderDays = () => {
        const month = viewDate.getMonth();
        const year = viewDate.getFullYear();
        const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) { days.push(<div key={`empty-${i}`} />); }
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dateKey = date.toISOString().split('T')[0];
            const isCompleted = completedDates.has(dateKey);
            const colorClass = isCompleted ? 'bg-purple-400 dark:bg-purple-500' : 'bg-gray-200/50 dark:bg-gray-700/50';
            days.push(<div key={day} title={dateKey} className={`w-full aspect-square rounded ${colorClass}`} />);
        }
        return days;
    };

    return (
        <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
                <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400">Calendario de Actividad</h5>
                <div className="flex items-center gap-1">
                    <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-24 text-center">{viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                    <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronRightIcon /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
        </div>
    );
};


const HabitStats: React.FC<{ habit: Habit, records: HabitRecord[] }> = ({ habit, records }) => {
    const currentStreak = useMemo(() => calculateStreak(habit, records), [habit, records]);
    const longestStreak = useMemo(() => calculateLongestStreak(habit, records), [habit, records]);
    const totalCompletions = useMemo(() => records.filter(r => r.habit_id === habit.id).length, [habit.id, records]);

    const weeklyComplianceData = useMemo(() => {
        const data = [];
        const today = new Date();
        const dayOfWeek = (today.getDay() === 0) ? 6 : today.getDay() - 1; 
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - dayOfWeek);
        weekStart.setHours(0,0,0,0);
        
        for (let i = 5; i >= 0; i--) {
            const startOfWeek = new Date(weekStart);
            startOfWeek.setDate(startOfWeek.getDate() - (i * 7));
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            
            let applicableDays = 0;
            let completedDays = 0;

            for(let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
                if (d > today) continue;
                if (isDayApplicable(d, habit.frequency)) {
                    applicableDays++;
                    const dateKey = d.toISOString().split('T')[0];
                    if (records.some(r => r.habit_id === habit.id && r.completed_at === dateKey)) {
                        completedDays++;
                    }
                }
            }
            
            let percentage = 0;
            if (habit.frequency.type === 'times_per_week') {
                percentage = applicableDays > 0 ? Math.min(100, (completedDays / habit.frequency.count) * 100) : 0;
            } else {
                percentage = applicableDays > 0 ? (completedDays / applicableDays) * 100 : 0;
            }
            data.push({
                label: `${startOfWeek.getDate()}/${startOfWeek.getMonth()+1}`,
                percentage
            });
        }
        return data;
    }, [habit, records]);

    return (
        <div className="bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl shadow-sm animate-fade-in">
             <div className="flex items-center gap-3">
                <span className="text-2xl">{habit.emoji}</span>
                <p className="font-semibold text-gray-700 dark:text-gray-200 truncate">{habit.name}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center mt-3">
                <div className="bg-black/5 dark:bg-black/20 p-2 rounded-lg">
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{currentStreak}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Racha Actual</p>
                </div>
                <div className="bg-black/5 dark:bg-black/20 p-2 rounded-lg">
                    <p className="text-xl font-bold text-orange-500 dark:text-orange-400">{longestStreak}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Racha Máxima</p>
                </div>
                 <div className="bg-black/5 dark:bg-black/20 p-2 rounded-lg">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{totalCompletions}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                </div>
            </div>

            <div className="mt-4">
                <h5 className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Cumplimiento Semanal</h5>
                <div className="flex items-end justify-between gap-2 h-24 bg-black/5 dark:bg-black/20 p-2 rounded-lg">
                    {weeklyComplianceData.map((week, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group">
                            <div className="relative w-full h-full flex items-end">
                                <div className="absolute inset-x-0 bottom-0 bg-purple-200 dark:bg-purple-900/50 rounded-t" style={{ height: '100%' }}></div>
                                <div className="relative w-full bg-purple-400 dark:bg-purple-500 rounded-t group-hover:bg-purple-500 dark:group-hover:bg-purple-400 transition-all" style={{ height: `${week.percentage}%` }}></div>
                            </div>
                            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">{week.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <ActivityCalendar habit={habit} records={records} />
        </div>
    );
};


const HabitTracker: React.FC<HabitTrackerProps> = (props) => {
    const { habits, records, onOpenHabitCreator, onOpenHabitEditor, onDeleteHabit, onToggleRecord } = props;
    const [weekOffset, setWeekOffset] = useState(0);
    const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
    const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
    const [viewMode, setViewMode] = useState<'week' | 'stats'>('week');
    const menuRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setMenuOpenFor(null);
        }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { weekStart, weekEnd, weekDates, weekDayLabels } = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        today.setDate(today.getDate() + weekOffset * 7);
        const dayOfWeek = (today.getDay() === 0) ? 6 : today.getDay() - 1; 
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - dayOfWeek);

        const dates = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        return date;
        });
        const weekEnd = new Date(dates[6]);
        weekEnd.setHours(23,59,59,999);
        
        const labels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        return { weekStart, weekEnd, weekDates: dates, weekDayLabels: labels };
    }, [weekOffset]);

    const handleConfirmDelete = () => {
        if (habitToDelete) {
        onDeleteHabit(habitToDelete.id);
        setHabitToDelete(null);
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
        <header className="flex-shrink-0 p-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-b border-secondary-light/30 dark:border-gray-700/50 flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-primary-dark dark:text-primary">Mis Hábitos</h2>
            <div className="flex items-center gap-2">
                {viewMode === 'week' ? (
                    <>
                        <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 w-24 text-center">{weekStart.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                        <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronRightIcon /></button>
                    </>
                ) : <div className="w-[156px]" />}
                <button onClick={() => setViewMode(v => v === 'week' ? 'stats' : 'week')} className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400" title={viewMode === 'week' ? 'Ver Estadísticas' : 'Ver Semana'}>
                    {viewMode === 'week' ? <ChartBarIcon /> : <ListIcon />}
                </button>
            </div>
        </header>

        <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">
            {viewMode === 'week' ? (
                <>
                    {habits.map(habit => {
                        let progressText = null;
                        if (habit.frequency.type === 'times_per_week') {
                            const completionsThisWeek = records.filter(r => {
                                const recordDate = new Date(r.completed_at + 'T00:00:00Z');
                                return r.habit_id === habit.id && recordDate >= weekStart && recordDate <= weekEnd;
                            }).length;
                            progressText = `${completionsThisWeek}/${habit.frequency.count} completados`;
                        }
                        const streak = calculateStreak(habit, records);

                        return (
                            <div key={habit.id} className="bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl shadow-sm animate-fade-in">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-grow min-w-0">
                                        <span className="text-2xl">{habit.emoji}</span>
                                        <div>
                                            <p className="font-semibold text-gray-700 dark:text-gray-200 truncate">{habit.name}</p>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <span>{getFrequencyText(habit.frequency)}</span>
                                                {streak > 0 && (
                                                    <span className="flex items-center gap-1 font-bold text-orange-500 dark:text-orange-400">
                                                        {streak >= 3 && '🔥'} {streak} {habit.frequency.type === 'times_per_week' ? 'sem' : 'd'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="relative flex-shrink-0">
                                        <button onClick={() => setMenuOpenFor(habit.id)} className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full">
                                            <DotsVerticalIcon />
                                        </button>
                                        {menuOpenFor === habit.id && (
                                            <div ref={menuRef} className="absolute right-0 mt-1 w-32 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg shadow-xl z-10 animate-pop-in origin-top-right p-1">
                                                <button onClick={() => { onOpenHabitEditor(habit); setMenuOpenFor(null); }} className="w-full text-left px-3 py-1.5 text-sm rounded-md text-gray-700 dark:text-gray-200 hover:bg-secondary-lighter dark:hover:bg-gray-700">Editar</button>
                                                <button onClick={() => { setHabitToDelete(habit); setMenuOpenFor(null); }} className="w-full text-left px-3 py-1.5 text-sm rounded-md text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40">Eliminar</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {progressText && <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-2 ml-12">{progressText}</p>}
                                <div className="flex items-center justify-between mt-3">
                                {weekDates.map((date, index) => {
                                    const dateKey = formatDateKey(date);
                                    const isCompleted = completedRecords.has(`${habit.id}-${dateKey}`);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    // FIX: Pass habit.frequency to isDayApplicable and invert the logic to correctly disable the button.
                                    const isDisabled = !isDayApplicable(date, habit.frequency) || date > today;

                                    return (
                                    <div key={dateKey} className="flex flex-col items-center gap-1">
                                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{weekDayLabels[index]}</span>
                                        <button 
                                            onClick={() => onToggleRecord(habit.id, dateKey)}
                                            disabled={isDisabled}
                                            className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center ${
                                                isDisabled ? 'bg-gray-100/50 dark:bg-gray-800/50 cursor-not-allowed' : 
                                                isCompleted ? 'bg-purple-500 dark:bg-purple-600' : 'bg-gray-200/70 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-600'
                                            }`}
                                        >
                                        <span className={`text-xs font-bold ${
                                                isDisabled ? 'text-gray-300 dark:text-gray-600' : 
                                                isCompleted ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                                            }`}>{date.getDate()}</span>
                                        </button>
                                    </div>
                                    )
                                })}
                                </div>
                            </div>
                        );
                    })}
                    <button onClick={onOpenHabitCreator} className="w-full bg-white/50 dark:bg-gray-800/50 border-2 border-dashed border-secondary-light dark:border-gray-600 rounded-xl p-3 text-center text-primary-dark dark:text-primary font-semibold hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors flex items-center justify-center gap-2">
                        <PlusIcon />
                        Añadir Hábito
                    </button>
                </>
            ) : (
                habits.map(habit => <HabitStats key={habit.id} habit={habit} records={records} />)
            )}
        </div>
        <ConfirmationModal
            isOpen={!!habitToDelete}
            onClose={() => setHabitToDelete(null)}
            onConfirm={handleConfirmDelete}
            title="Eliminar Hábito"
            message={`¿Seguro que quieres eliminar "${habitToDelete?.name}"? Se borrará todo su historial.`}
            confirmText="Sí, eliminar"
        />
        </div>
    );
};

export default HabitTracker;