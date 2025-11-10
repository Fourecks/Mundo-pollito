import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Todo, Folder, Background, Playlist, WindowType, WindowState, GalleryImage, Subtask, QuickNote, ParticleType, AmbientSoundType, Note, ThemeColors, BrowserSession, SupabaseUser } from './types';
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
import { initDB } from './db';
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

// --- Google Drive Configuration ---
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (process.env as any).GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'Lista de Tareas App Files';

// --- OneSignal Configuration ---
const ONE_SIGNAL_APP_ID = (import.meta as any).env?.VITE_ONE_SIGNAL_APP_ID || (process.env as any).ONE_SIGNAL_APP_ID || config.ONE_SIGNAL_APP_ID;

const pomodoroAudioSrc = "data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAYAAAAD//wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A";


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
    const { frequency, customDays } = sourceTodo.recurrence;
    const recurrenceId = sourceTodo.recurrence.id!;

    // 1. Calculate all potential future dates
    let lastDueDate = new Date(sourceTodo.due_date + 'T00:00:00Z');
    const limitDate = new Date();
    switch (frequency) {
        case 'daily': limitDate.setMonth(limitDate.getMonth() + 1); break;
        case 'weekly': case 'biweekly': case 'custom': limitDate.setMonth(limitDate.getMonth() + 3); break;
        case 'monthly': limitDate.setMonth(limitDate.getMonth() + 6); break;
        default: limitDate.setDate(limitDate.getDate() + 90);
    }

    const potentialDates: Date[] = [];
    let loopGuard = 0; // Prevent infinite loops
    while (lastDueDate < limitDate && loopGuard < 365) {
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
  // Handlers
  handleAddTodo: (text: string) => Promise<void>;
  handleUpdateTodo: (updatedTodo: Todo) => Promise<void>;
  handleToggleTodo: (id: number, onAllCompleted: (quote: string) => void) => Promise<void>;
  handleToggleSubtask: (taskId: number, subtaskId: number, onAllCompleted: (quote: string) => void) => Promise<void>;
  handleDeleteTodo: (id: number) => Promise<void>;
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
    currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
    allTodos, folders, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
    pomodoroState, activeBackground, particleType, ambientSound, dailyEncouragementLocalHour,
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo,
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound, onSetDailyEncouragement,
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
  const [activeTrack, setActiveTrack] = useState<Playlist | null>(null);
  const [activeSpotifyTrack, setActiveSpotifyTrack] = useState<Playlist | null>(null);
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
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-secondary-light via-primary-light to-secondary-lighter dark:from-gray-800 dark:via-primary/50 dark:to-gray-900 -z-30"/>
        )}
        
        {pomodoroState.isActive && pomodoroState.showBackgroundTimer && <BackgroundTimer timeLeft={pomodoroState.timeLeft} opacity={pomodoroState.backgroundTimerOpacity} />}
        <ParticleLayer type={particleType} />

      <header className="fixed top-4 right-4 z-[70000] flex flex-col items-end gap-3">
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
        dailyEncouragementLocalHour={dailyEncouragementLocalHour}
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
              <TodoListModule todos={todayTodos} addTodo={handleAddTodo} toggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)} deleteTodo={handleDeleteTodo} updateTodo={handleUpdateTodo} onEditTodo={setTaskToEdit} selectedDate={selectedDate} setSelectedDate={setSelectedDate} datesWithTasks={datesWithTasks} datesWithAllTasksCompleted={datesWithAllTasksCompleted} />
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
      currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
      allTodos, folders, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
      pomodoroState, activeBackground, particleType, ambientSound, dailyEncouragementLocalHour,
      handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo,
      handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
      handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
      handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
      setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound, onSetDailyEncouragement,
      gdriveToken, galleryIsLoading, backgroundsAreLoading, handleAuthClick,
      handleAddGalleryImages, handleDeleteGalleryImage, handleAddBackground, handleDeleteBackground, handleToggleFavoriteBackground,
      isSubscribed, isPermissionBlocked, handleNotificationAction
    } = props;

    // Local UI state for Mobile
    const [activeTab, setActiveTab] = useState('home');
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionQuote, setCompletionQuote] = useState('');
    const [activeTrack, setActiveTrack] = useState<Playlist | null>(null);
    const [activeSpotifyTrack, setActiveSpotifyTrack] = useState<Playlist | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
    const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
    const [isAiBrowserOpen, setIsAiBrowserOpen] = useState(false);
    const [isCustomizationPanelOpen, setIsCustomizationPanelOpen] = useState(false);
    
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
                        <MobileHeader title="Hoy" />
                        <div className="p-4 space-y-3">
                            <Greeting name={capitalizedUserName} />
                             <MobilePomodoroWidget timeLeft={pomodoroState.timeLeft} isActive={pomodoroState.isActive} mode={pomodoroState.mode} onToggle={handlePomodoroToggle} onOpenModal={() => setIsPomodoroModalOpen(true)} />
                            <BibleVerse />
                            <TodaysAgenda tasks={todayAgendaTasks} onToggleTask={(id) => handleToggleTodo(id, handleShowCompletionModal)} onToggleSubtask={(taskId, subtaskId) => handleToggleSubtask(taskId, subtaskId, handleShowCompletionModal)} quickNotes={quickNotes} onAddQuickNote={handleAddQuickNote} onDeleteQuickNote={handleDeleteQuickNote} onClearAllQuickNotes={handleClearAllQuickNotes} />
                        </div>
                    </>
                );
            case 'tasks':
                return (
                    <div className="flex flex-col h-full">
                        <TodoListModule isMobile={true} todos={todayTodos} addTodo={handleAddTodo} toggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)} deleteTodo={handleDeleteTodo} updateTodo={handleUpdateTodo} onEditTodo={setTaskToEdit} selectedDate={selectedDate} setSelectedDate={setSelectedDate} datesWithTasks={datesWithTasks} datesWithAllTasksCompleted={datesWithAllTasksCompleted} />
                    </div>
                );
            case 'notes':
                return (
                    <div className="h-full">
                      <NotesSection isMobile={true} folders={folders} onAddFolder={handleAddFolder} onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />
                    </div>
                );
            case 'gallery':
                return (
                    <div className="flex flex-col h-full">
                        <MobileHeader title="Galería" />
                        <ImageGallery isMobile={true} images={galleryImages} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} isSignedIn={!!gdriveToken} onAuthClick={handleAuthClick} isGapiReady={props.gapiReady} isLoading={galleryIsLoading} />
                    </div>
                );
            case 'games':
                return (
                    <div className="h-full">
                        <MobileHeader title="Centro de Juegos" />
                        <GamesHub galleryImages={galleryImages} isMobile={true} currentUser={capitalizedUserName} />
                    </div>
                );
            case 'more':
                return (
                     <>
                        <MobileHeader title="Más Opciones" />
                        <div className="p-4 space-y-4">
                            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-2xl shadow-lg flex justify-between items-center">
                                <h3 className="font-bold text-primary-dark dark:text-primary">Tema</h3>
                                <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
                            </div>
                             <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-2xl shadow-lg">
                                <button onClick={() => setIsCustomizationPanelOpen(true)} className="w-full flex justify-between items-center text-left">
                                  <div>
                                    <h3 className="font-bold text-primary-dark dark:text-primary">Personalización</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Colores, fondos, sonidos y efectos.</p>
                                  </div>
                                  <ChevronRightIcon />
                                </button>
                            </div>
                            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-2xl shadow-lg">
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
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-secondary-light via-primary-light to-secondary-lighter dark:from-gray-800 dark:via-primary/50 dark:to-gray-900 -z-30"/>
            )}
            <ParticleLayer type={particleType} />

            <main className="flex-grow overflow-y-auto pb-28">
                {renderContent()}
            </main>
            
            <button onClick={() => setIsAiBrowserOpen(true)} className="mobile-ai-button fixed bottom-24 right-4 bg-primary text-white rounded-full p-4 shadow-lg z-40">
                <ChickenIcon className="w-6 h-6" />
            </button>
            
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
              dailyEncouragementLocalHour={dailyEncouragementLocalHour}
              onSetDailyEncouragement={onSetDailyEncouragement}
            />
            <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} quote={completionQuote}/>
            <TaskDetailsModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} onSave={handleUpdateTodo} todo={taskToEdit} />
            
            {isAiBrowserOpen && (
                <div className="fixed inset-0 bg-secondary-lighter/90 dark:bg-gray-900 z-[100] animate-deploy">
                    {/* FIX: Correctly pass `setBrowserSession` prop instead of undefined `setSession`. */}
                    <Browser session={browserSession} setSession={setBrowserSession} onClose={() => setIsAiBrowserOpen(false)} currentUser={currentUser} />
                </div>
            )}

            <ModalWindow isOpen={isPomodoroModalOpen} onClose={() => setIsPomodoroModalOpen(false)} title="Pomodoro" className="w-full max-w-sm" isDraggable={false} isResizable={false}>
                <Pomodoro
                    timeLeft={pomodoroState.timeLeft}
                    isActive={pomodoroState.isActive}
                    mode={pomodoroState.mode}
                    durations={pomodoroState.durations}
                    onToggle={handlePomodoroToggle}
                    onReset={() => { setPomodoroState(s => ({ ...s, timeLeft: s.durations[s.mode], isActive: false, endTime: null })); }}
                    onSwitchMode={(mode) => { setPomodoroState(s => ({ ...s, mode, timeLeft: s.durations[mode], isActive: false, endTime: null })); }}
                    onSaveSettings={(d) => { setPomodoroState(s => ({ ...s, durations: d, timeLeft: d[s.mode], isActive: false, endTime: null })); }}
                    showBackgroundTimer={pomodoroState.showBackgroundTimer}
                    onToggleBackgroundTimer={() => setPomodoroState(s => ({...s, showBackgroundTimer: !s.showBackgroundTimer}))}
                    backgroundTimerOpacity={pomodoroState.backgroundTimerOpacity}
                    onSetBackgroundTimerOpacity={op => setPomodoroState(s => ({...s, backgroundTimerOpacity: op}))}
                  />
            </ModalWindow>

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
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeColors, setThemeColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  const settingsSaveTimeout = useRef<number | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // --- ALL SHARED STATE MOVED HERE ---
  const [allTodos, setAllTodos] = useState<{ [key: string]: Todo[] }>({});
  const [folders, setFolders] = useState<Folder[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [browserSession, setBrowserSession] = useState<BrowserSession>({});
  const [selectedDate, setSelectedDate] = useState(new Date());

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
        // Debounce saving to localStorage
        if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current);
        settingsSaveTimeout.current = window.setTimeout(() => {
          if (user) {
              localStorage.setItem(getUserKey('themeColors'), JSON.stringify(newColors));
          }
        }, 500);
        return newColors;
    });
  }, [applyThemeColors, getUserKey, user]);

  const handleResetThemeColors = useCallback(() => {
    setThemeColors(DEFAULT_COLORS);
    applyThemeColors(DEFAULT_COLORS);
    if(user) localStorage.removeItem(getUserKey('themeColors'));
  }, [applyThemeColors, getUserKey, user]);
  
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
        const savedColors = localStorage.getItem(getUserKey('themeColors'));
        const initialColors = savedColors ? JSON.parse(savedColors) : DEFAULT_COLORS;
        setThemeColors(initialColors);
        applyThemeColors(initialColors);
    } else {
        applyThemeColors(DEFAULT_COLORS);
    }
}, [user, getUserKey, applyThemeColors]);

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
            setAllTodos({}); setFolders([]); setPlaylists([]); setQuickNotes([]);
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

  const loadData = useCallback(async () => {
    if (!user) return;
    
    // Todos, Subtasks, and Folders/Notes
    const [
      { data: todosData, error: todosError },
      { data: foldersData, error: foldersError },
      { data: playlistsData, error: playlistsError },
      { data: quickNotesData, error: quickNotesError },
      { data: profileData, error: profileError }
    ] = await Promise.all([
      supabase.from('todos').select('*, subtasks(*)').order('created_at'),
      supabase.from('folders').select('*, notes(*)').order('created_at').order('created_at', { foreignTable: 'notes', ascending: true }),
      supabase.from('playlists').select('*').order('created_at'),
      supabase.from('quick_notes').select('*').order('created_at'),
      supabase.from('profiles').select('daily_encouragement_hour_local').eq('id', user.id).single(),
    ]);

    // Persist timezone offset to profile
    const currentUserTimezoneOffset = new Date().getTimezoneOffset();
    const { error: profileUpdateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, timezone_offset: currentUserTimezoneOffset });
    if (profileUpdateError) {
        console.error("Error saving user timezone:", profileUpdateError);
    }

    if (todosError) console.error("Error loading todos:", todosError);
    else if (todosData) {
        const todosByDate: { [key: string]: Todo[] } = {};
        todosData.forEach(todo => {
            const dateKey = todo.due_date ? todo.due_date : formatDateKey(new Date(todo.created_at));
            if (!todosByDate[dateKey]) todosByDate[dateKey] = [];
            todosByDate[dateKey].push(todo);
        });
        setAllTodos(todosByDate);
    }
    
    if (foldersError) console.error("Error loading folders:", foldersError);
    else setFolders(foldersData || []);

    if (playlistsError) console.error("Error loading playlists:", playlistsError);
    else setPlaylists(playlistsData || []);
    
    if (quickNotesError) console.error("Error loading quick notes:", quickNotesError);
    else setQuickNotes(quickNotesData || []);
    
    if (profileError && profileError.code !== 'PGRST116') { // Ignore "no rows" error
      console.error("Error loading profile data:", profileError);
    } else if (profileData) {
      setDailyEncouragementLocalHour(profileData.daily_encouragement_hour_local);
    }
    
    // Load local settings
    try {
        const storedPomodoro = localStorage.getItem(getUserKey('pomodoroState'));
        if (storedPomodoro) {
            const parsed = JSON.parse(storedPomodoro);
            // FIX: The original logic was subtly flawed. This new implementation is more robust.
            // It explicitly merges saved durations with defaults and ensures timeLeft is correctly
            // reset to the full duration based on the final loaded settings.
            setPomodoroState(s => {
                const finalDurations = parsed.durations || s.durations;
                const finalMode = parsed.mode || s.mode;
                return {
                    ...s,
                    ...parsed,
                    durations: finalDurations,
                    mode: finalMode,
                    timeLeft: finalDurations[finalMode],
                    isActive: false,
                    endTime: null,
                };
            });
        }

        const storedActiveBgId = localStorage.getItem(getUserKey('activeBackgroundId'));
        if (storedActiveBgId) setSavedActiveBgId(storedActiveBgId);

        const storedParticles = localStorage.getItem(getUserKey('particleType'));
        if (storedParticles) setParticleType(storedParticles as ParticleType);
        
        const storedAmbience = localStorage.getItem(getUserKey('ambientSound'));
        if (storedAmbience) setAmbientSound(JSON.parse(storedAmbience));

        const storedBrowserSession = localStorage.getItem(getUserKey('browserSession'));
        if (storedBrowserSession) setBrowserSession(JSON.parse(storedBrowserSession));
    } catch(e) { console.error("Error parsing settings from localStorage:", e); }

    setDataLoaded(true);
  }, [user, getUserKey]);

  useEffect(() => {
      if (user && !dataLoaded) {
          initDB(user.email!);
          loadData();
      }
  }, [user, dataLoaded, loadData]);

  // --- Settings Persistence ---
  useEffect(() => { 
    if (user) {
        const { endTime, ...stateToSave } = pomodoroState; // Don't persist endTime
        localStorage.setItem(getUserKey('pomodoroState'), JSON.stringify(stateToSave));
    }
  }, [pomodoroState, getUserKey, user]);
  useEffect(() => { if (user) localStorage.setItem(getUserKey('particleType'), particleType); }, [particleType, getUserKey, user]);
  useEffect(() => { if (user) localStorage.setItem(getUserKey('ambientSound'), JSON.stringify(ambientSound)); }, [ambientSound, getUserKey, user]);
  useEffect(() => { if (user) localStorage.setItem(getUserKey('browserSession'), JSON.stringify(browserSession)); }, [browserSession, getUserKey, user]);

  const handleSetDailyEncouragement = async (localHour: number | null) => {
    if (!user) return;
    
    // Optimistic UI update
    setDailyEncouragementLocalHour(localHour);

    const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, daily_encouragement_hour_local: localHour });

    if (error) {
        console.error("Error saving daily encouragement time:", error);
    }
  }
  
  // --- Data Handlers ---
  const handleAddTodo = async (text: string) => {
    if (!user) return;
    const dateKey = formatDateKey(selectedDate);
    const newTodo: Omit<Todo, 'id' | 'created_at'> = { text, completed: false, priority: 'medium', due_date: dateKey, user_id: user.id };
    const { data, error } = await supabase.from('todos').insert(newTodo).select('*, subtasks(*)').single();
    if (error) console.error("Error adding todo:", error);
    else if (data) {
        setAllTodos(currentTodos => ({
            ...currentTodos,
            [dateKey]: [...(currentTodos[dateKey] || []), data]
        }));
    }
  };

  const handleUpdateTodo = async (updatedTodo: Todo) => {
      const { subtasks, ...todoForUpdate } = updatedTodo;
      const { error } = await supabase.from('todos').update(todoForUpdate).eq('id', updatedTodo.id);
      if (error) { console.error("Error updating todo:", error); return; }

      const dateKey = updatedTodo.due_date || formatDateKey(new Date(updatedTodo.created_at!));
      setAllTodos(current => {
          const newAllTodos = JSON.parse(JSON.stringify(current));
          const todosForDate = newAllTodos[dateKey] || [];
          const index = todosForDate.findIndex((t: Todo) => t.id === updatedTodo.id);
          if (index > -1) {
              todosForDate[index] = updatedTodo;
              newAllTodos[dateKey] = todosForDate;
          }
          return newAllTodos;
      });

      if (subtasks) {
          const updates = subtasks.filter(st => st.id > 0);
          const inserts = subtasks.filter(st => st.id <= 0).map(st => ({ text: st.text, completed: st.completed, todo_id: updatedTodo.id }));
          if(updates.length > 0) await supabase.from('subtasks').upsert(updates);
          if(inserts.length > 0) await supabase.from('subtasks').insert(inserts);
      }
  };

  const handleToggleTodo = async (id: number, onAllCompleted: (quote: string) => void) => {
    let dateKey = '';
    let todoToToggle: Todo | undefined;
    for (const key in allTodos) {
      const foundTodo = allTodos[key].find(t => t.id === id);
      if (foundTodo) {
        dateKey = key;
        todoToToggle = foundTodo;
        break;
      }
    }
    if (!todoToToggle || !dateKey) return;
    
    const wasCompleted = todoToToggle.completed;
    const newCompletedState = !wasCompleted;

    const updatedTodo = { ...todoToToggle, completed: newCompletedState };
    setAllTodos(current => {
      const newAllTodos = { ...current };
      newAllTodos[dateKey] = newAllTodos[dateKey].map(t => t.id === id ? updatedTodo : t);
      return newAllTodos;
    });

    const { error } = await supabase.from('todos').update({ completed: newCompletedState }).eq('id', id);
    if (error) console.error("Error toggling todo:", error);

    // Generate recurring tasks if needed
    if (newCompletedState && updatedTodo.recurrence && updatedTodo.recurrence.frequency !== 'none') {
        const newTodos = await generateRecurringTasks(updatedTodo, allTodos);
        setAllTodos(newTodos);
    }
    
    if (newCompletedState && allTodos[dateKey].every(t => (t.id === id ? newCompletedState : t.completed))) {
        triggerConfetti();
        onAllCompleted(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
    }
  };
  
  const handleToggleSubtask = async (taskId: number, subtaskId: number, onAllCompleted: (quote: string) => void) => {
      let dateKey = '';
      let todoToUpdate: Todo | undefined;
      for (const key in allTodos) {
          const foundTodo = allTodos[key].find(t => t.id === taskId);
          if (foundTodo) {
              dateKey = key;
              todoToUpdate = foundTodo;
              break;
          }
      }
      if (!todoToUpdate || !dateKey) return;

      const newSubtasks = todoToUpdate.subtasks?.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
      if (!newSubtasks) return;
      
      const allSubtasksCompleted = newSubtasks.every(st => st.completed);
      const parentCompleted = allSubtasksCompleted;

      const updatedTodo = { ...todoToUpdate, subtasks: newSubtasks, completed: parentCompleted };

      setAllTodos(current => ({
          ...current,
          [dateKey]: current[dateKey].map(t => t.id === taskId ? updatedTodo : t),
      }));
      
      const subtaskToUpdate = newSubtasks.find(st => st.id === subtaskId);
      if (subtaskToUpdate) {
          const { error } = await supabase.from('subtasks').update({ completed: subtaskToUpdate.completed }).eq('id', subtaskId);
          if (error) console.error("Error updating subtask:", error);
      }
      
      if (todoToUpdate.completed !== parentCompleted) {
          const { error: todoError } = await supabase.from('todos').update({ completed: parentCompleted }).eq('id', taskId);
          if (todoError) console.error("Error updating parent todo status:", todoError);

          if (parentCompleted && allTodos[dateKey].every(t => (t.id === taskId ? parentCompleted : t.completed))) {
              triggerConfetti();
              onAllCompleted(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
          }
      }
  };

  const handleDeleteTodo = async (id: number) => {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) {
          console.error("Error deleting todo:", error);
      } else {
          setAllTodos(currentTodos => {
              const newAllTodos = { ...currentTodos };
              for (const dateKey in newAllTodos) {
                  const initialLength = newAllTodos[dateKey].length;
                  newAllTodos[dateKey] = newAllTodos[dateKey].filter(t => t.id !== id);
                  if (newAllTodos[dateKey].length !== initialLength) break;
              }
              return newAllTodos;
          });
      }
  };

  const handleAddFolder = async (name: string): Promise<Folder | null> => {
      if (!user) return null;
      const { data, error } = await supabase.from('folders').insert({ name, user_id: user.id }).select().single();
      if (error) { console.error("Error adding folder:", error); return null; }
      if (data) {
          setFolders(f => [...f, { ...data, notes: [] }]);
          return { ...data, notes: [] };
      }
      return null;
  };
  const handleUpdateFolder = async (folderId: number, name: string) => {};
  const handleDeleteFolder = async (folderId: number) => {};
  
  const handleAddNote = async (folderId: number): Promise<Note | null> => {
    if (!user) return null;
    const newNote = { folder_id: folderId, user_id: user.id, title: 'Nueva Nota', content: '' };
    const { data, error } = await supabase.from('notes').insert(newNote).select().single();
    if (error) { console.error("Error adding note:", error); return null; }
    if (data) {
        setFolders(currentFolders => currentFolders.map(f => f.id === folderId ? { ...f, notes: [...f.notes, data] } : f));
        return data;
    }
    return null;
  };

  const handleUpdateNote = async (note: Note) => {
    const { error } = await supabase.from('notes').update({ title: note.title, content: note.content, updated_at: new Date().toISOString() }).eq('id', note.id);
    if (error) { console.error("Error updating note:", error); }
    else {
        setFolders(currentFolders => currentFolders.map(f => f.id === note.folder_id ? { ...f, notes: f.notes.map(n => n.id === note.id ? note : n) } : f));
    }
  };

  const handleDeleteNote = async (noteId: number, folderId: number) => {
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (error) { console.error("Error deleting note:", error); }
    else {
        setFolders(currentFolders => currentFolders.map(f => f.id === folderId ? { ...f, notes: f.notes.filter(n => n.id !== noteId) } : f));
    }
  };
  
  const handleAddPlaylist = async (playlistData: Omit<Playlist, 'id'|'user_id'|'created_at'>) => {
    if (!user) return;
    const { data, error } = await supabase.from('playlists').insert({...playlistData, user_id: user.id}).select().single();
    if (error) console.error("Error adding playlist:", error);
    else if(data) setPlaylists(p => [...p, data]);
  };
  const handleUpdatePlaylist = async (playlist: Playlist) => {
      const { error } = await supabase.from('playlists').update(playlist).eq('id', playlist.id);
      if (error) console.error("Error updating playlist:", error);
      else setPlaylists(p => p.map(item => item.id === playlist.id ? playlist : item));
  };
  const handleDeletePlaylist = async (playlistId: number) => {
      const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
      if (error) console.error("Error deleting playlist:", error);
      else setPlaylists(p => p.filter(item => item.id !== playlistId));
  };
  
  const handleAddQuickNote = async (text: string) => {
      if(!user) return;
      const {data, error} = await supabase.from('quick_notes').insert({text, user_id: user.id}).select().single();
      if(error) console.error("Error adding quick note:", error);
      else if (data) setQuickNotes(qn => [...qn, data]);
  };
  const handleDeleteQuickNote = async (id: number) => {
      const {error} = await supabase.from('quick_notes').delete().eq('id', id);
      if(error) console.error("Error deleting quick note:", error);
      else setQuickNotes(qn => qn.filter(note => note.id !== id));
  };
  const handleClearAllQuickNotes = async () => {
    if(!user) return;
    const {error} = await supabase.from('quick_notes').delete().eq('user_id', user.id);
    if(error) console.error("Error clearing all quick notes:", error);
    else setQuickNotes([]);
  };

  // --- Google Drive Integration ---
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
      if (gdriveToken) {
          loadFilesFromDrive('gallery');
          loadFilesFromDrive('backgrounds');
      }
  }, [gdriveToken, loadFilesFromDrive]);
  
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
    if (user) {
        if(activeBackground) localStorage.setItem(getUserKey('activeBackgroundId'), activeBackground.id);
        else localStorage.removeItem(getUserKey('activeBackgroundId'));
    }
  }, [activeBackground, user, getUserKey]);

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
              } else {
                  // No need for an alert, the push notification is the confirmation
              }
          });
      } else {
          // This will trigger the native browser prompt.
          await OneSignal.User.PushSubscription.optIn();
      }
  };
  

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
    currentUser: user, onLogout: handleLogout, theme, toggleTheme, themeColors, onThemeColorChange: handleThemeColorChange, onResetThemeColors: handleResetThemeColors,
    allTodos, folders, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
    pomodoroState, activeBackground, particleType, ambientSound, dailyEncouragementLocalHour,
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo,
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound, onSetDailyEncouragement: handleSetDailyEncouragement,
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
    </>
  );
};

export default App;
