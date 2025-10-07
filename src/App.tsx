







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
import NotificationManager from './components/NotificationManager';
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

// --- Google Drive Configuration ---
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (process.env as any).GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'Lista de Tareas App Files';

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
      if (Notification.permission === 'granted') {
          new Notification('Pomodoro Terminado', { body: message, icon: '/favicon.ico' });
      }
      setPomodoroState(s => ({
          ...s,
          mode: newMode,
          timeLeft: s.durations[newMode],
          isActive: true
      }));
    }
    return () => clearInterval(timer);
  }, [pomodoroState.isActive, pomodoroState.timeLeft, pomodoroState.mode, pomodoroState.durations, setPomodoroState]);

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
          <NotificationManager />
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
          if (Notification.permission === 'granted') {
              new Notification('Pomodoro Terminado');
          }
          setPomodoroState(s => ({ ...s, mode: newMode, timeLeft: s.durations[newMode], isActive: true }));
        }
        return () => clearInterval(timer);
    }, [pomodoroState.isActive, pomodoroState.timeLeft, pomodoroState.mode, pomodoroState.durations, setPomodoroState]);

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
                        