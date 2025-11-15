import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Todo, Folder, Background, Playlist, WindowType, WindowState, GalleryImage, Subtask, QuickNote, ParticleType, AmbientSoundType, Note, ThemeColors, BrowserSession, SupabaseUser, Priority, Project, GCalSettings, GoogleCalendar, GoogleCalendarEvent } from './types';
import CompletionModal from './components/CompletionModal';
import { triggerConfetti } from './utils/confetti';
import Pomodoro from './components/Pomodoro';
import BibleVerse from './components/BibleVerse';
import FocusModeButton from './components/FocusModeButton';
import Dock from './components/Dock';
import ModalWindow from './components/ModalWindow';
import TodoListModule from './components/TodoListModule';
import NotesSection from './components/NotesSection';
import ImageGallery from './components/ImageGallery';
import MemoriesCarousel from './components/MemoriesCarousel';
import MusicPlayer from './components/MusicPlayer';
import FloatingPlayer from './components/FloatingPlayer';
import SpotifyFloatingPlayer from './components/SpotifyFloatingPlayer';
import TaskDetailsModal from './components/TaskDetailsModal';
import ParticleLayer from './components/ParticleLayer';
import { initDB, getAll, get, set, syncableCreate, syncableUpdate, syncableDelete, syncableDeleteAll, processSyncQueue, syncableDeleteMultiple, clearAndPutAll } from './db';
import Login from './components/Login';
import LogoutIcon from './components/icons/LogoutIcon';
import Browser from './components/Browser';
import BackgroundTimer from './components/BackgroundTimer';
import TodaysAgenda from './components/TodaysAgenda';
import { rainSoundSrc, forestSoundSrc, coffeeShopSrc, oceanSoundSrc } from './assets/sounds';
import MobileNav from './components/MobileNav';
import MobileHeader from './components/MobileHeader';
import ChickenIcon from './components/ChickenIcon';
import MobileMusicPlayer from './components/MobileMusicPlayer';
import MobilePomodoroWidget from './components/MobilePomodoroWidget';
import ThemeToggleButton from './components/ThemeToggleButton';
import PaletteIcon from './components/icons/PaletteIcon';
import CustomizationPanel from './components/CustomizationPanel';
import ChevronRightIcon from './components/icons/ChevronRightIcon';
import GamesHub from './components/GamesHub';
import { supabase } from './supabaseClient';
import { config } from './config';
import { ensureYoutubeApiReady } from './utils/youtubeApi';
import BellIcon from './components/icons/BellIcon';
import InstallPwaBanner from './components/InstallPwaBanner';
import AddTaskModal from './components/AddTaskModal';
import PlusIcon from './components/icons/PlusIcon';
import MobileTaskEditor from './components/MobileTaskEditor';
import MobilePomodoroPanel from './components/MobilePomodoroPanel';
import ConfirmationModalWithOptions from './components/ConfirmationModalWithOptions';
import ConfirmationModal from './components/ConfirmationModal';
import QuickCaptureSetupModal from './components/QuickCaptureSetupModal';
import MotivationalToast from './components/MotivationalToast';
import IntegrationsPanel from './components/IntegrationsPanel';
import LinkIcon from './components/icons/LinkIcon';
import NotificationsPanel from './components/NotificationsPanel';

// --- Google API Configuration ---
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (process.env as any).GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar';
const APP_FOLDER_NAME = 'Lista de Tareas App Files';

// --- OneSignal Configuration ---
const ONE_SIGNAL_APP_ID = (import.meta as any).env?.VITE_ONE_SIGNAL_APP_ID || (process.env as any).ONE_SIGNAL_APP_ID || config.ONE_SIGNAL_APP_ID;

const pomodoroAudioSrc = "data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAYAAAAD//wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A";


// Helper to format date as YYYY-MM-DD key
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateRecurringTasks = async (sourceTodo: Todo, currentTodos: { [key: string]: Todo[] }): Promise<{ [key: string]: Todo[] }> => {
    if (!sourceTodo.recurrence || sourceTodo.recurrence.frequency === 'none' || !sourceTodo.due_date) {
        return currentTodos;
    }

    const allTasksFlat: Todo[] = Object.values(currentTodos).flat() as Todo[];
    const { frequency, customDays, ends_on } = sourceTodo.recurrence;
    const recurrenceId = sourceTodo.recurrence.id!;

    // 1. Calculate all potential future dates
    let lastDueDate = new Date(sourceTodo.due_date + 'T00:00:00Z');
    let limitDate = new Date();
    switch (frequency) {
        case 'daily': limitDate.setMonth(limitDate.getMonth() + 1); break;
        case 'weekly': case 'biweekly': case 'custom': limitDate.setMonth(limitDate.getMonth() + 3); break;
        case 'monthly': limitDate.setMonth(limitDate.getMonth() + 6); break;
        default: limitDate.setDate(limitDate.getDate() + 90);
    }

    const recurrenceEndDate = ends_on ? new Date(ends_on + 'T00:00:00Z') : null;
    const finalLimitDate = (recurrenceEndDate && recurrenceEndDate < limitDate) ? recurrenceEndDate : limitDate;

    const potentialDates: Date[] = [];
    let loopGuard = 0; // Prevent infinite loops
    while (lastDueDate < finalLimitDate && loopGuard < 365) {
        let nextDueDate: Date | null = new Date(lastDueDate.valueOf());
        let foundNext = false;

        switch (frequency) {
            case 'daily': nextDueDate.setUTCDate(nextDueDate.getUTCDate() + 1); foundNext = true; break;
            case 'weekly': nextDueDate.setUTCDate(nextDueDate.getUTCDate() + 7); foundNext = true; break;
            case 'biweekly': nextDueDate.setUTCDate(nextDueDate.getUTCDate() + 14); foundNext = true; break;
            case 'monthly': nextDueDate.setUTCMonth(nextDueDate.getUTCMonth() + 1); foundNext = true; break;
            case 'custom': {
                if (!customDays || customDays.length === 0) { nextDueDate = null; break; }
                const sortedCustomDays = [...customDays].sort((a,b) => a - b);
                const lastDayOfWeek = lastDueDate.getUTCDay();
                let daysToAdd = Infinity;
                for (const customDay of sortedCustomDays) { if(customDay > lastDayOfWeek) { daysToAdd = customDay - lastDayOfWeek; break; } }
                if(daysToAdd === Infinity) { daysToAdd = (7 - lastDayOfWeek) + sortedCustomDays[0]; }
                nextDueDate.setUTCDate(lastDueDate.getUTCDate() + daysToAdd);
                foundNext = true;
                break;
            }
            default: nextDueDate = null;
        }
        
        if (foundNext && nextDueDate) {
            if (nextDueDate > finalLimitDate) { // Post-check to ensure we don't go past the end date
                break;
            }
            potentialDates.push(nextDueDate);
            lastDueDate = nextDueDate;
        } else {
            break;
        }
        loopGuard++;
    }

    // 2. Filter out dates that already exist
    const existingDates = new Set(allTasksFlat.filter(t => t.recurrence?.id === recurrenceId).map(t => t.due_date).filter(Boolean) as string[]);
    const datesToCreate = potentialDates.filter(d => !existingDates.has(d.toISOString().split('T')[0]));

    if (datesToCreate.length === 0) { return currentTodos; }

    // 3. Build payloads for batch insert
    const { id, subtasks, user_id, ...payload } = sourceTodo;
    const newTodosPayloads = datesToCreate.map(date => ({
        ...payload,
        completed: false,
        notification_sent: false,
        due_date: date.toISOString().split('T')[0],
        user_id: sourceTodo.user_id,
        recurrence: { ...sourceTodo.recurrence, sourceId: sourceTodo.id },
    }));

    // 4. Batch insert into Supabase
    const { data: newTodos, error } = await supabase.from('todos').insert(newTodosPayloads).select();
    if (error || !newTodos) { console.error("Error batch creating recurring tasks:", error); return currentTodos; }

    if (sourceTodo.subtasks && sourceTodo.subtasks.length > 0) {
        const newSubtasksPayloads = newTodos.flatMap(newTodo => sourceTodo.subtasks!.map(st => ({ text: st.text, completed: false, todo_id: newTodo.id })));
        await supabase.from('subtasks').insert(newSubtasksPayloads);
    }

    // 5. Add new todos to a copy of the state
    let newAllTodos = JSON.parse(JSON.stringify(currentTodos));
    const subtasksTemplate = sourceTodo.subtasks?.map(st => ({...st, id: 0, completed: false})) || [];

    newTodos.forEach(newTodo => {
        const dateKey = newTodo.due_date!;
        if (!newAllTodos[dateKey]) { newAllTodos[dateKey] = []; }
        const newTodoWithSubtasks = { ...newTodo, subtasks: subtasksTemplate.map(st => ({...st, id: Math.random()})) };
        newAllTodos[dateKey].push(newTodoWithSubtasks);
    });

    return newAllTodos;
};


const motivationalQuotes = [
  "¡Excelente trabajo!",
  "¡Un paso más cerca!",
  "¡Sigue así, vas genial!",
  "¡Imparable!",
  "¡Tarea completada con éxito!",
  "¡Vas por muy buen camino!",
  "¡Lo estás haciendo increíble!",
  "¡Pequeño paso, gran victoria!",
];

const Greeting: React.FC<{ name: string; className?: string }> = ({ name, className = "" }) => (
  <div className={`inline-flex items-center gap-2 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full shadow-lg p-1.5 pr-3 ${className}`}>
    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-bold text-white">{name.charAt(0)}</span>
    </div>
    <h2 className="text-base font-bold text-primary-dark dark:text-primary">Hola, {name}</h2>
  </div>
);

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(window.matchMedia(query).matches);

    useEffect(() => {
        const media = window.matchMedia(query);
        const listener = () => setMatches(media.matches);
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
};

interface AppComponentProps {
  isOnline: boolean;
  isSyncing: boolean;
  currentUser: SupabaseUser;
  onLogout: () => void;
  // Theme
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  themeColors: ThemeColors;
  onThemeColorChange: (colorName: keyof ThemeColors, value: string) => void;
  onResetThemeColors: () => void;
  // Shared Data
  allTodos: { [key: string]: Todo[] };
  folders: Folder[];
  projects: Project[];
  galleryImages: GalleryImage[];
  userBackgrounds: Background[];
  playlists: Playlist[];
  quickNotes: QuickNote[];
  browserSession: BrowserSession;
  selectedDate: Date;
  // Shared UI State
  pomodoroState: any;
  activeBackground: Background | null;
  particleType: ParticleType;
  ambientSound: { type: AmbientSoundType; volume: number };
  dailyEncouragementLocalHour: number | null;
  dailySummaryHour: number | null;
  activeTrack: Playlist | null;
  activeSpotifyTrack: Playlist | null;
  // Handlers
  handleAddTodo: (text: string, options?: { projectId?: number | null; isUndated?: boolean }) => Promise<void>;
  handleUpdateTodo: (updatedTodo: Todo) => Promise<void>;
  handleToggleTodo: (id: number, onAllCompleted: (quote: string) => void) => Promise<void>;
  handleToggleSubtask: (taskId: number, subtaskId: number, onAllCompleted: (quote: string) => void) => Promise<void>;
  handleDeleteTodo: (id: number) => Promise<void>;
  onClearPastTodos: () => void;
  handleAddFolder: (name: string) => Promise<Folder | null>;
  handleUpdateFolder: (folderId: number, name: string) => Promise<void>;
  handleDeleteFolder: (folderId: number) => Promise<void>;
  handleAddNote: (folderId: number) => Promise<Note | null>;
  handleUpdateNote: (note: Note) => Promise<void>;
  handleDeleteNote: (noteId: number, folderId: number) => Promise<void>;
  handleAddProject: (name: string, emoji: string | null) => Promise<Project | null>;
  handleUpdateProject: (projectId: number, name: string, emoji: string | null) => Promise<void>;
  handleDeleteProject: (projectId: number) => Promise<void>;
  handleDeleteProjectAndTasks: (projectId: number) => Promise<void>;
  handleAddPlaylist: (playlistData: Omit<Playlist, 'id' | 'user_id' | 'created_at'>) => Promise<void>;
  handleUpdatePlaylist: (playlist: Playlist) => Promise<void>;
  handleDeletePlaylist: (playlistId: number) => Promise<void>;
  handleAddQuickNote: (text: string) => Promise<void>;
  handleDeleteQuickNote: (id: number) => Promise<void>;
  handleClearAllQuickNotes: () => Promise<void>;
  // Setters for shared state
  setBrowserSession: React.Dispatch<React.SetStateAction<BrowserSession>>;
  setSelectedDate: React.Dispatch<React.SetStateAction<Date>>;
  setPomodoroState: React.Dispatch<React.SetStateAction<any>>;
  setActiveBackground: (background: Background | null) => void;
  setParticleType: (type: ParticleType) => void;
  setAmbientSound: (sound: { type: AmbientSoundType; volume: number }) => void;
  onSetDailyEncouragement: (localHour: number | null) => void;
  onSetDailySummary: (localHour: number | null) => void;
  setActiveTrack: React.Dispatch<React.SetStateAction<Playlist | null>>;
  setActiveSpotifyTrack: React.Dispatch<React.SetStateAction<Playlist | null>>;
  // Google API Props
  googleApiToken: string | null;
  galleryIsLoading: boolean;
  backgroundsAreLoading: boolean;
  handleAuthClick: () => void;
  handleAddGalleryImages: (files: File[]) => Promise<void>;
  handleDeleteGalleryImage: (id: string) => Promise<void>;
  handleAddBackground: (file: File) => Promise<void>;
  handleDeleteBackground: (id: string) => Promise<void>;
  handleToggleFavoriteBackground: (id: string) => Promise<void>;
  gapiReady: boolean;
  // Google Calendar Props
  gcalSettings: GCalSettings;
  onGCalSettingsChange: (settings: GCalSettings) => void;
  userCalendars: GoogleCalendar[];
  calendarEvents: GoogleCalendarEvent[];
  // Notifications
  isSubscribed: boolean;
  isPermissionBlocked: boolean;
  handleNotificationAction: () => void;
}

const DesktopApp: React.FC<AppComponentProps> = (props) => {
  const {
    isOnline, isSyncing, currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
    allTodos, folders, projects, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
    pomodoroState, activeBackground, particleType, ambientSound, dailyEncouragementLocalHour, dailySummaryHour,
    activeTrack, activeSpotifyTrack,
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos,
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddProject, handleUpdateProject, handleDeleteProject, handleDeleteProjectAndTasks,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound, onSetDailyEncouragement, onSetDailySummary,
    setActiveTrack, setActiveSpotifyTrack,
    googleApiToken, galleryIsLoading, backgroundsAreLoading, handleAuthClick,
    handleAddGalleryImages, handleDeleteGalleryImage, handleAddBackground, handleDeleteBackground, handleToggleFavoriteBackground,
    gcalSettings, onGCalSettingsChange, userCalendars, calendarEvents,
    isSubscribed, isPermissionBlocked, handleNotificationAction
  } = props;
  
  // Local UI State for Desktop
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionQuote, setCompletionQuote] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [openWindows, setOpenWindows] = useState<WindowType[]>([]);
  const [windowStates, setWindowStates] = useState<{ [key in WindowType]?: WindowState }>({});
  const [focusedWindow, setFocusedWindow] = useState<WindowType | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
  const [isCustomizationPanelOpen, setIsCustomizationPanelOpen] = useState(false);
  const [isIntegrationsPanelOpen, setIsIntegrationsPanelOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const pomodoroStartedRef = useRef(false);

  const getUserKey = useCallback((key: string) => `${currentUser.email}_${key}`, [currentUser]);
  
  // Load/Save local UI state from localStorage
  useEffect(() => {
    const storedWindows = localStorage.getItem(getUserKey('windowStates'));
    const storedOpenWindows = localStorage.getItem(getUserKey('openWindows'));
    if (storedWindows) setWindowStates(JSON.parse(storedWindows));
    if (storedOpenWindows) setOpenWindows(JSON.parse(storedOpenWindows));
  }, [getUserKey]);

  useEffect(() => { localStorage.setItem(getUserKey('windowStates'), JSON.stringify(windowStates)); }, [windowStates, getUserKey]);
  useEffect(() => { localStorage.setItem(getUserKey('openWindows'), JSON.stringify(openWindows)); }, [openWindows, getUserKey]);

  const pomodoroAudioRef = useRef<HTMLAudioElement>(null);
  
  const handleShowCompletionModal = (quote: string) => {
    setCompletionQuote(quote);
    setShowCompletionModal(true);
  };
  
  // Memoized values derived from props
  const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
  const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
  const todayAgendaTasks = useMemo(() => (allTodos[formatDateKey(new Date())] || []).sort((a, b) => (a.start_time || '23:59').localeCompare(b.start_time || '23:59')), [allTodos]);

  // Pomodoro Timer Logic
  const handleTimerCompletion = useCallback(() => {
    pomodoroAudioRef.current?.play();

    setPomodoroState(s => {
      const newMode = s.mode === 'work' ? 'break' : 'work';
      const message = s.mode === 'work' ? "¡Tiempo de descanso! Buen trabajo." : "¡De vuelta al trabajo! Tú puedes.";

      if (isSubscribed) {
        supabase.functions.invoke('send-pushalert-notification', {
          body: { title: "Pomodoro Terminado", message: message },
        });
      }

      const newDuration = s.durations[newMode];
      return {
        ...s,
        mode: newMode,
        timeLeft: newDuration,
        isActive: true,
        endTime: Date.now() + newDuration * 1000,
      };
    });
  }, [isSubscribed, setPomodoroState]);

  const handlePomodoroToggle = useCallback(() => {
    setPomodoroState(s => {
      const isStarting = !s.isActive;
      if (isStarting) {
        const endTime = Date.now() + s.timeLeft * 1000;
        if (!pomodoroStartedRef.current) {
          pomodoroStartedRef.current = true;
          return { ...s, isActive: true, endTime, showBackgroundTimer: true };
        }
        return { ...s, isActive: true, endTime };
      } else {
        // Preserve timeLeft when pausing
        const remaining = s.endTime ? s.endTime - Date.now() : s.timeLeft * 1000;
        return { ...s, isActive: false, endTime: null, timeLeft: Math.max(0, Math.ceil(remaining / 1000)) };
      }
    });
  }, [setPomodoroState]);

  useEffect(() => {
    let animationFrameId: number;
    const originalTitle = 'Pollito Productivo';

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const tick = () => {
        const { isActive, endTime, timeLeft, mode } = pomodoroState;
        if (!isActive || !endTime) {
            return;
        }

        const remaining = endTime - Date.now();
        if (remaining <= 0) {
            handleTimerCompletion();
        } else {
            const newTimeLeft = Math.ceil(remaining / 1000);
            if (newTimeLeft !== timeLeft) {
                setPomodoroState(s => ({ ...s, timeLeft: newTimeLeft }));
            }
            const timeString = formatTime(newTimeLeft);
            const modeLabel = mode === 'work' ? 'Concentración' : 'Descanso';
            document.title = `(${timeString}) ${modeLabel} - ${originalTitle}`;

            animationFrameId = requestAnimationFrame(tick);
        }
    };

    if (pomodoroState.isActive) {
        animationFrameId = requestAnimationFrame(tick);
    } else {
        document.title = originalTitle;
    }

    return () => {
        cancelAnimationFrame(animationFrameId);
        document.title = originalTitle;
    };
  }, [pomodoroState, handleTimerCompletion, setPomodoroState]);

  // --- Windowing and Misc Handlers ---
  const toggleWindow = (windowType: WindowType) => {
    setOpenWindows(open => open.includes(windowType) ? open.filter(w => w !== windowType) : [...open, windowType]);
    bringToFront(windowType);
  };
  const bringToFront = (windowType: WindowType) => setFocusedWindow(windowType);

  const handleSelectTrack = (track: Playlist, queue: Playlist[]) => {
      if(track.platform === 'youtube') {
          setActiveTrack({ ...track, queue });
          if(activeSpotifyTrack) setActiveSpotifyTrack(null);
      } else {
          setActiveSpotifyTrack({ ...track, queue });
          if(activeTrack) setActiveTrack(null);
      }
  };
  
  const capitalizedUserName = useMemo(() => {
      if (!currentUser.email) return 'Pollito';
      const userName = currentUser.email.split('@')[0];
      return userName.charAt(0).toUpperCase() + userName.slice(1);
  }, [currentUser.email]);

  return (
    <div className="h-screen w-screen text-gray-800 dark:text-gray-100 font-sans overflow-hidden">
        {pomodoroState.isActive && pomodoroState.showBackgroundTimer && <BackgroundTimer timeLeft={pomodoroState.timeLeft} opacity={pomodoroState.backgroundTimerOpacity} />}
        <ParticleLayer type={particleType} />

      <header className="fixed top-4 right-4 z-[70000] flex flex-col items-end gap-3">
        {isSyncing && (
            <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-2">
                <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Sincronizando...
            </div>
        )}
        {!isOnline && !isSyncing && (
            <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Sin conexión
            </div>
        )}
        <div className={`transition-opacity duration-300 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button onClick={onLogout} className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-100 hover:text-red-500 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110" aria-label="Cerrar sesión">
            <LogoutIcon />
          </button>
        </div>
        <FocusModeButton isFocusMode={isFocusMode} onToggle={() => setIsFocusMode(!isFocusMode)} />
        <div className={`transition-opacity duration-300 flex flex-col items-end gap-3 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
          <button
              onClick={() => setIsCustomizationPanelOpen(true)}
              className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
              aria-label="Personalización"
            >
              <PaletteIcon />
            </button>
            <button
                onClick={() => setIsIntegrationsPanelOpen(true)}
                className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                aria-label="Integraciones"
              >
                <LinkIcon />
              </button>
            <button
                onClick={() => setIsNotificationsPanelOpen(true)}
                className={`relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
                    isPermissionBlocked
                    ? 'text-red-400 cursor-not-allowed'
                    : isSubscribed
                    ? 'text-primary'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary'
                }`}
                aria-label={isSubscribed ? 'Gestionar notificaciones' : 'Activar notificaciones'}
                title={
                    isPermissionBlocked
                    ? 'Notificaciones bloqueadas por el navegador'
                    : 'Gestionar notificaciones'
                }
                disabled={isPermissionBlocked}
            >
                <BellIcon className="h-6 w-6" />
                {isPermissionBlocked && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                    </div>
                )}
            </button>
        </div>
      </header>

      <CustomizationPanel
        isOpen={isCustomizationPanelOpen}
        onClose={() => setIsCustomizationPanelOpen(false)}
        colors={themeColors}
        onThemeColorChange={onThemeColorChange}
        onReset={onResetThemeColors}
        activeBackground={activeBackground}
        userBackgrounds={userBackgrounds}
        onSelectBackground={setActiveBackground}
        onAddBackground={handleAddBackground}
        onDeleteBackground={handleDeleteBackground}
        onToggleFavorite={handleToggleFavoriteBackground}
        backgroundsLoading={backgroundsAreLoading}
        particleType={particleType}
        setParticleType={setParticleType}
        ambientSound={ambientSound}
        setAmbientSound={setAmbientSound}
      />
      
      <IntegrationsPanel
        isOpen={isIntegrationsPanelOpen}
        onClose={() => setIsIntegrationsPanelOpen(false)}
        isSignedIn={!!googleApiToken}
        onAuthClick={handleAuthClick}
        isGapiReady={props.gapiReady}
        gcalSettings={gcalSettings}
        onGCalSettingsChange={onGCalSettingsChange}
        userCalendars={userCalendars}
      />

      <NotificationsPanel
        isOpen={isNotificationsPanelOpen}
        onClose={() => setIsNotificationsPanelOpen(false)}
        dailyEncouragementHour={props.dailyEncouragementLocalHour}
        onSetDailyEncouragement={props.onSetDailyEncouragement}
        dailySummaryHour={props.dailySummaryHour}
        onSetDailySummary={props.onSetDailySummary}
        onSendTestNotification={handleNotificationAction}
      />
      
      <div className={`fixed top-4 left-4 z-30 w-64 space-y-4 transition-all duration-500 ${isFocusMode ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'} hidden md:block`}>
          <Greeting name={capitalizedUserName} />
          <BibleVerse />
          <TodaysAgenda 
            tasks={todayAgendaTasks} 
            calendarEvents={calendarEvents}
            onToggleTask={(id) => handleToggleTodo(id, handleShowCompletionModal)} 
            onToggleSubtask={(taskId, subtaskId) => handleToggleSubtask(taskId, subtaskId, handleShowCompletionModal)}
            quickNotes={quickNotes}
            onAddQuickNote={handleAddQuickNote}
            onDeleteQuickNote={handleDeleteQuickNote}
            onClearAllQuickNotes={handleClearAllQuickNotes}
          />
      </div>
      
      <div className={`transition-opacity duration-500 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <MemoriesCarousel images={galleryImages} />
      </div>

        <main className={`${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {openWindows.includes('todo') && (
            <ModalWindow isOpen={true} onClose={() => toggleWindow('todo')} title="Lista de Tareas" isDraggable isResizable zIndex={focusedWindow === 'todo' ? 50 : 40} onFocus={() => bringToFront('todo')} className="w-full max-w-3xl h-[80vh]" windowState={windowStates.todo} onStateChange={s => setWindowStates(ws => ({...ws, todo: s}))}>
              <TodoListModule 
                allTodos={allTodos} 
                addTodo={handleAddTodo} 
                toggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)}
                toggleSubtask={(taskId, subtaskId) => handleToggleSubtask(taskId, subtaskId, handleShowCompletionModal)}
                deleteTodo={handleDeleteTodo} 
                updateTodo={handleUpdateTodo} 
                onEditTodo={setTaskToEdit} 
                selectedDate={selectedDate} 
                setSelectedDate={setSelectedDate} 
                datesWithTasks={datesWithTasks} 
                datesWithAllTasksCompleted={datesWithAllTasksCompleted} 
                onClearPastTodos={onClearPastTodos}
                projects={projects}
                onAddProject={handleAddProject}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
                onDeleteProjectAndTasks={handleDeleteProjectAndTasks}
                calendarEvents={calendarEvents}
              />
            </ModalWindow>
          )}
          {openWindows.includes('notes') && (
              <ModalWindow isOpen onClose={() => toggleWindow('notes')} title="Notas del Pollito" isDraggable isResizable zIndex={focusedWindow === 'notes' ? 50 : 40} onFocus={() => bringToFront('notes')} className="w-full max-w-3xl h-[75vh]" windowState={windowStates.notes} onStateChange={s => setWindowStates(ws => ({...ws, notes: s}))}>
                  <NotesSection folders={folders} onAddFolder={handleAddFolder} onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />
              </ModalWindow>
          )}
          {openWindows.includes('gallery') && (
              <ModalWindow isOpen onClose={() => toggleWindow('gallery')} title="Galería de Recuerdos" isDraggable isResizable zIndex={focusedWindow === 'gallery' ? 50 : 40} onFocus={() => bringToFront('gallery')} className="w-full max-w-2xl h-[70vh]" windowState={windowStates.gallery} onStateChange={s => setWindowStates(ws => ({...ws, gallery: s}))}>
                  <ImageGallery images={galleryImages} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} isSignedIn={!!googleApiToken} onAuthClick={handleAuthClick} isGapiReady={props.gapiReady} isLoading={galleryIsLoading} />
              </ModalWindow>
          )}
          {openWindows.includes('pomodoro') && (
              <ModalWindow isOpen onClose={() => toggleWindow('pomodoro')} title="Pomodoro" isDraggable isResizable zIndex={focusedWindow === 'pomodoro' ? 50 : 40} onFocus={() => bringToFront('pomodoro')} className="w-80 h-96" windowState={windowStates.pomodoro} onStateChange={s => setWindowStates(ws => ({...ws, pomodoro: s}))}>
                  <Pomodoro timeLeft={pomodoroState.timeLeft} isActive={pomodoroState.isActive} mode={pomodoroState.mode} durations={pomodoroState.durations} onToggle={handlePomodoroToggle} onReset={() => setPomodoroState(s => ({ ...s, timeLeft: s.durations[s.mode], isActive: false, endTime: null }))} onSwitchMode={(mode) => setPomodoroState(s => ({ ...s, mode, timeLeft: s.durations[mode], isActive: false, endTime: null }))} onSaveSettings={(d) => setPomodoroState(s => ({ ...s, durations: d, timeLeft: d[s.mode], isActive: false, endTime: null }))} showBackgroundTimer={pomodoroState.showBackgroundTimer} onToggleBackgroundTimer={() => setPomodoroState(s => ({...s, showBackgroundTimer: !s.showBackgroundTimer}))} backgroundTimerOpacity={pomodoroState.backgroundTimerOpacity} onSetBackgroundTimerOpacity={op => setPomodoroState(s => ({...s, backgroundTimerOpacity: op}))} />
              </ModalWindow>
          )}
           {openWindows.includes('music') && (
              <ModalWindow isOpen onClose={() => toggleWindow('music')} frameless isDraggable isResizable zIndex={focusedWindow === 'music' ? 50 : 40} onFocus={() => bringToFront('music')} className="w-[600px] h-[450px]" windowState={windowStates.music} onStateChange={s => setWindowStates(ws => ({...ws, music: s}))}>
                  <MusicPlayer playlists={playlists} onAddPlaylist={handleAddPlaylist} onUpdatePlaylist={handleUpdatePlaylist} onDeletePlaylist={handleDeletePlaylist} onSelectTrack={handleSelectTrack} onClose={() => toggleWindow('music')} />
              </ModalWindow>
          )}
          {openWindows.includes('browser') && (
              <ModalWindow isOpen onClose={() => toggleWindow('browser')} title="IA Pollito" isDraggable isResizable zIndex={focusedWindow === 'browser' ? 50 : 40} onFocus={() => bringToFront('browser')} className="w-full max-w-xl h-[85vh]" windowState={windowStates.browser} onStateChange={s => setWindowStates(ws => ({...ws, browser: s}))}>
                  <Browser session={browserSession} setSession={setBrowserSession} currentUser={currentUser} />
              </ModalWindow>
          )}
          {openWindows.includes('games') && (
            <ModalWindow isOpen={true} onClose={() => toggleWindow('games')} title="Centro de Juegos" isDraggable isResizable zIndex={focusedWindow === 'games' ? 50 : 40} onFocus={() => bringToFront('games')} className="w-full max-w-4xl h-[85vh]" windowState={windowStates.games} onStateChange={s => setWindowStates(ws => ({...ws, games: s}))}>
              <GamesHub galleryImages={galleryImages} currentUser={capitalizedUserName} />
            </ModalWindow>
          )}
        </main>
      
      <div className={`transition-opacity duration-500 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} quote={completionQuote}/>
        <TaskDetailsModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} onSave={handleUpdateTodo} todo={taskToEdit} projects={projects} />
        {activeTrack && <FloatingPlayer track={activeTrack} queue={activeTrack.queue} onSelectTrack={handleSelectTrack} onClose={() => setActiveTrack(null)} />}
        {activeSpotifyTrack && <SpotifyFloatingPlayer track={activeSpotifyTrack} onClose={() => setActiveSpotifyTrack(null)} />}
      </div>

      <div className={`fixed bottom-0 left-0 right-0 transition-opacity duration-500 z-[40000] ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Dock onButtonClick={toggleWindow} openWindows={openWindows} />
      </div>

      <audio ref={pomodoroAudioRef} src={pomodoroAudioSrc} />
    </div>
  );
};

const MobileApp: React.FC<AppComponentProps> = (props) => {
    const {
      isOnline, isSyncing, currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
      allTodos, folders, projects, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
      pomodoroState, activeBackground, particleType, ambientSound, dailyEncouragementLocalHour, dailySummaryHour,
      activeTrack, activeSpotifyTrack,
      handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos,
      handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
      handleAddProject, handleUpdateProject, handleDeleteProject, handleDeleteProjectAndTasks,
      handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
      handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
      setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound, onSetDailyEncouragement, onSetDailySummary,
      setActiveTrack, setActiveSpotifyTrack,
      googleApiToken, galleryIsLoading, backgroundsAreLoading, handleAuthClick,
      handleAddGalleryImages, handleDeleteGalleryImage, handleAddBackground, handleDeleteBackground, handleToggleFavoriteBackground,
      gcalSettings, onGCalSettingsChange, userCalendars, calendarEvents,
      isSubscribed, isPermissionBlocked, handleNotificationAction
    } = props;

    // Local UI state for Mobile
    const [activeTab, setActiveTab] = useState('home');
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionQuote, setCompletionQuote] = useState('');
    const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
    const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
    const [isAiBrowserOpen, setIsAiBrowserOpen] = useState(false);
    const [isCustomizationPanelOpen, setIsCustomizationPanelOpen] = useState(false);
    const [isIntegrationsPanelOpen, setIsIntegrationsPanelOpen] = useState(false);
    const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isQuickCaptureSetupOpen, setIsQuickCaptureSetupOpen] = useState(false);
    const [viewingProjectId, setViewingProjectId] = useState<number | null>(null);
    
    const pomodoroAudioRef = useRef<HTMLAudioElement>(null);

    const handleShowCompletionModal = (quote: string) => {
        setCompletionQuote(quote);
        setShowCompletionModal(true);
    };

    const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
    const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
    const todayAgendaTasks = useMemo(() => (allTodos[formatDateKey(new Date())] || []).sort((a, b) => (a.start_time || '23:59').localeCompare(b.start_time || '23:59')), [allTodos]);
    
    // Pomodoro Timer Logic
    const handleTimerCompletion = useCallback(() => {
        pomodoroAudioRef.current?.play();

        setPomodoroState(s => {
            const newMode = s.mode === 'work' ? 'break' : 'work';
            const message = s.mode === 'work' ? "¡Tiempo de descansar! ¡Bien hecho!" : "¡Se acabó el descanso! Tú puedes.";

            if (isSubscribed) {
                supabase.functions.invoke('send-pushalert-notification', {
                    body: { title: "Pomodoro Terminado", message: message },
                });
            }

            const newDuration = s.durations[newMode];
            return {
                ...s,
                mode: newMode,
                timeLeft: newDuration,
                isActive: true,
                endTime: Date.now() + newDuration * 1000,
            };
        });
    }, [isSubscribed, setPomodoroState]);

    const handlePomodoroToggle = useCallback(() => {
        setPomodoroState(s => {
            const isStarting = !s.isActive;
            if (isStarting) {
                return { ...s, isActive: true, endTime: Date.now() + s.timeLeft * 1000 };
            } else {
                const remaining = s.endTime ? s.endTime - Date.now() : s.timeLeft * 1000;
                return { ...s, isActive: false, endTime: null, timeLeft: Math.max(0, Math.ceil(remaining / 1000)) };
            }
        });
    }, [setPomodoroState]);

    const handleSwitchMode = (mode: 'work' | 'break') => {
        setPomodoroState(s => ({
            ...s,
            mode,
            timeLeft: s.durations[mode],
            isActive: false,
            endTime: null,
        }));
    };

    useEffect(() => {
        let animationFrameId: number;
        const originalTitle = 'Pollito Productivo';

        const formatTime = (seconds: number) => {
            const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
            const secs = (seconds % 60).toString().padStart(2, '0');
            return `${mins}:${secs}`;
        };

        const tick = () => {
            const { isActive, endTime, timeLeft, mode } = pomodoroState;
            if (!isActive || !endTime) {
                return;
            }

            const remaining = endTime - Date.now();
            if (remaining <= 0) {
                handleTimerCompletion();
            } else {
                const newTimeLeft = Math.ceil(remaining / 1000);
                if (newTimeLeft !== timeLeft) {
                    setPomodoroState(s => ({ ...s, timeLeft: newTimeLeft }));
                }
                const timeString = formatTime(newTimeLeft);
                const modeLabel = mode === 'work' ? 'Concentración' : 'Descanso';
                document.title = `(${timeString}) ${modeLabel} - ${originalTitle}`;

                animationFrameId = requestAnimationFrame(tick);
            }
        };

        if (pomodoroState.isActive) {
            animationFrameId = requestAnimationFrame(tick);
        } else {
            document.title = originalTitle;
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            document.title = originalTitle;
        };
    }, [pomodoroState, handleTimerCompletion, setPomodoroState]);

    const handleSelectTrack = (track: Playlist, queue: Playlist[]) => {
      if(track.platform === 'youtube') { setActiveTrack({ ...track, queue }); if(activeSpotifyTrack) setActiveSpotifyTrack(null); }
      else { setActiveSpotifyTrack({ ...track, queue }); if(activeTrack) setActiveTrack(null); }
    };

    const capitalizedUserName = useMemo(() => {
        if (!currentUser.email) return 'Pollito';
        const userName = currentUser.email.split('@')[0];
        return userName.charAt(0).toUpperCase() + userName.slice(1);
    }, [currentUser.email]);

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <>
                        <header className="sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md p-4 z-30 border-b border-gray-200/50 dark:border-gray-700/50">
                            <Greeting name={capitalizedUserName} />
                        </header>
                        <div className="p-4">
                             <BibleVerse />
                             <MobilePomodoroWidget 
                                timeLeft={pomodoroState.timeLeft} 
                                isActive={pomodoroState.isActive} 
                                mode={pomodoroState.mode} 
                                onToggle={handlePomodoroToggle} 
                                onOpenModal={() => setIsPomodoroModalOpen(true)} 
                                onSwitchMode={handleSwitchMode}
                                onReset={() => { setPomodoroState(s => ({ ...s, timeLeft: s.durations[s.mode], isActive: false, endTime: null })); }}
                             />
                            <TodaysAgenda tasks={todayAgendaTasks} calendarEvents={calendarEvents} onToggleTask={(id) => handleToggleTodo(id, handleShowCompletionModal)} onToggleSubtask={(taskId, subtaskId) => handleToggleSubtask(taskId, subtaskId, handleShowCompletionModal)} quickNotes={quickNotes} onAddQuickNote={handleAddQuickNote} onDeleteQuickNote={handleDeleteQuickNote} onClearAllQuickNotes={handleClearAllQuickNotes} />
                        </div>
                    </>
                );
            case 'tasks':
                return (
                    <div className="flex flex-col h-full">
                        <TodoListModule 
                            isMobile={true} 
                            allTodos={allTodos} 
                            addTodo={handleAddTodo} 
                            toggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)}
                            toggleSubtask={(taskId, subtaskId) => handleToggleSubtask(taskId, subtaskId, handleShowCompletionModal)}
                            deleteTodo={handleDeleteTodo} 
                            updateTodo={handleUpdateTodo} 
                            onEditTodo={setTaskToEdit} 
                            selectedDate={selectedDate} 
                            setSelectedDate={setSelectedDate} 
                            datesWithTasks={datesWithTasks} 
                            datesWithAllTasksCompleted={datesWithAllTasksCompleted} 
                            onClearPastTodos={onClearPastTodos}
                            projects={projects}
                            onAddProject={handleAddProject}
                            onUpdateProject={handleUpdateProject}
                            onDeleteProject={handleDeleteProject}
                            onDeleteProjectAndTasks={handleDeleteProjectAndTasks}
                            onViewProjectChange={setViewingProjectId}
                            calendarEvents={calendarEvents}
                        />
                         <button onClick={() => setIsAddTaskModalOpen(true)} className="fixed bottom-24 right-4 bg-primary text-white rounded-full p-4 shadow-lg z-40 transform hover:scale-110 active:scale-95 transition-transform">
                            <PlusIcon />
                        </button>
                    </div>
                );
            case 'notes':
                return (
                    <div className="h-full pt-8">
                      <NotesSection isMobile={true} folders={folders} onAddFolder={handleAddFolder} onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />
                    </div>
                );
            case 'gallery':
                return (
                    <div className="flex flex-col h-full pt-8">
                        <ImageGallery isMobile={true} images={galleryImages} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} isSignedIn={!!googleApiToken} onAuthClick={handleAuthClick} isGapiReady={props.gapiReady} isLoading={galleryIsLoading} />
                    </div>
                );
            case 'games':
                return (
                    <div className="h-full pt-8">
                        <GamesHub galleryImages={galleryImages} isMobile={true} currentUser={capitalizedUserName} />
                    </div>
                );
            case 'more':
                return (
                     <>
                        <div className="p-4 pt-8">
                            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
                                <div className="divide-y divide-black/5 dark:divide-white/10">

                                    <div className="p-4 flex justify-between items-center">
                                        <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Tema</h3>
                                        <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
                                    </div>

                                    <button onClick={() => setIsCustomizationPanelOpen(true)} className="w-full flex justify-between items-center text-left p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                        <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Personalización</h3>
                                        <ChevronRightIcon />
                                    </button>

                                    <button onClick={() => setIsIntegrationsPanelOpen(true)} className="w-full flex justify-between items-center text-left p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                        <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Integraciones</h3>
                                        <ChevronRightIcon />
                                    </button>

                                    <button onClick={() => setIsQuickCaptureSetupOpen(true)} className="w-full flex justify-between items-center text-left p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                        <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Captura Rápida</h3>
                                        <ChevronRightIcon />
                                    </button>
                                    
                                    <button onClick={() => setIsNotificationsPanelOpen(true)} className="w-full flex justify-between items-center text-left p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5" disabled={isPermissionBlocked}>
                                        <h3 className={`font-bold text-lg transition-colors ${ isPermissionBlocked ? 'text-gray-400 dark:text-gray-500' : 'text-primary-dark dark:text-primary' }`}>
                                            Notificaciones
                                        </h3>
                                        {!isPermissionBlocked && <ChevronRightIcon />}
                                    </button>

                                </div>
                            </div>
                             <button onClick={onLogout} className="w-full mt-6 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 font-bold flex items-center justify-center gap-2 p-3 rounded-full shadow-md">
                                <LogoutIcon />
                                Cerrar Sesión
                            </button>
                        </div>
                    </>
                );
            default: return null;
        }
    };

    return (
        <div className="h-[100dvh] w-screen text-gray-800 dark:text-gray-100 font-sans flex flex-col">
            <ParticleLayer type={particleType} />
            
            <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[90000] flex items-center gap-2">
                {isSyncing && (
                    <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-2">
                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Sincronizando...
                    </div>
                )}
                {!isOnline && !isSyncing && (
                    <div className="bg-red-500 text-white text-xs font-bold text-center py-1 px-3 rounded-full shadow-lg">
                        Sin conexión
                    </div>
                )}
            </div>

            <main className="flex-grow overflow-y-auto pb-28">
                {renderContent()}
            </main>
            
            {activeTab !== 'tasks' && activeTab !== 'notes' && (
              <button onClick={() => setIsAiBrowserOpen(true)} className="mobile-ai-button fixed bottom-24 right-4 bg-primary text-white rounded-full p-4 shadow-lg z-40">
                  <ChickenIcon className="w-6 h-6" />
              </button>
            )}
            
             {(activeTrack || activeSpotifyTrack) && (
                <div className="fixed bottom-[76px] left-0 right-0 z-50">
                    <MobileMusicPlayer
                        track={activeTrack || activeSpotifyTrack}
                        queue={activeTrack?.queue || activeSpotifyTrack?.queue || []}
                        onSelectTrack={handleSelectTrack}
                        onClose={() => { setActiveTrack(null); setActiveSpotifyTrack(null); }}
                    />
                </div>
            )}

            <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <CustomizationPanel
              isOpen={isCustomizationPanelOpen}
              onClose={() => setIsCustomizationPanelOpen(false)}
              isMobile={true}
              colors={themeColors}
              onThemeColorChange={onThemeColorChange}
              onReset={onResetThemeColors}
              activeBackground={activeBackground}
              userBackgrounds={userBackgrounds}
              onSelectBackground={setActiveBackground}
              onAddBackground={handleAddBackground}
              onDeleteBackground={handleDeleteBackground}
              onToggleFavorite={handleToggleFavoriteBackground}
              backgroundsLoading={backgroundsAreLoading}
              particleType={particleType}
              setParticleType={setParticleType}
              ambientSound={ambientSound}
              setAmbientSound={setAmbientSound}
            />
            <IntegrationsPanel
                isOpen={isIntegrationsPanelOpen}
                onClose={() => setIsIntegrationsPanelOpen(false)}
                isMobile={true}
                isSignedIn={!!googleApiToken}
                onAuthClick={handleAuthClick}
                isGapiReady={props.gapiReady}
                gcalSettings={gcalSettings}
                onGCalSettingsChange={onGCalSettingsChange}
                userCalendars={userCalendars}
            />
            <NotificationsPanel
                isOpen={isNotificationsPanelOpen}
                onClose={() => setIsNotificationsPanelOpen(false)}
                isMobile={true}
                dailyEncouragementHour={dailyEncouragementLocalHour}
                onSetDailyEncouragement={onSetDailyEncouragement}
                dailySummaryHour={dailySummaryHour}
                onSetDailySummary={onSetDailySummary}
                onSendTestNotification={handleNotificationAction}
            />
            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onAddTask={(text) => {
                    const options = viewingProjectId
                      ? { projectId: viewingProjectId, isUndated: true }
                      : undefined;
                    handleAddTodo(text, options);
                    setIsAddTaskModalOpen(false);
                }}
            />
            <QuickCaptureSetupModal
                isOpen={isQuickCaptureSetupOpen}
                onClose={() => setIsQuickCaptureSetupOpen(false)}
                userId={currentUser.id}
            />
            <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} quote={completionQuote}/>
            <MobileTaskEditor 
                isOpen={!!taskToEdit} 
                onClose={() => setTaskToEdit(null)} 
                onSave={handleUpdateTodo}
                onDelete={handleDeleteTodo} 
                todo={taskToEdit}
                projects={projects}
            />
            
            {isAiBrowserOpen && (
                <div className="fixed inset-0 bg-secondary-lighter/90 dark:bg-gray-900 z-[100] animate-deploy">
                    <Browser session={browserSession} setSession={setBrowserSession} onClose={() => setIsAiBrowserOpen(false)} currentUser={currentUser} />
                </div>
            )}

            <MobilePomodoroPanel
                isOpen={isPomodoroModalOpen}
                onClose={() => setIsPomodoroModalOpen(false)}
                durations={pomodoroState.durations}
                onSaveSettings={(d) => { setPomodoroState(s => ({ ...s, durations: d, timeLeft: d[s.mode], isActive: false, endTime: null })); }}
                showBackgroundTimer={pomodoroState.showBackgroundTimer}
                onToggleBackgroundTimer={() => setPomodoroState(s => ({...s, showBackgroundTimer: !s.showBackgroundTimer}))}
                backgroundTimerOpacity={pomodoroState.backgroundTimerOpacity}
                onSetBackgroundTimerOpacity={op => setPomodoroState(s => ({...s, backgroundTimerOpacity: op}))}
            />

            <audio ref={pomodoroAudioRef} src={pomodoroAudioSrc} />
        </div>
    );
};


const DEFAULT_COLORS: ThemeColors = {
  primary: '#F472B6', // pink-400
  secondary: '#FBBF24', // amber-400
};

// --- Color Manipulation Helpers ---
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const componentToHex = (c: number) => {
  const hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
};

const rgbToHex = (r: number, g: number, b: number) => {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
};

const adjustBrightness = (hex: string, percent: number) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const amount = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, rgb.r + amount));
  const g = Math.max(0, Math.min(255, rgb.g + amount));
  const b = Math.max(0, Math.min(255, rgb.b + amount));
  return rgbToHex(r, g, b);
};
// --- End Color Helpers ---

const App: React.FC = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [uiSettings, setUiSettings] = useState<{
      themeColors: ThemeColors;
      activeBackgroundId: string | null;
      particleType: ParticleType;
      ambientSound: { type: AmbientSoundType; volume: number };
  } | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  const settingsSaveTimeout = useRef<number | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- ALL SHARED STATE MOVED HERE ---
  // Data state
  const [allTodos, setAllTodos] = useState<{ [key: string]: Todo[] }>({});
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  
  // UI state
  const [browserSession, setBrowserSession] = useState<BrowserSession>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deleteOptions, setDeleteOptions] = useState<{ isOpen: boolean; todo: Todo | null; }>({ isOpen: false, todo: null });
  const [updateOptions, setUpdateOptions] = useState<{ isOpen: boolean; original: Todo | null; updated: Todo | null; }>({ isOpen: false, original: null, updated: null });
  const [isClearPastConfirmOpen, setIsClearPastConfirmOpen] = useState(false);
  const [quickCaptureMessage, setQuickCaptureMessage] = useState<string | null>(null);

  const [dailyEncouragementLocalHour, setDailyEncouragementLocalHour] = useState<number | null>(null);
  const [dailySummaryHour, setDailySummaryHour] = useState<number | null>(null);
  const [pomodoroState, setPomodoroState] = useState({
      timeLeft: 25 * 60,
      isActive: false,
      mode: 'work' as 'work' | 'break',
      durations: { work: 25 * 60, break: 5 * 60 },
      showBackgroundTimer: false,
      backgroundTimerOpacity: 50,
      endTime: null as (number | null),
  });
  const [activeTrack, setActiveTrack] = useState<Playlist | null>(null);
  const [activeSpotifyTrack, setActiveSpotifyTrack] = useState<Playlist | null>(null);

  // Google API State
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [googleApiToken, setGoogleApiToken] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [galleryIsLoading, setGalleryIsLoading] = useState(false);
  const appFolderId = useRef<string | null>(null);
  const tokenClientRef = useRef<any>(null);
  // Google Calendar State
  const [gcalSettings, setGcalSettings] = useState<GCalSettings>({ enabled: false, calendarId: 'primary' });
  const [userCalendars, setUserCalendars] = useState<GoogleCalendar[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  
  // Supabase Backgrounds State
  const [userBackgrounds, setUserBackgrounds] = useState<Background[]>([]);
  const [backgroundsAreLoading, setBackgroundsAreLoading] = useState(false);


  // OneSignal Notification State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);
  
  // PWA Install Prompt State
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  
  const foldersWithNotes = useMemo(() => {
    return folders.map(folder => ({
        ...folder,
        notes: notes.filter(note => note.folder_id === folder.id).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }));
  }, [folders, notes]);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
        return; // Don't show the install banner if the app is already installed.
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      const isDismissed = localStorage.getItem('pwaInstallDismissed');
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOSDevice) {
      setIsIos(true);
      const isDismissed = localStorage.getItem('pwaInstallDismissed');
      if (!isDismissed) {
        // Delay showing banner to be less intrusive
        setTimeout(() => setShowInstallBanner(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      installPromptEvent.userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA installation');
        } else {
          console.log('User dismissed the PWA installation');
        }
        setShowInstallBanner(false);
        setInstallPromptEvent(null);
      });
    }
  };

  const handleDismissPwaBanner = () => {
    setShowInstallBanner(false);
    // Remember dismissal for a while to not annoy the user
    localStorage.setItem('pwaInstallDismissed', 'true');
  };
  
  const getUserKey = useCallback((key: string) => `${user?.email}_${key}`, [user]);

  // --- Theme Management ---
  const toggleTheme = useCallback(() => {
    setTheme(currentTheme => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        return newTheme;
    });
  }, []);

  const applyThemeColors = useCallback((colors: ThemeColors) => {
    const root = document.documentElement;
    // Light theme colors
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-primary-light', adjustBrightness(colors.primary, 20));
    root.style.setProperty('--color-primary-dark', adjustBrightness(colors.primary, -10));
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-secondary-light', adjustBrightness(colors.secondary, 20));
    root.style.setProperty('--color-secondary-dark', adjustBrightness(colors.secondary, -10));
    root.style.setProperty('--color-secondary-lighter', adjustBrightness(colors.secondary, 40));

    // Dark theme colors (inverted logic for light/dark properties)
    const darkRoot = document.querySelector('html.dark');
    if (darkRoot) {
        (darkRoot as HTMLElement).style.setProperty('--color-primary', colors.primary);
        (darkRoot as HTMLElement).style.setProperty('--color-primary-light', adjustBrightness(colors.primary, -20)); // darker
        (darkRoot as HTMLElement).style.setProperty('--color-primary-dark', adjustBrightness(colors.primary, 10));  // lighter
        (darkRoot as HTMLElement).style.setProperty('--color-secondary', adjustBrightness(colors.secondary, -10));
        (darkRoot as HTMLElement).style.setProperty('--color-secondary-light', adjustBrightness(colors.secondary, -30)); // darker
        (darkRoot as HTMLElement).style.setProperty('--color-secondary-dark', adjustBrightness(colors.secondary, 10));   // lighter
    }
  }, []);

  // Initialize theme on load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme ? savedTheme : (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme as 'light' | 'dark');
    if (initialTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    if (uiSettings) {
        applyThemeColors(uiSettings.themeColors);
    } else {
        applyThemeColors(DEFAULT_COLORS);
    }
  }, [uiSettings, applyThemeColors]);

  // --- Auth & Data Loading ---
  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if(session) setUser(session.user);
        setAuthLoading(false);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        if(!session) { // If logged out
            setDataLoaded(false);
            setUiSettings(null);
            // Reset all state
            setAllTodos({}); setFolders([]); setPlaylists([]); setQuickNotes([]); setNotes([]);
            setProjects([]);
            setGalleryImages([]); setUserBackgrounds([]);
            setGoogleApiToken(null);
        }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);
  
  const handleLogout = useCallback(async () => {
    // Google API logout
    if (googleApiToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(googleApiToken, () => {
        console.log('Google API token revoked.');
      });
    }
    setGoogleApiToken(null);
    if (user) {
      localStorage.removeItem(getUserKey('google_api_token'));
    }
    // Also clear the token from the gapi client instance.
    if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(null);
    }

    // Supabase logout
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
  }, [googleApiToken, user, getUserKey]);
  
  const loadData = useCallback(async (networkMode: 'fetch' | 'cache-only' = 'fetch') => {
    if (!user) return;
    
    // Load from cache first for instant UI
    const [cachedTodos, cachedFolders, cachedNotes, cachedPlaylists, cachedQuickNotes, cachedProjects] = await Promise.all([
        getAll<Todo>('todos'),
        getAll<Folder>('folders'),
        getAll<Note>('notes'),
        getAll<Playlist>('playlists'),
        getAll<QuickNote>('quick_notes'),
        getAll<Project>('projects'),
    ]);

    const todosByDate: { [key: string]: Todo[] } = {};
    const undatedTodos: Todo[] = [];
    cachedTodos.forEach(todo => {
        if (todo.due_date) {
            const dateKey = todo.due_date;
            if (!todosByDate[dateKey]) todosByDate[dateKey] = [];
            todosByDate[dateKey].push(todo);
        } else {
            undatedTodos.push(todo);
        }
    });
    if (undatedTodos.length > 0) {
        todosByDate['undated'] = undatedTodos;
    }
    setAllTodos(todosByDate);
    setFolders(cachedFolders);
    setNotes(cachedNotes);
    setPlaylists(cachedPlaylists);
    setQuickNotes(cachedQuickNotes);
    setProjects(cachedProjects);
    
    setDataLoaded(true);

    if (networkMode === 'fetch' && navigator.onLine) {
      console.log("Fetching fresh data from server...");
      setIsSyncing(true);
      const [
        { data: todosData },
        { data: foldersData },
        { data: notesData },
        { data: playlistsData },
        { data: quickNotesData },
        { data: projectsData },
        { data: profileData }
      ] = await Promise.all([
        supabase.from('todos').select('*, subtasks(*)').order('created_at'),
        supabase.from('folders').select('*').order('created_at'),
        supabase.from('notes').select('*').order('created_at'),
        supabase.from('playlists').select('*').order('created_at'),
        supabase.from('quick_notes').select('*').order('created_at'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('profiles').select('daily_encouragement_hour_local, daily_summary_hour_local, pomodoro_settings, gcal_settings, ui_settings').eq('id', user.id).single(),
      ]);
      
      if (todosData) {
        const fiveMonthsAgo = new Date();
        fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);
        
        const oldTaskIds: number[] = [];
        const recentTodosData = todosData.filter(todo => {
          if (todo.due_date && new Date(todo.due_date) < fiveMonthsAgo) {
            oldTaskIds.push(todo.id);
            return false;
          }
          return true;
        });

        if (oldTaskIds.length > 0) {
            supabase.from('todos').delete().in('id', oldTaskIds).then(({ error }) => {
                if (error) {
                    console.error("Failed to auto-delete old tasks from server:", error);
                } else {
                    console.log(`Auto-deleted ${oldTaskIds.length} tasks older than 5 months.`);
                }
            });
        }
        
        const networkTodosByDate: { [key: string]: Todo[] } = {};
        const networkUndatedTodos: Todo[] = [];
        recentTodosData.forEach(todo => {
            if (todo.due_date) {
                const dateKey = todo.due_date;
                if (!networkTodosByDate[dateKey]) networkTodosByDate[dateKey] = [];
                networkTodosByDate[dateKey].push(todo);
            } else {
                networkUndatedTodos.push(todo);
            }
        });
        if (networkUndatedTodos.length > 0) {
            networkTodosByDate['undated'] = networkUndatedTodos;
        }
        setAllTodos(networkTodosByDate);
        await clearAndPutAll('todos', recentTodosData);
      }
      if(foldersData) { setFolders(foldersData); await clearAndPutAll('folders', foldersData); }
      if(notesData) { setNotes(notesData); await clearAndPutAll('notes', notesData); }
      if(playlistsData) { setPlaylists(playlistsData); await clearAndPutAll('playlists', playlistsData); }
      if(quickNotesData) { setQuickNotes(quickNotesData); await clearAndPutAll('quick_notes', quickNotesData); }
      if(projectsData) { setProjects(projectsData); await clearAndPutAll('projects', projectsData); }

      if(profileData) {
        setDailyEncouragementLocalHour(profileData.daily_encouragement_hour_local);
        setDailySummaryHour(profileData.daily_summary_hour_local);
        if (profileData.pomodoro_settings && typeof profileData.pomodoro_settings === 'object') {
            const savedSettings = profileData.pomodoro_settings as Partial<typeof pomodoroState>;
            setPomodoroState(s => ({ ...s, durations: savedSettings.durations || s.durations, timeLeft: (savedSettings.durations || s.durations)[s.mode], isActive: false, endTime: null }));
        }
        if(profileData.gcal_settings) {
            setGcalSettings(profileData.gcal_settings as GCalSettings);
        }
        if(profileData.ui_settings) {
            const settings = profileData.ui_settings as any;
            // Ensure settings object has all required keys to prevent crashes
            setUiSettings({
                themeColors: settings.themeColors || DEFAULT_COLORS,
                activeBackgroundId: settings.activeBackgroundId || null,
                particleType: settings.particleType || 'none',
                ambientSound: settings.ambientSound || { type: 'none', volume: 0.5 },
            });
        } else {
             setUiSettings({
                themeColors: DEFAULT_COLORS,
                activeBackgroundId: null,
                particleType: 'none',
                ambientSound: { type: 'none', volume: 0.5 }
             });
        }
      }
      setIsSyncing(false);
    }
    
    try {
        const [storedBrowser, storedActiveTrack, storedSpotifyTrack] = await Promise.all([
            get<{key: string, value: BrowserSession}>('settings', getUserKey('browserSession')),
            get<{key: string, value: Playlist}>('settings', getUserKey('activeTrack')),
            get<{key: string, value: Playlist}>('settings', getUserKey('activeSpotifyTrack')),
        ]);
        if (storedBrowser) setBrowserSession(storedBrowser.value);
        if(storedActiveTrack) setActiveTrack(storedActiveTrack.value);
        if(storedSpotifyTrack) setActiveSpotifyTrack(storedSpotifyTrack.value);
    } catch(e) { console.error("Error parsing settings from IndexedDB:", e); }
  }, [user, getUserKey]);

  // --- Offline Functionality & Initial Load ---
  useEffect(() => {
    if (!user) return;

    const handleOnline = async () => {
      setIsOnline(true);
      console.log("Connection restored. Processing sync queue...");
      setIsSyncing(true);
      const { success, errors } = await processSyncQueue();
      setIsSyncing(false);
      if (success) {
        console.log("Sync successful. Reloading data from server.");
        loadData('fetch');
      } else {
        console.error("Sync failed with errors:", errors);
        alert("Hubo un problema al sincronizar tus cambios.");
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("Connection lost. Working offline.");
    };

    window.addEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);

    const startup = async () => {
      await initDB(user.email!);
      console.log("DB Initialized.");

      if (navigator.onLine) {
        setIsOnline(true);
        console.log("App starting online. Syncing pending changes...");
        setIsSyncing(true);
        const { success } = await processSyncQueue();
        setIsSyncing(false);
        if (success) {
          console.log("Initial sync successful.");
          await loadData('fetch');
        } else {
          console.error("Initial sync failed. Loading from cache only. Will retry on next online event.");
          await loadData('cache-only');
        }
      } else {
        setIsOnline(false);
        console.log("App starting offline.");
        await loadData('cache-only');
      }
    };

    if (!dataLoaded) {
      startup();
    }

    return () => {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    };
  }, [user, dataLoaded, loadData]);

  // --- Settings Persistence ---
  useEffect(() => {
    if (user && dataLoaded) {
      if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current);
      settingsSaveTimeout.current = window.setTimeout(async () => {
        const { durations, showBackgroundTimer, backgroundTimerOpacity } = pomodoroState;
        const settingsToSave = { durations, showBackgroundTimer, backgroundTimerOpacity };
        if(isOnline) await supabase.from('profiles').update({ pomodoro_settings: settingsToSave }).eq('id', user.id);
      }, 1500);
    }
    return () => { if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current); };
  }, [pomodoroState, user, dataLoaded, isOnline]);
  
  useEffect(() => {
    if (user && dataLoaded && uiSettings) {
      if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current);
      settingsSaveTimeout.current = window.setTimeout(async () => {
        if(isOnline) await supabase.from('profiles').update({ ui_settings: uiSettings }).eq('id', user.id);
      }, 1000);
    }
    return () => { if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current); };
  }, [uiSettings, user, dataLoaded, isOnline]);


  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('browserSession'), value: browserSession }); }, [browserSession, getUserKey, user, dataLoaded]);
  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('activeTrack'), value: activeTrack }); }, [activeTrack, getUserKey, user, dataLoaded]);
  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('activeSpotifyTrack'), value: activeSpotifyTrack }); }, [activeSpotifyTrack, getUserKey, user, dataLoaded]);

  const handleSetDailyEncouragement = async (localHour: number | null) => {
    if (!user) return;
    setDailyEncouragementLocalHour(localHour);
    await syncableUpdate('profiles', { id: user.id, daily_encouragement_hour_local: localHour });
  };
  
  const handleSetDailySummary = async (localHour: number | null) => {
    if (!user) return;
    setDailySummaryHour(localHour);
    await syncableUpdate('profiles', { id: user.id, daily_summary_hour_local: localHour });
  };

  // --- Data Handlers (Now with Offline Support) ---
  const handleAddTodo = useCallback(async (text: string, options?: { projectId?: number | null; isUndated?: boolean }) => {
    if (!user) return;

    const projectId = options?.projectId || null;
    const isUndated = options?.isUndated || false;

    const dateKey = isUndated ? 'undated' : formatDateKey(selectedDate);
    const dueDate = isUndated ? null : formatDateKey(selectedDate);

    const tempId = -Date.now();
    const newTodo: Todo = { 
        id: tempId, 
        text, 
        completed: false, 
        priority: 'medium', 
        due_date: dueDate, 
        user_id: user.id, 
        created_at: new Date().toISOString(), 
        subtasks: [],
        project_id: projectId,
    };
    
    // Optimistic UI update
    setAllTodos(current => {
        const newDateTodos = [...(current[dateKey] || []), newTodo];
        return { ...current, [dateKey]: newDateTodos };
    });
    
    // Sync
    const savedTodo = await syncableCreate('todos', newTodo) as Todo;

    // Replace temporary item with server-confirmed item
    if (savedTodo.id !== tempId) {
        setAllTodos(current => {
            const dateTodos = current[dateKey] || [];
            return {
                ...current,
                [dateKey]: dateTodos.map(t => t.id === tempId ? savedTodo : t)
            };
        });
    }
  }, [user, selectedDate]);
  
  // --- Quick Capture from URL (PWA only) ---
  useEffect(() => {
    if (!user || !dataLoaded) return;

    const handleUrlTask = async () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const urlParams = new URLSearchParams(window.location.search);
        const taskText = urlParams.get('task');
        
        // Prevent duplicate task creation on app reload
        const requestKey = urlParams.toString();
        if (sessionStorage.getItem(requestKey)) {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            return;
        }

        if (taskText && user && isStandalone) {
            sessionStorage.setItem(requestKey, 'true'); // Mark as processed
            
            const decodedText = decodeURIComponent(taskText.replace(/\+/g, ' '));
            
            const dateKey = formatDateKey(new Date());
            const tempId = -Date.now();
            const newTodo: Todo = { 
                id: tempId, 
                text: decodedText, 
                completed: false, 
                priority: 'medium', 
                due_date: dateKey, 
                user_id: user.id, 
                created_at: new Date().toISOString(), 
                subtasks: [] 
            };

            setAllTodos(current => ({ ...current, [dateKey]: [...(current[dateKey] || []), newTodo] }));
            const savedTodo = await syncableCreate('todos', newTodo) as Todo;

            if (savedTodo.id !== tempId) {
                setAllTodos(current => {
                    const dateTodos = current[dateKey] || [];
                    const newDateTodos = dateTodos.map(t => t.id === tempId ? savedTodo : t);
                    return { ...current, [dateKey]: newDateTodos };
                });
            }
            
            setQuickCaptureMessage('¡Tarea capturada con éxito!');
            setSelectedDate(new Date());

            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    };
    
    handleUrlTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataLoaded]);

  const getUpdatedTodosState = (current: { [key: string]: Todo[] }, todoToUpdate: Todo): { [key: string]: Todo[] } => {
    const newAllTodos = JSON.parse(JSON.stringify(current));
    
    // Find and remove the original task
    let foundAndRemoved = false;
    for (const key in newAllTodos) {
        const index = newAllTodos[key].findIndex(t => t.id === todoToUpdate.id);
        if (index !== -1) {
            newAllTodos[key].splice(index, 1);
            // Don't delete the key if it's 'undated', even if it becomes empty
            if (newAllTodos[key].length === 0 && key !== 'undated') {
                delete newAllTodos[key];
            }
            foundAndRemoved = true;
            break;
        }
    }

    // Add the updated task to the correct new location
    if (todoToUpdate.due_date) {
        const newDateKey = todoToUpdate.due_date;
        if (!newAllTodos[newDateKey]) {
            newAllTodos[newDateKey] = [];
        }
        newAllTodos[newDateKey].push(todoToUpdate);
    } else {
        if (!newAllTodos.undated) {
            newAllTodos.undated = [];
        }
        newAllTodos.undated.push(todoToUpdate);
    }
    
    return newAllTodos;
}

  const findTodoById = (id: number): Todo | null => {
    for (const key in allTodos) {
      const found = allTodos[key].find(t => t.id === id);
      if (found) return found;
    }
    return null;
  };
  
  const handleUpdateTodo = async (updatedTodo: Todo) => {
    const originalTodo = findTodoById(updatedTodo.id);
    const recurrenceChanged = originalTodo?.recurrence?.id && JSON.stringify(originalTodo.recurrence) !== JSON.stringify(updatedTodo.recurrence);
    
    if (recurrenceChanged) {
        setUpdateOptions({ isOpen: true, original: originalTodo, updated: updatedTodo });
    } else {
        // Optimistic update
        setAllTodos(current => getUpdatedTodosState(current, updatedTodo));
        // Sync and get server-confirmed data
        const savedTodo = await syncableUpdate('todos', updatedTodo);
        // Ensure local state matches server state
        setAllTodos(current => getUpdatedTodosState(current, savedTodo));
    }
  };
  
  const handleUpdateThisOccurrenceOnly = async (updatedTodo: Todo) => {
    const newTodo = { ...updatedTodo, recurrence: { frequency: 'none' as 'none' }};
    setAllTodos(current => getUpdatedTodosState(current, newTodo));
    await syncableUpdate('todos', newTodo);
    setUpdateOptions({ isOpen: false, original: null, updated: null });
  };
  
  const handleUpdateFutureOccurrences = async (updatedTodo: Todo) => {
    const recurrenceId = updatedTodo.recurrence?.id;
    if (!recurrenceId || !updatedTodo.due_date) return;
    
    const deleteFromDate = updatedTodo.due_date;
    const idsToDelete: number[] = [];
    let newAllTodos = { ...allTodos };

    for (const dateKey in newAllTodos) {
        if(dateKey >= deleteFromDate) {
            newAllTodos[dateKey] = newAllTodos[dateKey].filter(t => {
                if (t.recurrence?.id === recurrenceId && t.id !== updatedTodo.id) {
                    idsToDelete.push(t.id);
                    return false;
                }
                return true;
            });
            if (newAllTodos[dateKey].length === 0) {
                delete newAllTodos[dateKey];
            }
        }
    }

    newAllTodos = getUpdatedTodosState(newAllTodos, updatedTodo);
    
    // Generate new recurring tasks from the updated one
    const finalState = await generateRecurringTasks(updatedTodo, newAllTodos);
    setAllTodos(finalState);

    // Sync changes
    for (const id of idsToDelete) {
        await syncableDelete('todos', id);
    }
    await syncableUpdate('todos', updatedTodo);
    setUpdateOptions({ isOpen: false, original: null, updated: null });
  };


  const handleToggleTodo = async (id: number, onAllCompleted: (quote: string) => void) => {
    let todoToToggle: Todo | undefined;
    let originalDateKey: string | null = null;
    for (const key in allTodos) { const foundTodo = allTodos[key].find(t => t.id === id); if (foundTodo) { originalDateKey = key; todoToToggle = foundTodo; break; } }
    if (!todoToToggle || !originalDateKey) return;
    
    const newCompletedState = !todoToToggle.completed;
    const updatedSubtasks = (todoToToggle.subtasks || []).map(st => ({ ...st, completed: newCompletedState }));
    const updatedTodo = { ...todoToToggle, completed: newCompletedState, subtasks: updatedSubtasks };
    
    let nextState = getUpdatedTodosState(allTodos, updatedTodo);
    
    if (newCompletedState && todoToToggle.recurrence && todoToToggle.recurrence.frequency !== 'none') {
        nextState = await generateRecurringTasks(updatedTodo, nextState);
    }
    
    setAllTodos(nextState);
    await syncableUpdate('todos', updatedTodo);
    
    const dateKeyForCompletionCheck = updatedTodo.due_date || originalDateKey;
    if (newCompletedState && dateKeyForCompletionCheck !== 'undated' && nextState[dateKeyForCompletionCheck]?.every(t => t.completed)) {
        triggerConfetti();
        onAllCompleted(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }
  };
  
  const handleToggleSubtask = async (taskId: number, subtaskId: number, onAllCompleted: (quote: string) => void) => {
      let todoToUpdate: Todo | undefined;
      let originalDateKey: string | null = null;
      for (const key in allTodos) { const foundTodo = allTodos[key].find(t => t.id === taskId); if (foundTodo) { originalDateKey = key; todoToUpdate = foundTodo; break; } }
      if (!todoToUpdate || !originalDateKey) return;
      
      const newSubtasks = (todoToUpdate.subtasks || []).map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
      const allSubtasksCompleted = newSubtasks.length > 0 && newSubtasks.every(st => st.completed);
      const parentCompleted = allSubtasksCompleted;
      const updatedTodo = { ...todoToUpdate, subtasks: newSubtasks, completed: parentCompleted };
      
      const nextState = getUpdatedTodosState(allTodos, updatedTodo);
      setAllTodos(nextState);
      await syncableUpdate('todos', updatedTodo);

      const dateKeyForCompletionCheck = updatedTodo.due_date || originalDateKey;
      if (parentCompleted && dateKeyForCompletionCheck !== 'undated' && nextState[dateKeyForCompletionCheck]?.every(t => t.completed)) {
          triggerConfetti();
          onAllCompleted(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
      }
  };

  const handleDeleteTodo = async (id: number) => {
    let todoToDelete: Todo | null = null;
    for(const key in allTodos) { 
        const found = allTodos[key].find(t => t.id === id);
        if(found) { todoToDelete = found; break; }
    }
    
    if (!todoToDelete) return;

    if (todoToDelete.recurrence && todoToDelete.recurrence.frequency !== 'none') {
        setDeleteOptions({ isOpen: true, todo: todoToDelete });
    } else {
        handleDeleteThisOccurrence(id);
    }
  };

  const handleDeleteThisOccurrence = async (id: number) => {
    let keyToDeleteFrom: string | null = null;
    for(const key in allTodos) { if(allTodos[key].some(t => t.id === id)) { keyToDeleteFrom = key; break; } }
    
    if (keyToDeleteFrom) {
        setAllTodos(current => {
            const newKeyTodos = current[keyToDeleteFrom!].filter(t => t.id !== id);
            if(newKeyTodos.length > 0 || keyToDeleteFrom === 'undated') {
                return { ...current, [keyToDeleteFrom!]: newKeyTodos };
            } else {
                const { [keyToDeleteFrom!]: _, ...rest } = current;
                return rest;
            }
        });
    }
    await syncableDelete('todos', id);
    setDeleteOptions({ isOpen: false, todo: null });
  };
  
  const handleDeleteFutureOccurrences = async (todoToDelete: Todo) => {
    const { id: recurrenceId } = todoToDelete.recurrence!;
    const deleteFromDate = todoToDelete.due_date!;

    const idsToDelete: number[] = [];
    const newAllTodos = { ...allTodos };

    for (const dateKey in newAllTodos) {
        if(dateKey >= deleteFromDate) {
            const dateTodos = newAllTodos[dateKey];
            const remainingTodos = dateTodos.filter(t => {
                const shouldDelete = t.recurrence?.id === recurrenceId;
                if(shouldDelete) idsToDelete.push(t.id);
                return !shouldDelete;
            });
            
            if (remainingTodos.length > 0) {
                newAllTodos[dateKey] = remainingTodos;
            } else {
                delete newAllTodos[dateKey];
            }
        }
    }
    
    setAllTodos(newAllTodos);
    for (const id of idsToDelete) {
        await syncableDelete('todos', id);
    }
    setDeleteOptions({ isOpen: false, todo: null });
  };
  
  const handleClearPastTodos = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Consider start of today
    const idsToDelete: number[] = [];
    
    const newAllTodos = { ...allTodos };

    for (const dateKey in newAllTodos) {
        if (dateKey === 'undated') continue;
        // Use a UTC-based date to avoid timezone shifts from the date string.
        const date = new Date(dateKey + 'T00:00:00Z');
        if (date < today) {
            newAllTodos[dateKey].forEach(todo => idsToDelete.push(todo.id));
            delete newAllTodos[dateKey];
        }
    }
    
    if (idsToDelete.length > 0) {
        setAllTodos(newAllTodos);
        await syncableDeleteMultiple('todos', idsToDelete);
    }
    setIsClearPastConfirmOpen(false);
  };


  const handleAddFolder = useCallback(async (name: string): Promise<Folder | null> => {
      if (!user) return null;
      const tempId = -Date.now();
      const newFolder: Folder = { id: tempId, name, user_id: user.id, created_at: new Date().toISOString(), notes: [] };
      
      setFolders(f => [...f, newFolder]);
      
      const savedFolder = await syncableCreate('folders', newFolder) as Folder;
      
      if (savedFolder.id !== tempId) {
          setFolders(f => f.map(folder => folder.id === tempId ? savedFolder : folder));
      }
      return savedFolder;
  }, [user]);

  const handleUpdateFolder = async (folderId: number, name: string) => {
      const folderToUpdate = folders.find(f => f.id === folderId);
      if(!folderToUpdate) return;
      const updatedFolder = { ...folderToUpdate, name };
      setFolders(f => f.map(folder => folder.id === folderId ? updatedFolder : folder));
      
      const savedFolder = await syncableUpdate('folders', updatedFolder);
      setFolders(f => f.map(folder => folder.id === folderId ? savedFolder : folder));
  };

  const handleDeleteFolder = async (folderId: number) => {
      setFolders(f => f.filter(folder => folder.id !== folderId));
      await syncableDelete('folders', folderId);
  };
  
  const handleAddNote = useCallback(async (folderId: number): Promise<Note | null> => {
    if (!user) return null;
    const tempId = -Date.now();
    const now = new Date().toISOString();
    const newNote: Note = { id: tempId, folder_id: folderId, user_id: user.id, title: 'Nueva Nota', content: '', created_at: now, updated_at: now };
    
    setNotes(n => [...n, newNote]);
    
    const savedNote = await syncableCreate('notes', newNote) as Note;

    if (savedNote.id !== tempId) {
        setNotes(n => n.map(item => item.id === tempId ? savedNote : item));
    }
    return savedNote;
  }, [user]);


  const handleUpdateNote = async (note: Note) => {
    const updatedNote = { ...note, updated_at: new Date().toISOString() };
    setNotes(n => n.map(item => item.id === note.id ? updatedNote : item));

    const savedNote = await syncableUpdate('notes', updatedNote);
    setNotes(n => n.map(item => item.id === note.id ? savedNote : item));
  };

  const handleDeleteNote = async (noteId: number, folderId: number) => {
    setNotes(n => n.filter(item => item.id !== noteId));
    await syncableDelete('notes', noteId);
  };
  
  const handleAddProject = useCallback(async (name: string, emoji: string | null): Promise<Project | null> => {
      if (!user) return null;
      const tempId = -Date.now();
      const newProject: Project = { id: tempId, name, user_id: user.id, created_at: new Date().toISOString(), emoji };
      
      setProjects(p => [...p, newProject]);
      
      const savedProject = await syncableCreate('projects', newProject) as Project;
      
      if (savedProject.id !== tempId) {
          setProjects(p => p.map(project => project.id === tempId ? savedProject : project));
      }
      return savedProject;
  }, [user]);

  const handleUpdateProject = async (projectId: number, name: string, emoji: string | null) => {
      const projectToUpdate = projects.find(p => p.id === projectId);
      if(!projectToUpdate) return;
      const updatedProject = { ...projectToUpdate, name, emoji };
      setProjects(p => p.map(project => project.id === projectId ? updatedProject : project));
      
      const savedProject = await syncableUpdate('projects', updatedProject);
      setProjects(p => p.map(project => project.id === projectId ? savedProject : project));
  };

  const handleDeleteProject = async (projectId: number) => {
      setProjects(p => p.filter(project => project.id !== projectId));
      // Also, update todos that were associated with this project
      const newAllTodos: { [key: string]: Todo[] } = JSON.parse(JSON.stringify(allTodos));
      let changed = false;
      Object.keys(newAllTodos).forEach(dateKey => {
          newAllTodos[dateKey].forEach(todo => {
              if (todo.project_id === projectId) {
                  changed = true;
                  todo.project_id = null; 
                  syncableUpdate('todos', todo);
              }
          });
      });
      if (changed) {
          setAllTodos(newAllTodos);
      }
      await syncableDelete('projects', projectId);
  };
  
  const handleDeleteProjectAndTasks = async (projectId: number) => {
    const tasksToDeleteIds: number[] = [];
    const newAllTodos = { ...allTodos };
    
    Object.keys(newAllTodos).forEach(dateKey => {
        newAllTodos[dateKey] = newAllTodos[dateKey].filter(todo => {
            if (todo.project_id === projectId) {
                tasksToDeleteIds.push(todo.id);
                return false;
            }
            return true;
        });
        if (newAllTodos[dateKey].length === 0 && dateKey !== 'undated') {
            delete newAllTodos[dateKey];
        }
    });

    setAllTodos(newAllTodos);
    setProjects(p => p.filter(project => project.id !== projectId));

    if (tasksToDeleteIds.length > 0) {
        await syncableDeleteMultiple('todos', tasksToDeleteIds);
    }
    await syncableDelete('projects', projectId);
  };

  const handleAddPlaylist = useCallback(async (playlistData: Omit<Playlist, 'id'|'user_id'|'created_at'>) => {
    if (!user) return;
    const tempId = -Date.now();
    const newPlaylist = { ...playlistData, id: tempId, user_id: user.id, created_at: new Date().toISOString() };
    
    setPlaylists(p => [...p, newPlaylist]);
    
    const savedPlaylist = await syncableCreate('playlists', newPlaylist) as Playlist;
    
    if (savedPlaylist.id !== tempId) {
        setPlaylists(p => p.map(item => item.id === tempId ? savedPlaylist : item));
    }
  }, [user]);

  const handleUpdatePlaylist = async (playlist: Playlist) => {
      setPlaylists(p => p.map(item => item.id === playlist.id ? playlist : item));
      const savedPlaylist = await syncableUpdate('playlists', playlist);
      setPlaylists(p => p.map(item => item.id === playlist.id ? savedPlaylist : item));
  };
  const handleDeletePlaylist = async (playlistId: number) => {
      setPlaylists(p => p.filter(item => item.id !== playlistId));
      await syncableDelete('playlists', playlistId);
  };
  
  const handleAddQuickNote = useCallback(async (text: string) => {
      if(!user) return;
      const tempId = -Date.now();
      const newNote: QuickNote = { id: tempId, text, user_id: user.id, created_at: new Date().toISOString() };
      
      setQuickNotes(qn => [...qn, newNote]);

      const savedNote = await syncableCreate('quick_notes', newNote) as QuickNote;

      if (savedNote.id !== tempId) {
          setQuickNotes(qn => qn.map(note => note.id === tempId ? savedNote : note));
      }
  }, [user]);

  const handleDeleteQuickNote = async (id: number) => {
      setQuickNotes(qn => qn.filter(note => note.id !== id));
      await syncableDelete('quick_notes', id);
  };
  const handleClearAllQuickNotes = async () => {
    if(!user) return;
    setQuickNotes([]);
    await syncableDeleteAll('quick_notes', user.id);
  };

  // --- Blob URL Cleanup ---
  useEffect(() => {
    // This effect runs when the component unmounts or when the dependencies change.
    // The cleanup function from the *previous* render is called, which has the old URLs.
    const urlsToClean = [...galleryImages.map(i => i.url)];
    return () => {
        urlsToClean.forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
    };
  }, [galleryImages]);

  // --- Google API Integration ---
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  
  useEffect(() => {
    const initializeGoogleClients = () => {
        window.gapi.load('client', async () => {
            await window.gapi.client.init({
                discoveryDocs: [
                    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
                    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
                ],
            });
            console.log("GAPI client initialized.");
            setGapiReady(true);
        });

        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse: any) => {
                const currentUser = userRef.current;
                if (tokenResponse.error) {
                    console.error("Google API auth error. Resetting auth state.", tokenResponse);
                    setGoogleApiToken(null);
                    if (currentUser) {
                        localStorage.removeItem(getUserKey('google_api_token'));
                    }
                    return;
                }
                
                if (tokenResponse && tokenResponse.access_token && tokenResponse.expires_in && currentUser) {
                    console.log("Google API token received successfully.");
                    const expiryTime = Date.now() + (tokenResponse.expires_in * 1000);
                    localStorage.setItem(getUserKey('google_api_token'), JSON.stringify({ token: tokenResponse.access_token, expiry: expiryTime }));
                    
                    window.gapi.client.setToken({ access_token: tokenResponse.access_token });
                    setGoogleApiToken(tokenResponse.access_token);
                } else {
                    console.warn("Google API auth response was invalid. Resetting auth state.", tokenResponse);
                    setGoogleApiToken(null);
                    if (currentUser) {
                        localStorage.removeItem(getUserKey('google_api_token'));
                    }
                }
            },
        });
        console.log("GIS token client initialized.");
        setGisReady(true);
    };

    const checkScriptsInterval = setInterval(() => {
        if (window.gapi?.load && window.google?.accounts?.oauth2?.initTokenClient) {
            clearInterval(checkScriptsInterval);
            initializeGoogleClients();
        }
    }, 100);

    return () => clearInterval(checkScriptsInterval);
  }, [getUserKey]);


  useEffect(() => {
    // On app load, check for a stored, unexpired token to avoid re-authentication.
    if (user && gapiReady) {
        const storedTokenData = localStorage.getItem(getUserKey('google_api_token'));
        if (storedTokenData) {
            try {
                const { token, expiry } = JSON.parse(storedTokenData);
                // Use token if it's not expiring in the next 5 minutes
                if (token && expiry && expiry > Date.now() + (5 * 60 * 1000)) {
                    console.log("Re-using stored Google API token.");
                    window.gapi.client.setToken({ access_token: token });
                    setGoogleApiToken(token);
                } else {
                    console.log("Stored Google API token expired or is missing.");
                    localStorage.removeItem(getUserKey('google_api_token'));
                }
            } catch (e) {
                localStorage.removeItem(getUserKey('google_api_token'));
            }
        }
    }
  }, [user, gapiReady, getUserKey]);

  const handleAuthClick = () => {
    if (tokenClientRef.current) {
      console.log("Requesting user consent for Google APIs.");
      tokenClientRef.current.requestAccessToken({});
    } else {
      console.error("Google token client not ready.");
    }
  };

  const findOrCreateAppFolder = useCallback(async (): Promise<string | null> => {
    if (appFolderId.current) return appFolderId.current;
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
        fields: 'files(id, name)',
      });
      if (response.result.files && response.result.files.length > 0) {
        appFolderId.current = response.result.files[0].id!;
        return appFolderId.current;
      } else {
        const fileMetadata = { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' };
        const createResponse = await window.gapi.client.drive.files.create({ resource: fileMetadata, fields: 'id' });
        appFolderId.current = createResponse.result.id!;
        return appFolderId.current;
      }
    } catch (error) { console.error("Error finding/creating app folder:", error); return null; }
  }, []);
  
  const loadGalleryFromDrive = useCallback(async () => {
      if (!googleApiToken) return;
      setGalleryIsLoading(true);

      try {
          const parentFolderId = await findOrCreateAppFolder();
          if (!parentFolderId) throw new Error("Could not access app folder.");
          
          let subFolderId: string | null = null;
          const folderResponse = await window.gapi.client.drive.files.list({ q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='gallery' and trashed=false`, fields: 'files(id)' });
          if(folderResponse.result.files && folderResponse.result.files.length > 0) {
              subFolderId = folderResponse.result.files[0].id!;
          } else {
              const subFolderMeta = { name: 'gallery', mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] };
              const createSubResponse = await window.gapi.client.drive.files.create({ resource: subFolderMeta, fields: 'id' });
              subFolderId = createSubResponse.result.id!;
          }

          if(!subFolderId) throw new Error(`Could not access gallery folder.`);
          
          const filesResponse = await window.gapi.client.drive.files.list({ q: `'${subFolderId}' in parents and trashed=false`, fields: 'files(id, name, appProperties)' });
          const files = filesResponse.result.files || [];

          const fileDataPromises = files.map(async (file) => {
            try {
                const mediaResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                    headers: { 'Authorization': `Bearer ${googleApiToken}` }
                });
                if (!mediaResponse.ok) {
                    if (mediaResponse.status === 401 || mediaResponse.status === 403) {
                       console.error('Google API token expired during fetch. Resetting auth.');
                       setGoogleApiToken(null);
                       localStorage.removeItem(getUserKey('google_api_token'));
                    }
                    throw new Error(`Failed to fetch file media for ${file.id}, status: ${mediaResponse.status}`);
                }
                const blob = await mediaResponse.blob();
                const url = URL.createObjectURL(blob);
                return { ...file, url };
            } catch (e) {
                console.error(`Could not process file ${file.name}:`, e);
                return null;
            }
          });
        
          const processedFiles = (await Promise.all(fileDataPromises)).filter(Boolean);
          const images: GalleryImage[] = processedFiles.map(file => ({ id: file!.id!, url: file!.url }));
          setGalleryImages(images);

      } catch (error) { console.error(`Error loading gallery:`, error); }
      finally {
          setGalleryIsLoading(false);
      }
  }, [googleApiToken, findOrCreateAppFolder, getUserKey]);
  
  useEffect(() => {
      if (googleApiToken && isOnline) {
          loadGalleryFromDrive();
      }
  }, [googleApiToken, loadGalleryFromDrive, isOnline]);
  
  const uploadGalleryImageToDrive = useCallback(async (file: File): Promise<any> => {
      const parentFolderId = await findOrCreateAppFolder();
      if (!parentFolderId) throw new Error("No parent folder");
      
      let subFolderId: string | null = null;
      const folderResponse = await window.gapi.client.drive.files.list({ q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='gallery' and trashed=false`, fields: 'files(id)' });
      subFolderId = folderResponse.result.files?.[0]?.id || null;
      if (!subFolderId) {
          const subFolderMeta = { name: 'gallery', mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] };
          const createSubResponse = await window.gapi.client.drive.files.create({ resource: subFolderMeta, fields: 'id' });
          subFolderId = createSubResponse.result.id!;
      }

      const metadata = { name: file.name, parents: [subFolderId] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${googleApiToken}` },
          body: form,
      });
      return response.json();
  }, [googleApiToken, findOrCreateAppFolder]);

  const handleAddGalleryImages = async (files: File[]) => {
      setGalleryIsLoading(true);
      try {
          const uploadPromises = files.map(file => uploadGalleryImageToDrive(file));
          await Promise.all(uploadPromises);
          await loadGalleryFromDrive();
      } catch (error) { console.error("Error uploading images:", error); }
      finally { setGalleryIsLoading(false); }
  };
  const handleDeleteGalleryImage = async (id: string) => {
      try {
          await window.gapi.client.drive.files.delete({ fileId: id });
          setGalleryImages(i => i.filter(img => img.id !== id));
      } catch (error) { console.error(`Error deleting gallery item:`, error); }
  };
  
  // --- Supabase Backgrounds Logic ---
  const loadBackgroundsFromSupabase = useCallback(async () => {
    if (!user) return;
    setBackgroundsAreLoading(true);
    try {
        const { data: backgroundMeta, error } = await supabase
            .from('user_backgrounds')
            .select('*')
            .eq('user_id', user.id);
        if (error) throw error;
        
        const backgrounds: Background[] = backgroundMeta.map(meta => {
            const { data: { publicUrl } } = supabase.storage.from('fondos').getPublicUrl(meta.path);
            return { ...meta, url: publicUrl };
        });

        setUserBackgrounds(backgrounds);

    } catch (error) {
        console.error("Error loading backgrounds from Supabase:", error);
    } finally {
        setBackgroundsAreLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isOnline) {
      loadBackgroundsFromSupabase();
    }
  }, [user, isOnline, loadBackgroundsFromSupabase]);
  
  const activeBackground = useMemo(() => {
    if (!uiSettings?.activeBackgroundId || userBackgrounds.length === 0) {
        return null;
    }
    return userBackgrounds.find(bg => bg.id === uiSettings.activeBackgroundId) || null;
  }, [uiSettings?.activeBackgroundId, userBackgrounds]);

  useEffect(() => {
    if (activeBackground) {
        document.body.classList.add('has-custom-background');
    } else {
        document.body.classList.remove('has-custom-background');
    }
    return () => { // Cleanup on unmount
        document.body.classList.remove('has-custom-background');
    };
  }, [activeBackground]);
  
  // --- Media Playback Logic ---
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (activeBackground && activeBackground.type === 'video') {
        if (videoElement.src !== activeBackground.url) {
            videoElement.src = activeBackground.url;
            videoElement.load();
        }
        const playPromise = videoElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.warn("Video autoplay prevented:", error);
            });
        }
    } else {
        if (!videoElement.paused) {
            videoElement.pause();
        }
    }
  }, [activeBackground]);


  const handleAddBackground = async (file: File) => {
    if (!user) return;
    if (userBackgrounds.length >= 10) {
      alert("Has alcanzado el límite de 10 fondos. Por favor, elimina uno para subir otro nuevo.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) { // 15MB limit
      alert(`El archivo "${file.name}" es demasiado grande. El límite es 15MB.`);
      return;
    }

    setBackgroundsAreLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('fondos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from('user_backgrounds')
        .insert({
          user_id: user.id,
          name: file.name,
          path: filePath,
          type: file.type.startsWith('video') ? 'video' : 'image',
          is_favorite: false,
        }).select().single();
      
      if (insertError) {
        // Cleanup storage if db insert fails
        await supabase.storage.from('fondos').remove([filePath]);
        throw insertError;
      }

      // Optimistically update UI
      const { data: { publicUrl } } = supabase.storage.from('fondos').getPublicUrl(data.path);
      const newBackground = { ...data, url: publicUrl, is_favorite: data.is_favorite };
      setUserBackgrounds(prev => [...prev, newBackground]);

    } catch (error) {
      console.error("Error uploading background:", error);
      alert("Error al subir el fondo. Inténtalo de nuevo.");
    } finally {
      setBackgroundsAreLoading(false);
    }
  };
  
  const handleDeleteBackground = async (id: string) => {
    const bgToDelete = userBackgrounds.find(bg => bg.id === id);
    if (!bgToDelete) return;

    setBackgroundsAreLoading(true);
    try {
        const { error: storageError } = await supabase.storage.from('fondos').remove([bgToDelete.path]);
        if (storageError) throw storageError;

        const { error: dbError } = await supabase.from('user_backgrounds').delete().eq('id', id);
        if (dbError) throw dbError;
        
        setUserBackgrounds(bgs => bgs.filter(bg => bg.id !== id));
        if (activeBackground?.id === id) {
             setUiSettings(s => s ? { ...s, activeBackgroundId: null } : null);
        }

    } catch (error) {
        console.error("Error deleting background:", error);
        alert("Error al eliminar el fondo.");
    } finally {
      setBackgroundsAreLoading(false);
    }
  };
  
  const handleToggleFavoriteBackground = async (id: string) => {
    const bg = userBackgrounds.find(b => b.id === id);
    if (!bg) return;
    const newIsFavorite = !bg.is_favorite;

    try {
      setUserBackgrounds(bgs => bgs.map(b => b.id === id ? { ...b, is_favorite: newIsFavorite } : b));
      
      const { error } = await supabase
        .from('user_backgrounds')
        .update({ is_favorite: newIsFavorite })
        .eq('id', id);

      if (error) {
        setUserBackgrounds(bgs => bgs.map(b => b.id === id ? { ...b, is_favorite: !newIsFavorite } : b));
        throw error;
      }

    } catch (error) {
      console.error("Error favoriting background:", error);
      alert("No se pudo actualizar el favorito.");
    }
  };
  
  // --- UI Settings Handlers ---
  const handleThemeColorChange = useCallback((colorName: keyof ThemeColors, value: string) => {
    setUiSettings(prev => prev ? { ...prev, themeColors: { ...prev.themeColors, [colorName]: value } } : null);
  }, []);

  const handleResetThemeColors = useCallback(() => {
    setUiSettings(prev => prev ? { ...prev, themeColors: DEFAULT_COLORS } : null);
  }, []);
  
  const handleSelectBackground = (background: Background | null) => {
    setUiSettings(prev => prev ? { ...prev, activeBackgroundId: background ? background.id : null } : null);
  };
  
  const handleParticleChange = (type: ParticleType) => {
    setUiSettings(prev => prev ? { ...prev, particleType: type } : null);
  };
  
  const handleAmbientSoundChange = (value: { type: AmbientSoundType; volume: number; }) => {
    setUiSettings(prev => prev ? { ...prev, ambientSound: value } : null);

    const audio = ambientAudioRef.current;
    if (!audio) return;

    const soundMap: Record<AmbientSoundType, string | null> = {
      'none': null, 'rain': rainSoundSrc, 'forest': forestSoundSrc, 'coffee_shop': coffeeShopSrc, 'ocean': oceanSoundSrc,
    };
    const newSrc = soundMap[value.type];

    if (newSrc) {
      if (audio.src !== newSrc) {
        audio.src = newSrc;
        audio.load();
      }
      audio.volume = value.volume;
      audio.loop = true;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio playback failed:", error);
        });
      }
    } else {
      audio.pause();
      audio.src = '';
    }
  };

  // --- OneSignal / Notifications ---
  useEffect(() => {
    if (!user?.id || !ONE_SIGNAL_APP_ID) {
        return;
    }

    const OneSignal = window.OneSignal || [];

    const onPermissionChange = (newPermissionStatus: 'granted' | 'denied' | 'default') => {
        setIsPermissionBlocked(newPermissionStatus === 'denied');
    };

    const onSubscriptionChange = (subscriptionState: { current: { optedIn: boolean } }) => {
        setIsSubscribed(subscriptionState.current.optedIn);
    };

    const initializeOneSignal = async () => {
        await OneSignal.init({
            appId: ONE_SIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            autoRegister: false, // We will handle this manually.
        });

        await OneSignal.login(user.id);
        
        // Initial state check using synchronous properties from v16 SDK
        setIsPermissionBlocked(OneSignal.Notifications.permission === 'denied');
        setIsSubscribed(OneSignal.User.PushSubscription.optedIn);

        // Attach listeners
        OneSignal.Notifications.addEventListener('permissionChange', onPermissionChange);
        OneSignal.User.PushSubscription.addEventListener('change', onSubscriptionChange);
    };

    initializeOneSignal();

    // Cleanup listeners when the user changes or component unmounts
    return () => {
        if (window.OneSignal && window.OneSignal.Notifications && window.OneSignal.User) {
            OneSignal.Notifications.removeEventListener('permissionChange', onPermissionChange);
            OneSignal.User.PushSubscription.removeEventListener('change', onSubscriptionChange);
        }
    };
}, [user?.id]);

  const handleNotificationAction = async () => {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return;

      if (isPermissionBlocked) {
          alert('Las notificaciones están bloqueadas en la configuración de tu navegador. Por favor, habilítalas para esta página.');
          return;
      }
      
      if (isSubscribed) {
          // Send a test notification
          supabase.functions.invoke('send-pushalert-notification', {
            body: {
              title: "¡Notificación de Prueba! 🐣",
              message: "¡Así se verán los recordatorios de tus tareas!",
            },
          }).then(({ error }) => {
              if (error) {
                  console.error("Error sending test notification:", error);
                  alert("Error al enviar la notificación de prueba.");
              }
          });
      } else {
          // This will trigger the native browser prompt.
          await OneSignal.User.PushSubscription.optIn();
      }
  };
  
  const handleGCalSettingsChange = async (settings: GCalSettings) => {
    if (!user) return;
    setGcalSettings(settings);
    // Persist to Supabase
    await syncableUpdate('profiles', { id: user.id, gcal_settings: settings });
  };
  
  if (authLoading || (user && !dataLoaded) || (user && !uiSettings)) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-secondary-light via-primary-light to-secondary-lighter dark:from-gray-800 dark:via-primary/50 dark:to-gray-900 flex flex-col items-center justify-center text-center">
            <div className="relative w-40 h-32">
                <div className="absolute inset-x-0 bottom-8 h-24">
                    <div className="animate-walk-cycle w-24 h-24 mx-auto">
                        <ChickenIcon className="w-full h-full text-pink-400" />
                    </div>
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-3 bg-black rounded-full animate-shadow-cycle"></div>
            </div>
             <p className="text-xl font-semibold text-gray-600 dark:text-gray-300 -mt-4 animate-pulse">
                Cargando...
            </p>
        </div>
    );
  }
  
  if (!user) {
    return <Login onLogin={() => {}} />;
  }
  
  const appProps: AppComponentProps = {
    isOnline, isSyncing, currentUser: user, onLogout: handleLogout, 
    theme, toggleTheme, themeColors: uiSettings.themeColors, onThemeColorChange: handleThemeColorChange, onResetThemeColors: handleResetThemeColors,
    allTodos, folders: foldersWithNotes, projects, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
    pomodoroState, activeBackground, particleType: uiSettings.particleType, ambientSound: uiSettings.ambientSound, dailyEncouragementLocalHour,
    dailySummaryHour,
    activeTrack, activeSpotifyTrack,
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos: () => setIsClearPastConfirmOpen(true),
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddProject, handleUpdateProject, handleDeleteProject, handleDeleteProjectAndTasks,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground: handleSelectBackground, setParticleType: handleParticleChange, setAmbientSound: handleAmbientSoundChange, onSetDailyEncouragement: handleSetDailyEncouragement,
    onSetDailySummary: handleSetDailySummary,
    setActiveTrack, setActiveSpotifyTrack,
    googleApiToken, galleryIsLoading, backgroundsAreLoading, handleAuthClick,
    handleAddGalleryImages, handleDeleteGalleryImage,
    handleAddBackground, handleDeleteBackground,
    handleToggleFavoriteBackground, gapiReady,
    isSubscribed, isPermissionBlocked, handleNotificationAction,
    gcalSettings, onGCalSettingsChange: handleGCalSettingsChange, userCalendars, calendarEvents
  };

  return (
    <>
      {activeBackground ? (
          activeBackground.type === 'video' ? (
              <video ref={videoRef} key={activeBackground.id} autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover -z-30"/>
          ) : (
              <div key={activeBackground.id} className="absolute top-0 left-0 w-full h-full bg-cover bg-center -z-30" style={{ backgroundImage: `url(${activeBackground.url})` }}/>
          )
      ) : (
          <div className="absolute top-0 left-0 w-full h-full bg-gray-50 dark:bg-gray-950 -z-30"/>
      )}
      
      {isMobile ? <MobileApp {...appProps} /> : <DesktopApp {...appProps} />}

      <InstallPwaBanner 
        show={showInstallBanner} 
        isIos={isIos} 
        onInstall={handleInstallPwa} 
        onDismiss={handleDismissPwaBanner} 
      />
      <MotivationalToast message={quickCaptureMessage} onClear={() => setQuickCaptureMessage(null)} />
      <ConfirmationModalWithOptions
        isOpen={deleteOptions.isOpen}
        onClose={() => setDeleteOptions({ isOpen: false, todo: null })}
        title="Eliminar Tarea Recurrente"
        message="Esta tarea se repite. ¿Cómo quieres eliminarla?"
        options={[
            {
                label: 'Eliminar solo esta tarea',
                onClick: () => {
                    if (deleteOptions.todo) handleDeleteThisOccurrence(deleteOptions.todo.id);
                },
                style: 'default',
            },
            {
                label: 'Eliminar esta y las futuras',
                onClick: () => {
                    if (deleteOptions.todo) handleDeleteFutureOccurrences(deleteOptions.todo);
                },
                style: 'danger',
            }
        ]}
      />
       <ConfirmationModalWithOptions
        isOpen={updateOptions.isOpen}
        onClose={() => setUpdateOptions({ isOpen: false, original: null, updated: null })}
        title="Actualizar Tarea Recurrente"
        message="Has cambiado la repetición de esta tarea. ¿Cómo quieres aplicar los cambios?"
        options={[
            {
                label: 'Solo esta tarea',
                onClick: () => {
                    if (updateOptions.updated) handleUpdateThisOccurrenceOnly(updateOptions.updated);
                },
                style: 'default',
            },
            {
                label: 'Esta y las futuras',
                onClick: () => {
                    if (updateOptions.updated) handleUpdateFutureOccurrences(updateOptions.updated);
                },
                style: 'primary',
            }
        ]}
      />
      <ConfirmationModal
        isOpen={isClearPastConfirmOpen}
        onClose={() => setIsClearPastConfirmOpen(false)}
        onConfirm={handleClearPastTodos}
        title="Limpiar Tareas Pasadas"
        message={`¿Seguro que quieres eliminar todas las tareas anteriores al ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}? Esta acción es permanente.`}
        confirmText="Sí, limpiar"
        cancelText="Cancelar"
      />
      <audio ref={ambientAudioRef} />
    </>
  );
};

export default App;