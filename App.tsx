import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Todo, Folder, Background, Playlist, WindowType, WindowState, GalleryImage, Subtask, QuickNote, ParticleType, AmbientSoundType, Note, ThemeColors, BrowserSession, SupabaseUser, Priority } from './types';
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
import { initDB, getAll, clearAndPutAll, get, set, syncableCreate, syncableUpdate, syncableDelete, syncableDeleteAll, processSyncQueue } from './db';
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

// --- Google Drive Configuration ---
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (process.env as any).GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
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
  activeTrack: Playlist | null;
  activeSpotifyTrack: Playlist | null;
  // Handlers
  handleAddTodo: (text: string) => Promise<void>;
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
  setActiveBackground: React.Dispatch<React.SetStateAction<Background | null>>;
  setParticleType: React.Dispatch<React.SetStateAction<ParticleType>>;
  setAmbientSound: React.Dispatch<React.SetStateAction<{ type: AmbientSoundType; volume: number }>>;
  onSetDailyEncouragement: (localHour: number | null) => void;
  setActiveTrack: React.Dispatch<React.SetStateAction<Playlist | null>>;
  setActiveSpotifyTrack: React.Dispatch<React.SetStateAction<Playlist | null>>;
  // Google Drive Props
  gdriveToken: string | null;
  galleryIsLoading: boolean;
  backgroundsAreLoading: boolean;
  handleAuthClick: () => void;
  handleAddGalleryImages: (files: File[]) => Promise<void>;
  handleDeleteGalleryImage: (id: string) => Promise<void>;
  handleAddBackground: (file: File) => Promise<void>;
  handleDeleteBackground: (id: string) => Promise<void>;
  handleToggleFavoriteBackground: (id: string) => Promise<void>;
  gapiReady: boolean;
  // Notifications
  isSubscribed: boolean;
  isPermissionBlocked: boolean;
  handleNotificationAction: () => void;
}

const DesktopApp: React.FC<AppComponentProps> = (props) => {
  const {
    isOnline, isSyncing, currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
    allTodos, folders, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
    pomodoroState, activeBackground, particleType, ambientSound, dailyEncouragementLocalHour,
    activeTrack, activeSpotifyTrack,
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos,
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound, onSetDailyEncouragement,
    setActiveTrack, setActiveSpotifyTrack,
    gdriveToken, galleryIsLoading, backgroundsAreLoading, handleAuthClick,
    handleAddGalleryImages, handleDeleteGalleryImage, handleAddBackground, handleDeleteBackground, handleToggleFavoriteBackground,
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
  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  
  const handleShowCompletionModal = (quote: string) => {
    setCompletionQuote(quote);
    setShowCompletionModal(true);
  };
  
  // Memoized values derived from props
  const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
  const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
  const todayTodos = useMemo(() => allTodos[formatDateKey(selectedDate)] || [], [allTodos, selectedDate]);
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

  // Ambient Sound Effect
  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (!audio) return;
    const soundMap: Record<AmbientSoundType, string | null> = {
      'none': null, 'rain': rainSoundSrc, 'forest': forestSoundSrc, 'coffee_shop': coffeeShopSrc, 'ocean': oceanSoundSrc,
    };
    const newSrc = soundMap[ambientSound.type];
    if (newSrc) {
      if (audio.src !== newSrc) audio.src = newSrc;
      audio.loop = true;
      audio.volume = ambientSound.volume;
      audio.play().catch(e => console.error("Audio play failed:", e));
    } else {
      audio.pause();
      audio.src = '';
    }
    audio.volume = ambientSound.volume;
  }, [ambientSound]);

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
        {activeBackground ? (
            activeBackground.type === 'video' ? (
                <video key={activeBackground.id} src={activeBackground.url} autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover -z-30"/>
            ) : (
                <div key={activeBackground.id} className="absolute top-0 left-0 w-full h-full bg-cover bg-center -z-30" style={{ backgroundImage: `url(${activeBackground.url})` }}/>
            )
        ) : (
            <div className="absolute top-0 left-0 w-full h-full bg-gray-50 dark:bg-gray-950 -z-30"/>
        )}
        
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
                onClick={handleNotificationAction}
                className={`relative bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
                    isPermissionBlocked
                    ? 'text-red-400 cursor-not-allowed'
                    : isSubscribed
                    ? 'text-primary'
                    : 'text-gray-700 dark:text-gray-300 hover:text-primary'
                }`}
                aria-label={isSubscribed ? 'Enviar notificación de prueba' : 'Activar notificaciones'}
                title={
                    isPermissionBlocked
                    ? 'Notificaciones bloqueadas por el navegador'
                    : isSubscribed
                    ? 'Enviar una notificación de prueba'
                    : 'Activar notificaciones para recordatorios'
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
        isSignedIn={!!gdriveToken}
        onAuthClick={handleAuthClick}
        isGapiReady={props.gapiReady}
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
        dailyEncouragementHour={dailyEncouragementLocalHour}
        onSetDailyEncouragement={onSetDailyEncouragement}
      />
      
      <div className={`fixed top-4 left-4 z-30 w-64 space-y-4 transition-all duration-500 ${isFocusMode ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'} hidden md:block`}>
          <Greeting name={capitalizedUserName} />
          <BibleVerse />
          <TodaysAgenda 
            tasks={todayAgendaTasks} 
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
                todos={todayTodos} 
                addTodo={handleAddTodo} 
                toggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)}
                toggleSubtask={handleToggleSubtask}
                deleteTodo={handleDeleteTodo} 
                updateTodo={handleUpdateTodo} 
                onEditTodo={setTaskToEdit} 
                selectedDate={selectedDate} 
                setSelectedDate={setSelectedDate} 
                datesWithTasks={datesWithTasks} 
                datesWithAllTasksCompleted={datesWithAllTasksCompleted} 
                onClearPastTodos={onClearPastTodos}
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
                  <ImageGallery images={galleryImages} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} isSignedIn={!!gdriveToken} onAuthClick={handleAuthClick} isGapiReady={props.gapiReady} isLoading={galleryIsLoading} />
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
        <TaskDetailsModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} onSave={handleUpdateTodo} todo={taskToEdit} />
        {activeTrack && <FloatingPlayer track={activeTrack} queue={activeTrack.queue} onSelectTrack={handleSelectTrack} onClose={() => setActiveTrack(null)} />}
        {activeSpotifyTrack && <SpotifyFloatingPlayer track={activeSpotifyTrack} onClose={() => setActiveSpotifyTrack(null)} />}
      </div>

      <div className={`fixed bottom-0 left-0 right-0 transition-opacity duration-500 z-[40000] ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Dock onButtonClick={toggleWindow} openWindows={openWindows} />
      </div>

      <audio ref={pomodoroAudioRef} src={pomodoroAudioSrc} />
      <audio ref={ambientAudioRef} />
    </div>
  );
};

const MobileApp: React.FC<AppComponentProps> = (props) => {
    const {
      isOnline, isSyncing, currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
      allTodos, folders, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
      pomodoroState, activeBackground, particleType, ambientSound, dailyEncouragementLocalHour,
      activeTrack, activeSpotifyTrack,
      handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos,
      handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
      handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
      handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
      setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound, onSetDailyEncouragement,
      setActiveTrack, setActiveSpotifyTrack,
      gdriveToken, galleryIsLoading, backgroundsAreLoading, handleAuthClick,
      handleAddGalleryImages, handleDeleteGalleryImage, handleAddBackground, handleDeleteBackground, handleToggleFavoriteBackground,
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
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    
    const pomodoroAudioRef = useRef<HTMLAudioElement>(null);
    const ambientAudioRef = useRef<HTMLAudioElement>(null);

    const handleShowCompletionModal = (quote: string) => {
        setCompletionQuote(quote);
        setShowCompletionModal(true);
    };

    const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
    const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
    const todayTodos = useMemo(() => allTodos[formatDateKey(selectedDate)] || [], [allTodos, selectedDate]);
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


    // Ambient Sound Effect
    useEffect(() => {
        const audio = ambientAudioRef.current;
        if (!audio) return;
        const soundMap: Record<AmbientSoundType, string | null> = {
          'none': null, 'rain': rainSoundSrc, 'forest': forestSoundSrc, 'coffee_shop': coffeeShopSrc, 'ocean': oceanSoundSrc,
        };
        const newSrc = soundMap[ambientSound.type];
        if (newSrc) {
          if (audio.src !== newSrc) audio.src = newSrc;
          audio.loop = true;
          audio.volume = ambientSound.volume;
          audio.play().catch(e => console.error("Audio play failed:", e));
        } else {
          audio.pause();
          audio.src = '';
        }
        audio.volume = ambientSound.volume;
    }, [ambientSound]);
    
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
                            <TodaysAgenda tasks={todayAgendaTasks} onToggleTask={(id) => handleToggleTodo(id, handleShowCompletionModal)} onToggleSubtask={(taskId, subtaskId) => handleToggleSubtask(taskId, subtaskId, handleShowCompletionModal)} quickNotes={quickNotes} onAddQuickNote={handleAddQuickNote} onDeleteQuickNote={handleDeleteQuickNote} onClearAllQuickNotes={handleClearAllQuickNotes} />
                        </div>
                    </>
                );
            case 'tasks':
                return (
                    <div className="flex flex-col h-full">
                        <TodoListModule 
                            isMobile={true} 
                            todos={todayTodos} 
                            addTodo={handleAddTodo} 
                            toggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)}
                            toggleSubtask={handleToggleSubtask}
                            deleteTodo={handleDeleteTodo} 
                            updateTodo={handleUpdateTodo} 
                            onEditTodo={setTaskToEdit} 
                            selectedDate={selectedDate} 
                            setSelectedDate={setSelectedDate} 
                            datesWithTasks={datesWithTasks} 
                            datesWithAllTasksCompleted={datesWithAllTasksCompleted} 
                            onClearPastTodos={onClearPastTodos}
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
                        <ImageGallery isMobile={true} images={galleryImages} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} isSignedIn={!!gdriveToken} onAuthClick={handleAuthClick} isGapiReady={props.gapiReady} isLoading={galleryIsLoading} />
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
                        <div className="p-4 pt-8 space-y-4">
                            <div className="p-4 flex justify-between items-center border-b border-black/5 dark:border-white/10">
                                <h3 className="font-bold text-primary-dark dark:text-primary">Tema</h3>
                                <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
                            </div>
                             <div className="p-4 border-b border-black/5 dark:border-white/10">
                                <button onClick={() => setIsCustomizationPanelOpen(true)} className="w-full flex justify-between items-center text-left">
                                  <div>
                                    <h3 className="font-bold text-primary-dark dark:text-primary">Personalización</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Colores, fondos, sonidos y efectos.</p>
                                  </div>
                                  <ChevronRightIcon />
                                </button>
                            </div>
                            <div className="p-4 border-b border-black/5 dark:border-white/10">
                                <div>
                                    <h3 className="font-bold text-primary-dark dark:text-primary mb-2">Dosis de Ánimo Diario</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Recibe un versículo cada día a la hora que elijas.</p>
                                    <select 
                                        value={dailyEncouragementLocalHour === null ? 'none' : dailyEncouragementLocalHour} 
                                        onChange={e => onSetDailyEncouragement(e.target.value === 'none' ? null : parseInt(e.target.value, 10))}
                                        className="w-full bg-white/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 border-2 border-secondary-light/50 dark:border-gray-600 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm appearance-none text-center"
                                    >
                                        <option value="none">Desactivado</option>
                                        {Array.from({length: 24}, (_, i) => i).map(hour => {
                                            const displayDate = new Date();
                                            displayDate.setHours(hour, 0, 0);
                                            return <option key={hour} value={hour}>
                                                {displayDate.toLocaleTimeString(navigator.language, { hour: 'numeric', hour12: true })}
                                            </option>
                                        })}
                                    </select>
                                </div>
                            </div>
                            <div className="p-4 border-b border-black/5 dark:border-white/10">
                                <button onClick={handleNotificationAction} className="w-full flex justify-between items-center text-left" disabled={isPermissionBlocked}>
                                    <div>
                                        <h3 className={`font-bold transition-colors ${
                                            isPermissionBlocked ? 'text-gray-400 dark:text-gray-500' : 'text-primary-dark dark:text-primary'
                                        }`}>
                                            {isSubscribed ? 'Probar Notificaciones' : 'Activar Notificaciones'}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {isPermissionBlocked
                                                ? 'Permisos bloqueados en el navegador.'
                                                : isSubscribed
                                                ? 'Recibe una notificación de prueba ahora.'
                                                : 'Permite recibir recordatorios de tareas.'}
                                        </p>
                                    </div>
                                    {!isPermissionBlocked && <ChevronRightIcon />}
                                </button>
                            </div>
                             <button onClick={onLogout} className="w-full mt-4 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 font-bold flex items-center justify-center gap-2 p-3 rounded-full shadow-md">
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
            {activeBackground ? (
                activeBackground.type === 'video' ? (
                    <video key={activeBackground.id} src={activeBackground.url} autoPlay loop muted playsInline className="absolute top-0 left-0 w-full h-full object-cover -z-30"/>
                ) : (
                    <div key={activeBackground.id} className="absolute top-0 left-0 w-full h-full bg-cover bg-center -z-30" style={{ backgroundImage: `url(${activeBackground.url})` }}/>
                )
            ) : (
                <div className="absolute top-0 left-0 w-full h-full bg-gray-50 dark:bg-gray-950 -z-30"/>
            )}
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
              isSignedIn={!!gdriveToken}
              onAuthClick={handleAuthClick}
              isGapiReady={props.gapiReady}
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
            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onAddTask={(text) => {
                    handleAddTodo(text);
                    setIsAddTaskModalOpen(false);
                }}
            />
            <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} quote={completionQuote}/>
            <MobileTaskEditor 
                isOpen={!!taskToEdit} 
                onClose={() => setTaskToEdit(null)} 
                onSave={handleUpdateTodo}
                onDelete={handleDeleteTodo} 
                todo={taskToEdit} 
            />
            
            {isAiBrowserOpen && (
                <div className="fixed inset-0 bg-secondary-lighter/90 dark:bg-gray-900 z-[100] animate-deploy">
                    {/* FIX: Correctly pass `setBrowserSession` prop instead of undefined `setSession`. */}
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
            <audio ref={ambientAudioRef} />
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
  const [isQuickCapturePage, setIsQuickCapturePage] = useState(false);
  const [quickCaptureStatus, setQuickCaptureStatus] = useState<{ status: 'loading' | 'success' | 'error'; text: string }>({ status: 'loading', text: '' });

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeColors, setThemeColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  const settingsSaveTimeout = useRef<number | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // --- ALL SHARED STATE MOVED HERE ---
  // Data state
  const [allTodos, setAllTodos] = useState<{ [key: string]: Todo[] }>({});
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  
  // UI state
  const [browserSession, setBrowserSession] = useState<BrowserSession>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [deleteOptions, setDeleteOptions] = useState<{ isOpen: boolean; todo: Todo | null; }>({ isOpen: false, todo: null });
  const [updateOptions, setUpdateOptions] = useState<{ isOpen: boolean; original: Todo | null; updated: Todo | null; }>({ isOpen: false, original: null, updated: null });
  const [isClearPastConfirmOpen, setIsClearPastConfirmOpen] = useState(false);


  const [activeBackground, setActiveBackground] = useState<Background | null>(null);
  const [savedActiveBgId, setSavedActiveBgId] = useState<string | null>(null);
  const [particleType, setParticleType] = useState<ParticleType>('none');
  const [ambientSound, setAmbientSound] = useState<{ type: AmbientSoundType; volume: number }>({ type: 'none', volume: 0.5 });
  const [dailyEncouragementLocalHour, setDailyEncouragementLocalHour] = useState<number | null>(null);
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

  // Google Drive State
  const [gapiReady, setGapiReady] = useState(false);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [userBackgrounds, setUserBackgrounds] = useState<Background[]>([]);
  const [galleryIsLoading, setGalleryIsLoading] = useState(false);
  const [backgroundsAreLoading, setBackgroundsAreLoading] = useState(false);
  const appFolderId = useRef<string | null>(null);
  
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
    // This effect should only run once on mount to handle browser-based quick capture.
    const checkQuickCapture = async () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const urlParams = new URLSearchParams(window.location.search);
        const taskParam = urlParams.get('addTask');

        if (taskParam && !isStandalone) {
            const decodedText = decodeURIComponent(taskParam.replace(/\+/g, ' '));
            setIsQuickCapturePage(true);
            setQuickCaptureStatus({ status: 'loading', text: decodedText });

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setQuickCaptureStatus(s => ({ ...s, status: 'error' }));
                return;
            }

            const dateKey = formatDateKey(new Date());
            const newTodo = {
                text: decodedText,
                completed: false,
                priority: 'medium' as Priority,
                due_date: dateKey,
                user_id: session.user.id,
                created_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('todos').insert(newTodo);

            if (error) {
                console.error("Quick capture save error:", error);
                setQuickCaptureStatus(s => ({ ...s, status: 'error' }));
            } else {
                setQuickCaptureStatus(s => ({ ...s, status: 'success' }));
            }

            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    };
    checkQuickCapture();
  }, []); // Empty array ensures it runs only once.

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

  const handleThemeColorChange = useCallback((colorName: keyof ThemeColors, value: string) => {
    setThemeColors(prev => {
        const newColors = { ...prev, [colorName]: value };
        applyThemeColors(newColors);
        if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current);
        settingsSaveTimeout.current = window.setTimeout(() => {
          if (user && dataLoaded) {
              set('settings', { key: 'themeColors', value: newColors });
          }
        }, 500);
        return newColors;
    });
  }, [applyThemeColors, user, dataLoaded]);

  const handleResetThemeColors = useCallback(() => {
    setThemeColors(DEFAULT_COLORS);
    applyThemeColors(DEFAULT_COLORS);
    if(user && dataLoaded) set('settings', { key: 'themeColors', value: DEFAULT_COLORS });
  }, [applyThemeColors, user, dataLoaded]);
  
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

    if (user) {
        get<{key: string, value: ThemeColors}>('settings', 'themeColors').then(savedColors => {
            const initialColors = savedColors ? savedColors.value : DEFAULT_COLORS;
            setThemeColors(initialColors);
            applyThemeColors(initialColors);
        });
    } else {
        applyThemeColors(DEFAULT_COLORS);
    }
}, [user, applyThemeColors]);

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
            // Reset all state
            setAllTodos({}); setFolders([]); setPlaylists([]); setQuickNotes([]); setNotes([]);
            setGalleryImages([]); setUserBackgrounds([]);
            setActiveBackground(null); setSavedActiveBgId(null);
            setGdriveToken(null);
        }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);
  
  const handleLogout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error logging out:', error.message);
  }, []);
  
  const loadData = useCallback(async (networkMode: 'fetch' | 'cache-only' = 'fetch') => {
    if (!user) return;
    
    // Load from cache first for instant UI
    const [cachedTodos, cachedFolders, cachedNotes, cachedPlaylists, cachedQuickNotes, cachedSettings] = await Promise.all([
        getAll<Todo>('todos'),
        getAll<Folder>('folders'),
        getAll<Note>('notes'),
        getAll<Playlist>('playlists'),
        getAll<QuickNote>('quick_notes'),
        getAll<{key: string, value: any}>('settings'),
    ]);

    const todosByDate: { [key: string]: Todo[] } = {};
    cachedTodos.forEach(todo => {
        const dateKey = todo.due_date ? todo.due_date : formatDateKey(new Date(todo.created_at!));
        if (!todosByDate[dateKey]) todosByDate[dateKey] = [];
        todosByDate[dateKey].push(todo);
    });
    setAllTodos(todosByDate);
    setFolders(cachedFolders);
    setNotes(cachedNotes);
    setPlaylists(cachedPlaylists);
    setQuickNotes(cachedQuickNotes);

    cachedSettings.forEach(s => {
        if (s.key === 'pomodoroState') setPomodoroState(p => ({...p, ...s.value, isActive: false, endTime: null}));
        if (s.key === 'particleType') setParticleType(s.value);
        if (s.key === 'ambientSound') setAmbientSound(s.value);
    });
    
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
        { data: profileData }
      ] = await Promise.all([
        supabase.from('todos').select('*, subtasks(*)').order('created_at'),
        supabase.from('folders').select('*').order('created_at'),
        supabase.from('notes').select('*').order('created_at'),
        supabase.from('playlists').select('*').order('created_at'),
        supabase.from('quick_notes').select('*').order('created_at'),
        supabase.from('profiles').select('daily_encouragement_hour_local, pomodoro_settings').eq('id', user.id).single(),
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
        recentTodosData.forEach(todo => {
            const dateKey = todo.due_date ? todo.due_date : formatDateKey(new Date(todo.created_at));
            if (!networkTodosByDate[dateKey]) networkTodosByDate[dateKey] = [];
            networkTodosByDate[dateKey].push(todo);
        });
        setAllTodos(networkTodosByDate);
        await clearAndPutAll('todos', recentTodosData);
      }
      if(foldersData) { setFolders(foldersData); await clearAndPutAll('folders', foldersData); }
      if(notesData) { setNotes(notesData); await clearAndPutAll('notes', notesData); }
      if(playlistsData) { setPlaylists(playlistsData); await clearAndPutAll('playlists', playlistsData); }
      if(quickNotesData) { setQuickNotes(quickNotesData); await clearAndPutAll('quick_notes', quickNotesData); }

      if(profileData) {
        setDailyEncouragementLocalHour(profileData.daily_encouragement_hour_local);
        if (profileData.pomodoro_settings && typeof profileData.pomodoro_settings === 'object') {
            const savedSettings = profileData.pomodoro_settings as Partial<typeof pomodoroState>;
            setPomodoroState(s => ({ ...s, durations: savedSettings.durations || s.durations, timeLeft: (savedSettings.durations || s.durations)[s.mode], isActive: false, endTime: null }));
        }
      }
      setIsSyncing(false);
    }
    
    try {
        const [ storedActiveBgId, storedParticles, storedAmbience, storedBrowser, storedActiveTrack, storedSpotifyTrack] = await Promise.all([
            get<{key: string, value: string}>('settings', 'activeBackgroundId'),
            get<{key: string, value: ParticleType}>('settings', 'particleType'),
            get<{key: string, value: any}>('settings', 'ambientSound'),
            get<{key: string, value: BrowserSession}>('settings', getUserKey('browserSession')),
            get<{key: string, value: Playlist}>('settings', getUserKey('activeTrack')),
            get<{key: string, value: Playlist}>('settings', getUserKey('activeSpotifyTrack')),
        ]);
        if (storedActiveBgId) setSavedActiveBgId(storedActiveBgId.value);
        if (storedParticles) setParticleType(storedParticles.value);
        if (storedAmbience) setAmbientSound(storedAmbience.value);
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
    window.addEventListener('offline', handleOffline);

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
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, dataLoaded, loadData]);

  // --- Settings Persistence ---
  useEffect(() => {
    if (user && dataLoaded) {
      if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current);
      settingsSaveTimeout.current = window.setTimeout(async () => {
        const { durations, showBackgroundTimer, backgroundTimerOpacity } = pomodoroState;
        const settingsToSave = { durations, showBackgroundTimer, backgroundTimerOpacity };
        await set('settings', { key: 'pomodoroState', value: settingsToSave });
        if(isOnline) await supabase.from('profiles').update({ pomodoro_settings: settingsToSave }).eq('id', user.id);
      }, 1500);
    }
    return () => { if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current); };
  }, [pomodoroState, user, dataLoaded, isOnline]);

  useEffect(() => { if (user && dataLoaded) set('settings', { key: 'particleType', value: particleType }); }, [particleType, user, dataLoaded]);
  useEffect(() => { if (user && dataLoaded) set('settings', { key: 'ambientSound', value: ambientSound }); }, [ambientSound, user, dataLoaded]);
  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('browserSession'), value: browserSession }); }, [browserSession, getUserKey, user, dataLoaded]);
  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('activeTrack'), value: activeTrack }); }, [activeTrack, getUserKey, user, dataLoaded]);
  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('activeSpotifyTrack'), value: activeSpotifyTrack }); }, [activeSpotifyTrack, getUserKey, user, dataLoaded]);

  const handleSetDailyEncouragement = async (localHour: number | null) => {
    if (!user) return;
    setDailyEncouragementLocalHour(localHour);
    await syncableUpdate('profiles', { id: user.id, daily_encouragement_hour_local: localHour });
  };
  
  // --- Data Handlers (Now with Offline Support) ---
  const handleAddTodo = useCallback(async (text: string) => {
    if (!user) return;
    const dateKey = formatDateKey(selectedDate);
    const tempId = -Date.now();
    const newTodo: Todo = { id: tempId, text, completed: false, priority: 'medium', due_date: dateKey, user_id: user.id, created_at: new Date().toISOString(), subtasks: [] };
    
    setAllTodos(current => ({ ...current, [dateKey]: [...(current[dateKey] || []), newTodo] }));
    await syncableCreate('todos', newTodo);
  }, [user, selectedDate]);
  
  // --- Quick Capture from URL ---
  useEffect(() => {
    if (!user || !dataLoaded || isQuickCapturePage) return;

    const handleUrlTask = async () => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const urlParams = new URLSearchParams(window.location.search);
        const taskText = urlParams.get('addTask');

        if (taskText && user && isStandalone) {
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
            await syncableCreate('todos', newTodo);
            
            setSelectedDate(new Date());

            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
        }
    };
    
    handleUrlTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataLoaded, isQuickCapturePage]);

  const getUpdatedTodosState = (current: { [key: string]: Todo[] }, todoToUpdate: Todo): { [key: string]: Todo[] } => {
      const newAllTodos = JSON.parse(JSON.stringify(current));
      
      // Find and remove the original task
      for (const key in newAllTodos) {
          const index = newAllTodos[key].findIndex(t => t.id === todoToUpdate.id);
          if (index !== -1) {
              newAllTodos[key].splice(index, 1);
              if (newAllTodos[key].length === 0) {
                  delete newAllTodos[key];
              }
              break;
          }
      }

      // Add the updated task to the correct date key
      const newDateKey = todoToUpdate.due_date || formatDateKey(new Date(todoToUpdate.created_at!));
      if (!newAllTodos[newDateKey]) {
          newAllTodos[newDateKey] = [];
      }
      newAllTodos[newDateKey].push(todoToUpdate);
      
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
        setAllTodos(current => getUpdatedTodosState(current, updatedTodo));
        await syncableUpdate('todos', updatedTodo);
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
    if (newCompletedState && nextState[dateKeyForCompletionCheck]?.every(t => t.completed)) {
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
      if (parentCompleted && nextState[dateKeyForCompletionCheck]?.every(t => t.completed)) {
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
    let dateKeyToDeleteFrom: string | null = null;
    for(const key in allTodos) { if(allTodos[key].some(t => t.id === id)) { dateKeyToDeleteFrom = key; break; } }
    
    if (dateKeyToDeleteFrom) {
        setAllTodos(current => {
            const newDateTodos = current[dateKeyToDeleteFrom!].filter(t => t.id !== id);
            if(newDateTodos.length > 0) {
                return { ...current, [dateKeyToDeleteFrom!]: newDateTodos };
            } else {
                const { [dateKeyToDeleteFrom!]: _, ...rest } = current;
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
    const todayKey = formatDateKey(selectedDate);
    const idsToDelete: number[] = [];
    
    const newAllTodos = { ...allTodos };

    for (const dateKey in newAllTodos) {
        if (dateKey < todayKey) {
            newAllTodos[dateKey].forEach(todo => idsToDelete.push(todo.id));
            delete newAllTodos[dateKey];
        }
    }
    
    if (idsToDelete.length > 0) {
        setAllTodos(newAllTodos);
        for (const id of idsToDelete) {
            syncableDelete('todos', id);
        }
    }
    setIsClearPastConfirmOpen(false);
  };


  const handleAddFolder = async (name: string): Promise<Folder | null> => {
      if (!user) return null;
      const tempId = -Date.now();
      const newFolder: Folder = { id: tempId, name, user_id: user.id, created_at: new Date().toISOString(), notes: [] };
      setFolders(f => [...f, newFolder]);
      await syncableCreate('folders', newFolder);
      return newFolder;
  };
  const handleUpdateFolder = async (folderId: number, name: string) => {
      const folderToUpdate = folders.find(f => f.id === folderId);
      if(!folderToUpdate) return;
      const updatedFolder = { ...folderToUpdate, name };
      setFolders(f => f.map(folder => folder.id === folderId ? updatedFolder : folder));
      await syncableUpdate('folders', updatedFolder);
  };
  const handleDeleteFolder = async (folderId: number) => {
      setFolders(f => f.filter(folder => folder.id !== folderId));
      await syncableDelete('folders', folderId);
  };
  
  const handleAddNote = async (folderId: number): Promise<Note | null> => {
    if (!user) return null;
    const tempId = -Date.now();
    const now = new Date().toISOString();
    const newNote: Note = { id: tempId, folder_id: folderId, user_id: user.id, title: 'Nueva Nota', content: '', created_at: now, updated_at: now };
    setNotes(n => [...n, newNote]);
    await syncableCreate('notes', newNote);
    return newNote;
  };

  const handleUpdateNote = async (note: Note) => {
    const updatedNote = { ...note, updated_at: new Date().toISOString() };
    setNotes(n => n.map(item => item.id === note.id ? updatedNote : item));
    await syncableUpdate('notes', updatedNote);
  };

  const handleDeleteNote = async (noteId: number, folderId: number) => {
    setNotes(n => n.filter(item => item.id !== noteId));
    await syncableDelete('notes', noteId);
  };
  
  const handleAddPlaylist = async (playlistData: Omit<Playlist, 'id'|'user_id'|'created_at'>) => {
    if (!user) return;
    const tempId = -Date.now();
    const newPlaylist = { ...playlistData, id: tempId, user_id: user.id, created_at: new Date().toISOString() };
    setPlaylists(p => [...p, newPlaylist]);
    await syncableCreate('playlists', newPlaylist);
  };
  const handleUpdatePlaylist = async (playlist: Playlist) => {
      setPlaylists(p => p.map(item => item.id === playlist.id ? playlist : item));
      await syncableUpdate('playlists', playlist);
  };
  const handleDeletePlaylist = async (playlistId: number) => {
      setPlaylists(p => p.filter(item => item.id !== playlistId));
      await syncableDelete('playlists', playlistId);
  };
  
  const handleAddQuickNote = async (text: string) => {
      if(!user) return;
      const tempId = -Date.now();
      const newNote: QuickNote = { id: tempId, text, user_id: user.id, created_at: new Date().toISOString() };
      setQuickNotes(qn => [...qn, newNote]);
      await syncableCreate('quick_notes', newNote);
  };
  const handleDeleteQuickNote = async (id: number) => {
      setQuickNotes(qn => qn.filter(note => note.id !== id));
      await syncableDelete('quick_notes', id);
  };
  const handleClearAllQuickNotes = async () => {
    if(!user) return;
    setQuickNotes([]);
    await syncableDeleteAll('quick_notes', user.id);
  };

  // --- Google Drive Integration (unchanged, as it needs to be online) ---
  const gapiLoadCallback = useCallback(() => {
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        clientId: CLIENT_ID,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
      setGapiReady(true);
    });
  }, []);

  const gisLoadCallback = useCallback(() => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          setGdriveToken(tokenResponse.access_token);
          window.gapi.client.setToken(tokenResponse);
        }
      },
    });
    (window as any).tokenClient = tokenClient;
  }, []);
  
  useEffect(() => {
    const scriptGapi = document.createElement('script');
    scriptGapi.src = 'https://apis.google.com/js/api.js';
    scriptGapi.async = true;
    scriptGapi.defer = true;
    scriptGapi.onload = gapiLoadCallback;
    document.body.appendChild(scriptGapi);

    const scriptGis = document.createElement('script');
    scriptGis.src = 'https://accounts.google.com/gsi/client';
    scriptGis.async = true;
    scriptGis.defer = true;
    scriptGis.onload = gisLoadCallback;
    document.body.appendChild(scriptGis);

    return () => {
        document.body.removeChild(scriptGapi);
        document.body.removeChild(scriptGis);
    }
  }, [gapiLoadCallback, gisLoadCallback]);

  const handleAuthClick = () => {
    if ((window as any).tokenClient) {
      (window as any).tokenClient.requestAccessToken({ prompt: 'consent' });
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
  
  const loadFilesFromDrive = useCallback(async (folderName: 'gallery' | 'backgrounds') => {
      if (!gdriveToken) return;
      if (folderName === 'gallery') setGalleryIsLoading(true);
      else setBackgroundsAreLoading(true);

      try {
          const parentFolderId = await findOrCreateAppFolder();
          if (!parentFolderId) throw new Error("Could not access app folder.");
          
          let subFolderId: string | null = null;
          const folderResponse = await window.gapi.client.drive.files.list({ q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`, fields: 'files(id)' });
          if(folderResponse.result.files && folderResponse.result.files.length > 0) {
              subFolderId = folderResponse.result.files[0].id!;
          } else {
              const subFolderMeta = { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] };
              const createSubResponse = await window.gapi.client.drive.files.create({ resource: subFolderMeta, fields: 'id' });
              subFolderId = createSubResponse.result.id!;
          }

          if(!subFolderId) throw new Error(`Could not access ${folderName} folder.`);
          
          const filesResponse = await window.gapi.client.drive.files.list({ q: `'${subFolderId}' in parents and trashed=false`, fields: 'files(id, name, webViewLink, appProperties)' });
          const files = filesResponse.result.files || [];

          if(folderName === 'gallery') {
              const images: GalleryImage[] = files.map(file => ({ id: file.id!, url: file.webViewLink!.replace('view?usp=drivesdk', 'uc?export=view&id=') }));
              setGalleryImages(images);
          } else {
              const backgrounds: Background[] = files.map(file => ({
                  id: file.id!,
                  name: file.name!,
                  url: file.webViewLink!.replace('view?usp=drivesdk', 'uc?export=view&id='),
                  type: file.name!.toLowerCase().endsWith('.mp4') ? 'video' : 'image',
                  isFavorite: file.appProperties?.isFavorite === 'true'
              }));
              setUserBackgrounds(backgrounds);
              
              if(savedActiveBgId) {
                const bgToActivate = backgrounds.find(bg => bg.id === savedActiveBgId);
                if(bgToActivate) setActiveBackground(bgToActivate);
              }
          }

      } catch (error) { console.error(`Error loading ${folderName}:`, error); }
      finally {
          if (folderName === 'gallery') setGalleryIsLoading(false);
          else setBackgroundsAreLoading(false);
      }
  }, [gdriveToken, findOrCreateAppFolder, savedActiveBgId]);
  
  useEffect(() => {
      if (gdriveToken && isOnline) {
          loadFilesFromDrive('gallery');
          loadFilesFromDrive('backgrounds');
      }
  }, [gdriveToken, loadFilesFromDrive, isOnline]);
  
  const uploadFileToDrive = useCallback(async (file: File, folderName: 'gallery' | 'backgrounds'): Promise<any> => {
      const parentFolderId = await findOrCreateAppFolder();
      if (!parentFolderId) throw new Error("No parent folder");
      
      let subFolderId: string | null = null;
      const folderResponse = await window.gapi.client.drive.files.list({ q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`, fields: 'files(id)' });
      subFolderId = folderResponse.result.files?.[0]?.id || null;
      if (!subFolderId) {
          const subFolderMeta = { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] };
          const createSubResponse = await window.gapi.client.drive.files.create({ resource: subFolderMeta, fields: 'id' });
          subFolderId = createSubResponse.result.id!;
      }

      const metadata = { name: file.name, parents: [subFolderId] };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${gdriveToken}` },
          body: form,
      });
      return response.json();
  }, [gdriveToken, findOrCreateAppFolder]);

  const handleAddGalleryImages = async (files: File[]) => {
      setGalleryIsLoading(true);
      try {
          const uploadPromises = files.map(file => uploadFileToDrive(file, 'gallery'));
          await Promise.all(uploadPromises);
          await loadFilesFromDrive('gallery');
      } catch (error) { console.error("Error uploading images:", error); }
      finally { setGalleryIsLoading(false); }
  };
  const handleDeleteFile = async (id: string, folderName: 'gallery' | 'backgrounds') => {
      try {
          await window.gapi.client.drive.files.delete({ fileId: id });
          if(folderName === 'gallery') setGalleryImages(i => i.filter(img => img.id !== id));
          else {
              setUserBackgrounds(bgs => bgs.filter(bg => bg.id !== id));
              if(activeBackground?.id === id) setActiveBackground(null);
          }
      } catch (error) { console.error(`Error deleting ${folderName} item:`, error); }
  };
  
  const handleAddBackground = async (file: File) => {
      setBackgroundsAreLoading(true);
      try {
          await uploadFileToDrive(file, 'backgrounds');
          await loadFilesFromDrive('backgrounds');
      } catch (error) { console.error("Error uploading background:", error); }
      finally { setBackgroundsAreLoading(false); }
  };
  const handleToggleFavoriteBackground = async (id: string) => {
    const bg = userBackgrounds.find(b => b.id === id);
    if (!bg) return;
    const isFavorite = !bg.isFavorite;
    try {
        await window.gapi.client.drive.files.update({
            fileId: id,
            appProperties: { isFavorite: String(isFavorite) },
        });
        setUserBackgrounds(bgs => bgs.map(b => b.id === id ? { ...b, isFavorite } : b));
    } catch (error) { console.error("Error favoriting background:", error); }
  };
  
  // Active Background Persistence
  useEffect(() => {
    if (user && dataLoaded) {
        if(activeBackground) set('settings', { key: 'activeBackgroundId', value: activeBackground.id });
        else set('settings', { key: 'activeBackgroundId', value: null });
    }
  }, [activeBackground, user, dataLoaded]);

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
  
  if (isQuickCapturePage) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-secondary-light to-primary-light flex items-center justify-center p-4">
            <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-xl p-8 text-center animate-pop-in">
                {quickCaptureStatus.status === 'loading' && (
                    <>
                        <ChickenIcon className="w-16 h-16 text-primary mx-auto animate-pulse" />
                        <p className="mt-4 font-semibold text-gray-700 dark:text-gray-300">Añadiendo tarea...</p>
                    </>
                )}
                {quickCaptureStatus.status === 'success' && (
                    <>
                        <h1 className="text-2xl font-bold text-primary-dark dark:text-primary">✅ ¡Tarea Añadida!</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">"{quickCaptureStatus.text}" se ha guardado.</p>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Ya puedes cerrar esta ventana.</p>
                    </>
                )}
                {quickCaptureStatus.status === 'error' && (
                    <>
                         <h1 className="text-2xl font-bold text-red-500">❌ Error al Añadir</h1>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">No se pudo guardar la tarea. Asegúrate de haber iniciado sesión en la app e inténtalo de nuevo.</p>
                    </>
                )}
            </div>
        </div>
    );
  }

  if (authLoading || (user && !dataLoaded)) {
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
    isOnline, isSyncing, currentUser: user, onLogout: handleLogout, theme, toggleTheme, themeColors, onThemeColorChange: handleThemeColorChange, onResetThemeColors: handleResetThemeColors,
    allTodos, folders: foldersWithNotes, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
    pomodoroState, activeBackground, particleType, ambientSound, dailyEncouragementLocalHour,
    activeTrack, activeSpotifyTrack,
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos: () => setIsClearPastConfirmOpen(true),
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound, onSetDailyEncouragement: handleSetDailyEncouragement,
    setActiveTrack, setActiveSpotifyTrack,
    gdriveToken, galleryIsLoading, backgroundsAreLoading, handleAuthClick,
    handleAddGalleryImages, handleDeleteGalleryImage: (id) => handleDeleteFile(id, 'gallery'),
    handleAddBackground, handleDeleteBackground: (id) => handleDeleteFile(id, 'backgrounds'),
    handleToggleFavoriteBackground, gapiReady,
    isSubscribed, isPermissionBlocked, handleNotificationAction,
  };

  return (
    <>
      {isMobile ? <MobileApp {...appProps} /> : <DesktopApp {...appProps} />}
      <InstallPwaBanner 
        show={showInstallBanner} 
        isIos={isIos} 
        onInstall={handleInstallPwa} 
        onDismiss={handleDismissPwaBanner} 
      />
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
        message={`¿Seguro que quieres eliminar todas las tareas anteriores al ${selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}? Esta acción es permanente.`}
        confirmText="Sí, limpiar"
        cancelText="Cancelar"
      />
    </>
  );
};

export default App;