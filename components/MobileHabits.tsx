import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Check, 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    CalendarDays, 
    Flame, 
    CheckCircle2, 
    Circle,
    TrendingUp,
    ArrowLeft,
    Trash2,
    Lock,
    Target,
    Activity,
    Info,
    CheckSquare
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart,
    Area,
    LineChart, 
    Line,
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid,
    Cell
} from 'recharts';
import { format, addDays, subDays, isSameDay, startOfWeek, eachDayOfInterval, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { Habit, HabitRecord, HabitFrequency, FrequencyType } from '../types';

interface MobileHabitsProps {
    habits: Habit[];
    records: HabitRecord[];
    onOpenHabitCreator?: () => void;
    onOpenHabitEditor?: (habit: Habit) => void;
    onDeleteHabit: (id: string | number) => void;
    onToggleRecord: (habitId: string, dateStr: string, completed: boolean, value?: number) => void;
    onAddHabit?: (name: string, emoji: string, frequency: HabitFrequency) => void;
    onUpdateHabit?: (id: number, name: string, emoji: string, frequency: HabitFrequency) => void;
}

const formatDateKey = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getStartOfWeekLocal = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d;
};

// Validates whether a day is applicable for a given habit's frequency
export const isDayApplicable = (date: Date, freq: HabitFrequency): boolean => {
    if (!freq || !freq.type) return true;
    switch (freq.type) {
        case 'daily':
        case 'times_per_week':
            return true;
        case 'specific_days':
            return Array.isArray(freq.days) && freq.days.includes(date.getDay());
        case 'interval': {
            if (!freq.startDate || typeof freq.days !== 'number' || freq.days <= 0) return false;
            const [year, month, day] = freq.startDate.split('-').map(Number);
            const startDate = new Date(year, month - 1, day);
            const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const diffTime = checkDate.getTime() - startDate.getTime();
            if (diffTime < 0) return false;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            return diffDays % freq.days === 0;
        }
        default:
            return true;
    }
};

// Calculates current streak
const calculateStreak = (habit: Habit, records: HabitRecord[]): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const habitRecords = records.filter(r => {
        if (Number(r.habit_id) !== Number(habit.id)) return false;
        const [y, m, d] = r.completed_at.split('-').map(Number);
        const recDate = new Date(y, m - 1, d);
        return recDate.getTime() <= today.getTime();
    });

    if (habitRecords.length === 0) return 0;
    const completedDates = new Set(habitRecords.map(r => r.completed_at));
    let streak = 0;

    if (habit.frequency.type === 'times_per_week') {
        let weeksToCheck = 0;
        while (weeksToCheck < 104) {
            const weekStart = getStartOfWeekLocal(today);
            weekStart.setDate(weekStart.getDate() - (weeksToCheck * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            let completionsThisWeek = 0;
            for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
                if (d.getTime() <= today.getTime() && completedDates.has(formatDateKey(d))) {
                    completionsThisWeek++;
                }
            }

            if (weeksToCheck === 0) {
                if (completionsThisWeek >= habit.frequency.count) streak++;
            } else {
                if (completionsThisWeek >= habit.frequency.count) streak++;
                else break;
            }
            weeksToCheck++;
        }
        return streak;
    }

    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (isDayApplicable(currentDate, habit.frequency)) {
        if (completedDates.has(formatDateKey(currentDate))) {
            streak++;
        }
    }

    for (let i = 1; i < 365; i++) {
        const dateToCheck = new Date(currentDate);
        dateToCheck.setDate(currentDate.getDate() - i);
        if (isDayApplicable(dateToCheck, habit.frequency)) {
            if (completedDates.has(formatDateKey(dateToCheck))) {
                streak++;
            } else {
                break;
            }
        }
    }

    return streak;
};

// Calculates longest streak
const calculateLongestStreak = (habit: Habit, records: HabitRecord[]): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const habitRecords = records.filter(r => {
        if (Number(r.habit_id) !== Number(habit.id)) return false;
        const [y, m, d] = r.completed_at.split('-').map(Number);
        const recDate = new Date(y, m - 1, d);
        return recDate.getTime() <= today.getTime();
    });

    if (habitRecords.length === 0) return 0;
    const completedDates = new Set(habitRecords.map(r => r.completed_at));
    const sortedDateStrings = Array.from(completedDates).sort();
    if (sortedDateStrings.length === 0) return 0;

    const [firstY, firstM, firstD] = sortedDateStrings[0].split('-').map(Number);
    const startDate = new Date(firstY, firstM - 1, firstD);

    let maxStreak = 0;
    let currentStreak = 0;

    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
        if (isDayApplicable(d, habit.frequency)) {
            if (completedDates.has(formatDateKey(d))) {
                currentStreak++;
                if (currentStreak > maxStreak) maxStreak = currentStreak;
            } else {
                currentStreak = 0;
            }
        }
    }
    return maxStreak;
};

// Curated categorized emoji collections
export const EMOJI_CATEGORIES = [
    {
        id: 'all',
        label: 'Todos',
        emojis: [
            // Agua y Fitness
            '💧', '🏃', '🚴', '🏋️', '🧘', '🏊', '🤸', '🧗', '🚶', '🥊', '⚽', '🏀', '🎾', '⛹️', '🥋', '💪', '🩺', '💊',
            // Nutrición
            '🥗', '🥑', '🍎', '🍌', '🥦', '🥕', '🧃', '🍵', '☕', '🫖', '🍳', '🥜', '🍇', '🍉', '🍊', '🍓', '🫐', '🥒', '🥩', '🥚',
            // Mente & Estudio
            '📚', '✍️', '🧠', '🎯', '💡', '📖', '🎓', '💻', '🎨', '♟️', '🧩', '📝', '🔍', '🎧', '🎻', '🎹', '🧘‍♂️', '🕯️', '🗣️', '🌍',
            // Rutinas & Hogar
            '⏰', '📅', '⏱️', '📋', '☀️', '🌙', '🌅', '🧹', '🚿', '🪥', '🪴', '🐶', '🐱', '💰', '💳', '🚫', '🚭', '✨', '🌱', '🏆',
            // Bienestar & Sueño
            '💤', '🛌', '🛀', '🧖', '💆', '❤️', '🔥', '⭐', '🚀', '🌺', '🍀', '🌈', '🕊️', '🧘‍♀️', '🪞', '🧴'
        ]
    },
    {
        id: 'fitness',
        label: 'Salud & Fitness',
        emojis: ['💧', '🏃', '🚴', '🏋️', '🧘', '🏊', '🤸', '🧗', '🚶', '🥊', '⚽', '🏀', '🎾', '⛹️', '🥋', '💪', '🩺', '💊', '🫀', '🩹', '🎽']
    },
    {
        id: 'nutrition',
        label: 'Nutrición',
        emojis: ['🥗', '🥑', '🍎', '🍌', '🥦', '🥕', '🧃', '🍵', '☕', '🫖', '🍳', '🥜', '🍇', '🍉', '🍊', '🍓', '🫐', '🥒', '🥩', '🥚', '🥝', '🥣']
    },
    {
        id: 'mind',
        label: 'Mente & Foco',
        emojis: ['📚', '✍️', '🧠', '🎯', '💡', '📖', '🎓', '💻', '🎨', '♟️', '🧩', '📝', '🔍', '🎧', '🎻', '🎹', '🧘‍♂️', '🕯️', '🗣️', '🌍', '📐', '🔬']
    },
    {
        id: 'routines',
        label: 'Rutinas & Hogar',
        emojis: ['⏰', '📅', '⏱️', '📋', '☀️', '🌙', '🌅', '🧹', '🚿', '🪥', '🪴', '🐶', '🐱', '💰', '💳', '🚫', '🚭', '✨', '🌱', '🏆', '🎒', '🚪']
    },
    {
        id: 'wellness',
        label: 'Bienestar & Sueño',
        emojis: ['💤', '🛌', '🛀', '🧖', '💆', '❤️', '🔥', '⭐', '🚀', '🌺', '🍀', '🌈', '🕊️', '🧘‍♀️', '🪞', '🧴', '🛋️', '🕯️', '🌻']
    }
];

const weekdayItems = [
    { label: 'Lun', index: 1 },
    { label: 'Mar', index: 2 },
    { label: 'Mié', index: 3 },
    { label: 'Jue', index: 4 },
    { label: 'Vie', index: 5 },
    { label: 'Sáb', index: 6 },
    { label: 'Dom', index: 0 }
];

const MobileHabits: React.FC<MobileHabitsProps> = ({
    habits = [],
    records = [],
    onDeleteHabit,
    onToggleRecord,
    onAddHabit,
    onUpdateHabit
}) => {
    // Navigation Subpage: 'main' | 'weekly' | 'stats' | 'create' | 'edit'
    const [subPage, setSubPage] = useState<'main' | 'weekly' | 'stats' | 'create' | 'edit'>('main');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [weeklyWeekStart, setWeeklyWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
    const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Form states for Create / Edit
    const [formName, setFormName] = useState('');
    const [formEmoji, setFormEmoji] = useState('💧');
    const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('all');
    const [formFrequency, setFormFrequency] = useState<HabitFrequency>({ type: 'daily' });

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    const todayDateKey = formatDateKey(todayObj);
    const selectedDateKey = formatDateKey(selectedDate);
    const isSelectedDateToday = isSameDay(selectedDate, todayObj);
    const isSelectedDateFuture = isAfter(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()), todayObj);

    // Helper: is habit completed on a specific date
    const isHabitCompletedOnDate = (habitId: number | string, dStr: string) => {
        const idNum = Number(habitId);
        return records.some(r => Number(r.habit_id) === idNum && r.completed_at === dStr);
    };

    // Toggle record
    const handleToggle = (habit: Habit, dateToToggle: Date) => {
        const dStr = formatDateKey(dateToToggle);
        const checkDate = new Date(dateToToggle.getFullYear(), dateToToggle.getMonth(), dateToToggle.getDate());
        
        // Prevent ticking future dates!
        if (isAfter(checkDate, todayObj)) {
            return;
        }

        // Prevent ticking non-applicable frequency days unless it's times_per_week
        if (!isDayApplicable(dateToToggle, habit.frequency) && habit.frequency.type !== 'times_per_week') {
            return;
        }

        const isCurrentlyCompleted = isHabitCompletedOnDate(habit.id, dStr);
        onToggleRecord(habit.id.toString(), dStr, !isCurrentlyCompleted);
    };

    // Day Switchers
    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
    const handleResetToToday = () => setSelectedDate(new Date());

    // Week Switchers for Weekly View
    const handlePrevWeek = () => setWeeklyWeekStart(subDays(weeklyWeekStart, 7));
    const handleNextWeek = () => setWeeklyWeekStart(addDays(weeklyWeekStart, 7));
    const handleResetToThisWeek = () => setWeeklyWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

    const weekDays = useMemo(() => {
        return eachDayOfInterval({ start: weeklyWeekStart, end: addDays(weeklyWeekStart, 6) });
    }, [weeklyWeekStart]);

    // Open Form Handlers
    const handleOpenCreate = () => {
        setHabitToEdit(null);
        setFormName('');
        setFormEmoji('💧');
        setFormFrequency({ type: 'daily' });
        setShowDeleteConfirm(false);
        setSubPage('create');
    };

    const handleOpenEdit = (habit: Habit) => {
        setHabitToEdit(habit);
        setFormName(habit.name || '');
        setFormEmoji(habit.emoji || '💧');
        setFormFrequency(habit.frequency || { type: 'daily' });
        setShowDeleteConfirm(false);
        setSubPage('edit');
    };

    const handleSaveHabitForm = () => {
        if (!formName.trim()) return;
        if (habitToEdit && onUpdateHabit) {
            onUpdateHabit(habitToEdit.id, formName.trim(), formEmoji || '💧', formFrequency);
        } else if (onAddHabit) {
            onAddHabit(formName.trim(), formEmoji || '💧', formFrequency);
        }
        setSubPage('main');
    };

    const handleDeleteHabitAction = () => {
        if (!habitToEdit) return;
        onDeleteHabit(habitToEdit.id);
        setSubPage('main');
    };

    // Calculations for Today's progress
    const habitsForSelectedDay = useMemo(() => {
        return habits.filter(h => isDayApplicable(selectedDate, h.frequency));
    }, [habits, selectedDate]);

    const completedTodayCount = habitsForSelectedDay.filter(h => isHabitCompletedOnDate(h.id, selectedDateKey)).length;
    const progressToday = habitsForSelectedDay.length > 0 ? Math.round((completedTodayCount / habitsForSelectedDay.length) * 100) : 0;

    // --- STATISTICS COMPUTATIONS ---
    const statsData = useMemo(() => {
        // Last 14 days completion trend for Recharts
        const chartDays = Array.from({ length: 14 }, (_, i) => {
            const d = subDays(todayObj, 13 - i);
            const dKey = formatDateKey(d);
            const totalScheduled = habits.filter(h => isDayApplicable(d, h.frequency)).length;
            const completedCount = habits.filter(h => isHabitCompletedOnDate(h.id, dKey)).length;
            const percentage = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0;
            return {
                dayLabel: format(d, 'd MMM', { locale: es }),
                completados: completedCount,
                programados: totalScheduled,
                porcentaje: percentage,
                isToday: isSameDay(d, todayObj)
            };
        });

        // Overall stats
        const totalRecordsCount = records.length;
        const bestStreakOverall = habits.reduce((max, h) => {
            const s = calculateLongestStreak(h, records);
            return s > max ? s : max;
        }, 0);

        // Weekly compliance rate (last 7 days)
        const last7 = chartDays.slice(7);
        const avgCompliance7Days = last7.length > 0 
            ? Math.round(last7.reduce((acc, curr) => acc + curr.porcentaje, 0) / last7.length)
            : 0;

        return {
            chartDays,
            totalRecordsCount,
            bestStreakOverall,
            avgCompliance7Days
        };
    }, [habits, records, todayObj]);

    // ==========================================
    // PAGE: VISTA SEMANAL (FULL SCREEN)
    // ==========================================
    if (subPage === 'weekly') {
        const weekEnd = addDays(weeklyWeekStart, 6);
        const weekRangeLabel = `${format(weeklyWeekStart, 'd MMM', { locale: es })} - ${format(weekEnd, 'd MMM', { locale: es })}`;

        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-32">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <button 
                        type="button"
                        onClick={() => setSubPage('main')}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                    </button>
                    <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Vista Semanal</h2>
                    <button 
                        type="button"
                        onClick={handleResetToThisWeek}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 active:scale-95"
                    >
                        Esta semana
                    </button>
                </div>

                <div className="flex-1 px-4 pt-4 space-y-4 max-w-lg mx-auto w-full">
                    {/* Week Navigator */}
                    <div className="flex items-center justify-between bg-zinc-100/80 dark:bg-zinc-900/80 p-2 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
                        <button 
                            type="button"
                            onClick={handlePrevWeek}
                            className="p-2 rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            aria-label="Semana anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                            {weekRangeLabel}
                        </span>
                        <button 
                            type="button"
                            onClick={handleNextWeek}
                            className="p-2 rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            aria-label="Semana siguiente"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Week Matrix per Habit */}
                    <div className="space-y-3">
                        {habits.map(habit => {
                            const streak = calculateStreak(habit, records);

                            return (
                                <div 
                                    key={habit.id}
                                    className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3"
                                >
                                    {/* Habit Top Info */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-xl shrink-0">{habit.emoji}</span>
                                            <div className="min-w-0">
                                                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{habit.name}</h3>
                                                <span className="text-[10px] text-zinc-400 font-medium">
                                                    {habit.frequency.type === 'daily' && 'Diario'}
                                                    {habit.frequency.type === 'specific_days' && 'Días seleccionados'}
                                                    {habit.frequency.type === 'times_per_week' && `${habit.frequency.count}x por semana`}
                                                    {habit.frequency.type === 'interval' && `Cada ${habit.frequency.days} días`}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Streak Badge only if streak > 0 */}
                                        {streak > 0 && (
                                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                <span>{streak}d</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* 7 Days Row */}
                                    <div className="grid grid-cols-7 gap-1 pt-1">
                                        {weekDays.map((day, idx) => {
                                            const dayDateKey = formatDateKey(day);
                                            const dayNumber = format(day, 'd');
                                            const dayName = ['L', 'M', 'M', 'J', 'V', 'S', 'D'][idx];
                                            const isDayToday = isSameDay(day, todayObj);
                                            const isFutureDay = isAfter(new Date(day.getFullYear(), day.getMonth(), day.getDate()), todayObj);
                                            const isApplicable = isDayApplicable(day, habit.frequency);
                                            const isCompleted = isHabitCompletedOnDate(habit.id, dayDateKey);

                                            let buttonContent;
                                            let buttonStyle = 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400';

                                            if (isFutureDay) {
                                                buttonStyle = 'bg-zinc-50 dark:bg-zinc-900/30 text-zinc-300 dark:text-zinc-700 opacity-40 cursor-not-allowed';
                                                buttonContent = <span className="text-[10px] font-medium">{dayNumber}</span>;
                                            } else if (!isApplicable && habit.frequency.type !== 'times_per_week') {
                                                buttonStyle = 'bg-zinc-50 dark:bg-zinc-900/40 text-zinc-300 dark:text-zinc-700 cursor-not-allowed';
                                                buttonContent = <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />;
                                            } else if (isCompleted) {
                                                buttonStyle = 'bg-emerald-500 text-white font-bold shadow-xs active:scale-90';
                                                buttonContent = <Check className="w-3.5 h-3.5 stroke-[3]" />;
                                            } else {
                                                buttonStyle = 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold active:scale-90';
                                                buttonContent = <span className="text-[11px]">{dayNumber}</span>;
                                            }

                                            return (
                                                <div key={dayDateKey} className="flex flex-col items-center gap-1">
                                                    <span className={`text-[10px] font-bold ${isDayToday ? 'text-zinc-900 dark:text-white underline' : 'text-zinc-400'}`}>
                                                        {dayName}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        disabled={isFutureDay || (!isApplicable && habit.frequency.type !== 'times_per_week')}
                                                        onClick={() => handleToggle(habit, day)}
                                                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${buttonStyle} ${
                                                            isDayToday && !isCompleted ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : ''
                                                        }`}
                                                        title={isFutureDay ? 'Día futuro (no disponible)' : `${habit.name} - ${dayDateKey}`}
                                                    >
                                                        {buttonContent}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        {habits.length === 0 && (
                            <div className="text-center py-12 text-zinc-400 text-xs">
                                No hay hábitos creados aún.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // PAGE: ESTADÍSTICAS Y DESGLOSE (FULL SCREEN)
    // ==========================================
    if (subPage === 'stats') {
        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-32">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <button 
                        type="button"
                        onClick={() => setSubPage('main')}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                    </button>
                    <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Estadísticas de Hábitos</h2>
                    <div className="w-12" />
                </div>

                <div className="flex-1 px-4 pt-4 space-y-5 max-w-lg mx-auto w-full">
                    {/* KPI Cards Grid - Minimalist Monochrome */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                                Cumplimiento (7d)
                            </span>
                            <div className="text-2xl font-black text-zinc-900 dark:text-white">
                                {statsData.avgCompliance7Days}%
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Flame className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                                Mejor Racha
                            </span>
                            <div className="text-2xl font-black text-zinc-900 dark:text-white">
                                {statsData.bestStreakOverall} <span className="text-xs font-medium text-zinc-400">días</span>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <CheckSquare className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                                Total Registros
                            </span>
                            <div className="text-2xl font-black text-zinc-900 dark:text-white">
                                {statsData.totalRecordsCount}
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1">
                            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                <Target className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                                Hábitos Activos
                            </span>
                            <div className="text-2xl font-black text-zinc-900 dark:text-white">
                                {habits.length}
                            </div>
                        </div>
                    </div>

                    {/* Minimalist Line/Area Chart: Tendencia de Hábitos (14 días) */}
                    <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                                Tendencia de Hábitos (Últimos 14 días)
                            </h3>
                            <span className="text-[10px] font-semibold text-zinc-400">
                                Hábitos cumplidos
                            </span>
                        </div>

                        <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={statsData.chartDays} margin={{ top: 12, right: 8, left: -22, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="monochromeHabitArea" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#71717a" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(113, 113, 122, 0.15)" />
                                    <XAxis 
                                        dataKey="dayLabel" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fill: '#71717a' }}
                                        interval={1}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fill: '#71717a' }} 
                                        domain={[0, 'auto']}
                                        allowDecimals={false}
                                    />
                                    <Tooltip 
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 px-3 py-2 rounded-xl text-[11px] shadow-lg font-medium border border-zinc-800 dark:border-zinc-200">
                                                        <p className="font-bold text-xs">{data.dayLabel}</p>
                                                        <p className="text-zinc-300 dark:text-zinc-700">
                                                            {data.completados} de {data.programados} completados ({data.porcentaje}%)
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="completados" 
                                        stroke="#18181b" 
                                        strokeWidth={2}
                                        fill="url(#monochromeHabitArea)" 
                                        dot={{ r: 3, fill: '#18181b', stroke: '#ffffff', strokeWidth: 1.5 }}
                                        activeDot={{ r: 5, fill: '#18181b', stroke: '#ffffff', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Desglose por Hábito (Sin "tot", con gráficos de barra de progreso y métricas reales) */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Desglose por Hábito</h3>
                        <div className="space-y-2.5">
                            {habits.map(habit => {
                                const streak = calculateStreak(habit, records);
                                
                                // Count total completions for this habit
                                const habitRecords = records.filter(r => Number(r.habit_id) === Number(habit.id));
                                const totalCompletions = habitRecords.length;

                                // Last 30 days compliance
                                const last30Days = Array.from({ length: 30 }, (_, i) => subDays(todayObj, i));
                                const applicableCount30 = last30Days.filter(d => isDayApplicable(d, habit.frequency)).length;
                                const completedCount30 = last30Days.filter(d => isHabitCompletedOnDate(habit.id, formatDateKey(d))).length;
                                const complianceRate30 = applicableCount30 > 0 ? Math.round((completedCount30 / applicableCount30) * 100) : 0;

                                return (
                                    <div 
                                        key={habit.id}
                                        className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="text-xl">{habit.emoji}</span>
                                                <div className="min-w-0">
                                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{habit.name}</h4>
                                                    <span className="text-[10px] text-zinc-400">
                                                        {totalCompletions} {totalCompletions === 1 ? 'completado' : 'completados'} en total
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Streak Badge only if streak > 0 */}
                                            {streak > 0 && (
                                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300/60 dark:border-zinc-700/60">
                                                    <Flame className="w-3 h-3 text-zinc-900 dark:text-zinc-100 fill-zinc-900 dark:fill-zinc-100" />
                                                    <span>{streak}d</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress Bar for consistency */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-semibold text-zinc-500">
                                                <span>Consistencia (30 días)</span>
                                                <span className="text-zinc-900 dark:text-zinc-100 font-bold">{complianceRate30}%</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all duration-500"
                                                    style={{ width: `${complianceRate30}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // PAGE: CREAR / EDITAR HÁBITO (FULL SCREEN)
    // ==========================================
    if (subPage === 'create' || subPage === 'edit') {
        const isEditing = subPage === 'edit' && habitToEdit !== null;
        const activeCategoryData = EMOJI_CATEGORIES.find(c => c.id === selectedEmojiCategory) || EMOJI_CATEGORIES[0];

        return (
            <div className="flex flex-col min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-32">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <button 
                        type="button"
                        onClick={() => setSubPage('main')}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white px-2.5 py-1.5 rounded-xl active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                    </button>
                    <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {isEditing ? 'Editar Hábito' : 'Nuevo Hábito'}
                    </h2>
                    <button 
                        type="button"
                        onClick={handleSaveHabitForm}
                        disabled={!formName.trim()}
                        className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 disabled:opacity-40 active:scale-95 transition-all shadow-xs"
                    >
                        Guardar
                    </button>
                </div>

                <div className="flex-1 px-5 pt-5 space-y-6 max-w-lg mx-auto w-full">
                    {/* Emoji + Name */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nombre del Hábito</label>
                        <div className="flex gap-2.5 items-center">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-2xl shrink-0">
                                {formEmoji}
                            </div>
                            <input 
                                type="text"
                                value={formName}
                                onChange={e => setFormName(e.target.value)}
                                placeholder="Ej: Beber 2L de agua"
                                autoFocus
                                className="flex-1 px-4 py-3 text-base rounded-2xl bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-hidden"
                            />
                        </div>

                        {/* Categorized & Horizontally Scrollable Emoji Picker */}
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">Seleccionar icono</span>
                                <span className="text-[10px] text-zinc-400">Desliza horizontalmente</span>
                            </div>

                            {/* Category chips */}
                            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1 touch-pan-x">
                                {EMOJI_CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setSelectedEmojiCategory(cat.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                            selectedEmojiCategory === cat.id
                                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                                                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>

                            {/* 2-row horizontally scrollable emoji strip */}
                            <div className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto no-scrollbar py-2 px-1 touch-pan-x snap-x">
                                {activeCategoryData.emojis.map(em => (
                                    <button
                                        key={em}
                                        type="button"
                                        onClick={() => setFormEmoji(em)}
                                        className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center shrink-0 snap-start transition-all ${
                                            formEmoji === em 
                                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 scale-105 shadow-xs border border-zinc-900 dark:border-white' 
                                                : 'bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
                                        }`}
                                    >
                                        {em}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Frequency Selector */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Frecuencia</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { type: 'daily' as FrequencyType, label: 'Diariamente' },
                                { type: 'specific_days' as FrequencyType, label: 'Días específicos' },
                                { type: 'times_per_week' as FrequencyType, label: 'Veces por semana' },
                                { type: 'interval' as FrequencyType, label: 'Intervalo' }
                            ].map(opt => {
                                const isSelected = formFrequency.type === opt.type;
                                return (
                                    <button
                                        key={opt.type}
                                        type="button"
                                        onClick={() => {
                                            if (opt.type === 'daily') setFormFrequency({ type: 'daily' });
                                            if (opt.type === 'specific_days') setFormFrequency({ type: 'specific_days', days: [1, 2, 3, 4, 5] });
                                            if (opt.type === 'times_per_week') setFormFrequency({ type: 'times_per_week', count: 3 });
                                            if (opt.type === 'interval') setFormFrequency({ type: 'interval', days: 2, startDate: todayDateKey });
                                        }}
                                        className={`py-3 px-3 rounded-2xl border text-xs font-semibold text-center transition-all ${
                                            isSelected 
                                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-xs' 
                                                : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Specific Days Selector */}
                        {formFrequency.type === 'specific_days' && (
                            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                                <span className="text-[11px] font-semibold text-zinc-500 block">Días seleccionados</span>
                                <div className="grid grid-cols-7 gap-1">
                                    {weekdayItems.map(item => {
                                        const isDayActive = (formFrequency.days || []).includes(item.index);
                                        return (
                                            <button
                                                key={item.index}
                                                type="button"
                                                onClick={() => {
                                                    const current = formFrequency.days || [];
                                                    const next = current.includes(item.index)
                                                        ? current.filter(d => d !== item.index)
                                                        : [...current, item.index];
                                                    setFormFrequency({ ...formFrequency, days: next.length > 0 ? next : [item.index] });
                                                }}
                                                className={`py-2 rounded-xl text-xs font-bold transition-all ${
                                                    isDayActive 
                                                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' 
                                                        : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500'
                                                }`}
                                            >
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Times Per Week Selector */}
                        {formFrequency.type === 'times_per_week' && (
                            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                                <span className="text-[11px] font-semibold text-zinc-500 block">Objetivo de veces por semana</span>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7].map(num => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setFormFrequency({ type: 'times_per_week', count: num })}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                                                formFrequency.count === num 
                                                    ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' 
                                                    : 'bg-zinc-200/60 dark:bg-zinc-800 text-zinc-500'
                                            }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Interval Selector */}
                        {formFrequency.type === 'interval' && (
                            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                                <span className="text-[11px] font-semibold text-zinc-500 block">Repetir cada cuántos días</span>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="number"
                                        min={1}
                                        max={30}
                                        value={formFrequency.days || 2}
                                        onChange={e => setFormFrequency({ ...formFrequency, days: Math.max(1, Number(e.target.value)) })}
                                        className="w-20 px-3 py-2 text-xs rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-bold text-center"
                                    />
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">días</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delete Habit Section (in Edit mode) */}
                    {isEditing && (
                        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            {showDeleteConfirm ? (
                                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3 text-center">
                                    <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                                        ¿Estás seguro de eliminar este hábito y su historial?
                                    </p>
                                    <div className="flex gap-2 justify-center">
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className="px-4 py-1.5 text-xs font-medium rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeleteHabitAction}
                                            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 text-white shadow-xs"
                                        >
                                            Sí, eliminar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full py-3 rounded-2xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-semibold text-xs flex items-center justify-center gap-2 active:bg-rose-50 dark:active:bg-rose-950/50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Eliminar Hábito</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // PAGE: MAIN HABITS (PÁGINA PRINCIPAL)
    // ==========================================
    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-28 pt-8 px-4 sm:px-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Hábitos</h1>
                    <p className="text-xs font-medium text-zinc-500 mt-0.5">
                        {completedTodayCount} de {habitsForSelectedDay.length} completados
                    </p>
                </div>
                <button 
                    type="button"
                    onClick={handleOpenCreate}
                    className="w-11 h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md"
                    title="Nuevo Hábito"
                    aria-label="Nuevo Hábito"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Quick Navigation Action Pills: Vista Semanal & Estadísticas */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <button 
                    type="button"
                    onClick={() => setSubPage('weekly')}
                    className="py-2.5 px-3 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 active:scale-98 transition-all"
                >
                    <CalendarDays className="w-4 h-4 text-zinc-500" />
                    <span>Vista Semanal</span>
                </button>
                <button 
                    type="button"
                    onClick={() => setSubPage('stats')}
                    className="py-2.5 px-3 rounded-2xl bg-zinc-100/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-center gap-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 active:scale-98 transition-all"
                >
                    <Activity className="w-4 h-4 text-zinc-500" />
                    <span>Estadísticas</span>
                </button>
            </div>

            {/* Selector de Día (Día Anterior, Día Actual / Hoy, Día Siguiente) */}
            <div className="flex items-center justify-between mb-4 bg-zinc-100/70 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                <button 
                    type="button"
                    onClick={handlePrevDay} 
                    className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    aria-label="Día anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button 
                    type="button"
                    onClick={handleResetToToday}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors text-zinc-800 dark:text-zinc-200"
                >
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{isSelectedDateToday ? `Hoy (${format(selectedDate, 'd MMM', { locale: es })})` : format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}</span>
                </button>

                <button 
                    type="button"
                    onClick={handleNextDay} 
                    className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    aria-label="Día siguiente"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Notice if future date */}
            {isSelectedDateFuture && (
                <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-medium">
                    <Lock className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>Estás viendo un día futuro. Los hábitos solo pueden marcarse el día actual o días pasados.</span>
                </div>
            )}

            {/* Daily Progress Bar */}
            {habitsForSelectedDay.length > 0 && !isSelectedDateFuture && (
                <div className="mb-5 flex items-center gap-3 bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-emerald-500 transition-all duration-500 ease-out rounded-full"
                            style={{ width: `${progressToday}%` }}
                        />
                    </div>
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{progressToday}%</span>
                </div>
            )}

            {/* Habit List */}
            <div className="space-y-2.5">
                <AnimatePresence mode="popLayout">
                    {habits.map(habit => {
                        const isApplicable = isDayApplicable(selectedDate, habit.frequency);
                        const isCompleted = isHabitCompletedOnDate(habit.id, selectedDateKey);
                        const streak = calculateStreak(habit, records);
                        
                        // Check if completed today for flame color status
                        const isCompletedToday = isHabitCompletedOnDate(habit.id, todayDateKey);

                        return (
                            <motion.div
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={habit.id}
                                className={`flex items-center gap-3.5 p-4 rounded-2xl border transition-all active:scale-[0.99] ${
                                    isCompleted 
                                        ? 'bg-emerald-500/10 dark:bg-emerald-950/20 border-emerald-500/30 dark:border-emerald-500/20' 
                                        : !isApplicable && habit.frequency.type !== 'times_per_week'
                                            ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/40 dark:border-zinc-800/40 opacity-50'
                                            : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-xs'
                                }`}
                            >
                                {/* Check Action Button */}
                                <button
                                    type="button"
                                    disabled={isSelectedDateFuture || (!isApplicable && habit.frequency.type !== 'times_per_week')}
                                    onClick={() => handleToggle(habit, selectedDate)}
                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                                        isCompleted
                                            ? 'bg-emerald-500 text-white shadow-xs'
                                            : isSelectedDateFuture
                                                ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 cursor-not-allowed'
                                                : 'bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500'
                                    }`}
                                >
                                    {isCompleted ? (
                                        <Check className="w-5 h-5 stroke-[3]" />
                                    ) : isSelectedDateFuture ? (
                                        <Lock className="w-4 h-4 text-zinc-400" />
                                    ) : (
                                        <span className="text-lg">{habit.emoji}</span>
                                    )}
                                </button>

                                {/* Habit Name & Frequency */}
                                <div 
                                    className="flex-1 min-w-0 cursor-pointer"
                                    onClick={() => handleOpenEdit(habit)}
                                >
                                    <div className="flex items-center gap-2">
                                        <h3 className={`text-sm font-semibold truncate ${
                                            isCompleted ? 'text-emerald-900 dark:text-emerald-200 font-bold' : 'text-zinc-900 dark:text-zinc-100'
                                        }`}>
                                            {habit.name}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 font-medium">
                                        <span>
                                            {habit.frequency.type === 'daily' && 'Todos los días'}
                                            {habit.frequency.type === 'specific_days' && 'Días programados'}
                                            {habit.frequency.type === 'times_per_week' && `${habit.frequency.count} veces / sem`}
                                            {habit.frequency.type === 'interval' && `Cada ${habit.frequency.days} días`}
                                        </span>
                                        {!isApplicable && habit.frequency.type !== 'times_per_week' && (
                                            <span className="text-amber-500 font-semibold">• No programado hoy</span>
                                        )}
                                    </div>
                                </div>

                                {/* Streak Badge: CRITICAL: Only shown if streak > 0 */}
                                {streak > 0 && (
                                    <div 
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors shrink-0 ${
                                            isCompletedToday
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                        }`}
                                        title={isCompletedToday ? `Racha de ${streak} días completada hoy` : `Racha de ${streak} días pendiente hoy`}
                                    >
                                        <Flame className={`w-3.5 h-3.5 fill-current ${isCompletedToday ? 'text-emerald-500' : 'text-amber-500'}`} />
                                        <span>{streak}d</span>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {habits.length === 0 && (
                    <div className="text-center py-16 px-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                            <Target className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            No tienes hábitos aún
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Toca el botón + para comenzar a construir tus hábitos diarios.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MobileHabits;
