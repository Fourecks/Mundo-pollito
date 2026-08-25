import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit, HabitRecord, HabitFrequency } from '../types';
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

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
};

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getStartOfWeekLocal = (date: Date) => {
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

const calculateStreak = (habit: Habit, records: HabitRecord[]): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const habitRecords = records.filter(r => {
    if (r.habit_id !== habit.id) return false;
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

const calculateLongestStreak = (habit: Habit, records: HabitRecord[]): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const habitRecords = records.filter(r => {
    if (r.habit_id !== habit.id) return false;
    const [y, m, d] = r.completed_at.split('-').map(Number);
    const recDate = new Date(y, m - 1, d);
    return recDate.getTime() <= today.getTime();
  });
  if (habitRecords.length === 0) return 0;
  const completedDates = new Set(habitRecords.map(r => r.completed_at));
  const sortedDateStrings = Array.from(completedDates).sort();
  if (sortedDateStrings.length === 0) return 0;

  if (habit.frequency.type === 'times_per_week') {
    let longestStreak = 0;
    let currentStreak = 0;
    const firstDateStr = sortedDateStrings[0];
    const [year, month, day] = firstDateStr.split('-').map(Number);
    const firstDate = new Date(year, month - 1, day);
    const startOfWeek = getStartOfWeekLocal(firstDate);

    while (startOfWeek <= today) {
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      let completionsThisWeek = 0;
      for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
        if (d.getTime() <= today.getTime() && completedDates.has(formatDateKey(d))) {
          completionsThisWeek++;
        }
      }
      
      if (completionsThisWeek >= habit.frequency.count) {
        currentStreak++;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
      startOfWeek.setDate(startOfWeek.getDate() + 7);
    }
    return longestStreak;
  }

  let maxStreak = 0;
  let currentStreak = 0;
  const firstDateStr = sortedDateStrings[0];
  const [year, month, day] = firstDateStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);
  const endDate = new Date(today);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
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

const CustomHabitTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-sm text-xs space-y-1">
        <p className="font-semibold text-slate-700 dark:text-slate-300">Semana {label}</p>
        <p className="font-medium text-emerald-600 dark:text-emerald-400">
          Cumplimiento: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

const ActivityCalendar: React.FC<{ habit: Habit, records: HabitRecord[] }> = ({ habit, records }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const completedDates = useMemo(() => new Set(records.filter(r => r.habit_id === habit.id).map(r => r.completed_at)), [habit.id, records]);

  const handlePrevMonth = () => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  const monthStats = useMemo(() => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let completedCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (completedDates.has(formatDateKey(date))) {
        completedCount++;
      }
    }
    return { completedCount, daysInMonth };
  }, [viewDate, completedDates]);

  const renderDays = () => {
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="w-6 h-6 sm:w-7 sm:h-7 mx-auto" />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDateKey(date);
      const isCompleted = completedDates.has(dateKey);
      
      days.push(
        <div
          key={day}
          title={`${dateKey}: ${isCompleted ? 'Completado' : 'Sin registrar'}`}
          className={`w-6 h-6 sm:w-7 sm:h-7 mx-auto rounded-md flex items-center justify-center text-[10px] sm:text-[11px] font-medium transition-colors ${
            isCompleted
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          {day}
        </div>
      );
    }
    return days;
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Calendario Mensual <span className="text-slate-400 font-normal">({monthStats.completedCount} días completados)</span>
        </h5>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
          <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
            <ChevronLeftIcon />
          </button>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-200 w-20 text-center capitalize">
            {viewDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
          </span>
          <button onClick={handleNextMonth} className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
            <ChevronRightIcon />
          </button>
        </div>
      </div>
      <div className="max-w-[210px] sm:max-w-[238px]">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-1">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">{renderDays()}</div>
      </div>
    </div>
  );
};

const GlobalHabitsOverview: React.FC<{ habits: Habit[], records: HabitRecord[] }> = ({ habits, records }) => {
  const globalTrendData = useMemo(() => {
    const data = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    const weekStart = getStartOfWeekLocal(today);

    for (let i = 7; i >= 0; i--) {
      const startOfWeek = new Date(weekStart);
      startOfWeek.setDate(startOfWeek.getDate() - (i * 7));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      let totalApplicable = 0;
      let totalCompleted = 0;

      habits.forEach(habit => {
        for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
          if (d > today) continue;
          if (isDayApplicable(d, habit.frequency)) {
            totalApplicable++;
            const dateKey = formatDateKey(d);
            if (records.some(r => r.habit_id === habit.id && r.completed_at === dateKey)) {
              totalCompleted++;
            }
          }
        }
      });

      const percentage = totalApplicable > 0 ? Math.round((totalCompleted / totalApplicable) * 100) : 0;
      const label = `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`;
      data.push({
        Semana: label,
        Cumplimiento: percentage,
      });
    }
    return data;
  }, [habits, records]);

  const overallComplianceRate = useMemo(() => {
    if (globalTrendData.length === 0) return 0;
    const last = globalTrendData[globalTrendData.length - 1];
    return last ? last.Cumplimiento : 0;
  }, [globalTrendData]);

  const totalCompletionsCount = useMemo(() => records.length, [records]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Cumplimiento general</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Promedio de las últimas 8 semanas</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60">
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">Tasa Actual</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{overallComplianceRate}%</div>
          </div>
          <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">Total Registros</div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{totalCompletionsCount}</div>
          </div>
        </div>
      </div>
      <div className="w-full h-40 pt-1">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={globalTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="emeraldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
            <XAxis dataKey="Semana" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomHabitTooltip />} />
            <Area type="monotone" dataKey="Cumplimiento" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#emeraldArea)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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
    today.setHours(0,0,0,0);
    const weekStart = getStartOfWeekLocal(today);
    
    for (let i = 7; i >= 0; i--) {
      const startOfWeek = new Date(weekStart);
      startOfWeek.setDate(startOfWeek.getDate() - (i * 7));
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      
      let applicableDays = 0;
      let completedDays = 0;

      for (let d = new Date(startOfWeek); d <= endOfWeek; d.setDate(d.getDate() + 1)) {
        if (d > today) continue;
        if (isDayApplicable(d, habit.frequency)) {
          applicableDays++;
          const dateKey = formatDateKey(d);
          if (records.some(r => r.habit_id === habit.id && r.completed_at === dateKey)) {
            completedDays++;
          }
        }
      }
      
      let percentage = 0;
      if (habit.frequency.type === 'times_per_week') {
        percentage = applicableDays > 0 ? Math.min(100, Math.round((completedDays / habit.frequency.count) * 100)) : 0;
      } else {
        percentage = applicableDays > 0 ? Math.round((completedDays / applicableDays) * 100) : 0;
      }

      data.push({
        Semana: `${startOfWeek.getDate()}/${startOfWeek.getMonth()+1}`,
        Cumplimiento: percentage
      });
    }
    return data;
  }, [habit, records]);

  const habitSuccessRate = useMemo(() => {
    if (weeklyComplianceData.length === 0) return 0;
    const sum = weeklyComplianceData.reduce((acc, curr) => acc + curr.Cumplimiento, 0);
    return Math.round(sum / weeklyComplianceData.length);
  }, [weeklyComplianceData]);

  return (
    <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl">
            {habit.emoji}
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">{habit.name}</h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{getFrequencyText(habit.frequency)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            {habitSuccessRate}%
          </div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Cumplimiento</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>🔥</span> {currentStreak}
          </div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Racha actual</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>🏆</span> {longestStreak}
          </div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Mejor racha</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800">
          <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <CheckIcon className="w-5 h-5 text-emerald-500" /> {totalCompletions}
          </div>
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Registros</p>
        </div>
      </div>

      <div className="pt-2">
        <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
          Tendencia semanal
        </h5>
        <div className="w-full h-32">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <LineChart data={weeklyComplianceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="Semana" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomHabitTooltip />} />
              <Line type="monotone" dataKey="Cumplimiento" name="Cumplimiento" stroke="#059669" strokeWidth={2} dot={{ r: 3, fill: '#059669', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ActivityCalendar habit={habit} records={records} />
    </div>
  );
};

export const HabitTracker: React.FC<HabitTrackerProps> = (props) => {
  const { habits, records, onOpenHabitCreator, onOpenHabitEditor, onDeleteHabit, onToggleRecord } = props;
  const [weekOffset, setWeekOffset] = useState(0);
  const [menuOpenFor, setMenuOpenFor] = useState<number | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [viewMode, setViewMode] = useState<'today' | 'week' | 'stats'>('today');
  const menuRef = useRef<HTMLDivElement>(null);
  
  const handleConfirmDelete = () => {
    if (habitToDelete) {
      onDeleteHabit(habitToDelete.id);
      setHabitToDelete(null);
    }
  };
  
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
    const weekStart = getStartOfWeekLocal(today);

    const dates = Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });
    const weekEnd = new Date(dates[6]);
    weekEnd.setHours(23,59,59,999);
    
    const labels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return { weekStart, weekEnd, weekDates: dates, weekDayLabels: labels };
  }, [weekOffset]);

  const completedRecords = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => set.add(`${r.habit_id}-${r.completed_at}`));
    return set;
  }, [records]);

  // Today View Data
  const today = new Date();
  const todayKey = formatDateKey(today);
  const habitsForToday = useMemo(() => {
    return habits.filter(habit => {
      if (habit.frequency.type === 'times_per_week') {
        const ws = getStartOfWeekLocal(today);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        let comps = 0;
        for (let d = new Date(ws); d <= we; d.setDate(d.getDate() + 1)) {
          if (completedRecords.has(`${habit.id}-${formatDateKey(d)}`)) comps++;
        }
        if (comps >= habit.frequency.count) {
          // Si ya completó la meta pero lo hizo hoy, lo mostramos para permitir toggle
          return completedRecords.has(`${habit.id}-${todayKey}`);
        }
        return true;
      }
      return isDayApplicable(today, habit.frequency);
    });
  }, [habits, completedRecords, todayKey]);

  const todayCompletedCount = habitsForToday.filter(h => completedRecords.has(`${h.id}-${todayKey}`)).length;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40">
      <header className="flex-shrink-0 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Mis Hábitos
        </h2>

        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'today' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'stats' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Estadísticas
            </button>
          </div>
          
          <button
            onClick={onOpenHabitCreator}
            className="p-1.5 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors flex-shrink-0 ml-1"
          >
            <PlusIcon />
          </button>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">
        {viewMode === 'today' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full pb-8">
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-end justify-between">
                <div>
                  <h3 className="font-bold text-xl text-slate-900 dark:text-white">Hábitos de hoy</h3>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{todayCompletedCount}</span>
                  <span className="text-sm font-medium text-slate-500"> / {habitsForToday.length} completados</span>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${habitsForToday.length > 0 ? (todayCompletedCount / habitsForToday.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {habitsForToday.length === 0 ? (
                <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">Crea tu primer hábito</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
                    No necesitas cambiar todo de una vez. Empieza con algo pequeño que puedas repetir.
                  </p>
                  <button onClick={onOpenHabitCreator} className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
                    <PlusIcon className="w-4 h-4" /> Crear hábito
                  </button>
                </div>
              ) : (
                habitsForToday.map(habit => {
                  const isCompleted = completedRecords.has(`${habit.id}-${todayKey}`);
                  const streak = calculateStreak(habit, records);
                  return (
                    <button
                      key={habit.id}
                      onClick={() => onToggleRecord(habit.id, todayKey)}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 rounded-2xl border text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 group ${
                        isCompleted 
                          ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          isCompleted 
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' 
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-transparent group-hover:border-slate-400 dark:group-hover:border-slate-600'
                        }`}>
                          {isCompleted && <CheckIcon className="w-5 h-5" strokeWidth={3} />}
                        </div>
                        <div>
                          <span className={`font-semibold text-base block ${isCompleted ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-800 dark:text-slate-100'}`}>
                            {habit.emoji} {habit.name}
                          </span>
                          <span className={`text-xs font-medium block mt-0.5 ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>
                            {getFrequencyText(habit.frequency)}
                          </span>
                        </div>
                      </div>
                      {streak > 0 && (
                        <div className={`mt-3 sm:mt-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg self-start sm:self-auto ${
                          isCompleted 
                            ? 'bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-300' 
                            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                        }`}>
                          <span>🔥</span>
                          <span>{streak} {habit.frequency.type === 'times_per_week' ? 'semanas' : 'días'}</span>
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="space-y-4 max-w-5xl mx-auto w-full pb-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">Vista Semanal</h3>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors cursor-pointer"
                  >
                    Semana actual
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl shadow-sm">
                <button 
                  onClick={() => setWeekOffset(weekOffset - 1)} 
                  title="Semana anterior"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 px-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                  <CalendarIcon className="w-4 h-4 text-emerald-500" />
                  <span>
                    {weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - {weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <button 
                  onClick={() => setWeekOffset(weekOffset + 1)} 
                  title="Semana siguiente"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {habits.map(habit => {
                const todayObj = new Date();
                todayObj.setHours(0, 0, 0, 0);

                // Only count completions for days up to today (never count future days)
                const compsThisWeek = weekDates.filter(d => {
                  const isFuture = d.getTime() > todayObj.getTime();
                  if (isFuture) return false;
                  return completedRecords.has(`${habit.id}-${formatDateKey(d)}`);
                }).length;

                let progressText = '';
                let isGoalMet = false;

                if (habit.frequency.type === 'times_per_week') {
                  const target = habit.frequency.count;
                  isGoalMet = compsThisWeek >= target;
                  progressText = isGoalMet 
                    ? `✓ Meta cumplida (${compsThisWeek} / ${target} esta semana)` 
                    : `${compsThisWeek} / ${target} tareas esta semana`;
                } else if (habit.frequency.type === 'daily') {
                  isGoalMet = compsThisWeek >= 7;
                  progressText = isGoalMet 
                    ? `✓ Semana completa (7 / 7 días)` 
                    : `${compsThisWeek} / 7 días esta semana`;
                } else if (habit.frequency.type === 'specific_days') {
                  const totalScheduled = weekDates.filter(d => isDayApplicable(d, habit.frequency)).length;
                  isGoalMet = totalScheduled > 0 && compsThisWeek >= totalScheduled;
                  progressText = isGoalMet 
                    ? `✓ Días programados cumplidos (${compsThisWeek} / ${totalScheduled})` 
                    : `${compsThisWeek} / ${totalScheduled} días programados esta semana`;
                } else if (habit.frequency.type === 'interval') {
                  let nextDate = todayObj;
                  for (let i = 0; i < 30; i++) {
                    const check = new Date(todayObj);
                    check.setDate(check.getDate() + i);
                    if (isDayApplicable(check, habit.frequency)) {
                      nextDate = check;
                      break;
                    }
                  }
                  const isTodayCompleted = completedRecords.has(`${habit.id}-${formatDateKey(todayObj)}`);
                  if (nextDate.getTime() === todayObj.getTime() && isTodayCompleted) {
                    progressText = `✓ Completado hoy (Cada ${habit.frequency.days} días)`;
                    isGoalMet = true;
                  } else {
                    const dayLabel = nextDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
                    progressText = `Próximo: ${dayLabel} (Cada ${habit.frequency.days} días)`;
                  }
                }

                const streak = calculateStreak(habit, records);

                return (
                  <div key={habit.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm hover:shadow-md transition-shadow min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xl flex-shrink-0">
                          {habit.emoji}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{habit.name}</h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                            {getFrequencyText(habit.frequency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 relative flex-shrink-0">
                        {streak > 0 && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded-lg">
                            <span>🔥</span>
                            <span>{streak}</span>
                          </div>
                        )}
                        <button onClick={() => setMenuOpenFor(habit.id)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                          <DotsVerticalIcon />
                        </button>
                        {menuOpenFor === habit.id && (
                          <div ref={menuRef} className="absolute right-0 top-8 w-36 bg-white dark:bg-slate-800 rounded-xl shadow-lg z-20 py-1.5 border border-slate-200 dark:border-slate-700">
                            <button onClick={() => { onOpenHabitEditor(habit); setMenuOpenFor(null); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50">Editar hábito</button>
                            <button onClick={() => { setHabitToDelete(habit); setMenuOpenFor(null); }} className="w-full text-left px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40">Eliminar</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="habit-weekly-view-container w-full overflow-x-auto custom-scrollbar -mx-1 px-1 py-1">
                      <div className="flex items-center justify-between min-w-[310px] sm:min-w-[330px] gap-1.5 px-0.5">
                        {weekDates.map((date, index) => {
                          const dateKey = formatDateKey(date);
                          const isFuture = date.getTime() > todayObj.getTime();
                          const isToday = date.getTime() === todayObj.getTime();
                          const isApplicable = isDayApplicable(date, habit.frequency);
                          const isCompleted = !isFuture && completedRecords.has(`${habit.id}-${dateKey}`);
                          const isDisabled = isFuture || (!isApplicable && !isCompleted && habit.frequency.type !== 'times_per_week');
                          const dayNum = date.getDate();

                          return (
                            <div 
                              key={dateKey} 
                              className={`flex flex-col items-center gap-1 flex-1 min-w-[38px] transition-all ${
                                isToday ? 'py-1 px-0.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 shadow-sm' : ''
                              }`}
                            >
                              <span 
                                className={`text-[10px] uppercase tracking-tight transition-colors ${
                                  isToday 
                                    ? 'text-emerald-700 dark:text-emerald-300 font-extrabold' 
                                    : 'text-slate-400 dark:text-slate-500 font-semibold'
                                }`}
                              >
                                {weekDayLabels[index]}
                              </span>
                              <span
                                className={`text-[11px] font-black transition-colors leading-none ${
                                  isToday
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : isFuture
                                      ? 'text-slate-300 dark:text-slate-600 font-semibold'
                                      : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {dayNum}
                              </span>
                              <button 
                                type="button"
                                onClick={() => !isDisabled && onToggleRecord(habit.id, dateKey)}
                                disabled={isDisabled} 
                                title={
                                  isFuture 
                                    ? `${weekDayLabels[index]} ${dayNum} (${dateKey}) - Día futuro (no disponible)` 
                                    : !isApplicable && habit.frequency.type !== 'times_per_week'
                                      ? `${weekDayLabels[index]} ${dayNum} (${dateKey}) - No programado según frecuencia`
                                      : isCompleted 
                                        ? `Completado el ${weekDayLabels[index]} ${dayNum} - Clic para desmarcar` 
                                        : `Marcar como completado el ${weekDayLabels[index]} ${dayNum}`
                                }
                                aria-label={`${habit.name} - ${weekDayLabels[index]} ${dayNum}`}
                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                                  isCompleted 
                                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30 scale-105 hover:bg-emerald-600 cursor-pointer' 
                                    : isToday
                                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-2 border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer shadow-sm'
                                      : isFuture
                                        ? (isApplicable || habit.frequency.type === 'times_per_week')
                                          ? 'bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-slate-700/60 text-transparent cursor-not-allowed opacity-40'
                                          : 'bg-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                        : (!isApplicable && habit.frequency.type !== 'times_per_week')
                                          ? 'bg-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700/60 cursor-pointer'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckIcon className="w-4 h-4" strokeWidth={3} />
                                ) : isToday ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                ) : (!isApplicable && habit.frequency.type !== 'times_per_week') ? (
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                                ) : null}
                              </button>
                              {isToday ? (
                                <span className="text-[8px] font-black tracking-tight text-emerald-700 dark:text-emerald-300 leading-none">
                                  HOY
                                </span>
                              ) : (
                                <span className="text-[8px] opacity-0 select-none leading-none">·</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className={`text-[11px] font-semibold mt-0.5 flex items-center gap-1.5 ${
                      isGoalMet 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {progressText}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {habits.length > 0 && (
              <button
                onClick={onOpenHabitCreator}
                className="w-full bg-transparent border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-50 dark:hover:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer mt-4"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Añadir Nuevo Hábito</span>
              </button>
            )}
          </div>
        )}

        {viewMode === 'stats' && (
          <div className="space-y-6 max-w-5xl mx-auto w-full pb-8">
            <GlobalHabitsOverview habits={habits} records={records} />
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-2 px-2">
              Desglose Individual ({habits.length})
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {habits.map(habit => (
                <HabitStats key={habit.id} habit={habit} records={records} />
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={!!habitToDelete}
        onClose={() => setHabitToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Hábito"
        message={`¿Seguro que quieres eliminar "${habitToDelete?.name}"? Se borrará todo su historial y perderás tu racha.`}
        confirmText="Sí, eliminar"
      />
    </div>
  );
};

export default HabitTracker;
