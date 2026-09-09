import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

    let currentSubtasks = [...subtasks];
    if (newSubtaskText.trim() !== '') {
      currentSubtasks.push({ id: Date.now(), text: newSubtaskText.trim(), completed: false });
      setNewSubtaskText('');
    }

    const updatedTodoPayload: Partial<Todo> = { ...todo };

    updatedTodoPayload.text = text.trim();
    updatedTodoPayload.priority = priority;
    updatedTodoPayload.subtasks = currentSubtasks;
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

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100010] flex items-start sm:items-center justify-center pt-2 sm:pt-6 px-3 sm:px-4 pb-20 overflow-y-auto bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl flex flex-col z-[100011] overflow-hidden max-h-[92vh] my-1 sm:my-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Native Drag Handle */}
        <div className="w-10 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-1 shrink-0 sm:hidden" />

        {/* Modal Header */}
        <header className="flex-shrink-0 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
              Detalles de la Tarea
            </h3>
            <p className="text-xs text-zinc-500">
              Personaliza prioridad, fecha, recordatorios y notas
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <CloseIcon />
          </button>
        </header>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-grow overflow-hidden">
          <main className="flex-grow p-4 sm:p-5 overflow-y-auto custom-scrollbar space-y-4 text-left">
            
            {/* Task Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Nombre de la Tarea
              </label>
              <input 
                type="text" 
                required
                value={text || ''} 
                onChange={(e) => setText(e.target.value)} 
                placeholder="Ej. Comprar víveres, Enviar informe..." 
                className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-2.5 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 placeholder:text-zinc-400 transition-all"
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Sub-tareas
              </label>
              {subtasks.length > 0 && (
                <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                  {subtasks.map(subtask => (
                    <div key={subtask.id} className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800/70 group">
                      <input 
                        type="checkbox" 
                        checked={subtask.completed} 
                        onChange={() => handleToggleSubtask(subtask.id)}
                        className="w-4 h-4 rounded text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-600 focus:ring-0 cursor-pointer"
                      />
                      <span className={`flex-1 text-xs ${subtask.completed ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'}`}>
                        {subtask.text}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteSubtask(subtask.id)} 
                        className="text-zinc-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
                        aria-label="Eliminar sub-tarea"
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
                  className="flex-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 placeholder:text-zinc-400"
                />
                <button 
                  type="button" 
                  onClick={handleAddSubtask} 
                  className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 shrink-0"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Añadir
                </button>
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800/80" />

            {/* Project & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Proyecto
                </label>
                <select 
                  value={projectId === null ? '' : projectId} 
                  onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)} 
                  className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">Sin proyecto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Prioridad
                </label>
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                  {(['low', 'medium', 'high'] as Priority[]).map(p => {
                    const labels: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta' };
                    const isSelected = priority === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          isSelected
                            ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs'
                            : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
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
            <div className="p-3.5 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                  Fecha
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-zinc-500">Sin fecha</span>
                  <input 
                    type="checkbox" 
                    checked={isUndated} 
                    onChange={e => handleToggleUndated(e.target.checked)} 
                    className="w-4 h-4 rounded text-zinc-900 dark:text-white border-zinc-300 dark:border-zinc-700 focus:ring-0"
                  />
                </label>
              </div>

              {!isUndated && (
                <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-zinc-500">Rango de fechas (Fin)</span>
                    <input 
                      type="checkbox" 
                      checked={hasEndDate} 
                      onChange={e => setHasEndDate(e.target.checked)} 
                      className="w-3.5 h-3.5 rounded text-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={due_date || ''} 
                      onChange={e => setDueDate(e.target.value)} 
                      className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                    {hasEndDate && <span className="text-xs text-zinc-400 font-medium">a</span>}
                    {hasEndDate && (
                      <input 
                        type="date" 
                        value={end_date || ''} 
                        onChange={e => setEndDate(e.target.value)} 
                        className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Time Section */}
            <div className="p-3.5 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ClockIcon className="w-3.5 h-3.5 text-zinc-400" />
                  Añadir Hora
                </span>
                <input 
                  type="checkbox" 
                  checked={hasTime} 
                  onChange={e => handleToggleTime(e.target.checked)} 
                  disabled={isUndated}
                  className="w-4 h-4 rounded text-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0 disabled:opacity-40"
                />
              </div>

              {hasTime && !isUndated && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 animate-fade-in">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">Inicio</label>
                    <input 
                      type="time" 
                      value={start_time || ''} 
                      onChange={e => setStartTime(e.target.value)} 
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">Fin (opcional)</label>
                    <input 
                      type="time" 
                      value={end_time || ''} 
                      onChange={e => setEndTime(e.target.value)} 
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Reminder Section */}
            <div className="p-3.5 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <BellIcon className="w-3.5 h-3.5 text-zinc-400" />
                  Recordatorio
                </span>
                <input 
                  type="checkbox" 
                  checked={hasReminder} 
                  onChange={e => handleToggleReminder(e.target.checked)} 
                  disabled={isUndated}
                  className="w-4 h-4 rounded text-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0 disabled:opacity-40"
                />
              </div>

              {hasReminder && !isUndated && (
                <div className="space-y-2 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 animate-fade-in">
                  <select 
                    value={reminderType || '0'} 
                    onChange={e => setReminderType(e.target.value)} 
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
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
                        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      />
                      <input 
                        type="time" 
                        value={customReminderTime || ''} 
                        onChange={e => setCustomReminderTime(e.target.value)} 
                        className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recurrence Section */}
            <div className="p-3.5 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <RefreshIcon className="w-3.5 h-3.5 text-zinc-400" />
                  Repetir tarea
                </span>
                <input 
                  type="checkbox" 
                  checked={hasRecurrence} 
                  onChange={e => handleToggleRecurrence(e.target.checked)} 
                  disabled={isUndated}
                  className="w-4 h-4 rounded text-zinc-900 border-zinc-300 dark:border-zinc-700 focus:ring-0 disabled:opacity-40"
                />
              </div>

              {hasRecurrence && !isUndated && (
                <div className="space-y-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 animate-fade-in">
                  <select 
                    value={recurrence?.frequency || 'none'} 
                    onChange={e => setRecurrence(r => ({ ...r, frequency: e.target.value as any }))} 
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  >
                    <option value="none">Nunca</option>
                    <option value="daily">Diariamente</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="custom">Días específicos</option>
                  </select>

                  {recurrence.frequency === 'custom' && (
                    <div className="flex justify-between gap-1 p-1 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'].map((dayLabel, index) => {
                        const isSelected = recurrence.customDays?.includes(index);
                        return (
                          <button 
                            key={index} 
                            type="button" 
                            onClick={() => handleCustomDayToggle(index)} 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                              isSelected ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-xs' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                            }`}
                          >
                            {dayLabel}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1">Finaliza repetición (opcional)</label>
                    <input 
                      type="date" 
                      value={recurrence?.ends_on || ''} 
                      onChange={e => setRecurrence(r => ({ ...r, ends_on: e.target.value }))} 
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Notas
                </label>
                {todo?.notion_page_id && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFetchNotionNotes}
                      disabled={isLoadingNotionNotes}
                      className="text-[10px] text-zinc-600 dark:text-zinc-400 hover:underline flex items-center gap-1 font-semibold focus:outline-none"
                    >
                      {isLoadingNotionNotes ? 'Cargando...' : 'Importar de Notion'}
                    </button>
                    {todo.notion_url && (
                      <a
                        href={todo.notion_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline flex items-center gap-0.5"
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
                className="w-full bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 rounded-2xl py-2.5 px-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 placeholder:text-zinc-400 transition-all resize-none"
              />
            </div>

            {/* Calendar Integration Section */}
            <div className="p-3.5 bg-zinc-50/80 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/70 dark:border-zinc-800/70 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
                  Sincronización de Calendario
                </span>
                {(todo.gcal_event_id || todo.calendar_provider) && calendarSyncStatus !== 'removed' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Sincronizado
                  </span>
                ) : (
                  <span className="text-[10px] text-zinc-400">
                    {calendarSyncStatus === 'removed' ? 'Desvinculado' : 'No sincronizado'}
                  </span>
                )}
              </div>

              {(todo.gcal_event_id || todo.calendar_provider) && calendarSyncStatus !== 'removed' ? (
                <div className="bg-white dark:bg-zinc-800/80 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300">
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
                        className="text-zinc-700 dark:text-zinc-300 hover:underline text-[11px] font-medium"
                      >
                        Abrir ↗
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-700">
                    <p className="text-[11px] text-zinc-400">
                      Desvincular del calendario sin borrar de la app.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsConfirmRemoveCalOpen(true)}
                      disabled={isRemovingCalendar}
                      className="px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 border border-zinc-200 dark:border-zinc-600 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5"
                    >
                      {isRemovingCalendar ? (
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <CalendarIcon className="w-3 h-3 text-zinc-400" />
                      )}
                      Desvincular
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-800/80 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
                    <span className="text-[11px] text-zinc-400">
                      {calendarSyncStatus === 'removed' 
                        ? '✓ Evento eliminado del calendario. La tarea sigue aquí.'
                        : 'Esta tarea no está vinculada a un evento de calendario.'}
                    </span>
                    {onSyncToCalendar && !isUndated && (
                      <button
                        type="button"
                        onClick={handleInitiateSync}
                        disabled={isSyncingCalendar}
                        className="px-3 py-1.5 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-all flex items-center gap-1.5 active:scale-95"
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
                            <CalendarIcon className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                            <span>Sincronizar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  {syncNotice && (
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-[11px] text-zinc-700 dark:text-zinc-300">
                      {syncNotice}
                    </div>
                  )}
                </div>
              )}
            </div>

          </main>

          {/* Modal Footer */}
          <footer className="flex-shrink-0 px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between gap-2">
            {todo && onDelete ? (
              <button
                type="button"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Eliminar
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2.5 text-xs font-semibold text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 rounded-xl transition-colors active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={!text.trim()} 
                className="px-5 py-2.5 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-xl transition-all shadow-xs disabled:opacity-40 active:scale-95"
              >
                Guardar Cambios
              </button>
            </div>
          </footer>
        </form>
      </div>

      {/* Account Selection Modal */}
      {isAccountPickerOpen && (
        <div className="fixed inset-0 z-[100020] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 rounded-t-3xl sm:rounded-3xl max-w-sm w-full p-5 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                <span>¿A cuál cuenta sincronizar?</span>
              </h4>
              <button
                onClick={() => setIsAccountPickerOpen(false)}
                className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"
              >
                <CloseIcon />
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Detectamos múltiples cuentas conectadas. Selecciona dónde crear este evento:
            </p>

            <div className="space-y-2">
              {getConnectedCalendarAccounts().isGoogleConnected && (
                <button
                  type="button"
                  onClick={() => handleSyncToCalendarAction('google')}
                  className="w-full p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex-shrink-0"><GoogleIcon /></div>
                    <div>
                      <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Google Calendar</div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {getConnectedCalendarAccounts().googleEmail}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              )}

              {getConnectedCalendarAccounts().isOutlookConnected && (
                <button
                  type="button"
                  onClick={() => handleSyncToCalendarAction('outlook')}
                  className="w-full p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all text-left flex items-center justify-between group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 flex-shrink-0"><OutlookIcon /></div>
                    <div>
                      <div className="font-bold text-xs text-zinc-900 dark:text-zinc-100">Outlook Calendar</div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {getConnectedCalendarAccounts().outlookEmail}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-400 group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAccountPickerOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
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

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default TaskDetailsModal;
