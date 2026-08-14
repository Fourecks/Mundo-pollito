import React, { useState, useMemo } from 'react';
import {
  Todo,
  GoogleCalendarEvent,
  GoogleCalendar,
  GCalSettings,
  CalendarIntegrationAccount,
  Project,
} from '../types';
import { NotionService, NotionSettings } from '../services/notionService';
import { config } from '../config';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import CalendarIcon from './icons/CalendarIcon';
import PlusIcon from './icons/PlusIcon';
import GoogleIcon from './icons/GoogleIcon';
import OutlookIcon from './icons/OutlookIcon';
import ClockIcon from './icons/ClockIcon';
import RefreshIcon from './icons/RefreshIcon';
import CheckIcon from './icons/CheckIcon';

interface CalendarModuleProps {
  isMobile?: boolean;
  allTodos: { [key: string]: Todo[] };
  calendarEvents: GoogleCalendarEvent[];
  selectedDate: Date;
  setSelectedDate?: (date: Date) => void;
  onSelectDate?: (date: Date) => void;
  onEditTodo: (todo: Todo) => void;
  onToggleTodo: (id: number) => void;
  onAddTodo?: (text: string, dueDate?: string, startTime?: string, endTime?: string) => Promise<void>;
  // Google / Outlook Integration Props
  googleApiToken?: string | null;
  googleToken?: string | null;
  onGoogleAuthClick?: () => void;
  onAuthGoogle?: () => void;
  gcalSettings: GCalSettings;
  onGCalSettingsChange: (settings: GCalSettings) => void;
  userCalendars: GoogleCalendar[];
  outlookAccount?: CalendarIntegrationAccount | null;
  onConnectOutlook?: () => void;
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

const CalendarModule: React.FC<CalendarModuleProps> = ({
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
  outlookAccount,
  onConnectOutlook,
  onDisconnectOutlook,
  onRefreshCalendarEvents,
  onRefreshEvents,
  onRemoveFromCalendar,
  onSyncToCalendar,
  onSyncNotion,
}) => {
  const setDate = onSelectDate || setSelectedDate || (() => {});
  const activeGoogleToken = googleToken !== undefined ? googleToken : googleApiToken;
  const handleGoogleAuth = onAuthGoogle || onGoogleAuthClick || (() => {});
  const handleRefreshEvents = onRefreshEvents || onRefreshCalendarEvents;
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );
  const [showIntegrationsModal, setShowIntegrationsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'tasks' | 'calendar'>('all');
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickStartTime, setQuickStartTime] = useState('');
  const [isAddingQuickTask, setIsAddingQuickTask] = useState(false);

  // Notion Integration State & Handlers
  const [notionSettings, setNotionSettings] = useState<NotionSettings>(() => NotionService.getSettings());
  const [isNotionConnected, setIsNotionConnected] = useState(() => notionSettings.enabled);
  const [isSyncingNotion, setIsSyncingNotion] = useState(false);

  const handleConnectNotion = () => {
    // If the developer configured client ID/Secret in config.ts or environment variables,
    // we save them to localStorage so the login page can seamlessly trigger the redirect.
    if (config.NOTION_CLIENT_ID && config.NOTION_CLIENT_SECRET) {
      try {
        localStorage.setItem('pollito_notion_client_id', config.NOTION_CLIENT_ID);
        localStorage.setItem('pollito_notion_client_secret', config.NOTION_CLIENT_SECRET);
      } catch (e) {
        console.warn('Failed to store Notion client config in localStorage:', e);
      }
    }

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      '/notion-login.html',
      'Conectar con Notion',
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTION_AUTH_SUCCESS') {
        const { token, databaseId, databaseName } = event.data;
        const newSettings: NotionSettings = {
          enabled: true,
          token,
          databaseId,
          autoSync: true,
          databaseName,
          completedProperty: 'Completada',
          priorityProperty: 'Prioridad',
          dateProperty: 'Fecha',
        };
        NotionService.saveSettings(newSettings);
        setNotionSettings(newSettings);
        setIsNotionConnected(true);

        if (onSyncNotion) {
          setIsSyncingNotion(true);
          onSyncNotion().then(res => {
            setIsSyncingNotion(false);
            if (res.success) {
              alert(`¡Notion conectado y sincronizado con éxito!\nBase de datos: ${databaseName}`);
            } else {
              alert(`Notion conectado, pero la sincronización falló: ${res.message}`);
            }
          }).catch(err => {
            setIsSyncingNotion(false);
            alert(`Error en sincronización inicial: ${err.message || err}`);
          });
        } else {
          alert(`¡Notion conectado con éxito!\nBase de datos: ${databaseName}`);
        }

        window.removeEventListener('message', handleMessage);
      }
    };
    window.addEventListener('message', handleMessage);
  };

  const handleDisconnectNotion = () => {
    const defaultSettings: NotionSettings = {
      enabled: false,
      token: '',
      databaseId: '',
      autoSync: false,
      completedProperty: 'Completada',
      priorityProperty: 'Prioridad',
      dateProperty: 'Fecha',
    };
    NotionService.saveSettings(defaultSettings);
    setNotionSettings(defaultSettings);
    setIsNotionConnected(false);
  };

  const handleToggleAutoSync = (checked: boolean) => {
    const updated = { ...notionSettings, autoSync: checked };
    NotionService.saveSettings(updated);
    setNotionSettings(updated);
  };

  const handleSyncClick = async () => {
    if (!onSyncNotion) return;
    setIsSyncingNotion(true);
    try {
      const res = await onSyncNotion();
      alert(res.message);
    } catch (err: any) {
      alert(`Error al sincronizar con Notion: ${err.message || err}`);
    } finally {
      setIsSyncingNotion(false);
    }
  };

  const selectedDateKey = formatDateKey(selectedDate);
  const todayKey = formatDateKey(new Date());

  // Derive tasks for selected date
  const selectedDateTasks = useMemo(() => {
    return (allTodos[selectedDateKey] || []).slice().sort((a, b) => {
      const timeA = a.start_time || '23:59';
      const timeB = b.start_time || '23:59';
      return timeA.localeCompare(timeB);
    });
  }, [allTodos, selectedDateKey]);

  // Derive external calendar events for selected date
  const selectedDateCalendarEvents = useMemo(() => {
    return calendarEvents.filter(event => {
      const startStr = event.start?.dateTime
        ? event.start.dateTime.split('T')[0]
        : event.start?.date;
      return startStr === selectedDateKey;
    });
  }, [calendarEvents, selectedDateKey]);

  // Map of all dates with task count or events
  const dateMetadata = useMemo(() => {
    const map: { [key: string]: { taskCount: number; allCompleted: boolean; hasCalendar: boolean; events: any[] } } = {};

    Object.entries(allTodos).forEach(([dateKey, todos]) => {
      if (todos.length > 0) {
        if (!map[dateKey]) map[dateKey] = { taskCount: 0, allCompleted: true, hasCalendar: false, events: [] };
        map[dateKey].taskCount = todos.length;
        map[dateKey].allCompleted = todos.every(t => t.completed);
      }
    });

    calendarEvents.forEach(event => {
      const dateKey = event.start?.dateTime ? event.start.dateTime.split('T')[0] : event.start?.date;
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = { taskCount: 0, allCompleted: false, hasCalendar: true, events: [] };
        map[dateKey].hasCalendar = true;
        map[dateKey].events.push(event);
      }
    });

    return map;
  }, [allTodos, calendarEvents]);

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentMonthDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const newD = new Date(selectedDate);
      newD.setDate(newD.getDate() - 7);
      setDate(newD);
    } else {
      const newD = new Date(selectedDate);
      newD.setDate(newD.getDate() - 1);
      setDate(newD);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentMonthDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const newD = new Date(selectedDate);
      newD.setDate(newD.getDate() + 7);
      setDate(newD);
    } else {
      const newD = new Date(selectedDate);
      newD.setDate(newD.getDate() + 1);
      setDate(newD);
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    setDate(today);
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleExportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Pollito Productivo//Calendar Export//EN\n";
    
    Object.keys(allTodos).forEach(dateKey => {
      const tasks = allTodos[dateKey];
      tasks.forEach(todo => {
        const startStr = todo.due_date ? todo.due_date.replace(/-/g, '') : dateKey.replace(/-/g, '');
        let endStr = startStr;
        let timeStart = "T090000Z";
        let timeEnd = "T100000Z";
        
        if (todo.start_time) {
            timeStart = "T" + todo.start_time.replace(':', '') + "00Z";
        }
        if (todo.end_time) {
            timeEnd = "T" + todo.end_time.replace(':', '') + "00Z";
        }
        
        icsContent += "BEGIN:VEVENT\n";
        icsContent += `DTSTART:${startStr}${timeStart}\n`;
        icsContent += `DTEND:${endStr}${timeEnd}\n`;
        icsContent += `SUMMARY:${todo.text}\n`;
        if (todo.notes) icsContent += `DESCRIPTION:${todo.notes.replace(/\n/g, '\\n')}\n`;
        icsContent += "END:VEVENT\n";
      });
    });

    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'pollito-productivo.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const handleRefresh = async () => {
    if (onRefreshCalendarEvents) {
      setIsRefreshing(true);
      try {
        await onRefreshCalendarEvents();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };


  // Month grid calculation
  const monthDays = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; key: string }[] = [];

    // Prev month padding
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i);
      days.push({ date: d, isCurrentMonth: false, key: formatDateKey(d) });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day);
      days.push({ date: d, isCurrentMonth: true, key: formatDateKey(d) });
    }

    // Next month padding to fill grid (multiple of 7)
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, key: formatDateKey(d) });
    }

    return days;
  }, [currentMonthDate]);

  // Week days calculation
  const weekDays = useMemo(() => {
    const current = new Date(selectedDate);
    const dayOfWeek = (current.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(current);
    monday.setDate(current.getDate() - dayOfWeek);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push({ date: d, key: formatDateKey(d) });
    }
    return days;
  }, [selectedDate]);

  const weekdaysShort = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  const isGoogleConnected = !!googleApiToken;
  const isOutlookConnected = !!outlookAccount?.token;

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl overflow-hidden">      {/* Top Bar / Header */}
      <header className="flex-shrink-0 px-3 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={handlePrev}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeftIcon />
            </button>
            <button
              onClick={handleGoToday}
              className="px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="Siguiente"
            >
              <ChevronRightIcon />
            </button>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 capitalize">
            {viewMode === 'month'
              ? currentMonthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
              : selectedDate.toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => setViewMode('month')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                  : 'hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Agenda
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportICS}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
              title="Exportar a Apple Calendar o cualquier otra app"
            >
              Exportar (.ics)
            </button>
            {/* Calendar Account Connection Button */}
            <button
              onClick={() => setShowIntegrationsModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                isGoogleConnected || isOutlookConnected
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
            {isGoogleConnected && <GoogleIcon className="w-3.5 h-3.5" />}
            {isOutlookConnected && <OutlookIcon className="w-3.5 h-3.5" />}
            {!isGoogleConnected && !isOutlookConnected && <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />}
            <span className="hidden sm:inline">
              {isGoogleConnected ? 'Google Calendar' : isOutlookConnected ? 'Outlook' : 'Vincular Calendario'}
            </span>
          </button>

          {/* Manual Refresh */}
          {(isGoogleConnected || isOutlookConnected) && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              title="Sincronizar eventos"
            >
              <RefreshIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Calendar Grid Section */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 overflow-y-auto">          {/* Month View */}
          {viewMode === 'month' && (
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Day names header */}
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 py-2 text-center text-xs font-bold text-slate-500 dark:text-slate-400">
                {weekdaysShort.map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              {/* Days Grid */}
              <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80 min-h-[360px]">
                {monthDays.map(({ date, isCurrentMonth, key }) => {
                  const isSelected = key === selectedDateKey;
                  const isToday = key === todayKey;
                  const dayTodos = allTodos[key] || [];
                  const dayCalendarEvents = calendarEvents.filter(
                    e => (e.start?.dateTime ? e.start.dateTime.split('T')[0] : e.start?.date) === key
                  );
                  return (
                    <div
                      key={key}
                      onClick={() => setDate(date)}
                      className={`p-1.5 sm:p-2 min-h-[64px] sm:min-h-[78px] flex flex-col justify-between cursor-pointer transition-all ${
                        !isCurrentMonth ? 'opacity-35 bg-slate-50/40 dark:bg-slate-900/30' : ''
                      } ${isSelected ? 'bg-blue-50/80 dark:bg-blue-950/30 ring-2 ring-blue-500 z-10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                            isToday
                              ? 'bg-primary text-white font-bold'
                              : isSelected
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {date.getDate()}
                        </span>
                        {dayTodos.length > 0 && (
                          <span className="text-[10px] font-medium px-1 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {dayTodos.length}
                          </span>
                        )}
                      </div>
                      {/* Event/Task Previews */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                          {dayTodos.slice(0, 2).map(t => (
                            <div
                              key={t.id}
                              className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${
                                t.completed
                                  ? 'line-through text-slate-400 bg-slate-100 dark:bg-slate-800/60'
                                  : 'bg-primary-light/40 text-primary-dark dark:bg-primary/20 dark:text-primary-light'
                              }`}
                            >
                              <span className="w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                              <span className="truncate">{t.text}</span>
                            </div>
                          ))}
                          {dayCalendarEvents.slice(0, 2).map(e => (
                            <div
                              key={e.id}
                              className="text-[10px] truncate px-1.5 py-0.5 rounded font-medium bg-blue-100/70 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center gap-1"
                            >
                              <span className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                              <span className="truncate">{e.summary}</span>
                            </div>
                          ))}
                        {(dayTodos.length + dayCalendarEvents.length > 4) && (
                          <span className="text-[9px] text-slate-400 font-medium pl-1">
                            +{dayTodos.length + dayCalendarEvents.length - 4} más
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                {weekDays.map(({ date, key }) => {
                  const isSelected = key === selectedDateKey;
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      onClick={() => setDate(date)}
                      className={`p-2.5 text-center cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-100/70'
                      }`}
                    >
                      <p className="text-[11px] font-bold text-slate-500 uppercase">
                        {date.toLocaleDateString('es-ES', { weekday: 'short' })}
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${
                          isToday
                            ? 'bg-primary text-white'
                            : isSelected
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {date.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Day Columns */}
              <div className="flex-1 grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800 min-h-[300px] overflow-y-auto">
                {weekDays.map(({ date, key }) => {
                  const dayTodos = allTodos[key] || [];
                  const dayCalendarEvents = calendarEvents.filter(
                    e => (e.start?.dateTime ? e.start.dateTime.split('T')[0] : e.start?.date) === key
                  );

                  return (
                    <div
                      key={key}
                      onClick={() => setDate(date)}
                      className={`p-2 space-y-1.5 cursor-pointer ${
                        key === selectedDateKey ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      {dayTodos.map(t => (
                        <div
                          key={t.id}
                          onClick={e => {
                            e.stopPropagation();
                            onEditTodo(t);
                          }}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer shadow-xs transition-transform hover:scale-[1.02] ${
                            t.completed
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 line-through'
                              : 'bg-primary-light/30 border-primary/30 text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <div className="font-medium text-[11px] truncate">{t.text}</div>
                          {t.start_time && (
                            <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <ClockIcon className="w-2.5 h-2.5" />
                              {t.start_time}
                            </div>
                          )}
                        </div>
                      ))}

                      {dayCalendarEvents.map(e => (
                        <div
                          key={e.id}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs shadow-xs"
                        >
                          <div className="font-semibold text-[11px] truncate">{e.summary}</div>
                          {e.start?.dateTime && (
                            <div className="text-[9px] text-blue-500 mt-0.5">
                              {new Date(e.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}          {/* Agenda / List View */}
          {viewMode === 'agenda' && (
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-y-auto max-w-4xl mx-auto w-full">
              <div className="mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="font-bold text-2xl text-slate-900 dark:text-slate-100 flex items-center gap-3">
                  <span className="text-3xl">📅</span>
                  <span>
                    Agenda para <span className="text-blue-600 dark:text-blue-400">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tasks List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    Tareas de Pollito ({selectedDateTasks.length})
                  </h4>
                  <div className="space-y-3">
                    {selectedDateTasks.length === 0 ? (
                      <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">No hay tareas para este día.</p>
                      </div>
                    ) : (
                      selectedDateTasks.map(t => (
                        <div
                          key={t.id}
                          className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all ${
                            t.completed
                              ? 'bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800 opacity-60'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs hover:border-primary/40 hover:shadow-sm'
                          }`}
                        >
                          <button
                            onClick={() => onToggleTodo(t.id)}
                            className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                              t.completed
                                ? 'bg-primary border-primary text-white'
                                : 'border-slate-300 dark:border-slate-600 hover:border-primary'
                            }`}
                          >
                            {t.completed && <CheckIcon className="w-4 h-4" />}
                          </button>
                          
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p
                              onClick={() => onEditTodo(t)}
                              className={`text-base font-semibold text-slate-800 dark:text-slate-200 cursor-pointer ${
                                t.completed ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                            >
                              {t.text}
                            </p>
                            
                            {(t.start_time || t.gcal_event_id) && (
                              <div className="flex flex-wrap items-center gap-3 mt-2">
                                {t.start_time && (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300">
                                    <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                    {t.start_time} {t.end_time ? `- ${t.end_time}` : ''}
                                  </span>
                                )}
                                {t.gcal_event_id && (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-500">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    Sincronizado
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => onEditTodo(t)}
                            className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                          >
                            Editar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* External Events List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Eventos del Calendario ({selectedDateCalendarEvents.length})
                  </h4>
                  
                  <div className="space-y-3">
                    {selectedDateCalendarEvents.length === 0 ? (
                      <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">No hay eventos sincronizados.</p>
                      </div>
                    ) : (
                      selectedDateCalendarEvents.map(e => (
                        <div
                          key={e.id}
                          className="flex items-start gap-3 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/50 hover:border-blue-300 transition-colors"
                        >
                          <div className="mt-1 flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            {e.provider === 'outlook' ? (
                              <OutlookIcon className="w-4 h-4" />
                            ) : (
                              <GoogleIcon className="w-4 h-4" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-semibold text-blue-950 dark:text-blue-100">
                              {e.summary}
                            </p>
                            
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-white/60 dark:bg-slate-800/60 text-blue-700 dark:text-blue-300">
                                <ClockIcon className="w-3.5 h-3.5 text-blue-400" />
                                {e.start?.dateTime
                                  ? new Date(e.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Todo el día'}
                              </span>
                              
                              {e.location && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                                  <span className="text-slate-400">📍</span>
                                  <span className="truncate max-w-[120px]">{e.location}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {e.htmlLink && (
                            <a
                              href={e.htmlLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-800 rounded-lg shadow-xs hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                            >
                              Abrir
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar / Selected Day Quick Tasks panel */}
        <aside className="w-full md:w-60 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-4 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedDateTasks.length} tareas • {selectedDateCalendarEvents.length} eventos
                </p>
              </div>
            </div>

            {/* Day Schedule Timeline */}
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {selectedDateTasks.map(t => (
                <div
                  key={t.id}
                  onClick={() => onEditTodo(t)}
                  className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                    t.completed
                      ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 line-through text-slate-400'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-400 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    <span className="truncate">{t.text}</span>
                  </div>
                  {t.start_time && (
                    <span className="text-[10px] text-slate-500 font-medium flex-shrink-0 ml-2">
                      {t.start_time}
                    </span>
                  )}
                </div>
              ))}
              {selectedDateCalendarEvents.map(e => (
                <div
                  key={e.id}
                  className="p-2 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 truncate text-blue-900 dark:text-blue-200">
                    <CalendarIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    <span className="truncate">{e.summary}</span>
                  </div>
                  <span className="text-[10px] text-blue-500 font-medium flex-shrink-0 ml-2">
                    {e.start?.dateTime
                      ? new Date(e.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Día'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sync Status Footer */}
          <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                Sincronización Automática
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  gcalSettings.enabled || isOutlookConnected ? 'bg-green-500' : 'bg-slate-400'
                }`}
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {gcalSettings.enabled
                ? 'Las tareas creadas se sincronizan automáticamente con Google Calendar.'
                : isOutlookConnected
                ? 'Las tareas creadas se sincronizan automáticamente con Outlook Calendar.'
                : 'Conecta tu cuenta de Google o Outlook para sincronizar tus tareas en tu calendario.'}
            </p>
          </div>
        </aside>
      </div>

      {/* Integrations Modal (Google & Outlook Calendar) */}
      {showIntegrationsModal && (
        <div className="fixed inset-0 z-[70000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Integraciones de Calendario
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Conéctate con Google Calendar o Microsoft Outlook
                </p>
              </div>
              <button
                onClick={() => setShowIntegrationsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                ✕
              </button>
            </div>

            {/* Google Calendar Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <GoogleIcon className="w-5 h-5" />
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      Google Calendar
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isGoogleConnected ? 'Sesión iniciada' : 'No conectado'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGoogleAuth}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isGoogleConnected
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isGoogleConnected ? 'Desconectar' : 'Conectar Google'}
                </button>
              </div>

              {isGoogleConnected && (
                <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300">
                      Sincronizar tareas al crearlas automáticamente
                    </span>
                    <input
                      type="checkbox"
                      checked={gcalSettings.enabled}
                      onChange={e =>
                        onGCalSettingsChange({
                          ...gcalSettings,
                          enabled: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                  </label>

                  {userCalendars.length > 0 && (
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">
                        Calendario de destino
                      </label>
                      <select
                        value={gcalSettings.calendarId || 'primary'}
                        onChange={e =>
                          onGCalSettingsChange({
                            ...gcalSettings,
                            calendarId: e.target.value,
                          })
                        }
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg p-1.5 text-xs"
                      >
                        {userCalendars.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.summary} {c.primary ? '(Principal)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Outlook Calendar Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <OutlookIcon className="w-5 h-5" />
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      Microsoft Outlook Calendar
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isOutlookConnected ? outlookAccount?.email || 'Conectado' : 'No conectado'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={isOutlookConnected ? onDisconnectOutlook : onConnectOutlook}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    isOutlookConnected
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      : 'bg-[#0078D4] text-white hover:bg-[#0060AA]'
                  }`}
                >
                  {isOutlookConnected ? 'Desconectar' : 'Conectar Outlook'}
                </button>
              </div>

              {isOutlookConnected && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                    ✓ Conectado como {outlookAccount?.email}. Las tareas se sincronizarán con tu cuenta de Microsoft.
                  </p>
                </div>
              )}
            </div>

            {/* Notion Integration Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {/* Custom Notion Icon SVG inline */}
                  <svg className="w-5 h-5 text-black dark:text-white" viewBox="0 0 100 100" fill="currentColor">
                    <path d="M15 10 L85 10 C87.76 10 90 12.24 90 15 L90 85 C90 87.76 87.76 90 85 90 L15 90 C12.24 90 10 87.76 10 85 L10 15 C10 12.24 12.24 10 15 10 Z" fill="white" stroke="currentColor" strokeWidth="6"/>
                    <path d="M26 26 L38 26 L66 62 L66 26 L74 26 L74 74 L62 74 L34 38 L34 74 L26 74 Z" fill="currentColor"/>
                  </svg>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                      Notion Calendar & DB Sync
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isNotionConnected 
                        ? `Conectado a: ${notionSettings.databaseName || 'Mi Base de Datos'}` 
                        : 'No conectado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isNotionConnected && (
                    <button
                      onClick={handleSyncClick}
                      disabled={isSyncingNotion}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                      title="Sincronizar ahora"
                    >
                      <RefreshIcon className={`w-3.5 h-3.5 ${isSyncingNotion ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                  <button
                    onClick={isNotionConnected ? handleDisconnectNotion : handleConnectNotion}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isNotionConnected
                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                        : 'bg-[#191919] dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100'
                    }`}
                  >
                    {isNotionConnected ? 'Desconectar' : 'Conectar Notion'}
                  </button>
                </div>
              </div>

              {isNotionConnected && (
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2 text-xs">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-300">
                      Sincronizar tareas al crearlas automáticamente
                    </span>
                    <input
                      type="checkbox"
                      checked={notionSettings.autoSync}
                      onChange={e => handleToggleAutoSync(e.target.checked)}
                      className="w-4 h-4 rounded text-black dark:text-white focus:ring-black"
                    />
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Sincronización bidireccional activa. Las notas se sincronizan automáticamente.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowIntegrationsModal(false)}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold rounded-xl"
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
