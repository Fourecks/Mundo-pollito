
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Todo, Folder, Background, Playlist, WindowType, WindowState, Subtask, QuickNote, ParticleType, AmbientSoundType, Note, ThemeColors, BrowserSession, SupabaseUser, Priority, Project, ProjectMember, ProjectInvitation, GCalSettings, GoogleCalendar, GoogleCalendarEvent, Habit, HabitRecord, HabitFrequency, CalendarProvider, CalendarIntegrationAccount, FocusSession, PushNotificationPreferences } from './types';
import { DEFAULT_PUSH_PREFERENCES, syncPreferencesToOneSignal, sendPushNotification, sendSampleNotificationForEvent, NotificationEventType } from './services/pushNotificationService';
import CompletionModal from './components/CompletionModal';
import { triggerConfetti } from './utils/confetti';
import Pomodoro from './components/Pomodoro';
import BibleVerse from './components/BibleVerse';
import FocusModeButton from './components/FocusModeButton';
import Dock from './components/Dock';
import ModalWindow from './components/ModalWindow';
import TodoListModule from './components/TodoListModule';
import NotesSection from './components/NotesSection';
import MusicPlayer from './components/MusicPlayer';
import SpotifyFloatingPlayer from './components/SpotifyFloatingPlayer';
import TaskDetailsModal from './components/TaskDetailsModal';
import ParticleLayer from './components/ParticleLayer';
import { useBatteryStatus } from './utils/battery';
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
import NotificationsPanel from './components/NotificationsPanel';
import ProjectEditorPanel, { ProjectFormData } from './components/ProjectEditorPanel';
import HabitTracker from './components/HabitTracker';
import HabitEditorPanel from './components/HabitEditorPanel';
import ProgressView from './components/ProgressView';
import { ProjectsWorkspace } from './components/ProjectsWorkspace';
import { GlobalHuddleFloatingWidget } from './components/GlobalHuddleFloatingWidget';
import ChevronLeftIcon from './components/icons/ChevronLeftIcon';
import CalendarModule from './components/CalendarModule';
import { CalendarSyncService } from './services/calendarSyncService';
import { NotionService } from './services/notionService';
import { Settings } from 'lucide-react';

// --- Google API Configuration ---
const CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || (process.env as any).GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar';
const APP_FOLDER_NAME = 'Lista de Tareas App Files';

// --- OneSignal Configuration ---
const ONE_SIGNAL_APP_ID = (import.meta as any).env?.VITE_ONE_SIGNAL_APP_ID || (process.env as any).ONE_SIGNAL_APP_ID || config.ONE_SIGNAL_APP_ID;

// Short beep sound for Pomodoro to avoid base64 errors
const pomodoroAudioSrc = "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU";


// Helper to format date as YYYY-MM-DD key
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const generateRecurringTasks = async (sourceTodo: Todo): Promise<Todo[]> => {
    if (!sourceTodo.recurrence || sourceTodo.recurrence.frequency === 'none' || !sourceTodo.due_date) {
        return [];
    }
    
    // Get all existing tasks to avoid duplicates
    const allLocalTodos = await getAll<Todo>('todos');
    const recurrenceId = sourceTodo.recurrence.id;

    const { frequency, customDays, ends_on } = sourceTodo.recurrence;
    
    // 1. Determine start date.
    // IMPORTANT: We want to generate tasks *after* the source task's date.
    // If the source task is today, we start generating from tomorrow (or next valid cycle).
    // If we have existing future tasks, we start after the latest one.
    
    let referenceDate = new Date(sourceTodo.due_date + 'T00:00:00Z');
    
    if (recurrenceId) {
        const existingChainTasks = allLocalTodos.filter(t => t.recurrence?.id === recurrenceId);
        if (existingChainTasks.length > 0) {
            const dates = existingChainTasks.map(t => t.due_date).filter(Boolean) as string[];
            dates.sort();
            const lastDateStr = dates[dates.length - 1];
            if (lastDateStr) {
                const lastDate = new Date(lastDateStr + 'T00:00:00Z');
                if (lastDate > referenceDate) {
                    referenceDate = lastDate;
                }
            }
        }
    }

    // 2. Set Limit Date (Generation Window)
    let limitDate = new Date();
    // Use current real time as base for limit, not the task date
    const now = new Date(); 
    
    switch (frequency) {
        case 'daily': limitDate.setDate(now.getDate() + 14); break; // 2 weeks ahead
        case 'weekly': 
        case 'biweekly': 
        case 'custom': limitDate.setMonth(now.getMonth() + 2); break; // 2 months ahead
        case 'monthly': limitDate.setMonth(now.getMonth() + 6); break; // 6 months ahead
        default: limitDate.setDate(now.getDate() + 30);
    }

    const recurrenceEndDate = ends_on ? new Date(ends_on + 'T00:00:00Z') : null;
    // If recurrence end date is sooner than our limit, stop there.
    const finalLimitDate = (recurrenceEndDate && recurrenceEndDate < limitDate) ? recurrenceEndDate : limitDate;

    const datesToCreate: string[] = [];
    let loopDate = new Date(referenceDate.valueOf());
    let safetyCounter = 0;

    while (loopDate < finalLimitDate && safetyCounter < 60) { // 60 iterations max for safety
        let nextDate: Date | null = new Date(loopDate.valueOf());
        let found = false;

        switch (frequency) {
            case 'daily': 
                nextDate.setUTCDate(nextDate.getUTCDate() + 1); 
                found = true; 
                break;
            case 'weekly': 
                nextDate.setUTCDate(nextDate.getUTCDate() + 7); 
                found = true; 
                break;
            case 'biweekly': 
                nextDate.setUTCDate(nextDate.getUTCDate() + 14); 
                found = true; 
                break;
            case 'monthly': 
                nextDate.setUTCMonth(nextDate.getUTCMonth() + 1); 
                found = true; 
                break;
            case 'custom': {
                if (!customDays || customDays.length === 0) { nextDate = null; break; }
                // 0 = Sunday, 6 = Saturday.
                const currentDay = loopDate.getUTCDay();
                const sortedDays = [...customDays].sort((a,b) => a - b);
                
                // Find next day in the list larger than current
                let nextDayDiff = -1;
                for (const day of sortedDays) {
                    if (day > currentDay) {
                        nextDayDiff = day - currentDay;
                        break;
                    }
                }
                // If not found, wrap around to the first day in list next week
                if (nextDayDiff === -1) {
                    nextDayDiff = (7 - currentDay) + sortedDays[0];
                }
                
                nextDate.setUTCDate(nextDate.getUTCDate() + nextDayDiff);
                found = true;
                break;
            }
            default: nextDate = null;
        }

        if (found && nextDate) {
            if (nextDate > finalLimitDate) break;
            datesToCreate.push(nextDate.toISOString().split('T')[0]);
            loopDate = nextDate;
        } else {
            break;
        }
        safetyCounter++;
    }

    if (datesToCreate.length === 0) return [];

    // 3. Create Payloads
    const { id, subtasks: subtasksTemplate, user_id, ...payload } = sourceTodo;
    const newTodosPayloads: Todo[] = datesToCreate.map(dateStr => {
        const tempId = -Date.now() - Math.random();
        const newSubtasks = subtasksTemplate?.map(st => ({ 
            id: -Date.now() - Math.random(), 
            text: st.text, 
            completed: false 
        })) || [];

        return {
            ...payload,
            id: tempId,
            completed: false,
            notification_sent: false,
            due_date: dateStr,
            user_id: sourceTodo.user_id,
            recurrence: { ...sourceTodo.recurrence, sourceId: sourceTodo.id },
            subtasks: newSubtasks,
            created_at: new Date().toISOString(),
        };
    });
    
    // 4. Batch create
    const creationPromises = newTodosPayloads.map(p => syncableCreate('todos', p));
    const createdTodos = await Promise.all(creationPromises);
    
    return createdTodos as Todo[];
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
  habits: Habit[];
  habitRecords: HabitRecord[];
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
  uiSettings: any;
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
  handleAddProject: (name: string, emoji: string | null, color: string | null, extraData?: Partial<Project>) => Promise<Project | null>;
  handleUpdateProject: (projectId: number, updates: Partial<Project>) => Promise<void>;
  handleDeleteProject: (projectId: number) => Promise<void>;
  handleDeleteProjectAndTasks: (projectId: number) => Promise<void>;
  handleArchiveProject: (projectId: number, isArchived: boolean) => Promise<void>;
  handleAddHabit: (name: string, emoji: string, frequency: HabitFrequency) => Promise<void>;
  handleUpdateHabit: (habitId: number, name: string, emoji: string | null, frequency: HabitFrequency) => Promise<void>;
  handleDeleteHabit: (habitId: number) => Promise<void>;
  handleToggleHabitRecord: (habitId: number, date: string) => Promise<void>;
  onOpenHabitCreator: () => void;
  onOpenHabitEditor: (habit: Habit) => void;
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
  setUiSettings: React.Dispatch<React.SetStateAction<any>>;
  setActiveTrack: React.Dispatch<React.SetStateAction<Playlist | null>>;
  setActiveSpotifyTrack: React.Dispatch<React.SetStateAction<Playlist | null>>;
  // Google API Props
  googleApiToken: string | null;
  backgroundsAreLoading: boolean;
  handleAuthClick: () => void;
  onConnectOutlook: () => void;
  onDisconnectOutlook: () => void;
  outlookAccount: CalendarIntegrationAccount | null;
  handleAddBackground: (file: File) => Promise<void>;
  handleDeleteBackground: (id: string) => Promise<void>;
  handleToggleFavoriteBackground: (id: string) => Promise<void>;
  gapiReady: boolean;
  // Google Calendar Props
  gcalSettings: GCalSettings;
  onGCalSettingsChange: (settings: GCalSettings) => void;
  userCalendars: GoogleCalendar[];
  calendarEvents: GoogleCalendarEvent[];
  loadAndValidateCalendarData: () => Promise<void>;
  onRemoveFromCalendar: (todo: Todo) => Promise<void>;
  onSyncToCalendar: (todo: Todo) => Promise<void>;
  // Notion Props
  onSyncNotion: () => Promise<{ success: boolean; message: string }>;
  // Notifications
  isSubscribed: boolean;
  isPermissionBlocked: boolean;
  handleNotificationAction: (eventType?: NotificationEventType) => void;
  pushPreferences: PushNotificationPreferences;
  onUpdatePushPreferences: (newPrefs: PushNotificationPreferences) => Promise<void>;
  onToggleSubscription: () => Promise<void>;
  isPowerSavingActive: boolean;
  batteryStatus: any;
  focusSessions: FocusSession[];
  onLogFocusSession: (minutes: number) => void;
  // Project Invitations
  projectInvitations: ProjectInvitation[];
  onSendInvitation: (project: Project, email: string) => Promise<void>;
  onAcceptInvitation: (invitationId: string) => Promise<void>;
  onDeclineInvitation: (invitationId: string) => Promise<void>;
}

const DesktopApp: React.FC<AppComponentProps> = (props) => {
  const {
    isOnline, isSyncing, currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
    allTodos, folders, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
    pomodoroState, activeBackground, particleType, ambientSound, uiSettings,
    activeTrack, activeSpotifyTrack,
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos, handleArchiveProject,
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddProject, handleUpdateProject, handleDeleteProject, handleDeleteProjectAndTasks,
    handleUpdateHabit, handleDeleteHabit, handleToggleHabitRecord, onOpenHabitCreator, onOpenHabitEditor,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setUiSettings,
    setActiveTrack, setActiveSpotifyTrack,
    googleApiToken, backgroundsAreLoading, handleAuthClick, onConnectOutlook, onDisconnectOutlook, outlookAccount,
    handleAddBackground, handleDeleteBackground, handleToggleFavoriteBackground,
    gcalSettings, onGCalSettingsChange, userCalendars, calendarEvents,
    loadAndValidateCalendarData, onRemoveFromCalendar, onSyncToCalendar,
    onSyncNotion,
    isSubscribed, isPermissionBlocked, handleNotificationAction,
    pushPreferences, onUpdatePushPreferences, onToggleSubscription,
    isPowerSavingActive, batteryStatus,
    focusSessions, onLogFocusSession,
    projectInvitations, onSendInvitation, onAcceptInvitation, onDeclineInvitation
  } = props;
  
  // Main Daily Goal for Desktop
  const todayGoalKey = new Date().toLocaleDateString('en-CA');
  const todayMainGoal = uiSettings?.dailyGoals?.[todayGoalKey];
  const handleUpdateMainDailyGoal = (goal: { text: string; completed: boolean } | null) => {
    setUiSettings((prev: any) => {
      const prevGoals = prev?.dailyGoals || {};
      const updatedGoals = { ...prevGoals };
      if (!goal || !goal.text) {
        delete updatedGoals[todayGoalKey];
      } else {
        updatedGoals[todayGoalKey] = goal;
      }
      return {
        ...(prev || {}),
        dailyGoals: updatedGoals
      };
    });
  };

  // Local UI State for Desktop
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionQuote, setCompletionQuote] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    if (isFocusMode) {
      document.body.classList.add('focus-mode-active');
    } else {
      document.body.classList.remove('focus-mode-active');
    }
  }, [isFocusMode]);

  const [openWindows, setOpenWindows] = useState<WindowType[]>([]);
  const windowStatesRef = useRef<{ [key in WindowType]?: WindowState }>({});
  const focusedWindowRef = useRef<WindowType | null>(null);
  const [focusedWindow, setFocusedWindow] = useState<WindowType | null>(null);
  const [windowZIndices, setWindowZIndices] = useState<{ [key in WindowType]?: number }>({});
  const [highestZIndex, setHighestZIndex] = useState<number>(100);
  const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
  const [isCustomizationPanelOpen, setIsCustomizationPanelOpen] = useState(false);
  const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
  const [viewingProjectId, setViewingProjectId] = useState<number | null>(null);
  const [isProjectEditorOpen, setIsProjectEditorOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const pomodoroStartedRef = useRef(false);

  const handleOpenProjectCreator = () => {
    setProjectToEdit(null);
    setIsProjectEditorOpen(true);
  };

  const handleOpenProjectEditor = (project: Project) => {
    if (!currentUser) return;
    const ownerEmail = project.owner_email || project.members?.find((m: any) => m.role === 'owner')?.email;
    const isOwner = currentUser.id === project.user_id || 
      (currentUser.email && ownerEmail && currentUser.email.toLowerCase() === ownerEmail.toLowerCase());
    
    if (!isOwner) {
      alert('Solo el propietario o creador del proyecto puede modificar su configuración o cambiar el nombre.');
      return;
    }
    setProjectToEdit(project);
    setIsProjectEditorOpen(true);
  };

  const handleSaveProject = async (data: ProjectFormData) => {
    if (projectToEdit) {
      await handleUpdateProject(projectToEdit.id, data);
    } else {
      await handleAddProject(data.name, data.emoji, data.color, data);
    }
    setIsProjectEditorOpen(false);
    setProjectToEdit(null);
  };

  const getUserKey = useCallback((key: string) => `${currentUser.email}_${key}`, [currentUser]);
  
  // Load/Save local UI state from localStorage
  useEffect(() => {
    const storedWindows = localStorage.getItem(getUserKey('windowStates'));
    const storedOpenWindows = localStorage.getItem(getUserKey('openWindows'));
    if (storedWindows) {
      try {
        const parsed = JSON.parse(storedWindows);
        if (parsed && typeof parsed === 'object') {
          const cleaned: { [key in WindowType]?: WindowState } = {};
          (Object.keys(parsed) as WindowType[]).forEach((k) => {
            const item = parsed[k];
            if (
              item &&
              item.size &&
              typeof item.size.width === 'number' &&
              typeof item.size.height === 'number' &&
              item.size.width >= 200 &&
              item.size.height >= 120 &&
              item.pos &&
              typeof item.pos.x === 'number' &&
              typeof item.pos.y === 'number'
            ) {
              cleaned[k] = item;
            }
          });
          windowStatesRef.current = cleaned;
        }
      } catch (e) {
        console.error('Error parsing stored window states:', e);
      }
    }
    if (storedOpenWindows) {
      try {
        setOpenWindows(JSON.parse(storedOpenWindows));
      } catch (e) {
        console.error('Error parsing stored open windows:', e);
      }
    }
  }, [getUserKey]);

  useEffect(() => { localStorage.setItem(getUserKey('openWindows'), JSON.stringify(openWindows)); }, [openWindows, getUserKey]);

  const handleWindowStateChange = useCallback((windowType: WindowType, newState: WindowState) => {
    windowStatesRef.current[windowType] = newState;
    try {
      localStorage.setItem(getUserKey('windowStates'), JSON.stringify(windowStatesRef.current));
    } catch (e) {
      console.error('Error saving window states:', e);
    }
  }, [getUserKey]);

  const pomodoroAudioRef = useRef<HTMLAudioElement>(null);
  
  const handleShowCompletionModal = (quote: string) => {
    setCompletionQuote(quote);
    setShowCompletionModal(true);
  };
  
  // Memoized values derived from props
  const flatAllTodos = useMemo(() => {
    const list: Todo[] = [];
    Object.keys(allTodos).forEach(key => {
      if (Array.isArray(allTodos[key])) {
        list.push(...allTodos[key]);
      }
    });
    return list;
  }, [allTodos]);
  const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
  const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
  const todayKey = formatDateKey(new Date());
  const isFocusTimerRunning = pomodoroState.isActive && pomodoroState.mode === 'work';
  const activeFocusTaskId = pomodoroState.activeFocusTaskId;

  const todayAgendaTasks = useMemo(() => {
    const todayList = allTodos[todayKey] || [];
    const undatedList = allTodos['undated'] || [];
    const combined = [...todayList, ...undatedList];
    return combined.sort((a, b) => {
      if (isFocusTimerRunning && activeFocusTaskId) {
        if (a.id === activeFocusTaskId) return -1;
        if (b.id === activeFocusTaskId) return 1;
      }
      return (a.start_time || '23:59').localeCompare(b.start_time || '23:59');
    });
  }, [allTodos, todayKey, isFocusTimerRunning, activeFocusTaskId]);

  const activeFocusTask = useMemo(() => {
    if (!activeFocusTaskId) return null;
    for (const key of Object.keys(allTodos)) {
      const found = allTodos[key]?.find(t => t.id === activeFocusTaskId);
      if (found) return found;
    }
    return null;
  }, [allTodos, activeFocusTaskId]);

  const pomodoroTasks = useMemo(() => {
    const todayList = (allTodos[todayKey] || []).filter(t => !t.completed);
    const undatedList = (allTodos['undated'] || []).filter(t => !t.completed);
    return [...todayList, ...undatedList].sort((a, b) => (a.start_time || '23:59').localeCompare(b.start_time || '23:59'));
  }, [allTodos, todayKey]);
  const pendingTasks = useMemo(() => {
    const list: Todo[] = [];
    Object.keys(allTodos).forEach(dateKey => {
      (allTodos[dateKey] || []).forEach(todo => {
        if (!todo.completed) {
          list.push(todo);
        }
      });
    });
    return list;
  }, [allTodos]);

  const handleTimerCompletion = useCallback(() => {
    pomodoroAudioRef.current?.play();

    const currentMode = pomodoroState.mode;
    const nextMode = currentMode === 'work' ? 'break' : 'work';
    const message = currentMode === 'work' ? "¡Tiempo de descanso! Buen trabajo." : "¡De vuelta al trabajo! Tú puedes.";

    if (isSubscribed) {
      supabase.functions.invoke('send-pushalert-notification', {
        body: { title: "Pomodoro Terminado", message: message },
      });
    }

    if (currentMode === 'work') {
      onLogFocusSession(Math.round(pomodoroState.durations.work / 60));
    }

    const newDuration = pomodoroState.durations[nextMode];
    setPomodoroState((s: any) => ({
      ...s,
      mode: nextMode,
      timeLeft: newDuration,
      isActive: true,
      endTime: Date.now() + newDuration * 1000,
    }));
  }, [isSubscribed, pomodoroState, onLogFocusSession, setPomodoroState]);

  const handlePomodoroToggle = useCallback(() => {
    setPomodoroState((s: any) => {
      const willStart = !s.isActive;
      if (willStart) {
        const endTime = Date.now() + s.timeLeft * 1000;
        if (!pomodoroStartedRef.current) {
          pomodoroStartedRef.current = true;
          return { ...s, isActive: true, endTime, showBackgroundTimer: true };
        }
        return { ...s, isActive: true, endTime };
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

  // --- Windowing and Misc Handlers ---
  const bringToFront = useCallback((windowType: WindowType) => {
    if (focusedWindowRef.current === windowType) return;
    focusedWindowRef.current = windowType;
    setFocusedWindow(windowType);
    setHighestZIndex(prev => {
      const nextZ = prev + 1;
      setWindowZIndices(current => ({ ...current, [windowType]: nextZ }));
      return nextZ;
    });
  }, []);

  const toggleWindow = useCallback((windowType: WindowType) => {
    setOpenWindows(open => {
      const isOpening = !open.includes(windowType);
      if (isOpening) {
        bringToFront(windowType);
        return [...open, windowType];
      } else {
        if (focusedWindowRef.current === windowType) {
          focusedWindowRef.current = null;
          setFocusedWindow(null);
        }
        return open.filter(w => w !== windowType);
      }
    });
  }, [bringToFront]);

  const getWindowZIndex = useCallback((windowType: WindowType) => {
    return windowZIndices[windowType] ?? (focusedWindow === windowType ? 100 : 50);
  }, [windowZIndices, focusedWindow]);

  const handleSelectFocusTask = (taskId: number | null) => {
    setPomodoroState(s => ({ ...s, activeFocusTaskId: taskId }));
    if (taskId !== null) {
      if (!openWindows.includes('pomodoro')) {
        setOpenWindows(open => [...open, 'pomodoro']);
      }
      bringToFront('pomodoro');
    }
  };

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
        {(pomodoroState.isActive && (pomodoroState.showBackgroundTimer || isFocusMode)) && (
          <BackgroundTimer 
            timeLeft={pomodoroState.timeLeft} 
            opacity={pomodoroState.backgroundTimerOpacity} 
            focusedTask={activeFocusTask}
            isFocusMode={isFocusMode}
          />
        )}
        <ParticleLayer type={particleType} reduceParticles={isPowerSavingActive} />

      <div className="fixed top-0 bottom-0 right-0 w-4 z-[70000] app-right-header-trigger-area"></div>
      <header className="app-right-header-container fixed top-4 right-4 z-[70000] flex flex-col items-end gap-3 transition-transform duration-500 ease-in-out">
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
        <div className={`transition-opacity duration-300 flex flex-col items-end gap-3 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <button onClick={onLogout} className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-100 hover:text-red-500 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110" aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogoutIcon />
          </button>
          <button
            onClick={() => setIsCustomizationPanelOpen(true)}
            className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:text-primary p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
            aria-label="Configuración"
            title="Configuración"
          >
            <Settings className="h-6 w-6" />
          </button>
        </div>
        <FocusModeButton isFocusMode={isFocusMode} onToggle={() => setIsFocusMode(!isFocusMode)} />
        <div className={`transition-opacity duration-300 flex flex-col items-end gap-3 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />

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
              {projectInvitations.filter(i => i.status === 'pending').length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white dark:border-gray-800 animate-pulse" />
              )}
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
        currentUser={currentUser}
        onLogout={onLogout}
        progressEmoji={uiSettings?.progressEmoji}
        onProgressEmojiChange={(emoji) => setUiSettings((s: any) => ({ ...s, progressEmoji: emoji }))}
        isOpen={isCustomizationPanelOpen}
        onClose={() => setIsCustomizationPanelOpen(false)}
        colors={themeColors}
        onThemeColorChange={onThemeColorChange}
        onReset={onResetThemeColors}
        activeBackground={activeBackground}
        userBackgrounds={userBackgrounds}
        onSelectBackground={(bg) => {
          setUiSettings((s: any) => ({
            ...s,
            activeBackgroundId: bg?.id || null,
            activeBackgroundUrl: bg?.url || null,
            activeBackgroundType: bg?.type || 'image',
            activeBackgroundName: bg?.name || null
          }));
          try {
            if (bg) {
              localStorage.setItem(`pollito_selected_bg_${currentUser?.id || 'guest'}`, JSON.stringify(bg));
            } else {
              localStorage.removeItem(`pollito_selected_bg_${currentUser?.id || 'guest'}`);
            }
          } catch (e) {}
        }}
        onAddBackground={handleAddBackground}
        onDeleteBackground={handleDeleteBackground}
        onToggleFavorite={handleToggleFavoriteBackground}
        backgroundsLoading={backgroundsAreLoading}
        particleType={particleType}
        setParticleType={(type) => setUiSettings((s: any) => ({ ...s, particleType: type }))}
        ambientSound={ambientSound}
        setAmbientSound={(sound) => setUiSettings((s: any) => ({ ...s, ambientSound: sound }))}
        enableBatterySaver={uiSettings?.enableBatterySaver || false}
        setEnableBatterySaver={(enabled) => setUiSettings((s: any) => ({ ...s, enableBatterySaver: enabled }))}
        batteryStatus={batteryStatus}
        dailyEncouragementHour={uiSettings?.dailyEncouragementLocalHour ?? null}
        onSetDailyEncouragement={(hour) => setUiSettings((s: any) => ({...s, dailyEncouragementLocalHour: hour}))}
        dailySummaryHour={uiSettings?.dailySummaryHour ?? null}
        onSetDailySummary={(hour) => setUiSettings((s: any) => ({...s, dailySummaryHour: hour}))}
        pushPreferences={pushPreferences}
        onUpdatePushPreferences={onUpdatePushPreferences}
        isSubscribed={isSubscribed}
        isPermissionBlocked={isPermissionBlocked}
        onToggleSubscription={onToggleSubscription}
        onSendTestNotification={handleNotificationAction}
      />
      


      <NotificationsPanel
        isOpen={isNotificationsPanelOpen}
        onClose={() => setIsNotificationsPanelOpen(false)}
        currentUserEmail={currentUser?.email}
        invitations={projectInvitations}
        onAcceptInvitation={onAcceptInvitation}
        onDeclineInvitation={onDeclineInvitation}
        pushPreferences={pushPreferences}
        onUpdatePushPreferences={onUpdatePushPreferences}
        isSubscribed={isSubscribed}
        isPermissionBlocked={isPermissionBlocked}
        onToggleSubscription={onToggleSubscription}
        dailyEncouragementHour={uiSettings?.dailyEncouragementLocalHour ?? null}
        onSetDailyEncouragement={(hour) => setUiSettings((s: any) => ({...s, dailyEncouragementLocalHour: hour}))}
        dailySummaryHour={uiSettings?.dailySummaryHour ?? null}
        onSetDailySummary={(hour) => setUiSettings((s: any) => ({...s, dailySummaryHour: hour}))}
        onSendTestNotification={handleNotificationAction}
      />
      
      <div className="fixed top-0 bottom-0 left-0 w-4 z-[70000] app-left-sidebar-trigger-area hidden md:block"></div>
      <div className={`app-left-sidebar-container fixed top-4 left-4 z-30 space-y-3 transition-transform duration-500 ease-in-out ${isFocusMode ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'} hidden md:block w-[22vw] min-w-[220px] max-w-[320px]`}>
          <div className="flex items-center gap-2">
            <Greeting name={capitalizedUserName} />
            <button onClick={() => toggleWindow('progreso')} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full shadow-lg p-2 px-4 text-sm font-bold text-primary-dark dark:text-primary hover:bg-white dark:hover:bg-gray-800">
                Progreso
            </button>
          </div>
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
            activeFocusTaskId={pomodoroState.activeFocusTaskId}
            onSelectFocusTask={handleSelectFocusTask}
            focusSessions={focusSessions}
            isFocusTimerRunning={pomodoroState.isActive && pomodoroState.mode === 'work'}
            mainDailyGoal={todayMainGoal}
            onUpdateMainDailyGoal={handleUpdateMainDailyGoal}
          />
      </div>
      
        <main className={`${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {openWindows.includes('todo') && (
            <ModalWindow isOpen={true} onClose={() => toggleWindow('todo')} title="Lista de Tareas" isDraggable isResizable zIndex={getWindowZIndex('todo')} onFocus={() => bringToFront('todo')} className="w-full max-w-3xl h-[80vh]" windowState={windowStatesRef.current.todo} onStateChange={s => handleWindowStateChange('todo', s)} allowFullscreen>
              <TodoListModule progressEmoji={uiSettings?.progressEmoji} 
                allTodos={allTodos} 
                addTodo={handleAddTodo} 
                toggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)}
                toggleSubtask={(taskId, subtaskId) => handleToggleSubtask(taskId, subtaskId, handleShowCompletionModal)}
                deleteTodo={handleDeleteTodo} 
                updateTodo={handleUpdateTodo} 
                onEditTodo={setTaskToEdit} 
                selectedDate={selectedDate} 
                setSelectedDate={setSelectedDate} 
                focusMode={isFocusMode}
                onAddProject={handleAddProject}
                onUpdateProject={(id, name, emoji, color) => handleUpdateProject(id, { name, emoji, color })}
                onDeleteProject={handleDeleteProject}
                onDeleteProjectAndTasks={handleDeleteProjectAndTasks}
                handleArchiveProject={handleArchiveProject}
                onViewProjectChange={setViewingProjectId}
                calendarEvents={calendarEvents}
                onOpenProjectCreator={handleOpenProjectCreator}
                onOpenProjectEditor={handleOpenProjectEditor}
                datesWithTasks={datesWithTasks} 
                datesWithAllTasksCompleted={datesWithAllTasksCompleted} 
                onClearPastTodos={onClearPastTodos}
                projects={projects}
                activeFocusTaskId={pomodoroState.activeFocusTaskId}
                onSelectFocusTask={handleSelectFocusTask}
                focusSessions={focusSessions}
                isFocusTimerRunning={pomodoroState.isActive && pomodoroState.mode === 'work'}
              />
            </ModalWindow>
          )}
          {openWindows.includes('calendar') && (
            <ModalWindow isOpen={true} onClose={() => toggleWindow('calendar')} title="Calendario y Sincronización" isDraggable isResizable zIndex={getWindowZIndex('calendar')} onFocus={() => bringToFront('calendar')} className="w-full max-w-5xl h-[85vh]" windowState={windowStatesRef.current.calendar} onStateChange={s => handleWindowStateChange('calendar', s)} allowFullscreen>
              <CalendarModule
                allTodos={allTodos}
                calendarEvents={calendarEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onEditTodo={setTaskToEdit}
                onDeleteTodo={handleDeleteTodo}
                onToggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)}
                onAddTodo={handleAddTodo}
                projects={projects}
                googleToken={googleApiToken}
                gcalSettings={gcalSettings}
                onGCalSettingsChange={onGCalSettingsChange}
                userCalendars={userCalendars}
                onAuthGoogle={handleAuthClick}
                onConnectOutlook={onConnectOutlook}
                onDisconnectOutlook={onDisconnectOutlook}
                outlookAccount={outlookAccount}
                onRefreshEvents={loadAndValidateCalendarData}
                onRemoveFromCalendar={onRemoveFromCalendar}
                onSyncToCalendar={onSyncToCalendar}
                onSyncNotion={onSyncNotion}
              />
            </ModalWindow>
          )}
          {openWindows.includes('habits') && (
            <ModalWindow isOpen={true} onClose={() => toggleWindow('habits')} title="Seguimiento de Hábitos" isDraggable isResizable zIndex={getWindowZIndex('habits')} onFocus={() => bringToFront('habits')} className="w-full max-w-2xl h-[70vh]" windowState={windowStatesRef.current.habits} onStateChange={s => handleWindowStateChange('habits', s)} allowFullscreen>
              <HabitTracker 
                habits={habits} 
                records={habitRecords} 
                onOpenHabitCreator={onOpenHabitCreator}
                onOpenHabitEditor={onOpenHabitEditor}
                onDeleteHabit={handleDeleteHabit} 
                onToggleRecord={handleToggleHabitRecord}
              />
            </ModalWindow>
          )}
          {openWindows.includes('progreso') && (
              <ModalWindow isOpen onClose={() => toggleWindow('progreso')} title="Informe de Crecimiento" isDraggable isResizable zIndex={getWindowZIndex('progreso')} onFocus={() => bringToFront('progreso')} className="w-full max-w-4xl h-[85vh]" windowState={windowStatesRef.current.progreso} onStateChange={s => handleWindowStateChange('progreso', s)} allowFullscreen>
                  <ProgressView 
                      allTodos={allTodos} 
                      projects={projects} 
                      habits={habits} 
                      habitRecords={habitRecords} 
                      focusSessions={focusSessions}
                  />
              </ModalWindow>
          )}
          {openWindows.includes('notes') && (
              <ModalWindow isOpen onClose={() => toggleWindow('notes')} title="Notas del Pollito" isDraggable isResizable zIndex={getWindowZIndex('notes')} onFocus={() => bringToFront('notes')} className="w-full max-w-3xl h-[75vh]" windowState={windowStatesRef.current.notes} onStateChange={s => handleWindowStateChange('notes', s)} allowFullscreen>
                  <NotesSection folders={folders} onAddFolder={handleAddFolder} onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />
              </ModalWindow>
          )}
          {openWindows.includes('pomodoro') && (
              <ModalWindow isOpen onClose={() => toggleWindow('pomodoro')} title="Pomodoro" isDraggable isResizable minWidth={440} minHeight={215} overflowVisible zIndex={getWindowZIndex('pomodoro')} onFocus={() => bringToFront('pomodoro')} className="w-[520px] h-[215px]" windowState={windowStatesRef.current.pomodoro} onStateChange={s => handleWindowStateChange('pomodoro', s)}>
                  <Pomodoro 
                      timeLeft={pomodoroState.timeLeft} 
                      isActive={pomodoroState.isActive} 
                      mode={pomodoroState.mode} 
                      durations={pomodoroState.durations} 
                      onToggle={handlePomodoroToggle} 
                      onReset={() => setPomodoroState(s => ({ ...s, timeLeft: s.durations[s.mode], isActive: false, endTime: null }))} 
                      onSwitchMode={(mode) => setPomodoroState(s => ({ ...s, mode, timeLeft: s.durations[mode], isActive: false, endTime: null }))} 
                      onSaveSettings={(d) => setPomodoroState(s => ({ ...s, durations: d, timeLeft: d[s.mode], isActive: false, endTime: null }))} 
                      showBackgroundTimer={pomodoroState.showBackgroundTimer} 
                      onToggleBackgroundTimer={() => setPomodoroState(s => ({...s, showBackgroundTimer: !s.showBackgroundTimer}))} 
                      backgroundTimerOpacity={pomodoroState.backgroundTimerOpacity} 
                      onSetBackgroundTimerOpacity={op => setPomodoroState(s => ({...s, backgroundTimerOpacity: op}))}
                      tasks={pomodoroTasks}
                      activeTaskId={pomodoroState.activeFocusTaskId}
                      onSelectTask={(id) => setPomodoroState(s => ({ ...s, activeFocusTaskId: id }))}
                  />
              </ModalWindow>
          )}
           {openWindows.includes('music') && (
              <ModalWindow isOpen onClose={() => toggleWindow('music')} frameless isDraggable isResizable zIndex={getWindowZIndex('music')} onFocus={() => bringToFront('music')} className="w-[600px] h-[450px]" windowState={windowStatesRef.current.music} onStateChange={s => handleWindowStateChange('music', s)}>
                  <MusicPlayer playlists={playlists} onAddPlaylist={handleAddPlaylist} onUpdatePlaylist={handleUpdatePlaylist} onDeletePlaylist={handleDeletePlaylist} onSelectTrack={handleSelectTrack} onClose={() => toggleWindow('music')} />
              </ModalWindow>
          )}
          {openWindows.includes('browser') && (
              <ModalWindow isOpen onClose={() => toggleWindow('browser')} title="IA Pollito" isDraggable isResizable zIndex={getWindowZIndex('browser')} onFocus={() => bringToFront('browser')} className="w-full max-w-xl h-[85vh]" windowState={windowStatesRef.current.browser} onStateChange={s => handleWindowStateChange('browser', s)} allowFullscreen>
                  <Browser session={browserSession} setSession={setBrowserSession} currentUser={currentUser} />
              </ModalWindow>
          )}
          {openWindows.includes('projects') && (
              <ModalWindow isOpen onClose={() => toggleWindow('projects')} title="Espacio de Proyectos" isDraggable isResizable zIndex={getWindowZIndex('projects')} onFocus={() => bringToFront('projects')} className="w-full max-w-6xl h-[88vh]" windowState={windowStatesRef.current.projects} onStateChange={s => handleWindowStateChange('projects', s)} allowFullscreen>
                  <ProjectsWorkspace
                      currentUser={currentUser}
                      projects={projects}
                      allTodos={flatAllTodos}
                      activeProjectId={viewingProjectId}
                      invitations={projectInvitations}
                      onSendInvitation={onSendInvitation}
                      pushPreferences={pushPreferences}
                      onSelectProject={(id) => setViewingProjectId(id)}
                      onAddProject={async (name, emoji, color) => {
                          const p = await handleAddProject(name, emoji, color);
                          return p || null;
                      }}
                      onUpdateProject={async (id, updates) => {
                          await handleUpdateProject(id, updates);
                      }}
                      onDeleteProject={handleDeleteProject}
                      onArchiveProject={async (id, isArchived) => {
                          await handleArchiveProject(id, isArchived);
                      }}
                      addTodo={async (text, options) => {
                          await handleAddTodo(text, options);
                      }}
                      updateTodo={handleUpdateTodo}
                      deleteTodo={handleDeleteTodo}
                      onEditTodo={setTaskToEdit}
                      onOpenProjectEditor={handleOpenProjectEditor}
                  />
              </ModalWindow>
          )}
        </main>
      
      <div className={`transition-opacity duration-500 ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <CompletionModal isOpen={showCompletionModal} onClose={() => setShowCompletionModal(false)} quote={completionQuote}/>
        <TaskDetailsModal 
          isOpen={!!taskToEdit} 
          onClose={() => setTaskToEdit(null)} 
          onSave={handleUpdateTodo} 
          onDelete={handleDeleteTodo} 
          todo={taskToEdit} 
          projects={projects}
          onRemoveFromCalendar={onRemoveFromCalendar}
          onSyncToCalendar={onSyncToCalendar}
        />
        {(activeSpotifyTrack || activeTrack) && (
            <ModalWindow isOpen onClose={() => { setActiveSpotifyTrack(null); setActiveTrack(null); }} frameless isDraggable isResizable zIndex={getWindowZIndex('spotify')} onFocus={() => bringToFront('spotify')} className="w-[320px] h-[352px]" windowState={windowStatesRef.current.spotify} onStateChange={s => handleWindowStateChange('spotify', s)}>
                <SpotifyFloatingPlayer track={activeSpotifyTrack || activeTrack!} onClose={() => { setActiveSpotifyTrack(null); setActiveTrack(null); }} />
            </ModalWindow>
        )}
        <ProjectEditorPanel
          isOpen={isProjectEditorOpen}
          onClose={() => setIsProjectEditorOpen(false)}
          onSave={handleSaveProject}
          projectToEdit={projectToEdit}
        />
        <GlobalHuddleFloatingWidget
          onOpenProjectsWorkspace={(projectId) => {
            setViewingProjectId(projectId);
            if (!openWindows.includes('projects')) {
              setOpenWindows(prev => [...prev, 'projects']);
            }
            bringToFront('projects');
          }}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 h-4 z-[70000] app-dock-trigger-area"></div>
      <div className={`app-dock-container fixed bottom-0 left-0 right-0 transition-transform duration-500 ease-in-out z-[40000] ${isFocusMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Dock onButtonClick={toggleWindow} openWindows={openWindows} />
      </div>

      <audio ref={pomodoroAudioRef} src={pomodoroAudioSrc} />
    </div>
  );
};

const MobileApp: React.FC<AppComponentProps> = (props) => {
    const {
      isOnline, isSyncing, currentUser, onLogout, theme, toggleTheme, themeColors, onThemeColorChange, onResetThemeColors,
      allTodos, folders, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
      pomodoroState, activeBackground, particleType, ambientSound, uiSettings,
      activeTrack, activeSpotifyTrack,
      handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos, handleArchiveProject,
      handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
      handleAddProject, handleUpdateProject, handleDeleteProject, handleDeleteProjectAndTasks,
      handleUpdateHabit, handleDeleteHabit, handleToggleHabitRecord, onOpenHabitCreator, onOpenHabitEditor,
      handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
      handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
      setBrowserSession, setSelectedDate, setPomodoroState, setUiSettings,
      setActiveTrack, setActiveSpotifyTrack,
      googleApiToken, backgroundsAreLoading, handleAuthClick, onConnectOutlook, onDisconnectOutlook, outlookAccount,
      handleAddBackground, handleDeleteBackground, handleToggleFavoriteBackground,
      gcalSettings, onGCalSettingsChange, userCalendars, calendarEvents,
      loadAndValidateCalendarData, onRemoveFromCalendar, onSyncToCalendar,
      onSyncNotion,
      isSubscribed, isPermissionBlocked, handleNotificationAction,
      pushPreferences, onUpdatePushPreferences, onToggleSubscription,
      isPowerSavingActive, batteryStatus,
      focusSessions, onLogFocusSession,
      projectInvitations, onSendInvitation, onAcceptInvitation, onDeclineInvitation
    } = props;

    // Local UI state for Mobile
    const [activeTab, setActiveTab] = useState('home');
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [completionQuote, setCompletionQuote] = useState('');
    const [taskToEdit, setTaskToEdit] = useState<Todo | null>(null);
    const [isPomodoroModalOpen, setIsPomodoroModalOpen] = useState(false);
    const [isAiBrowserOpen, setIsAiBrowserOpen] = useState(false);
    const [isCustomizationPanelOpen, setIsCustomizationPanelOpen] = useState(false);
    const [isNotificationsPanelOpen, setIsNotificationsPanelOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isQuickCaptureSetupOpen, setIsQuickCaptureSetupOpen] = useState(false);
    const [viewingProjectId, setViewingProjectId] = useState<number | null>(null);
    const [isProjectEditorOpen, setIsProjectEditorOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
    
    // Main Daily Goal for Mobile
    const todayGoalKey = new Date().toLocaleDateString('en-CA');
    const todayMainGoal = uiSettings?.dailyGoals?.[todayGoalKey];
    const handleUpdateMainDailyGoal = (goal: { text: string; completed: boolean } | null) => {
      setUiSettings((prev: any) => {
        const prevGoals = prev?.dailyGoals || {};
        const updatedGoals = { ...prevGoals };
        if (!goal || !goal.text) {
          delete updatedGoals[todayGoalKey];
        } else {
          updatedGoals[todayGoalKey] = goal;
        }
        return {
          ...(prev || {}),
          dailyGoals: updatedGoals
        };
      });
    };

    const pomodoroAudioRef = useRef<HTMLAudioElement>(null);

    const handleShowCompletionModal = (quote: string) => {
        setCompletionQuote(quote);
        setShowCompletionModal(true);
    };

    const handleOpenProjectCreator = () => {
        setProjectToEdit(null);
        setIsProjectEditorOpen(true);
    };

    const handleOpenProjectEditor = (project: Project) => {
        if (!currentUser) return;
        const ownerEmail = project.owner_email || project.members?.find((m: any) => m.role === 'owner')?.email;
        const isOwner = currentUser.id === project.user_id || 
          (currentUser.email && ownerEmail && currentUser.email.toLowerCase() === ownerEmail.toLowerCase());
        
        if (!isOwner) {
            alert('Solo el propietario o creador del proyecto puede modificar su configuración o cambiar el nombre.');
            return;
        }

        setProjectToEdit(project);
        setIsProjectEditorOpen(true);
    };

    const handleSelectFocusTask = (taskId: number | null) => {
        setPomodoroState(s => ({ ...s, activeFocusTaskId: taskId }));
        if (taskId !== null) {
            setIsPomodoroModalOpen(true);
        }
    };

    const handleSaveProject = async (data: ProjectFormData) => {
        if (projectToEdit) {
            await handleUpdateProject(projectToEdit.id, data);
        } else {
            await handleAddProject(data.name, data.emoji, data.color, data);
        }
        setIsProjectEditorOpen(false);
        setProjectToEdit(null);
    };

    const flatAllTodos = useMemo(() => {
        const list: Todo[] = [];
        Object.keys(allTodos).forEach(key => {
            if (Array.isArray(allTodos[key])) {
                list.push(...allTodos[key]);
            }
        });
        return list;
    }, [allTodos]);

    const datesWithTasks = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0)), [allTodos]);
    const datesWithAllTasksCompleted = useMemo(() => new Set(Object.keys(allTodos).filter(key => allTodos[key].length > 0 && allTodos[key].every(t => t.completed))), [allTodos]);
    const todayKey = formatDateKey(new Date());
    const isFocusTimerRunningMobile = pomodoroState.isActive && pomodoroState.mode === 'work';
    const activeFocusTaskIdMobile = pomodoroState.activeFocusTaskId;

    const todayAgendaTasks = useMemo(() => {
        const todayList = allTodos[todayKey] || [];
        const undatedList = allTodos['undated'] || [];
        const combined = [...todayList, ...undatedList];
        return combined.sort((a, b) => {
            if (isFocusTimerRunningMobile && activeFocusTaskIdMobile) {
                if (a.id === activeFocusTaskIdMobile) return -1;
                if (b.id === activeFocusTaskIdMobile) return 1;
            }
            return (a.start_time || '23:59').localeCompare(b.start_time || '23:59');
        });
    }, [allTodos, todayKey, isFocusTimerRunningMobile, activeFocusTaskIdMobile]);
    const pomodoroTasks = useMemo(() => {
        const todayList = (allTodos[todayKey] || []).filter(t => !t.completed);
        const undatedList = (allTodos['undated'] || []).filter(t => !t.completed);
        return [...todayList, ...undatedList].sort((a, b) => (a.start_time || '23:59').localeCompare(b.start_time || '23:59'));
    }, [allTodos, todayKey]);
    
    // Pomodoro Timer Logic
    const handleTimerCompletion = useCallback(() => {
        pomodoroAudioRef.current?.play();

        const currentMode = pomodoroState.mode;
        const nextMode = currentMode === 'work' ? 'break' : 'work';
        const message = currentMode === 'work' ? "¡Tiempo de descansar! ¡Bien hecho!" : "¡Se acabó el descanso! Tú puedes.";

        if (isSubscribed) {
            supabase.functions.invoke('send-pushalert-notification', {
                body: { title: "Pomodoro Terminado", message: message },
            });
        }

        if (currentMode === 'work') {
            onLogFocusSession(Math.round(pomodoroState.durations.work / 60));
        }

        const newDuration = pomodoroState.durations[nextMode];
        setPomodoroState((s: any) => ({
            ...s,
            mode: nextMode,
            timeLeft: newDuration,
            isActive: true,
            endTime: Date.now() + newDuration * 1000,
        }));
    }, [isSubscribed, pomodoroState, onLogFocusSession, setPomodoroState]);

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
      setActiveSpotifyTrack({ ...track, queue });
      if (activeTrack) setActiveTrack(null);
    };

    const capitalizedUserName = useMemo(() => {
        if (!currentUser.email) return 'Pollito';
        const userName = currentUser.email.split('@')[0];
        return userName.charAt(0).toUpperCase() + userName.slice(1);
    }, [currentUser.email]);

    const renderContent = () => {
        return (
            <>
                <div className={activeTab === 'home' ? 'h-full flex flex-col' : 'hidden'}>
                    <header className="sticky top-0 p-4 z-30 flex items-center justify-between">
                        <Greeting name={capitalizedUserName} />
                        <button onClick={() => setActiveTab('progreso')} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-full shadow-lg p-2 px-4 text-sm font-bold text-primary-dark dark:text-primary hover:bg-white dark:hover:bg-gray-800">
                            Progreso
                        </button>
                    </header>
                    <div className="w-[90%] max-w-sm mx-auto py-3 space-y-3">
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
                        <TodaysAgenda 
                            tasks={todayAgendaTasks} 
                            calendarEvents={calendarEvents} 
                            onToggleTask={(id) => handleToggleTodo(id, handleShowCompletionModal)} 
                            onToggleSubtask={(taskId, subtaskId) => handleToggleSubtask(taskId, subtaskId, handleShowCompletionModal)} 
                            quickNotes={quickNotes} 
                            onAddQuickNote={handleAddQuickNote} 
                            onDeleteQuickNote={handleDeleteQuickNote} 
                            onClearAllQuickNotes={handleClearAllQuickNotes} 
                            activeFocusTaskId={pomodoroState.activeFocusTaskId}
                            onSelectFocusTask={handleSelectFocusTask}
                            focusSessions={focusSessions}
                            isFocusTimerRunning={pomodoroState.isActive && pomodoroState.mode === 'work'}
                            mainDailyGoal={todayMainGoal}
                            onUpdateMainDailyGoal={handleUpdateMainDailyGoal}
                        />
                    </div>
                </div>

                <div className={activeTab === 'tasks' ? 'h-full flex flex-col' : 'hidden'}>
                    <div className="flex flex-col h-full">
                        <TodoListModule progressEmoji={uiSettings?.progressEmoji} 
                            currentUser={currentUser}
                            onLogout={onLogout}
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
                            onUpdateProject={(id, name, emoji, color) => handleUpdateProject(id, { name, emoji, color })}
                            onDeleteProject={handleDeleteProject}
                            onDeleteProjectAndTasks={handleDeleteProjectAndTasks}
                            handleArchiveProject={handleArchiveProject}
                            onViewProjectChange={setViewingProjectId}
                            calendarEvents={calendarEvents}
                            onOpenProjectCreator={handleOpenProjectCreator}
                            onOpenProjectEditor={handleOpenProjectEditor}
                            activeFocusTaskId={pomodoroState.activeFocusTaskId}
                            onSelectFocusTask={handleSelectFocusTask}
                            focusSessions={focusSessions}
                            isFocusTimerRunning={pomodoroState.isActive && pomodoroState.mode === 'work'}
                        />
                         <button onClick={() => setIsAddTaskModalOpen(true)} className="fixed bottom-24 right-4 bg-primary text-white rounded-full p-4 shadow-lg z-40 transform hover:scale-110 active:scale-95 transition-transform">
                            <PlusIcon />
                        </button>
                    </div>
                </div>

                <div className={activeTab === 'projects' ? 'h-full flex flex-col' : 'hidden'}>
                    <div className="h-full">
                        <ProjectsWorkspace
                            currentUser={currentUser}
                            projects={projects}
                            allTodos={flatAllTodos}
                            activeProjectId={viewingProjectId}
                            invitations={projectInvitations}
                            onSendInvitation={onSendInvitation}
                            pushPreferences={pushPreferences}
                            onSelectProject={(id) => setViewingProjectId(id)}
                            onAddProject={async (name, emoji, color) => {
                                const p = await handleAddProject(name, emoji, color);
                                return p || null;
                            }}
                            onUpdateProject={async (id, updates) => {
                                await handleUpdateProject(id, updates);
                            }}
                            onDeleteProject={handleDeleteProject}
                            onArchiveProject={async (id, isArchived) => {
                                await handleArchiveProject(id, isArchived);
                            }}
                            addTodo={async (text, options) => {
                                await handleAddTodo(text, options);
                            }}
                            updateTodo={handleUpdateTodo}
                            deleteTodo={handleDeleteTodo}
                            onEditTodo={setTaskToEdit}
                            onOpenProjectEditor={handleOpenProjectEditor}
                        />
                    </div>
                </div>

                <div className={activeTab === 'calendar' ? 'h-full flex flex-col' : 'hidden'}>
                    <div className="h-full pt-4 px-2">
                        <CalendarModule
                            isMobile={true}
                            allTodos={allTodos}
                            calendarEvents={calendarEvents}
                            selectedDate={selectedDate}
                            onSelectDate={setSelectedDate}
                            onEditTodo={setTaskToEdit}
                            onToggleTodo={(id) => handleToggleTodo(id, handleShowCompletionModal)}
                            onAddTodo={handleAddTodo}
                            projects={projects}
                            googleToken={googleApiToken}
                            gcalSettings={gcalSettings}
                            onGCalSettingsChange={onGCalSettingsChange}
                            userCalendars={userCalendars}
                            onAuthGoogle={handleAuthClick}
                            onConnectOutlook={onConnectOutlook}
                            onDisconnectOutlook={onDisconnectOutlook}
                            outlookAccount={outlookAccount}
                            onRefreshEvents={loadAndValidateCalendarData}
                            onRemoveFromCalendar={onRemoveFromCalendar}
                            onSyncToCalendar={onSyncToCalendar}
                            onSyncNotion={onSyncNotion}
                        />
                    </div>
                </div>

                {activeTab === 'habits' && (
                    <div className="h-full flex flex-col">
                         <div className="h-full pt-8">
                            <HabitTracker 
                                habits={habits} 
                                records={habitRecords} 
                                onOpenHabitCreator={onOpenHabitCreator}
                                onOpenHabitEditor={onOpenHabitEditor}
                                onDeleteHabit={handleDeleteHabit} 
                                onToggleRecord={handleToggleHabitRecord}
                            />
                        </div>
                    </div>
                )}

                <div className={activeTab === 'notes' ? 'h-full flex flex-col' : 'hidden'}>
                    <div className="h-full pt-8">
                      <NotesSection isMobile={true} folders={folders} onAddFolder={handleAddFolder} onUpdateFolder={handleUpdateFolder} onDeleteFolder={handleDeleteFolder} onAddNote={handleAddNote} onUpdateNote={handleUpdateNote} onDeleteNote={handleDeleteNote} />
                    </div>
                </div>

                {activeTab === 'progreso' && (
                    <div className="h-full flex flex-col">
                        <div className="flex flex-col h-full">
                            <ProgressView 
                                allTodos={allTodos} 
                                projects={projects} 
                                habits={habits} 
                                habitRecords={habitRecords}
                                focusSessions={focusSessions}
                                onBack={() => setActiveTab('home')}
                            />
                        </div>
                    </div>
                )}

                <div className={activeTab === 'more' ? 'h-full flex flex-col' : 'hidden'}>
                    <div className="p-4 pt-8">
                        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
                            <div className="divide-y divide-black/5 dark:divide-white/10">

                                <button onClick={() => setIsCustomizationPanelOpen(true)} className="w-full flex justify-between items-center text-left p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                    <div className="flex items-center gap-3">
                                        <Settings className="w-5 h-5 text-primary" />
                                        <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Configuración</h3>
                                    </div>
                                    <ChevronRightIcon />
                                </button>

                                <div className="p-4 flex justify-between items-center">
                                    <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Tema</h3>
                                    <ThemeToggleButton theme={theme} toggleTheme={toggleTheme} />
                                </div>

                                <button onClick={() => setIsQuickCaptureSetupOpen(true)} className="w-full flex justify-between items-center text-left p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                    <h3 className="font-bold text-lg text-primary-dark dark:text-primary">Captura Rápida</h3>
                                    <ChevronRightIcon />
                                </button>
                                
                                <button onClick={() => setIsNotificationsPanelOpen(true)} className="w-full flex justify-between items-center text-left p-4 transition-colors hover:bg-black/5 dark:hover:bg-white/5" disabled={isPermissionBlocked}>
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-bold text-lg transition-colors ${ isPermissionBlocked ? 'text-gray-400 dark:text-gray-500' : 'text-primary-dark dark:text-primary' }`}>
                                            Notificaciones
                                        </h3>
                                        {projectInvitations.filter(i => i.status === 'pending').length > 0 && (
                                            <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                                                {projectInvitations.filter(i => i.status === 'pending').length}
                                            </span>
                                        )}
                                    </div>
                                    {!isPermissionBlocked && <ChevronRightIcon />}
                                </button>

                            </div>
                        </div>
                         <button onClick={onLogout} className="w-full mt-6 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 font-bold flex items-center justify-center gap-2 p-3 rounded-full shadow-md">
                            <LogoutIcon />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </>
        );
    };

    return (
        <div className="h-[100dvh] w-screen text-gray-800 dark:text-gray-100 font-sans flex flex-col">
            <ParticleLayer type={particleType} reduceParticles={isPowerSavingActive} />
            
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
            
            <GlobalHuddleFloatingWidget
              onOpenProjectsWorkspace={(projectId) => {
                setViewingProjectId(projectId);
                setActiveTab('projects');
              }}
            />
            
            <CustomizationPanel
              isOpen={isCustomizationPanelOpen}
              onClose={() => setIsCustomizationPanelOpen(false)}
              currentUser={currentUser}
              onLogout={onLogout}
              progressEmoji={uiSettings?.progressEmoji}
              onProgressEmojiChange={(emoji) => setUiSettings((s: any) => ({ ...s, progressEmoji: emoji }))}
              isMobile={true}
              colors={themeColors}
              onThemeColorChange={onThemeColorChange}
              onReset={onResetThemeColors}
              activeBackground={activeBackground}
              userBackgrounds={userBackgrounds}
              onSelectBackground={(bg) => {
                setUiSettings((s: any) => ({
                  ...s,
                  activeBackgroundId: bg?.id || null,
                  activeBackgroundUrl: bg?.url || null,
                  activeBackgroundType: bg?.type || 'image',
                  activeBackgroundName: bg?.name || null
                }));
                try {
                  if (bg) {
                    localStorage.setItem(`pollito_selected_bg_${currentUser?.id || 'guest'}`, JSON.stringify(bg));
                  } else {
                    localStorage.removeItem(`pollito_selected_bg_${currentUser?.id || 'guest'}`);
                  }
                } catch (e) {}
              }}
              onAddBackground={handleAddBackground}
              onDeleteBackground={handleDeleteBackground}
              onToggleFavorite={handleToggleFavoriteBackground}
              backgroundsLoading={backgroundsAreLoading}
              particleType={particleType}
              setParticleType={(type) => setUiSettings((s: any) => ({ ...s, particleType: type }))}
              ambientSound={ambientSound}
              setAmbientSound={(sound) => setUiSettings((s: any) => ({ ...s, ambientSound: sound }))}
              enableBatterySaver={uiSettings?.enableBatterySaver || false}
              setEnableBatterySaver={(enabled) => setUiSettings((s: any) => ({ ...s, enableBatterySaver: enabled }))}
              batteryStatus={batteryStatus}
              dailyEncouragementHour={uiSettings?.dailyEncouragementLocalHour ?? null}
              onSetDailyEncouragement={(hour) => setUiSettings((s: any) => ({...s, dailyEncouragementLocalHour: hour}))}
              dailySummaryHour={uiSettings?.dailySummaryHour ?? null}
              onSetDailySummary={(hour) => setUiSettings((s: any) => ({...s, dailySummaryHour: hour}))}
              pushPreferences={pushPreferences}
              onUpdatePushPreferences={onUpdatePushPreferences}
              isSubscribed={isSubscribed}
              isPermissionBlocked={isPermissionBlocked}
              onToggleSubscription={onToggleSubscription}
              onSendTestNotification={handleNotificationAction}
            />

            <NotificationsPanel
                isOpen={isNotificationsPanelOpen}
                onClose={() => setIsNotificationsPanelOpen(false)}
                isMobile={true}
                currentUserEmail={currentUser?.email}
                invitations={projectInvitations}
                onAcceptInvitation={onAcceptInvitation}
                onDeclineInvitation={onDeclineInvitation}
                pushPreferences={pushPreferences}
                onUpdatePushPreferences={onUpdatePushPreferences}
                isSubscribed={isSubscribed}
                isPermissionBlocked={isPermissionBlocked}
                onToggleSubscription={onToggleSubscription}
                dailyEncouragementHour={uiSettings?.dailyEncouragementLocalHour ?? null}
                onSetDailyEncouragement={(hour) => setUiSettings((s: any) => ({...s, dailyEncouragementLocalHour: hour}))}
                dailySummaryHour={uiSettings?.dailySummaryHour ?? null}
                onSetDailySummary={(hour) => setUiSettings((s: any) => ({...s, dailySummaryHour: hour}))}
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
            <ProjectEditorPanel
                isOpen={isProjectEditorOpen}
                onClose={() => setIsProjectEditorOpen(false)}
                onSave={handleSaveProject}
                projectToEdit={projectToEdit}
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
                onRemoveFromCalendar={onRemoveFromCalendar}
                onSyncToCalendar={onSyncToCalendar}
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
                tasks={pomodoroTasks}
                activeTaskId={pomodoroState.activeFocusTaskId}
                onSelectTask={(id) => setPomodoroState(s => ({ ...s, activeFocusTaskId: id }))}
                isFocusTimerRunning={pomodoroState.isActive && pomodoroState.mode === 'work'}
            />

            <audio ref={pomodoroAudioRef} src={pomodoroAudioSrc} />
        </div>
    );
};


const DEFAULT_COLORS: ThemeColors = {
  primary: '#38BDF8', // Celeste (Sky-400)
  secondary: '#2563EB', // Azul (Blue-600)
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
  const [uiSettings, setUiSettings] = useState<any>(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const batteryStatus = useBatteryStatus();
  const isPowerSavingActive = !!(uiSettings?.enableBatterySaver && batteryStatus.isLow);

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
  const [projectInvitations, setProjectInvitations] = useState<ProjectInvitation[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitRecords, setHabitRecords] = useState<HabitRecord[]>([]);
  const [processingHabitRecord, setProcessingHabitRecord] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [quickNotes, setQuickNotes] = useState<QuickNote[]>([]);
  const [isHabitEditorOpen, setIsHabitEditorOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  
  // UI state
  const [browserSession, setBrowserSession] = useState<BrowserSession>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [deleteOptions, setDeleteOptions] = useState<{ isOpen: boolean; todo: Todo | null; }>({ isOpen: false, todo: null });
  const [singleTaskToDelete, setSingleTaskToDelete] = useState<Todo | null>(null);
  const [updateOptions, setUpdateOptions] = useState<{ isOpen: boolean; original: Todo | null; updated: Todo | null; }>({ isOpen: false, original: null, updated: null });
  const [isClearPastConfirmOpen, setIsClearPastConfirmOpen] = useState(false);
  const [quickCaptureMessage, setQuickCaptureMessage] = useState<string | null>(null);

  const [pomodoroState, setPomodoroState] = useState({
      timeLeft: 25 * 60,
      isActive: false,
      mode: 'work' as 'work' | 'break',
      durations: { work: 25 * 60, break: 5 * 60 },
      showBackgroundTimer: false,
      backgroundTimerOpacity: 50,
      endTime: null as (number | null),
      activeFocusTaskId: null as (number | null),
  });
  const [activeTrack, setActiveTrack] = useState<Playlist | null>(null);
  const [activeSpotifyTrack, setActiveSpotifyTrack] = useState<Playlist | null>(null);

  // Google API State
  const [gapiReady, setGapiReady] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const [googleApiToken, setGoogleApiToken] = useState<string | null>(null);
  const appFolderId = useRef<string | null>(null);
  const tokenClientRef = useRef<any>(null);
  // Google Calendar State
  const [gcalSettings, setGcalSettings] = useState<GCalSettings>({ enabled: false, calendarId: 'primary' });
  const [userCalendars, setUserCalendars] = useState<GoogleCalendar[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [outlookAccount, setOutlookAccount] = useState<CalendarIntegrationAccount | null>(null);

  useEffect(() => {
    setOutlookAccount(CalendarSyncService.getAccount('outlook'));
  }, []);

  const handleConnectOutlook = async (clientId?: string) => {
    const account = await CalendarSyncService.connectOutlookAccount(clientId);
    if (account) {
      setOutlookAccount(account);
      loadAndValidateCalendarData();
    }
  };

  const handleDisconnectOutlook = () => {
    CalendarSyncService.removeAccount('outlook');
    setOutlookAccount(null);
  };
  
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

  const flatAllTodos = useMemo(() => {
    const list: Todo[] = [];
    Object.keys(allTodos).forEach(key => {
      if (Array.isArray(allTodos[key])) {
        list.push(...allTodos[key]);
      }
    });
    return list;
  }, [allTodos]);

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
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if(session?.user) {
            setUser(session.user);
          } else {
            setUser(null);
          }
        } catch (e) {
          console.error("Auth check failed:", e);
        }
        setAuthLoading(false);
    };
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
          setDataLoaded(false);
          setUiSettings(null);
          // Reset all state
          setAllTodos({}); setFolders([]); setPlaylists([]); setQuickNotes([]); setNotes([]);
          setProjects([]); setHabits([]); setHabitRecords([]);
          setUserBackgrounds([]);
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
    localStorage.removeItem('pollito_legacy_user');

    // Also clear the token from the gapi client instance.
    if (window.gapi && window.gapi.client) {
        window.gapi.client.setToken(null);
    }

    // Reset local state
    setUser(null);
    setDataLoaded(false);
    setUiSettings(null);
    setAllTodos({}); setFolders([]); setPlaylists([]); setQuickNotes([]); setNotes([]);
    setProjects([]); setHabits([]); setHabitRecords([]);
    setUserBackgrounds([]);

    // Supabase logout
    try {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Error logging out:', error.message);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  }, [googleApiToken, user, getUserKey]);
  
  const loadData = useCallback(async (networkMode: 'fetch' | 'cache-only' = 'fetch') => {
    if (!user) return;
    
    // Load from cache first for instant UI
    const [cachedTodos, cachedFolders, cachedNotes, cachedPlaylists, cachedQuickNotes, cachedProjects, cachedHabits, cachedHabitRecords] = await Promise.all([
        getAll<Todo>('todos'),
        getAll<Folder>('folders'),
        getAll<Note>('notes'),
        getAll<Playlist>('playlists'),
        getAll<QuickNote>('quick_notes'),
        getAll<Project>('projects'),
        getAll<Habit>('habits'),
        getAll<HabitRecord>('habit_records'),
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
    if (cachedPlaylists && cachedPlaylists.length > 0) {
      setPlaylists(cachedPlaylists);
    } else {
      const defaultPlaylistsList: Playlist[] = [
        { id: 1, user_id: user?.id || 'default', name: 'Lofi Beats', source_id: '37i9dQZF1DXcBWIGoYBM5M', type: 'playlist', platform: 'spotify', is_favorite: true, thumbnail_url: 'https://i.scdn.co/image/ab67706f00000003002f232e08e6ff05f5904838' },
        { id: 2, user_id: user?.id || 'default', name: 'Peaceful Piano', source_id: '37i9dQZF1DX4sWSpwq3LiO', type: 'playlist', platform: 'spotify', is_favorite: false, thumbnail_url: 'https://i.scdn.co/image/ab67706f00000003ca22a83e01dd89a1fa9f123f' },
        { id: 3, user_id: user?.id || 'default', name: 'Deep Focus', source_id: '37i9dQZF1DWZeKCadgRdKQ', type: 'playlist', platform: 'spotify', is_favorite: true, thumbnail_url: 'https://i.scdn.co/image/ab67706f0000000355482310ff97c2a7813a0785' }
      ];
      setPlaylists(defaultPlaylistsList);
    }
    setQuickNotes(cachedQuickNotes);
    setProjects(cachedProjects);
    setHabitRecords(cachedHabitRecords);

    // Load cached project invitations
    if (user?.email) {
      const cachedInv = localStorage.getItem(`invitations_${user.email}`);
      if (cachedInv) {
        try { setProjectInvitations(JSON.parse(cachedInv)); } catch (e) {}
      }
    }

    // Parse habits from cache
    const parsedCachedHabits: Habit[] = (cachedHabits as any[]).map((h: any) => {
        let parsedFrequency: HabitFrequency;
        if (typeof h.frequency === 'string') {
            try {
                parsedFrequency = JSON.parse(h.frequency);
            } catch (e) {
                if (h.frequency === 'daily' || h.frequency === 'weekly') {
                    parsedFrequency = { type: 'daily' };
                } else {
                    parsedFrequency = { type: 'daily' };
                }
            }
        } else if (typeof h.frequency === 'object' && h.frequency !== null) {
            parsedFrequency = h.frequency;
        } else {
            parsedFrequency = { type: 'daily' };
        }
        return { ...h, frequency: parsedFrequency };
    });
    setHabits(parsedCachedHabits);
    
    // Load local UI settings from localStorage or defaults
    const savedUiSettings = localStorage.getItem(getUserKey('ui_settings'));
    let localSettings = {
      themeColors: DEFAULT_COLORS,
      activeBackgroundId: null,
      activeBackgroundUrl: null,
      activeBackgroundType: 'image' as 'image' | 'video',
      activeBackgroundName: null,
      particleType: 'none' as ParticleType,
      ambientSound: { type: 'none' as AmbientSoundType, volume: 0.5 },
      dailyEncouragementLocalHour: null,
      dailySummaryHour: null,
      enableBatterySaver: false,
      progressEmoji: '🚀',
      pushPreferences: DEFAULT_PUSH_PREFERENCES
    };
    if (savedUiSettings) {
      try {
        localSettings = { ...localSettings, ...JSON.parse(savedUiSettings) };
        if (!localSettings.progressEmoji) {
          localSettings.progressEmoji = '🚀';
        }
      } catch (e) {
        console.warn('Failed to parse ui_settings:', e);
      }
    }
    setUiSettings(localSettings);

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
        { data: habitsData },
        { data: habitRecordsData },
        { data: profileData },
        { data: invitationsData }
      ] = await Promise.all([
        supabase.from('todos').select('*, subtasks(*)').order('created_at'),
        supabase.from('folders').select('*').order('created_at'),
        supabase.from('notes').select('*').order('created_at'),
        supabase.from('playlists').select('*').order('created_at'),
        supabase.from('quick_notes').select('*').order('created_at'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('habits').select('*').order('created_at'),
        supabase.from('habit_records').select('*').order('created_at'),
        supabase.from('profiles').select('pomodoro_settings, gcal_settings, ui_settings, timezone_offset').eq('id', user.id).maybeSingle(),
        user?.email
          ? supabase.from('project_invitations').select('*').or(`receiver_email.eq.${user.email},sender_email.eq.${user.email},invitee_email.eq.${user.email},inviter_email.eq.${user.email}`).order('created_at', { ascending: false })
          : Promise.resolve({ data: null, error: null })
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
      if(invitationsData && user?.email) {
        setProjectInvitations(invitationsData);
        localStorage.setItem(`invitations_${user.email}`, JSON.stringify(invitationsData));
      }
      if(habitsData) { 
            const parsedHabits: Habit[] = (habitsData as any[]).map((h: any) => {
                let parsedFrequency: HabitFrequency;
                if (typeof h.frequency === 'string') {
                    try {
                        parsedFrequency = JSON.parse(h.frequency);
                    } catch (e) {
                        // Handle old string values
                        if (h.frequency === 'daily' || h.frequency === 'weekly') {
                            parsedFrequency = { type: 'daily' };
                        } else {
                            parsedFrequency = { type: 'daily' }; // Default fallback
                        }
                    }
                } else if (typeof h.frequency === 'object' && h.frequency !== null) {
                    parsedFrequency = h.frequency; // It might already be an object
                }
                else {
                    parsedFrequency = { type: 'daily' }; // Fallback for null/undefined
                }
                return { ...h, frequency: parsedFrequency };
            });
            setHabits(parsedHabits);
            await clearAndPutAll('habits', habitsData);
      }
      if(habitRecordsData) { setHabitRecords(habitRecordsData); await clearAndPutAll('habit_records', habitRecordsData); }

      if (profileData) {
          if (profileData.pomodoro_settings && typeof profileData.pomodoro_settings === 'object') {
              const savedSettings = profileData.pomodoro_settings as Partial<typeof pomodoroState>;
              setPomodoroState(s => ({ ...s, durations: savedSettings.durations || s.durations, timeLeft: (savedSettings.durations || s.durations)[s.mode], isActive: false, endTime: null }));
          }
          if(profileData.gcal_settings) {
              setGcalSettings(profileData.gcal_settings as GCalSettings);
          }
          
          const settings = (profileData.ui_settings || {}) as any;
          setUiSettings(prev => ({
              themeColors: settings.themeColors || prev?.themeColors || DEFAULT_COLORS,
              activeBackgroundId: settings.activeBackgroundId ?? prev?.activeBackgroundId ?? null,
              activeBackgroundUrl: settings.activeBackgroundUrl ?? prev?.activeBackgroundUrl ?? null,
              activeBackgroundType: settings.activeBackgroundType ?? prev?.activeBackgroundType ?? 'image',
              activeBackgroundName: settings.activeBackgroundName ?? prev?.activeBackgroundName ?? null,
              particleType: settings.particleType || prev?.particleType || 'none',
              ambientSound: settings.ambientSound || prev?.ambientSound || { type: 'none', volume: 0.5 },
              dailyEncouragementLocalHour: settings.dailyEncouragementLocalHour ?? prev?.dailyEncouragementLocalHour ?? null,
              dailySummaryHour: settings.dailySummaryHour ?? prev?.dailySummaryHour ?? null,
              enableBatterySaver: settings.enableBatterySaver ?? prev?.enableBatterySaver ?? false,
              progressEmoji: settings.progressEmoji || prev?.progressEmoji || '🚀',
              dailyGoals: settings.dailyGoals || prev?.dailyGoals || {},
              pushPreferences: settings.pushPreferences || prev?.pushPreferences || DEFAULT_PUSH_PREFERENCES,
          }));

          // Check and update user's timezone offset for notifications
          const currentUserTimezoneOffset = new Date().getTimezoneOffset();
          if (profileData.timezone_offset !== currentUserTimezoneOffset) {
              supabase.from('profiles').update({ timezone_offset: currentUserTimezoneOffset }).eq('id', user.id).then(({ error }) => {
                  if (error) {
                      console.error("Failed to update user timezone offset:", error);
                  } else {
                      console.log("User timezone offset updated to:", currentUserTimezoneOffset);
                  }
              });
          }

      } else {
            setUiSettings(prev => prev || {
              themeColors: DEFAULT_COLORS,
              activeBackgroundId: null,
              particleType: 'none',
              ambientSound: { type: 'none', volume: 0.5 },
              dailyEncouragementLocalHour: null,
              dailySummaryHour: null,
              enableBatterySaver: false,
              progressEmoji: '🚀',
            });
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

  // --- REAL-TIME SUPABASE SYNCHRONIZATION ---
  useEffect(() => {
    if (!user || !dataLoaded || !isOnline) return;

    console.log("Setting up Supabase Realtime Channels...");

    // 1. Subscribe to Projects changes (chats, lists, expenses, docs, time_entries, channels, huddles, etc.)
    const projectsChannel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        async (payload) => {
          console.log('Realtime project payload received:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT') {
            const insertProj = newRecord as Project;
            const isOwner = insertProj.user_id === user.id;
            const isInMembersList = insertProj.members && Array.isArray(insertProj.members) && insertProj.members.some((m: any) => {
              const email = typeof m === 'string' ? m : m.email;
              return email && email.toLowerCase() === user.email.toLowerCase();
            });
            const isBelonging = isOwner || isInMembersList;
            if (isBelonging) {
              setProjects(prev => {
                if (prev.some(p => p.id === insertProj.id)) return prev;
                return [...prev, insertProj].sort((a, b) => a.name.localeCompare(b.name));
              });
              const currentCached = await getAll<Project>('projects');
              if (!currentCached.some(p => p.id === insertProj.id)) {
                await clearAndPutAll('projects', [...currentCached, insertProj]);
              }
            }
          } else if (eventType === 'UPDATE') {
            const updateProj = newRecord as Project;
            const isOwner = updateProj.user_id === user.id;
            const hasMembersList = updateProj.members && Array.isArray(updateProj.members);
            const isInMembersList = hasMembersList && updateProj.members.some((m: any) => {
              const email = typeof m === 'string' ? m : m.email;
              return email && email.toLowerCase() === user.email.toLowerCase();
            });

            let belongs = isOwner || isInMembersList;

            // If the UPDATE payload does not specify members or has it empty/undefined,
            // but we already have the project in our list, we should preserve it.
            if (!belongs && !hasMembersList) {
              belongs = true;
            }

            if (belongs) {
              setProjects(prev => {
                return prev.map(p => p.id === updateProj.id ? { ...p, ...updateProj } : p)
                  .sort((a, b) => a.name.localeCompare(b.name));
              });
              const currentCached = await getAll<Project>('projects');
              const updatedCached = currentCached.map(p => p.id === updateProj.id ? { ...p, ...updateProj } : p);
              await clearAndPutAll('projects', updatedCached);
            } else {
              setProjects(prev => prev.filter(p => p.id !== updateProj.id));
              const currentCached = await getAll<Project>('projects');
              const updatedCached = currentCached.filter(p => p.id !== updateProj.id);
              await clearAndPutAll('projects', updatedCached);
            }
          } else if (eventType === 'DELETE') {
            const deletedId = oldRecord.id;
            setProjects(prev => prev.filter(p => p.id !== deletedId));
            const currentCached = await getAll<Project>('projects');
            const updatedCached = currentCached.filter(p => p.id !== deletedId);
            await clearAndPutAll('projects', updatedCached);
          }
        }
      )
      .subscribe();

    // 2. Subscribe to Todos changes (tasks)
    const todosChannel = supabase
      .channel('todos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        async (payload) => {
          console.log('Realtime todo payload received:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const todo = newRecord as Todo;
            // Only update if it belongs to this user or to a project the user has access to
            const userProjects = await getAll<Project>('projects');
            const isRelevant = todo.user_id === user.id || 
              (todo.project_id && userProjects.some(p => p.id === todo.project_id));

            if (isRelevant) {
              setAllTodos(current => getUpdatedTodosState(current, todo));
              const currentCached = await getAll<Todo>('todos');
              const updatedCached = currentCached.filter(t => t.id !== todo.id);
              updatedCached.push(todo);
              await clearAndPutAll('todos', updatedCached);
            }
          } else if (eventType === 'DELETE') {
            const deletedId = oldRecord.id;
            setAllTodos(current => {
              const newAllTodos = JSON.parse(JSON.stringify(current));
              for (const key in newAllTodos) {
                const idx = newAllTodos[key].findIndex(t => t.id === deletedId);
                if (idx !== -1) {
                  newAllTodos[key].splice(idx, 1);
                  if (newAllTodos[key].length === 0 && key !== 'undated') {
                    delete newAllTodos[key];
                  }
                  break;
                }
              }
              return newAllTodos;
            });
            const currentCached = await getAll<Todo>('todos');
            const updatedCached = currentCached.filter(t => t.id !== deletedId);
            await clearAndPutAll('todos', updatedCached);
          }
        }
      )
      .subscribe();

    // 3. Subscribe to Project Invitations changes
    const invitationsChannel = supabase
      .channel('invitations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_invitations' },
        async (payload) => {
          console.log('Realtime invitation payload received:', payload);
          const { eventType, new: newRecord, old: oldRecord } = payload;

          if (eventType === 'INSERT' || eventType === 'UPDATE') {
            const inv = newRecord as ProjectInvitation;
            const isRelevant = inv.receiver_email === user.email || inv.sender_email === user.email || inv.invitee_email === user.email || inv.inviter_email === user.email;
            if (isRelevant) {
              setProjectInvitations(prev => {
                const filtered = prev.filter(p => p.id !== inv.id);
                const updated = [inv, ...filtered];
                localStorage.setItem(`invitations_${user.email}`, JSON.stringify(updated));
                return updated;
              });
            }
          } else if (eventType === 'DELETE') {
            const deletedId = oldRecord.id;
            setProjectInvitations(prev => {
              const updated = prev.filter(p => p.id !== deletedId);
              localStorage.setItem(`invitations_${user.email}`, JSON.stringify(updated));
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up Supabase Realtime Channels...");
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(todosChannel);
      supabase.removeChannel(invitationsChannel);
    };
  }, [user, dataLoaded, isOnline]);

  // --- Settings Persistence ---
  useEffect(() => {
    if (user && dataLoaded) {
      if(isOnline) {
        if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current);
        settingsSaveTimeout.current = window.setTimeout(async () => {
          const { durations, showBackgroundTimer, backgroundTimerOpacity, autoMinimizeWindows } = pomodoroState;
          const settingsToSave = { durations, showBackgroundTimer, backgroundTimerOpacity, autoMinimizeWindows };
          await supabase.from('profiles').upsert({ id: user.id, pomodoro_settings: settingsToSave });
        }, 1500);
      }
    }
    return () => { if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current); };
  }, [pomodoroState, user, dataLoaded, isOnline]);
  
  useEffect(() => {
    if (uiSettings) {
      try {
        localStorage.setItem(getUserKey('ui_settings'), JSON.stringify(uiSettings));
      } catch (e) {
        console.warn('Failed to save ui_settings to localStorage:', e);
      }
      if (user && dataLoaded && isOnline) {
        if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current);
        settingsSaveTimeout.current = window.setTimeout(async () => {
          await supabase.from('profiles').upsert({ id: user.id, ui_settings: uiSettings });
        }, 1000);
      }
    }
    return () => { if (settingsSaveTimeout.current) clearTimeout(settingsSaveTimeout.current); };
  }, [uiSettings, user, dataLoaded, isOnline, getUserKey]);

  // --- Robust Pomodoro State Persistence ---
  const pomodoroInitialized = useRef(false);

  useEffect(() => {
    // This effect loads the pomodoro state from localStorage ONCE when the app is ready.
    if (user && dataLoaded && !pomodoroInitialized.current) {
        pomodoroInitialized.current = true;
        const savedStateJSON = localStorage.getItem(getUserKey('pomodoroState'));
        if (savedStateJSON) {
            try {
                const savedState = JSON.parse(savedStateJSON);
                
                if (savedState.isActive && savedState.endTime) {
                    const remainingMs = savedState.endTime - Date.now();
                    if (remainingMs > 0) {
                        // Timer was active and is still running. Resume it.
                        setPomodoroState(s => ({
                            ...s,
                            ...savedState,
                            isActive: true,
                            timeLeft: Math.ceil(remainingMs / 1000),
                        }));
                    } else {
                        // Timer finished while the app was closed.
                        const timeElapsed = Math.abs(remainingMs);
                        let newMode = savedState.mode;
                        let newTimeLeft = 0;
                        let timeAfterFinishing = timeElapsed;

                        // Cycle through phases that would have passed
                        while (timeAfterFinishing > 0) {
                            const durationOfFinishedPhase = savedState.durations[newMode];
                            if (timeAfterFinishing < durationOfFinishedPhase * 1000) {
                                newTimeLeft = (durationOfFinishedPhase * 1000) - timeAfterFinishing;
                                break;
                            }
                            timeAfterFinishing -= durationOfFinishedPhase * 1000;
                            newMode = newMode === 'work' ? 'break' : 'work';
                        }
                        
                        setPomodoroState(s => ({
                            ...s,
                            ...savedState,
                            isActive: false, // Don't auto-start the next phase
                            endTime: null,
                            mode: newMode,
                            timeLeft: Math.ceil(newTimeLeft / 1000),
                        }));
                    }
                } else if (savedState.timeLeft) {
                    // Timer was paused. Restore its state.
                    setPomodoroState(s => ({
                        ...s,
                        ...savedState,
                        isActive: false,
                        endTime: null,
                    }));
                }
            } catch (e) {
                console.error("Failed to parse saved pomodoro state, clearing it.", e);
                localStorage.removeItem(getUserKey('pomodoroState'));
            }
        }
    }
  }, [user, dataLoaded, getUserKey]);

  useEffect(() => {
      // This effect saves the pomodoro state to localStorage on every change.
      if (user && dataLoaded) {
          const { ...stateToSave } = pomodoroState;
          localStorage.setItem(getUserKey('pomodoroState'), JSON.stringify(stateToSave));
      }
  }, [pomodoroState, user, dataLoaded, getUserKey]);


  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('browserSession'), value: browserSession }); }, [browserSession, getUserKey, user, dataLoaded]);
  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('activeTrack'), value: activeTrack }); }, [activeTrack, getUserKey, user, dataLoaded]);
  useEffect(() => { if (user && dataLoaded) set('settings', { key: getUserKey('activeSpotifyTrack'), value: activeSpotifyTrack }); }, [activeSpotifyTrack, getUserKey, user, dataLoaded]);

  // --- Focus Sessions Persistence ---
  useEffect(() => {
    if (user && dataLoaded) {
      const savedSessions = localStorage.getItem(getUserKey('focus_sessions'));
      if (savedSessions) {
        try {
          setFocusSessions(JSON.parse(savedSessions));
        } catch (e) {
          console.error("Error parsing focus sessions:", e);
        }
      } else {
        const sessions: FocusSession[] = [];
        const today = new Date();
        for (let i = 21; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i);
          const dateString = date.toISOString().split('T')[0];
          if (Math.random() > 0.35) {
            const numSessions = Math.floor(Math.random() * 3) + 1;
            for (let j = 0; j < numSessions; j++) {
              sessions.push({
                id: Date.now() - i * 86400000 - j * 3600000,
                completed_at: dateString,
                duration: Math.random() > 0.45 ? 25 : 50,
              });
            }
          }
        }
        setFocusSessions(sessions);
        localStorage.setItem(getUserKey('focus_sessions'), JSON.stringify(sessions));
      }
    }
  }, [user, dataLoaded, getUserKey]);

  const handleLogFocusSession = useCallback((minutes: number, taskId?: number | null) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const resolvedTaskId = taskId !== undefined ? taskId : pomodoroState.activeFocusTaskId;
    let resolvedTaskTitle: string | undefined = undefined;

    if (resolvedTaskId) {
      let foundTask: Todo | undefined;
      for (const dateKey of Object.keys(allTodos)) {
        foundTask = (allTodos[dateKey] || []).find(t => t.id === resolvedTaskId);
        if (foundTask) break;
      }
      if (foundTask) {
        resolvedTaskTitle = foundTask.text;
      }
    }

    const newSession: FocusSession = {
      id: Date.now(),
      completed_at: todayStr,
      duration: minutes,
      task_id: resolvedTaskId || undefined,
      task_title: resolvedTaskTitle,
    };
    setFocusSessions(prev => {
      const updated = [...prev, newSession];
      localStorage.setItem(getUserKey('focus_sessions'), JSON.stringify(updated));
      return updated;
    });
  }, [getUserKey, pomodoroState.activeFocusTaskId, allTodos]);

  // --- Data Handlers (Now with Offline Support & Auto Calendar Sync) ---
  const handleAddTodo = useCallback(async (text: string, options?: {
    projectId?: number | null;
    project_id?: number | null;
    isUndated?: boolean;
    dueDate?: string | null;
    startTime?: string;
    endTime?: string;
    priority?: Priority;
    notes?: string;
    syncToGoogle?: boolean;
    syncToOutlook?: boolean;
    sprint_id?: string | null;
    milestone_id?: string | null;
    story_points?: number | null;
    kanban_column?: string | null;
    assignee?: string | null;
    assigned_to?: string | null;
    list_id?: string | null;
    tags?: string[];
    dependencies?: number[];
    comments?: any[];
    attachments?: any[];
  }) => {
    if (!user) return;

    const projectId = options?.projectId || options?.project_id || null;
    const isUndated = options?.isUndated || false;

    let targetDueDate = (options?.dueDate !== undefined && options.dueDate !== '') ? options.dueDate : (isUndated ? null : formatDateKey(selectedDate));
    if (targetDueDate === '') {
      targetDueDate = null;
    }
    const dateKey = isUndated || !targetDueDate ? 'undated' : targetDueDate;

    const tempId = -Date.now();
    const newTodo: Todo = { 
        id: tempId, 
        text, 
        completed: false, 
        priority: options?.priority || 'medium', 
        due_date: targetDueDate || null, 
        start_time: options?.startTime || null,
        end_time: options?.endTime || null,
        notes: options?.notes || null,
        user_id: user.id, 
        created_at: new Date().toISOString(), 
        subtasks: [],
        project_id: projectId,
        sprint_id: options?.sprint_id || null,
        milestone_id: options?.milestone_id || null,
        story_points: options?.story_points || null,
        kanban_column: options?.kanban_column || 'Por hacer',
        assignee: options?.assignee || options?.assigned_to || null,
        assigned_to: options?.assignee || options?.assigned_to || null,
        list_id: options?.list_id || null,
        tags: options?.tags || [],
        dependencies: options?.dependencies || [],
        comments: options?.comments || [],
        attachments: options?.attachments || [],
    };
    
    // Optimistic UI update
    setAllTodos(current => {
        const newDateTodos = [...(current[dateKey] || []), newTodo];
        return { ...current, [dateKey]: newDateTodos };
    });
    
    // Sync to local DB / cloud
    let savedTodo = await syncableCreate('todos', newTodo) as Todo;

    // Automatic Notion Sync if enabled
    try {
      const notionSet = NotionService.getSettings();
      if (notionSet.enabled && notionSet.autoSync) {
        const res = await NotionService.insertPage(savedTodo);
        if (res) {
          savedTodo = {
            ...savedTodo,
            notion_page_id: res.id,
            notion_url: res.url,
          };
          await syncableUpdate('todos', savedTodo);
        }
      }
    } catch (notionErr) {
      console.warn("Auto Notion sync notice:", notionErr);
    }

    // Automatic Calendar Sync ONLY when explicitly selected/requested for this task
    try {
      const shouldSyncGoogle = options?.syncToGoogle === true;
      const outlookAccount = CalendarSyncService.getAccount('outlook');
      const shouldSyncOutlook = options?.syncToOutlook === true;

      if (shouldSyncGoogle && googleApiToken && gapiReady) {
        const calId = gcalSettings.calendarId || 'primary';
        const calResult = await CalendarSyncService.insertGoogleEvent(savedTodo, googleApiToken, calId);
        if (calResult && calResult.id) {
          savedTodo = {
            ...savedTodo,
            gcal_event_id: calResult.id,
            calendar_event_link: calResult.htmlLink,
            calendar_provider: 'google',
          };
          await syncableUpdate('todos', savedTodo);
        }
      } else if (shouldSyncOutlook && outlookAccount && outlookAccount.token) {
        const calId = outlookAccount.selectedCalendarId || 'primary';
        const calResult = await CalendarSyncService.insertOutlookEvent(savedTodo, outlookAccount.token, calId);
        if (calResult && calResult.id) {
          savedTodo = {
            ...savedTodo,
            gcal_event_id: calResult.id,
            calendar_event_link: calResult.htmlLink,
            calendar_provider: 'outlook',
          };
          await syncableUpdate('todos', savedTodo);
        }
      }
    } catch (calErr) {
      console.warn("Auto calendar sync notice:", calErr);
    }

    // Replace temporary item with server-confirmed item
    setAllTodos(current => {
        const dateTodos = current[dateKey] || [];
        return {
            ...current,
            [dateKey]: dateTodos.map(t => (t.id === tempId || t.id === savedTodo.id) ? savedTodo : t)
        };
    });
  }, [user, selectedDate, gcalSettings, googleApiToken, gapiReady]);
  
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
    for (const key in newAllTodos) {
        const index = newAllTodos[key].findIndex(t => t.id === todoToUpdate.id);
        if (index !== -1) {
            newAllTodos[key].splice(index, 1);
            if (newAllTodos[key].length === 0 && key !== 'undated') {
                delete newAllTodos[key];
            }
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
  
  const handleUpdateTodo = async (todoOrId: Todo | number, maybeUpdates?: Partial<Todo>) => {
    let updatedTodo: Todo;
    if (typeof todoOrId === 'number') {
      const original = findTodoById(todoOrId);
      if (!original) {
        console.warn(`[handleUpdateTodo] Task with id ${todoOrId} not found`);
        return;
      }
      updatedTodo = { ...original, ...maybeUpdates };
    } else {
      updatedTodo = { ...todoOrId };
    }

    // Normalize empty strings to null for database compatibility
    if (updatedTodo.due_date === '') updatedTodo.due_date = null;
    if (updatedTodo.sprint_id === '') updatedTodo.sprint_id = null;
    if (updatedTodo.milestone_id === '') updatedTodo.milestone_id = null;
    if (updatedTodo.list_id === '') updatedTodo.list_id = null;
    if (updatedTodo.project_id as any === '') updatedTodo.project_id = null;

    const originalTodo = findTodoById(updatedTodo.id);
    
    const wasRecurring = originalTodo?.recurrence?.frequency && originalTodo.recurrence.frequency !== 'none';
    const isNowRecurring = updatedTodo.recurrence?.frequency && updatedTodo.recurrence.frequency !== 'none';
    
    // Check if recurrence rules actually changed
    const recurrenceRuleChanged = JSON.stringify(originalTodo?.recurrence) !== JSON.stringify(updatedTodo.recurrence);

    if (recurrenceRuleChanged && (wasRecurring || isNowRecurring)) {
        // If it WAS recurring, we need to ask user what to do with future tasks
        // OR if we are changing from one recurring type to another (or to none)
        if (wasRecurring) {
             setUpdateOptions({ isOpen: true, original: originalTodo, updated: updatedTodo });
             return;
        }
        // If it wasn't recurring but is now, just save and generate future tasks
    } 

    // Standard update (no recurrence change prompt needed)
    let nextAllTodos = getUpdatedTodosState(allTodos, updatedTodo);
    setAllTodos(nextAllTodos);

    const savedTodo = await syncableUpdate('todos', updatedTodo);
    
    // Sync to external calendars
    if (savedTodo.gcal_event_id && savedTodo.calendar_provider) {
      let newCalResult: any = false;
      if (savedTodo.calendar_provider === 'google' && gcalSettings.enabled && googleApiToken && gapiReady) {
        const calId = gcalSettings.calendarId || 'primary';
        newCalResult = await CalendarSyncService.updateGoogleEvent(savedTodo, googleApiToken, savedTodo.gcal_event_id, calId);
      } else if (savedTodo.calendar_provider === 'outlook') {
        const currentOutlook = CalendarSyncService.getAccount('outlook');
        if (currentOutlook && currentOutlook.token) {
          const calId = currentOutlook.selectedCalendarId || 'primary';
          newCalResult = await CalendarSyncService.updateOutlookEvent(savedTodo, currentOutlook.token, savedTodo.gcal_event_id, calId);
        }
      }
      
      if (typeof newCalResult === 'object' && newCalResult.id) {
         // The event was recreated, so we must save the new ID
         savedTodo.gcal_event_id = newCalResult.id;
         if (newCalResult.htmlLink) savedTodo.calendar_event_link = newCalResult.htmlLink;
         await syncableUpdate('todos', savedTodo);
         setAllTodos(current => getUpdatedTodosState(current, savedTodo));
      } else if (newCalResult === false) {
         // The event failed to update completely. Maybe we should unlink it? Or just leave it.
         console.warn('Sync to calendar failed for task', savedTodo.id);
      }
    }

    // Sync to Notion if page ID exists and Notion is enabled
    try {
      const notionSet = NotionService.getSettings();
      if (notionSet.enabled && savedTodo.notion_page_id) {
        NotionService.updatePage(savedTodo);
      }
    } catch (notionErr) {
      console.warn("Auto Notion update sync notice:", notionErr);
    }
    
    if (recurrenceRuleChanged && isNowRecurring) {
        // Generate new recurrence chain
        const newRecurringTodos = await generateRecurringTasks(savedTodo);
        setAllTodos(current => {
            const newState = { ...current };
            newRecurringTodos.forEach(newTodo => {
                const dateKey = newTodo.due_date!;
                if (!newState[dateKey]) newState[dateKey] = [];
                newState[dateKey].push(newTodo);
            });
            return newState;
        });
    }
  };
  
  const handleUpdateThisOccurrenceOnly = async (updatedTodo: Todo) => {
    // The user chose "This task only". This implies breaking the recurrence chain for THIS specific task.
    // We set its frequency to 'none' so it stops generating, but we keep the recurrence ID on the *others* implicitly by not touching them.
    // Ideally, we should remove the recurrence ID from this task to detach it completely.
    const newTodo = { 
        ...updatedTodo, 
        recurrence: { frequency: 'none' as const } // Detach from chain
    };
    
    setAllTodos(current => getUpdatedTodosState(current, newTodo));
    await syncableUpdate('todos', newTodo);
    setUpdateOptions({ isOpen: false, original: null, updated: null });
  };
  
  const handleUpdateFutureOccurrences = async (updatedTodo: Todo) => {
    const originalTodo = updateOptions.original;
    const oldRecurrenceId = originalTodo?.recurrence?.id;
    
    // If we don't have an original recurrence ID, we can't find the chain. 
    // Just perform a normal update.
    if (!oldRecurrenceId) {
        setUpdateOptions({ isOpen: false, original: null, updated: null });
        await handleUpdateTodo(updatedTodo); // Fallback to normal update
        return;
    }
    
    setUpdateOptions({ isOpen: false, original: null, updated: null });

    // 1. Delete ALL future tasks belonging to the OLD chain
    // We use the updated task's due date as the starting point for deletion.
    const deleteFromDate = updatedTodo.due_date || new Date().toISOString().split('T')[0];
    const idsToDelete: number[] = [];
    let newAllTodos = JSON.parse(JSON.stringify(allTodos)); // Deep copy

    for (const dateKey in newAllTodos) {
        if(dateKey >= deleteFromDate) {
            const initialLength = newAllTodos[dateKey].length;
            newAllTodos[dateKey] = newAllTodos[dateKey].filter(t => {
                // Don't delete the task we are currently editing (updatedTodo.id)
                // even if it has the old ID, because we are about to update it.
                if (t.recurrence?.id === oldRecurrenceId && t.id !== updatedTodo.id) {
                    idsToDelete.push(t.id);
                    return false;
                }
                return true;
            });
            
            if (newAllTodos[dateKey].length === 0 && initialLength > 0 && dateKey !== 'undated') {
                delete newAllTodos[dateKey];
            }
        }
    }

    // 2. Update the current task
    let finalUpdatedTodo = { ...updatedTodo };
    const isNowRecurring = finalUpdatedTodo.recurrence && finalUpdatedTodo.recurrence.frequency !== 'none';

    if (isNowRecurring) {
         // Generate a NEW recurrence ID for this new series to separate it from the old chain history.
         // This prevents future edits from accidentally affecting the old chain (or what's left of it).
        const newSeriesId = (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : `rec-${Date.now()}-${Math.random()}`;
        finalUpdatedTodo.recurrence = {
            ...finalUpdatedTodo.recurrence!,
            id: newSeriesId,
            sourceId: finalUpdatedTodo.id
        };
    } else {
        // CRITICAL: Explicitly ensure recurrence is cleared and ID removed if setting to None.
        // We set it to a clean object to avoid any lingering IDs.
        finalUpdatedTodo.recurrence = { frequency: 'none' }; 
    }

    // Update local state with the modified current task
    newAllTodos = getUpdatedTodosState(newAllTodos, finalUpdatedTodo);
    setAllTodos(newAllTodos);
    
    // 3. Perform DB Operations
    if (idsToDelete.length > 0) {
        await syncableDeleteMultiple('todos', idsToDelete);
    }
    
    // Save the updated task (which now has either a NEW ID or NO ID)
    const savedTodo = await syncableUpdate('todos', finalUpdatedTodo);
    
    // 4. Generate NEW future tasks if applicable
    if (isNowRecurring) {
        const newRecurringTodos = await generateRecurringTasks(savedTodo);
        setAllTodos(current => {
            const newState = { ...current };
            newRecurringTodos.forEach(newTodo => {
                const dateKey = newTodo.due_date!;
                if (!newState[dateKey]) newState[dateKey] = [];
                newState[dateKey].push(newTodo);
            });
            return newState;
        });
    }
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
        const newRecurringTodos = await generateRecurringTasks(updatedTodo);
        newRecurringTodos.forEach(newTodo => {
            const dateKey = newTodo.due_date!;
            if (!nextState[dateKey]) nextState[dateKey] = [];
            nextState[dateKey].push(newTodo);
        });
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
        setSingleTaskToDelete(todoToDelete);
    }
  };

  const handleDeleteThisOccurrence = async (id: number) => {
    let keyToDeleteFrom: string | null = null;
    let todoToDelete: Todo | null = null;
    for(const key in allTodos) { 
        const found = allTodos[key].find(t => t.id === id);
        if (found) {
            keyToDeleteFrom = key;
            todoToDelete = found;
            break;
        }
    }
    
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

    // Delete associated Notion page if exists and Notion is enabled
    try {
      const notionSet = NotionService.getSettings();
      if (notionSet.enabled && todoToDelete?.notion_page_id) {
        NotionService.deletePage(todoToDelete.notion_page_id);
      }
    } catch (notionErr) {
      console.warn("Auto Notion delete error:", notionErr);
    }
    
    // Sync delete to external calendars
    if (todoToDelete?.gcal_event_id && todoToDelete?.calendar_provider) {
      try {
        if (todoToDelete.calendar_provider === 'google' && googleApiToken && gapiReady) {
            await CalendarSyncService.deleteGoogleEvent(todoToDelete.gcal_event_id, googleApiToken, gcalSettings.calendarId || 'primary');
        } else if (todoToDelete.calendar_provider === 'outlook') {
            const currentOutlook = CalendarSyncService.getAccount('outlook');
            if (currentOutlook && currentOutlook.token) {
                await CalendarSyncService.deleteOutlookEvent(todoToDelete.gcal_event_id, currentOutlook.token);
            }
        }
      } catch (calErr) {
        console.warn("Auto Calendar delete error:", calErr);
      }
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
  
  const handleAddProject = useCallback(async (
      name: string, 
      emoji: string | null, 
      color: string | null, 
      extraData?: Partial<Project>
  ): Promise<Project | null> => {
      if (!user) return null;
      const tempId = -Date.now();
      const userEmail = user.email || 'usuario@local.com';
      const userName = userEmail.split('@')[0];
      const initialMembers: ProjectMember[] = [
        { id: user.id, name: userName, email: userEmail, role: 'owner' }
      ];

      const newProject: Project = { 
        id: tempId, 
        name, 
        user_id: user.id, 
        owner_email: userEmail,
        owner_name: userName,
        members: initialMembers,
        created_at: new Date().toISOString(), 
        emoji, 
        color,
        status: extraData?.status || 'active',
        priority: extraData?.priority || 'medium',
        description: extraData?.description || null,
        start_date: extraData?.start_date || null,
        target_date: extraData?.target_date || null,
        lead: extraData?.lead || null,
        ...extraData
      };
      
      setProjects(p => [...p, newProject]);
      
      const savedProject = await syncableCreate('projects', newProject) as Project;
      
      if (savedProject.id !== tempId) {
          setProjects(p => p.map(project => project.id === tempId ? savedProject : project));
      }
      return savedProject;
  }, [user]);

  const handleUpdateProject = async (projectId: number, updates: Partial<Project>) => {
      const projectToUpdate = projects.find(p => p.id === projectId);
      if(!projectToUpdate) return;
      const updatedProject = { ...projectToUpdate, ...updates };
      setProjects(p => p.map(project => project.id === projectId ? updatedProject : project));
      
      const savedProject = await syncableUpdate('projects', updatedProject);
      if (savedProject) {
        setProjects(p => p.map(project => project.id === projectId ? (savedProject as Project) : project));
      }
  };

  const handleArchiveProject = async (projectId: number, isArchived: boolean) => {
      const projectToUpdate = projects.find(p => p.id === projectId);
      if(!projectToUpdate) return;
      const updatedProject = { ...projectToUpdate, is_archived: isArchived };

      setProjects(p => p.map(project => project.id === projectId ? updatedProject : project));
      
      // Use syncableUpdate which handles both online and offline scenarios
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

  const handleSendInvitation = useCallback(async (project: Project, receiverEmail: string) => {
    if (!user?.email) return;

    const cleanReceiver = receiverEmail.trim().toLowerCase();

    const newInvitation: ProjectInvitation = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      project_id: project.id,
      project_name: project.name,
      project_emoji: project.emoji || '📁',
      sender_id: user.id,
      sender_email: user.email,
      inviter_id: user.id,
      inviter_email: user.email,
      inviter_name: user.email.split('@')[0],
      receiver_email: cleanReceiver,
      invitee_email: cleanReceiver,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setProjectInvitations(prev => {
      const updated = [newInvitation, ...prev.filter(i => !(i.project_id === project.id && (i.receiver_email === cleanReceiver || i.invitee_email === cleanReceiver)))];
      localStorage.setItem(`invitations_${user.email}`, JSON.stringify(updated));
      return updated;
    });

    try {
      const { error } = await supabase.from('project_invitations').insert([{
        id: newInvitation.id,
        project_id: newInvitation.project_id,
        project_name: newInvitation.project_name,
        project_emoji: newInvitation.project_emoji,
        sender_id: newInvitation.sender_id,
        sender_email: newInvitation.sender_email,
        inviter_id: newInvitation.inviter_id,
        inviter_email: newInvitation.inviter_email,
        inviter_name: newInvitation.inviter_name,
        receiver_email: newInvitation.receiver_email,
        invitee_email: newInvitation.invitee_email,
        status: newInvitation.status,
        created_at: newInvitation.created_at
      }]);
      if (error) console.log('Supabase insert invitation notice:', error.message);
    } catch (err) {
      console.error('Error inserting invitation:', err);
    }

    try {
      await supabase.functions.invoke('onesignal-notification', {
        body: {
          receiver_email: cleanReceiver,
          title: '¡Nueva invitación a proyecto!',
          message: `${user.email} te ha invitado a colaborar en "${project.name}".`
        }
      });
    } catch (err) {
      console.log('Push notification invocation note:', err);
    }
  }, [user]);

  const handleAcceptInvitation = useCallback(async (invitationId: string) => {
    const invitation = projectInvitations.find(i => i.id === invitationId);
    if (!invitation || !user?.email) return;

    setProjectInvitations(prev => {
      const updated = prev.map(inv => inv.id === invitationId ? { ...inv, status: 'accepted' as const } : inv);
      localStorage.setItem(`invitations_${user.email}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await supabase.from('project_invitations').update({ status: 'accepted' }).eq('id', invitationId);
    } catch (err) {
      console.log('Supabase invitation accept update notice:', err);
    }

    const projectToUpdate = projects.find(p => p.id === invitation.project_id);
    const ownerEmail = invitation.inviter_email || invitation.sender_email;
    const ownerName = invitation.inviter_name || (ownerEmail ? ownerEmail.split('@')[0] : 'Creador');

    if (projectToUpdate) {
      const currentMembers = projectToUpdate.members || [];
      const updatedMembers: ProjectMember[] = [];
      const projOwnerEmail = projectToUpdate.owner_email || ownerEmail;
      const projOwnerName = projectToUpdate.owner_name || ownerName;

      // 1. Ensure creator/owner is at the top
      if (projOwnerEmail) {
        updatedMembers.push({ id: 'owner', name: projOwnerName || projOwnerEmail.split('@')[0], email: projOwnerEmail, role: 'owner' });
      }

      // 2. Add existing members (filtering out owner duplicate)
      currentMembers.forEach((m: any) => {
        const mEmail = typeof m === 'string' ? m : m.email;
        if (mEmail && (!projOwnerEmail || mEmail.toLowerCase() !== projOwnerEmail.toLowerCase())) {
          if (typeof m === 'string') {
            updatedMembers.push({ id: m, name: m.split('@')[0], email: m, role: 'member' });
          } else {
            updatedMembers.push(m);
          }
        }
      });

      // 3. Add accepting user as member if not present
      if (!updatedMembers.some(m => m.email?.toLowerCase() === user.email.toLowerCase())) {
        updatedMembers.push({ id: user.id, name: user.email.split('@')[0], email: user.email, role: 'member' });
      }

      await handleUpdateProject(projectToUpdate.id, { 
        members: updatedMembers,
        owner_email: projOwnerEmail || null,
        owner_name: projOwnerName || null
      });
    } else {
      try {
        const { data: remoteProj } = await supabase.from('projects').select('*').eq('id', invitation.project_id).maybeSingle();
        if (remoteProj) {
          const rawMembers = remoteProj.members || [];
          const updatedMembers: ProjectMember[] = [];
          const projOwnerEmail = remoteProj.owner_email || ownerEmail;
          const projOwnerName = remoteProj.owner_name || ownerName;

          // 1. Ensure owner is at top
          if (projOwnerEmail) {
            updatedMembers.push({ id: 'owner', name: projOwnerName || projOwnerEmail.split('@')[0], email: projOwnerEmail, role: 'owner' });
          }

          // 2. Add existing members
          rawMembers.forEach((m: any) => {
            const mEmail = typeof m === 'string' ? m : m.email;
            if (mEmail && (!projOwnerEmail || mEmail.toLowerCase() !== projOwnerEmail.toLowerCase())) {
              if (typeof m === 'string') {
                updatedMembers.push({ id: m, name: m.split('@')[0], email: m, role: 'member' });
              } else {
                updatedMembers.push(m);
              }
            }
          });

          // 3. Add current accepting user
          if (!updatedMembers.some(m => m.email?.toLowerCase() === user.email.toLowerCase())) {
            updatedMembers.push({ id: user.id, name: user.email.split('@')[0], email: user.email, role: 'member' });
          }

          const updatedProjectData: Project = { 
            ...remoteProj, 
            owner_email: projOwnerEmail || null,
            owner_name: projOwnerName || null,
            members: updatedMembers 
          };

          await syncableUpdate('projects', updatedProjectData);
          setProjects(prev => [...prev.filter(p => p.id !== remoteProj.id), updatedProjectData]);
        }
      } catch (err) {
        console.log('Error updating project members on accept:', err);
      }
    }
  }, [projectInvitations, user, projects, handleUpdateProject]);

  const handleDeclineInvitation = useCallback(async (invitationId: string) => {
    if (!user?.email) return;

    setProjectInvitations(prev => {
      const updated = prev.map(inv => inv.id === invitationId ? { ...inv, status: 'rejected' as const } : inv);
      localStorage.setItem(`invitations_${user.email}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await supabase.from('project_invitations').update({ status: 'rejected' }).eq('id', invitationId);
    } catch (err) {
      console.log('Supabase invitation decline update notice:', err);
    }
  }, [user]);

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
  
  // --- Habit Handlers ---
  const handleAddHabit = useCallback(async (name: string, emoji: string, frequency: HabitFrequency) => {
    if (!user) return;
    const tempId = -Date.now();
    const newHabit: Habit = { 
        id: tempId, 
        name, 
        emoji, 
        frequency,
        user_id: user.id, 
        created_at: new Date().toISOString()
    };
    setHabits(h => [...h, newHabit]);
    const payloadForDb = { ...newHabit, frequency: JSON.stringify(frequency) };
    const savedHabit = await syncableCreate('habits', payloadForDb) as any;
    if (savedHabit.id !== tempId) {
        const parsedSavedHabit: Habit = { ...savedHabit, frequency: JSON.parse(savedHabit.frequency) };
        setHabits(h => h.map(item => item.id === tempId ? parsedSavedHabit : item));
    }
  }, [user]);

  const handleUpdateHabit = async (habitId: number, name: string, emoji: string | null, frequency: HabitFrequency) => {
      const habitToUpdate = habits.find(h => h.id === habitId);
      if(!habitToUpdate) return;
      const updatedHabit: Habit = { ...habitToUpdate, name, emoji, frequency };

      setHabits(h => h.map(habit => habit.id === habitId ? updatedHabit : habit));
      const payloadForDb = { ...updatedHabit, frequency: JSON.stringify(frequency) };
      const savedHabit = await syncableUpdate('habits', payloadForDb) as any;
      const parsedSavedHabit: Habit = { ...savedHabit, frequency: JSON.parse(savedHabit.frequency) };
      setHabits(h => h.map(habit => habit.id === habitId ? parsedSavedHabit : habit));
  };

  const handleDeleteHabit = async (habitId: number) => {
    setHabits(h => h.filter(item => item.id !== habitId));
    setHabitRecords(hr => hr.filter(r => r.habit_id !== habitId));
    await syncableDelete('habits', habitId);
  };

  const handleToggleHabitRecord = async (habitId: number, date: string) => {
    if(!user) return;
    const recordKey = `${habitId}-${date}`;
    if (processingHabitRecord === recordKey) {
        return; // Prevent rapid-fire clicks
    }
    setProcessingHabitRecord(recordKey);

    try {
        const existingRecord = habitRecords.find(r => r.habit_id === habitId && r.completed_at === date);
        if(existingRecord) {
            // Delete it
            setHabitRecords(r => r.filter(item => item.id !== existingRecord.id));
            await syncableDelete('habit_records', existingRecord.id);
        } else {
            // Create it
            const tempId = -Date.now();
            const newRecord: HabitRecord = {
                id: tempId,
                habit_id: habitId,
                completed_at: date,
                user_id: user.id
            };
            setHabitRecords(r => [...r, newRecord]);
            const savedRecord = await syncableCreate('habit_records', newRecord) as HabitRecord;
            if (savedRecord.id !== tempId) {
                setHabitRecords(r => r.map(item => item.id === tempId ? savedRecord : item));
            }
        }
    } finally {
        setProcessingHabitRecord(null);
    }
  };

  const handleOpenHabitCreator = () => {
    setHabitToEdit(null);
    setIsHabitEditorOpen(true);
  };

  const handleOpenHabitEditor = (habit: Habit) => {
    setHabitToEdit(habit);
    setIsHabitEditorOpen(true);
  };
  
  const handleSaveHabit = (name: string, emoji: string, frequency: HabitFrequency) => {
      if (habitToEdit) {
          handleUpdateHabit(habitToEdit.id, name, emoji, frequency);
      } else {
          handleAddHabit(name, emoji, frequency);
      }
      setIsHabitEditorOpen(false);
      setHabitToEdit(null);
  };

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

  // --- Notion Bidirectional Sync ---
  const handleSyncNotion = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const settings = NotionService.getSettings();
      if (!settings.enabled || !settings.token || !settings.databaseId) {
        return { success: false, message: 'La integración con Notion no está activa o configurada.' };
      }

      // 1. Fetch current database pages from Notion
      const notionPages = await NotionService.fetchDatabasePages();

      // 2. Fetch all local todos
      const localTodos = await getAll<Todo>('todos');

      let importedCount = 0;
      let updatedLocalCount = 0;
      let exportedCount = 0;

      // Step A: Compare Notion pages with local todos
      for (const page of notionPages) {
        const matchingLocal = localTodos.find(t => t.notion_page_id === page.id);

        if (matchingLocal) {
          // Compare properties
          const needsLocalUpdate = 
            matchingLocal.text !== page.title ||
            matchingLocal.completed !== page.completed ||
            matchingLocal.priority !== page.priority ||
            matchingLocal.due_date !== page.dueDate;

          if (needsLocalUpdate) {
            const updatedLocal: Todo = {
              ...matchingLocal,
              text: page.title,
              completed: page.completed,
              priority: page.priority,
              due_date: page.dueDate,
            };
            await syncableUpdate('todos', updatedLocal);
            updatedLocalCount++;
          }
        } else {
          // Check for matching title to avoid duplicates
          const duplicateLocal = localTodos.find(t => t.text === page.title && !t.notion_page_id);
          if (duplicateLocal) {
            const updatedLocal: Todo = {
              ...duplicateLocal,
              notion_page_id: page.id,
              notion_url: page.url,
              completed: page.completed,
              priority: page.priority,
              due_date: page.dueDate,
            };
            await syncableUpdate('todos', updatedLocal);
            updatedLocalCount++;
          } else {
            // Import new task from Notion!
            const newTodo: Todo = {
              id: -Date.now() - Math.floor(Math.random() * 1000000),
              text: page.title,
              completed: page.completed,
              priority: page.priority,
              due_date: page.dueDate,
              user_id: user?.id || 'default',
              created_at: new Date().toISOString(),
              subtasks: [],
              notion_page_id: page.id,
              notion_url: page.url,
            };
            await syncableCreate('todos', newTodo);
            importedCount++;
          }
        }
      }

      // Step B: Export local tasks that are enabled for autoSync and don't have page id
      for (const localTodo of localTodos) {
        if (!localTodo.notion_page_id && settings.autoSync) {
          const res = await NotionService.insertPage(localTodo);
          if (res) {
            const updatedLocal: Todo = {
              ...localTodo,
              notion_page_id: res.id,
              notion_url: res.url,
            };
            await syncableUpdate('todos', updatedLocal);
            exportedCount++;
          }
        }
      }

      // Reload local todos state
      const updatedTodosList = await getAll<Todo>('todos');
      const todosByDate: { [key: string]: Todo[] } = {};
      const undatedTodos: Todo[] = [];
      updatedTodosList.forEach(todo => {
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

      return {
        success: true,
        message: `Sincronización con Notion exitosa. Importadas: ${importedCount}, Actualizadas: ${updatedLocalCount}, Exportadas: ${exportedCount}.`,
      };
    } catch (err: any) {
      console.error('Error syncing with Notion:', err);
      return { success: false, message: err.message || 'Error desconocido al sincronizar.' };
    }
  }, [user]);
  
  // --- Google Calendar Sync ---
  const handleGCalSettingsChange = useCallback(async (settings: GCalSettings) => {
    if (!user) return;
    setGcalSettings(settings);
    await syncableUpdate('profiles', { id: user.id, gcal_settings: settings });
  }, [user]);

  const loadAndValidateCalendarData = useCallback(async () => {
      if (!googleApiToken || !gapiReady || !isOnline) {
          setUserCalendars([]);
          setCalendarEvents([]);
          return;
      }

      try {
          // 1. Fetch Calendar List
          const calListResponse = await window.gapi.client.calendar.calendarList.list();
          const calendars = calListResponse.result.items || [];
          setUserCalendars(calendars);
          
          if (!gcalSettings.enabled || calendars.length === 0) {
              setCalendarEvents([]);
              return;
          }

          // 2. Validate selected calendar ID
          let calendarIdToUse = gcalSettings.calendarId;
          const selectedCalendarExists = calendars.some(c => c.id === calendarIdToUse);

          if (!selectedCalendarExists) {
              const primary = calendars.find(c => c.primary);
              calendarIdToUse = primary ? primary.id : calendars[0].id;
              // Update settings, which will trigger a re-run of this effect
              handleGCalSettingsChange({ ...gcalSettings, calendarId: calendarIdToUse });
              return; // Exit to avoid fetching with old ID, re-run will handle it
          }

          // 3. Fetch events for the valid calendar
          const today = new Date();
          const timeMin = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
          const timeMax = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString();
          
          const eventsResponse = await window.gapi.client.calendar.events.list({
              calendarId: calendarIdToUse,
              timeMin,
              timeMax,
              showDeleted: false,
              singleEvents: true,
              orderBy: 'startTime',
          });
          setCalendarEvents(eventsResponse.result.items || []);

      } catch (error) {
          console.error("Error with Google Calendar sync:", error);
          const gapiError = error as any;
          if (gapiError?.result?.error?.code === 401) {
              setGoogleApiToken(null);
              if (user) localStorage.removeItem(getUserKey('google_api_token'));
          }
      }
  }, [googleApiToken, gapiReady, isOnline, gcalSettings, handleGCalSettingsChange, user, getUserKey]);

  // This new effect handles all calendar logic
  useEffect(() => {
      loadAndValidateCalendarData();
  }, [loadAndValidateCalendarData]);
  
  const handleRemoveFromCalendar = useCallback(async (todo: Todo) => {
    if (!todo.gcal_event_id || !todo.calendar_provider) return;
    
    try {
      if (todo.calendar_provider === 'google' && googleApiToken && gapiReady) {
        const calId = gcalSettings.calendarId || 'primary';
        await CalendarSyncService.deleteGoogleEvent(todo.gcal_event_id, googleApiToken, calId);
      } else if (todo.calendar_provider === 'outlook' && outlookAccount?.token) {
        await CalendarSyncService.deleteOutlookEvent(todo.gcal_event_id, outlookAccount.token);
      }
      
      const updatedTodo = {
        ...todo,
        gcal_event_id: undefined,
        calendar_event_link: undefined,
        calendar_provider: undefined,
      };
      await syncableUpdate('todos', updatedTodo);
    } catch (e) {
      console.error('Error removing event from calendar:', e);
    }
  }, [googleApiToken, gapiReady, gcalSettings.calendarId, outlookAccount?.token]);

  const handleSyncToCalendar = useCallback(async (todo: Todo, targetProvider?: CalendarProvider) => {
    try {
      const currentOutlook = CalendarSyncService.getAccount('outlook');
      const isGoogleActive = gcalSettings.enabled && !!googleApiToken && !!gapiReady;
      const isOutlookActive = !!(currentOutlook && currentOutlook.token);

      const providerToUse = targetProvider || (isGoogleActive ? 'google' : isOutlookActive ? 'outlook' : null);

      if (providerToUse === 'google' && isGoogleActive) {
        const calId = gcalSettings.calendarId || 'primary';
        const calResult = await CalendarSyncService.insertGoogleEvent(todo, googleApiToken!, calId);
        if (calResult && calResult.id) {
          const updatedTodo = {
            ...todo,
            gcal_event_id: calResult.id,
            calendar_event_link: calResult.htmlLink,
            calendar_provider: 'google' as CalendarProvider,
          };
          setAllTodos(current => getUpdatedTodosState(current, updatedTodo));
          await syncableUpdate('todos', updatedTodo);
          if (loadAndValidateCalendarData) {
            await loadAndValidateCalendarData();
          }
        }
      } else if (providerToUse === 'outlook' && isOutlookActive && currentOutlook) {
        const calId = currentOutlook.selectedCalendarId || 'primary';
        const calResult = await CalendarSyncService.insertOutlookEvent(todo, currentOutlook.token, calId);
        if (calResult && calResult.id) {
          const updatedTodo = {
            ...todo,
            gcal_event_id: calResult.id,
            calendar_event_link: calResult.htmlLink,
            calendar_provider: 'outlook' as CalendarProvider,
          };
          setAllTodos(current => getUpdatedTodosState(current, updatedTodo));
          await syncableUpdate('todos', updatedTodo);
          if (loadAndValidateCalendarData) {
            await loadAndValidateCalendarData();
          }
        }
      }
    } catch (e) {
      console.error('Error syncing event to calendar:', e);
    }
  }, [googleApiToken, gapiReady, gcalSettings.enabled, gcalSettings.calendarId, loadAndValidateCalendarData]);

  // --- Supabase Backgrounds Logic ---
  const loadBackgroundsFromSupabase = useCallback(async () => {
    if (!user) return;
    setBackgroundsAreLoading(true);
    try {
        const isUserUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id);
        if (!isUserUuid || user.id === '00000000-0000-0000-0000-000000000001') {
            const cached = localStorage.getItem(`pollito_cached_backgrounds_${user.id}`);
            if (cached) {
                setUserBackgrounds(JSON.parse(cached));
            } else {
                setUserBackgrounds([]);
            }
            return;
        }

        const { data: backgroundMeta, error } = await supabase
            .from('user_backgrounds')
            .select('*')
            .eq('user_id', user.id);
        if (error) throw error;
        
        const backgrounds: Background[] = (backgroundMeta || []).map(meta => {
            const { data: { publicUrl } } = supabase.storage.from('fondos').getPublicUrl(meta.path);
            return { ...meta, url: publicUrl };
        });

        setUserBackgrounds(backgrounds);
        try {
          localStorage.setItem(`pollito_cached_backgrounds_${user.id}`, JSON.stringify(backgrounds));
        } catch (e) {
          console.warn('Failed to save backgrounds to localStorage:', e);
        }

    } catch (error) {
        console.error("Error loading backgrounds from Supabase:", error);
        try {
          const cached = localStorage.getItem(`pollito_cached_backgrounds_${user.id}`);
          if (cached) {
            setUserBackgrounds(JSON.parse(cached));
          }
        } catch (e) {
          console.error("Failed to parse cached backgrounds:", e);
        }
    } finally {
        setBackgroundsAreLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      try {
        const cached = localStorage.getItem(`pollito_cached_backgrounds_${user.id}`);
        if (cached) {
          setUserBackgrounds(JSON.parse(cached));
        }
      } catch (e) {
        console.warn('Failed to read backgrounds from localStorage:', e);
      }
    } else {
      setUserBackgrounds([]);
    }
  }, [user]);

  useEffect(() => {
    if (user && isOnline) {
      loadBackgroundsFromSupabase();
    }
  }, [user, isOnline, loadBackgroundsFromSupabase]);
  
  const activeBackground = useMemo(() => {
    // 1. Direct URL check from uiSettings (Unsplash or custom URL)
    if (uiSettings?.activeBackgroundUrl) {
      const bgObj: Background = {
        id: uiSettings.activeBackgroundId || 'unsplash_bg',
        user_id: user?.id || 'guest',
        name: uiSettings.activeBackgroundName || 'Fondo',
        path: '',
        url: uiSettings.activeBackgroundUrl,
        type: (uiSettings.activeBackgroundType || 'image') as 'image' | 'video',
        is_favorite: false
      };
      try {
        localStorage.setItem(`pollito_selected_bg_${user?.id || 'guest'}`, JSON.stringify(bgObj));
      } catch (e) {}
      return bgObj;
    }

    if (!uiSettings?.activeBackgroundId) {
      // Check cached background fallback
      try {
        const cached = localStorage.getItem(`pollito_selected_bg_${user?.id || 'guest'}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.url) {
            return parsed;
          }
        }
      } catch (e) {}
      return null;
    }

    // 2. Search in user's custom backgrounds array
    const bgFromList = userBackgrounds.find(bg => String(bg.id) === String(uiSettings.activeBackgroundId));
    if (bgFromList) {
      try {
        localStorage.setItem(`pollito_selected_bg_${user?.id || 'guest'}`, JSON.stringify(bgFromList));
      } catch (e) {}
      return bgFromList;
    }

    // 3. Fallback to cached active background
    try {
      const cached = localStorage.getItem(`pollito_selected_bg_${user?.id || 'guest'}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (String(parsed.id) === String(uiSettings.activeBackgroundId) || parsed.url)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  }, [
    uiSettings?.activeBackgroundId,
    uiSettings?.activeBackgroundUrl,
    uiSettings?.activeBackgroundName,
    uiSettings?.activeBackgroundType,
    userBackgrounds,
    user?.id
  ]);

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
  

  const handleAddBackground = async (file: File) => {
    if (!user) return;
    if (userBackgrounds.length >= 3) {
      alert("Has alcanzado el límite de 3 fondos propios. Por favor, elimina uno para subir otro nuevo.");
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
             setUiSettings((s: any) => s ? { ...s, activeBackgroundId: null } : null);
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
  
  // --- UI Settings Handlers & Media Playback ---
  const handleThemeColorChange = useCallback((colorName: keyof ThemeColors, value: string) => {
    setUiSettings((prev: any) => prev ? { ...prev, themeColors: { ...prev.themeColors, [colorName]: value } } : null);
  }, []);

  const handleResetThemeColors = useCallback(() => {
    setUiSettings((prev: any) => prev ? { ...prev, themeColors: DEFAULT_COLORS } : null);
  }, []);

  const handleMediaPlay = useCallback((el: HTMLMediaElement | null) => {
    if (el) {
        el.load();
        const playPromise = el.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                if (error.name === "NotAllowedError") {
                    console.warn("Autoplay was prevented. User must interact with the page first.");
                } else {
                    console.error("Media play failed:", error);
                }
            });
        }
    }
  }, []);
  
  // Refined effect to handle media playback
  useEffect(() => {
      const videoEl = videoRef.current;
      const audioEl = ambientAudioRef.current;
      
      if (videoEl) {
          const isVideoActive = (activeBackground?.type === 'video' || (activeBackground?.url && (activeBackground.url.endsWith('.mp4') || activeBackground.url.endsWith('.webm')))) && !isPowerSavingActive;
          const newSrc = isVideoActive ? (activeBackground?.url || '') : '';
          
          if (videoEl.src !== newSrc) {
              videoEl.src = newSrc;
              if (isVideoActive) {
                  handleMediaPlay(videoEl);
              } else {
                  videoEl.pause();
              }
          }
      }

      if (audioEl) {
          const soundMap: Record<string, string | null> = {
              'none': null, 
              'rain': rainSoundSrc, 
              'forest': forestSoundSrc, 
              'coffee_shop': coffeeShopSrc, 
              'coffee': coffeeShopSrc, 
              'ocean': oceanSoundSrc, 
              'waves': oceanSoundSrc,
          };
          const soundType = uiSettings?.ambientSound?.type || 'none';
          const newSrc = soundMap[soundType];
          
          audioEl.loop = true;
          audioEl.volume = uiSettings?.ambientSound?.volume ?? 0.5;

          if (newSrc) {
              if (audioEl.src !== newSrc) {
                  audioEl.src = newSrc;
                  handleMediaPlay(audioEl);
              } else if (audioEl.paused) {
                  handleMediaPlay(audioEl);
              }
          } else {
              audioEl.pause();
              audioEl.src = '';
          }
      }
  }, [activeBackground, uiSettings?.ambientSound, handleMediaPlay, isPowerSavingActive]);


  // --- OneSignal / Notifications ---
  const oneSignalInitializedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !ONE_SIGNAL_APP_ID) {
        return;
    }

    const onPermissionChange = (newPermissionStatus: 'granted' | 'denied' | 'default') => {
        setIsPermissionBlocked(newPermissionStatus === 'denied');
    };

    const onSubscriptionChange = (subscriptionState: { current: { optedIn: boolean } }) => {
        setIsSubscribed(!!subscriptionState?.current?.optedIn);
    };

    const initializeOneSignal = async () => {
        try {
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            window.OneSignalDeferred.push(async function(OneSignal: any) {
                if (!OneSignal) return;

                if (!oneSignalInitializedRef.current) {
                    try {
                        await OneSignal.init({
                            appId: ONE_SIGNAL_APP_ID,
                            allowLocalhostAsSecureOrigin: true,
                            autoRegister: false,
                            notifyButton: { enable: false },
                            serviceWorkerParam: { scope: '/' },
                            serviceWorkerPath: 'sw.js',
                        });
                        oneSignalInitializedRef.current = true;
                    } catch (initErr: any) {
                        // Ignore already initialized or already subscribed notices
                        console.debug("OneSignal init status:", initErr?.message || initErr);
                    }
                }

                try {
                    if (user?.id) {
                        await OneSignal.login(user.id);
                    }
                } catch (loginErr: any) {
                    console.debug("OneSignal login status:", loginErr?.message || loginErr);
                }
                
                // Initial state check safely
                if (OneSignal.Notifications) {
                    setIsPermissionBlocked(OneSignal.Notifications.permission === 'denied');
                    OneSignal.Notifications.removeEventListener('permissionChange', onPermissionChange);
                    OneSignal.Notifications.addEventListener('permissionChange', onPermissionChange);
                }

                if (OneSignal.User?.PushSubscription) {
                    setIsSubscribed(Boolean(OneSignal.User.PushSubscription.optedIn));
                    OneSignal.User.PushSubscription.removeEventListener('change', onSubscriptionChange);
                    OneSignal.User.PushSubscription.addEventListener('change', onSubscriptionChange);
                }
            });
        } catch (err) {
            console.debug("OneSignal setup notice:", err);
        }
    };

    initializeOneSignal();

    // Sync tags on initial load if user has pushPreferences
    if (uiSettings?.pushPreferences) {
        syncPreferencesToOneSignal(uiSettings.pushPreferences);
    }

    // Cleanup listeners when the user changes or component unmounts
    return () => {
        try {
            if (window.OneSignal?.Notifications && window.OneSignal?.User?.PushSubscription) {
                window.OneSignal.Notifications.removeEventListener('permissionChange', onPermissionChange);
                window.OneSignal.User.PushSubscription.removeEventListener('change', onSubscriptionChange);
            }
        } catch (e) {}
    };
}, [user?.id]);

  const handleUpdatePushPreferences = useCallback(async (newPrefs: PushNotificationPreferences) => {
      setUiSettings((prev: any) => {
          const updated = { ...(prev || {}), pushPreferences: newPrefs };
          if (user) {
              localStorage.setItem(getUserKey('ui_settings'), JSON.stringify(updated));
              supabase.from('profiles').update({ ui_settings: updated }).eq('id', user.id).then(({ error }) => {
                  if (error) console.error("Error saving push preferences to profiles:", error);
              });
          }
          return updated;
      });
      await syncPreferencesToOneSignal(newPrefs);
  }, [user, getUserKey]);

  const handleToggleSubscription = useCallback(async () => {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return;

      if (isPermissionBlocked) {
          alert('Las notificaciones están bloqueadas en la configuración de tu navegador. Por favor, habilítalas para esta página.');
          return;
      }

      try {
          if (isSubscribed) {
              if (OneSignal.User?.PushSubscription?.optOut) {
                  await OneSignal.User.PushSubscription.optOut();
                  setIsSubscribed(false);
              }
          } else {
              if (OneSignal.User?.PushSubscription?.optIn) {
                  await OneSignal.User.PushSubscription.optIn();
                  setIsSubscribed(true);
                  if (uiSettings?.pushPreferences) {
                      await syncPreferencesToOneSignal(uiSettings.pushPreferences);
                  }
              }
          }
      } catch (e) {
          console.error("Error toggling OneSignal subscription:", e);
      }
  }, [isPermissionBlocked, isSubscribed, uiSettings?.pushPreferences]);

  const handleNotificationAction = async (eventType?: NotificationEventType) => {
      const OneSignal = window.OneSignal;
      if (!OneSignal) return;

      if (isPermissionBlocked) {
          alert('Las notificaciones están bloqueadas en la configuración de tu navegador. Por favor, habilítalas para esta página.');
          return;
      }
      
      if (isSubscribed) {
          if (eventType) {
              const res = await sendSampleNotificationForEvent(eventType, uiSettings?.pushPreferences);
              if (!res.sent && res.reason === 'disabled_by_user') {
                  alert(`Las notificaciones para este evento están desactivadas en tus preferencias.`);
              }
          } else {
              // Send general test notification
              supabase.functions.invoke('send-pushalert-notification', {
                body: {
                  title: "¡Notificación de Prueba! 🐣",
                  message: "¡Tus notificaciones push de Pollito To-Do están funcionando correctamente!",
                },
              }).then(({ error }) => {
                  if (error) {
                      console.error("Error sending test notification:", error);
                      alert("Error al enviar la notificación de prueba.");
                  }
              });
          }
      } else {
          // This will trigger the native browser prompt.
          await OneSignal.User.PushSubscription.optIn();
      }
  };

  // Background task reminder notification ticker
  const notifiedTaskIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
      if (!isSubscribed || !flatAllTodos || flatAllTodos.length === 0) return;
      if (uiSettings?.pushPreferences?.taskReminders === false) return;

      const checkTaskReminders = () => {
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth() + 1;
          const currentDay = now.getDate();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          flatAllTodos.forEach((todo: Todo) => {
              if (todo.completed) return;
              if (!todo.reminder_time && !todo.due_date) return;

              const reminderKey = `${todo.id}_${todo.reminder_time || ''}_${todo.due_date?.day || ''}`;
              if (notifiedTaskIdsRef.current.has(reminderKey)) return;

              if (todo.reminder_time) {
                  const [rHour, rMinute] = todo.reminder_time.split(':').map(Number);
                  const isToday = !todo.due_date || (
                      todo.due_date.year === currentYear &&
                      todo.due_date.month === currentMonth &&
                      todo.due_date.day === currentDay
                  );

                  if (isToday && rHour === currentHour && Math.abs(rMinute - currentMinute) <= 1) {
                      notifiedTaskIdsRef.current.add(reminderKey);
                      sendPushNotification({
                          title: `⏰ Recordatorio de tarea`,
                          message: `Es hora de: "${todo.text}"`,
                          eventType: 'taskReminders'
                      }, uiSettings?.pushPreferences);
                  }
              }
          });
      };

      const interval = setInterval(checkTaskReminders, 30000);
      return () => clearInterval(interval);
  }, [flatAllTodos, isSubscribed, uiSettings?.pushPreferences]);
  
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
    return <Login />;
  }
  
  const appProps: AppComponentProps = {
    isOnline, isSyncing, currentUser: user, onLogout: () => setIsLogoutConfirmOpen(true), 
    theme, toggleTheme, themeColors: uiSettings.themeColors, onThemeColorChange: handleThemeColorChange, onResetThemeColors: handleResetThemeColors,
    allTodos, folders: foldersWithNotes, projects, habits, habitRecords, userBackgrounds, playlists, quickNotes, browserSession, selectedDate,
    pomodoroState, activeBackground, particleType: uiSettings.particleType, ambientSound: uiSettings.ambientSound, 
    uiSettings,
    activeTrack, activeSpotifyTrack, 
    handleAddTodo, handleUpdateTodo, handleToggleTodo, handleToggleSubtask, handleDeleteTodo, onClearPastTodos: () => setIsClearPastConfirmOpen(true),
    handleAddFolder, handleUpdateFolder, handleDeleteFolder, handleAddNote, handleUpdateNote, handleDeleteNote,
    handleAddProject, handleUpdateProject, handleDeleteProject, handleDeleteProjectAndTasks,
    handleArchiveProject,
    handleAddHabit, handleUpdateHabit, handleDeleteHabit, handleToggleHabitRecord, onOpenHabitCreator: handleOpenHabitCreator, onOpenHabitEditor: handleOpenHabitEditor,
    handleAddPlaylist, handleUpdatePlaylist, handleDeletePlaylist,
    handleAddQuickNote, handleDeleteQuickNote, handleClearAllQuickNotes,
    setBrowserSession, setSelectedDate, setPomodoroState, setUiSettings,
    setActiveTrack, setActiveSpotifyTrack,
    googleApiToken, backgroundsAreLoading, handleAuthClick,
    onConnectOutlook: handleConnectOutlook, onDisconnectOutlook: handleDisconnectOutlook, outlookAccount,
    handleAddBackground, handleDeleteBackground,
    handleToggleFavoriteBackground, gapiReady,
    isSubscribed, isPermissionBlocked, handleNotificationAction,
    pushPreferences: uiSettings?.pushPreferences || DEFAULT_PUSH_PREFERENCES,
    onUpdatePushPreferences: handleUpdatePushPreferences,
    onToggleSubscription: handleToggleSubscription,
    gcalSettings, onGCalSettingsChange: handleGCalSettingsChange, userCalendars, calendarEvents,
    loadAndValidateCalendarData, onRemoveFromCalendar: handleRemoveFromCalendar, onSyncToCalendar: handleSyncToCalendar,
    onSyncNotion: handleSyncNotion,
    isPowerSavingActive,
    batteryStatus,
    focusSessions,
    onLogFocusSession: handleLogFocusSession,
    projectInvitations,
    onSendInvitation: handleSendInvitation,
    onAcceptInvitation: handleAcceptInvitation,
    onDeclineInvitation: handleDeclineInvitation
  };

  return (
    <>
      {/* Default background (underneath everything) */}
      <div className="absolute top-0 left-0 w-full h-full bg-gray-50 dark:bg-gray-950 -z-30"/>
      
      {/* Image background (overlays default) */}
      <div 
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center -z-20 transition-opacity duration-500"
          style={{ 
              backgroundImage: `url(${(activeBackground?.type === 'image' || (!activeBackground?.type && activeBackground?.url && !activeBackground.url.includes('youtube.com') && !activeBackground.url.endsWith('.mp4'))) ? activeBackground.url : ''})`,
              opacity: (activeBackground?.type === 'image' || (!activeBackground?.type && activeBackground?.url && !activeBackground.url.includes('youtube.com') && !activeBackground.url.endsWith('.mp4'))) ? 1 : 0
          }}
      />

      {/* YouTube Video Background */}
      {(() => {
        const url = activeBackground?.url || '';
        const isYt = activeBackground?.type === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be');
        if (isYt && !isPowerSavingActive) {
          const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
          if (match && match[1]) {
            const videoId = match[1];
            const ytEmbedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&disablekb=1&fs=0&autohide=1&loop=1&playlist=${videoId}&playsinline=1&enablejsapi=1`;
            return (
              <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none transition-opacity duration-500 bg-black">
                <iframe
                  src={ytEmbedUrl}
                  title="Fondo Animado YouTube"
                  className="absolute w-[250%] h-[250%] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none border-0 aspect-video object-cover"
                  allow="autoplay; encrypted-media"
                />
              </div>
            );
          }
        }
        return null;
      })()}

      {/* MP4/WebM Video background (persistent in DOM, overlays default) */}
      <video 
          ref={videoRef} 
          loop 
          muted 
          playsInline 
          className="absolute top-0 left-0 w-full h-full object-cover -z-20 transition-opacity duration-500"
          style={{ 
              opacity: ((activeBackground?.type === 'video' || (activeBackground?.url && (activeBackground.url.endsWith('.mp4') || activeBackground.url.endsWith('.webm')))) && !isPowerSavingActive) ? 1 : 0,
              pointerEvents: 'none'
          }}
      />
      
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
      <ConfirmationModal
        isOpen={!!singleTaskToDelete}
        onClose={() => setSingleTaskToDelete(null)}
        onConfirm={() => {
          if (singleTaskToDelete) {
            handleDeleteThisOccurrence(singleTaskToDelete.id);
            setSingleTaskToDelete(null);
          }
        }}
        title="Eliminar Tarea"
        message={singleTaskToDelete ? `¿Seguro que deseas eliminar la tarea "${singleTaskToDelete.text}"?` : ''}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
      <ConfirmationModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          handleLogout();
        }}
        title="Cerrar sesión"
        message="¿Estás seguro de que deseas cerrar sesión en Pollito Productivo?"
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
      />
      <HabitEditorPanel 
        isOpen={isHabitEditorOpen}
        onClose={() => { setIsHabitEditorOpen(false); setHabitToEdit(null); }}
        onSave={handleSaveHabit}
        habitToEdit={habitToEdit}
      />
      <audio ref={ambientAudioRef} />
    </>
  );
};

export default App;
