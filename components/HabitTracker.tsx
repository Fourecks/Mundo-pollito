import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Habit,
  HabitRecord,
  HabitFrequency,
  HabitCategory,
  HabitTimeOfDay,
  HabitRecordStatus
} from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import PlusIcon from './icons/PlusIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import ConfirmationModal from './ConfirmationModal';
import ChartBarIcon from './icons/ChartBarIcon';
import ListIcon from './icons/ListIcon';
import CalendarIcon from './icons/CalendarIcon';
import CheckIcon from './icons/CheckIcon';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell
} from 'recharts';

interface HabitTrackerProps {
  habits: Habit[];
  records: HabitRecord[];
  onOpenHabitCreator: () => void;
  onOpenHabitEditor: (habit: Habit) => void;
  onDeleteHabit: (habitId: number) => void;
  onToggleRecord: (habitId: number, date: string) => void;
  onRecordProgress?: (habitId: number, date: string, value: number, status?: HabitRecordStatus) => void;
  onTogglePauseHabit?: (habitId: number) => void;
  onToggleArchiveHabit?: (habitId: number) => void;
}

const weekdayLabelsShort = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const weekdayLabelsFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const getFrequencyText = (freq: HabitFrequency): string => {
  if (!freq) return 'Diariamente';
  switch (freq.type) {
    case 'daily': return 'Todos los días';
    case 'specific_days': {
      const dayNames = (freq.days || []).map(d => weekdayLabelsShort[d]).join(', ');
      return `Días: ${dayNames || 'Ninguno'}`;
    }
    case 'times_per_week': return `${freq.count} ${freq.count > 1 ? 'veces' : 'vez'} por semana`;
    case 'interval': return `Cada ${freq.days} días`;
    default: return 'Diariamente';
  }
};

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getStartOfWeekLocal = (date: Date) => {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  d.setDate(diff);
  return d;
};

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

export const isHabitCompletedOnDate = (habit: Habit, dateStr: string, records: HabitRecord[]): boolean => {
  const record = records.find(r => r.habit_id === habit.id && r.completed_at === dateStr);
  if (!record) return false;
  if (record.status === 'skipped') return true; // Skipped preserves streak
  if (habit.habit_type === 'quantitative') {
    const target = habit.target_value || 1;
    return (record.value ?? 0) >= target;
  }
  return true;
};

export const calculateStreak = (habit: Habit, records: HabitRecord[]): { current: number; best: number } => {
  const habitRecords = records.filter(r => r.habit_id === habit.id);
  if (habitRecords.length === 0) return { current: 0, best: 0 };
  
  const recordsByDate = new Map<string, HabitRecord>();
  habitRecords.forEach(r => recordsByDate.set(r.completed_at, r));

  const isCompletedOrSkipped = (dateStr: string) => {
    const r = recordsByDate.get(dateStr);
    if (!r) return false;
    if (r.status === 'skipped') return true;
    if (habit.habit_type === 'quantitative') {
      return (r.value ?? 0) >= (habit.target_value || 1);
    }
    return true;
  };

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date();
  const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const todayKey = formatDateKey(currentDate);
  const isTodayApp = isDayApplicable(currentDate, habit.frequency);
  const isTodayDone = isCompletedOrSkipped(todayKey);

  if (isTodayApp && isTodayDone) {
    currentStreak++;
  }

  for (let i = 1; i < 365; i++) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(currentDate.getDate() - i);
    if (isDayApplicable(checkDate, habit.frequency)) {
      const dateKey = formatDateKey(checkDate);
      if (isCompletedOrSkipped(dateKey)) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate best streak over 365 days
  let bestStreak = 0;
  let tempStreak = 0;
  for (let i = 365; i >= 0; i--) {
    const checkDate = new Date(currentDate);
    checkDate.setDate(currentDate.getDate() - i);
    if (isDayApplicable(checkDate, habit.frequency)) {
      const dateKey = formatDateKey(checkDate);
      if (isCompletedOrSkipped(dateKey)) {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    }
  }

  return {
    current: currentStreak,
    best: Math.max(bestStreak, currentStreak)
  };
};

const CATEGORIES_LIST: { id: string; label: string; icon: string }[] = [
  { id: 'all', label: 'Todas', icon: '✨' },
  { id: 'Salud', label: 'Salud', icon: '❤️' },
  { id: 'Productividad', label: 'Productividad', icon: '⚡' },
  { id: 'Mente', label: 'Mente', icon: '🧠' },
  { id: 'Finanzas', label: 'Finanzas', icon: '💰' },
  { id: 'Rutina', label: 'Rutina', icon: '☀️' },
  { id: 'Personal', label: 'Personal', icon: '🌱' },
  { id: 'Fitness', label: 'Fitness', icon: '🏃' },
  { id: 'Estudio', label: 'Estudio', icon: '📚' },
  { id: 'Relaciones', label: 'Relaciones', icon: '🤝' },
  { id: 'Otro', label: 'Otro', icon: '🏷️' },
];

const TIME_OF_DAY_TABS: { id: string; label: string; icon: string }[] = [
  { id: 'all', label: 'Todo el día', icon: '🕒' },
  { id: 'morning', label: 'Mañana', icon: '🌅' },
  { id: 'afternoon', label: 'Tarde', icon: '☀️' },
  { id: 'night', label: 'Noche', icon: '🌙' },
];

const HabitTracker: React.FC<HabitTrackerProps> = ({
  habits,
  records,
  onOpenHabitCreator,
  onOpenHabitEditor,
  onDeleteHabit,
  onToggleRecord,
  onRecordProgress,
  onTogglePauseHabit,
  onToggleArchiveHabit,
}) => {
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'month' | 'stats' | 'manage'>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getStartOfWeekLocal(new Date()));
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  
  // Modals and action menus
  const [activeMenuHabitId, setActiveMenuHabitId] = useState<number | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [habitForQuantitativeInput, setHabitForQuantitativeInput] = useState<{ habit: Habit; dateStr: string } | null>(null);
  const [customInputValue, setCustomInputValue] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuHabitId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const todayKey = formatDateKey(new Date());
  const todayDateObj = useMemo(() => new Date(), []);

  // Filter Active vs Archived habits
  const activeHabits = useMemo(() => {
    return habits.filter(h => !h.is_archived);
  }, [habits]);

  const archivedHabits = useMemo(() => {
    return habits.filter(h => h.is_archived);
  }, [habits]);

  // Habits applicable today
  const todayApplicableHabits = useMemo(() => {
    return activeHabits.filter(h => isDayApplicable(todayDateObj, h.frequency));
  }, [activeHabits, todayDateObj]);

  // Calculate Today's Stats
  const todayStats = useMemo(() => {
    const applicable = todayApplicableHabits.filter(h => !h.is_paused);
    if (applicable.length === 0) return { total: 0, completed: 0, percent: 0 };
    
    let completedCount = 0;
    applicable.forEach(h => {
      if (isHabitCompletedOnDate(h, todayKey, records)) {
        completedCount++;
      }
    });

    const percent = Math.round((completedCount / applicable.length) * 100);
    return {
      total: applicable.length,
      completed: completedCount,
      percent
    };
  }, [todayApplicableHabits, todayKey, records]);

  // Filtered habits for Today's view
  const filteredTodayHabits = useMemo(() => {
    return todayApplicableHabits.filter(h => {
      if (selectedCategory !== 'all' && h.category !== selectedCategory) return false;
      if (selectedTimeOfDay !== 'all') {
        const tod = h.time_of_day || 'anytime';
        if (tod !== selectedTimeOfDay && tod !== 'anytime') return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return h.name.toLowerCase().includes(q) || (h.category || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [todayApplicableHabits, selectedCategory, selectedTimeOfDay, searchQuery]);

  // Week days array
  const weekDays = useMemo(() => {
    const days: { date: Date; key: string; label: string; dayNum: number; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      const key = formatDateKey(d);
      days.push({
        date: d,
        key,
        label: weekdayLabelsShort[d.getDay()],
        dayNum: d.getDate(),
        isToday: key === todayKey,
      });
    }
    return days;
  }, [currentWeekStart, todayKey]);

  // Month days array for Heatmap/Month matrix
  const monthMatrix = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: { day: number; dateStr: string; date: Date; completedCount: number; applicableCount: number; rate: number }[] = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      const dateStr = formatDateKey(d);
      
      let applicableCount = 0;
      let completedCount = 0;
      
      activeHabits.forEach(h => {
        if (!h.is_paused && isDayApplicable(d, h.frequency)) {
          applicableCount++;
          if (isHabitCompletedOnDate(h, dateStr, records)) {
            completedCount++;
          }
        }
      });
      
      const rate = applicableCount > 0 ? (completedCount / applicableCount) : 0;
      days.push({ day, dateStr, date: d, completedCount, applicableCount, rate });
    }
    
    return days;
  }, [currentMonthDate, activeHabits, records]);

  // Comprehensive Overall Stats
  const globalStats = useMemo(() => {
    if (activeHabits.length === 0) {
      return { totalHabits: 0, totalCompletions: 0, avgRate: 0, activeStreaks: 0, bestStreak: 0, categoryData: [] };
    }

    let totalCompletions = 0;
    let maxBestStreak = 0;
    let totalActiveStreaks = 0;

    activeHabits.forEach(h => {
      const streakInfo = calculateStreak(h, records);
      if (streakInfo.current > 0) totalActiveStreaks++;
      if (streakInfo.best > maxBestStreak) maxBestStreak = streakInfo.best;
      
      const habitRecs = records.filter(r => r.habit_id === h.id);
      totalCompletions += habitRecs.length;
    });

    // 30-day consistency rate
    const last30Days: Date[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      last30Days.push(d);
    }

    let totalApplicableSlots = 0;
    let totalFulfilledSlots = 0;

    last30Days.forEach(d => {
      const dateStr = formatDateKey(d);
      activeHabits.forEach(h => {
        if (!h.is_paused && isDayApplicable(d, h.frequency)) {
          totalApplicableSlots++;
          if (isHabitCompletedOnDate(h, dateStr, records)) {
            totalFulfilledSlots++;
          }
        }
      });
    });

    const avgRate = totalApplicableSlots > 0 ? Math.round((totalFulfilledSlots / totalApplicableSlots) * 100) : 0;

    // Breakdown by category
    const catMap = new Map<string, { total: number; completed: number }>();
    activeHabits.forEach(h => {
      const cat = (h.category as string) || 'General';
      if (!catMap.has(cat)) catMap.set(cat, { total: 0, completed: 0 });
      const current = catMap.get(cat)!;
      current.total++;
      
      const habitRecs = records.filter(r => r.habit_id === h.id);
      current.completed += habitRecs.length;
    });

    const categoryData = Array.from(catMap.entries()).map(([name, val]) => ({
      name,
      habitsCount: val.total,
      totalCompletions: val.completed
    }));

    return {
      totalHabits: activeHabits.length,
      totalCompletions,
      avgRate,
      activeStreaks: totalActiveStreaks,
      bestStreak: maxBestStreak,
      categoryData
    };
  }, [activeHabits, records]);

  // Handlers
  const handleQuickQuantitativeAdd = (habit: Habit, dateStr: string, delta: number) => {
    const existing = records.find(r => r.habit_id === habit.id && r.completed_at === dateStr);
    const currentValue = existing?.value ?? 0;
    const newValue = Math.max(0, currentValue + delta);
    
    if (onRecordProgress) {
      onRecordProgress(habit.id, dateStr, newValue, newValue >= (habit.target_value || 1) ? 'completed' : undefined);
    } else {
      // Fallback to onToggleRecord
      onToggleRecord(habit.id, dateStr);
    }
  };

  const handleCustomQuantitativeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitForQuantitativeInput) return;
    const { habit, dateStr } = habitForQuantitativeInput;
    const val = Number(customInputValue) || 0;
    
    if (onRecordProgress) {
      onRecordProgress(habit.id, dateStr, val, val >= (habit.target_value || 1) ? 'completed' : undefined);
    } else {
      onToggleRecord(habit.id, dateStr);
    }
    setHabitForQuantitativeInput(null);
    setCustomInputValue('');
  };

  const handleSkipDay = (habitId: number, dateStr: string) => {
    if (onRecordProgress) {
      const existing = records.find(r => r.habit_id === habitId && r.completed_at === dateStr);
      if (existing?.status === 'skipped') {
        // Unskip
        onToggleRecord(habitId, dateStr);
      } else {
        onRecordProgress(habitId, dateStr, 0, 'skipped');
      }
    } else {
      onToggleRecord(habitId, dateStr);
    }
    setActiveMenuHabitId(null);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold text-xl shadow-inner">
            ✨
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
              Hábitos y Rutinas
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {todayStats.completed} de {todayStats.total} completados hoy ({todayStats.percent}%)
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
          <button
            type="button"
            onClick={() => setViewMode('today')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'today'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <CheckIcon className="w-3.5 h-3.5" />
            <span>Hoy</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'week'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>Semana</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'month'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Mes</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('stats')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'stats'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-bold'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ChartBarIcon className="w-3.5 h-3.5" />
            <span>Estadísticas</span>
          </button>
        </div>

        {/* Create Habit Button */}
        <button
          type="button"
          onClick={onOpenHabitCreator}
          className="flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all active:scale-95"
        >
          <PlusIcon className="w-4 h-4" />
          <span>Nuevo Hábito</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* ===================== VIEW: HOY ===================== */}
        {viewMode === 'today' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            {/* Today Summary Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 relative overflow-hidden shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary">
                    Progreso del Día • {weekdayLabelsFull[todayDateObj.getDay()]} {todayDateObj.getDate()}
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-100">
                    {todayStats.percent === 100 && todayStats.total > 0
                      ? '¡Excelente! Todos tus hábitos del día completados 🎉'
                      : todayStats.percent >= 50
                      ? '¡Vas por muy buen camino! Mantén el ritmo 💪'
                      : 'Un paso a la vez, construye tu consistencia ✨'}
                  </h2>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="text-2xl font-black text-primary">
                      {todayStats.percent}%
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                      {todayStats.completed} de {todayStats.total} listos
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-gray-200/80 dark:bg-gray-800 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${todayStats.percent}%` }}
                />
              </div>
            </div>

            {/* Time of Day Tabs & Category Filter Chips */}
            <div className="space-y-3">
              {/* Time of Day Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {TIME_OF_DAY_TABS.map(tab => {
                  const isSelected = selectedTimeOfDay === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedTimeOfDay(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Chips & Search */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                  {CATEGORIES_LIST.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary font-bold'
                            : 'bg-transparent border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="w-full sm:w-48">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Buscar hábito..."
                    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            </div>

            {/* Habits List for Today */}
            {filteredTodayHabits.length === 0 ? (
              <div className="text-center py-16 px-4 bg-gray-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-3">
                <div className="text-4xl">🌱</div>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  No hay hábitos para mostrar en esta vista
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  Crea un nuevo hábito o ajusta los filtros de momento del día o categoría.
                </p>
                <button
                  type="button"
                  onClick={onOpenHabitCreator}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Crear mi primer hábito</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTodayHabits.map(habit => {
                  const record = records.find(r => r.habit_id === habit.id && r.completed_at === todayKey);
                  const isCompleted = isHabitCompletedOnDate(habit, todayKey, records);
                  const isSkipped = record?.status === 'skipped';
                  const streak = calculateStreak(habit, records);
                  const isPaused = Boolean(habit.is_paused);
                  const currentValue = record?.value ?? 0;
                  const targetValue = habit.target_value || 1;
                  const progressRatio = Math.min(1, currentValue / targetValue);

                  return (
                    <div
                      key={habit.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 relative group flex flex-col justify-between ${
                        isCompleted
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/50 shadow-sm'
                          : isSkipped
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/50'
                          : isPaused
                          ? 'bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800 opacity-70'
                          : 'bg-white dark:bg-gray-800/90 border-gray-200/80 dark:border-gray-700/70 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm'
                      }`}
                    >
                      {/* Card Top: Emoji, Title, Badges & Context Menu */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform ${
                              isCompleted ? 'bg-emerald-100 dark:bg-emerald-900/40 scale-105' : 'bg-gray-100 dark:bg-gray-700'
                            }`}
                          >
                            {habit.emoji || '✨'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h3
                                className={`text-sm font-bold truncate ${
                                  isCompleted
                                    ? 'line-through text-gray-500 dark:text-gray-400'
                                    : 'text-gray-900 dark:text-gray-100'
                                }`}
                              >
                                {habit.name}
                              </h3>
                              {isPaused && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                  Pausado
                                </span>
                              )}
                              {isSkipped && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                                  Saltado (Racha protegida)
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                              {habit.category && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/60 font-medium">
                                  {habit.category}
                                </span>
                              )}
                              {habit.time_of_day && habit.time_of_day !== 'anytime' && (
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700/60 font-medium">
                                  {habit.time_of_day === 'morning' ? '🌅 Mañana' : habit.time_of_day === 'afternoon' ? '☀️ Tarde' : '🌙 Noche'}
                                </span>
                              )}
                              {streak.current > 0 && (
                                <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
                                  🔥 {streak.current} {streak.current === 1 ? 'día' : 'días'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Menu Trigger */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setActiveMenuHabitId(activeMenuHabitId === habit.id ? null : habit.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <DotsVerticalIcon className="w-4 h-4" />
                          </button>

                          {activeMenuHabitId === habit.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-7 z-50 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 animate-fade-in text-xs font-medium"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  onOpenHabitEditor(habit);
                                  setActiveMenuHabitId(null);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                              >
                                <span>✏️</span>
                                <span>Editar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSkipDay(habit.id, todayKey)}
                                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-amber-600 dark:text-amber-400"
                              >
                                <span>⏸️</span>
                                <span>{isSkipped ? 'Quitar salto' : 'Saltar día (Descanso)'}</span>
                              </button>

                              {onTogglePauseHabit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onTogglePauseHabit(habit.id);
                                    setActiveMenuHabitId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                >
                                  <span>{isPaused ? '▶️' : '⏸️'}</span>
                                  <span>{isPaused ? 'Reanudar hábito' : 'Pausar racha'}</span>
                                </button>
                              )}

                              {onToggleArchiveHabit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onToggleArchiveHabit(habit.id);
                                    setActiveMenuHabitId(null);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                                >
                                  <span>📁</span>
                                  <span>Archivar hábito</span>
                                </button>
                              )}

                              <div className="my-1 border-t border-gray-100 dark:border-gray-700" />

                              <button
                                type="button"
                                onClick={() => {
                                  setHabitToDelete(habit);
                                  setActiveMenuHabitId(null);
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 text-rose-600 dark:text-rose-400"
                              >
                                <span>🗑️</span>
                                <span>Eliminar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Bottom: Interaction controls */}
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2">
                        {habit.habit_type === 'quantitative' ? (
                          /* Quantitative Progress Controls */
                          <div className="w-full space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-gray-500 dark:text-gray-400">
                                {currentValue} / {targetValue} {habit.target_unit || ''}
                              </span>
                              <span className="text-primary font-bold">
                                {Math.round(progressRatio * 100)}%
                              </span>
                            </div>

                            {/* Mini Progress Bar */}
                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${progressRatio * 100}%` }}
                              />
                            </div>

                            {/* Quick Stepper Buttons */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleQuickQuantitativeAdd(habit, todayKey, 1)}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-xs font-bold transition-colors"
                              >
                                +1
                              </button>
                              {targetValue >= 10 && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickQuantitativeAdd(habit, todayKey, Math.ceil(targetValue * 0.25))}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-xs font-bold transition-colors"
                                >
                                  +{Math.ceil(targetValue * 0.25)}
                                </button>
                              )}
                              {targetValue >= 50 && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickQuantitativeAdd(habit, todayKey, Math.ceil(targetValue * 0.5))}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-xs font-bold transition-colors"
                                >
                                  +{Math.ceil(targetValue * 0.5)}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setHabitForQuantitativeInput({ habit, dateStr: todayKey });
                                  setCustomInputValue(String(currentValue));
                                }}
                                className="px-2 py-1 text-[11px] text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 ml-auto font-medium"
                              >
                                Valor exacto
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Boolean Check Button */
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {getFrequencyText(habit.frequency)}
                            </span>

                            <button
                              type="button"
                              onClick={() => onToggleRecord(habit.id, todayKey)}
                              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                isCompleted
                                  ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-primary/20 hover:text-primary'
                              }`}
                            >
                              <CheckIcon className="w-4 h-4" />
                              <span>{isCompleted ? 'Completado' : 'Marcar'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================== VIEW: SEMANAL ===================== */}
        {viewMode === 'week' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Week Navigation Header */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(currentWeekStart);
                  prev.setDate(prev.getDate() - 7);
                  setCurrentWeekStart(prev);
                }}
                className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Semana del {weekDays[0].dayNum} de {weekDays[0].date.toLocaleString('es-ES', { month: 'short' })} al {weekDays[6].dayNum} de {weekDays[6].date.toLocaleString('es-ES', { month: 'short' })}
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentWeekStart(getStartOfWeekLocal(new Date()))}
                  className="text-xs text-primary font-semibold hover:underline mt-0.5"
                >
                  Ir a esta semana
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = new Date(currentWeekStart);
                  next.setDate(next.getDate() + 7);
                  setCurrentWeekStart(next);
                }}
                className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Weekly Habit Matrix */}
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-64">
                      Hábito
                    </th>
                    {weekDays.map(d => (
                      <th key={d.key} className="py-3 px-2 text-center">
                        <div className={`text-[11px] font-bold ${d.isToday ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                          {d.label}
                        </div>
                        <div className={`text-xs font-extrabold mt-0.5 ${d.isToday ? 'w-6 h-6 mx-auto rounded-full bg-primary text-white flex items-center justify-center' : 'text-gray-800 dark:text-gray-200'}`}>
                          {d.dayNum}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 text-sm">
                  {activeHabits.map(habit => {
                    let weekCompletions = 0;
                    return (
                      <tr key={habit.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{habit.emoji || '✨'}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 dark:text-gray-100 truncate text-xs sm:text-sm">
                                {habit.name}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate">
                                {getFrequencyText(habit.frequency)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {weekDays.map(d => {
                          const isApplicable = isDayApplicable(d.date, habit.frequency);
                          const isDone = isHabitCompletedOnDate(habit, d.key, records);
                          if (isDone) weekCompletions++;

                          return (
                            <td key={d.key} className="py-3 px-2 text-center">
                              {isApplicable ? (
                                <button
                                  type="button"
                                  onClick={() => onToggleRecord(habit.id, d.key)}
                                  className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center mx-auto transition-all active:scale-90 ${
                                    isDone
                                      ? 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-600'
                                      : 'bg-gray-100 dark:bg-gray-700/80 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                  title={`${d.label} ${d.dayNum}: ${isDone ? 'Completado' : 'Pendiente'}`}
                                >
                                  {isDone ? '✓' : '·'}
                                </button>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-600 text-xs select-none">
                                  —
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                            {weekCompletions} / 7
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================== VIEW: MENSUAL / HEATMAP ===================== */}
        {viewMode === 'month' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(currentMonthDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setCurrentMonthDate(prev);
                }}
                className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>

              <div className="text-center">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 capitalize">
                  {currentMonthDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentMonthDate(new Date())}
                  className="text-xs text-primary font-semibold hover:underline mt-0.5"
                >
                  Mes actual
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const next = new Date(currentMonthDate);
                  next.setMonth(next.getMonth() + 1);
                  setCurrentMonthDate(next);
                }}
                className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Monthly Consistency Heatmap Grid */}
            <div className="p-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Mapa de Consistencia Diaria
                </h3>
                <div className="flex items-center gap-1 text-[11px] text-gray-500">
                  <span>Menos</span>
                  <span className="w-3 h-3 rounded bg-gray-100 dark:bg-gray-700 inline-block" />
                  <span className="w-3 h-3 rounded bg-emerald-200 dark:bg-emerald-900 inline-block" />
                  <span className="w-3 h-3 rounded bg-emerald-400 dark:bg-emerald-700 inline-block" />
                  <span className="w-3 h-3 rounded bg-emerald-600 dark:bg-emerald-500 inline-block" />
                  <span>Más</span>
                </div>
              </div>

              <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-11 gap-2 pt-2">
                {monthMatrix.map(cell => {
                  const intensityClass =
                    cell.rate === 0
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      : cell.rate < 0.35
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200'
                      : cell.rate < 0.75
                      ? 'bg-emerald-300 dark:bg-emerald-700 text-emerald-950 dark:text-emerald-100'
                      : 'bg-emerald-500 dark:bg-emerald-500 text-white font-bold shadow-sm';

                  const isToday = cell.dateStr === todayKey;

                  return (
                    <div
                      key={cell.dateStr}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition-all ${
                        isToday ? 'ring-2 ring-primary border-primary' : 'border-gray-100 dark:border-gray-700/50'
                      } ${intensityClass}`}
                      title={`${cell.dateStr}: ${cell.completedCount}/${cell.applicableCount} completados (${Math.round(cell.rate * 100)}%)`}
                    >
                      <span className="text-[10px] font-semibold opacity-80">
                        Día {cell.day}
                      </span>
                      <span className="text-xs font-bold mt-1">
                        {Math.round(cell.rate * 100)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================== VIEW: ESTADÍSTICAS ===================== */}
        {viewMode === 'stats' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700/70">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Consistencia (30d)
                </div>
                <div className="text-2xl font-black text-primary mt-1">
                  {globalStats.avgRate}%
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">Tasa promedio</div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700/70">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Total Registros
                </div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {globalStats.totalCompletions}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">Hábitos completados</div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700/70">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Rachas Activas
                </div>
                <div className="text-2xl font-black text-amber-500 mt-1">
                  {globalStats.activeStreaks}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">Hábitos con fuego 🔥</div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/70 dark:border-gray-700/70">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Mejor Racha
                </div>
                <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {globalStats.bestStreak} <span className="text-sm font-normal text-gray-400">días</span>
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">Récord histórico</div>
              </div>
            </div>

            {/* Category Completions Chart */}
            {globalStats.categoryData.length > 0 && (
              <div className="p-6 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-4 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Distribución por Categoría
                </h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={globalStats.categoryData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="totalCompletions" fill="#6366f1" radius={[8, 8, 0, 0]} name="Completados" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Detailed Habits Performance Table */}
            <div className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Rendimiento Individual
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {activeHabits.map(habit => {
                  const streak = calculateStreak(habit, records);
                  const habitRecs = records.filter(r => r.habit_id === habit.id);

                  return (
                    <div key={habit.id} className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{habit.emoji || '✨'}</span>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                            {habit.name}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {habit.category || 'General'} • {getFrequencyText(habit.frequency)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <div className="text-xs font-bold text-amber-500">
                            🔥 {streak.current}d actual
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Mejor: {streak.best}d
                          </div>
                        </div>

                        <div>
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {habitRecs.length}
                          </div>
                          <div className="text-[10px] text-gray-400">Total veces</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Quantitative Input Modal */}
      {habitForQuantitativeInput && (
        <div className="fixed inset-0 z-[65000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Registrar {habitForQuantitativeInput.habit.emoji} {habitForQuantitativeInput.habit.name}
            </h3>
            <form onSubmit={handleCustomQuantitativeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Cantidad ({habitForQuantitativeInput.habit.target_unit || 'unidades'})
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={customInputValue}
                  onChange={e => setCustomInputValue(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-base font-bold text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setHabitForQuantitativeInput(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-primary rounded-lg shadow-sm"
                >
                  Guardar Progreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Habit Confirmation Modal */}
      {habitToDelete && (
        <ConfirmationModal
          isOpen={Boolean(habitToDelete)}
          onClose={() => setHabitToDelete(null)}
          onConfirm={() => {
            onDeleteHabit(habitToDelete.id);
            setHabitToDelete(null);
          }}
          title="Eliminar Hábito"
          message={`¿Estás seguro de que deseas eliminar "${habitToDelete.name}"? Se borrará todo su historial y rachas.`}
          confirmButtonText="Eliminar Hábito"
          confirmButtonVariant="danger"
        />
      )}
    </div>
  );
};

export default HabitTracker;
