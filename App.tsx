import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// FIX: Import BrowserSession type to resolve 'Cannot find name' errors.
import { Todo, Folder, Background, Playlist, WindowType, WindowState, GalleryImage, Subtask, QuickNote, ParticleType, AmbientSoundType, Note, ThemeColors, BrowserSession, SupabaseUser, AIConversationHistoryItem } from './types';
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
import ConfirmationModal from './components/ConfirmationModal';
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

// --- Google Drive Configuration ---
// Placed at the top level to be accessible by both Desktop and Mobile components.
const CLIENT_ID = '601258936098-roqd1oa5o3gav2s8aekqgpreuaoenknk.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const APP_FOLDER_NAME = 'Lista de Tareas App Files';

const pomodoroAudioSrc = "data:audio/wav;base64,UklGRkIAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAYAAAAD//wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A";

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

interface AppProps {
  currentUser: SupabaseUser;
  onLogout: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  themeColors: ThemeColors;
  onThemeColorChange: (colorName: keyof ThemeColors, value: string) => void;
  onResetThemeColors: () => void;
}

const DesktopApp: React.FC<AppProps> = ({ currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors }) => {
  const getUserKey = useCallback((key: string) => `${currentUser.email}_${key}`, [currentUser]);

  const [allTodos, setAllTodos] = useState<{ [key: string]: Todo[] }>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [initialized, setInitialized] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionQuote, setCompletionQuote] = useState('');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activeBackground, setActiveBackground] = useState<Background | null>(null);
  const [userBackgrounds, setUserBackgrounds] = useState<Background[]>([]);
  
  const [openWindows, setOpenWindows] = useState<WindowType[]>([]);
  const [windowStates, setWindowStates] = useState<{ [key in WindowType]?: WindowState }>({});
  const [focusedWindow, setFocusedWindow] = useState<WindowType | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTrack, setActiveTrack] = useState<Playlist | null>(null);
  const [activeSpotifyTrack, setActiveSpotifyTrack] = useState<Playlist | null>(null);
  
  const [pomodoroState, setPomodoroState] = useState({
      timeLeft: 25 * 60,
      isActive: false,
      mode: 'work' as 'work' | 'break',
      durations: { work: 25 * 60, break: 5 * 60 },
      showBackgroundTimer: false,
      backgroundTimerOpacity: 50,
  });
  const [activePomodoro, setActivePomodoro] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [browserSession, setBrowserSession] = useState<BrowserSession>({});
  const [particleType, setParticleType] = useState<ParticleType>('none');
  const [ambientSound, setAmbientSound] = useState<{ type: AmbientSoundType; volume: number }>({ type: 'none', volume: 0.5 });
  const [isCustomizationPanelOpen, setIsCustomizationPanelOpen] = useState(false);

  // Google Drive State
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [gdriveToken, setGdriveToken] = useState<string | null>(null);
  const [galleryIsLoading, setGalleryIsLoading] = useState(false);
  const [backgroundsAreLoading, setBackgroundsAreLoading] = useState(false);
  const appFolderId = useRef<string | null>(null);
  const tokenClient = useRef<any>(null);

  
  const pomodoroAudioRef = useRef<HTMLAudioElement>(null);
  const ambientAudioRef = useRef<HTMLAudioElement>(null);
  const memoriesRef = useRef(galleryImages);
  const pomodoroStartedRef = useRef(false);
  memoriesRef.current = galleryImages;

  const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
  const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
  const todayTodos = useMemo(() => allTodos[formatDateKey(selectedDate)] || [], [allTodos, selectedDate]);
  const todayAgendaTasks = useMemo(() => (allTodos[formatDateKey(new Date())] || []).sort((a, b) => (a.start_time || '23:59').localeCompare(b.start_time || '23:59')), [allTodos]);

  // DB and LocalStorage Initialization
  useEffect(() => {
    const initApp = async () => {
      try {
        await initDB(currentUser.email!);
        
        // Load Todos from Supabase
        const { data: todosData, error: todosError } = await supabase.from('todos').select('*, subtasks(*)');
        if (todosError) throw todosError;
        
        let finalTodos = {};

        if (todosData) {
            const groupedTodos = todosData.reduce((acc, todo) => {
                const dateKey = todo.due_date;
                if (!dateKey) return acc;
                if (!acc[dateKey]) acc[dateKey] = [];
                acc[dateKey].push({ ...todo, subtasks: todo.subtasks || [] });
                return acc;
            }, {} as { [key: string]: Todo[] });
            
            // --- Prune old tasks (completed or pending) in batches ---
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - 3);
            const cutoffDateString = cutoffDate.toISOString().split('T')[0];
            const cutoffDateISO = cutoffDate.toISOString();

            const allTasksFlat: Todo[] = Object.values(groupedTodos).flat() as Todo[];
            const oldTaskIds = allTasksFlat
                .filter(task => {
                    const isOldAndCompleted = task.completed && task.due_date && task.due_date < cutoffDateString;
                    const isOldAndPending = !task.completed && task.created_at && task.created_at < cutoffDateISO;
                    return isOldAndCompleted || isOldAndPending;
                })
                .map(task => task.id);

            let prunedGroupedTodos = { ...groupedTodos };

            if (oldTaskIds.length > 0) {
                const CHUNK_SIZE = 50; 
                for (let i = 0; i < oldTaskIds.length; i += CHUNK_SIZE) {
                    const chunk = oldTaskIds.slice(i, i + CHUNK_SIZE);
                    
                    const { error: subtaskDeleteError } = await supabase.from('subtasks').delete().in('todo_id', chunk);
                    
                    if (subtaskDeleteError) {
                        console.error("Error pruning a chunk of old subtasks, skipping this chunk:", subtaskDeleteError);
                        continue; 
                    }

                    const { error: deleteError } = await supabase.from('todos').delete().in('id', chunk);

                    if (!deleteError) {
                        const chunkIdSet = new Set(chunk);
                        for (const dateKey in prunedGroupedTodos) {
                            prunedGroupedTodos[dateKey] = prunedGroupedTodos[dateKey].filter(t => !chunkIdSet.has(t.id));
                            if (prunedGroupedTodos[dateKey].length === 0) {
                                delete prunedGroupedTodos[dateKey];
                            }
                        }
                    } else {
                        console.error("Error pruning a chunk of old todos from Supabase:", deleteError);
                    }
                }
                finalTodos = prunedGroupedTodos;
            } else {
                finalTodos = groupedTodos;
            }
        }
        setAllTodos(finalTodos);

        // Load Folders & Notes from Supabase
        const { data: foldersData, error: foldersError } = await supabase.from('folders').select('*');
        if (foldersError) throw foldersError;
        const { data: notesData, error: notesError } = await supabase.from('notes').select('*');
        if (notesError) throw notesError;

        if (foldersData && notesData) {
            const foldersWithNotes = foldersData.map(folder => ({
                ...folder,
                notes: notesData.filter(note => note.folder_id === folder.id)
            })).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setFolders(foldersWithNotes);
        } else if (foldersData?.length === 0) {
            const { data: newFolder } = await supabase.from('folders').insert({ name: 'Mis Notas', user_id: currentUser.id }).select().single();
            if (newFolder) setFolders([{ ...newFolder, notes: [] }]);
        }

        // Load Playlists from Supabase
        const { data: playlistsData, error: playlistsError } = await supabase.from('playlists').select('*');
        if (playlistsError) throw playlistsError;
        if (playlistsData) {
            setPlaylists(playlistsData);
        }
        
        // Load Quick Notes from Supabase
        const { data: quickNotesData, error: quickNotesError } = await supabase.from('quick_notes').select('*').order('created_at', { ascending: false });
        if (quickNotesError) throw quickNotesError;
        if (quickNotesData) {
            setQuickNotes(quickNotesData);
        }

        // Load from LocalStorage (for non-db items)
        const storedWindows = localStorage.getItem(getUserKey('windowStates'));
        const storedOpenWindows = localStorage.getItem(getUserKey('openWindows'));
        const storedBrowserSession = localStorage.getItem(getUserKey('browserSession'));

        if (storedWindows) setWindowStates(JSON.parse(storedWindows));
        if (storedOpenWindows) setOpenWindows(JSON.parse(storedOpenWindows));
        if(storedBrowserSession) setBrowserSession(JSON.parse(storedBrowserSession));
        
      } catch (error) {
        console.error("Failed to initialize app state:", error);
      } finally {
        setInitialized(true);
      }
    };
    initApp();
  }, [currentUser, getUserKey]);
  
  // Persistance Effects
  useEffect(() => { if (initialized) localStorage.setItem(getUserKey('windowStates'), JSON.stringify(windowStates)); }, [windowStates, initialized, getUserKey]);
  useEffect(() => { if (initialized) localStorage.setItem(getUserKey('openWindows'), JSON.stringify(openWindows)); }, [openWindows, initialized, getUserKey]);
  useEffect(() => { if (initialized) localStorage.setItem(getUserKey('browserSession'), JSON.stringify(browserSession)); }, [browserSession, initialized, getUserKey]);
  
  // Google API Initialization (ROBUST)
  useEffect(() => {
      const gapiPoll = setInterval(() => {
          if (window.gapi && window.gapi.load) {
              clearInterval(gapiPoll);
              window.gapi.load('client', () => {
                  setGapiReady(true);
              });
          }
      }, 100);

      const gisPoll = setInterval(() => {
          if (window.google && window.google.accounts) {
              clearInterval(gisPoll);
              setGisReady(true);
          }
      }, 100);

      return () => {
          clearInterval(gapiPoll);
          clearInterval(gisPoll);
      };
  }, []);

  useEffect(() => {
      if (gapiReady && gisReady) {
          // FIX: This comparison appears to be unintentional because the types have no overlap.
          if (!CLIENT_ID) {
              console.warn('Google Client ID is missing. Google Drive features will be disabled.');
          } else {
              try {
                tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // Will be set on click
                });
              } catch (e) {
                console.error("Error initializing Google token client:", e);
              }
          }
      }
  }, [gapiReady, gisReady]);

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
      // Local notification for Pomodoro still makes sense as it's an immediate feedback loop.
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
  }, [pomodoroState.isActive, pomodoroState.timeLeft, pomodoroState.mode, pomodoroState.durations]);

  // Ambient Sound Effect
  useEffect(() => {
    const audio = ambientAudioRef.current;
    if (!audio) return;

    const soundMap: Record<AmbientSoundType, string | null> = {
      'none': null,
      'rain': rainSoundSrc,
      'forest': forestSoundSrc,
      'coffee_shop': coffeeShopSrc,
      'ocean': oceanSoundSrc,
    };

    const newSrc = soundMap[ambientSound.type];
    
    if (newSrc) {
      if (audio.src !== newSrc) {
        audio.src = newSrc;
      }
      audio.loop = true;
      audio.volume = ambientSound.volume;
      audio.play().catch(e => console.error("Audio play failed:", e));
    } else {
      audio.pause();
      audio.src = '';
    }
    audio.volume = ambientSound.volume;

  }, [ambientSound]);
  

  // --- Google Drive Handlers ---
  const findOrCreateAppFolder = useCallback(async () => {
    try {
        // FIX: Cannot find name 'gapi'. Prefixed with 'window.'
        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
            fields: 'files(id)',
        });
        if (response.result.files && response.result.files.length > 0) {
            appFolderId.current = response.result.files[0].id!;
        } else {
            // FIX: Cannot find name 'gapi'. Prefixed with 'window.'
            const createResponse = await window.gapi.client.drive.files.create({
                // @ts-ignore
                resource: { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
                fields: 'id',
            });
            appFolderId.current = createResponse.result.id!;
        }
    } catch (e) { console.error("Error finding/creating app folder", e); }
  }, []);

  const loadGalleryImagesFromDrive = useCallback(async () => {
    if (!appFolderId.current) return;
    setGalleryIsLoading(true);
    try {
        // FIX: Cannot find name 'gapi'. Prefixed with 'window.'
        const response = await window.gapi.client.drive.files.list({
            q: `'${appFolderId.current}' in parents and mimeType contains 'image/' and (not appProperties has { key='type' and value='background' }) and trashed=false`,
            fields: 'files(id)',
        });
        const files = response.result.files || [];
        const imagePromises = files.map(async (file) => {
            // FIX: Cannot find name 'gapi'. Prefixed with 'window.'
            const fileResponse = await window.gapi.client.drive.files.get({ fileId: file.id!, alt: 'media' });
            const blob = new Blob([fileResponse.body], { type: fileResponse.headers['Content-Type'] });
            return { id: file.id!, url: URL.createObjectURL(blob) };
        });
        const newImages = await Promise.all(imagePromises);
        setGalleryImages(newImages.reverse());
    } catch (e) {
        console.error("Error loading images from Drive", e);
    } finally {
        setGalleryIsLoading(false);
    }
  }, []);
  
  const loadBackgroundsFromDrive = useCallback(async () => {
    if (!appFolderId.current) return;
    setBackgroundsAreLoading(true);
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${appFolderId.current}' in parents and appProperties has { key='type' and value='background' } and trashed=false`,
        fields: 'files(id, name, mimeType, appProperties)',
      });
      const files = response.result.files || [];
      const bgPromises = files.map(async (file) => {
        const fileResponse = await window.gapi.client.drive.files.get({ fileId: file.id!, alt: 'media' });
        const blob = new Blob([fileResponse.body], { type: file.mimeType });
        return {
          id: file.id!,
          name: file.name!,
          url: URL.createObjectURL(blob),
          type: file.mimeType!.startsWith('video') ? 'video' : 'image',
          isFavorite: file.appProperties?.isFavorite === 'true',
        };
      });
      const newBgs = await Promise.all(bgPromises);
      setUserBackgrounds(newBgs);

      // We no longer get this from local storage, it will be loaded from DB settings
      // const storedActiveBgId = localStorage.getItem(getUserKey('activeBackgroundId'));
      // if (storedActiveBgId) {
      //   const active = newBgs.find(bg => bg.id === storedActiveBgId);
      //   if (active) setActiveBackground(active);
      // }
    } catch (e) {
      console.error("Error loading backgrounds from Drive", e);
    } finally {
      setBackgroundsAreLoading(false);
    }
  }, [getUserKey]);


  const handleAuthClick = useCallback(async () => {
    if (!tokenClient.current) {
        alert("La configuración para Google Drive está incompleta. Por favor, añade tu ID de cliente en el archivo App.tsx.");
        return;
    }
    tokenClient.current.callback = async (resp: any) => {
        if (resp.error) throw (resp);
        setGdriveToken(resp.access_token);
        window.gapi.client.setToken({ access_token: resp.access_token });
        
        await window.gapi.client.load('drive', 'v3');
        
        await findOrCreateAppFolder();
        await loadGalleryImagesFromDrive();
        await loadBackgroundsFromDrive();
    };
    if (!gdriveToken) {
        tokenClient.current.requestAccessToken({ prompt: 'consent' });
    }
  }, [gdriveToken, findOrCreateAppFolder, loadGalleryImagesFromDrive, loadBackgroundsFromDrive]);
  
  const handleAddGalleryImages = async (files: File[]) => {
    if (!appFolderId.current || !gdriveToken) return;
    for (const file of files) {
      try {
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify({ name: file.name, mimeType: file.type, parents: [appFolderId.current] })], { type: 'application/json' }));
        form.append('file', file);
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': `Bearer ${gdriveToken}` }),
            body: form,
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google Drive Upload Error:", errorData);
            alert("¡Uy! Hubo un problema al subir tu imagen a Google Drive.");
            continue; // Skip to the next file
        }

        const newFile = await response.json();
        setGalleryImages(prev => [{ id: newFile.id, url: URL.createObjectURL(file) }, ...prev]);
      } catch (e) {
        console.error("Error processing file upload:", e);
        alert(`Hubo un error al procesar el archivo ${file.name}.`);
      }
    }
  };

  const handleDeleteGalleryImage = async (id: string) => {
    try {
        // FIX: Cannot find name 'gapi'. Prefixed with 'window.'
        await window.gapi.client.drive.files.delete({ fileId: id });
        setGalleryImages(prev => prev.filter(img => {
            if (img.id === id) {
                URL.revokeObjectURL(img.url);
                return false;
            }
            return true;
        }));
    } catch (e) { console.error("Error deleting file from Drive", e); }
  };


  // --- TODO Handlers ---
  const handleAddTodo = async (text: string) => {
    const dateKey = formatDateKey(selectedDate);
    const newTodoPayload = {
        text,
        priority: 'medium' as 'medium',
        due_date: dateKey,
        user_id: currentUser.id,
    };

    const { data: newTodo, error } = await supabase.from('todos').insert(newTodoPayload).select().single();
    if (error) {
        console.error("Error adding todo:", error);
        return;
    }
    
    setAllTodos(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), { ...newTodo, subtasks: [] }]
    }));
  };

  const handleUpdateTodo = async (updatedTodo: Todo) => {
    let todoToSave = { ...updatedTodo };

    if (todoToSave.recurrence && todoToSave.recurrence.frequency !== 'none') {
        if (!todoToSave.recurrence.id) {
            todoToSave.recurrence.id = `recurrence-${Date.now()}`;
        }
    }
    if (todoToSave.recurrence?.frequency === 'none') {
        delete todoToSave.recurrence.id;
        delete todoToSave.recurrence.sourceId;
    }

    const { subtasks, user_id, ...payloadForSupabase } = todoToSave;

    const { error: todoError } = await supabase.from('todos').update(payloadForSupabase).eq('id', todoToSave.id);
    if (todoError) console.error("Error updating todo:", todoError);

    await supabase.from('subtasks').delete().eq('todo_id', todoToSave.id);
    if (subtasks && subtasks.length > 0) {
        const { error: subtaskError } = await supabase.from('subtasks').insert(subtasks.map(st => ({ text: st.text, completed: st.completed, todo_id: todoToSave.id })));
        if (subtaskError) console.error("Error inserting subtasks:", subtaskError);
    }
    
    let newAllTodos = JSON.parse(JSON.stringify(allTodos));
    let oldDateKey: string | null = null;
    let originalTask: Todo | null = null;
    for (const key in newAllTodos) {
        const task = newAllTodos[key].find((t: Todo) => t.id === todoToSave.id);
        if (task) {
            oldDateKey = key;
            originalTask = task;
            break;
        }
    }

    if (originalTask?.recurrence?.id) {
            for (const dateKey in newAllTodos) {
            newAllTodos[dateKey] = newAllTodos[dateKey].filter((t: Todo) => {
                if (t.recurrence?.id !== originalTask!.recurrence!.id) return true;
                if (t.id === todoToSave.id) return true;
                if (t.due_date && originalTask!.due_date && t.due_date <= originalTask!.due_date) return true;
                return false;
            });
        }
    }
    
    if(oldDateKey && oldDateKey !== todoToSave.due_date && newAllTodos[oldDateKey]) {
        newAllTodos[oldDateKey] = newAllTodos[oldDateKey].filter((t: Todo) => t.id !== todoToSave.id);
    }
    
    const newDateKey = todoToSave.due_date!;
    const dateTasks = newAllTodos[newDateKey] || [];
    const taskIndex = dateTasks.findIndex((t: Todo) => t.id === todoToSave.id);
    if(taskIndex > -1) {
        dateTasks[taskIndex] = todoToSave;
    } else {
        dateTasks.push(todoToSave);
    }
    newAllTodos[newDateKey] = [...dateTasks];
    
    if (todoToSave.recurrence && todoToSave.recurrence.frequency !== 'none') {
        newAllTodos = await generateRecurringTasks(todoToSave, newAllTodos);
    }
    
    setAllTodos(newAllTodos);
    setTaskToEdit(null);
  };

 const handleToggleTodo = async (id: number) => {
    const dateKey = formatDateKey(selectedDate);
    const todosForDay = allTodos[dateKey] || [];
    const targetTodo = todosForDay.find(t => t.id === id);
    if (!targetTodo) return;

    const newCompletedState = !targetTodo.completed;

    await supabase.from('todos').update({ completed: newCompletedState }).eq('id', id);
    if (targetTodo.subtasks && targetTodo.subtasks.length > 0) {
        await supabase.from('subtasks').update({ completed: newCompletedState }).eq('todo_id', id);
    }

    const allWereCompletedBefore = todosForDay.length > 0 && todosForDay.every(t => t.completed);

    const newTodosForDay = todosForDay.map(t =>
        t.id === id ? { ...t, completed: newCompletedState, subtasks: t.subtasks?.map(st => ({...st, completed: newCompletedState})) } : t
    );

    const allJustCompleted = newTodosForDay.length > 0 && newTodosForDay.every(t => t.completed);

    if (allJustCompleted && !allWereCompletedBefore) {
        setCompletionQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
        setShowCompletionModal(true);
        triggerConfetti();
    }

    let finalAllTodos = { ...allTodos, [dateKey]: newTodosForDay };

    if (newCompletedState && targetTodo.recurrence && targetTodo.recurrence.frequency !== 'none') {
        const sourceTodoWithId = { ...targetTodo };
        if (!sourceTodoWithId.recurrence.id) {
            sourceTodoWithId.recurrence = {...sourceTodoWithId.recurrence, id: `recurrence-${sourceTodoWithId.id}`};
        }
        finalAllTodos = await generateRecurringTasks(sourceTodoWithId, finalAllTodos);
    }

    setAllTodos(finalAllTodos);
};
  
  const handleToggleSubtask = async (taskId: number, subtaskId: number) => {
      const dateKey = formatDateKey(selectedDate);
      const oldTodosForDay = allTodos[dateKey] || [];
      const task = oldTodosForDay.find(t => t.id === taskId);
      const subtask = task?.subtasks?.find(st => st.id === subtaskId);
      if (!task || !subtask) return;

      const newCompletedState = !subtask.completed;
      await supabase.from('subtasks').update({ completed: newCompletedState }).eq('id', subtaskId);

      const allWereCompletedBefore = oldTodosForDay.length > 0 && oldTodosForDay.every(t => t.completed);

      let parentCompleted = task.completed;
      const newSubtasks = task.subtasks?.map(st => 
          st.id === subtaskId ? { ...st, completed: newCompletedState } : st
      );
      if(newSubtasks) {
          const allSubtasksCompleted = newSubtasks.every(st => st.completed);
          if (allSubtasksCompleted !== task.completed) {
            parentCompleted = allSubtasksCompleted;
            await supabase.from('todos').update({ completed: parentCompleted }).eq('id', taskId);
          }
      }

      const newTodosForDay = oldTodosForDay.map(t => 
          t.id === taskId ? { ...t, subtasks: newSubtasks, completed: parentCompleted } : t
      );
      
      const allJustCompleted = newTodosForDay.length > 0 && newTodosForDay.every(t => t.completed);

      if (allJustCompleted && !allWereCompletedBefore) {
          setCompletionQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
          setShowCompletionModal(true);
          triggerConfetti();
      }

      setAllTodos(prev => ({ ...prev, [dateKey]: newTodosForDay }));
  };

  const handleDeleteTodo = async (id: number) => {
    const allTasksFlat: Todo[] = Object.values(allTodos).flat() as Todo[];
    const taskToDelete = allTasksFlat.find(t => t.id === id);
    if (!taskToDelete) return;

    try {
        let idsToDelete: number[] = [id];

        if (taskToDelete.recurrence?.id && taskToDelete.due_date) {
            const recurrenceId = taskToDelete.recurrence.id;
            const startDate = taskToDelete.due_date;

            const { data: futureTasks, error: fetchError } = await supabase
                .from('todos')
                .select('id')
                .eq('user_id', currentUser.id)
                .eq('recurrence->>id', recurrenceId)
                .gte('due_date', startDate);

            if (fetchError) throw fetchError;
            if (futureTasks) {
                idsToDelete = [...new Set([...idsToDelete, ...futureTasks.map(t => t.id)])];
            }
        }

        if (idsToDelete.length > 0) {
            const { error: subtaskError } = await supabase.from('subtasks').delete().in('todo_id', idsToDelete);
            if (subtaskError) throw subtaskError;
            
            const { error: todoError } = await supabase.from('todos').delete().in('id', idsToDelete);
            if (todoError) throw todoError;
        }

        setAllTodos(prevAllTodos => {
            const newAllTodos = JSON.parse(JSON.stringify(prevAllTodos));
            const deleteIdSet = new Set(idsToDelete);
            for (const dateKey in newAllTodos) {
                newAllTodos[dateKey] = newAllTodos[dateKey].filter((t: Todo) => !deleteIdSet.has(t.id));
                if (newAllTodos[dateKey].length === 0) {
                    delete newAllTodos[dateKey];
                }
            }
            return newAllTodos;
        });

    } catch (error: any) {
        console.error("Error deleting todo series from client:", error);
        alert(`Error al eliminar la tarea: ${error.message}\n\nLos datos pueden estar desincronizados. Por favor, recarga la página.`);
    }
  };

  // --- Notes Handlers ---
  const handleAddFolder = async (name: string) => {
    const { data: newFolder, error } = await supabase.from('folders').insert({ name, user_id: currentUser.id }).select().single();
    if (error) { console.error("Error adding folder:", error); return null; }
    setFolders(prev => [{...newFolder, notes: []}, ...prev]);
    return newFolder;
  };

  const handleUpdateFolder = async (folderId: number, name: string) => {
    const { error } = await supabase.from('folders').update({ name }).eq('id', folderId);
    if (error) { console.error("Error updating folder:", error); return; }
    setFolders(prev => prev.map(f => f.id === folderId ? {...f, name} : f));
  };
  
  const handleDeleteFolder = async (folderId: number) => {
    // First, delete all notes within the folder to satisfy foreign key constraints.
    const { error: notesError } = await supabase.from('notes').delete().eq('folder_id', folderId);
    if (notesError) {
        console.error("Error deleting notes in folder:", notesError);
        alert(`Error al eliminar las notas: ${notesError.message}`);
        return;
    }

    // Then, delete the folder itself.
    const { error: folderError } = await supabase.from('folders').delete().eq('id', folderId);
    if (folderError) {
        console.error("Error deleting folder:", folderError);
        alert(`Error al eliminar la carpeta: ${folderError.message}`);
        return;
    }

    // Only update UI after successful deletion from the database.
    setFolders(prev => prev.filter(f => f.id !== folderId));
  };
  
  const handleAddNote = async (folderId: number) => {
    const { data: newNote, error } = await supabase.from('notes').insert({ folder_id: folderId, user_id: currentUser.id, title: "", content: "" }).select().single();
    if (error) { console.error("Error adding note:", error); return null; }
    setFolders(prev => prev.map(f => f.id === folderId ? {...f, notes: [newNote, ...f.notes]} : f));
    return newNote;
  };
  
  const handleUpdateNote = async (note: Note) => {
    const { error } = await supabase.from('notes').update({ title: note.title, content: note.content, updated_at: new Date().toISOString() }).eq('id', note.id);
    if (error) { console.error("Error updating note:", error); return; }
    setFolders(prev => prev.map(f => 
      f.id === note.folder_id 
        ? {...f, notes: f.notes.map(n => n.id === note.id ? note : n).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())} 
        : f
    ));
  };

  const handleDeleteNote = async (noteId: number, folderId: number) => {
      const { error } = await supabase.from('notes').delete().eq('id', noteId);
      if (error) { 
        console.error("Error deleting note:", error); 
        alert(`Error al eliminar la nota: ${error.message}`);
        return; 
      }
      setFolders(prev => prev.map(f => f.id === folderId ? {...f, notes: f.notes.filter(n => n.id !== noteId)} : f));
  };
  
  // --- Playlist Handlers ---
  const handleAddPlaylist = async (playlistData: Omit<Playlist, 'id' | 'user_id' | 'created_at'>) => {
    const { data: newPlaylist, error } = await supabase.from('playlists').insert({ ...playlistData, user_id: currentUser.id }).select().single();
    if (error) {
        console.error("Error adding playlist:", error);
        alert(`Error al guardar la playlist: ${error.message}`);
        return;
    }
    setPlaylists(prev => [...prev, newPlaylist]);
  };

  const handleUpdatePlaylist = async (playlist: Playlist) => {
    const { error } = await supabase.from('playlists').update(playlist).eq('id', playlist.id);
    if (error) {
        console.error("Error updating playlist:", error);
        alert(`Error al actualizar la playlist: ${error.message}`);
        return;
    }
    setPlaylists(prev => prev.map(p => p.id === playlist.id ? playlist : p));
  };
  
  const handleDeletePlaylist = async (playlistId: number) => {
    const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
    if (error) {
        console.error("Error deleting playlist:", error);
        alert(`Error al eliminar la playlist: ${error.message}`);
        return;
    }
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
  };


  // --- Windowing and Misc Handlers ---
  const toggleWindow = (windowType: WindowType) => {
    setOpenWindows(open => 
      open.includes(windowType) 
        ? open.filter(w => w !== windowType)
        : [...open, windowType]
    );
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

  // Background handlers
  const handleAddBackground = async (file: File) => {
    if (!appFolderId.current || !gdriveToken) return;
    const metadata = {
        name: file.name,
        mimeType: file.type,
        parents: [appFolderId.current],
        appProperties: {
            type: 'background',
            isFavorite: 'false',
        },
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    try {
        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: new Headers({ 'Authorization': `Bearer ${gdriveToken}` }),
            body: form,
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google Drive Upload Error:", errorData);
            alert("¡Uy! Hubo un problema al subir tu fondo a Google Drive.");
            return;
        }

        const newFile = await response.json();
        const newBg: Background = {
            id: newFile.id,
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video') ? 'video' : 'image',
            isFavorite: false,
        };
        setUserBackgrounds(prev => [...prev, newBg]);
        setActiveBackground(newBg);
    } catch (e) { console.error("Error uploading background to Drive", e); }
  };

  const handleDeleteBackground = async (id: string) => {
    try {
        await window.gapi.client.drive.files.delete({ fileId: id });
        setUserBackgrounds(prev => prev.filter(bg => {
            if (bg.id === id) {
                URL.revokeObjectURL(bg.url);
                return false;
            }
            return true;
        }));
        if (activeBackground?.id === id) {
            setActiveBackground(null);
        }
    } catch (e) { console.error("Error deleting background from Drive", e); }
  };
  
  const handleToggleFavoriteBackground = async (id: string) => {
      const bg = userBackgrounds.find(b => b.id === id);
      if (!bg || !gdriveToken) return;
      const newFavState = !bg.isFavorite;
      try {
        await window.gapi.client.drive.files.update({
            fileId: id,
            // @ts-ignore
            resource: {
                appProperties: { isFavorite: String(newFavState) }
            }
        });
        setUserBackgrounds(bgs => bgs.map(b => b.id === id ? {...b, isFavorite: newFavState} : b));
      } catch (e) { console.error("Error updating favorite state in Drive", e); }
  };
  
  // Quick Notes handlers
  const handleAddQuickNote = async (text: string) => {
    const { data: newNote, error } = await supabase.from('quick_notes').insert({ text, user_id: currentUser.id }).select().single();
    if (error) {
        console.error("Error adding quick note:", error);
        alert(`Error al guardar la nota: ${error.message}`);
        return;
    }
    setQuickNotes(prev => [newNote, ...prev]);
  };

  const handleDeleteQuickNote = async (id: number) => {
    const { error } = await supabase.from('quick_notes').delete().eq('id', id);
    if (error) {
        console.error("Error deleting quick note:", error);
        alert(`Error al eliminar la nota: ${error.message}`);
        return;
    }
    setQuickNotes(prev => prev.filter(qn => qn.id !== id));
  };

  const handleClearAllQuickNotes = async () => {
    const noteIdsToDelete = quickNotes.map(note => note.id);
    if (noteIdsToDelete.length === 0) return;

    const { error } = await supabase.from('quick_notes').delete().in('id', noteIdsToDelete);
    if (error) {
        console.error("Error clearing all quick notes:", error);
        alert(`Error al limpiar las notas: ${error.message}`);
        return;
    }
    setQuickNotes([]);
  };


  if (!initialized) {
    return <div className="h-screen w-screen bg-secondary-lighter dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-600 dark:text-gray-100">Cargando pollito...</p></div>;
  }
  
  const userName = currentUser.email!.split('@')[0];
  const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1);

  return (
    <div className="h-screen w-screen text-gray-800 dark:text-gray-100 font-sans overflow-hidden">
        {activeBackground ? (
            activeBackground.type === 'video' ? (
                <video key={activeBackground.id} src={activeBackground.url} autoPlay loop muted className="absolute top-0 left-0 w-full h-full object-cover -z-30"/>
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
        // Auth Props
        isSignedIn={!!gdriveToken}
        onAuthClick={handleAuthClick}
        isGapiReady={gapiReady && gisReady}
        // Colors
        colors={themeColors}
        onColorChange={onThemeColorChange}
        onReset={onResetThemeColors}
        // Backgrounds
        activeBackground={activeBackground}
        userBackgrounds={userBackgrounds}
        onSelectBackground={setActiveBackground}
        onAddBackground={handleAddBackground}
        onDeleteBackground={handleDeleteBackground}
        onToggleFavorite={handleToggleFavoriteBackground}
        backgroundsLoading={backgroundsAreLoading}
        // Ambience
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
            onToggleTask={(id) => handleToggleTodo(id)} 
            onToggleSubtask={handleToggleSubtask}
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
            <ModalWindow 
                isOpen={true} onClose={() => toggleWindow('todo')} title="Lista de Tareas"
                isDraggable isResizable zIndex={focusedWindow === 'todo' ? 50 : 40}
                onFocus={() => bringToFront('todo')} className="w-full max-w-3xl h-[80vh]"
                windowState={windowStates.todo} onStateChange={s => setWindowStates(ws => ({...ws, todo: s}))}
            >
              <TodoListModule 
                todos={todayTodos}
                addTodo={handleAddTodo}
                toggleTodo={handleToggleTodo}
                deleteTodo={handleDeleteTodo}
                updateTodo={handleUpdateTodo}
                onEditTodo={setTaskToEdit}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                datesWithTasks={datesWithTasks}
                datesWithAllTasksCompleted={datesWithAllTasksCompleted}
              />
            </ModalWindow>
          )}
          {openWindows.includes('notes') && (
              <ModalWindow isOpen onClose={() => toggleWindow('notes')} title="Notas del Pollito" isDraggable isResizable zIndex={focusedWindow === 'notes' ? 50 : 40} onFocus={() => bringToFront('notes')} className="w-full max-w-3xl h-[75vh]" windowState={windowStates.notes} onStateChange={s => setWindowStates(ws => ({...ws, notes: s}))}>
                  <NotesSection 
                    folders={folders} 
                    onAddFolder={handleAddFolder}
                    onUpdateFolder={handleUpdateFolder}
                    onDeleteFolder={handleDeleteFolder}
                    onAddNote={handleAddNote}
                    onUpdateNote={handleUpdateNote}
                    onDeleteNote={handleDeleteNote}
                  />
              </ModalWindow>
          )}
          {openWindows.includes('gallery') && (
              <ModalWindow isOpen onClose={() => toggleWindow('gallery')} title="Galería de Recuerdos" isDraggable isResizable zIndex={focusedWindow === 'gallery' ? 50 : 40} onFocus={() => bringToFront('gallery')} className="w-full max-w-2xl h-[70vh]" windowState={windowStates.gallery} onStateChange={s => setWindowStates(ws => ({...ws, gallery: s}))}>
                  <ImageGallery 
                    images={galleryImages} 
                    onAddImages={handleAddGalleryImages} 
                    onDeleteImage={handleDeleteGalleryImage} 
                    isSignedIn={!!gdriveToken}
                    onAuthClick={handleAuthClick}
                    isGapiReady={gapiReady && gisReady}
                    isLoading={galleryIsLoading}
                  />
              </ModalWindow>
          )}
          {openWindows.includes('pomodoro') && (
              <ModalWindow isOpen onClose={() => toggleWindow('pomodoro')} title="Pomodoro" isDraggable isResizable zIndex={focusedWindow === 'pomodoro' ? 50 : 40} onFocus={() => bringToFront('pomodoro')} className="w-80 h-96" windowState={windowStates.pomodoro} onStateChange={s => setWindowStates(ws => ({...ws, pomodoro: s}))}>
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
          )}
           {openWindows.includes('music') && (
              <ModalWindow isOpen onClose={() => toggleWindow('music')} frameless isDraggable isResizable zIndex={focusedWindow === 'music' ? 50 : 40} onFocus={() => bringToFront('music')} className="w-[600px] h-[450px]" windowState={windowStates.music} onStateChange={s => setWindowStates(ws => ({...ws, music: s}))}>
                  <MusicPlayer 
                    playlists={playlists} 
                    onAddPlaylist={handleAddPlaylist}
                    onUpdatePlaylist={handleUpdatePlaylist}
                    onDeletePlaylist={handleDeletePlaylist} 
                    onSelectTrack={handleSelectTrack} 
                    onClose={() => toggleWindow('music')} 
                  />
              </ModalWindow>
          )}
          {openWindows.includes('browser') && (
              <ModalWindow isOpen onClose={() => toggleWindow('browser')} title="IA Pollito" isDraggable isResizable zIndex={focusedWindow === 'browser' ? 50 : 40} onFocus={() => bringToFront('browser')} className="w-full max-w-xl h-[85vh]" windowState={windowStates.browser} onStateChange={s => setWindowStates(ws => ({...ws, browser: s}))}>
                  <Browser session={browserSession} setSession={setBrowserSession} currentUser={currentUser} />
              </ModalWindow>
          )}
          {openWindows.includes('games') && (
            <ModalWindow 
                isOpen={true} onClose={() => toggleWindow('games')} title="Centro de Juegos"
                isDraggable isResizable zIndex={focusedWindow === 'games' ? 50 : 40}
                onFocus={() => bringToFront('games')} className="w-full max-w-4xl h-[85vh]"
                windowState={windowStates.games} onStateChange={s => setWindowStates(ws => ({...ws, games: s}))}
            >
              <GamesHub
                galleryImages={galleryImages}
                currentUser={capitalizedUserName}
              />
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

const MobileApp: React.FC<AppProps> = ({ currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors }) => {
    const [activeTab, setActiveTab] = useState('home');

    // All state hooks from DesktopApp need to be duplicated here
    const [allTodos, setAllTodos] = useState<{ [key: string]: Todo[] }>({});
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [initialized, setInitialized] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionQuote, setCompletionQuote] = useState('');
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [activeBackground, setActiveBackground] = useState<Background | null>(null);
    const [userBackgrounds, setUserBackgrounds] = useState<Background[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [activeTrack, setActiveTrack] = useState<Playlist | null>(null);
    const [activeSpotifyTrack, setActiveSpotifyTrack] = useState<Playlist | null>(null);
    const [pomodoroState, setPomodoroState] = useState({
        timeLeft: 25 * 60,
        isActive: false,
        mode: 'work' as 'work' | 'break',
        durations: { work: 25 * 60, break: 5 * 60 },
        showBackgroundTimer: false,
        backgroundTimerOpacity: 50,
    });
    const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
    const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
    const [browserSession, setBrowserSession] = useState<BrowserSession>({});
    const [particleType, setParticleType] = useState<ParticleType>('none');
    const [ambientSound, setAmbientSound] = useState<{ type: AmbientSoundType; volume: number }>({ type: 'none', volume: 0.5 });
    const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
    const [isAiBrowserOpen, setIsAiBrowserOpen] = useState(false);
    const [isCustomizationPanelOpen, setIsCustomizationPanelOpen] = useState(false);
    
    // Google Drive State
    const [gapiReady, setGapiReady] = useState(false);
    const [gisReady, setGisReady] = useState(false);
    const [gdriveToken, setGdriveToken] = useState<string | null>(null);
    const [galleryIsLoading, setGalleryIsLoading] = useState(false);
    const [backgroundsAreLoading, setBackgroundsAreLoading] = useState(false);
    const appFolderId = useRef<string | null>(null);
    const tokenClient = useRef<any>(null);

    const pomodoroAudioRef = useRef<HTMLAudioElement>(null);
    const ambientAudioRef = useRef<HTMLAudioElement>(null);

    const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
    const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
    const todayTodos = useMemo(() => allTodos[formatDateKey(selectedDate)] || [], [allTodos, selectedDate]);
    const todayAgendaTasks = useMemo(() => (allTodos[formatDateKey(new Date())] || []).sort((a, b) => (a.start_time || '23:59').localeCompare(b.start_time || '23:59')), [allTodos]);
    
    // Initialization and persistence effects (copied from DesktopApp)
    useEffect(() => {
        const initApp = async () => {
            await initDB(currentUser.email!);

             // Load Todos from Supabase
            const { data: todosData, error: todosError } = await supabase.from('todos').select('*, subtasks(*)');
            if (todosError) throw todosError;
            
            let finalTodos = {};

            if (todosData) {
                const groupedTodos = todosData.reduce((acc, todo) => {
                    const dateKey = todo.due_date;
                    if (!dateKey) return acc;
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push({ ...todo, subtasks: todo.subtasks || [] });
                    return acc;
                }, {} as { [key: string]: Todo[] });

                // --- Prune old tasks (completed or pending) in batches ---
                const cutoffDate = new Date();
                cutoffDate.setMonth(cutoffDate.getMonth() - 3);
                const cutoffDateString = cutoffDate.toISOString().split('T')[0];
                const cutoffDateISO = cutoffDate.toISOString();

                const allTasksFlat: Todo[] = Object.values(groupedTodos).flat() as Todo[];
                const oldTaskIds = allTasksFlat
                    .filter(task => {
                        const isOldAndCompleted = task.completed && task.due_date && task.due_date < cutoffDateString;
                        const isOldAndPending = !task.completed && task.created_at && task.created_at < cutoffDateISO;
                        return isOldAndCompleted || isOldAndPending;
                    })
                    .map(task => task.id);

                let prunedGroupedTodos = { ...groupedTodos };

                if (oldTaskIds.length > 0) {
                    const CHUNK_SIZE = 50;
                    for (let i = 0; i < oldTaskIds.length; i += CHUNK_SIZE) {
                        const chunk = oldTaskIds.slice(i, i + CHUNK_SIZE);
                        
                        const { error: subtaskDeleteError } = await supabase.from('subtasks').delete().in('todo_id', chunk);
                        
                        if (subtaskDeleteError) {
                            console.error("Error pruning a chunk of old subtasks, skipping this chunk:", subtaskDeleteError);
                            continue; 
                        }

                        const { error: deleteError } = await supabase.from('todos').delete().in('id', chunk);

                        if (!deleteError) {
                            const chunkIdSet = new Set(chunk);
                            for (const dateKey in prunedGroupedTodos) {
                                prunedGroupedTodos[dateKey] = prunedGroupedTodos[dateKey].filter(t => !chunkIdSet.has(t.id));
                                if (prunedGroupedTodos[dateKey].length === 0) {
                                    delete prunedGroupedTodos[dateKey];
                                }
                            }
                        } else {
                            console.error("Error pruning a chunk of old todos from Supabase:", deleteError);
                        }
                    }
                    finalTodos = prunedGroupedTodos;
                } else {
                    finalTodos = groupedTodos;
                }
            }
            setAllTodos(finalTodos);

            // Load Folders & Notes from Supabase
            const { data: foldersData, error: foldersError } = await supabase.from('folders').select('*');
            if (foldersError) throw foldersError;
            const { data: notesData, error: notesError } = await supabase.from('notes').select('*');
            if (notesError) throw notesError;

            if (foldersData && notesData) {
                const foldersWithNotes = foldersData.map(folder => ({
                    ...folder,
                    notes: notesData.filter(note => note.folder_id === folder.id)
                })).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                setFolders(foldersWithNotes);
            } else if (foldersData?.length === 0) {
                const { data: newFolder } = await supabase.from('folders').insert({ name: 'Mis Notas', user_id: currentUser.id }).select().single();
                if (newFolder) setFolders([{ ...newFolder, notes: [] }]);
            }

            // Load Playlists from Supabase
            const { data: playlistsData, error: playlistsError } = await supabase.from('playlists').select('*');
            if (playlistsError) throw playlistsError;
            if (playlistsData) {
                setPlaylists(playlistsData);
            }

            // Load Quick Notes from Supabase
            const { data: quickNotesData, error: quickNotesError } = await supabase.from('quick_notes').select('*').order('created_at', { ascending: false });
            if (quickNotesError) throw quickNotesError;
            if (quickNotesData) {
                setQuickNotes(quickNotesData);
            }

            const storedBrowserSession = localStorage.getItem(`${currentUser.email}_browserSession`);
            if(storedBrowserSession) setBrowserSession(JSON.parse(storedBrowserSession));
            
            setInitialized(true);
        };
        initApp();
    }, [currentUser]);

    useEffect(() => { if (initialized) localStorage.setItem(`${currentUser.email}_browserSession`, JSON.stringify(browserSession)); }, [browserSession, initialized, currentUser]);
    
    // Google API Initialization (ROBUST)
    useEffect(() => {
        const gapiPoll = setInterval(() => {
            if (window.gapi && window.gapi.load) {
                clearInterval(gapiPoll);
                window.gapi.load('client', () => {
                    setGapiReady(true);
                });
            }
        }, 100);

        const gisPoll = setInterval(() => {
            if (window.google && window.google.accounts) {
                clearInterval(gisPoll);
                setGisReady(true);
            }
        }, 100);

        return () => {
            clearInterval(gapiPoll);
            clearInterval(gisPoll);
        };
    }, []);

    useEffect(() => {
        if (gapiReady && gisReady) {
            if (!CLIENT_ID) {
                console.warn('Google Client ID is missing. Google Drive features will be disabled.');
            } else {
                try {
                    tokenClient.current = window.google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: '', // Will be set on click
                    });
                } catch (e) {
                    console.error("Error initializing Google token client:", e);
                }
            }
        }
    }, [gapiReady, gisReady]);

    // Logic/handler effects (copied from DesktopApp)
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
    }, [pomodoroState.isActive, pomodoroState.timeLeft, pomodoroState.mode, pomodoroState.durations]);

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
    
    // --- Google Drive Handlers ---
    const findOrCreateAppFolder = useCallback(async () => {
        try {
            const response = await window.gapi.client.drive.files.list({
                q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
                fields: 'files(id)',
            });
            if (response.result.files && response.result.files.length > 0) {
                appFolderId.current = response.result.files[0].id!;
            } else {
                const createResponse = await window.gapi.client.drive.files.create({
                    resource: { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
                    fields: 'id',
                } as any);
                appFolderId.current = createResponse.result.id!;
            }
        } catch (e) { console.error("Error finding/creating app folder", e); }
    }, []);

    const loadGalleryImagesFromDrive = useCallback(async () => {
        if (!appFolderId.current) return;
        setGalleryIsLoading(true);
        try {
            const response = await window.gapi.client.drive.files.list({
                q: `'${appFolderId.current}' in parents and mimeType contains 'image/' and (not appProperties has { key='type' and value='background' }) and trashed=false`,
                fields: 'files(id)',
            });
            const files = response.result.files || [];
            const imagePromises = files.map(async (file) => {
                const fileResponse = await window.gapi.client.drive.files.get({ fileId: file.id!, alt: 'media' });
                const blob = new Blob([fileResponse.body], { type: fileResponse.headers['Content-Type'] });
                return { id: file.id!, url: URL.createObjectURL(blob) };
            });
            const newImages = await Promise.all(imagePromises);
            setGalleryImages(newImages.reverse());
        } catch (e) {
            console.error("Error loading images from Drive", e);
        } finally {
            setGalleryIsLoading(false);
        }
    }, []);

    const loadBackgroundsFromDrive = useCallback(async () => {
    if (!appFolderId.current) return;
    setBackgroundsAreLoading(true);
    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${appFolderId.current}' in parents and appProperties has { key='type' and value='background' } and trashed=false`,
        fields: 'files(id, name, mimeType, appProperties)',
      });
      const files = response.result.files || [];
      const bgPromises = files.map(async (file) => {
        const fileResponse = await window.gapi.client.drive.files.get({ fileId: file.id!, alt: 'media' });
        const blob = new Blob([fileResponse.body], { type: file.mimeType });
        return {
          id: file.id!,
          name: file.name!,
          url: URL.createObjectURL(blob),
          type: file.mimeType!.startsWith('video') ? 'video' : 'image',
          isFavorite: file.appProperties?.isFavorite === 'true',
        };
      });
      const newBgs = await Promise.all(bgPromises);
      setUserBackgrounds(newBgs);
    } catch (e) {
      console.error("Error loading backgrounds from Drive", e);
    } finally {
      setBackgroundsAreLoading(false);
    }
  }, []);

    const handleAuthClick = useCallback(async () => {
        if (!tokenClient.current) {
            alert("La configuración para Google Drive está incompleta. Por favor, añade tu ID de cliente en el archivo App.tsx.");
            return;
        }
        tokenClient.current.callback = async (resp: any) => {
            if (resp.error) throw (resp);
            setGdriveToken(resp.access_token);
            window.gapi.client.setToken({ access_token: resp.access_token });
            
            await window.gapi.client.load('drive', 'v3');
            
            await findOrCreateAppFolder();
            await loadGalleryImagesFromDrive();
            await loadBackgroundsFromDrive();
        };
        if (!gdriveToken) {
            tokenClient.current.requestAccessToken({ prompt: 'consent' });
        }
    }, [gdriveToken, findOrCreateAppFolder, loadGalleryImagesFromDrive, loadBackgroundsFromDrive]);

    // Handlers (copied & adapted)
    const handleAddTodo = async (text: string) => {
        const dateKey = formatDateKey(selectedDate);
        const newTodoPayload = { text, priority: 'medium' as 'medium', due_date: dateKey, user_id: currentUser.id };
        const { data: newTodo, error } = await supabase.from('todos').insert(newTodoPayload).select().single();
        if (error) { console.error("Error adding todo:", error); return; }
        setAllTodos(prev => ({ ...prev, [dateKey]: [...(prev[dateKey] || []), { ...newTodo, subtasks: [] }] }));
    };

    const handleUpdateTodo = async (updatedTodo: Todo) => {
        let todoToSave = { ...updatedTodo };

        if (todoToSave.recurrence && todoToSave.recurrence.frequency !== 'none') {
            if (!todoToSave.recurrence.id) {
                todoToSave.recurrence.id = `recurrence-${Date.now()}`;
            }
        }
        if (todoToSave.recurrence?.frequency === 'none') {
            delete todoToSave.recurrence.id;
            delete todoToSave.recurrence.sourceId;
        }

        const { subtasks, user_id, ...payloadForSupabase } = todoToSave;

        const { error: todoError } = await supabase.from('todos').update(payloadForSupabase).eq('id', todoToSave.id);
        if (todoError) console.error("Error updating todo:", todoError);

        await supabase.from('subtasks').delete().eq('todo_id', todoToSave.id);
        if (subtasks && subtasks.length > 0) {
            const { error: subtaskError } = await supabase.from('subtasks').insert(subtasks.map(st => ({ text: st.text, completed: st.completed, todo_id: todoToSave.id })));
            if (subtaskError) console.error("Error inserting subtasks:", subtaskError);
        }
        
        let newAllTodos = JSON.parse(JSON.stringify(allTodos));
        let oldDateKey: string | null = null;
        let originalTask: Todo | null = null;
        for (const key in newAllTodos) {
            const task = newAllTodos[key].find((t: Todo) => t.id === todoToSave.id);
            if (task) {
                oldDateKey = key;
                originalTask = task;
                break;
            }
        }

        if (originalTask?.recurrence?.id) {
             for (const dateKey in newAllTodos) {
                newAllTodos[dateKey] = newAllTodos[dateKey].filter((t: Todo) => {
                    if (t.recurrence?.id !== originalTask!.recurrence!.id) return true;
                    if (t.id === todoToSave.id) return true;
                    if (t.due_date && originalTask!.due_date && t.due_date <= originalTask!.due_date) return true;
                    return false;
                });
            }
        }
        
        if(oldDateKey && oldDateKey !== todoToSave.due_date && newAllTodos[oldDateKey]) {
            newAllTodos[oldDateKey] = newAllTodos[oldDateKey].filter((t: Todo) => t.id !== todoToSave.id);
        }
        
        const newDateKey = todoToSave.due_date!;
        const dateTasks = newAllTodos[newDateKey] || [];
        const taskIndex = dateTasks.findIndex((t: Todo) => t.id === todoToSave.id);
        if(taskIndex > -1) {
            dateTasks[taskIndex] = todoToSave;
        } else {
            dateTasks.push(todoToSave);
        }
        newAllTodos[newDateKey] = [...dateTasks];
        
        if (todoToSave.recurrence && todoToSave.recurrence.frequency !== 'none') {
            newAllTodos = await generateRecurringTasks(todoToSave, newAllTodos);
        }
        
        setAllTodos(newAllTodos);
        setTaskToEdit(null);
    };

    const handleToggleTodo = async (id: number) => {
        const dateKey = formatDateKey(selectedDate);
        const todosForDay = allTodos[dateKey] || [];
        const targetTodo = todosForDay.find(t => t.id === id);
        if (!targetTodo) return;

        const newCompletedState = !targetTodo.completed;
        await supabase.from('todos').update({ completed: newCompletedState }).eq('id', id);
        if (targetTodo.subtasks && targetTodo.subtasks.length > 0) {
            await supabase.from('subtasks').update({ completed: newCompletedState }).eq('todo_id', id);
        }
        
        const allWereCompletedBefore = todosForDay.length > 0 && todosForDay.every(t => t.completed);
        const newTodosForDay = todosForDay.map(t => t.id === id ? { ...t, completed: newCompletedState, subtasks: t.subtasks?.map(st => ({...st, completed: newCompletedState})) } : t);
        
        if (newTodosForDay.length > 0 && newTodosForDay.every(t => t.completed) && !allWereCompletedBefore) {
            setCompletionQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
            setShowCompletionModal(true);
            triggerConfetti();
        }

        let finalAllTodos = { ...allTodos, [dateKey]: newTodosForDay };
        if (newCompletedState && targetTodo.recurrence && targetTodo.recurrence.frequency !== 'none') {
            const sourceTodoWithId = { ...targetTodo };
            if (!sourceTodoWithId.recurrence.id) {
                sourceTodoWithId.recurrence = {...sourceTodoWithId.recurrence, id: `recurrence-${sourceTodoWithId.id}`};
            }
            finalAllTodos = await generateRecurringTasks(sourceTodoWithId, finalAllTodos);
        }
        setAllTodos(finalAllTodos);
    };

    const handleToggleSubtask = async (taskId: number, subtaskId: number) => {
      const dateKey = formatDateKey(selectedDate);
      const oldTodosForDay = allTodos[dateKey] || [];
      const task = oldTodosForDay.find(t => t.id === taskId);
      const subtask = task?.subtasks?.find(st => st.id === subtaskId);
      if (!task || !subtask) return;

      const newCompletedState = !subtask.completed;
      await supabase.from('subtasks').update({ completed: newCompletedState }).eq('id', subtaskId);

      let parentCompleted = task.completed;
      const newSubtasks = task.subtasks?.map(st => st.id === subtaskId ? { ...st, completed: newCompletedState } : st);
      if (newSubtasks) {
          const allSubtasksCompleted = newSubtasks.every(st => st.completed);
          if (allSubtasksCompleted !== task.completed) {
            parentCompleted = allSubtasksCompleted;
            await supabase.from('todos').update({ completed: parentCompleted }).eq('id', taskId);
          }
      }

      const newTodosForDay = oldTodosForDay.map(t => t.id === taskId ? { ...t, subtasks: newSubtasks, completed: parentCompleted } : t);
      if (newTodosForDay.length > 0 && newTodosForDay.every(t => t.completed) && !(oldTodosForDay.every(t => t.completed))) {
          setCompletionQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
          setShowCompletionModal(true);
          triggerConfetti();
      }
      setAllTodos(prev => ({ ...prev, [dateKey]: newTodosForDay }));
    };

    const handleDeleteTodo = async (id: number) => {
        const allTasksFlat: Todo[] = Object.values(allTodos).flat() as Todo[];
        const taskToDelete = allTasksFlat.find(t => t.id === id);
        if (!taskToDelete) return;

        try {
            let idsToDelete: number[] = [id];

            if (taskToDelete.recurrence?.id && taskToDelete.due_date) {
                const recurrenceId = taskToDelete.recurrence.id;
                const startDate = taskToDelete.due_date;

                const { data: futureTasks, error: fetchError } = await supabase
                    .from('todos')
                    .select('id')
                    .eq('user_id', currentUser.id)
                    .eq('recurrence->>id', recurrenceId)
                    .gte('due_date', startDate);

                if (fetchError) throw fetchError;
                if (futureTasks) {
                    idsToDelete = [...new Set([...idsToDelete, ...futureTasks.map(t => t.id)])];
                }
            }

            if (idsToDelete.length > 0) {
                const { error: subtaskError } = await supabase.from('subtasks').delete().in('todo_id', idsToDelete);
                if (subtaskError) throw subtaskError;
                
                const { error: todoError } = await supabase.from('todos').delete().in('id', idsToDelete);
                if (todoError) throw todoError;
            }

            setAllTodos(prevAllTodos => {
                const newAllTodos = JSON.parse(JSON.stringify(prevAllTodos));
                const deleteIdSet = new Set(idsToDelete);
                for (const dateKey in newAllTodos) {
                    newAllTodos[dateKey] = newAllTodos[dateKey].filter((t: Todo) => !deleteIdSet.has(t.id));
                    if (newAllTodos[dateKey].length === 0) {
                        delete newAllTodos[dateKey];
                    }
                }
                return newAllTodos;
            });

        } catch (error: any) {
            console.error("Error deleting todo series from client:", error);
            alert(`Error al eliminar la tarea: ${error.message}\n\nLos datos pueden estar desincronizados. Por favor, recarga la página.`);
        }
    };

    // --- Notes Handlers ---
    const handleAddFolder = async (name: string) => {
        const { data: newFolder, error } = await supabase.from('folders').insert({ name, user_id: currentUser.id }).select().single();
        if (error) { console.error("Error adding folder:", error); return null; }
        setFolders(prev => [{...newFolder, notes: []}, ...prev]);
        return newFolder;
    };

    const handleUpdateFolder = async (folderId: number, name: string) => {
        const { error } = await supabase.from('folders').update({ name }).eq('id', folderId);
        if (error) { console.error("Error updating folder:", error); return; }
        setFolders(prev => prev.map(f => f.id === folderId ? {...f, name} : f));
    };
    
    const handleDeleteFolder = async (folderId: number) => {
        const { error: notesError } = await supabase.from('notes').delete().eq('folder_id', folderId);
        if (notesError) {
            console.error("Error deleting notes in folder:", notesError);
            alert(`Error al eliminar las notas: ${notesError.message}`);
            return;
        }

        const { error: folderError } = await supabase.from('folders').delete().eq('id', folderId);
        if (folderError) {
            console.error("Error deleting folder:", folderError);
            alert(`Error al eliminar la carpeta: ${folderError.message}`);
            return;
        }
        setFolders(prev => prev.filter(f => f.id !== folderId));
    };
    
    const handleAddNote = async (folderId: number) => {
        const { data: newNote, error } = await supabase.from('notes').insert({ folder_id: folderId, user_id: currentUser.id, title: "", content: "" }).select().single();
        if (error) { console.error("Error adding note:", error); return null; }
        setFolders(prev => prev.map(f => f.id === folderId ? {...f, notes: [newNote, ...f.notes]} : f));
        return newNote;
    };
    
    const handleUpdateNote = async (note: Note) => {
        const { error } = await supabase.from('notes').update({ title: note.title, content: note.content, updated_at: new Date().toISOString() }).eq('id', note.id);
        if (error) { console.error("Error updating note:", error); return; }
        setFolders(prev => prev.map(f => 
        f.id === note.folder_id 
            ? {...f, notes: f.notes.map(n => n.id === note.id ? note : n).sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())} 
            : f
        ));
    };

    const handleDeleteNote = async (noteId: number, folderId: number) => {
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) { 
            console.error("Error deleting note:", error);
            alert(`Error al eliminar la nota: ${error.message}`);
            return; 
        }
        setFolders(prev => prev.map(f => f.id === folderId ? {...f, notes: f.notes.filter(n => n.id !== noteId)} : f));
    };

    // --- Playlist Handlers ---
    const handleAddPlaylist = async (playlistData: Omit<Playlist, 'id' | 'user_id' | 'created_at'>) => {
        const { data: newPlaylist, error } = await supabase.from('playlists').insert({ ...playlistData, user_id: currentUser.id }).select().single();
        if (error) { console.error("Error adding playlist:", error); return; }
        setPlaylists(prev => [...prev, newPlaylist]);
    };

    const handleUpdatePlaylist = async (playlist: Playlist) => {
        const { error } = await supabase.from('playlists').update(playlist).eq('id', playlist.id);
        if (error) { console.error("Error updating playlist:", error); return; }
        setPlaylists(prev => prev.map(p => p.id === playlist.id ? playlist : p));
    };
    
    const handleDeletePlaylist = async (playlistId: number) => {
        const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
        if (error) { console.error("Error deleting playlist:", error); return; }
        setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    };


    const handleSelectTrack = (track: Playlist, queue: Playlist[]) => {
      if(track.platform === 'youtube') { setActiveTrack({ ...track, queue }); if(activeSpotifyTrack) setActiveSpotifyTrack(null); }
      else { setActiveSpotifyTrack({ ...track, queue }); if(activeTrack) setActiveTrack(null); }
    };

    const handlePomodoroToggle = () => setPomodoroState(s => ({ ...s, isActive: !s.isActive }));

    const handleAddBackground = async (file: File) => {
        if (!appFolderId.current || !gdriveToken) return;
        const metadata = { name: file.name, mimeType: file.type, parents: [appFolderId.current], appProperties: { type: 'background', isFavorite: 'false' } };
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', file);
        try {
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: new Headers({ 'Authorization': `Bearer ${gdriveToken}` }), body: form });
            if (!response.ok) { throw new Error(await response.text()); }
            const newFile = await response.json();
            const newBg: Background = { id: newFile.id, name: file.name, url: URL.createObjectURL(file), type: file.type.startsWith('video') ? 'video' : 'image', isFavorite: false };
            setUserBackgrounds(prev => [...prev, newBg]);
            setActiveBackground(newBg);
        } catch (e) { console.error("Error uploading background to Drive", e); }
    };
    
    const handleDeleteBackground = async (id: string) => {
        try {
            await window.gapi.client.drive.files.delete({ fileId: id });
            setUserBackgrounds(prev => prev.filter(bg => { if (bg.id === id) { URL.revokeObjectURL(bg.url); return false; } return true; }));
            if (activeBackground?.id === id) setActiveBackground(null);
        } catch (e) { console.error("Error deleting background from Drive", e); }
    };

    const handleToggleFavoriteBackground = async (id: string) => {
        const bg = userBackgrounds.find(b => b.id === id);
        if (!bg || !gdriveToken) return;
        const newFavState = !bg.isFavorite;
        try {
            await window.gapi.client.drive.files.update({ fileId: id, resource: { appProperties: { isFavorite: String(newFavState) } } as any });
            setUserBackgrounds(bgs => bgs.map(b => b.id === id ? {...b, isFavorite: newFavState} : b));
        } catch (e) { console.error("Error updating favorite state in Drive", e); }
    };

    const handleAddGalleryImages = async (files: File[]) => {
      if (!appFolderId.current || !gdriveToken) return;
      for (const file of files) {
        try {
            const form = new FormData();
            form.append('metadata', new Blob([JSON.stringify({ name: file.name, mimeType: file.type, parents: [appFolderId.current] })], { type: 'application/json' }));
            form.append('file', file);
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: new Headers({ 'Authorization': `Bearer ${gdriveToken}` }), body: form });
            if (!response.ok) { throw new Error(await response.text()); }
            const newFile = await response.json();
            setGalleryImages(prev => [{ id: newFile.id, url: URL.createObjectURL(file) }, ...prev]);
        } catch(e) { console.error("Error processing file upload:", e); }
      }
    };

    const handleDeleteGalleryImage = async (id: string) => {
      try {
          await window.gapi.client.drive.files.delete({ fileId: id });
          setGalleryImages(prev => prev.filter(img => { if (img.id === id) { URL.revokeObjectURL(img.url); return false; } return true; }));
      } catch (e) { console.error("Error deleting file from Drive", e); }
    };

    const handleAddQuickNote = async (text: string) => {
        const { data: newNote, error } = await supabase.from('quick_notes').insert({ text, user_id: currentUser.id }).select().single();
        if (error) {
            console.error("Error adding quick note:", error);
            alert(`Error al guardar la nota: ${error.message}`);
            return;
        }
        setQuickNotes(prev => [newNote, ...prev]);
    };

    const handleDeleteQuickNote = async (id: number) => {
        const { error } = await supabase.from('quick_notes').delete().eq('id', id);
        if (error) {
            console.error("Error deleting quick note:", error);
            alert(`Error al eliminar la nota: ${error.message}`);
            return;
        }
        setQuickNotes(prev => prev.filter(qn => qn.id !== id));
    };

    const handleClearAllQuickNotes = async () => {
        const noteIdsToDelete = quickNotes.map(note => note.id);
        if (noteIdsToDelete.length === 0) return;

        const { error } = await supabase.from('quick_notes').delete().in('id', noteIdsToDelete);
        if (error) {
            console.error("Error clearing all quick notes:", error);
            alert(`Error al limpiar las notas: ${error.message}`);
            return;
        }
        setQuickNotes([]);
    };

    const userName = currentUser.email!.split('@')[0];
    const capitalizedUserName = userName.charAt(0).toUpperCase() + userName.slice(1);

    const renderContent = () => {
        switch (activeTab) {
            case 'home':
                return (
                    <>
                        <MobileHeader title="Hoy" />
                        <div className="p-4 space-y-3">
                            <Greeting name={capitalizedUserName} />
                             <MobilePomodoroWidget
                                timeLeft={pomodoroState.timeLeft}
                                isActive={pomodoroState.isActive}
                                mode={pomodoroState.mode}
                                onToggle={handlePomodoroToggle}
                                onOpenModal={() => setIsPomodoroModalOpen(true)}
                            />
                            <BibleVerse />
                            <TodaysAgenda 
                                tasks={todayAgendaTasks} 
                                onToggleTask={(id) => handleToggleTodo(id)} 
                                onToggleSubtask={handleToggleSubtask}
                                quickNotes={quickNotes}
                                onAddQuickNote={handleAddQuickNote}
                                onDeleteQuickNote={handleDeleteQuickNote}
                                onClearAllQuickNotes={handleClearAllQuickNotes}
                             />
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
                            toggleTodo={handleToggleTodo}
                            deleteTodo={handleDeleteTodo}
                            updateTodo={handleUpdateTodo}
                            onEditTodo={setTaskToEdit}
                            selectedDate={selectedDate}
                            setSelectedDate={setSelectedDate}
                            datesWithTasks={datesWithTasks}
                            datesWithAllTasksCompleted={datesWithAllTasksCompleted}
                        />
                    </div>
                );
            case 'notes':
                return (
                    <div className="h-full">
                      <NotesSection 
                        isMobile={true} 
                        folders={folders} 
                        onAddFolder={handleAddFolder}
                        onUpdateFolder={handleUpdateFolder}
                        onDeleteFolder={handleDeleteFolder}
                        onAddNote={handleAddNote}
                        onUpdateNote={handleUpdateNote}
                        onDeleteNote={handleDeleteNote}
                      />
                    </div>
                );
            case 'gallery':
                return (
                    <div className="flex flex-col h-full">
                        <MobileHeader title="Galería" />
                        <ImageGallery 
                          isMobile={true} 
                          images={galleryImages} 
                          onAddImages={handleAddGalleryImages} 
                          onDeleteImage={handleDeleteGalleryImage} 
                          isSignedIn={!!gdriveToken}
                          onAuthClick={handleAuthClick}
                          isGapiReady={gapiReady && gisReady}
                          isLoading={galleryIsLoading}
                        />
                    </div>
                );
            case 'games':
                return (
                    <div className="h-full">
                        <MobileHeader title="Centro de Juegos" />
                        <GamesHub
                            galleryImages={galleryImages}
                            isMobile={true}
                            currentUser={capitalizedUserName}
                        />
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
                            <div className="bg-white/70 dark:bg-gray-800/70 p-4 rounded-2xl shadow-lg flex justify-between items-center">
                                <h3 className="font-bold text-primary-dark dark:text-primary">Notificaciones</h3>
                                <NotificationManager />
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
    
    if (!initialized) return <div className="h-screen w-screen bg-secondary-lighter dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-600 dark:text-gray-100">Cargando pollito...</p></div>;

    return (
        <div className="h-[100dvh] w-screen text-gray-800 dark:text-gray-100 font-sans flex flex-col">
            {activeBackground ? (
                activeBackground.type === 'video' ? (
                    <video key={activeBackground.id} src={activeBackground.url} autoPlay loop muted className="absolute top-0 left-0 w-full h-full object-cover -z-30"/>
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
              // Auth Props
              isSignedIn={!!gdriveToken}
              onAuthClick={handleAuthClick}
              isGapiReady={gapiReady && gisReady}
              // Colors
              colors={themeColors}
              onColorChange={onThemeColorChange}
              onReset={onResetThemeColors}
              // Backgrounds
              activeBackground={activeBackground}
              userBackgrounds={userBackgrounds}
              onSelectBackground={setActiveBackground}
              onAddBackground={handleAddBackground}
              onDeleteBackground={handleDeleteBackground}
              onToggleFavorite={handleToggleFavoriteBackground}
              backgroundsLoading={backgroundsAreLoading}
              // Ambience
              particleType={particleType}
              setParticleType={setParticleType}
              ambientSound={ambientSound}
              setAmbientSound={setAmbientSound}
            />
            <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} quote={completionQuote}/>
            <TaskDetailsModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} onSave={handleUpdateTodo} todo={taskToEdit} />
            
            {isAiBrowserOpen && (
                <div className="fixed inset-0 bg-secondary-lighter/90 dark:bg-gray-900 z-[100] animate-deploy">
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


const App: React.FC = () => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeColors, setThemeColors] = useState<ThemeColors>(DEFAULT_COLORS);
  const isMobile = useMediaQuery('(max-width: 767px)');
  
  const settingsSaveTimeout = useRef<number | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [activeBackground, setActiveBackground] = useState<Background | null>(null);
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


  useEffect(() => {
    const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load all settings from Supabase on user login
  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    };

    const loadSettings = async () => {
      const { data, error } = await supabase.from('site_settings').select('*').single();
      
      if (data) {
        setTheme(data.theme_mode || 'light');
        setThemeColors(data.theme_colors || DEFAULT_COLORS);
        setParticleType(data.particle_type || 'none');
        setAmbientSound(data.ambient_sound || { type: 'none', volume: 0.5 });
        setPomodoroState(prev => ({ ...prev, ...(data.pomodoro_config || {}) }));
        // active_background_id will be handled by the background loading effect
      } else if (!error) {
        // No settings found, create initial row with defaults
        await supabase.from('site_settings').insert({ 
            user_id: user.id,
            theme_mode: 'light',
            theme_colors: DEFAULT_COLORS,
            pomodoro_config: { durations: pomodoroState.durations, backgroundTimerOpacity: pomodoroState.backgroundTimerOpacity, showBackgroundTimer: pomodoroState.showBackgroundTimer }
        });
      }
      setInitialized(true);
      setLoading(false);
    };

    loadSettings();

  }, [user]);


  // Debounced save settings to Supabase
  useEffect(() => {
    if (!initialized || !user) return;

    if (settingsSaveTimeout.current) {
        clearTimeout(settingsSaveTimeout.current);
    }

    settingsSaveTimeout.current = window.setTimeout(async () => {
        const settingsPayload = {
            user_id: user.id,
            theme_mode: theme,
            theme_colors: themeColors,
            active_background_id: activeBackground?.id || null,
            particle_type: particleType,
            ambient_sound: ambientSound,
            pomodoro_config: {
                durations: pomodoroState.durations,
                backgroundTimerOpacity: pomodoroState.backgroundTimerOpacity,
                showBackgroundTimer: pomodoroState.showBackgroundTimer
            }
        };

        const { error } = await supabase.from('site_settings').upsert(settingsPayload, { onConflict: 'user_id' });
        if (error) {
            console.error("Error saving site settings:", error);
        }
    }, 1500); // Wait 1.5 seconds after the last change to save

    return () => {
        if (settingsSaveTimeout.current) {
            clearTimeout(settingsSaveTimeout.current);
        }
    };
  }, [theme, themeColors, activeBackground, particleType, ambientSound, pomodoroState, initialized, user]);


  // Handle dark/light mode switching
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  // Handle custom color application
  useEffect(() => {
    const root = document.documentElement;
    const { primary, secondary } = themeColors;
    const isDark = theme === 'dark';

    // Primary Colors
    root.style.setProperty('--color-primary', primary);
    root.style.setProperty('--color-primary-light', isDark ? adjustBrightness(primary, -25) : adjustBrightness(primary, 25));
    root.style.setProperty('--color-primary-dark', isDark ? adjustBrightness(primary, 15) : adjustBrightness(primary, -15));
    
    // Secondary Colors
    root.style.setProperty('--color-secondary', secondary);
    root.style.setProperty('--color-secondary-light', isDark ? adjustBrightness(secondary, -25) : adjustBrightness(secondary, 25));
    root.style.setProperty('--color-secondary-dark', isDark ? adjustBrightness(secondary, 15) : adjustBrightness(secondary, -15));
    root.style.setProperty('--color-secondary-lighter', isDark ? adjustBrightness(secondary, -50) : adjustBrightness(secondary, 60));
  }, [themeColors, theme]);


  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleThemeColorChange = (colorName: keyof ThemeColors, value: string) => {
    setThemeColors(prev => ({...prev, [colorName]: value}));
  }

  const handleResetThemeColors = () => {
    setThemeColors(DEFAULT_COLORS);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };
  
  if (loading) {
     return <div className="h-screen w-screen bg-secondary-lighter dark:bg-gray-900 flex items-center justify-center"><p className="text-gray-600 dark:text-gray-100">Cargando pollito...</p></div>;
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }
  
  // Pass down all states to the correct App component
  const appProps = {
      currentUser: user,
      onLogout: handleLogout,
      theme,
      toggleTheme,
      themeColors,
      onThemeColorChange: handleThemeColorChange,
      onResetThemeColors: handleResetThemeColors,
      // Pass down all the other states
      activeBackground,
      setActiveBackground,
      particleType,
      setParticleType,
      ambientSound,
      setAmbientSound,
      pomodoroState,
      setPomodoroState
  };
  
  const commonAppProps = {
      ...appProps,
      // Remove props that are now managed inside Desktop/Mobile App
      // These are passed to the wrapper, but the actual app components will need
      // their own internal state management for things not in the settings table
  };
  

  if (isMobile) {
    // MobileApp needs its props adapted
    const mobileSpecificProps = { ...appProps };
    // We pass all settings states down to mobile
    return <MobileApp {...mobileSpecificProps} />;
  }
  
  // DesktopApp needs its props adapted
  const desktopSpecificProps = { ...appProps };
  // We pass all settings states down to desktop
  return <DesktopApp {...desktopSpecificProps} />;
};

export default App;