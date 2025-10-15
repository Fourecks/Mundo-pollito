
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

// --- Google Drive Configuration ---
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (process.env as any).GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'Lista de Tareas App Files';

// --- Web Push VAPID Key ---
const VAPID_PUBLIC_KEY = (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY || (process.env as any).VAPID_PUBLIC_KEY || config.VAPID_PUBLIC_KEY;

const pomodoroAudioSrc = "data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAYAAAAD//wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A";

// Helper to format date as YYYY-MM-DD key
const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
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
    pomodoroState, activeBackground, particleType, ambientSound,
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo,
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound,
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

  // Pomodoro Timer Effect
  useEffect(() => {
    let timer: number | undefined;
    if (pomodoroState.isActive && pomodoroState.timeLeft > 0) {
      timer = window.setInterval(() => {
        setPomodoroState(s => ({ ...s, timeLeft: s.timeLeft - 1 }));
      }, 1000);
    } else if (pomodoroState.isActive && pomodoroState.timeLeft <= 0) {
      pomodoroAudioRef.current?.play();
      const newMode = pomodoroState.mode === 'work' ? 'break' : 'work';
      const message = pomodoroState.mode === 'work' ? "¡Tiempo de descanso! Buen trabajo." : "¡De vuelta al trabajo! Tú puedes.";
      
      if (isSubscribed) {
        supabase.functions.invoke('send-notification', {
            body: {
                title: "Pomodoro Terminado",
                body: message,
            },
        });
      }

      setPomodoroState(s => ({
          ...s,
          mode: newMode,
          timeLeft: s.durations[newMode],
          isActive: true
      }));
    }
    return () => clearInterval(timer);
  }, [pomodoroState.isActive, pomodoroState.timeLeft, pomodoroState.mode, pomodoroState.durations, setPomodoroState, isSubscribed]);

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
  
  const handlePomodoroToggle = () => {
    setPomodoroState(s => {
      const isStarting = !s.isActive;
      if (isStarting && !pomodoroStartedRef.current) {
        pomodoroStartedRef.current = true;
        return { ...s, isActive: true, showBackgroundTimer: true };
      }
      return { ...s, isActive: isStarting };
    });
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
        onColorChange={onThemeColorChange}
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
                  <Pomodoro timeLeft={pomodoroState.timeLeft} isActive={pomodoroState.isActive} mode={pomodoroState.mode} durations={pomodoroState.durations} onToggle={handlePomodoroToggle} onReset={() => setPomodoroState(s => ({ ...s, timeLeft: s.durations[s.mode], isActive: false }))} onSwitchMode={(mode) => setPomodoroState(s => ({ ...s, mode, timeLeft: s.durations[mode], isActive: false }))} onSaveSettings={(d) => setPomodoroState(s => ({ ...s, durations: d, timeLeft: d[s.mode], isActive: false }))} showBackgroundTimer={pomodoroState.showBackgroundTimer} onToggleBackgroundTimer={() => setPomodoroState(s => ({...s, showBackgroundTimer: !s.showBackgroundTimer}))} backgroundTimerOpacity={pomodoroState.backgroundTimerOpacity} onSetBackgroundTimerOpacity={op => setPomodoroState(s => ({...s, backgroundTimerOpacity: op}))} />
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
      pomodoroState, activeBackground, particleType, ambientSound,
      handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo,
      handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
      handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
      handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
      setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound,
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
    
    // Pomodoro Timer Effect
    useEffect(() => {
        let timer: number | undefined;
        if (pomodoroState.isActive && pomodoroState.timeLeft > 0) {
          timer = window.setInterval(() => setPomodoroState(s => ({ ...s, timeLeft: s.timeLeft - 1 })), 1000);
        } else if (pomodoroState.isActive && pomodoroState.timeLeft <= 0) {
          pomodoroAudioRef.current?.play();
          const newMode = pomodoroState.mode === 'work' ? 'break' : 'work';
          const message = pomodoroState.mode === 'work' ? "¡Tiempo de descanso! Buen trabajo." : "¡De vuelta al trabajo! Tú puedes.";
          
          if (isSubscribed) {
            supabase.functions.invoke('send-notification', {
                body: {
                    title: "Pomodoro Terminado",
                    body: message,
                },
            });
          }
          
          setPomodoroState(s => ({ ...s, mode: newMode, timeLeft: s.durations[newMode], isActive: true }));
        }
        return () => clearInterval(timer);
    }, [pomodoroState.isActive, pomodoroState.timeLeft, pomodoroState.mode, pomodoroState.durations, setPomodoroState, isSubscribed]);

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

    const handlePomodoroToggle = () => setPomodoroState(s => ({ ...s, isActive: !s.isActive }));

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
              onColorChange={onThemeColorChange}
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
                    onReset={() => setPomodoroState(s => ({ ...s, timeLeft: s.durations[s.mode], isActive: false }))}
                    onSwitchMode={(mode) => setPomodoroState(s => ({ ...s, mode, timeLeft: s.durations[mode], isActive: false }))}
                    onSaveSettings={(d) => setPomodoroState(s => ({ ...s, durations: d, timeLeft: d[s.mode], isActive: false }))}
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

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}


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
  const [pomodoroState, setPomodoroState] = useState({
      timeLeft: 25 * 60,
      isActive: false,
      mode: 'work' as 'work' | 'break',
      durations: { work: 25 * 60, break: 5 * 60 },
      showBackgroundTimer: false,
      backgroundTimerOpacity: 50,
  });

  // Google Drive State
  const [gapiReady, setGapiReady] = useState(false);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [userBackgrounds, setUserBackgrounds] = useState<Background[]>([]);
  const [galleryIsLoading, setGalleryIsLoading] = useState(false);
  const [backgroundsAreLoading, setBackgroundsAreLoading] = useState(false);
  const appFolderId = useRef<string | null>(null);
  
  // Native Web Push State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);
  const serviceWorkerRegistration = useRef<ServiceWorkerRegistration | null>(null);

  // --- NATIVE WEB PUSH NOTIFICATIONS LOGIC ---
  useEffect(() => {
    window.addEventListener('load', () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const swUrl = new URL('sw.js', window.location.origin).href;
        navigator.serviceWorker.register(swUrl)
          .then(swReg => {
            console.log('Service Worker is registered', swReg);
            serviceWorkerRegistration.current = swReg;
            // Check initial permission and subscription status
            setIsPermissionBlocked(Notification.permission === 'denied');
            swReg.pushManager.getSubscription().then(subscription => {
              setIsSubscribed(!!subscription);
            });
          })
          .catch(error => {
            console.error('Service Worker Error', error);
          });
      } else {
        console.warn('Push messaging is not supported');
      }
    });
  }, []);

  const subscribeUser = async () => {
    if (!serviceWorkerRegistration.current || !user) return;
    try {
      const subscription = await serviceWorkerRegistration.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      console.log('User is subscribed.');

      // Save subscription to backend
      const { error } = await supabase.from('push_subscriptions').insert({
        subscription_data: subscription,
        user_id: user.id,
      });

      if (error) throw error;

      setIsSubscribed(true);
      setIsPermissionBlocked(false);
    } catch (err) {
      console.error('Failed to subscribe the user: ', err);
      if (Notification.permission === 'denied') {
        setIsPermissionBlocked(true);
      }
    }
  };

  const handleNotificationAction = async () => {
    if (isPermissionBlocked) {
      alert('Las notificaciones están bloqueadas. Por favor, habilítalas en la configuración de tu navegador para esta página.');
      return;
    }

    if (isSubscribed) {
      // Send a test notification
      console.log('Sending test notification...');
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          title: "¡Notificación de Prueba! 🐣",
          body: "Si ves esto, ¡las notificaciones nativas funcionan!",
        },
      });
      if (error) {
        alert("Error al enviar la notificación de prueba.");
        console.error("Error invoking test notification function:", error);
      } else {
        alert("Notificación de prueba enviada. Deberías recibirla en unos segundos.");
      }
    } else {
      await subscribeUser();
    }
  };


  // Client-side reminder polling
  useEffect(() => {
    if (!user || !isSubscribed) return;

    const intervalId = setInterval(async () => {
      const now = new Date();
      const todosToNotify: Todo[] = [];

      Object.values(allTodos).flat().forEach((todo: Todo) => {
        if (!todo.completed && !todo.notification_sent && todo.reminder_offset && todo.due_date && todo.start_time) {
          const [year, month, day] = todo.due_date.split('-').map(Number);
          const [hour, minute] = todo.start_time.split(':').map(Number);
          const startTime = new Date(year, month - 1, day, hour, minute);
          const reminderTime = new Date(startTime.getTime() - todo.reminder_offset * 60 * 1000);

          if (reminderTime <= now && (now.getTime() - reminderTime.getTime()) < 60000) {
            todosToNotify.push(todo);
          }
        }
      });

      if (todosToNotify.length > 0) {
        for (const todo of todosToNotify) {
          console.log(`Client found reminder for task: "${todo.text}"`);
          try {
            const { error } = await supabase.functions.invoke('send-notification', {
              body: {
                title: "¡Recordatorio de Tarea!",
                body: todo.text,
              },
            });

            if (error) {
              console.error(`Error invoking send-notification for todo ${todo.id}:`, error);
            } else {
              await supabase.from('todos').update({ notification_sent: true }).eq('id', todo.id);
              
              setAllTodos(prev => {
                  const newAllTodos = { ...prev };
                  const dateKey = todo.due_date!;
                  if (newAllTodos[dateKey]) {
                      newAllTodos[dateKey] = newAllTodos[dateKey].map(t => t.id === todo.id ? { ...t, notification_sent: true } : t);
                  }
                  return newAllTodos;
              });
            }
          } catch (e) {
            console.error(`Exception while invoking function for todo ${todo.id}:`, e);
          }
        }
      }
    }, 60 * 1000); // Run every minute

    return () => clearInterval(intervalId);
  }, [user, allTodos, isSubscribed]);


  // --- SUPABASE AUTH & DATA LOADING ---
  useEffect(() => {
    setAuthLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    
    // Check for existing session on initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
          setAuthLoading(false);
      }
      // onAuthStateChange will handle setting the user
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
        setDataLoaded(false);
        return;
    };

    const loadAllData = async () => {
      try {
        await initDB(user.email!);
        
        // Settings first
        const { data: settingsData, error: settingsError } = await supabase.from('site_settings').select('*').single();
        if (settingsData) {
            setTheme(settingsData.theme_mode || 'light');
            setThemeColors(settingsData.theme_colors || DEFAULT_COLORS);
            setParticleType(settingsData.particle_type || 'none');
            setAmbientSound(settingsData.ambient_sound || { type: 'none', volume: 0.5 });
            setPomodoroState(prev => ({ ...prev, ...(settingsData.pomodoro_config || {}) }));
            if (settingsData.active_background_id) {
                setSavedActiveBgId(settingsData.active_background_id);
            }
        } else if (!settingsError) {
            await supabase.from('site_settings').insert({ user_id: user.id, theme_mode: 'light', theme_colors: DEFAULT_COLORS, pomodoro_config: { durations: pomodoroState.durations, backgroundTimerOpacity: 50, showBackgroundTimer: false } });
        }

        // Load Todos from Supabase
        const { data: todosData, error: todosError } = await supabase.from('todos').select('*, subtasks(*)');
        if (todosError) throw todosError;
        if (todosData) {
            const groupedTodos = todosData.reduce((acc, todo) => {
                const dateKey = todo.due_date;
                if (!dateKey) return acc;
                if (!acc[dateKey]) acc[dateKey] = [];
                // FIX: Ensure priority exists to satisfy Todo type, defaulting to 'medium'. This prevents type errors if data is missing from the database.
                acc[dateKey].push({ ...todo, priority: todo.priority || 'medium', subtasks: todo.subtasks || [] });
                return acc;
            }, {} as { [key: string]: Todo[] });
            setAllTodos(groupedTodos);
        }

        // Load Folders & Notes from Supabase
        const { data: foldersData, error: foldersError } = await supabase.from('folders').select('*');
        if (foldersError) throw foldersError;
        const { data: notesData, error: notesError } = await supabase.from('notes').select('*');
        if (notesError) throw notesError;

        if (foldersData && notesData) {
            const foldersWithNotes = foldersData.map(folder => ({ ...folder, notes: notesData.filter(note => note.folder_id === folder.id) })).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setFolders(foldersWithNotes);
        } else if (foldersData?.length === 0) {
            const { data: newFolder } = await supabase.from('folders').insert({ name: 'Mis Notas', user_id: user.id }).select().single();
            if (newFolder) setFolders([{ ...newFolder, notes: [] }]);
        }

        const { data: playlistsData } = await supabase.from('playlists').select('*');
        if (playlistsData) setPlaylists(playlistsData);

        const { data: quickNotesData } = await supabase.from('quick_notes').select('*').order('created_at', { ascending: false });
        if (quickNotesData) setQuickNotes(quickNotesData);

        const storedBrowserSession = localStorage.getItem(`${user.email}_browserSession`);
        if(storedBrowserSession) setBrowserSession(JSON.parse(storedBrowserSession));

      } catch (error) {
        console.error("Failed to initialize app state:", error);
      } finally {
        setDataLoaded(true);
      }
    };
    loadAllData();
  }, [user]);

  // --- GOOGLE DRIVE LOGIC ---
  const findOrCreateAppFolder = useCallback(async () => {
    try {
        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
            fields: 'files(id)',
        });
        if (response.result.files && response.result.files.length > 0) {
            appFolderId.current = response.result.files[0].id!;
        } else {
            const createResponse = await window.gapi.client.drive.files.create({ resource: { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' } as any);
            appFolderId.current = createResponse.result.id!;
        }
    } catch (e) { console.error("Error finding/creating app folder", e); }
  }, []);

  const loadGalleryImagesFromDrive = useCallback(async () => {
    if (!appFolderId.current) return;
    setGalleryIsLoading(true);
    try {
        const response = await window.gapi.client.drive.files.list({ q: `'${appFolderId.current}' in parents and mimeType contains 'image/' and (not appProperties has { key='type' and value='background' }) and trashed=false`, fields: 'files(id)' });
        const files = response.result.files || [];
        const imagePromises = files.map(async (file) => {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
                headers: { Authorization: `Bearer ${window.gapi.client.getToken().access_token}` }
            });
            const blob = await response.blob();
            return { id: file.id!, url: URL.createObjectURL(blob) };
        });
        const newImages = await Promise.all(imagePromises);
        setGalleryImages(newImages.reverse());
    } catch (e) { console.error("Error loading images from Drive", e); } finally { setGalleryIsLoading(false); }
  }, []);
  
  const loadBackgroundsFromDrive = useCallback(async () => {
    if (!appFolderId.current) return;
    setBackgroundsAreLoading(true);
    try {
      const response = await window.gapi.client.drive.files.list({ q: `'${appFolderId.current}' in parents and appProperties has { key='type' and value='background' } and trashed=false`, fields: 'files(id, name, mimeType, appProperties)' });
      const files = response.result.files || [];
      const bgPromises = files.map(async (file) => {
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            headers: { Authorization: `Bearer ${window.gapi.client.getToken().access_token}` }
        });
        const blob = await response.blob();
        return { id: file.id!, name: file.name!, url: URL.createObjectURL(blob), type: file.mimeType!.startsWith('video') ? 'video' : 'image', isFavorite: file.appProperties?.isFavorite === 'true' };
      });
      const newBgs = await Promise.all(bgPromises);
      setUserBackgrounds(newBgs);
    } catch (e) { console.error("Error loading backgrounds from Drive", e); } finally { setBackgroundsAreLoading(false); }
  }, []);

  const handleGoogleLogout = useCallback(() => {
    if (user?.email) {
        localStorage.removeItem(`${user.email}_gdrive_token`);
        localStorage.removeItem(`${user.email}_gdrive_expiry`);
    }
    setGdriveToken(null);
    setGalleryImages([]);
    setUserBackgrounds([]);
    appFolderId.current = null;
  }, [user]);

  const initializeDrive = useCallback(async (accessToken: string) => {
    if (!gapiReady) return;
    setGdriveToken(accessToken);
    window.gapi.client.setToken({ access_token: accessToken });
    try {
        await window.gapi.client.load('drive', 'v3');
        await findOrCreateAppFolder();
        await Promise.all([loadGalleryImagesFromDrive(), loadBackgroundsFromDrive()]);
    } catch (error) {
        console.error("Error initializing Google Drive:", error);
        handleGoogleLogout(); // Token might be invalid/expired, clear it
    }
  }, [gapiReady, findOrCreateAppFolder, loadGalleryImagesFromDrive, loadBackgroundsFromDrive, handleGoogleLogout]);
  
  useEffect(() => {
      const gapiPoll = setInterval(() => { if (window.gapi && window.gapi.load) { clearInterval(gapiPoll); window.gapi.load('client', () => setGapiReady(true)); } }, 100);
      return () => { clearInterval(gapiPoll); };
  }, []);

  useEffect(() => {
    if (!user || !gapiReady || gdriveToken) return;

    // 1. Check for token in URL hash (after redirect from Google)
    if (window.location.hash.includes('access_token')) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('access_token');
        const expiresIn = params.get('expires_in');

        if (accessToken && expiresIn) {
            const expiryTime = Date.now() + parseInt(expiresIn, 10) * 1000;
            localStorage.setItem(`${user.email}_gdrive_token`, accessToken);
            localStorage.setItem(`${user.email}_gdrive_expiry`, String(expiryTime));
            
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);

            initializeDrive(accessToken);
            return;
        }
    }

    // 2. If no token in URL, check localStorage for a saved session
    const storedToken = localStorage.getItem(`${user.email}_gdrive_token`);
    const storedExpiry = localStorage.getItem(`${user.email}_gdrive_expiry`);

    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
        initializeDrive(storedToken);
    }
  }, [user, gapiReady, initializeDrive, gdriveToken]);
  
  useEffect(() => {
    if (savedActiveBgId && userBackgrounds.length > 0) {
        const bgToActivate = userBackgrounds.find(b => b.id === savedActiveBgId);
        if (bgToActivate && activeBackground?.id !== bgToActivate.id) {
            setActiveBackground(bgToActivate);
        }
    }
  }, [userBackgrounds, savedActiveBgId, activeBackground]);

  const handleAuthClick = () => {
    const redirectUri = window.location.origin;
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        scope: SCOPES,
        response_type: 'token',
        include_granted_scopes: 'true',
    });
    window.location.href = authUrl;
  };

  // --- ALL HANDLERS ---
  const handleAddTodo = async (text: string) => {
    if (!user) return;
    try {
      const dateKey = formatDateKey(selectedDate);
      const { data: newTodo, error } = await supabase.from('todos').insert([{ text, completed: false, priority: 'medium', due_date: dateKey, user_id: user.id }]).select().single();
      if (error) { 
        throw error;
      }

// FIX: Correctly handle ambiguous type from Supabase by casting and ensuring all required properties of the Todo type are present.
      if (newTodo && 'id' in newTodo) {
        // The `newTodo` object from Supabase may have an ambiguous type (`any`, `{}`, or `unknown`).
        // By casting to a Partial<Todo> and providing fallbacks, we can safely construct a valid `Todo` object.
        const data = newTodo as Partial<Todo>;
        const todoToAdd: Todo = {
          ...data,
          id: data.id!,
          text: data.text ?? text,
          completed: data.completed ?? false,
          priority: data.priority ?? 'medium',
          subtasks: data.subtasks ?? [],
        };
        setAllTodos(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), todoToAdd] }));
      }
    } catch (error) {
        console.error("Error adding todo:", error);
    }
  };

  const handleUpdateTodo = async (updatedTodo: Todo) => {
    try {
        let todoToSave = { ...updatedTodo };
        if (todoToSave.recurrence && todoToSave.recurrence.frequency !== 'none' && !todoToSave.recurrence.id) {
            todoToSave.recurrence.id = `recurrence-${Date.now()}`;
        }
        const { subtasks, ...payloadForSupabase } = todoToSave;
        
        await supabase.from('todos').update(payloadForSupabase).eq('id', todoToSave.id).throwOnError();
        
        await supabase.from('subtasks').delete().eq('todo_id', todoToSave.id).throwOnError();
        
        if (subtasks && subtasks.length > 0) {
            const subtasksToInsert = subtasks.map(({ text, completed }) => ({
                text,
                completed,
                todo_id: todoToSave.id,
            }));
            await supabase.from('subtasks').insert(subtasksToInsert).throwOnError();
        }
        
        const { data: refreshedTodo, error: refetchError } = await supabase
            .from('todos')
            .select('*, subtasks(*)')
            .eq('id', todoToSave.id)
            .single();
            
        if (refetchError) throw refetchError;
        if (!refreshedTodo) throw new Error("Failed to refetch todo after update.");

        // FIX: Resolve complex type inference issue from Supabase data.
        // The `refreshedTodo` can have an ambiguous type or a null `priority`, causing type errors.
        // This ensures the final object is a valid `Todo` by providing fallbacks for required properties.
        const finalTodo: Todo = {
            ...updatedTodo,
            ...(refreshedTodo as any),
            priority: (refreshedTodo as any)?.priority || updatedTodo.priority,
            subtasks: (refreshedTodo as any)?.subtasks || [],
        };
        
        let newAllTodos: { [key: string]: Todo[] } = JSON.parse(JSON.stringify(allTodos));
        let oldDateKey: string | null = null;
        let originalTask: Todo | null = null;
        for (const key in newAllTodos) { const task = newAllTodos[key].find((t: Todo) => t.id === finalTodo.id); if (task) { oldDateKey = key; originalTask = task; break; } }
        
        if (originalTask?.recurrence?.id) { 
            for (const dateKey in newAllTodos) { newAllTodos[dateKey] = newAllTodos[dateKey].filter((t: Todo) => (t.recurrence?.id !== originalTask!.recurrence!.id) || (t.id === finalTodo.id) || (t.due_date && originalTask!.due_date && t.due_date <= originalTask!.due_date)); } 
        }
        
        if(oldDateKey && oldDateKey !== finalTodo.due_date && newAllTodos[oldDateKey]) { newAllTodos[oldDateKey] = newAllTodos[oldDateKey].filter((t: Todo) => t.id !== finalTodo.id); }
        
        const newDateKey = finalTodo.due_date!;
        const dateTasks = newAllTodos[newDateKey] || [];
        const taskIndex = dateTasks.findIndex((t: Todo) => t.id === finalTodo.id);
        
        if(taskIndex > -1) { dateTasks[taskIndex] = finalTodo; } else { dateTasks.push(finalTodo); }
        newAllTodos[newDateKey] = [...dateTasks];
        
        if (finalTodo.recurrence && finalTodo.recurrence.frequency !== 'none') { 
            newAllTodos = await generateRecurringTasks(finalTodo, newAllTodos); 
        }
        setAllTodos(newAllTodos);

    } catch (error) {
        console.error("Error in handleUpdateTodo:", error);
    }
  };

  const handleToggleTodo = async (id: number, onAllCompleted: (quote: string) => void) => {
    const dateKey = formatDateKey(selectedDate);
    const todosForDay = allTodos[dateKey] || [];
    const targetTodo = todosForDay.find(t => t.id === id);
    if (!targetTodo) return;
    
    try {
        const newCompletedState = !targetTodo.completed;
        await supabase.from('todos').update({ completed: newCompletedState }).eq('id', id).throwOnError();
        if (targetTodo.subtasks?.length) await supabase.from('subtasks').update({ completed: newCompletedState }).eq('todo_id', id).throwOnError();
        
        const allWereCompletedBefore = todosForDay.every(t => t.completed);
        const newTodosForDay = todosForDay.map(t => t.id === id ? { ...t, completed: newCompletedState, subtasks: t.subtasks?.map(st => ({...st, completed: newCompletedState})) } : t);
        const allJustCompleted = newTodosForDay.every(t => t.completed);
        if (allJustCompleted && !allWereCompletedBefore) { onAllCompleted(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]); triggerConfetti(); }
        
        let finalAllTodos = { ...allTodos, [dateKey]: newTodosForDay };
        
        // FIX: Refactored to an immutable pattern to ensure type safety when adding a recurrence ID.
        if (newCompletedState && targetTodo.recurrence && targetTodo.recurrence.frequency !== 'none') {
            let sourceTodoWithId: Todo = { ...targetTodo, completed: newCompletedState };
            if (sourceTodoWithId.recurrence && !sourceTodoWithId.recurrence.id) {
                // Perform an immutable-style update on the recurrence object for safety.
                sourceTodoWithId = {
                    ...sourceTodoWithId,
                    recurrence: {
                        ...sourceTodoWithId.recurrence,
                        id: `recurrence-${sourceTodoWithId.id}`
                    }
                };
            }
            finalAllTodos = await generateRecurringTasks(sourceTodoWithId, finalAllTodos);
        }
        setAllTodos(finalAllTodos);
    } catch(error) {
        console.error("Error toggling todo:", error);
    }
  };
  
  const handleToggleSubtask = async (taskId: number, subtaskId: number, onAllCompleted: (quote: string) => void) => {
      const dateKey = formatDateKey(selectedDate);
      const oldTodosForDay = allTodos[dateKey] || [];
      const task = oldTodosForDay.find(t => t.id === taskId);
      const subtask = task?.subtasks?.find(st => st.id === subtaskId);
      if (!task || !subtask) return;

      try {
        const newCompletedState = !subtask.completed;
        await supabase.from('subtasks').update({ completed: newCompletedState }).eq('id', subtaskId).throwOnError();
        
        const allWereCompletedBefore = oldTodosForDay.every(t => t.completed);
        let parentCompleted = task.completed;
        const newSubtasks = task.subtasks?.map(st => st.id === subtaskId ? { ...st, completed: newCompletedState } : st);
        
        if (newSubtasks) {
            const allSubtasksCompleted = newSubtasks.every(st => st.completed);
            if (allSubtasksCompleted !== task.completed) { 
                parentCompleted = allSubtasksCompleted; 
                await supabase.from('todos').update({ completed: parentCompleted }).eq('id', taskId).throwOnError(); 
            }
        }
        const newTodosForDay = oldTodosForDay.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks, completed: parentCompleted } : t);
        const allJustCompleted = newTodosForDay.every(t => t.completed);
        if (allJustCompleted && !allWereCompletedBefore) { onAllCompleted(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]); triggerConfetti(); }
        setAllTodos(prev => ({ ...prev, [dateKey]: newTodosForDay }));
      } catch (error) {
          console.error("Error toggling subtask:", error);
      }
  };

  const handleDeleteTodo = async (id: number) => {
    if (!user) return;
    const taskToDelete: Todo | undefined = (Object.values(allTodos).flat() as Todo[]).find(t => t.id === id);
    if (!taskToDelete) return;
    try {
        let idsToDelete: number[] = [id];
        if (taskToDelete.recurrence?.id && taskToDelete.due_date) {
            const { data }: { data: { id: number }[] | null } = await supabase.from('todos').select('id').eq('user_id', user.id).eq('recurrence->>id', taskToDelete.recurrence.id).gte('due_date', taskToDelete.due_date);
            if (data) idsToDelete = [...new Set([...idsToDelete, ...data.map(t => t.id)])];
        }
        if (idsToDelete.length > 0) {
            await supabase.from('subtasks').delete().in('todo_id', idsToDelete).throwOnError();
            await supabase.from('todos').delete().in('id', idsToDelete).throwOnError();
        }
        setAllTodos(prev => {
            // FIX: Correctly type `newAllTodos` to prevent type errors when filtering.
            const newAllTodos: { [key: string]: Todo[] } = JSON.parse(JSON.stringify(prev));
            const deleteIdSet = new Set(idsToDelete);
            for (const dateKey in newAllTodos) { newAllTodos[dateKey] = newAllTodos[dateKey].filter(t => !deleteIdSet.has(t.id)); if (newAllTodos[dateKey].length === 0) delete newAllTodos[dateKey]; }
            return newAllTodos;
        });
    } catch (error: any) { console.error("Error deleting todo series:", error); }
  };

  const handleAddFolder = async (name: string) => {
    if (!user) return null;
    try {
        const { data: newFolder, error } = await supabase.from('folders').insert({ name, user_id: user.id }).select().single();
        if (error) throw error;
        if (newFolder) setFolders(prev => [{...newFolder, notes: []}, ...prev]);
        return newFolder;
    } catch (error) {
        console.error("Error adding folder:", error);
        return null;
    }
  };
  const handleUpdateFolder = async (folderId: number, name: string) => {
    try {
        await supabase.from('folders').update({ name }).eq('id', folderId).throwOnError();
        setFolders(prev => prev.map(f => f.id === folderId ? {...f, name} : f));
    } catch(error) {
        console.error("Error updating folder:", error);
    }
  };
  const handleDeleteFolder = async (folderId: number) => {
    try {
        await supabase.from('notes').delete().eq('folder_id', folderId).throwOnError();
        await supabase.from('folders').delete().eq('id', folderId).throwOnError();
        setFolders(prev => prev.filter(f => f.id !== folderId));
    } catch(error) {
        console.error("Error deleting folder:", error);
    }
  };
  const handleAddNote = async (folderId: number) => {
    if (!user) return null;
    try {
        const { data: newNote, error } = await supabase.from('notes').insert({ folder_id: folderId, user_id: user.id, title: "", content: "" }).select().single();
        if (error) throw error;
        if (newNote) setFolders(prev => prev.map(f => f.id === folderId ? {...f, notes: [newNote, ...f.notes]} : f));
        return newNote;
    } catch(error) {
        console.error("Error adding note:", error);
        return null;
    }
  };
  const handleUpdateNote = async (note: Note) => {
    try {
        await supabase.from('notes').update({ title: note.title, content: note.content, updated_at: new Date().toISOString() }).eq('id', note.id).throwOnError();
        setFolders(prev => prev.map(f => f.id === note.folder_id ? {...f, notes: f.notes.map(n => n.id === note.id ? note : n).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())} : f));
    } catch (error) {
        console.error("Error updating note:", error);
    }
  };
  const handleDeleteNote = async (noteId: number, folderId: number) => {
    try {
      await supabase.from('notes').delete().eq('id', noteId).throwOnError();
      setFolders(prev => prev.map(f => f.id === folderId ? {...f, notes: f.notes.filter(n => n.id !== noteId)} : f));
    } catch (error) {
        console.error("Error deleting note:", error);
    }
  };
  const handleAddPlaylist = async (playlistData: Omit<Playlist, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return;
    try {
        const { data: newPlaylist, error } = await supabase.from('playlists').insert({ ...playlistData, user_id: user.id }).select().single();
        if (error) throw error;
        if (newPlaylist) setPlaylists(prev => [...prev, newPlaylist]);
    } catch (error) {
        console.error("Error adding playlist:", error);
    }
  };
  const handleUpdatePlaylist = async (playlist: Playlist) => {
    try {
        await supabase.from('playlists').update(playlist).eq('id', playlist.id).throwOnError();
        setPlaylists(prev => prev.map(p => p.id === playlist.id ? playlist : p));
    } catch(error) {
        console.error("Error updating playlist:", error);
    }
  };
  const handleDeletePlaylist = async (playlistId: number) => {
    try {
        await supabase.from('playlists').delete().eq('id', playlistId).throwOnError();
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    } catch(error) {
        console.error("Error deleting playlist:", error);
    }
  };
  const handleAddBackground = async (file: File) => {
    if (!appFolderId.current || !gdriveToken || !user) return;
    try {
        const metadata = { name: file.name, mimeType: file.type, parents: [appFolderId.current], appProperties: { type: 'background', isFavorite: 'false' } };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: new Headers({ 'Authorization': `Bearer ${gdriveToken}` }), body: form });
        if (!response.ok) { 
            const errorBody = await response.json();
            console.error("Google Drive Upload Error:", errorBody);
            throw new Error(`Upload failed: ${errorBody.error.message}`);
        }
        const newFile = await response.json();
        const newBg: Background = { id: newFile.id, name: file.name, url: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : 'image', isFavorite: false };
        setUserBackgrounds(prev => [...prev, newBg]);
        setActiveBackground(newBg);
    } catch (error) {
        console.error("Error adding background:", error);
    }
  };
  const handleDeleteBackground = async (id: string) => {
    try {
        await window.gapi.client.drive.files.delete({ fileId: id });
        setUserBackgrounds(prev => prev.filter(bg => { if (bg.id === id) { URL.revokeObjectURL(bg.url); return false; } return true; }));
        if (activeBackground?.id === id) setActiveBackground(null);
    } catch(error) {
        console.error("Error deleting background:", error);
    }
  };
  const handleToggleFavoriteBackground = async (id: string) => {
      const bg = userBackgrounds.find(b => b.id === id);
      if (!bg || !gdriveToken) return;
      try {
        const newFavState = !bg.isFavorite;
        await window.gapi.client.drive.files.update({ fileId: id, resource: { appProperties: { isFavorite: String(newFavState) } } as any });
        setUserBackgrounds(bgs => bgs.map(b => b.id === id ? {...b, isFavorite: newFavState} : b));
      } catch (error) {
          console.error("Error toggling favorite background:", error);
      }
  };
  const handleAddGalleryImages = async (files: File[]) => {
    if (!appFolderId.current || !gdriveToken) return;
    try {
        for (const file of files) {
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify({ name: file.name, mimeType: file.type, parents: [appFolderId.current] })], { type: 'application/json' }));
            form.append('file', file);
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: new Headers({ 'Authorization': `Bearer ${gdriveToken}` }), body: form });
            if (!response.ok) { 
                console.error("Google Drive Upload Error:", await response.json()); 
                continue; // Continue with next file
            }
            const newFile = await response.json();
            setGalleryImages(prev => [{ id: newFile.id, url: URL.createObjectURL(file) }, ...prev]);
        }
    } catch(error) {
        console.error("Error adding gallery images:", error);
    }
  };
  const handleDeleteGalleryImage = async (id: string) => {
    try {
        await window.gapi.client.drive.files.delete({ fileId: id });
        setGalleryImages(prev => prev.filter(img => { if (img.id === id) URL.revokeObjectURL(img.url); return img.id !== id; }));
    } catch (error) {
        console.error("Error deleting gallery image:", error);
    }
  };
  const handleAddQuickNote = async (text: string) => {
    if (!user) return;
    try {
        const { data: newNote, error } = await supabase.from('quick_notes').insert({ text, user_id: user.id }).select().single();
        if (error) throw error;
        if (newNote) setQuickNotes(prev => [newNote, ...prev]);
    } catch (error) {
        console.error("Error adding quick note:", error);
    }
  };
  const handleDeleteQuickNote = async (id: number) => {
    try {
        await supabase.from('quick_notes').delete().eq('id', id).throwOnError();
        setQuickNotes(prev => prev.filter(qn => qn.id !== id));
    } catch(error) {
        console.error("Error deleting quick note:", error);
    }
  };
  const handleClearAllQuickNotes = async () => {
    if (!user) return;
    try {
        await supabase.from('quick_notes').delete().eq('user_id', user.id).throwOnError();
        setQuickNotes([]);
    } catch(error) {
        console.error("Error clearing quick notes:", error);
    }
  };

  // Debounced save settings to Supabase & localStorage
  useEffect(() => {
    if (!dataLoaded || !user) return;
    localStorage.setItem(`${user.email}_browserSession`, JSON.stringify(browserSession));
    if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current);
    settingsSaveTimeout.current = window.setTimeout(async () => {
        try {
            const settingsPayload = { user_id: user.id, theme_mode: theme, theme_colors: themeColors, active_background_id: activeBackground?.id || null, particle_type: particleType, ambient_sound: ambientSound, pomodoro_config: { durations: pomodoroState.durations, backgroundTimerOpacity: pomodoroState.backgroundTimerOpacity, showBackgroundTimer: pomodoroState.showBackgroundTimer } };
            await supabase.from('site_settings').upsert(settingsPayload, { onConflict: 'user_id' }).throwOnError();
        } catch(error) {
            console.error("Error saving settings:", error);
        }
    }, 1500);
    return () => { if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current); };
  }, [theme, themeColors, activeBackground, particleType, ambientSound, pomodoroState, browserSession, dataLoaded, user]);

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);
  
  useEffect(() => {
    const root = document.documentElement;
    const { primary, secondary } = themeColors;
    const isDark = theme === 'dark';
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-light', isDark ? adjustBrightness(primary, -25) : adjustBrightness(primary, 25));
    root.style.setProperty('--color-primary-dark', isDark ? adjustBrightness(primary, 15) : adjustBrightness(primary, -15));
    root.style.setProperty('--color-secondary', secondary);
    root.style.setProperty('--color-secondary-light', isDark ? adjustBrightness(secondary, -25) : adjustBrightness(secondary, 25));
    root.style.setProperty('--color-secondary-dark', isDark ? adjustBrightness(secondary, 15) : adjustBrightness(secondary, -15));
    root.style.setProperty('--color-secondary-lighter', isDark ? adjustBrightness(secondary, -50) : adjustBrightness(secondary, 60));
  }, [themeColors, theme]);

  const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  const handleThemeColorChange = (colorName: keyof ThemeColors, value: string) => setThemeColors(prev => ({...prev, [colorName]: value}));
  const handleResetThemeColors = () => setThemeColors(DEFAULT_COLORS);
  
  const handleLogout = async () => {
    try {
        if (serviceWorkerRegistration.current) {
            const subscription = await serviceWorkerRegistration.current.pushManager.getSubscription();
            if (subscription) {
                // We tell the server to delete the subscription.
                await supabase.from('push_subscriptions').delete().eq('subscription_data->>endpoint', subscription.endpoint);
                await subscription.unsubscribe();
            }
        }
        await supabase.auth.signOut(); 
        handleGoogleLogout();
    } catch(error) {
        console.error("Error during logout:", error);
    }
  };
  
  if (authLoading) {
     return <div className="h-screen w-screen bg-secondary-lighter dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-600 dark:text-gray-100">Cargando pollito...</p></div>;
  }
  if (!user) { return <Login onLogin={() => {}} />; }

  if (!dataLoaded) {
     return <div className="h-screen w-screen bg-secondary-lighter dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-600 dark:text-gray-100">Cargando tus datos...</p></div>;
  }
  
  const appProps: AppComponentProps = {
      currentUser: user, onLogout: handleLogout, theme, toggleTheme, themeColors, onThemeColorChange: handleThemeColorChange, onResetThemeColors: handleResetThemeColors,
      allTodos, folders, galleryImages, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
      pomodoroState, activeBackground, particleType, ambientSound,
      handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo,
      handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
      handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
      handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
      setBrowserSession, setSelectedDate, setPomodoroState, setActiveBackground, setParticleType, setAmbientSound,
      gdriveToken, galleryIsLoading, backgroundsAreLoading, handleAuthClick,
      handleAddGalleryImages, handleDeleteGalleryImage, handleAddBackground, handleDeleteBackground, handleToggleFavoriteBackground,
      gapiReady,
      isSubscribed,
      isPermissionBlocked,
      handleNotificationAction,
  };

  return isMobile ? <MobileApp {...appProps} /> : <DesktopApp {...appProps} />;
};

export default App;
