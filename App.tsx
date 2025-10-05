import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { config } from './config';

// --- Google Drive Configuration ---
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
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
  activeBackground: Background | null;
  setActiveBackground: React.Dispatch<React.SetStateAction<Background | null>>;
  particleType: ParticleType;
  setParticleType: React.Dispatch<React.SetStateAction<ParticleType>>;
  ambientSound: { type: AmbientSoundType; volume: number };
  setAmbientSound: React.Dispatch<React.SetStateAction<{ type: AmbientSoundType; volume: number }>>;
  pomodoroState: any; // Simplified for brevity
  setPomodoroState: React.Dispatch<React.SetStateAction<any>>;
}

const DesktopApp: React.FC<AppProps> = ({ 
  currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
  activeBackground, setActiveBackground, particleType, setParticleType, ambientSound, setAmbientSound,
  pomodoroState, setPomodoroState
}) => {
  const getUserKey = useCallback((key: string) => `${currentUser.email}_${key}`, [currentUser]);

  const [allTodos, setAllTodos] = useState<{ [key: string]: Todo[] }>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [initialized, setInitialized] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionQuote, setCompletionQuote] = useState('');
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [userBackgrounds, setUserBackgrounds] = useState<Background[]>([]);
  
  const [openWindows, setOpenWindows] = useState<WindowType[]>([]);
  const [windowStates, setWindowStates] = useState<{ [key in WindowType]?: WindowState }>({});
  const [focusedWindow, setFocusedWindow] = useState<WindowType | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeTrack, setActiveTrack] = useState<Playlist | null>(null);
  const [activeSpotifyTrack, setActiveSpotifyTrack] = useState<Playlist | null>(null);
  
  const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [browserSession, setBrowserSession] = useState<BrowserSession>({});
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
        const response = await window.gapi.client.drive.files.list({
            q: `mimeType='application/vnd.google-apps.folder' and name='${APP_FOLDER_NAME}' and trashed=false`,
            fields: 'files(id)',
        });
        if (response.result.files && response.result.files.length > 0) {
            appFolderId.current = response.result.files[0].id!;
        } else {
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
        await window.gapi.client.drive.files.delete({ fileId: id });
        setGalleryImages(prev => prev.filter(img => {
            if (img.id === id) {
                URL.revokeObjectURL(img.url);
                return false;
            }
            return true;
        }));
    } catch (e) {
        console.error("Error deleting image from Drive", e);
        alert("No se pudo eliminar la imagen de Google Drive.");
    }
  };

  // --- End Google Drive Handlers ---
  
  // --- Window Management ---
  const toggleWindow = useCallback((windowId: WindowType) => {
    setOpenWindows(prev => {
      if (prev.includes(windowId)) {
        return prev.filter(id => id !== windowId);
      } else {
        setFocusedWindow(windowId);
        return [...prev, windowId];
      }
    });
  }, []);

  const focusWindow = useCallback((windowId: WindowType) => {
    setFocusedWindow(windowId);
  }, []);
  
  const handleWindowStateChange = useCallback((windowId: WindowType, newState: WindowState) => {
      setWindowStates(prev => ({ ...prev, [windowId]: newState }));
  }, []);

  const getZIndex = useCallback((windowId: WindowType) => {
    if (focusedWindow === windowId) return 1000;
    const index = openWindows.indexOf(windowId);
    return index !== -1 ? 500 + index : 0;
  }, [focusedWindow, openWindows]);
  // --- End Window Management ---

  // --- TODO Handlers ---
  const handleAddTodo = async (text: string) => {
    const dateKey = formatDateKey(selectedDate);
    const newTodo: Omit<Todo, 'id'> = {
        text,
        completed: false,
        priority: 'medium',
        due_date: dateKey,
        user_id: currentUser.id,
    };
    const { data, error } = await supabase.from('todos').insert(newTodo).select().single();

    if (error) {
        console.error("Error adding todo:", error);
    } else if(data) {
        setAllTodos(prev => ({
            ...prev,
            [dateKey]: [...(prev[dateKey] || []), {...data, subtasks: []}],
        }));
    }
  };

  const handleToggleTodo = async (id: number) => {
      const dateKey = formatDateKey(selectedDate);
      const targetTodo = allTodos[dateKey]?.find(t => t.id === id);
      if (!targetTodo) return;

      const newCompletedState = !targetTodo.completed;
      const { data, error } = await supabase.from('todos').update({ completed: newCompletedState }).eq('id', id);

      if (error) {
          console.error("Error toggling todo:", error);
      } else {
          let updatedTodos = { ...allTodos };
          updatedTodos[dateKey] = allTodos[dateKey].map(t =>
              t.id === id ? { ...t, completed: newCompletedState, subtasks: t.subtasks?.map(st => ({...st, completed: newCompletedState})) || [] } : t
          );
          setAllTodos(updatedTodos);
          
          if (newCompletedState && targetTodo.recurrence?.frequency !== 'none') {
             const newRecurring = await generateRecurringTasks(targetTodo, updatedTodos);
             setAllTodos(newRecurring);
          }

          // Check for completion
          if (newCompletedState && updatedTodos[dateKey].every(t => t.completed)) {
              setCompletionQuote(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
              setShowCompletionModal(true);
              triggerConfetti();
          }
      }
  };
  
  const handleDeleteTodo = useCallback(async (id: number) => {
    const dateKey = formatDateKey(selectedDate);
    const todoToDelete = allTodos[dateKey]?.find(t => t.id === id);
    if (!todoToDelete) return;
    
    let idsToDelete: number[] = [id];
    // If it's a recurring task, find all future instances
    if (todoToDelete.recurrence?.id) {
        const recurrenceId = todoToDelete.recurrence.id;
        const allTasksFlat: Todo[] = Object.values(allTodos).flat();
        const futureInstances = allTasksFlat.filter(t =>
            t.recurrence?.id === recurrenceId && t.due_date && todoToDelete.due_date && t.due_date >= todoToDelete.due_date
        );
        idsToDelete = futureInstances.map(t => t.id);
    }

    // 1. Delete all subtasks associated with the todos to be deleted
    const { error: subtaskError } = await supabase.from('subtasks').delete().in('todo_id', idsToDelete);
    if (subtaskError) {
        console.error("Error deleting subtasks:", subtaskError);
        return; // Stop if subtasks can't be deleted
    }

    // 2. Delete the main todos
    const { error: todoError } = await supabase.from('todos').delete().in('id', idsToDelete);

    if (todoError) {
        console.error("Error deleting todo(s):", todoError);
    } else {
        const idsToDeleteSet = new Set(idsToDelete);
        const newAllTodos = { ...allTodos };
        for (const key in newAllTodos) {
            newAllTodos[key] = newAllTodos[key].filter(t => !idsToDeleteSet.has(t.id));
            if (newAllTodos[key].length === 0) {
                delete newAllTodos[key];
            }
        }
        setAllTodos(newAllTodos);
    }
}, [allTodos, selectedDate]);


  const handleUpdateTodo = async (todoToUpdate: Todo) => {
      const { data, error } = await supabase
          .from('todos')
          .update({
              text: todoToUpdate.text,
              notes: todoToUpdate.notes,
              due_date: todoToUpdate.due_date,
              completed: todoToUpdate.completed,
              start_time: todoToUpdate.start_time,
              end_time: todoToUpdate.end_time,
              priority: todoToUpdate.priority,
              reminder_offset: todoToUpdate.reminder_offset,
              recurrence: todoToUpdate.recurrence,
              notification_sent: todoToUpdate.notification_sent,
          })
          .eq('id', todoToUpdate.id);
          
      if (error) {
          console.error("Error updating todo:", error);
          return;
      }

      // Handle subtasks
      const existingSubtaskIds = todoToUpdate.subtasks?.filter(st => st.id > 10000).map(st => st.id) || [];
      const newSubtasks = todoToUpdate.subtasks?.filter(st => st.id <= 10000) || [];
      const subtasksToDelete = (allTodos[todoToUpdate.due_date!]?.find(t => t.id === todoToUpdate.id)?.subtasks || [])
          .filter(st => !existingSubtaskIds.includes(st.id));

      if (subtasksToDelete.length > 0) {
          await supabase.from('subtasks').delete().in('id', subtasksToDelete.map(st => st.id));
      }
      if (newSubtasks.length > 0) {
          await supabase.from('subtasks').insert(newSubtasks.map(st => ({ text: st.text, completed: st.completed, todo_id: todoToUpdate.id })));
      }
      if (todoToUpdate.subtasks && todoToUpdate.subtasks.length > 0) {
        for (const subtask of todoToUpdate.subtasks) {
          if (subtask.id > 10000) {
            await supabase.from('subtasks').update({ completed: subtask.completed, text: subtask.text }).eq('id', subtask.id);
          }
        }
      }
      
      const { data: updatedSubtasks } = await supabase.from('subtasks').select('*').eq('todo_id', todoToUpdate.id);
      
      const todoWithUpdatedSubtasks = { ...todoToUpdate, subtasks: updatedSubtasks || [] };

      // Update state
      let updatedAllTodos = { ...allTodos };
      let found = false;
      for (const dateKey in updatedAllTodos) {
          const index = updatedAllTodos[dateKey].findIndex(t => t.id === todoToUpdate.id);
          if (index !== -1) {
              const oldDateKey = dateKey;
              // If date has changed, move the task
              if (oldDateKey !== todoToUpdate.due_date) {
                  updatedAllTodos[oldDateKey] = updatedAllTodos[oldDateKey].filter(t => t.id !== todoToUpdate.id);
                  if (updatedAllTodos[oldDateKey].length === 0) delete updatedAllTodos[oldDateKey];

                  const newDateKey = todoToUpdate.due_date!;
                  if (!updatedAllTodos[newDateKey]) updatedAllTodos[newDateKey] = [];
                  updatedAllTodos[newDateKey].push(todoWithUpdatedSubtasks);

              } else {
                  updatedAllTodos[dateKey][index] = todoWithUpdatedSubtasks;
              }
              found = true;
              break;
          }
      }

      if (todoToUpdate.recurrence?.frequency !== 'none') {
        updatedAllTodos = await generateRecurringTasks(todoWithUpdatedSubtasks, updatedAllTodos);
      }
      
      setAllTodos(updatedAllTodos);
      setTaskToEdit(null);
  };
  // --- End TODO Handlers ---

  // --- Quick Notes Handlers ---
  const handleAddQuickNote = async (text: string) => {
      const { data, error } = await supabase.from('quick_notes').insert({ text, user_id: currentUser.id }).select().single();
      if (error) console.error("Error adding quick note:", error);
      else if (data) setQuickNotes(prev => [data, ...prev]);
  };
  const handleDeleteQuickNote = async (id: number) => {
      const { error } = await supabase.from('quick_notes').delete().eq('id', id);
      if (error) console.error("Error deleting quick note:", error);
      else setQuickNotes(prev => prev.filter(n => n.id !== id));
  };
  const handleClearAllQuickNotes = async () => {
      const { error } = await supabase.from('quick_notes').delete().eq('user_id', currentUser.id);
      if (error) console.error("Error clearing quick notes:", error);
      else setQuickNotes([]);
  };
  // --- End Quick Notes Handlers ---
  
  // --- Notes Handlers ---
    const handleAddFolder = async (name: string): Promise<Folder | null> => {
        const { data, error } = await supabase.from('folders').insert({ name, user_id: currentUser.id }).select().single();
        if (error) { console.error("Error adding folder:", error); return null; }
        if (data) {
            const newFolder = { ...data, notes: [] };
            setFolders(prev => [newFolder, ...prev]);
            return newFolder;
        }
        return null;
    };

    const handleUpdateFolder = async (id: number, name: string) => {
        const { error } = await supabase.from('folders').update({ name }).eq('id', id);
        if (error) console.error("Error updating folder:", error);
        else setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    };

    const handleDeleteFolder = async (id: number) => {
        // First delete notes within the folder
        const { error: notesError } = await supabase.from('notes').delete().eq('folder_id', id);
        if(notesError) {
            console.error("Error deleting notes in folder:", notesError);
            return;
        }

        // Then delete the folder
        const { error: folderError } = await supabase.from('folders').delete().eq('id', id);
        if (folderError) {
            console.error("Error deleting folder:", folderError);
        } else {
            setFolders(prev => prev.filter(f => f.id !== id));
        }
    };

    const handleAddNote = async (folderId: number): Promise<Note | null> => {
        const { data, error } = await supabase.from('notes').insert({ folder_id: folderId, user_id: currentUser.id, title: '', content: '' }).select().single();
        if (error) { console.error("Error adding note:", error); return null; }
        if(data) {
            setFolders(prev => prev.map(f => f.id === folderId ? { ...f, notes: [...f.notes, data] } : f));
            return data;
        }
        return null;
    };

    const handleUpdateNote = async (note: Note) => {
        const { id, ...rest } = note;
        const { error } = await supabase.from('notes').update({ title: rest.title, content: rest.content, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) console.error("Error updating note:", error);
        else {
            setFolders(prev => prev.map(f => f.id === note.folder_id ? { ...f, notes: f.notes.map(n => n.id === note.id ? note : n) } : f));
        }
    };

    const handleDeleteNote = async (noteId: number, folderId: number) => {
        const { error } = await supabase.from('notes').delete().eq('id', noteId);
        if (error) console.error("Error deleting note:", error);
        else {
            setFolders(prev => prev.map(f => f.id === folderId ? { ...f, notes: f.notes.filter(n => n.id !== noteId) } : f));
        }
    };
  // --- End Notes Handlers ---

  // --- Playlist Handlers ---
  const handleAddPlaylist = async (playlist: Omit<Playlist, 'id' | 'user_id' | 'created_at'>) => {
      const { data, error } = await supabase.from('playlists').insert({ ...playlist, user_id: currentUser.id }).select().single();
      if (error) console.error("Error adding playlist:", error);
      else if (data) setPlaylists(prev => [...prev, data]);
  };
  const handleUpdatePlaylist = async (playlist: Playlist) => {
      const { id, ...rest } = playlist;
      const { error } = await supabase.from('playlists').update(rest).eq('id', id);
      if (error) console.error("Error updating playlist:", error);
      else setPlaylists(prev => prev.map(p => p.id === id ? playlist : p));
  };
  const handleDeletePlaylist = async (id: number) => {
      const { error } = await supabase.from('playlists').delete().eq('id', id);
      if (error) console.error("Error deleting playlist:", error);
      else setPlaylists(prev => prev.filter(p => p.id !== id));
  };

  const handleSelectTrack = (track: Playlist, queue: Playlist[]) => {
      if (track.platform === 'youtube') setActiveTrack(track);
      else setActiveSpotifyTrack(track);
  };
  // --- End Playlist Handlers ---

  return (
    <main className="h-screen w-screen transition-colors duration-500 overflow-hidden relative" style={{ backgroundColor: theme === 'dark' ? '#111827' : '#FEF3C7' }}>
        {activeBackground?.type === 'video' ? (
            <video
                key={activeBackground.url}
                src={activeBackground.url}
                autoPlay loop muted
                className="absolute inset-0 w-full h-full object-cover -z-10 animate-fade-in"
            />
        ) : (
            <div
                className="absolute inset-0 w-full h-full object-cover -z-10 animate-fade-in bg-cover bg-center"
                style={{ backgroundImage: activeBackground ? `url(${activeBackground.url})` : 'none' }}
            />
        )}
      <ParticleLayer type={particleType} />

      <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isFocusMode ? 'bg-black/50 backdrop-blur-md' : 'opacity-0 pointer-events-none'}`} />

      <div className={`relative z-10 h-full w-full transition-opacity duration-700 ${isFocusMode ? 'opacity-20' : 'opacity-100'}`}>
        <div className="absolute top-4 left-4">
            <Greeting name={currentUser.email?.split('@')[0] || 'Pollito'}/>
        </div>
         <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
                onClick={() => setIsCustomizationPanelOpen(true)}
                className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-pink-500 dark:hover:text-pink-400 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                aria-label="Abrir personalización"
            >
                <PaletteIcon />
            </button>
            <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
            <NotificationManager />
            <button
                onClick={onLogout}
                className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-pink-500 dark:hover:text-pink-400 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                aria-label="Cerrar sesión"
            >
                <LogoutIcon />
            </button>
        </div>

        <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col gap-3">
            <TodaysAgenda
                tasks={todayAgendaTasks}
                onToggleTask={handleToggleTodo}
                onToggleSubtask={(taskId, subtaskId) => {
                    const task = todayAgendaTasks.find(t => t.id === taskId);
                    if (!task) return;
                    const updatedSubtasks = task.subtasks?.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
                    if (updatedSubtasks) handleUpdateTodo({ ...task, subtasks: updatedSubtasks });
                }}
                quickNotes={quickNotes}
                onAddQuickNote={handleAddQuickNote}
                onDeleteQuickNote={handleDeleteQuickNote}
                onClearAllQuickNotes={handleClearAllQuickNotes}
            />
        </div>
        <div className="absolute top-1/2 right-4 -translate-y-1/2 flex flex-col items-center gap-3">
            <BibleVerse />
        </div>
        
        <MemoriesCarousel images={galleryImages} />

      </div>

      {openWindows.map(windowId => (
          <ModalWindow
              key={windowId}
              isOpen={true}
              onClose={() => toggleWindow(windowId)}
              title={windowId.charAt(0).toUpperCase() + windowId.slice(1)}
              isDraggable isResizable noHeader={['browser', 'music', 'notes', 'games'].includes(windowId)}
              windowState={windowStates[windowId]}
              onStateChange={(state) => handleWindowStateChange(windowId, state)}
              zIndex={getZIndex(windowId)}
              onFocus={() => focusWindow(windowId)}
              className={
                windowId === 'todo' ? 'w-[90vw] h-[80vh] max-w-4xl' :
                windowId === 'notes' ? 'w-[90vw] h-[80vh] max-w-4xl' :
                windowId === 'gallery' ? 'w-[90vw] h-[80vh] max-w-3xl' :
                windowId === 'music' ? 'w-[90vw] h-[70vh] max-w-2xl' :
                windowId === 'pomodoro' ? 'w-[320px] h-[360px]' :
                windowId === 'browser' ? 'w-[95vw] h-[90vh] max-w-3xl' :
                windowId === 'games' ? 'w-[90vw] h-[80vh] max-w-3xl' :
                'w-[500px] h-[400px]'
              }
          >
              {windowId === 'todo' && <TodoListModule todos={todayTodos} addTodo={handleAddTodo} toggleTodo={handleToggleTodo} deleteTodo={handleDeleteTodo} updateTodo={handleUpdateTodo} onEditTodo={setTaskToEdit} selectedDate={selectedDate} setSelectedDate={setSelectedDate} datesWithTasks={datesWithTasks} datesWithAllTasksCompleted={datesWithAllTasksCompleted} />}
              {windowId === 'notes' && <NotesSection folders={folders} onAddFolder={handleAddFolder} onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />}
              {windowId === 'gallery' && <ImageGallery images={galleryImages} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} isSignedIn={!!gdriveToken} onAuthClick={handleAuthClick} isGapiReady={gisReady} isLoading={galleryIsLoading} />}
              {windowId === 'music' && <MusicPlayer onSelectTrack={handleSelectTrack} playlists={playlists} onAddPlaylist={handleAddPlaylist} onUpdatePlaylist={handleUpdatePlaylist} onDeletePlaylist={handleDeletePlaylist} onClose={() => toggleWindow('music')} />}
              {windowId === 'pomodoro' && <Pomodoro {...pomodoroState} onToggle={() => setPomodoroState(s => ({ ...s, isActive: !s.isActive }))} onReset={() => setPomodoroState(s => ({ ...s, timeLeft: s.durations[s.mode], isActive: false }))} onSwitchMode={(mode) => setPomodoroState(s => ({ ...s, mode, timeLeft: s.durations[mode], isActive: false }))} onSaveSettings={(durations) => setPomodoroState(s => ({ ...s, durations, timeLeft: durations[s.mode] }))} onToggleBackgroundTimer={() => setPomodoroState(s => ({ ...s, showBackgroundTimer: !s.showBackgroundTimer }))} onSetBackgroundTimerOpacity={(opacity) => setPomodoroState(s => ({ ...s, backgroundTimerOpacity: opacity }))} />}
              {windowId === 'browser' && <Browser session={browserSession} setSession={setBrowserSession} onClose={() => toggleWindow('browser')} currentUser={currentUser} />}
              {windowId === 'games' && <GamesHub galleryImages={galleryImages} currentUser={currentUser.email?.split('@')[0] || ''} />}
          </ModalWindow>
      ))}

      {taskToEdit && (
          <TaskDetailsModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} onSave={handleUpdateTodo} todo={taskToEdit} />
      )}
      
      {activeTrack && <FloatingPlayer track={activeTrack} queue={playlists.filter(p=>p.platform === 'youtube')} onSelectTrack={handleSelectTrack} onClose={() => setActiveTrack(null)} />}
      {activeSpotifyTrack && <SpotifyFloatingPlayer track={activeSpotifyTrack} onClose={() => setActiveSpotifyTrack(null)} />}
      
      {!isFocusMode && <Dock onButtonClick={toggleWindow} openWindows={openWindows} />}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
          <FocusModeButton isFocusMode={isFocusMode} onToggle={() => setIsFocusMode(!isFocusMode)} />
      </div>

      <CustomizationPanel
        isOpen={isCustomizationPanelOpen}
        onClose={() => setIsCustomizationPanelOpen(false)}
        isSignedIn={!!gdriveToken} onAuthClick={handleAuthClick} isGapiReady={gisReady}
        colors={themeColors} onColorChange={onThemeColorChange} onReset={onResetThemeColors}
        activeBackground={activeBackground} userBackgrounds={userBackgrounds} onSelectBackground={setActiveBackground} onAddBackground={() => {}} onDeleteBackground={() => {}} onToggleFavorite={() => {}} backgroundsLoading={backgroundsAreLoading}
        particleType={particleType} setParticleType={setParticleType}
        ambientSound={ambientSound} setAmbientSound={setAmbientSound}
      />

      {pomodoroState.showBackgroundTimer && <BackgroundTimer timeLeft={pomodoroState.timeLeft} opacity={pomodoroState.backgroundTimerOpacity} />}

      <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} quote={completionQuote} />
      <audio ref={pomodoroAudioRef} src={pomodoroAudioSrc} />
      <audio ref={ambientAudioRef} />
    </main>
  );
};

interface MobileAppProps extends AppProps {}

const MobileApp: React.FC<MobileAppProps> = (props) => {
    const { currentUser, onLogout, theme, toggleTheme, pomodoroState, setPomodoroState, activeBackground, particleType, setParticleType, ambientSound, setAmbientSound, themeColors, onThemeColorChange, onResetThemeColors, setActiveBackground } = props;
    const [activeTab, setActiveTab] = useState('home');
    const [allTodos, setAllTodos] = useState<{ [key: string]: Todo[] }>({});
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [folders, setFolders] = useState<Folder[]>([]);
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
    const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
    const [browserSession, setBrowserSession] = useState<BrowserSession>({});
    const [isBrowserOpen, setIsBrowserOpen] = useState(false);
    const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
    const [activeTrack, setActiveTrack] = useState<Playlist | null>(null);
    const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
    
    // Google Drive
    const [gapiReady, setGapiReady] = useState(false);
    const [gisReady, setGisReady] = useState(false);
    const [gdriveToken, setGdriveToken] = useState<string | null>(null);
    const [galleryIsLoading, setGalleryIsLoading] = useState(false);
    const appFolderId = useRef<string | null>(null);
    const tokenClient = useRef<any>(null);


    // Data Loading
    useEffect(() => {
        const initApp = async () => {
            try {
                // Load Todos, Folders, Notes, Playlists, QuickNotes from Supabase
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
                     // Prune old tasks
                    const cutoffDate = new Date();
                    cutoffDate.setMonth(cutoffDate.getMonth() - 3);
                    const cutoffDateString = cutoffDate.toISOString().split('T')[0];
                    const cutoffDateISO = cutoffDate.toISOString();
                    const oldTaskIds = (Object.values(groupedTodos).flat() as Todo[])
                        .filter(task => (task.completed && task.due_date! < cutoffDateString) || (!task.completed && task.created_at! < cutoffDateISO))
                        .map(task => task.id);
                    
                    let prunedGroupedTodos = { ...groupedTodos };
                    if (oldTaskIds.length > 0) {
                        const CHUNK_SIZE = 50;
                        for (let i = 0; i < oldTaskIds.length; i += CHUNK_SIZE) {
                            const chunk = oldTaskIds.slice(i, i + CHUNK_SIZE);
                            const { error: subtaskError } = await supabase.from('subtasks').delete().in('todo_id', chunk);
                            if (!subtaskError) {
                                const { error } = await supabase.from('todos').delete().in('id', chunk);
                                if (!error) {
                                    const chunkIdSet = new Set(chunk);
                                    Object.keys(prunedGroupedTodos).forEach(dateKey => {
                                        prunedGroupedTodos[dateKey] = prunedGroupedTodos[dateKey].filter(t => !chunkIdSet.has(t.id));
                                        if (prunedGroupedTodos[dateKey].length === 0) delete prunedGroupedTodos[dateKey];
                                    });
                                }
                            }
                        }
                    }
                    finalTodos = prunedGroupedTodos;
                }
                setAllTodos(finalTodos);

                const { data: foldersData } = await supabase.from('folders').select('*');
                const { data: notesData } = await supabase.from('notes').select('*');
                if (foldersData && notesData) {
                    setFolders(foldersData.map(f => ({...f, notes: notesData.filter(n => n.folder_id === f.id)})));
                }

                const { data: playlistsData } = await supabase.from('playlists').select('*');
                if (playlistsData) setPlaylists(playlistsData);

                const { data: quickNotesData } = await supabase.from('quick_notes').select('*').order('created_at', { ascending: false });
                if (quickNotesData) setQuickNotes(quickNotesData);
                
            } catch (error) {
                console.error("Failed to initialize mobile app state:", error);
            }
        };
        initApp();
    }, [currentUser]);
    
    // --- Google API Init ---
     useEffect(() => {
      const gapiPoll = setInterval(() => { if (window.gapi && window.gapi.load) { clearInterval(gapiPoll); window.gapi.load('client', () => setGapiReady(true)); } }, 100);
      const gisPoll = setInterval(() => { if (window.google && window.google.accounts) { clearInterval(gisPoll); setGisReady(true); } }, 100);
      return () => { clearInterval(gapiPoll); clearInterval(gisPoll); };
    }, []);

    useEffect(() => {
      if (gapiReady && gisReady) {
          if (!CLIENT_ID) { console.warn('Google Client ID is missing.'); return; }
          try {
            tokenClient.current = window.google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: '' });
          } catch (e) { console.error("Error initializing Google token client:", e); }
      }
    }, [gapiReady, gisReady]);

    const findOrCreateAppFolder = useCallback(async () => { /* ... (similar to desktop) ... */ }, []);
    const loadGalleryImagesFromDrive = useCallback(async () => { /* ... (similar to desktop, uses setGalleryImages) ... */ }, []);
    
    const handleAuthClick = useCallback(async () => {
        if (!tokenClient.current) return;
        tokenClient.current.callback = async (resp: any) => {
            if (resp.error) throw (resp);
            setGdriveToken(resp.access_token);
            window.gapi.client.setToken({ access_token: resp.access_token });
            await window.gapi.client.load('drive', 'v3');
            await findOrCreateAppFolder();
            await loadGalleryImagesFromDrive();
        };
        if (!gdriveToken) tokenClient.current.requestAccessToken({ prompt: 'consent' });
    }, [gdriveToken, findOrCreateAppFolder, loadGalleryImagesFromDrive]);
    // --- End Google API Init ---

    // Data Handlers (pass these down to components)
    // NOTE: These are simplified for brevity. The full logic from DesktopApp should be implemented here.
    const handleAddTodo = async (text: string) => { /* ... */ };
    const handleToggleTodo = async (id: number) => { /* ... */ };
    const handleDeleteTodo = async (id: number) => { /* ... */ };
    const handleUpdateTodo = async (todo: Todo) => { /* ... */ };
    const handleAddFolder = async (name: string) => { /* ... */ return null; };
    const handleUpdateFolder = async (id: number, name: string) => { /* ... */ };
    const handleDeleteFolder = async (id: number) => { /* ... */ };
    const handleAddNote = async (folderId: number) => { /* ... */ return null; };
    const handleUpdateNote = async (note: Note) => { /* ... */ };
    const handleDeleteNote = async (noteId: number, folderId: number) => { /* ... */ };
    const handleAddPlaylist = async (playlist: Omit<Playlist, 'id' | 'user_id' | 'created_at'>) => { /* ... */ };
    const handleUpdatePlaylist = async (playlist: Playlist) => { /* ... */ };
    const handleDeletePlaylist = async (id: number) => { /* ... */ };
    const handleAddGalleryImages = async (files: File[]) => { /* ... */ };
    const handleDeleteGalleryImage = async (id: string) => { /* ... */ };


    const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
    const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
    const todayTodos = useMemo(() => allTodos[formatDateKey(new Date())] || [], [allTodos]);
    
    const propsForTabs = {
        isMobile: true,
        currentUser: currentUser.email?.split('@')[0] || '',
    };
    
    return (
        <main className="h-screen w-screen transition-colors duration-500 overflow-hidden relative" style={{ backgroundColor: theme === 'dark' ? '#111827' : '#FEF3C7' }}>
            {activeBackground?.type === 'video' ? <video key={activeBackground.url} src={activeBackground.url} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover -z-10 animate-fade-in" />
                : <div className="absolute inset-0 w-full h-full object-cover -z-10 animate-fade-in bg-cover bg-center" style={{ backgroundImage: activeBackground ? `url(${activeBackground.url})` : 'none' }} />
            }
            <ParticleLayer type={particleType} />

            <div className="h-full w-full pb-[76px]">
                {activeTab === 'home' && (
                    <div className="flex flex-col h-full overflow-y-auto p-4 gap-4">
                        <Greeting name={currentUser.email?.split('@')[0] || 'Pollito'} className="self-start"/>
                        <MobilePomodoroWidget {...pomodoroState} onToggle={() => setPomodoroState(s => ({...s, isActive: !s.isActive}))} onOpenModal={() => setIsPomodoroModalOpen(true)} />
                        <TodaysAgenda
                            tasks={todayTodos.sort((a, b) => (a.start_time || '23:59').localeCompare(b.start_time || '23:59'))}
                            onToggleTask={handleToggleTodo}
                            onToggleSubtask={(taskId, subtaskId) => {
                                const task = todayTodos.find(t => t.id === taskId);
                                if (!task) return;
                                const updatedSubtasks = task.subtasks?.map(st => st.id === subtaskId ? { ...st, completed: !st.completed } : st);
                                if (updatedSubtasks) handleUpdateTodo({ ...task, subtasks: updatedSubtasks });
                            }}
                            quickNotes={quickNotes}
                            onAddQuickNote={() => {}}
                            onDeleteQuickNote={() => {}}
                            onClearAllQuickNotes={() => {}}
                        />
                        <BibleVerse />
                    </div>
                )}
                 {activeTab === 'tasks' && <TodoListModule {...propsForTabs} todos={allTodos[formatDateKey(selectedDate)] || []} addTodo={handleAddTodo} toggleTodo={handleToggleTodo} deleteTodo={handleDeleteTodo} updateTodo={handleUpdateTodo} onEditTodo={setTaskToEdit} selectedDate={selectedDate} setSelectedDate={setSelectedDate} datesWithTasks={datesWithTasks} datesWithAllTasksCompleted={datesWithAllTasksCompleted} />}
                 {activeTab === 'notes' && <NotesSection {...propsForTabs} folders={folders} onAddFolder={handleAddFolder} onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />}
                 {activeTab === 'gallery' && <ImageGallery {...propsForTabs} images={galleryImages} onAddImages={handleAddGalleryImages} onDeleteImage={handleDeleteGalleryImage} isSignedIn={!!gdriveToken} onAuthClick={handleAuthClick} isGapiReady={gisReady} isLoading={galleryIsLoading}/>}
                 {activeTab === 'games' && <GamesHub {...propsForTabs} galleryImages={galleryImages} />}
                 {activeTab === 'more' && (
                    <div className="p-4">
                         <MobileHeader title="Más Opciones" />
                         <div className="mt-4 space-y-2">
                            <button onClick={() => setIsCustomizationOpen(true)} className="w-full flex items-center justify-between bg-white/70 dark:bg-gray-700/70 p-4 rounded-lg text-left">
                                <span className="font-semibold text-gray-700 dark:text-gray-200">Personalización</span>
                                <ChevronRightIcon />
                            </button>
                             <button onClick={onLogout} className="w-full flex items-center justify-between bg-white/70 dark:bg-gray-700/70 p-4 rounded-lg text-left">
                                <span className="font-semibold text-red-500 dark:text-red-400">Cerrar Sesión</span>
                            </button>
                         </div>
                    </div>
                 )}
            </div>
            
            <button onClick={() => setIsBrowserOpen(true)} className="mobile-ai-button fixed bottom-24 right-4 bg-primary text-white rounded-full p-4 shadow-lg z-40 transform hover:scale-110 active:scale-95 transition-transform"><ChickenIcon className="w-6 h-6"/></button>
            
            <footer className="fixed bottom-[76px] left-0 right-0 z-40">
                <MobileMusicPlayer track={activeTrack} queue={playlists} onSelectTrack={setActiveTrack} onClose={() => setActiveTrack(null)} />
            </footer>
            
            <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
            
            {isBrowserOpen && <div className="fixed inset-0 z-50 animate-deploy"><Browser session={browserSession} setSession={setBrowserSession} onClose={() => setIsBrowserOpen(false)} currentUser={currentUser}/></div>}
            
            {isPomodoroModalOpen && (
                <ModalWindow isOpen={true} onClose={() => setIsPomodoroModalOpen(false)} title="Pomodoro" className="w-[320px] h-[360px]">
                    <Pomodoro {...pomodoroState} onToggle={() => setPomodoroState(s => ({ ...s, isActive: !s.isActive }))} onReset={() => setPomodoroState(s => ({ ...s, timeLeft: s.durations[s.mode], isActive: false }))} onSwitchMode={(mode) => setPomodoroState(s => ({ ...s, mode, timeLeft: s.durations[mode], isActive: false }))} onSaveSettings={(durations) => setPomodoroState(s => ({ ...s, durations, timeLeft: durations[s.mode] }))} onToggleBackgroundTimer={() => {}} onSetBackgroundTimerOpacity={() => {}} />
                </ModalWindow>
            )}

            <CustomizationPanel
                isOpen={isCustomizationOpen}
                onClose={() => setIsCustomizationOpen(false)}
                isMobile
                isSignedIn={!!gdriveToken} onAuthClick={handleAuthClick} isGapiReady={gisReady}
                colors={themeColors} onColorChange={onThemeColorChange} onReset={onResetThemeColors}
                activeBackground={activeBackground} userBackgrounds={[]} onSelectBackground={setActiveBackground} onAddBackground={()=>{}} onDeleteBackground={()=>{}} onToggleFavorite={()=>{}} backgroundsLoading={false}
                particleType={particleType} setParticleType={setParticleType}
                ambientSound={ambientSound} setAmbientSound={setAmbientSound}
            />

             {taskToEdit && (
                <TaskDetailsModal isOpen={!!taskToEdit} onClose={() => setTaskToEdit(null)} onSave={handleUpdateTodo} todo={taskToEdit} />
            )}
        </main>
    );
};


const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  // Settings State (now managed here)
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [themeColors, setThemeColors] = useState<ThemeColors>({ primary: '#F472B6', secondary: '#FBBF24' });
  const [activeBackground, setActiveBackground] = useState<Background | null>(null);
  const [particleType, setParticleType] = useState<ParticleType>('none');
  const [ambientSound, setAmbientSound] = useState<{ type: AmbientSoundType, volume: number }>({ type: 'none', volume: 0.5 });
  const [pomodoroState, setPomodoroState] = useState({
      timeLeft: 25 * 60,
      isActive: false,
      mode: 'work' as 'work' | 'break',
      durations: { work: 25 * 60, break: 5 * 60 },
      showBackgroundTimer: false,
      backgroundTimerOpacity: 30,
  });

  const settingsDebounceTimeout = useRef<number | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Load settings on login
  useEffect(() => {
    const loadSettings = async () => {
        if (session) {
            const { data, error } = await supabase.from('site_settings').select('*').single();
            if (data) {
                if (data.theme_mode) setTheme(data.theme_mode);
                if (data.theme_colors) setThemeColors(data.theme_colors);
                // Note: Background loading is handled inside Desktop/Mobile apps via Drive
                if (data.particle_type) setParticleType(data.particle_type);
                if (data.ambient_sound) setAmbientSound(data.ambient_sound);
                if (data.pomodoro_config) setPomodoroState(prev => ({...prev, ...data.pomodoro_config}));
            }
        }
    };
    loadSettings();
  }, [session]);
  
  const saveSettings = useCallback(() => {
     if (!session) return;
     const settingsToSave = {
        theme_mode: theme,
        theme_colors: themeColors,
        // active_background_id will be handled separately due to Drive dependency
        particle_type: particleType,
        ambient_sound: ambientSound,
        pomodoro_config: { // only save durations and timer settings
            durations: pomodoroState.durations,
            showBackgroundTimer: pomodoroState.showBackgroundTimer,
            backgroundTimerOpacity: pomodoroState.backgroundTimerOpacity,
        },
     };

     supabase.from('site_settings').upsert({ ...settingsToSave, user_id: session.user.id }, { onConflict: 'user_id' }).then(({error}) => {
        if(error) console.error("Error saving settings:", error);
     });

  }, [session, theme, themeColors, particleType, ambientSound, pomodoroState]);

  // Debounce settings save
  useEffect(() => {
    if (session) { // Only try to save if logged in
      if (settingsDebounceTimeout.current) clearTimeout(settingsDebounceTimeout.current);
      settingsDebounceTimeout.current = window.setTimeout(saveSettings, 1500);
    }
    return () => { if (settingsDebounceTimeout.current) clearTimeout(settingsDebounceTimeout.current); };
  }, [saveSettings, session]);

  // Theme management
  const toggleTheme = () => setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  useEffect(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  
  // Theme color management
  const applyThemeColors = (colors: ThemeColors) => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
  };

  const handleThemeColorChange = (colorName: keyof ThemeColors, value: string) => {
      setThemeColors(prev => ({ ...prev, [colorName]: value }));
  };
  
  const handleResetThemeColors = () => {
    setThemeColors({ primary: '#F472B6', secondary: '#FBBF24' });
  };
  
  useEffect(() => {
    applyThemeColors(themeColors);
  }, [themeColors]);


  if (loading) {
    return <div className="h-screen w-screen bg-yellow-50 flex items-center justify-center"><p>Cargando pollito...</p></div>;
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  const props: AppProps = {
    currentUser: session.user,
    onLogout: () => supabase.auth.signOut(),
    theme,
    toggleTheme,
    themeColors,
    onThemeColorChange: handleThemeColorChange,
    onResetThemeColors: handleResetThemeColors,
    activeBackground,
    setActiveBackground,
    particleType,
    setParticleType,
    ambientSound,
    setAmbientSound,
    pomodoroState,
    setPomodoroState
  };

  if (isMobile) {
    return <MobileApp {...props} />;
  }

  return <DesktopApp {...props} />;
};

export default App;
