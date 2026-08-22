import React, { useState, useMemo, useEffect } from 'react';
import { Todo, Subtask, QuickNote, GoogleCalendarEvent, FocusSession } from '../types';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ClockIcon from './icons/ClockIcon';
import PlusIcon from './icons/PlusIcon';
import XIcon from './icons/XIcon';
import CalendarIcon from './icons/CalendarIcon';
import { Target, Pencil, Check, Trash2, X, Sparkles } from 'lucide-react';

const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hour, minute] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(hour, 10), parseInt(minute, 10));
    return d.toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit', hour12: true });
};

interface AgendaItemProps {
  task: Todo;
  onToggleTask: (taskId: number) => void;
  onToggleSubtask: (taskId: number, subtaskId: number) => void;
  activeFocusTaskId?: number | null;
  onSelectFocusTask?: (taskId: number | null) => void;
  focusSessions?: FocusSession[];
  isFocusTimerRunning?: boolean;
}

const AgendaItem: React.FC<AgendaItemProps> = ({ 
  task, 
  onToggleTask, 
  onToggleSubtask,
  activeFocusTaskId = null,
  onSelectFocusTask,
  focusSessions = [],
  isFocusTimerRunning = false
}) => {
  const [isExpanded, useState_isExpanded] = useState(false);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;

  const isCurrentlyFocused = activeFocusTaskId === task.id;

  const focusTimeForTask = useMemo(() => {
    return focusSessions
      .filter(s => s.task_id === task.id)
      .reduce((acc, curr) => acc + curr.duration, 0);
  }, [focusSessions, task.id]);

  return (
    <div className={`p-2 rounded-lg text-sm transition-all duration-200 border ${
      isCurrentlyFocused && isFocusTimerRunning
        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 ring-1 ring-red-200/50 dark:ring-red-900/30 shadow-sm animate-pulse'
        : 'bg-white/60 dark:bg-gray-700/50 border-transparent'
    }`}>
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0">
          <label className="flex items-center cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleTask(task.id)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 ${task.completed ? 'bg-pink-400 border-pink-400' : 'bg-white dark:bg-gray-600 border-gray-300 dark:border-gray-500'}`}>
                {task.completed && (
                  <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
          </label>
        </div>
        <div className="flex-grow min-w-0 cursor-pointer" onClick={() => onToggleTask(task.id)}>
          {task.start_time ? (
            <span className={`font-semibold text-xs flex items-center gap-1 ${task.completed ? 'text-gray-400 dark:text-gray-500' : 'text-pink-600 dark:text-pink-400'}`}>
              <ClockIcon className="h-3 w-3" />
              {formatTime(task.start_time)}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Sin hora</span>
          )}
          <p className={`truncate text-gray-700 dark:text-gray-200 mt-0.5 ${task.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-on-transparent'}`}>
            {task.text}
          </p>
        </div>
        
        {/* Focus timer indicator & target button */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {focusTimeForTask > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100/70 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[10px] font-bold rounded border border-red-200/50 dark:border-red-900/40">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
              {focusTimeForTask}m
            </span>
          )}
          {!task.completed && onSelectFocusTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectFocusTask(isCurrentlyFocused ? null : task.id);
              }}
              title={isCurrentlyFocused ? (isFocusTimerRunning ? "Detener enfoque" : "Enfoque pausado") : "Enfocar en esta tarea con Pomodoro"}
              className={`p-1 rounded-md transition-all duration-150 ${
                isCurrentlyFocused 
                  ? isFocusTimerRunning 
                    ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-300 dark:ring-red-900/60' 
                    : 'bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-400 ring-1 ring-sky-300/50 dark:ring-sky-800/50'
                  : 'text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-gray-600/50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" strokeWidth="2" />
                <circle cx="12" cy="12" r="5" strokeWidth="2" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </button>
          )}
        </div>

        {hasSubtasks && (
          <button onClick={() => useState_isExpanded(!isExpanded)} className="p-1 rounded-full hover:bg-yellow-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0">
            <ChevronDownIcon className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {isExpanded && hasSubtasks && (
        <div className="pl-7 pt-2 mt-1 border-t border-yellow-200/50 dark:border-gray-600/50 space-y-1.5 animate-pop-in">
          {task.subtasks?.map(subtask => (
            <div key={subtask.id} className="flex items-center gap-2">
              <label className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={() => onToggleSubtask(task.id, subtask.id)}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded-sm border-2 transition-all duration-200 ${subtask.completed ? 'bg-pink-300 border-pink-300' : 'bg-white dark:bg-gray-500 border-gray-300 dark:border-gray-400'}`}>
                    {subtask.completed && (
                      <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </label>
              <p className={`text-xs flex-grow truncate cursor-pointer ${subtask.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`} onClick={() => onToggleSubtask(task.id, subtask.id)}>
                {subtask.text}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CalendarEventItem: React.FC<{ event: GoogleCalendarEvent }> = ({ event }) => {
    const formatEventTime = (start: { dateTime?: string; date?: string }, end: { dateTime?: string; date?: string }) => {
        if (start.dateTime && end.dateTime) {
            const startTime = new Date(start.dateTime).toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit' });
            const endTime = new Date(end.dateTime).toLocaleTimeString('es-ES', { hour: 'numeric', minute: '2-digit' });
            return `${startTime} - ${endTime}`;
        }
        return 'Todo el día';
    };

    return (
        <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="bg-blue-100/60 dark:bg-blue-900/40 p-2 rounded-lg text-sm transition-all duration-200 flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/60">
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-blue-400 rounded-md">
                <CalendarIcon className="h-3 w-3 text-white" />
            </div>
            <div className="flex-grow min-w-0">
                <p className="font-semibold text-xs text-blue-600 dark:text-blue-300">
                    {formatEventTime(event.start, event.end)}
                </p>
                <p className="truncate text-gray-700 dark:text-gray-200 mt-0.5 font-semibold text-on-transparent">
                    {event.summary}
                </p>
            </div>
        </a>
    );
};

const AgendaView: React.FC<Pick<TodaysAgendaProps, 'tasks' | 'calendarEvents' | 'onToggleTask' | 'onToggleSubtask' | 'activeFocusTaskId' | 'onSelectFocusTask' | 'focusSessions' | 'isFocusTimerRunning'>> = ({ 
  tasks, 
  calendarEvents, 
  onToggleTask, 
  onToggleSubtask,
  activeFocusTaskId,
  onSelectFocusTask,
  focusSessions,
  isFocusTimerRunning = false
}) => {
    
    const agendaItems = useMemo(() => {
        const todayKey = new Date().toISOString().split('T')[0];
        const linkedGcalIds = new Set<string>();
        const taskTitlesSet = new Set<string>();

        // Process tasks for today
        const processedTasks: Todo[] = [];
        for (const t of tasks) {
            if (t.gcal_event_id) {
                linkedGcalIds.add(t.gcal_event_id);
            }
            if (t.text) {
                taskTitlesSet.add(t.text.trim().toLowerCase());
            }
            processedTasks.push(t);
        }

        // Process calendar events for today that aren't already represented in tasks
        const syntheticTasksFromEvents: Todo[] = [];
        for (const e of calendarEvents) {
            const eventDate = e.start.dateTime ? e.start.dateTime.split('T')[0] : e.start.date;
            if (eventDate !== todayKey) continue;
            if (linkedGcalIds.has(e.id)) continue;
            if (taskTitlesSet.has((e.summary || '').trim().toLowerCase())) continue;

            const startTimeStr = e.start.dateTime ? e.start.dateTime.substring(11, 16) : undefined;
            const endTimeStr = e.end?.dateTime ? e.end.dateTime.substring(11, 16) : undefined;

            // Compute deterministic virtual ID
            let hash = 0;
            for (let i = 0; i < e.id.length; i++) {
                hash = (hash << 5) - hash + e.id.charCodeAt(i);
                hash |= 0;
            }
            const virtualId = -(Math.abs(hash) || 999999);

            syntheticTasksFromEvents.push({
                id: virtualId,
                text: e.summary || 'Evento de calendario',
                completed: false,
                due_date: todayKey,
                start_time: startTimeStr,
                end_time: endTimeStr,
                notes: e.description || e.location ? `${e.location ? '📍 ' + e.location + '\n' : ''}${e.description || ''}` : undefined,
                priority: 'media',
                gcal_event_id: e.id,
                calendar_provider: (e as any).provider || 'google',
                calendar_event_link: e.htmlLink,
            });
        }

        const allCombined = [...processedTasks, ...syntheticTasksFromEvents];

        return allCombined.sort((a, b) => {
            if (isFocusTimerRunning && activeFocusTaskId) {
                if (a.id === activeFocusTaskId) return -1;
                if (b.id === activeFocusTaskId) return 1;
            }
            const timeA = a.start_time || '23:59:59';
            const timeB = b.start_time || '23:59:59';
            return timeA.localeCompare(timeB);
        });
    }, [tasks, calendarEvents, isFocusTimerRunning, activeFocusTaskId]);

    return (
      <>
        {agendaItems.length > 0 ? (
          agendaItems.map(item => (
            <AgendaItem
              key={`task-${item.id}`}
              task={item}
              onToggleTask={onToggleTask}
              onToggleSubtask={onToggleSubtask}
              activeFocusTaskId={activeFocusTaskId}
              onSelectFocusTask={onSelectFocusTask}
              focusSessions={focusSessions}
              isFocusTimerRunning={isFocusTimerRunning}
            />
          ))
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-4 px-2">
            <p>No tienes nada para hoy.</p>
          </div>
        )}
      </>
    );
};

const NotesView: React.FC<Pick<TodaysAgendaProps, 'quickNotes' | 'onAddQuickNote' | 'onDeleteQuickNote' | 'onClearAllQuickNotes'>> = ({ quickNotes, onAddQuickNote, onDeleteQuickNote, onClearAllQuickNotes }) => {
    const [newNoteText, setNewNoteText] = useState('');

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        if (newNoteText.trim()) {
            onAddQuickNote(newNoteText);
            setNewNoteText('');
        }
    };

    return (
      <div>
        <form onSubmit={handleAddNote} className="flex items-center gap-2 mb-2 p-1">
            <input 
                type="text" 
                value={newNoteText || ''} 
                onChange={(e) => setNewNoteText(e.target.value)} 
                placeholder="Anota algo rápido..."
                className="flex-grow min-w-0 bg-white/60 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 border-2 border-yellow-200 dark:border-gray-600 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-pink-300 dark:focus:ring-pink-500 transition-colors text-sm"
            />
            <button 
                type="submit" 
                className="bg-pink-400 text-white p-2 rounded-lg hover:bg-pink-500 transition-colors flex-shrink-0 disabled:opacity-50"
                disabled={!newNoteText.trim()}
                aria-label="Añadir nota"
            >
                <PlusIcon />
            </button>
        </form>
        {quickNotes.length > 0 ? (
            <div className="space-y-1.5">
                {quickNotes.map(note => (
                    <div key={note.id} className="flex items-center justify-between bg-white/60 dark:bg-gray-700/50 p-2 rounded-lg group text-sm">
                        <p className="text-gray-700 dark:text-gray-200 break-words flex-grow text-on-transparent">{note.text}</p>
                        <button 
                            onClick={() => onDeleteQuickNote(note.id)} 
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-1 rounded-full transition-opacity flex-shrink-0 ml-2"
                            aria-label="Eliminar nota"
                        >
                            <XIcon className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <div className="pt-2 mt-2 border-t border-yellow-200/50 dark:border-gray-600/50">
                    <button onClick={onClearAllQuickNotes} className="w-full text-center text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline font-semibold transition-colors">
                        Limpiar Todo
                    </button>
                </div>
            </div>
        ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-4 px-2">
                <p>No hay notas rápidas.</p>
            </div>
        )}
      </div>
    );
};

export interface TodaysAgendaProps {
  tasks: Todo[];
  calendarEvents: GoogleCalendarEvent[];
  onToggleTask: (taskId: number) => void;
  onToggleSubtask: (taskId: number, subtaskId: number) => void;
  quickNotes: QuickNote[];
  onAddQuickNote: (text: string) => void;
  onDeleteQuickNote: (id: number) => void;
  onClearAllQuickNotes: () => void;
  activeFocusTaskId?: number | null;
  onSelectFocusTask?: (taskId: number | null) => void;
  focusSessions?: FocusSession[];
  isFocusTimerRunning?: boolean;
  mainDailyGoal?: { text: string; completed: boolean } | string;
  onSetMainDailyGoal?: (goal: string) => void;
  onUpdateMainDailyGoal?: (goal: { text: string; completed: boolean } | null) => void;
}

const TodaysAgenda: React.FC<TodaysAgendaProps> = (props) => {
    const { 
        tasks, 
        calendarEvents,
        onToggleTask, 
        onToggleSubtask,
        quickNotes,
        onAddQuickNote,
        onDeleteQuickNote,
        onClearAllQuickNotes,
        activeFocusTaskId = null,
        onSelectFocusTask,
        focusSessions = [],
        isFocusTimerRunning = false,
        mainDailyGoal: propMainGoal,
        onSetMainDailyGoal: propOnSetMainGoal,
        onUpdateMainDailyGoal: propOnUpdateMainGoal
    } = props;
    const [activeView, setActiveView] = useState<'agenda' | 'notes'>('agenda');

    // Date-scoped Main Daily Goal state with local persistence and cross-component sync
    const todayKey = useMemo(() => new Date().toLocaleDateString('en-CA'), []);
    const storageGoalKey = `pollito_main_daily_goal_${todayKey}`;
    const storageCompletedKey = `pollito_main_daily_goal_completed_${todayKey}`;

    const [dailyGoal, setDailyGoal] = useState<string>(() => {
      if (propMainGoal !== undefined) {
        if (typeof propMainGoal === 'object' && propMainGoal !== null) {
          return propMainGoal.text || '';
        }
        return propMainGoal || '';
      }
      try {
        return localStorage.getItem(storageGoalKey) || '';
      } catch {
        return '';
      }
    });

    const [isGoalCompleted, setIsGoalCompleted] = useState<boolean>(() => {
      if (propMainGoal !== undefined && typeof propMainGoal === 'object' && propMainGoal !== null) {
        return !!propMainGoal.completed;
      }
      try {
        return localStorage.getItem(storageCompletedKey) === 'true';
      } catch {
        return false;
      }
    });

    const [isEditingGoal, setIsEditingGoal] = useState<boolean>(() => !dailyGoal);
    const [goalInput, setGoalInput] = useState<string>(dailyGoal);

    // Synchronize with external prop if provided
    useEffect(() => {
      if (propMainGoal !== undefined) {
        const text = typeof propMainGoal === 'object' && propMainGoal !== null ? propMainGoal.text || '' : propMainGoal || '';
        const completed = typeof propMainGoal === 'object' && propMainGoal !== null ? !!propMainGoal.completed : false;
        
        setDailyGoal(text);
        setGoalInput(text);
        setIsGoalCompleted(completed);
        if (text) {
          setIsEditingGoal(false);
        }
      }
    }, [propMainGoal]);

    // Listen for cross-view updates (e.g. between mobile & desktop views)
    useEffect(() => {
      const handleStorageUpdate = () => {
        try {
          const savedGoal = localStorage.getItem(storageGoalKey) || '';
          const savedCompleted = localStorage.getItem(storageCompletedKey) === 'true';
          setDailyGoal(savedGoal);
          setIsGoalCompleted(savedCompleted);
          if (savedGoal && !isEditingGoal) {
            setGoalInput(savedGoal);
          }
        } catch {}
      };

      window.addEventListener('storage', handleStorageUpdate);
      window.addEventListener('main-daily-goal-changed', handleStorageUpdate);
      return () => {
        window.removeEventListener('storage', handleStorageUpdate);
        window.removeEventListener('main-daily-goal-changed', handleStorageUpdate);
      };
    }, [storageGoalKey, storageCompletedKey, isEditingGoal]);

    const notifyChange = () => {
      window.dispatchEvent(new Event('main-daily-goal-changed'));
    };

    const handleSaveGoal = (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = goalInput.trim();
      if (!trimmed) return;

      setDailyGoal(trimmed);
      setIsEditingGoal(false);
      try {
        localStorage.setItem(storageGoalKey, trimmed);
      } catch {}
      
      if (propOnSetMainGoal) {
        propOnSetMainGoal(trimmed);
      }
      if (propOnUpdateMainGoal) {
        propOnUpdateMainGoal({ text: trimmed, completed: isGoalCompleted });
      }
      notifyChange();
    };

    const handleToggleCompleted = () => {
      const nextCompleted = !isGoalCompleted;
      setIsGoalCompleted(nextCompleted);
      try {
        localStorage.setItem(storageCompletedKey, String(nextCompleted));
      } catch {}

      if (propOnUpdateMainGoal && dailyGoal) {
        propOnUpdateMainGoal({ text: dailyGoal, completed: nextCompleted });
      }
      notifyChange();
    };

    const handleClearGoal = () => {
      setDailyGoal('');
      setGoalInput('');
      setIsGoalCompleted(false);
      setIsEditingGoal(true);
      try {
        localStorage.removeItem(storageGoalKey);
        localStorage.removeItem(storageCompletedKey);
      } catch {}
      if (propOnSetMainGoal) {
        propOnSetMainGoal('');
      }
      if (propOnUpdateMainGoal) {
        propOnUpdateMainGoal(null);
      }
      notifyChange();
    };

    const handleStartEdit = () => {
      setGoalInput(dailyGoal);
      setIsEditingGoal(true);
    };

    const handleCancelEdit = () => {
      setGoalInput(dailyGoal);
      setIsEditingGoal(false);
    };
    
    return (
        <div id="todays-agenda-card" className="w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-2.5 transition-all duration-200">
             {/* Prominently Displayed Main Daily Goal Section */}
             <div 
               id="main-daily-goal-container"
               className={`rounded-xl p-2.5 mb-2.5 border transition-all duration-300 shadow-sm ${
                 isGoalCompleted
                   ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border-emerald-300/70 dark:border-emerald-700/60'
                   : 'bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 dark:from-amber-950/40 dark:via-rose-950/30 dark:to-amber-950/40 border-amber-300/80 dark:border-amber-700/60'
               }`}
             >
                {/* Header with Badge & Status */}
                <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                        <span className={`p-1 rounded-md flex items-center justify-center ${
                          isGoalCompleted 
                            ? 'bg-emerald-500 text-white dark:bg-emerald-600 shadow-xs' 
                            : 'bg-amber-500 text-white dark:bg-amber-600 shadow-xs'
                        }`}>
                            <Target className="w-3.5 h-3.5" />
                        </span>
                        <span className={`text-[11px] font-bold uppercase tracking-wider ${
                          isGoalCompleted 
                            ? 'text-emerald-700 dark:text-emerald-300' 
                            : 'text-amber-800 dark:text-amber-300'
                        }`}>
                            Meta Principal del Día
                        </span>
                    </div>
                    {dailyGoal && !isEditingGoal && (
                        <div className="flex items-center gap-1">
                            {isGoalCompleted && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-300/60 dark:border-emerald-700/60">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    ¡Logrado!
                                </span>
                            )}
                            <button 
                                id="edit-daily-goal-button"
                                type="button"
                                onClick={handleStartEdit}
                                title="Editar meta principal"
                                aria-label="Editar meta principal"
                                className="p-1 text-gray-500 hover:text-amber-600 dark:text-gray-400 dark:hover:text-amber-400 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                            <button 
                                id="delete-daily-goal-button"
                                type="button"
                                onClick={handleClearGoal}
                                title="Eliminar o cambiar meta principal"
                                aria-label="Eliminar meta principal"
                                className="p-1 text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Body: Text Input or Prominent Display */}
                {isEditingGoal || !dailyGoal ? (
                    <form onSubmit={handleSaveGoal} className="mt-2">
                        <div className="flex items-center gap-1.5">
                            <input 
                                id="main-daily-goal-input"
                                type="text" 
                                value={goalInput} 
                                onChange={(e) => setGoalInput(e.target.value)} 
                                placeholder="🎯 ¿Cuál es tu meta principal hoy?"
                                autoFocus={isEditingGoal && !!dailyGoal}
                                className="flex-grow min-w-0 bg-white/90 dark:bg-gray-700/90 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400 border border-amber-300/80 dark:border-amber-600/60 rounded-lg py-1.5 px-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-400 transition-all text-xs font-medium"
                            />
                            <button 
                                id="save-daily-goal-button"
                                type="submit" 
                                disabled={!goalInput.trim()}
                                aria-label="Guardar meta principal"
                                className="bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white p-2 rounded-lg transition-all flex-shrink-0 disabled:opacity-40 shadow-xs flex items-center justify-center cursor-pointer"
                            >
                                <Check className="w-3.5 h-3.5" />
                            </button>
                            {dailyGoal && (
                                <button 
                                    id="cancel-edit-daily-goal-button"
                                    type="button"
                                    onClick={handleCancelEdit}
                                    aria-label="Cancelar edición"
                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-all flex-shrink-0 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </form>
                ) : (
                    <div 
                        id="main-daily-goal-display"
                        className="mt-2 flex items-start gap-2 cursor-pointer group"
                        onClick={handleToggleCompleted}
                    >
                        <div className="flex-shrink-0 mt-0.5">
                            <div className={`w-4 h-4 rounded-md border-2 transition-all flex items-center justify-center ${
                                isGoalCompleted 
                                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                                  : 'bg-white dark:bg-gray-700 border-amber-400 dark:border-amber-500 group-hover:border-emerald-500'
                            }`}>
                                {isGoalCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                        </div>
                        <p className={`text-xs font-semibold break-words leading-relaxed flex-grow select-none transition-all ${
                            isGoalCompleted 
                              ? 'line-through text-emerald-800 dark:text-emerald-300' 
                              : 'text-gray-800 dark:text-gray-100 group-hover:text-amber-700 dark:group-hover:text-amber-300'
                        }`}>
                            {dailyGoal}
                        </p>
                    </div>
                )}
             </div>

             {/* View Navigation Tabs */}
             <div className="flex border-b border-yellow-200/50 dark:border-gray-700/50 mb-2">
                <button 
                    id="tab-agenda-button"
                    onClick={() => setActiveView('agenda')} 
                    className={`flex-1 text-center font-semibold py-1.5 text-sm transition-colors rounded-t-lg ${activeView === 'agenda' ? 'text-gray-800 dark:text-gray-100 bg-white/80 dark:bg-gray-600/80 text-on-transparent' : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                    Agenda
                </button>
                <button 
                    id="tab-notes-button"
                    onClick={() => setActiveView('notes')} 
                    className={`flex-1 text-center font-semibold py-1.5 text-sm transition-colors rounded-t-lg ${activeView === 'notes' ? 'text-gray-800 dark:text-gray-100 bg-white/80 dark:bg-gray-600/80 text-on-transparent' : 'text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                    Notas Rápidas
                </button>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                 {activeView === 'agenda' ? (
                    <AgendaView 
                        tasks={tasks} 
                        calendarEvents={calendarEvents} 
                        onToggleTask={onToggleTask} 
                        onToggleSubtask={onToggleSubtask} 
                        activeFocusTaskId={activeFocusTaskId}
                        onSelectFocusTask={onSelectFocusTask}
                        focusSessions={focusSessions}
                        isFocusTimerRunning={isFocusTimerRunning}
                    />
                 ) : (
                    <NotesView 
                        quickNotes={quickNotes} 
                        onAddQuickNote={onAddQuickNote} 
                        onDeleteQuickNote={onDeleteQuickNote} 
                        onClearAllQuickNotes={onClearAllQuickNotes} 
                    />
                 )}
            </div>
        </div>
    );
};

export default TodaysAgenda;
