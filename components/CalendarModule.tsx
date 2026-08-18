import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Todo,
  GoogleCalendarEvent,
  GoogleCalendar,
  GCalSettings,
  CalendarIntegrationAccount,
  Project,
  Priority,
} from '../types';
import { CalendarSyncService } from '../services/calendarSyncService';
import { NotionService, NotionSettings } from '../services/notionService';
import { config } from '../config';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import CalendarIcon from './icons/CalendarIcon';
import PlusIcon from './icons/PlusIcon';
import GoogleIcon from './icons/GoogleIcon';
import OutlookIcon from './icons/OutlookIcon';
import NotionIcon from './icons/NotionIcon';
import ClockIcon from './icons/ClockIcon';
import RefreshIcon from './icons/RefreshIcon';
import CheckIcon from './icons/CheckIcon';
import CloseIcon from './icons/CloseIcon';
import SearchIcon from './icons/SearchIcon';
import ExternalLinkIcon from './icons/ExternalLinkIcon';
import TrashIcon from './icons/TrashIcon';

export interface CalendarModuleProps {
  isMobile?: boolean;
  allTodos: { [key: string]: Todo[] };
  calendarEvents?: GoogleCalendarEvent[];
  selectedDate: Date;
  setSelectedDate?: (date: Date) => void;
  onSelectDate?: (date: Date) => void;
  onEditTodo: (todo: Todo) => void;
  onToggleTodo: (id: number) => void;
  onAddTodo?: (text: string, options?: any) => Promise<void>;
  googleApiToken?: string | null;
  googleToken?: string | null;
  onGoogleAuthClick?: () => void;
  onAuthGoogle?: () => void;
  gcalSettings: GCalSettings;
  onGCalSettingsChange: (settings: GCalSettings) => void;
  userCalendars?: GoogleCalendar[];
  outlookAccount?: CalendarIntegrationAccount | null;
  onConnectOutlook?: (clientId?: string) => void | Promise<void>;
  onDisconnectOutlook?: () => void;
  onRefreshCalendarEvents?: () => Promise<void>;
  onRefreshEvents?: () => Promise<void>;
  onRemoveFromCalendar?: (todo: Todo) => Promise<void>;
  onSyncToCalendar?: (todo: Todo) => Promise<void>;
  projects?: Project[];
  onSyncNotion?: () => Promise<{ success: boolean; message: string }>;
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateKey: string): Date => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

type CalendarViewMode = 'month' | 'week' | 'day';
type FilterSource = 'all' | 'tasks' | 'google' | 'outlook' | 'notion' | 'pending';

export const CalendarModule: React.FC<CalendarModuleProps> = ({
  isMobile = false,
  allTodos,
  calendarEvents = [],
  selectedDate,
  setSelectedDate,
  onSelectDate,
  onEditTodo,
  onToggleTodo,
  onAddTodo,
  googleApiToken,
  googleToken,
  onGoogleAuthClick,
  onAuthGoogle,
  gcalSettings,
  onGCalSettingsChange,
  userCalendars = [],
  outlookAccount: propOutlookAccount,
  onConnectOutlook,
  onDisconnectOutlook,
  onRefreshCalendarEvents,
  onRefreshEvents,
  onRemoveFromCalendar,
  onSyncToCalendar,
  projects = [],
  onSyncNotion,
}) => {
  const setDate = onSelectDate || setSelectedDate || (() => {});
  const activeGoogleToken = googleToken !== undefined ? googleToken : googleApiToken;
  const handleGoogleAuth = onAuthGoogle || onGoogleAuthClick || (() => {});
  const handleRefreshEvents = onRefreshEvents || onRefreshCalendarEvents;

  // View Mode & Current Navigation Anchor Date
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [viewDate, setViewDate] = useState<Date>(() => new Date(selectedDate));
  const [filterSource, setFilterSource] = useState<FilterSource>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Panels
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<{
    type: 'task' | 'google' | 'outlook' | 'notion';
    task?: Todo;
    event?: GoogleCalendarEvent;
  } | null>(null);
  const [dayPreviewDate, setDayPreviewDate] = useState<string | null>(null);

  // New Event Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState(() => formatDateKey(selectedDate));
  const [newEndDate, setNewEndDate] = useState(() => formatDateKey(selectedDate));
  const [newIsAllDay, setNewIsAllDay] = useState(true);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newProjectId, setNewProjectId] = useState<number | null>(null);
  const [newSyncDestination, setNewSyncDestination] = useState<'pollito' | 'google' | 'outlook'>('pollito');
  const [newNotes, setNewNotes] = useState('');
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Refresh & Sync status
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Local Outlook Account State
  const [localOutlookAccount, setLocalOutlookAccount] = useState<CalendarIntegrationAccount | null>(
    () => propOutlookAccount || CalendarSyncService.getAccount('outlook')
  );

  useEffect(() => {
    if (propOutlookAccount !== undefined) {
      setLocalOutlookAccount(propOutlookAccount);
    }
  }, [propOutlookAccount]);

  const [outlookClientIdInput, setOutlookClientIdInput] = useState(() => localStorage.getItem('outlook_client_id') || '');

  // Notion Settings
  const [notionSettings, setNotionSettings] = useState<NotionSettings>(() => NotionService.getSettings());
  const [isSyncingNotion, setIsSyncingNotion] = useState(false);
  const [notionTokenInput, setNotionTokenInput] = useState(() => notionSettings.token || '');
  const [notionDbIdInput, setNotionDbIdInput] = useState(() => notionSettings.databaseId || '');
  const [notionEnabledInput, setNotionEnabledInput] = useState(() => notionSettings.enabled || false);
  const [notionSaveMsg, setNotionSaveMsg] = useState<string | null>(null);
  const [isTestingNotion, setIsTestingNotion] = useState(false);

  // Time Grid Auto-Scroll ref
  const timeGridScrollRef = useRef<HTMLDivElement>(null);

  // Keep viewDate in sync when user selects a date from outside
  useEffect(() => {
    setViewDate(new Date(selectedDate));
  }, [selectedDate]);

  // Scroll time grid to current hour on load or view change
  useEffect(() => {
    if ((viewMode === 'week' || viewMode === 'day') && timeGridScrollRef.current) {
      const currentHour = new Date().getHours();
      const targetScroll = Math.max(0, (currentHour - 1) * 60);
      timeGridScrollRef.current.scrollTop = targetScroll;
    }
  }, [viewMode]);

  // Flatten all tasks into a single list
  const allTasksList = useMemo(() => {
    const list: Todo[] = [];
    Object.keys(allTodos).forEach(key => {
      list.push(...allTodos[key]);
    });
    return list;
  }, [allTodos]);

  // Map events and tasks by Date Key (YYYY-MM-DD)
  const itemsByDate = useMemo(() => {
    const map: {
      [dateKey: string]: {
        tasks: Todo[];
        googleEvents: GoogleCalendarEvent[];
        outlookEvents: GoogleCalendarEvent[];
      };
    } = {};

    const ensureDate = (k: string) => {
      if (!map[k]) {
        map[k] = { tasks: [], googleEvents: [], outlookEvents: [] };
      }
    };

    // 1. Add Pollito Tasks
    Object.keys(allTodos).forEach(dateKey => {
      if (dateKey === 'undated') return;
      ensureDate(dateKey);
      map[dateKey].tasks.push(...allTodos[dateKey]);
    });

    // 2. Add Google and Outlook Events
    calendarEvents.forEach(evt => {
      let dateKey: string | null = null;
      if (evt.start?.date) {
        dateKey = evt.start.date;
      } else if (evt.start?.dateTime) {
        dateKey = evt.start.dateTime.split('T')[0];
      }

      if (dateKey) {
        ensureDate(dateKey);
        
        // Evitar duplicados: Si la tarea local ya tiene este gcal_event_id, no la agregamos
        // como un evento externo porque ya se está mostrando como tarea local.
        const isDuplicate = map[dateKey].tasks.some(t => t.gcal_event_id === evt.id);
        
        if (!isDuplicate) {
          if (evt.provider === 'outlook') {
            map[dateKey].outlookEvents.push(evt);
          } else {
            map[dateKey].googleEvents.push(evt);
          }
        }
      }
    });

    return map;
  }, [allTodos, calendarEvents]);

  // Filtered items based on active search & provider filters
  const filteredTasksAndEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filterTask = (t: Todo) => {
      if (query && !t.text.toLowerCase().includes(query) && !t.notes?.toLowerCase().includes(query)) {
        return false;
      }
      if (filterSource === 'pending' && t.completed) return false;
      if (filterSource === 'google' && t.calendar_provider !== 'google') return false;
      if (filterSource === 'outlook' && t.calendar_provider !== 'outlook') return false;
      if (filterSource === 'notion' && !t.notion_page_id) return false;
      if (filterSource === 'tasks' && (t.calendar_provider || t.notion_page_id)) return false;
      return true;
    };

    const filterEvent = (e: GoogleCalendarEvent, provider: 'google' | 'outlook') => {
      if (filterSource === 'tasks' || filterSource === 'pending' || filterSource === 'notion') return false;
      if (filterSource === 'google' && provider !== 'google') return false;
      if (filterSource === 'outlook' && provider !== 'outlook') return false;
      if (query && !e.summary.toLowerCase().includes(query) && !e.description?.toLowerCase().includes(query)) {
        return false;
      }
      return true;
    };

    return {
      filterTask,
      filterEvent,
    };
  }, [searchQuery, filterSource]);

  // Today Date Key
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  // Navigation Handlers
  const handlePrev = () => {
    const d = new Date(viewDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() - 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() - 1);
    }
    setViewDate(d);
  };

  const handleNext = () => {
    const d = new Date(viewDate);
    if (viewMode === 'month') {
      d.setMonth(d.getMonth() + 1);
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7);
    } else if (viewMode === 'day') {
      d.setDate(d.getDate() + 1);
    }
    setViewDate(d);
  };

  const handleGoToday = () => {
    const now = new Date();
    setViewDate(now);
    setDate(now);
  };

  // Open Quick Creator for specific date/hour
  const handleOpenCreator = (dateStr?: string, hourStr?: string) => {
    const targetDate = dateStr || formatDateKey(viewDate);
    setNewDueDate(targetDate);
    setNewEndDate(targetDate);
    setNewTitle('');
    setNewNotes('');
    if (hourStr) {
      setNewIsAllDay(false);
      setNewStartTime(hourStr);
      const [h, m] = hourStr.split(':').map(Number);
      const endH = String((h + 1) % 24).padStart(2, '0');
      setNewEndTime(`${endH}:${String(m).padStart(2, '0')}`);
    } else {
      setNewIsAllDay(true);
      setNewStartTime('09:00');
      setNewEndTime('10:00');
    }
    setShowCreateModal(true);
  };

  // Submit New Task / Event
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmittingNew(true);
    try {
      if (onAddTodo) {
        await onAddTodo(newTitle.trim(), {
          dueDate: newDueDate,
          startTime: newIsAllDay ? undefined : newStartTime,
          endTime: newIsAllDay ? undefined : newEndTime,
          priority: newPriority,
          projectId: newProjectId,
          notes: newNotes.trim() || undefined,
          syncToGoogle: newSyncDestination === 'google',
          syncToOutlook: newSyncDestination === 'outlook',
        });
      }
      setShowCreateModal(false);
      setNewTitle('');
      setNewNotes('');
      if (handleRefreshEvents) {
        await handleRefreshEvents();
      }
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Trigger Refresh
  const handleTriggerRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (handleRefreshEvents) {
        await handleRefreshEvents();
      }
      setSyncFeedback('Calendario actualizado con éxito');
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (e) {
      console.error('Error refreshing calendar:', e);
      setSyncFeedback('Error al sincronizar calendarios');
      setTimeout(() => setSyncFeedback(null), 3500);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Connect / Disconnect Outlook Handlers
  const handleConnectOutlookClick = async () => {
    localStorage.setItem('outlook_client_id', outlookClientIdInput);
    if (onConnectOutlook) {
      await onConnectOutlook(outlookClientIdInput || undefined);
      const updated = CalendarSyncService.getAccount('outlook');
      setLocalOutlookAccount(updated);
    } else {
      const account = await CalendarSyncService.connectOutlookAccount(outlookClientIdInput || undefined);
      if (account) {
        setLocalOutlookAccount(account);
        if (handleRefreshEvents) handleRefreshEvents();
      }
    }
  };

  const handleDisconnectOutlookClick = () => {
    if (onDisconnectOutlook) {
      onDisconnectOutlook();
    } else {
      CalendarSyncService.removeAccount('outlook');
    }
    setLocalOutlookAccount(null);
  };

  // Connect / Sync Notion Handlers
  const handleNotionSyncClick = async () => {
    if (!onSyncNotion) return;
    setIsSyncingNotion(true);
    try {
      const res = await onSyncNotion();
      setSyncFeedback(res.message);
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch (err: any) {
      setSyncFeedback(err.message || 'Error al sincronizar con Notion');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncingNotion(false);
    }
  };

  const handleSaveNotionSettings = () => {
    const updated: NotionSettings = {
      ...notionSettings,
      token: notionTokenInput.trim(),
      databaseId: notionDbIdInput.trim(),
      enabled: notionEnabledInput,
      autoSync: notionEnabledInput,
    };
    NotionService.saveSettings(updated);
    setNotionSettings(updated);
    setNotionSaveMsg('¡Configuración guardada!');
    setTimeout(() => setNotionSaveMsg(null), 3000);
  };

  const handleTestNotionConnection = async () => {
    if (!notionTokenInput.trim() || !notionDbIdInput.trim()) {
      setNotionSaveMsg('Introduce token y database ID.');
      setTimeout(() => setNotionSaveMsg(null), 3000);
      return;
    }
    setIsTestingNotion(true);
    setNotionSaveMsg(null);
    try {
      const res = await NotionService.testConnection(notionTokenInput.trim(), notionDbIdInput.trim());
      if (res.success) {
        setNotionSaveMsg('¡Conexión exitosa con Notion!');
      }
    } catch (err: any) {
      setNotionSaveMsg(err.message || 'Error al conectar');
    } finally {
      setIsTestingNotion(false);
      setTimeout(() => setNotionSaveMsg(null), 4000);
    }
  };

  // Month Grid Calculation
  const monthGridDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // 0 is Sunday, so (day + 6) % 7 gives Monday=0, Sunday=6
    const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7;
    const totalMonthDays = lastDayOfMonth.getDate();

    const days: {
      date: Date;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const d = new Date(year, month - 1, dayNum);
      const k = formatDateKey(d);
      days.push({
        date: d,
        dateKey: k,
        isCurrentMonth: false,
        isToday: k === todayKey,
        isSelected: k === formatDateKey(selectedDate),
      });
    }

    // Current month days
    for (let i = 1; i <= totalMonthDays; i++) {
      const d = new Date(year, month, i);
      const k = formatDateKey(d);
      days.push({
        date: d,
        dateKey: k,
        isCurrentMonth: true,
        isToday: k === todayKey,
        isSelected: k === formatDateKey(selectedDate),
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const k = formatDateKey(d);
      days.push({
        date: d,
        dateKey: k,
        isCurrentMonth: false,
        isToday: k === todayKey,
        isSelected: k === formatDateKey(selectedDate),
      });
    }

    return days;
  }, [viewDate, selectedDate, todayKey]);

  // Week Grid Calculation (Monday to Sunday)
  const weekGridDays = useMemo(() => {
    const current = new Date(viewDate);
    const currentWeekday = (current.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(current);
    monday.setDate(current.getDate() - currentWeekday);

    const days: {
      date: Date;
      dateKey: string;
      weekdayName: string;
      isToday: boolean;
      isSelected: boolean;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const k = formatDateKey(d);
      days.push({
        date: d,
        dateKey: k,
        weekdayName: WEEKDAYS[i],
        isToday: k === todayKey,
        isSelected: k === formatDateKey(selectedDate),
      });
    }

    return days;
  }, [viewDate, selectedDate, todayKey]);

  // Export to Apple / iCal (.ics)
  const handleExportICS = () => {
    CalendarSyncService.exportToICS(allTasksList, calendarEvents);
  };

  // Helper priority badge color
  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-amber-500 text-white';
      case 'medium': return 'bg-sky-500 text-white';
      case 'low': return 'bg-emerald-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded-2xl overflow-hidden shadow-xl border border-black/5 dark:border-white/10 select-none">
      
      {/* 1. TOP HEADER & CONTROLS */}
      <header className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-md">
        
        {/* Left: Navigation & Current Date Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
            <button
              onClick={handlePrev}
              title="Anterior"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={handleGoToday}
              className="px-3 py-1 text-xs font-bold rounded-lg text-primary hover:bg-primary/10 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              title="Siguiente"
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ChevronRightIcon />
            </button>
          </div>

          <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight ml-2">
            {MONTHS_ES[viewDate.getMonth()]} {viewDate.getFullYear()}
          </h2>
        </div>

        {/* Center: Search & Filter Pills */}
        <div className="flex flex-1 max-w-md items-center gap-2">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Buscar tareas o eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs md:text-sm rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary text-gray-800 dark:text-gray-200"
            />
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4">
              <SearchIcon />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: View Switchers & Action Buttons */}
        <div className="flex items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex bg-gray-200/80 dark:bg-gray-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                viewMode === 'day'
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Día
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleTriggerRefresh}
            disabled={isRefreshing}
            title="Sincronizar y actualizar calendarios"
            className="p-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
          >
            <div className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`}>
              <RefreshIcon />
            </div>
          </button>

          {/* Integrations Button */}
          <button
            onClick={() => setShowIntegrationsModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-xs font-semibold transition-colors relative"
          >
            <div className="flex -space-x-1">
              <div className="w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                <GoogleIcon />
              </div>
              <div className="w-4 h-4 rounded-full bg-white dark:bg-gray-900 flex items-center justify-center">
                <OutlookIcon />
              </div>
            </div>
            <span>Conexiones</span>
            {(activeGoogleToken || localOutlookAccount || notionSettings.enabled) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900 animate-pulse" />
            )}
          </button>

          {/* Add Event Button */}
          <button
            onClick={() => handleOpenCreator()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <PlusIcon />
            <span className="hidden sm:inline">Nuevo Evento</span>
          </button>
        </div>
      </header>

      {/* 2. FILTER STRIP */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200/60 dark:border-gray-800 text-xs overflow-x-auto gap-2 scrollbar-none">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-500 dark:text-gray-400 mr-1">Filtrar:</span>
          <button
            onClick={() => setFilterSource('all')}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterSource === 'all'
                ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900 font-bold'
                : 'bg-gray-200/70 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterSource('tasks')}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterSource === 'tasks'
                ? 'bg-amber-500 text-white font-bold'
                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-200'
            }`}
          >
            Tareas Locales
          </button>
          <button
            onClick={() => setFilterSource('google')}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterSource === 'google'
                ? 'bg-sky-600 text-white font-bold'
                : 'bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 hover:bg-sky-200'
            }`}
          >
            Google Calendar
          </button>
          <button
            onClick={() => setFilterSource('outlook')}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterSource === 'outlook'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 hover:bg-blue-200'
            }`}
          >
            Outlook
          </button>
          <button
            onClick={() => setFilterSource('notion')}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterSource === 'notion'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-purple-100 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 hover:bg-purple-200'
            }`}
          >
            Notion
          </button>
          <button
            onClick={() => setFilterSource('pending')}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              filterSource === 'pending'
                ? 'bg-rose-500 text-white font-bold'
                : 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-200'
            }`}
          >
            Solo Pendientes
          </button>
        </div>

        <button
          onClick={handleExportICS}
          title="Descargar archivo .ics compatible con Apple Calendar, Google y Outlook"
          className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <span>📥 Exportar .ICS (iCal)</span>
        </button>
      </div>

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="bg-primary/10 border-b border-primary/20 text-primary-dark dark:text-primary-light px-4 py-1.5 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <span>{syncFeedback}</span>
          <button onClick={() => setSyncFeedback(null)} className="text-primary hover:text-primary-dark">✕</button>
        </div>
      )}

      {/* 3. MAIN CALENDAR BODY (MONTH / WEEK / DAY / AGENDA) */}
      <div className="flex-1 overflow-auto relative">
        
        {/* VIEW 1: MONTH VIEW */}
        {viewMode === 'month' && (
          <div className="flex flex-col h-full min-h-[500px]">
            {/* Weekday Column Headers */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 sticky top-0 z-10 text-center font-bold text-xs text-gray-500 dark:text-gray-400 py-2">
              {WEEKDAYS.map((w, idx) => (
                <div key={w} className={idx >= 5 ? 'text-primary' : ''}>
                  {w}
                </div>
              ))}
            </div>

            {/* Month Day Cells */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-gray-200/60 dark:divide-gray-800/80 bg-gray-100/50 dark:bg-gray-950/50">
              {monthGridDays.map((cell) => {
                const dateItems = itemsByDate[cell.dateKey] || { tasks: [], googleEvents: [], outlookEvents: [] };
                const filteredTasks = dateItems.tasks.filter(filteredTasksAndEvents.filterTask);
                const filteredGoogle = dateItems.googleEvents.filter(e => filteredTasksAndEvents.filterEvent(e, 'google'));
                const filteredOutlook = dateItems.outlookEvents.filter(e => filteredTasksAndEvents.filterEvent(e, 'outlook'));

                const totalItemsCount = filteredTasks.length + filteredGoogle.length + filteredOutlook.length;
                const maxDisplay = 3;

                return (
                  <div
                    key={cell.dateKey}
                    onClick={() => {
                      setDate(cell.date);
                      setViewDate(cell.date);
                    }}
                    onDoubleClick={() => handleOpenCreator(cell.dateKey)}
                    className={`min-h-[100px] p-1.5 flex flex-col justify-between transition-colors relative group cursor-pointer ${
                      cell.isCurrentMonth
                        ? 'bg-white dark:bg-gray-900 hover:bg-primary/5 dark:hover:bg-primary/10'
                        : 'bg-gray-50/50 dark:bg-gray-950/40 text-gray-400 dark:text-gray-600'
                    } ${
                      cell.isSelected
                        ? 'ring-2 ring-primary ring-inset bg-primary/5 dark:bg-primary/15'
                        : ''
                    }`}
                  >
                    {/* Top Row: Date Number & Quick Add Button */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                          cell.isToday
                            ? 'bg-primary text-white shadow-md scale-105'
                            : cell.isSelected
                            ? 'bg-primary/20 text-primary-dark dark:text-primary-light font-black'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {/* Quick Add Button on Cell Hover */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCreator(cell.dateKey);
                        }}
                        title="Añadir evento a este día"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-primary hover:text-white text-gray-500 transition-all scale-90 hover:scale-100"
                      >
                        <PlusIcon />
                      </button>
                    </div>

                    {/* Event Chips List */}
                    <div className="flex-1 space-y-1 overflow-hidden">
                      {/* Pollito Tasks */}
                      {filteredTasks.slice(0, maxDisplay).map((task) => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventDetails({ type: 'task', task });
                          }}
                          className={`text-[11px] leading-tight px-1.5 py-0.5 rounded-md flex items-center gap-1 border truncate transition-transform hover:scale-[1.02] ${
                            task.completed
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 line-through'
                              : task.priority === 'urgent'
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50 font-medium'
                              : task.priority === 'high'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                              : 'bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800/50'
                          }`}
                        >
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTodo(task.id);
                            }}
                            className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                              task.completed ? 'bg-primary border-primary text-white' : 'border-gray-400'
                            }`}
                          >
                            {task.completed && <span className="text-[7px]">✓</span>}
                          </span>
                          <span className="truncate">{task.text}</span>
                        </div>
                      ))}

                      {/* Google Events */}
                      {filteredGoogle.slice(0, Math.max(0, maxDisplay - filteredTasks.length)).map((gEvt) => (
                        <div
                          key={gEvt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventDetails({ type: 'google', event: gEvt });
                          }}
                          className="text-[11px] leading-tight px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-200 border border-sky-200 dark:border-sky-800/60 truncate hover:scale-[1.02] transition-transform font-medium"
                        >
                          <div className="w-2.5 h-2.5 flex-shrink-0"><GoogleIcon /></div>
                          <span className="truncate">{gEvt.summary}</span>
                        </div>
                      ))}

                      {/* Outlook Events */}
                      {filteredOutlook.slice(0, Math.max(0, maxDisplay - filteredTasks.length - filteredGoogle.length)).map((oEvt) => (
                        <div
                          key={oEvt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventDetails({ type: 'outlook', event: oEvt });
                          }}
                          className="text-[11px] leading-tight px-1.5 py-0.5 rounded-md flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800/60 truncate hover:scale-[1.02] transition-transform font-medium"
                        >
                          <div className="w-2.5 h-2.5 flex-shrink-0"><OutlookIcon /></div>
                          <span className="truncate">{oEvt.summary}</span>
                        </div>
                      ))}
                    </div>

                    {/* +N More Badge */}
                    {totalItemsCount > maxDisplay && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDayPreviewDate(cell.dateKey);
                        }}
                        className="text-[10px] font-bold text-primary hover:underline text-left mt-1"
                      >
                        +{totalItemsCount - maxDisplay} más...
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: WEEK VIEW (TRUE HOURLY SCHEDULE GRID) */}
        {viewMode === 'week' && (
          <div ref={timeGridScrollRef} className="flex flex-col h-full overflow-y-auto min-h-[600px]">
            {/* Week Header Row */}
            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/90 sticky top-0 z-20 backdrop-blur-sm text-center">
              <div className="p-2 border-r border-gray-200 dark:border-gray-800 text-[11px] font-bold text-gray-400">
                GMT
              </div>
              {weekGridDays.map((d) => (
                <div
                  key={d.dateKey}
                  onClick={() => {
                    setDate(d.date);
                    setViewDate(d.date);
                  }}
                  className={`p-2 border-r border-gray-200 dark:border-gray-800 cursor-pointer transition-colors ${
                    d.isToday
                      ? 'bg-primary/10 font-bold'
                      : d.isSelected
                      ? 'bg-primary/5'
                      : ''
                  }`}
                >
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">{d.weekdayName}</div>
                  <div
                    className={`inline-block text-sm font-extrabold w-7 h-7 leading-7 rounded-full mt-0.5 ${
                      d.isToday ? 'bg-primary text-white shadow-sm' : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {d.date.getDate()}
                  </div>
                </div>
              ))}
            </div>

            {/* 24-Hour Grid */}
            <div className="relative">
              {Array.from({ length: 24 }).map((_, hour) => {
                const hourStr = `${String(hour).padStart(2, '0')}:00`;
                return (
                  <div key={hour} className="grid grid-cols-8 min-h-[60px] border-b border-gray-100 dark:border-gray-800/60 group">
                    {/* Time Column */}
                    <div className="p-1 border-r border-gray-200 dark:border-gray-800 text-[11px] text-gray-400 font-mono text-center select-none bg-gray-50/50 dark:bg-gray-900/40">
                      {hourStr}
                    </div>

                    {/* 7 Day Slot Columns */}
                    {weekGridDays.map((d) => {
                      const dateItems = itemsByDate[d.dateKey] || { tasks: [], googleEvents: [], outlookEvents: [] };
                      
                      // Match tasks that start in this hour
                      const hourTasks = dateItems.tasks.filter(t => {
                        if (!t.start_time) return false;
                        const [h] = t.start_time.split(':').map(Number);
                        return h === hour && filteredTasksAndEvents.filterTask(t);
                      });

                      // Match Google events that start in this hour
                      const hourGoogle = dateItems.googleEvents.filter(e => {
                        if (!e.start?.dateTime) return false;
                        const dObj = new Date(e.start.dateTime);
                        return dObj.getHours() === hour && filteredTasksAndEvents.filterEvent(e, 'google');
                      });

                      // Match Outlook events that start in this hour
                      const hourOutlook = dateItems.outlookEvents.filter(e => {
                        if (!e.start?.dateTime) return false;
                        const dObj = new Date(e.start.dateTime);
                        return dObj.getHours() === hour && filteredTasksAndEvents.filterEvent(e, 'outlook');
                      });

                      return (
                        <div
                          key={d.dateKey}
                          onClick={() => handleOpenCreator(d.dateKey, hourStr)}
                          className="border-r border-gray-100 dark:border-gray-800/40 p-1 relative hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors cursor-pointer"
                        >
                          {/* Event Cards inside slot */}
                          <div className="space-y-1">
                            {hourTasks.map((t) => (
                              <div
                                key={t.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventDetails({ type: 'task', task: t });
                                }}
                                className={`p-1.5 rounded-lg border text-xs shadow-sm truncate transition-transform hover:scale-[1.02] ${
                                  t.completed
                                    ? 'bg-gray-100 text-gray-400 border-gray-300 dark:bg-gray-800 dark:text-gray-500'
                                    : 'bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 font-semibold'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                                    {t.start_time}
                                  </span>
                                  <span className="truncate">{t.text}</span>
                                  {t.calendar_provider === 'google' && <div className="w-2 h-2 ml-auto"><GoogleIcon /></div>}
                                  {t.calendar_provider === 'outlook' && <div className="w-2 h-2 ml-auto"><OutlookIcon /></div>}
                                </div>
                              </div>
                            ))}

                            {hourGoogle.map((g) => (
                              <div
                                key={g.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventDetails({ type: 'google', event: g });
                                }}
                                className="p-1.5 rounded-lg border bg-sky-50 dark:bg-sky-950/60 text-sky-900 dark:text-sky-200 border-sky-300 dark:border-sky-700 text-xs shadow-sm font-semibold truncate hover:scale-[1.02]"
                              >
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 flex-shrink-0"><GoogleIcon /></div>
                                  <span className="truncate">{g.summary}</span>
                                </div>
                              </div>
                            ))}

                            {hourOutlook.map((o) => (
                              <div
                                key={o.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventDetails({ type: 'outlook', event: o });
                                }}
                                className="p-1.5 rounded-lg border bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 text-xs shadow-sm font-semibold truncate hover:scale-[1.02]"
                              >
                                <div className="flex items-center gap-1">
                                  <div className="w-3 h-3 flex-shrink-0"><OutlookIcon /></div>
                                  <span className="truncate">{o.summary}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: DAY VIEW (DEEP HOURLY TIMEBLOCKING & ACTION LIST) */}
        {viewMode === 'day' && (
          <div className="flex flex-col md:flex-row h-full divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-800">
            {/* Left: Day Checklist & Summary */}
            <div className="w-full md:w-80 p-4 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Tareas del Día
                  </h3>
                  <span className="text-xs font-bold text-primary">
                    {formatDateKey(viewDate)}
                  </span>
                </div>

                <div className="space-y-2">
                  {((itemsByDate[formatDateKey(viewDate)]?.tasks || []).filter(filteredTasksAndEvents.filterTask)).length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                      No hay tareas programadas para este día.
                    </div>
                  ) : (
                    (itemsByDate[formatDateKey(viewDate)]?.tasks || []).filter(filteredTasksAndEvents.filterTask).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedEventDetails({ type: 'task', task: t })}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          t.completed
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:border-primary'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTodo(t.id);
                            }}
                            className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${
                              t.completed ? 'bg-primary border-primary text-white' : 'border-gray-400 hover:border-primary'
                            }`}
                          >
                            {t.completed && <span className="text-xs">✓</span>}
                          </button>
                          <div className="truncate">
                            <div className={`text-xs font-semibold truncate flex items-center gap-1 ${t.completed ? 'line-through' : ''}`}>
                              {t.text}
                              {t.calendar_provider === 'google' && <div className="w-3 h-3 ml-1" title="Sincronizado con Google"><GoogleIcon /></div>}
                              {t.calendar_provider === 'outlook' && <div className="w-3 h-3 ml-1" title="Sincronizado con Outlook"><OutlookIcon /></div>}
                            </div>
                            {t.start_time && (
                              <div className="text-[10px] text-gray-400 font-mono">
                                🕒 {t.start_time} {t.end_time ? `- ${t.end_time}` : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getPriorityColor(t.priority)}`}>
                          {t.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button
                onClick={() => handleOpenCreator(formatDateKey(viewDate))}
                className="mt-4 w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-xs shadow transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusIcon />
                <span>Añadir Tarea / Evento</span>
              </button>
            </div>

            {/* Right: Hourly Time Matrix for the Day */}
            <div ref={timeGridScrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Cronograma de Horas</div>
              {Array.from({ length: 24 }).map((_, hour) => {
                const hourStr = `${String(hour).padStart(2, '0')}:00`;
                const dateKey = formatDateKey(viewDate);
                const dayItems = itemsByDate[dateKey] || { tasks: [], googleEvents: [], outlookEvents: [] };

                const slotTasks = dayItems.tasks.filter(t => {
                  if (!t.start_time) return false;
                  const [h] = t.start_time.split(':').map(Number);
                  return h === hour && filteredTasksAndEvents.filterTask(t);
                });

                const slotGoogle = dayItems.googleEvents.filter(g => {
                  if (!g.start?.dateTime) return false;
                  return new Date(g.start.dateTime).getHours() === hour && filteredTasksAndEvents.filterEvent(g, 'google');
                });

                const slotOutlook = dayItems.outlookEvents.filter(o => {
                  if (!o.start?.dateTime) return false;
                  return new Date(o.start.dateTime).getHours() === hour && filteredTasksAndEvents.filterEvent(o, 'outlook');
                });

                return (
                  <div
                    key={hour}
                    onClick={() => handleOpenCreator(dateKey, hourStr)}
                    className="flex gap-3 items-start p-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                  >
                    <span className="text-xs font-mono text-gray-400 w-12 flex-shrink-0 pt-1">
                      {hourStr}
                    </span>

                    <div className="flex-1 space-y-1.5">
                      {slotTasks.map(t => (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventDetails({ type: 'task', task: t });
                          }}
                          className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-900 dark:text-amber-200 shadow-sm flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1">
                            🐥 {t.text}
                            {t.calendar_provider === 'google' && <div className="w-3 h-3 ml-1"><GoogleIcon /></div>}
                            {t.calendar_provider === 'outlook' && <div className="w-3 h-3 ml-1"><OutlookIcon /></div>}
                          </span>
                          <span className="text-[10px] opacity-75 font-mono">{t.start_time} - {t.end_time || '+30m'}</span>
                        </div>
                      ))}

                      {slotGoogle.map(g => (
                        <div
                          key={g.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventDetails({ type: 'google', event: g });
                          }}
                          className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs font-bold text-sky-900 dark:text-sky-200 shadow-sm flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1.5"><GoogleIcon /> {g.summary}</span>
                          <span className="text-[10px] text-sky-600 dark:text-sky-400">Google Calendar</span>
                        </div>
                      ))}

                      {slotOutlook.map(o => (
                        <div
                          key={o.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventDetails({ type: 'outlook', event: o });
                          }}
                          className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-bold text-blue-900 dark:text-blue-200 shadow-sm flex items-center justify-between"
                        >
                          <span className="flex items-center gap-1.5"><OutlookIcon /> {o.summary}</span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400">Outlook</span>
                        </div>
                      ))}

                      {slotTasks.length === 0 && slotGoogle.length === 0 && slotOutlook.length === 0 && (
                        <div className="text-[11px] text-gray-300 dark:text-gray-700 py-0.5 group-hover:text-primary transition-colors">
                          + Haz clic para programar
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. DAY PREVIEW POPOVER MODAL (For +N More) */}
      {dayPreviewDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarIcon />
                <span>Eventos del {dayPreviewDate}</span>
              </h3>
              <button
                onClick={() => setDayPreviewDate(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {(itemsByDate[dayPreviewDate]?.tasks || []).map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setDayPreviewDate(null);
                    setSelectedEventDetails({ type: 'task', task: t });
                  }}
                  className="p-2.5 rounded-xl border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs cursor-pointer hover:border-primary"
                >
                  <span className="font-bold">{t.text}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getPriorityColor(t.priority)}`}>
                    {t.priority}
                  </span>
                </div>
              ))}

              {(itemsByDate[dayPreviewDate]?.googleEvents || []).map((g) => (
                <div
                  key={g.id}
                  onClick={() => {
                    setDayPreviewDate(null);
                    setSelectedEventDetails({ type: 'google', event: g });
                  }}
                  className="p-2.5 rounded-xl border bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800 flex items-center gap-2 text-xs font-bold text-sky-900 dark:text-sky-200 cursor-pointer"
                >
                  <GoogleIcon />
                  <span>{g.summary}</span>
                </div>
              ))}

              {(itemsByDate[dayPreviewDate]?.outlookEvents || []).map((o) => (
                <div
                  key={o.id}
                  onClick={() => {
                    setDayPreviewDate(null);
                    setSelectedEventDetails({ type: 'outlook', event: o });
                  }}
                  className="p-2.5 rounded-xl border bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-200 cursor-pointer"
                >
                  <OutlookIcon />
                  <span>{o.summary}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  const target = dayPreviewDate;
                  setDayPreviewDate(null);
                  handleOpenCreator(target);
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow hover:bg-primary-dark"
              >
                + Añadir Nuevo en este Día
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CREATE TASK / EVENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <PlusIcon />
                <span>Programar Tarea / Evento</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Title Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Título del Evento / Tarea *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Reunión de Estrategia o Entregar Reporte"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Date & Time Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => {
                    setNewDueDate(e.target.value);
                    setNewEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Horario
                  </label>
                  <label className="text-[11px] text-gray-500 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newIsAllDay}
                      onChange={(e) => setNewIsAllDay(e.target.checked)}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>Todo el día</span>
                  </label>
                </div>

                {!newIsAllDay ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={newStartTime}
                      onChange={(e) => setNewStartTime(e.target.value)}
                      className="w-full px-2 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full px-2 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                    />
                  </div>
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    Evento de día completo
                  </div>
                )}
              </div>
            </div>

            {/* Priority & Sync Destination */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Prioridad
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente 🔥</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Sincronizar a
                </label>
                <select
                  value={newSyncDestination}
                  onChange={(e) => setNewSyncDestination(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 font-semibold"
                >
                  <option value="pollito">Solo Tareas Locales</option>
                  <option value="google" disabled={!activeGoogleToken}>
                    🔵 Google Calendar {!activeGoogleToken ? '(No conectado)' : ''}
                  </option>
                  <option value="outlook" disabled={!localOutlookAccount}>
                    🔷 Microsoft Outlook {!localOutlookAccount ? '(No conectado)' : ''}
                  </option>
                </select>
              </div>
            </div>

            {/* Notes textarea */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Notas / Descripción
              </label>
              <textarea
                rows={2}
                placeholder="Añade detalles, enlace de reunión, etc."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none"
              />
            </div>

            {/* Submit buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingNew}
                className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-xl shadow transition-transform active:scale-95 flex items-center gap-1.5"
              >
                {isSubmittingNew ? 'Guardando...' : 'Crear Evento'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 6. EVENT DETAILS MODAL */}
      {selectedEventDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2">
                {selectedEventDetails.type === 'google' && <GoogleIcon />}
                {selectedEventDetails.type === 'outlook' && <OutlookIcon />}
                {selectedEventDetails.type === 'task' && <span>🐥</span>}
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                  {selectedEventDetails.type === 'task'
                    ? 'Detalle de Tarea'
                    : selectedEventDetails.type === 'google'
                    ? 'Evento de Google Calendar'
                    : 'Evento de Outlook'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Task Details */}
            {selectedEventDetails.task && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Título</span>
                  <div className="text-sm font-black text-gray-900 dark:text-white">
                    {selectedEventDetails.task.text}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Fecha</span>
                    <div className="font-semibold">{selectedEventDetails.task.due_date || 'Sin fecha'}</div>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Horario</span>
                    <div className="font-semibold">
                      {selectedEventDetails.task.start_time
                        ? `${selectedEventDetails.task.start_time} - ${selectedEventDetails.task.end_time || ''}`
                        : 'Todo el día'}
                    </div>
                  </div>
                </div>

                {selectedEventDetails.task.notes && (
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Notas</span>
                    <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-300">
                      {selectedEventDetails.task.notes}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => {
                      onEditTodo(selectedEventDetails.task!);
                      setSelectedEventDetails(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 font-bold text-xs"
                  >
                    Editar Tarea Completa
                  </button>

                  <button
                    onClick={() => {
                      onToggleTodo(selectedEventDetails.task!.id);
                      setSelectedEventDetails(null);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-primary text-white font-bold text-xs shadow"
                  >
                    {selectedEventDetails.task.completed ? 'Marcar Pendiente' : 'Completar Tarea'}
                  </button>
                </div>
              </div>
            )}

            {/* External Google / Outlook Event Details */}
            {selectedEventDetails.event && (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Título</span>
                  <div className="text-sm font-black text-gray-900 dark:text-white">
                    {selectedEventDetails.event.summary}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Inicio</span>
                    <div className="font-semibold">
                      {selectedEventDetails.event.start?.dateTime
                        ? new Date(selectedEventDetails.event.start.dateTime).toLocaleString('es-ES')
                        : selectedEventDetails.event.start?.date || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Fin</span>
                    <div className="font-semibold">
                      {selectedEventDetails.event.end?.dateTime
                        ? new Date(selectedEventDetails.event.end.dateTime).toLocaleString('es-ES')
                        : selectedEventDetails.event.end?.date || 'N/A'}
                    </div>
                  </div>
                </div>

                {selectedEventDetails.event.location && (
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Ubicación</span>
                    <div className="font-semibold text-gray-700 dark:text-gray-300">
                      📍 {selectedEventDetails.event.location}
                    </div>
                  </div>
                )}

                {selectedEventDetails.event.description && (
                  <div>
                    <span className="text-gray-400 font-bold uppercase text-[10px]">Descripción</span>
                    <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                      {selectedEventDetails.event.description}
                    </div>
                  </div>
                )}

                {selectedEventDetails.event.htmlLink && (
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
                    <a
                      href={selectedEventDetails.event.htmlLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs flex items-center gap-1.5 shadow"
                    >
                      <span>Abrir en {selectedEventDetails.type === 'google' ? 'Google Calendar' : 'Outlook'}</span>
                      <ExternalLinkIcon />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. INTEGRATIONS MANAGER MODAL */}
      {showIntegrationsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="font-black text-xl text-gray-900 dark:text-white">
                  Conexión de Calendarios
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Conecta tus cuentas para sincronizar eventos automáticamente en tiempo real.
                </p>
              </div>
              <button
                onClick={() => setShowIntegrationsModal(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <CloseIcon />
              </button>
            </div>

            {/* INTEGRATION CARD 1: GOOGLE CALENDAR */}
            <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-800/60 bg-sky-50/40 dark:bg-sky-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <GoogleIcon />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">Google Calendar</h4>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {activeGoogleToken ? '🟢 Conectado con OAuth' : '⚪ No conectado'}
                    </span>
                  </div>
                </div>

                {activeGoogleToken ? (
                  <button
                    onClick={handleGoogleAuth}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                  >
                    Reconectar
                  </button>
                ) : (
                  <button
                    onClick={handleGoogleAuth}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow"
                  >
                    Conectar con Google
                  </button>
                )}
              </div>

              {activeGoogleToken && (
                <div className="pt-2 border-t border-sky-200/60 dark:border-sky-800/40 space-y-2 text-xs">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                      Sincronización activa (2 vías)
                    </span>
                    <input
                      type="checkbox"
                      checked={gcalSettings.enabled}
                      onChange={(e) => onGCalSettingsChange({ ...gcalSettings, enabled: e.target.checked })}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                  </label>

                  {userCalendars.length > 0 && (
                    <div>
                      <span className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                        Calendario Principal
                      </span>
                      <select
                        value={gcalSettings.calendarId}
                        onChange={(e) => onGCalSettingsChange({ ...gcalSettings, calendarId: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                      >
                        {userCalendars.map((cal) => (
                          <option key={cal.id} value={cal.id}>
                            {cal.summary} {cal.primary ? '(Principal)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* INTEGRATION CARD 2: MICROSOFT OUTLOOK */}
            <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <OutlookIcon />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">Microsoft Outlook Calendar</h4>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {localOutlookAccount ? `🟢 Conectado (${localOutlookAccount.email || 'Outlook'})` : '⚪ No conectado'}
                    </span>
                  </div>
                </div>

                {localOutlookAccount ? (
                  <button
                    onClick={handleDisconnectOutlookClick}
                    className="px-3 py-1.5 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 text-xs font-bold hover:bg-red-200"
                  >
                    Desconectar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleConnectOutlookClick}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow"
                    >
                      Conectar Outlook
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* INTEGRATION CARD 3: NOTION */}
            <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/40 dark:bg-purple-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center">
                    <NotionIcon />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">Notion Database</h4>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {notionSettings.enabled ? '🟢 Sincronización activa' : '⚪ Desactivado'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notionEnabledInput}
                      onChange={(e) => setNotionEnabledInput(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              {/* Configuration Inputs */}
              <div className="space-y-2 pt-2 border-t border-purple-200/50 dark:border-purple-800/40 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Notion API Token</label>
                  <input
                    type="password"
                    value={notionTokenInput}
                    onChange={(e) => setNotionTokenInput(e.target.value)}
                    placeholder="secret_..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Database ID</label>
                  <input
                    type="text"
                    value={notionDbIdInput}
                    onChange={(e) => setNotionDbIdInput(e.target.value)}
                    placeholder="32 caracteres de la base de datos..."
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                  />
                </div>

                {notionSaveMsg && (
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 font-medium text-center">
                    {notionSaveMsg}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveNotionSettings}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={handleTestNotionConnection}
                      disabled={isTestingNotion}
                      className="px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold"
                    >
                      {isTestingNotion ? 'Probando...' : 'Probar Conexión'}
                    </button>
                  </div>

                  {notionSettings.enabled && (
                    <button
                      onClick={handleNotionSyncClick}
                      disabled={isSyncingNotion}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow flex items-center gap-1"
                    >
                      {isSyncingNotion ? 'Sincronizando...' : 'Sincronizar ⚡'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Sincronización segura punto a punto</span>
              <button
                onClick={() => setShowIntegrationsModal(false)}
                className="px-5 py-2 rounded-xl bg-primary text-white font-bold shadow hover:bg-primary-dark"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarModule;
