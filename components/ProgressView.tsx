import React, { useState, useMemo } from 'react';
import { Todo, Project, Habit, HabitRecord, HabitFrequency, FocusSession } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// --- Helper Functions ---
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

// Clean Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-sm text-xs space-y-1 min-w-[120px]">
        <p className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-3 font-medium text-slate-600 dark:text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.stroke || entry.fill }} />
              <span>{entry.name}:</span>
            </span>
            <span className="font-bold text-slate-900 dark:text-white">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const PROJECT_COLORS = [
  '#059669', // Emerald
  '#6366f1', // Indigo
  '#0284c7', // Sky
  '#d97706', // Amber
  '#e11d48', // Rose
  '#8b5cf6', // Violet
  '#0d9488', // Teal
];

interface ProgressViewProps {
  allTodos: { [key: string]: Todo[] };
  projects: Project[];
  habits: Habit[];
  habitRecords: HabitRecord[];
  focusSessions?: FocusSession[];
  onBack?: () => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  allTodos,
  projects,
  habits,
  habitRecords,
  focusSessions,
  onBack
}) => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [offset, setOffset] = useState(0);
  const [chartMode, setChartMode] = useState<'line' | 'area' | 'bar'>('area');

  // Calculate Date Range
  const { rangeLabel, daysList, prevStart, prevEnd } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (period === 'week') {
      const currentDay = now.getDay();
      const dayOffset = currentDay === 0 ? -6 : 1 - currentDay;

      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset + (offset * 7));
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);

      const pStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - 7);
      const pEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 7);

      const days = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }

      const startStr = startDate.toLocaleDateString('es-ES', { day: 'numeric' });
      const endStr = endDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

      return {
        start: startDate,
        end: endDate,
        rangeLabel: offset === 0 ? 'Esta Semana' : `${startStr} - ${endStr}`,
        daysList: days,
        prevStart: pStart,
        prevEnd: pEnd
      };
    } else {
      const startDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);

      const pStart = new Date(now.getFullYear(), now.getMonth() + offset - 1, 1);
      const pEnd = new Date(now.getFullYear(), now.getMonth() + offset, 0);

      const days = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        days.push(new Date(d));
      }

      const label = startDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      return {
        start: startDate,
        end: endDate,
        rangeLabel: label.charAt(0).toUpperCase() + label.slice(1),
        daysList: days,
        prevStart: pStart,
        prevEnd: pEnd
      };
    }
  }, [period, offset]);

  // Tasks Data for current period and previous period
  const { chartData, totalCompleted, previousTotal, mostProductiveDay } = useMemo(() => {
    let runningTotal = 0;
    let maxTasks = 0;
    let topDay = { dayName: '', count: 0 };

    const data = daysList.map((d) => {
      const dateKey = d.toISOString().split('T')[0];
      const dayTasks = allTodos[dateKey] || [];
      const completedTasks = dayTasks.filter(t => t.completed);
      const count = completedTasks.length;

      runningTotal += count;
      if (count > maxTasks) {
        maxTasks = count;
        const dayName = d.toLocaleDateString('es-ES', period === 'week' ? { weekday: 'short' } : { day: 'numeric', month: 'short' });
        topDay = { dayName: dayName.toUpperCase(), count };
      }

      const dayLabel = period === 'week'
        ? d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()
        : d.getDate().toString();

      return {
        dateKey,
        label: dayLabel,
        Tareas: count,
        Acumulado: runningTotal,
      };
    });

    // Previous Period Count
    let prevTotal = 0;
    for (let d = new Date(prevStart); d <= prevEnd; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const dayTasks = allTodos[dateKey] || [];
      prevTotal += dayTasks.filter(t => t.completed).length;
    }

    return {
      chartData: data,
      totalCompleted: runningTotal,
      previousTotal: prevTotal,
      maxTasksOnSingleDay: Math.max(1, maxTasks),
      mostProductiveDay: topDay.count > 0 ? topDay : null
    };
  }, [daysList, allTodos, period, prevStart, prevEnd]);

  // Growth Percentage
  const growthPercentage = useMemo(() => {
    if (previousTotal === 0) return totalCompleted > 0 ? 100 : 0;
    return Math.round(((totalCompleted - previousTotal) / previousTotal) * 100);
  }, [totalCompleted, previousTotal]);

  // Daily Average
  const dailyAverage = useMemo(() => {
    if (daysList.length === 0) return '0';
    return (totalCompleted / daysList.length).toFixed(1);
  }, [totalCompleted, daysList]);

  // Focus sessions calculations for selected period
  const { focusChartData, totalFocusMinutes, prevFocusMinutes, focusTrendText, totalFocusSessions, averageFocusSessionDuration, dailyFocusAverage } = useMemo(() => {
    const sessions = focusSessions || [];
    let periodTotal = 0;
    let periodSessionsCount = 0;

    const data = daysList.map((d) => {
      const dateKey = d.toISOString().split('T')[0];
      const daySessions = sessions.filter(s => s.completed_at === dateKey);
      const minutes = daySessions.reduce((acc, s) => acc + s.duration, 0);
      periodTotal += minutes;
      periodSessionsCount += daySessions.length;

      const dayLabel = period === 'week'
        ? d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()
        : d.getDate().toString();

      return {
        dateKey,
        label: dayLabel,
        Minutos: minutes,
      };
    });

    let prevTotal = 0;
    const pStart = new Date(prevStart);
    const pEnd = new Date(prevEnd);
    for (let d = new Date(pStart); d <= pEnd; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      const daySessions = sessions.filter(s => s.completed_at === dateKey);
      prevTotal += daySessions.reduce((acc, s) => acc + s.duration, 0);
    }

    const diff = periodTotal - prevTotal;
    let trend = 'vs periodo anterior';
    if (diff > 0) {
      trend = `+${diff} min vs anterior`;
    } else if (diff < 0) {
      trend = `${diff} min vs anterior`;
    } else {
      trend = `Igual vs anterior`;
    }

    const averageDuration = periodSessionsCount > 0 ? Math.round(periodTotal / periodSessionsCount) : 0;
    const dailyAvg = daysList.length > 0 ? Math.round(periodTotal / daysList.length) : 0;

    return {
      focusChartData: data,
      totalFocusMinutes: periodTotal,
      prevFocusMinutes: prevTotal,
      focusTrendText: trend,
      totalFocusSessions: periodSessionsCount,
      averageFocusSessionDuration: averageDuration,
      dailyFocusAverage: dailyAvg,
    };
  }, [daysList, focusSessions, period, prevStart, prevEnd]);

  // Project Focus Breakdown
  const projectFocusData = useMemo(() => {
    const counts = new Map<number, { count: number; name: string; color: string }>();

    daysList.forEach(d => {
      const dateKey = d.toISOString().split('T')[0];
      const dayTasks = allTodos[dateKey] || [];
      dayTasks.forEach(t => {
        if (t.completed && t.project_id) {
          const existing = counts.get(t.project_id) || { count: 0, name: '', color: '' };
          counts.set(t.project_id, { ...existing, count: existing.count + 1 });
        }
      });
    });

    projects.forEach(p => {
      if (counts.has(p.id)) {
        const item = counts.get(p.id)!;
        counts.set(p.id, {
          ...item,
          name: p.name,
          color: p.color || PROJECT_COLORS[p.id % PROJECT_COLORS.length]
        });
      }
    });

    const list = Array.from(counts.values()).filter(p => p.count > 0).sort((a, b) => b.count - a.count);
    return list;
  }, [daysList, allTodos, projects]);

  // Top Habit Streaks
  const topHabits = useMemo(() => {
    return habits
      .map(h => ({ ...h, streak: calculateStreak(h, habitRecords) }))
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 4);
  }, [habits, habitRecords]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/40 p-3 sm:p-5 space-y-4">
      {/* Mobile Back Header */}
      {onBack && (
        <header className="flex-shrink-0 flex items-center gap-2 md:hidden">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
            <ChevronLeftIcon />
          </button>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Estadísticas y Progreso</h2>
        </header>
      )}

      {/* Header Bar */}
      <header className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Progreso & Rendimiento</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Resumen de actividad, tareas y hábitos</p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Period Selector */}
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center text-xs font-medium">
            <button
              onClick={() => { setPeriod('week'); setOffset(0); }}
              className={`px-3 py-1 rounded-md transition-colors ${
                period === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => { setPeriod('month'); setOffset(0); }}
              className={`px-3 py-1 rounded-md transition-colors ${
                period === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Mes
            </button>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setOffset(offset - 1)}
              className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Anterior"
            >
              <ChevronLeftIcon />
            </button>
            <span className="font-medium text-slate-700 dark:text-slate-200 px-2 min-w-[90px] text-center">
              {rangeLabel}
            </span>
            <button
              onClick={() => setOffset(offset + 1)}
              disabled={offset >= 0}
              className="p-1 rounded-md hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Siguiente"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4">

        {/* Metric Cards Grid - Simple & Clean */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Tareas Completadas
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
              {totalCompleted}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
              {growthPercentage >= 0 ? `+${growthPercentage}%` : `${growthPercentage}%`} vs periodo anterior
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Tiempo Enfocado
            </div>
            <div className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400">
              {totalFocusMinutes >= 60 ? `${Math.floor(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m` : `${totalFocusMinutes}m`}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal truncate">
              {focusTrendText}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Promedio Diario
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
              {dailyAverage}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
              tareas por día
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Día Más Activo
            </div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white truncate">
              {mostProductiveDay ? mostProductiveDay.dayName : '---'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-normal">
              {mostProductiveDay ? `${mostProductiveDay.count} tareas` : 'Sin registros'}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Racha Destacada
            </div>
            <div className="text-2xl font-semibold text-slate-900 dark:text-white">
              {topHabits[0]?.streak || 0} <span className="text-xs font-normal text-slate-500 dark:text-slate-400">días</span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1 font-normal">
              {topHabits[0] ? topHabits[0].name : 'Sin hábitos'}
            </div>
          </div>
        </div>

        {/* SECTION 1: MAIN PERFORMANCE CHART */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Evolución de Rendimiento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tareas completadas a lo largo del tiempo</p>
            </div>

            {/* Chart Mode Selector */}
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center text-xs font-medium self-end sm:self-auto">
              <button
                onClick={() => setChartMode('area')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartMode === 'area'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Área
              </button>
              <button
                onClick={() => setChartMode('line')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartMode === 'line'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Línea
              </button>
              <button
                onClick={() => setChartMode('bar')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  chartMode === 'bar'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Barras
              </button>
            </div>
          </div>

          <div className="w-full h-60 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="Tareas"
                    name="Completadas"
                    stroke="#059669"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#emeraldGradient)"
                  />
                </AreaChart>
              ) : chartMode === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="Tareas"
                    name="Completadas"
                    stroke="#059669"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#059669' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Acumulado"
                    name="Acumulado"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="Tareas"
                    name="Completadas"
                    fill="#059669"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 1.5: FOCUS STATISTICS PANEL */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div>
              <h3 className="font-semibold text-sm text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Estadísticas de Enfoque (Concentración)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tiempo total acumulado dedicado a tareas y estudio</p>
            </div>

            {/* Quick Metrics in Header */}
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 dark:text-slate-400">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400">SESIONES</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{totalFocusSessions} comp.</span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400">PROMEDIO</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{averageFocusSessionDuration} min</span>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400">DIARIO</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{dailyFocusAverage} min</span>
              </div>
            </div>
          </div>

          <div className="w-full h-60 pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={focusChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  label={{ value: 'Minutos', angle: -90, position: 'insideLeft', offset: 10, fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Minutos"
                  name="Minutos de Enfoque"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#indigoGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SECTION 2: GRID FOR PROJECTS AND HABITS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Project Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Distribución por Proyectos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Proporción de tareas según proyecto</p>
            </div>

            {projectFocusData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                <div className="w-32 h-32 relative flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectFocusData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={32}
                        outerRadius={55}
                        paddingAngle={2}
                      >
                        {projectFocusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-[10px] text-slate-400 font-medium">TOTAL</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {projectFocusData.reduce((acc, p) => acc + p.count, 0)}
                    </span>
                  </div>
                </div>

                <div className="flex-grow space-y-2 w-full">
                  {projectFocusData.map((proj) => {
                    const totalProjs = projectFocusData.reduce((acc, p) => acc + p.count, 0);
                    const pct = Math.round((proj.count / totalProjs) * 100);
                    return (
                      <div key={proj.name} className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: proj.color }} />
                            <span className="truncate">{proj.name}</span>
                          </span>
                          <span className="text-slate-500 font-medium">{proj.count} ({pct}%)</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: proj.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400 py-8">
                No hay tareas de proyectos completadas en este periodo.
              </div>
            )}
          </div>

          {/* Top Habit Streaks */}
          <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 space-y-3">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Hábitos en Crecimiento
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Rachas activas de tus hábitos</p>
            </div>

            {topHabits.length > 0 ? (
              <div className="space-y-2 pt-1">
                {topHabits.map((habit) => (
                  <div
                    key={habit.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">{habit.emoji}</span>
                      <div className="min-w-0">
                        <div className="font-medium text-xs text-slate-800 dark:text-slate-200 truncate">
                          {habit.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {habit.frequency.type === 'daily' ? 'Diario' : 'Periódico'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-600">
                      {habit.streak} días
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400 py-8">
                No hay hábitos registrados.
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default ProgressView;
