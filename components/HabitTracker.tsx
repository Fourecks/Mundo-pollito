import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit, HabitRecord, HabitFrequency } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import PlusIcon from './icons/PlusIcon';
import DotsVerticalIcon from './icons/DotsVerticalIcon';
import ConfirmationModal from './ConfirmationModal';
import ChartBarIcon from './icons/ChartBarIcon';
import ListIcon from './icons/ListIcon';
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

const isDayApplicable = (date: Date, freq: HabitFrequency): boolean => {
  if (!freq || !freq.type) return true;
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  switch (freq.type) {
    case 'daily':
    case 'times_per_week':
      return true;
    case 'specific_days':
      return Array.isArray(freq.days) && freq.days.includes(utcDate.getUTCDay());
    case 'interval': {
      if (!freq.startDate || typeof freq.days !== 'number' || freq.days <= 0) return false;
      const startDate = new Date(freq.startDate + "T00:00:00Z");
      if (isNaN(startDate.getTime())) return false;
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
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
      startOfWeek.setUTCDate(startOfWeek.getUTCDate() + 7);
    }
    return longestStreak;
  }

  let maxStreak = 0;
  let currentStreak = 0;
  
  const startDate = new Date(sortedDateStrings[0] + "T00:00:00Z");
  const endDate = new Date();

  for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
    if (isDayApplicable(d, habit.frequency)) {
      const dateKey = d.toISOString().split('T')[0];
      if (completedDates.has(dateKey)) {
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
      const dateKey = new Date(year, month, day).toISOString().split('T')[0];
      if (completedDates.has(dateKey)) {
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
      const dateKey = date.toISOString().split('T')[0];
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

// Global Habits Overview Card for Stats View
const GlobalHabitsOverview: React.FC<{ habits: Habit[], records: HabitRecord[] }> = ({ habits, records }) => {
  const globalTrendData = useMemo(() => {
    const data = [];
    const today = new Date();
    const dayOfWeek = (today.getDay() === 0) ? 6 : today.getDay() - 1;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0,0,0,0);

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
            const dateKey = d.toISOString().split('T')[0];
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
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">Cumplimiento Global de Hábitos</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Promedio de cumplimiento en las últimas 8 semanas</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto">
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
        <ResponsiveContainer width="100%" height="100%">
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
            <Area
              type="monotone"
              dataKey="Cumplimiento"
              name="Cumplimiento %"
              stroke="#059669"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#emeraldArea)"
            />
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
    const dayOfWeek = (today.getDay() === 0) ? 6 : today.getDay() - 1; 
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0,0,0,0);
    
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
          const dateKey = d.toISOString().split('T')[0];
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
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{habit.emoji}</span>
          <div>
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100">{habit.name}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{getFrequencyText(habit.frequency)}</p>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md">
          Cumplimiento: {habitSuccessRate}%
        </div>
      </div>

      {/* KPI Badges - Clean Text Layout */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 text-center">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {currentStreak} <span className="text-[11px] font-normal text-slate-500">días</span>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Racha Actual</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 text-center">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {longestStreak} <span className="text-[11px] font-normal text-slate-500">días</span>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Mejor Racha</p>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 text-center">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {totalCompletions} <span className="text-[11px] font-normal text-slate-500">días</span>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">Total Días</p>
        </div>
      </div>

      {/* Line Chart for Habit Compliance */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-1.5">
          <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tendencia por Semana (%)
          </h5>
        </div>
        <div className="w-full h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyComplianceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="Semana" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomHabitTooltip />} />
              <Line
                type="monotone"
                dataKey="Cumplimiento"
                name="Cumplimiento"
                stroke="#059669"
                strokeWidth={2}
                dot={{ r: 2, fill: '#059669' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Calendar */}
      <ActivityCalendar habit={habit} records={records} />
    </div>
  );
};

export const HabitTracker: React.FC<HabitTrackerProps> = (props) => {
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
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40">
      <header className="flex-shrink-0 p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Mis Hábitos
        </h2>

        <div className="flex items-center gap-2">
          {viewMode === 'week' ? (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs">
              <button onClick={() => setWeekOffset(weekOffset - 1)} className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                <ChevronLeftIcon />
              </button>
              <span className="font-medium text-slate-700 dark:text-slate-200 w-20 text-center">
                {weekStart.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
              </span>
              <button onClick={() => setWeekOffset(weekOffset + 1)} className="p-1 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                <ChevronRightIcon />
              </button>
            </div>
          ) : null}

          {/* Mode Switcher */}
          <button
            onClick={() => setViewMode(v => v === 'week' ? 'stats' : 'week')}
            className={`p-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5 text-xs font-medium ${
              viewMode === 'stats'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {viewMode === 'week' ? <ChartBarIcon /> : <ListIcon />}
            <span>{viewMode === 'week' ? 'Estadísticas' : 'Registro'}</span>
          </button>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto custom-scrollbar p-3.5 space-y-3">
        {viewMode === 'week' ? (
          <>
            {habits.map(habit => {
              let progressText = null;
              if (habit.frequency.type === 'times_per_week') {
                const completionsThisWeek = records.filter(r => {
                  const recordDate = new Date(r.completed_at + 'T00:00:00Z');
                  return r.habit_id === habit.id && recordDate >= weekStart && recordDate <= weekEnd;
                }).length;
                progressText = `${completionsThisWeek}/${habit.frequency.count} esta semana`;
              }
              const streak = calculateStreak(habit, records);

              return (
                <div key={habit.id} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 flex-grow min-w-0">
                      <span className="text-xl">{habit.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-xs sm:text-sm truncate">{habit.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{getFrequencyText(habit.frequency)}</span>
                          {streak > 0 && (
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              Racha: {streak} {habit.frequency.type === 'times_per_week' ? 'sem' : 'd'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative flex-shrink-0">
                      <button onClick={() => setMenuOpenFor(habit.id)} className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded">
                        <DotsVerticalIcon />
                      </button>
                      {menuOpenFor === habit.id && (
                        <div ref={menuRef} className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-md z-20 p-1 border border-slate-200 dark:border-slate-700">
                          <button onClick={() => { onOpenHabitEditor(habit); setMenuOpenFor(null); }} className="w-full text-left px-3 py-1 text-xs font-medium rounded text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">Editar</button>
                          <button onClick={() => { setHabitToDelete(habit); setMenuOpenFor(null); }} className="w-full text-left px-3 py-1 text-xs font-medium rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40">Eliminar</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {progressText && <p className="text-xs text-slate-500 font-medium">{progressText}</p>}

                  <div className="flex items-center justify-between pt-0.5">
                    {weekDates.map((date, index) => {
                      const dateKey = formatDateKey(date);
                      const isCompleted = completedRecords.has(`${habit.id}-${dateKey}`);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const isDisabled = !isDayApplicable(date, habit.frequency) || date > today;

                      return (
                        <div key={dateKey} className="flex flex-col items-center gap-1">
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{weekDayLabels[index]}</span>
                          <button 
                            onClick={() => onToggleRecord(habit.id, dateKey)}
                            disabled={isDisabled}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg transition-colors flex items-center justify-center font-medium text-[11px] sm:text-xs ${
                              isDisabled ? 'bg-slate-100/50 dark:bg-slate-800/40 cursor-not-allowed opacity-40' : 
                              isCompleted ? 'bg-emerald-600 text-white font-semibold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <span>{date.getDate()}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <button
              onClick={onOpenHabitCreator}
              className="w-full bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-3 text-center text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              <PlusIcon />
              <span>Añadir Nuevo Hábito</span>
            </button>
          </>
        ) : (
          /* STATS MODE WITH LINE CHARTS AND GLOBAL OVERVIEW */
          <div className="space-y-3">
            <GlobalHabitsOverview habits={habits} records={records} />

            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-1">
              Desglose Individual ({habits.length})
            </div>

            {habits.map(habit => (
              <HabitStats key={habit.id} habit={habit} records={records} />
            ))}
          </div>
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
