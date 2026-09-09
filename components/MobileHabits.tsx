import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Check, 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    CalendarDays, 
    BarChart3, 
    X, 
    Flame, 
    CheckCircle2, 
    TrendingUp,
    Sparkles
} from 'lucide-react';
import { format, addDays, subDays, isSameDay, startOfWeek, eachDayOfInterval } from 'date-fns';
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
    const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);

    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
    const isToday = isSameDay(selectedDate, new Date());
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Helper: check if habit is completed on a specific date string
    const isHabitCompletedOnDate = (habitId: number | string, dStr: string) => {
        const idNum = Number(habitId);
        return records.some(r => Number(r.habit_id) === idNum && r.completed_at === dStr);
    };

    const handleToggle = (habitId: number, currentCompleted: boolean, specificDateStr = dateStr) => {
        onToggleRecord(habitId.toString(), specificDateStr, !currentCompleted);
    };

    // Helper: calculate streak and status for a habit
    const getHabitStreakInfo = (habitId: number | string) => {
        const idNum = Number(habitId);
        const todayDStr = format(new Date(), 'yyyy-MM-dd');
        const isCompletedToday = records.some(r => Number(r.habit_id) === idNum && r.completed_at === todayDStr);
        
        let streak = 0;
        let checkDate = new Date();
        
        if (isCompletedToday) {
            streak = 1;
            checkDate = subDays(checkDate, 1);
            while (streak < 365) {
                const d = format(checkDate, 'yyyy-MM-dd');
                if (records.some(r => Number(r.habit_id) === idNum && r.completed_at === d)) {
                    streak++;
                    checkDate = subDays(checkDate, 1);
                } else {
                    break;
                }
            }
            return {
                streak,
                isCompletedToday: true,
                status: 'continued' as const
            };
        } else {
            // Not completed today: count streak through yesterday
            checkDate = subDays(checkDate, 1);
            while (streak < 365) {
                const d = format(checkDate, 'yyyy-MM-dd');
                if (records.some(r => Number(r.habit_id) === idNum && r.completed_at === d)) {
                    streak++;
                    checkDate = subDays(checkDate, 1);
                } else {
                    break;
                }
            }
            return {
                streak,
                isCompletedToday: false,
                status: 'at_risk' as const
            };
        }
    };

    const completedCount = habits.filter(h => isHabitCompletedOnDate(h.id, dateStr)).length;
    const progress = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

    // Week days for the weekly view (Monday to Sunday)
    const weekDays = useMemo(() => {
        const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end: addDays(start, 6) });
    }, [selectedDate]);

    // Statistics calculations
    const stats = useMemo(() => {
        const todayDStr = format(new Date(), 'yyyy-MM-dd');
        const completedToday = habits.filter(h => isHabitCompletedOnDate(h.id, todayDStr)).length;
        
        // Count completions for the past 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), i), 'yyyy-MM-dd'));
        let totalLast7 = 0;
        last7Days.forEach(d => {
            totalLast7 += habits.filter(h => isHabitCompletedOnDate(h.id, d)).length;
        });
        const maxPossibleLast7 = habits.length * 7;
        const weekRate = maxPossibleLast7 > 0 ? Math.round((totalLast7 / maxPossibleLast7) * 100) : 0;

        // Individual streaks
        const habitStreaks = habits.map(h => {
            let streak = 0;
            let checkDate = new Date();
            // If not completed today, check from yesterday
            if (!isHabitCompletedOnDate(h.id, format(checkDate, 'yyyy-MM-dd'))) {
                checkDate = subDays(checkDate, 1);
            }
            while (streak < 90) {
                const d = format(checkDate, 'yyyy-MM-dd');
                if (isHabitCompletedOnDate(h.id, d)) {
                    streak++;
                    checkDate = subDays(checkDate, 1);
                } else {
                    break;
                }
            }
            const totalForHabit = records.filter(r => Number(r.habit_id) === Number(h.id)).length;
            return {
                habit: h,
                streak,
                total: totalForHabit
            };
        });

        const bestStreak = habitStreaks.reduce((max, curr) => Math.max(max, curr.streak), 0);
        const totalCompletions = records.length;

        return {
            completedToday,
            weekRate,
            bestStreak,
            totalCompletions,
            habitStreaks
        };
    }, [habits, records]);

    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-black text-zinc-900 dark:text-zinc-50 pb-28 pt-10 px-5">
            {/* Header: Title and Round Action Buttons */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Hábitos</h1>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {completedCount} de {habits.length} completados hoy
                    </p>
                </div>

                {/* Round Action Buttons Trio: Semanal, Estadísticas, Agregar */}
                <div className="flex items-center gap-2">
                    {/* Botón Redondo Semanal */}
                    <button
                        type="button"
                        onClick={() => setIsWeeklyModalOpen(true)}
                        className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-all active:scale-95 border border-zinc-200/80 dark:border-zinc-800 shadow-xs"
                        title="Vista Semanal"
                        aria-label="Vista Semanal"
                    >
                        <CalendarDays className="w-4.5 h-4.5" />
                    </button>

                    {/* Botón Redondo Estadísticas */}
                    <button
                        type="button"
                        onClick={() => setIsStatsModalOpen(true)}
                        className="w-11 h-11 rounded-full bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center transition-all active:scale-95 border border-zinc-200/80 dark:border-zinc-800 shadow-xs"
                        title="Estadísticas de Hábitos"
                        aria-label="Estadísticas de Hábitos"
                    >
                        <BarChart3 className="w-4.5 h-4.5" />
                    </button>

                    {/* Botón Redondo Agregar */}
                    <button 
                        type="button"
                        onClick={onOpenHabitCreator}
                        className="w-11 h-11 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full flex items-center justify-center active:scale-95 transition-all shadow-md"
                        title="Nuevo Hábito"
                        aria-label="Nuevo Hábito"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Selector de Fecha */}
            <div className="flex items-center justify-between mb-6 bg-zinc-100/70 dark:bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80">
                <button 
                    onClick={handlePrevDay} 
                    className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    aria-label="Día anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <button 
                    onClick={() => setSelectedDate(new Date())}
                    className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors"
                >
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{isToday ? 'Hoy, ' + format(selectedDate, "d 'de' MMMM", { locale: es }) : format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}</span>
                </button>

                <button 
                    onClick={handleNextDay} 
                    className="w-9 h-9 flex items-center justify-center rounded-xl active:bg-zinc-200 dark:active:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    aria-label="Día siguiente"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Barra de Progreso Diario */}
            {habits.length > 0 && (
                <div className="mb-6 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Progreso del día</span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                            className="h-full bg-zinc-900 dark:bg-white rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            )}

            {/* Lista de Hábitos */}
            <div className="space-y-2.5">
                {habits.map(habit => {
                    const isCompleted = isHabitCompletedOnDate(habit.id, dateStr);
                    const streakInfo = getHabitStreakInfo(habit.id);

                    return (
                        <motion.div 
                            layout
                            key={habit.id}
                            className={`flex items-center p-3.5 rounded-2xl border transition-all ${
                                isCompleted 
                                    ? 'bg-zinc-50/80 dark:bg-zinc-900/40 border-zinc-200/60 dark:border-zinc-800/40 opacity-70' 
                                    : 'bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-xs'
                            }`}
                        >
                            {/* Botón de Completar Hábito */}
                            <button 
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggle(habit.id, isCompleted);
                                }}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 transition-all active:scale-90 mr-3.5 ${
                                    isCompleted 
                                        ? 'bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900' 
                                        : 'border-zinc-300 dark:border-zinc-700 active:bg-zinc-100 dark:active:bg-zinc-800'
                                }`}
                                aria-label={`Marcar ${habit.name} como ${isCompleted ? 'incompleto' : 'completado'}`}
                            >
                                {isCompleted && <Check className="w-4 h-4 stroke-[2.5]" />}
                            </button>

                            {/* Detalles del Hábito */}
                            <div 
                                className="flex-1 min-w-0 cursor-pointer pr-2"
                                onClick={() => onOpenHabitEditor(habit)}
                            >
                                <div className="flex items-center gap-2">
                                    {habit.emoji && <span className="text-base shrink-0">{habit.emoji}</span>}
                                    <h3 className={`text-sm font-semibold truncate ${isCompleted ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                        {habit.name}
                                    </h3>
                                </div>
                                {habit.description && (
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                        {habit.description}
                                    </p>
                                )}
                            </div>

                            {/* Insignia de Racha en la Esquina: Verde si se continuó hoy, Rojo si se está perdiendo la racha hoy */}
                            <div className="shrink-0 flex items-center pl-1">
                                <div 
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                                        streakInfo.isCompletedToday
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-xs'
                                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                                    }`}
                                    title={
                                        streakInfo.isCompletedToday
                                            ? `Racha de ${streakInfo.streak} días mantenida hoy`
                                            : streakInfo.streak > 0
                                                ? `Racha de ${streakInfo.streak} días en riesgo hoy (no completado aún)`
                                                : 'Sin racha activa hoy'
                                    }
                                >
                                    <Flame className={`w-3.5 h-3.5 ${streakInfo.isCompletedToday ? 'fill-emerald-500 text-emerald-500' : 'fill-rose-500 text-rose-500'}`} />
                                    <span>{streakInfo.streak}d</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}

                {habits.length === 0 && (
                    <div className="text-center py-16 px-4 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-3 text-zinc-400">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">No hay hábitos creados</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Toca el botón circular + para crear tu primer hábito.</p>
                    </div>
                )}
            </div>

            {/* EMERGENTE 1: VISTA SEMANAL - Empieza más arriba y z-[75] para no ser tapado */}
            <AnimatePresence>
                {isWeeklyModalOpen && (
                    <div className="fixed inset-0 z-[75] flex items-start justify-center pt-2 sm:pt-6 px-3 sm:px-6 pb-20 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsWeeklyModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-2xl max-h-[92vh] flex flex-col z-10 my-1 sm:my-4"
                        >
                            {/* Drag Indicator for Native Feel */}
                            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-2.5 shrink-0 sm:hidden" />

                            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
                                <div>
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Vista Semanal</h3>
                                    <p className="text-xs text-zinc-500">Semana del {format(weekDays[0], "d 'de' MMM", { locale: es })} al {format(weekDays[6], "d 'de' MMM", { locale: es })}</p>
                                </div>
                                <button
                                    onClick={() => setIsWeeklyModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 active:scale-95 transition-all"
                                    aria-label="Cerrar vista semanal"
                                >
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            <div className="overflow-y-auto py-3 space-y-3 flex-1 pb-16 custom-scrollbar">
                                {habits.map(habit => (
                                    <div key={habit.id} className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60">
                                        <div className="flex items-center gap-2 mb-3">
                                            {habit.emoji && <span className="text-sm">{habit.emoji}</span>}
                                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{habit.name}</span>
                                        </div>
                                        {/* 7 Days Matrix */}
                                        <div className="grid grid-cols-7 gap-1.5 text-center">
                                            {weekDays.map(day => {
                                                const dStr = format(day, 'yyyy-MM-dd');
                                                const done = isHabitCompletedOnDate(habit.id, dStr);
                                                const isCurrentDay = isSameDay(day, new Date());
                                                return (
                                                    <div key={dStr} className="flex flex-col items-center gap-1">
                                                        <span className={`text-[10px] uppercase font-semibold ${isCurrentDay ? 'text-zinc-900 dark:text-white font-bold' : 'text-zinc-400'}`}>
                                                            {format(day, 'EEEEEE', { locale: es })}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggle(habit.id, done, dStr)}
                                                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all text-xs font-bold ${
                                                                done
                                                                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                                                                    : 'bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-400'
                                                            }`}
                                                        >
                                                            {done ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : format(day, 'd')}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}

                                {habits.length === 0 && (
                                    <div className="text-center py-8 text-xs text-zinc-500">
                                        No hay hábitos para mostrar en la semana.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* EMERGENTE 2: ESTADÍSTICAS - Empieza más arriba y z-[75] para no ser tapado */}
            <AnimatePresence>
                {isStatsModalOpen && (
                    <div className="fixed inset-0 z-[75] flex items-start justify-center pt-2 sm:pt-6 px-3 sm:px-6 pb-20 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsStatsModalOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.98 }}
                            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 shadow-2xl max-h-[92vh] flex flex-col z-10 my-1 sm:my-4"
                        >
                            {/* Drag Indicator for Native Feel */}
                            <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-2.5 shrink-0 sm:hidden" />

                            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
                                <div>
                                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Estadísticas de Hábitos</h3>
                                    <p className="text-xs text-zinc-500">Resumen y consistencia de tus hábitos</p>
                                </div>
                                <button
                                    onClick={() => setIsStatsModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 active:scale-95 transition-all"
                                    aria-label="Cerrar estadísticas"
                                >
                                    <X className="w-4.5 h-4.5" />
                                </button>
                            </div>

                            <div className="overflow-y-auto py-3 space-y-4 flex-1 pb-16 custom-scrollbar">
                                {/* Metric Cards Grid */}
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            <span>Semana actual</span>
                                        </div>
                                        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.weekRate}%</div>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">Tasa de cumplimiento</div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                                            <Flame className="w-3.5 h-3.5" />
                                            <span>Mejor racha</span>
                                        </div>
                                        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.bestStreak} <span className="text-xs font-medium text-zinc-500">días</span></div>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">Consecutivos</div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Completados hoy</span>
                                        </div>
                                        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.completedToday} / {habits.length}</div>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">Activos hoy</div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60">
                                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-1">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>Total histórico</span>
                                        </div>
                                        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalCompletions}</div>
                                        <div className="text-[10px] text-zinc-400 mt-0.5">Registros completados</div>
                                    </div>
                                </div>

                                {/* Desglose por Hábito */}
                                <div>
                                    <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Desglose por Hábito</h4>
                                    <div className="space-y-2">
                                        {stats.habitStreaks.map(item => (
                                            <div key={item.habit.id} className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {item.habit.emoji && <span className="text-sm">{item.habit.emoji}</span>}
                                                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{item.habit.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0 text-xs">
                                                    <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-medium">
                                                        <Flame className="w-3 h-3 text-zinc-400" /> {item.streak}d
                                                    </span>
                                                    <span className="px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">
                                                        {item.total} tot
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default MobileHabits;
