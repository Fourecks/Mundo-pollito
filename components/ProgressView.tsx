import React, { useState, useMemo } from 'react';
import { Todo, Project, Habit, HabitRecord, HabitFrequency } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import ChickenIcon from './ChickenIcon';

// --- Helper Functions (copied/adapted from HabitTracker) ---
const weekdayLabelsShort = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];

const isDayApplicable = (date: Date, freq: HabitFrequency): boolean => {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    switch (freq.type) {
        case 'daily':
        case 'times_per_week':
            return true;
        case 'specific_days':
            return freq.days.includes(utcDate.getUTCDay());
        case 'interval': {
            if (!freq.startDate) return false;
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
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    let streak = 0;
    for (let i = 0; i < 365; i++) {
        const dateToCheck = new Date(today);
        dateToCheck.setUTCDate(today.getUTCDate() - i);

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
// --- End Helper Functions ---


interface ProgressViewProps {
    allTodos: { [key: string]: Todo[] };
    projects: Project[];
    habits: Habit[];
    habitRecords: HabitRecord[];
    onBack?: () => void;
}

const ProgressView: React.FC<ProgressViewProps> = ({ allTodos, projects, habits, habitRecords, onBack }) => {
    const [period, setPeriod] = useState<'week' | 'month'>('week');
    const [offset, setOffset] = useState(0);

    const { start, end, rangeLabel } = useMemo(() => {
        const now = new Date();
        now.setHours(0,0,0,0);

        if (period === 'week') {
            const currentDay = now.getDay();
            const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;
            
            const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset + (offset * 7));
            const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
            
            const startStr = startDate.toLocaleDateString('es-ES', { day: 'numeric' });
            const endStr = endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            
            return { start: startDate, end: endDate, rangeLabel: offset === 0 ? 'Esta Semana' : `${startStr} - ${endStr}` };
        } else { // month
            const startDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);

            const label = startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
            return { start: startDate, end: endDate, rangeLabel: label.charAt(0).toUpperCase() + label.slice(1) };
        }
    }, [period, offset]);

    const completedTasksInPeriod = useMemo(() => {
        const tasks = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateKey = d.toISOString().split('T')[0];
            const dayTasks = allTodos[dateKey] || [];
            tasks.push(...dayTasks.filter(t => t.completed && new Date(t.due_date!) >= start && new Date(t.due_date!) <= end));
        }
        return tasks;
    }, [allTodos, start, end]);

    const tasksByDay = useMemo(() => {
        const days = new Map<string, number>();
        let labels: string[];
        if (period === 'week') {
            labels = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
            labels.forEach(l => days.set(l, 0));
        } else {
            labels = Array.from({ length: end.getDate() }, (_, i) => String(i + 1));
            labels.forEach(l => days.set(l, 0));
        }

        completedTasksInPeriod.forEach(task => {
            const taskDate = new Date(task.due_date! + 'T00:00:00Z');
            const dayOfWeek = (taskDate.getUTCDay() + 6) % 7; // Monday is 0
            const dayLabel = period === 'week' ? labels[dayOfWeek] : String(taskDate.getUTCDate());
            if (days.has(dayLabel)) {
                days.set(dayLabel, days.get(dayLabel)! + 1);
            }
        });
        
        return { data: Array.from(days.entries()), labels };
    }, [completedTasksInPeriod, period, end]);
    
    const mostProductiveDay = useMemo(() => {
        if (tasksByDay.data.length === 0) return null;
        const productiveDay = tasksByDay.data.reduce((max, current) => current[1] > max[1] ? current : max, tasksByDay.data[0]);
        if (productiveDay[1] === 0) return null;
        return { day: productiveDay[0], count: productiveDay[1] };
    }, [tasksByDay]);

    const maxTasksOnDay = Math.max(1, ...tasksByDay.data.map(([, count]) => count));

    const topHabits = useMemo(() => {
        return habits
            .map(h => ({ ...h, streak: calculateStreak(h, habitRecords) }))
            .filter(h => h.streak > 0)
            .sort((a, b) => b.streak - a.streak)
            .slice(0, 3);
    }, [habits, habitRecords]);

    const projectFocus = useMemo(() => {
        const counts = new Map<number, { count: number; name: string; color: string | null }>();
        completedTasksInPeriod.forEach(task => {
            if (task.project_id) {
                const existing = counts.get(task.project_id) || { count: 0, name: '', color: null };
                counts.set(task.project_id, { ...existing, count: existing.count + 1 });
            }
        });

        projects.forEach(p => {
            if (counts.has(p.id)) {
                const data = counts.get(p.id)!;
                counts.set(p.id, { ...data, name: p.name, color: p.color });
            }
        });
        const total = Array.from(counts.values()).reduce((sum, p) => sum + p.count, 0);
        return {
            data: Array.from(counts.values()).sort((a, b) => b.count - a.count),
            total: total
        };
    }, [completedTasksInPeriod, projects]);

    return (
        <div className="flex flex-col h-full bg-transparent p-4">
            {onBack && (
                <header className="flex-shrink-0 flex items-center gap-2 mb-2 md:hidden">
                    <button onClick={onBack} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                    <h2 className="font-bold text-lg text-primary-dark dark:text-primary">Informe de Crecimiento</h2>
                </header>
            )}
            <header className="flex-shrink-0 flex items-center justify-between gap-4 mb-4">
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full p-1 flex items-center gap-1 shadow-md">
                    <button onClick={() => setPeriod('week')} className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${period === 'week' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-primary' : 'text-gray-600 dark:text-gray-300'}`}>Semana</button>
                    <button onClick={() => setPeriod('month')} className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${period === 'month' ? 'bg-white dark:bg-gray-600 shadow text-primary-dark dark:text-primary' : 'text-gray-600 dark:text-gray-300'}`}>Mes</button>
                </div>
                <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full p-1 flex items-center gap-1 shadow-md">
                    <button onClick={() => setOffset(offset - 1)} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"><ChevronLeftIcon /></button>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200 w-32 text-center">{rangeLabel}</span>
                    <button onClick={() => setOffset(offset + 1)} disabled={offset >= 0} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRightIcon /></button>
                </div>
            </header>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 -mr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tareas Completadas */}
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-3">Tareas Completadas ({completedTasksInPeriod.length})</h3>
                        <div className={`flex items-end justify-between gap-1 h-32 bg-black/5 dark:bg-black/20 p-2 rounded-lg ${period === 'month' ? 'overflow-x-auto custom-scrollbar' : ''}`}>
                            {tasksByDay.data.map(([label, count], i) => (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1 group min-w-[20px]">
                                    <div className="relative w-full h-full flex items-end">
                                        <div className={`w-full bg-primary rounded-t-sm group-hover:bg-primary-dark transition-all`} style={{ height: `${(count / maxTasksOnDay) * 100}%` }}>
                                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xs font-bold text-primary-dark dark:text-primary opacity-0 group-hover:opacity-100 transition-opacity">{count}</span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Rachas de Hábitos */}
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-3">Rachas de Hábitos</h3>
                        {topHabits.length > 0 ? (
                            <div className="space-y-2">
                                {topHabits.map((habit, index) => (
                                    <div key={habit.id} className="bg-black/5 dark:bg-black/20 p-2 rounded-lg flex items-center gap-3">
                                        <span className={`font-bold text-lg ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-400'}`}>{index + 1}</span>
                                        <span className="text-xl">{habit.emoji}</span>
                                        <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm truncate flex-grow">{habit.name}</p>
                                        <p className="font-bold text-orange-500 dark:text-orange-400 text-sm">🔥 {habit.streak} días</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-10">¡Sigue con tus hábitos para ver tus rachas aquí!</div>
                        )}
                    </div>
                    {/* Tu Día Más Productivo */}
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-3">Tu Día Más Productivo</h3>
                         {mostProductiveDay ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <ChickenIcon className="w-16 h-16 text-yellow-500 drop-shadow-lg" />
                                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">{period === 'week' ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][tasksByDay.labels.indexOf(mostProductiveDay.day)] : `Día ${mostProductiveDay.day}`}</p>
                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{mostProductiveDay.count} tareas completadas</p>
                            </div>
                        ) : (
                            <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-10">¡Completa algunas tareas para descubrir tu día más productivo!</div>
                        )}
                    </div>
                     {/* Enfoque en Proyectos */}
                    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 shadow-sm">
                        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm mb-3">Enfoque en Proyectos</h3>
                        {projectFocus.data.length > 0 ? (
                            <div className="space-y-2">
                                {projectFocus.data.map((p) => (
                                    <div key={p.name} className="flex items-center gap-3">
                                        <div style={{ backgroundColor: p.color || 'var(--color-primary)' }} className="w-2 h-5 rounded-full" />
                                        <p className="font-semibold text-gray-700 dark:text-gray-200 text-sm truncate flex-grow">{p.name}</p>
                                        <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">{p.count}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-10">Completa tareas de tus proyectos para ver tu enfoque.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressView;