import React, { useState, useEffect } from 'react';
import { Todo, Subtask, Priority, RecurrenceRule, Project, CalendarProvider } from '../types';
import { NotionService } from '../services/notionService';
import { CalendarSyncService } from '../services/calendarSyncService';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import CalendarIcon from './icons/CalendarIcon';
import ClockIcon from './icons/ClockIcon';
import BellIcon from './icons/BellIcon';
import RefreshIcon from './icons/RefreshIcon';
import GoogleIcon from './icons/GoogleIcon';
import OutlookIcon from './icons/OutlookIcon';
import ConfirmationModal from './ConfirmationModal';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (todo: Todo) => void;
  onDelete?: (id: number) => void;
  onRemoveFromCalendar?: (todoId: number) => Promise<void> | void;
  onSyncToCalendar?: (todo: Todo, provider?: CalendarProvider) => Promise<void> | void;
  todo: Todo | null;
  projects: Project[];
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ isOpen, onClose, onSave, onDelete, onRemoveFromCalendar, onSyncToCalendar, todo, projects = [] }) => {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);

  // Date State
  const [isUndated, setIsUndated] = useState(false);
  const [due_date, setDueDate] = useState<string | null>('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [end_date, setEndDate] = useState('');

  // Time State
  const [hasTime, setHasTime] = useState(false);
  const [start_time, setStartTime] = useState('');
  const [end_time, setEndTime] = useState('');

  // Reminder State
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderType, setReminderType] = useState('0');
  const [customReminderDate, setCustomReminderDate] = useState('');
  const [customReminderTime, setCustomReminderTime] = useState('');

  // Recurrence State
  const [hasRecurrence, setHasRecurrence] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>({ frequency: 'none' });

  // Notes State
  const [notes, setNotes] = useState('');

  // Calendar Event State
  const [isRemovingCalendar, setIsRemovingCalendar] = useState(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [calendarSyncStatus, setCalendarSyncStatus] = useState<string | null>(null);
  const [isAccountPickerOpen, setIsAccountPickerOpen] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Confirmation modal state
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isConfirmRemoveCalOpen, setIsConfirmRemoveCalOpen] = useState(false);

  const [isLoadingNotionNotes, setIsLoadingNotionNotes] = useState(false);

  const handleFetchNotionNotes = async () => {
    if (!todo?.notion_page_id) return;
    setIsLoadingNotionNotes(true);
    try {
      const pageNotes = await NotionService.getPageNotes(todo.notion_page_id);
      if (pageNotes) {
        setNotes(prev => prev ? `${prev}\n\n[Notas de Notion]\n${pageNotes}` : pageNotes);
      }
    } catch (error) {
      console.error("Error fetching Notion notes:", error);
    } finally {
      setIsLoadingNotionNotes(false);
    }
  };

  useEffect(() => {
    if (isOpen && todo) {
      setText(todo.text || '');
      setPriority(todo.priority || 'medium');
      setSubtasks(todo.subtasks || []);
      setDueDate(todo.due_date || null);
      setProjectId(todo.project_id || null);
      setIsUndated(!todo.due_date);

      setHasTime(!!todo.start_time);
      setHasEndDate(!!todo.end_date);
      setHasReminder(!!todo.reminder_at || !!(todo.reminder_offset && todo.reminder_offset > 0));
      setHasRecurrence(todo.recurrence?.frequency !== 'none' && !!todo.recurrence);

      setStartTime(todo.start_time || '');
      setEndTime(todo.end_time || '');
      setEndDate(todo.end_date || '');
      setNotes(todo.notes || '');
      setRecurrence(todo.recurrence || { frequency: 'none' });
      setCalendarSyncStatus(null);
      setSyncNotice(null);
      setIsAccountPickerOpen(false);
      setIsRemovingCalendar(false);
      setIsSyncingCalendar(false);

      if (todo.reminder_at) {
        setReminderType('custom');
        try {
          const d = new Date(todo.reminder_at);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const hour = String(d.getHours()).padStart(2, '0');
          const minute = String(d.getMinutes()).padStart(2, '0');

          setCustomReminderDate(`${year}-${month}-${day}`);
          setCustomReminderTime(`${hour}:${minute}`);
        } catch (e) { /* invalid date */ }
      } else {
        setReminderType(String(todo.reminder_offset || '0'));
        setCustomReminderDate('');
        setCustomReminderTime('');
      }
      setIsConfirmDeleteOpen(false);
      setIsConfirmRemoveCalOpen(false);
    }
  }, [isOpen, todo]);

  const handleRemoveFromCalendarAction = async () => {
    if (!todo) return;
    setIsRemovingCalendar(true);
    try {
      if (onRemoveFromCalendar) {
        await onRemoveFromCalendar(todo.id);
      }
      setCalendarSyncStatus('removed');
    } catch (e) {
      console.error('Error removing from calendar:', e);
    } finally {
      setIsRemovingCalendar(false);
      setIsConfirmRemoveCalOpen(false);
    }
  };

  const getConnectedCalendarAccounts = () => {
    const isGoogleConnected = typeof window !== 'undefined' && (
      !!(window as any).gapi?.client?.getToken?.() ||
      !!CalendarSyncService.getAccount('google') ||
      !!localStorage.getItem('pollito_google_token')
    );
    const googleAccount = CalendarSyncService.getAccount('google');
    const outlookAccount = CalendarSyncService.getAccount('outlook');
    const isOutlookConnected = !!(outlookAccount && outlookAccount.token);

    return {
      isGoogleConnected,
      googleEmail: googleAccount?.email || 'Google Calendar',
      isOutlookConnected,
      outlookEmail: outlookAccount?.email || 'Outlook Calendar',
      totalCount: (isGoogleConnected ? 1 : 0) + (isOutlookConnected ? 1 : 0)
    };
  };

  const handleInitiateSync = () => {
    setSyncNotice(null);
    const accounts = getConnectedCalendarAccounts();

    if (accounts.totalCount > 1) {
      // Prompt user to select which account to sync to
      setIsAccountPickerOpen(true);
    } else if (accounts.isGoogleConnected) {
      handleSyncToCalendarAction('google');
    } else if (accounts.isOutlookConnected) {
      handleSyncToCalendarAction('outlook');
    } else {
      setSyncNotice('Debes conectar tu cuenta de Google u Outlook en Calendario > Integraciones para sincronizar.');
    }
  };

  const handleSyncToCalendarAction = async (provider?: CalendarProvider) => {
    if (!todo) return;
    setIsSyncingCalendar(true);
    setIsAccountPickerOpen(false);
    try {
      if (onSyncToCalendar) {
        await onSyncToCalendar({
          ...todo,
          text: text.trim() || todo.text,
          due_date,
          end_date: hasEndDate ? end_date : undefined,
          start_time: hasTime ? start_time : undefined,
          end_time: hasTime ? end_time : undefined,
          notes,
          priority,
        }, provider);
      }
      setCalendarSyncStatus('synced');
    } catch (e) {
      console.error('Error syncing to calendar:', e);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const handleToggleUndated = (enabled: boolean) => {
    setIsUndated(enabled);
    if (enabled) {
      setDueDate(null);
      setHasEndDate(false);
    } else {
      setDueDate(todo?.due_date || formatDateKey(new Date()));
    }
  };

  const handleToggleTime = (enabled: boolean) => {
    setHasTime(enabled);
    if (!enabled) {
      setStartTime('');
      setEndTime('');
    }
  };

  const handleToggleReminder = (enabled: boolean) => {
    setHasReminder(enabled);
    if (!enabled) {
      setReminderType('0');
      setCustomReminderDate('');
      setCustomReminderTime('');
    }
  };

  const handleToggleRecurrence = (enabled: boolean) => {
    setHasRecurrence(enabled);
    if (!enabled) {
      setRecurrence({ frequency: 'none' });
    }
  };

  const handleAddSubtask = () => {
    if (newSubtaskText.trim() === '') return;
    setSubtasks([...subtasks, { id: Date.now(), text: newSubtaskText, completed: false }]);
    setNewSubtaskText('');
  };

  const handleToggleSubtask = (id: number) => {
    setSubtasks(subtasks.map(st => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const handleDeleteSubtask = (id: number) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const handleCustomDayToggle = (dayIndex: number) => {
    setRecurrence(prev => {
      const currentDays = prev.customDays || [];
      const newDays = currentDays.includes(dayIndex)
        ? currentDays.filter(d => d !== dayIndex)
        : [...currentDays, dayIndex];
      return { ...prev, customDays: newDays.sort((a, b) => a - b) };
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo || !text.trim()) return;

    const updatedTodoPayload: Partial<Todo> = { ...todo };

    updatedTodoPayload.text = text.trim();
    updatedTodoPayload.priority = priority;
    updatedTodoPayload.subtasks = subtasks;
    updatedTodoPayload.project_id = projectId;

    updatedTodoPayload.due_date = due_date;
    updatedTodoPayload.end_date = hasEndDate && !isUndated ? (end_date || undefined) : undefined;
    updatedTodoPayload.start_time = hasTime && !isUndated ? (start_time || undefined) : undefined;
    updatedTodoPayload.end_time = hasTime && !isUndated ? (end_time || undefined) : undefined;
    updatedTodoPayload.notes = notes.trim() ? notes.trim() : undefined;

    const currentRecurrence = { ...recurrence };
    if (hasRecurrence && !isUndated) {
      if (!currentRecurrence.id) {
        currentRecurrence.id = crypto.randomUUID();
      }
      updatedTodoPayload.recurrence = currentRecurrence;
    } else {
      updatedTodoPayload.recurrence = { frequency: 'none' };
    }

    let reminderChanged = false;
    if (hasReminder && !isUndated) {
      if (reminderType === 'custom' && customReminderTime) {
        const reminderDateStr = customReminderDate || due_date;
        if (reminderDateStr) {
          const [year, month, day] = reminderDateStr.split('-').map(Number);
          const [hour, minute] = customReminderTime.split(':').map(Number);
          const localReminderDate = new Date(year, month - 1, day, hour, minute);

          updatedTodoPayload.reminder_at = localReminderDate.toISOString();
          updatedTodoPayload.reminder_offset = undefined;
        } else {
          updatedTodoPayload.reminder_at = undefined;
          updatedTodoPayload.reminder_offset = undefined;
        }
      } else if (reminderType !== 'custom') {
        updatedTodoPayload.reminder_offset = Number(reminderType) as Todo['reminder_offset'];
        updatedTodoPayload.reminder_at = undefined;
      } else {
        updatedTodoPayload.reminder_offset = undefined;
        updatedTodoPayload.reminder_at = undefined;
      }
    } else {
      updatedTodoPayload.reminder_offset = undefined;
      updatedTodoPayload.reminder_at = undefined;
    }

    if (todo.reminder_at !== updatedTodoPayload.reminder_at || todo.reminder_offset !== updatedTodoPayload.reminder_offset) {
      reminderChanged = true;
    }
    updatedTodoPayload.notification_sent = reminderChanged ? false : todo.notification_sent;

    onSave(updatedTodoPayload as Todo);
    onClose();
  };

  if (!isOpen || !todo) return null;

  return (
    <div className="fixed inset-0 z-[60000] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="fixed inset-0 bg-gray-800/50 backdrop-blur-xs" onClick={onClose} />

      <div 
        className="relative w-full max-w-lg bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border border-secondary-light/50 dark:border-gray-700 rounded-2xl shadow-xl flex flex-col z-[60001] overflow-hidden max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <header className="flex-shrink-0 px-5 py-3.5 border-b border-secondary-light/50 dark:border-gray-700 flex items-center justify-between bg-white/50 dark:bg-gray-800/50 rounded-t-2xl">
          <div>
            <h3 className="font-semibold text-base text-gray-800 dark:text-gray-100">
              Editar Tarea
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-400">
              Modifica los detalles de tu tarea
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-secondary-light/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-grow overflow-hidden rounded-b-2xl">
          <main className="flex-grow p-5 overflow-y-auto custom-scrollbar space-y-4 text-left">
            
            {/* Task Name */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 dark:text-secondary-light/50">
                Nombre de la Tarea
              </label>
              <input 
                type="text" 
                required
                value={text || ''} 
                onChange={(e) => setText(e.target.value)} 
                placeholder="Ej. Comprar víveres, Enviar informe..." 
                className="w-full bg-white/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-slate-300 dark:border-gray-600 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100 placeholder:text-gray-400 transition-all"
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-600 dark:text-secondary-light/50">
                Sub-tareas
              </label>
              {subtasks.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-2 bg-white/50 dark:bg-gray-700/60 p-2 rounded-lg border border-secondary-light/50 dark:border-gray-700 group">
                      <input 
                        type="checkbox" 
                        checked={subtask.completed} 
                        onChange={() => handleToggleSubtask(subtask.id)}
                        className="w-4 h-4 rounded text-gray-800 border-slate-300 dark:border-gray-500 focus:ring-0 cursor-pointer"
                      />
                      <span className={`flex-1 text-xs ${subtask.completed ? 'line-through text-gray-400 dark:text-gray-400' : 'text-gray-700 dark:text-secondary-light/50'}`}>
                        {subtask.text}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteSubtask(subtask.id)} 
                        className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newSubtaskText || ''} 
                  onChange={e => setNewSubtaskText(e.target.value)} 
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask(); } }}
                  placeholder="Añadir nueva sub-tarea..." 
                  className="flex-1 bg-white/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-slate-300 dark:border-gray-600 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100 placeholder:text-gray-400"
                />
                <button 
                  type="button" 
                  onClick={handleAddSubtask} 
                  className="px-3 py-1.5 bg-secondary-light/50 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 text-gray-700 dark:text-secondary-light/50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Añadir
                </button>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-700" />

            {/* Project & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-secondary-light/50 mb-1">
                  Proyecto
                </label>
                <select 
                  value={projectId === null ? '' : projectId} 
                  onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)} 
                  className="w-full bg-white/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-slate-300 dark:border-gray-600 rounded-lg py-2 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-secondary-light/50 mb-1">
                  Prioridad
                </label>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg border border-secondary-light/50 dark:border-gray-600">
                  {(['low', 'medium', 'high'] as Priority[]).map(p => {
                    const labels: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
                    const isSelected = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
                          isSelected
                            ? p === 'high' ? 'bg-red-600 text-white' : p === 'medium' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100'
                        }`}
                      >
                        {labels[p]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Date Section */}
            <div className="p-3 bg-white/50 dark:bg-gray-700/60 rounded-xl border border-secondary-light/50 dark:border-gray-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-secondary-light/50 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                  Fecha
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-gray-400 dark:text-gray-400">Sin fecha</span>
                  <input 
                    type="checkbox" 
                    checked={isUndated} 
                    onChange={e => handleToggleUndated(e.target.checked)} 
                    className="w-4 h-4 rounded text-gray-800 border-slate-300 dark:border-gray-500 focus:ring-0"
                  />
                </label>
              </div>

              {!isUndated && (
                <div className="space-y-2 pt-2 border-t border-secondary-light/50/60 dark:border-gray-600/60 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 dark:text-gray-400">Rango de fechas (Fin)</span>
                    <input 
                      type="checkbox" 
                      checked={hasEndDate} 
                      onChange={e => setHasEndDate(e.target.checked)} 
                      className="w-3.5 h-3.5 rounded text-gray-800 border-slate-300 dark:border-gray-500 focus:ring-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={due_date || ''} 
                      onChange={e => setDueDate(e.target.value)} 
                      className="flex-1 bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100"
                    />
                    {hasEndDate && <span className="text-xs text-gray-400 font-medium">a</span>}
                    {hasEndDate && (
                      <input 
                        type="date" 
                        value={end_date || ''} 
                        onChange={e => setEndDate(e.target.value)} 
                        className="flex-1 bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Time Section */}
            <div className="p-3 bg-white/50 dark:bg-gray-700/60 rounded-xl border border-secondary-light/50 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-secondary-light/50 flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                  Añadir Hora
                </span>
                <input 
                  type="checkbox" 
                  checked={hasTime} 
                  onChange={e => handleToggleTime(e.target.checked)} 
                  disabled={isUndated}
                  className="w-4 h-4 rounded text-gray-800 border-slate-300 dark:border-gray-500 focus:ring-0 disabled:opacity-40"
                />
              </div>

              {hasTime && !isUndated && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-secondary-light/50/60 dark:border-gray-600/60 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-400 mb-1">Inicio</label>
                    <input 
                      type="time" 
                      value={start_time || ''} 
                      onChange={e => setStartTime(e.target.value)} 
                      className="w-full bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-400 mb-1">Fin (opcional)</label>
                    <input 
                      type="time" 
                      value={end_time || ''} 
                      onChange={e => setEndTime(e.target.value)} 
                      className="w-full bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Reminder Section */}
            <div className="p-3 bg-white/50 dark:bg-gray-700/60 rounded-xl border border-secondary-light/50 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-secondary-light/50 flex items-center gap-1.5">
                  <BellIcon className="w-3.5 h-3.5 text-gray-400" />
                  Recordatorio
                </span>
                <input 
                  type="checkbox" 
                  checked={hasReminder} 
                  onChange={e => handleToggleReminder(e.target.checked)} 
                  disabled={isUndated}
                  className="w-4 h-4 rounded text-gray-800 border-slate-300 dark:border-gray-500 focus:ring-0 disabled:opacity-40"
                />
              </div>

              {hasReminder && !isUndated && (
                <div className="space-y-2 pt-2 border-t border-secondary-light/50/60 dark:border-gray-600/60 animate-fade-in">
                  <select 
                    value={reminderType || '0'} 
                    onChange={e => setReminderType(e.target.value)} 
                    className="w-full bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100"
                  >
                    <option value="0">En el momento de la tarea</option>
                    <option value="10">10 minutos antes</option>
                    <option value="30">30 minutos antes</option>
                    <option value="60">1 hora antes</option>
                    <option value="1440">1 día antes</option>
                    <option value="custom">Personalizado...</option>
                  </select>

                  {reminderType === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="date" 
                        value={customReminderDate || ''} 
                        onChange={e => setCustomReminderDate(e.target.value)} 
                        className="bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800"
                      />
                      <input 
                        type="time" 
                        value={customReminderTime || ''} 
                        onChange={e => setCustomReminderTime(e.target.value)} 
                        className="bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recurrence Section */}
            <div className="p-3 bg-white/50 dark:bg-gray-700/60 rounded-xl border border-secondary-light/50 dark:border-gray-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-secondary-light/50 flex items-center gap-1.5">
                  <RefreshIcon className="w-3.5 h-3.5 text-gray-400" />
                  Repetir tarea
                </span>
                <input 
                  type="checkbox" 
                  checked={hasRecurrence} 
                  onChange={e => handleToggleRecurrence(e.target.checked)} 
                  disabled={isUndated}
                  className="w-4 h-4 rounded text-gray-800 border-slate-300 dark:border-gray-500 focus:ring-0 disabled:opacity-40"
                />
              </div>

              {hasRecurrence && !isUndated && (
                <div className="space-y-2.5 pt-2 border-t border-secondary-light/50/60 dark:border-gray-600/60 animate-fade-in">
                  <select 
                    value={recurrence?.frequency || 'none'} 
                    onChange={e => setRecurrence(r => ({ ...r, frequency: e.target.value as any }))} 
                    className="w-full bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100"
                  >
                    <option value="none">Nunca</option>
                    <option value="daily">Diariamente</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="custom">Días específicos</option>
                  </select>

                  {recurrence.frequency === 'custom' && (
                    <div className="flex justify-between gap-1 p-1 bg-white dark:bg-gray-600 rounded-lg border border-secondary-light/50 dark:border-gray-500">
                      {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((dayLabel, index) => {
                        const isSelected = recurrence.customDays?.includes(index);
                        return (
                          <button 
                            key={index} 
                            type="button" 
                            onClick={() => handleCustomDayToggle(index)} 
                            className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${
                              isSelected ? 'bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-800' : 'text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                            }`}
                          >
                            {dayLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-gray-400 dark:text-gray-400 mb-1">Finaliza repetición (opcional)</label>
                    <input 
                      type="date" 
                      value={recurrence?.ends_on || ''} 
                      onChange={e => setRecurrence(r => ({ ...r, ends_on: e.target.value }))} 
                      className="w-full bg-white dark:bg-gray-600 border border-slate-300 dark:border-gray-500 rounded-lg p-1.5 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-800"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-gray-600 dark:text-secondary-light/50">
                  Notas
                </label>
                {todo?.notion_page_id && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchNotionNotes}
                      disabled={isLoadingNotionNotes}
                      className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold focus:outline-none"
                    >
                      {isLoadingNotionNotes ? 'Cargando...' : 'Importar de Notion ⚡'}
                    </button>
                    {todo.notion_url && (
                      <a
                        href={todo.notion_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-secondary-light/50 hover:underline flex items-center gap-0.5"
                      >
                        Abrir Notion ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
              <textarea 
                value={notes || ''} 
                onChange={e => setNotes(e.target.value)} 
                placeholder="Añade notas o detalles adicionales..." 
                rows={3} 
                className="w-full bg-white/50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-slate-300 dark:border-gray-600 rounded-lg py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-gray-800 dark:focus:ring-gray-100 placeholder:text-gray-400 transition-all resize-none"
              />
            </div>

            {/* Calendar Integration Section */}
            <div className="p-3.5 bg-white/50 dark:bg-gray-700/60 rounded-xl border border-secondary-light/50 dark:border-gray-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 dark:text-secondary-light/50 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                  Sincronización de Calendario
                </span>
                {(todo.gcal_event_id || todo.calendar_provider) && calendarSyncStatus !== 'removed' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Sincronizado
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400">
                    {calendarSyncStatus === 'removed' ? 'Desvinculado' : 'No sincronizado'}
                  </span>
                )}
              </div>

              {(todo.gcal_event_id || todo.calendar_provider) && calendarSyncStatus !== 'removed' ? (
                <div className="bg-white dark:bg-gray-800/80 p-3 rounded-lg border border-secondary-light/50/80 dark:border-gray-600/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      {todo.calendar_provider === 'outlook' ? (
                        <OutlookIcon className="w-4 h-4" />
                      ) : (
                        <GoogleIcon className="w-4 h-4" />
                      )}
                      <span>
                        Evento en {todo.calendar_provider === 'outlook' ? 'Outlook Calendar' : 'Google Calendar'}
                      </span>
                    </div>
                    {todo.calendar_event_link && (
                      <a
                        href={todo.calendar_event_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:text-blue-600 underline text-[11px]"
                      >
                        Abrir
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-[11px] text-gray-400 dark:text-gray-400">
                      Puedes eliminar el evento del calendario sin borrar la tarea de la app.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsConfirmRemoveCalOpen(true)}
                      disabled={isRemovingCalendar}
                      className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/60 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5"
                    >
                      {isRemovingCalendar ? (
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <CalendarIcon className="w-3 h-3 text-amber-600" />
                      )}
                      Eliminar del Calendario
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-gray-800/80 rounded-lg border border-secondary-light/50/80 dark:border-gray-600/80">
                    <span className="text-[11px] text-gray-400 dark:text-gray-400">
                      {calendarSyncStatus === 'removed' 
                        ? '✓ Evento eliminado del calendario. La tarea permanece guardada.'
                        : 'Esta tarea no está vinculada a un evento de calendario.'}
                    </span>
                    {onSyncToCalendar && !isUndated && (
                      <button
                        type="button"
                        onClick={handleInitiateSync}
                        disabled={isSyncingCalendar}
                        className="px-2.5 py-1 text-[11px] font-medium text-gray-600 dark:text-secondary-light/50 bg-gray-100 dark:bg-gray-700 hover:bg-secondary-light/50 dark:hover:bg-gray-600 rounded-md transition-colors flex items-center gap-1.5"
                      >
                        {isSyncingCalendar ? (
                          <>
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Sincronizando...</span>
                          </>
                        ) : (
                          <>
                            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                            <span>Sincronizar ahora</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {syncNotice && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
                      {syncNotice}
                    </div>
                  )}
                </div>
              )}
            </div>

          </main>

          {/* Modal Footer */}
          <footer className="flex-shrink-0 px-5 py-3 border-t border-secondary-light/50 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 flex items-center justify-between gap-2 rounded-b-2xl">
            {todo && onDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Eliminar
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-slate-300 hover:bg-secondary-light/50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={!text.trim()} 
                className="px-5 py-2 text-xs font-semibold bg-gray-800 dark:bg-gray-100 text-white dark:text-gray-800 hover:bg-gray-700 dark:hover:bg-white rounded-lg transition-colors disabled:opacity-40"
              >
                Guardar Cambios
              </button>
            </div>
          </footer>
        </form>
      </div>

      {/* Account Selection Modal */}
      {isAccountPickerOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-primary" />
                <span>¿A cuál cuenta sincronizar?</span>
              </h4>
              <button
                onClick={() => setIsAccountPickerOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Detectamos múltiples cuentas de calendario conectadas. Elige dónde crear este evento:
            </p>

            <div className="space-y-2">
              {getConnectedCalendarAccounts().isGoogleConnected && (
                <button
                  type="button"
                  onClick={() => handleSyncToCalendarAction('google')}
                  className="w-full p-3 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex-shrink-0"><GoogleIcon /></div>
                    <div>
                      <div className="font-bold text-xs text-sky-900 dark:text-sky-200">Google Calendar</div>
                      <div className="text-[10px] text-sky-600 dark:text-sky-400">
                        {getConnectedCalendarAccounts().googleEmail}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              )}

              {getConnectedCalendarAccounts().isOutlookConnected && (
                <button
                  type="button"
                  onClick={() => handleSyncToCalendarAction('outlook')}
                  className="w-full p-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex-shrink-0"><OutlookIcon /></div>
                    <div>
                      <div className="font-bold text-xs text-blue-900 dark:text-blue-200">Outlook Calendar</div>
                      <div className="text-[10px] text-blue-600 dark:text-blue-400">
                        {getConnectedCalendarAccounts().outlookEmail}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAccountPickerOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          if (todo && onDelete) {
            onDelete(todo.id);
          }
          onClose();
        }}
        title="Eliminar Tarea"
        message={`¿Seguro que quieres eliminar la tarea "${text}"?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />

      <ConfirmationModal
        isOpen={isConfirmRemoveCalOpen}
        onClose={() => setIsConfirmRemoveCalOpen(false)}
        onConfirm={handleRemoveFromCalendarAction}
        title="Eliminar del Calendario"
        message={`¿Deseas eliminar el evento de tu calendario externo? La tarea "${text}" seguirá existiendo en Pollito Productivo.`}
        confirmText="Eliminar del calendario"
        cancelText="Cancelar"
      />
    </div>
  );
};

export default TaskDetailsModal;
