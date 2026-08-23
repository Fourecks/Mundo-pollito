import { GenerateContentResponse } from '@google/genai';

export interface WindowState {
  pos: { x: number; y: number };
  size: { width: number; height: number };
}

export type Priority = 'low' | 'medium' | 'high';

export type WindowType = 'todo' | 'calendar' | 'notes' | 'music' | 'pomodoro' | 'browser' | 'habits' | 'progreso' | 'projects' | 'spotify';

export interface TaskComment {
  id: string;
  author: string;
  text: string;
  created_at: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: 'doc' | 'image' | 'pdf' | 'link' | 'file';
}

export interface Subtask {
  id: number;
  text: string;
  completed: boolean;
}

export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  customDays?: number[]; // For custom frequency, stores selected days (e.g., day of week or day of month)
  id?: string; // A unique ID for a series of recurring tasks
  sourceId?: number; // The ID of the task that generated this one
  ends_on?: string; // An optional end date for the recurrence
}

export interface Todo {
  id: number;
  user_id?: string;
  created_at?: string;
  text: string;
  completed: boolean;
  priority: Priority;
  due_date?: string | null; // Represents the start date of the task
  end_date?: string; // Represents the end date for a multi-day task
  start_time?: string; // e.g., "14:00"
  end_time?: string;   // e.g., "15:30"
  notes?: string;
  subtasks?: Subtask[];
  recurrence?: RecurrenceRule;
  reminder_offset?: 0 | 10 | 30 | 60 | 1440; // In minutes before start_time
  reminder_at?: string; // ISO string for a specific reminder time, e.g., "2024-10-27T09:00:00"
  notification_sent?: boolean;
  project_id?: number | null;
  gcal_event_id?: string | null;
  calendar_provider?: 'google' | 'outlook' | null;
  calendar_event_link?: string | null;
  kanban_column?: string | null;
  notion_page_id?: string | null;
  notion_url?: string | null;
  // Enhanced Project Task Attributes
  story_points?: number | null;
  sprint_id?: string | null;
  milestone_id?: string | null;
  tags?: string[];
  dependencies?: number[]; // IDs of tasks this task is blocked by
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  assignee?: string | null;
}

export interface ProjectMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'lead' | 'member';
  email?: string;
}

export interface ProjectInvitation {
  id: string;
  project_id: number;
  project_name: string;
  project_emoji?: string | null;
  project_color?: string | null;
  inviter_id: string;
  inviter_name: string;
  inviter_email: string;
  invitee_email: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export interface Sprint {
  id: string;
  project_id: number;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'planning' | 'active' | 'completed';
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: number;
  name: string;
  target_date: string;
  status: 'pending' | 'in_progress' | 'completed';
  description?: string;
}

export interface ProjectDoc {
  id: string;
  project_id: number;
  title: string;
  content: string;
  category?: 'Requirements' | 'Meeting Notes' | 'Architecture' | 'Ideas' | 'Research' | 'Decisions' | 'Specifications' | 'Other';
  created_at: string;
  updated_at: string;
}

export interface ProjectInboxItem {
  id: string;
  project_id: number;
  text: string;
  type?: 'idea' | 'task' | 'note' | 'link';
  created_at: string;
}

export interface ProjectActivity {
  id: string;
  project_id: number;
  author: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface Project {
  id: number;
  user_id: string;
  name: string;
  description?: string | null;
  created_at: string;
  todos?: Todo[]; // Populated on the client
  emoji?: string | null;
  is_archived?: boolean;
  color?: string | null;
  kanban_columns?: string[];
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high';
  start_date?: string | null;
  target_date?: string | null;
  lead?: string | null;
  members?: ProjectMember[];
  goal_id?: number | null;
  template_type?: string | null;
  sprints?: Sprint[];
  milestones?: Milestone[];
  docs?: ProjectDoc[];
  inbox?: ProjectInboxItem[];
  activities?: ProjectActivity[];
}

export interface Note {
  id: number;
  user_id: string;
  folder_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
  notes: Note[];
}

export interface Background {
  id: string; // uuid from DB table
  user_id?: string;
  name: string; // original filename
  path?: string; // path in supabase storage
  url: string;
  type: 'video' | 'image' | 'youtube';
  is_favorite?: boolean;
}

export interface QuickNote {
  id: number;
  user_id: string;
  text: string;
  created_at: string;
}

export type ParticleType = 'none' | 'snow' | 'rain' | 'stars' | 'bubbles' | 'sparks';
export type AmbientSoundType = 'none' | 'rain' | 'forest' | 'coffee_shop' | 'ocean';

// --- Browser Types ---
export interface AIConversationTurn {
  role: 'user' | 'model';
  text: string;
  sources?: any[];
}

export interface AIConversationHistoryItem {
  id: number;
  created_at: string;
  mode: 'normal' | 'comfort';
  title: string;
  conversation_data: AIConversationTurn[];
}


export interface AISettings {
    customInstructions?: string;
}
export interface BrowserSession {
  aiConversation?: AIConversationTurn[];
  aiSettings?: AISettings;
  isComfortModeActive?: boolean;
  aiContextSummary?: string;
}
// --- End Browser Types ---


export interface Playlist {
  id: number;
  user_id: string;
  source_id: string; // YouTube Video ID/Playlist ID or Spotify ID
  name: string;
  is_favorite?: boolean;
  type: 'video' | 'playlist' | 'track' | 'album';
  platform: 'youtube' | 'spotify';
  thumbnail_url?: string;
  created_at: string;
  queue?: Playlist[];
}

export interface ThemeColors {
  primary: string;
  secondary: string;
}

export interface UiSettings {
  themeColors: ThemeColors;
  activeBackgroundId: string | null;
  activeBackgroundUrl?: string | null;
  activeBackgroundType?: 'image' | 'video';
  activeBackgroundName?: string | null;
  particleType: ParticleType;
  ambientSound: { type: AmbientSoundType; volume: number };
  dailyEncouragementLocalHour: number | null;
  dailySummaryHour: number | null;
  enableBatterySaver: boolean;
  progressEmoji?: string;
  dailyGoals?: { [dateKey: string]: { text: string; completed: boolean } };
}

export interface SupabaseUser {
  id: string;
  email?: string;
}

export interface EncouragementNote {
  id: string;
  text: string;
}

// --- Habit Tracker Types ---
export type FrequencyType = 'daily' | 'specific_days' | 'times_per_week' | 'interval';

export type HabitFrequency =
    | { type: 'daily' }
    | { type: 'specific_days'; days: number[] } // 0=Sun, 1=Mon...
    | { type: 'times_per_week'; count: number }
    | { type: 'interval'; days: number; startDate: string };

export interface Habit {
  id: number;
  user_id: string;
  name: string;
  emoji: string | null;
  frequency: HabitFrequency;
  created_at: string;
}

export interface HabitRecord {
  id: number;
  user_id: string;
  habit_id: number;
  completed_at: string; // YYYY-MM-DD
}
// --- End Habit Tracker Types ---

export interface FocusSession {
  id: number;
  user_id?: string;
  completed_at: string; // YYYY-MM-DD
  duration: number; // in minutes
  task_id?: number;
  task_title?: string;
}

// --- Calendar Integration Types ---
export type CalendarProvider = 'google' | 'outlook' | 'none';

export interface CalendarIntegrationAccount {
  provider: 'google' | 'outlook';
  email: string;
  name?: string;
  avatarUrl?: string;
  token?: string;
  refreshToken?: string;
  expiresAt?: number;
  selectedCalendarId?: string;
  selectedCalendarName?: string;
  autoSyncOnCreate: boolean;
  connectedAt: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string; // ISO String for timed events
    date?: string;     // YYYY-MM-DD for all-day events
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
  provider?: 'google' | 'outlook';
  location?: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  provider?: 'google' | 'outlook';
}

export interface GCalSettings {
  enabled: boolean;
  calendarId: string;
  provider?: 'google' | 'outlook';
  autoSyncOnCreate?: boolean;
  calendarName?: string;
}
// --- End Calendar Integration Types ---

// Centralized YouTube IFrame API type definitions.
declare global {
  namespace YT {
    enum PlayerState {
      ENDED = 0,
      PLAYING = 1,
      PAUSED = 2,
      CUED = 5,
    }
    class Player {
      constructor(element: string | HTMLElement, options: any);
      destroy(): void;
      loadVideoById(videoId: string): void;
      loadPlaylist(options: { list: string; listType: 'playlist'; index?: number; }): void;
      nextVideo(): void;
      previousVideo(): void;
      playVideo(): void;
      pauseVideo(): void;
      mute(): void;
      unMute(): void;
      isMuted(): boolean;
      getPlayerState(): PlayerState;
      getIframe(): HTMLIFrameElement;
      getCurrentTime(): number;
      getDuration(): number;
      seekTo(seconds: number, allowSeekAhead: boolean): void;
      getVideoData(): { title: string };
      setVolume(volume: number): void;
      getVolume(): number;
    }
  }
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
    google: any;
    gapi: any;
    supabase: {
      createClient: (url: string, key: string) => any;
    };
    // OneSignal SDK
    OneSignal: any;
  }
}