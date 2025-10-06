
import { GenerateContentResponse } from '@google/genai';

export interface WindowState {
  pos: { x: number; y: number };
  size: { width: number; height: number };
}

export type Priority = 'low' | 'medium' | 'high';

export type WindowType = 'todo' | 'notes' | 'gallery' | 'music' | 'pomodoro' | 'browser' | 'games';

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
}

export interface Todo {
  id: number;
  user_id?: string;
  created_at?: string;
  text: string;
  completed: boolean;
  priority: Priority;
  due_date?: string; // Represents the start date of the task
  start_time?: string; // e.g., "14:00"
  end_time?: string;   // e.g., "15:30"
  notes?: string;
  subtasks?: Subtask[];
  recurrence?: RecurrenceRule;
  reminder_offset?: 0 | 10 | 30 | 60; // In minutes before start_time
  notification_sent?: boolean;
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
  id: string;
  name: string;
  url: string;
  type: 'video' | 'image';
  isFavorite?: boolean;
}

export interface GalleryImage {
  id: string;
  url: string;
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

export interface SupabaseUser {
  id: string;
  email?: string;
}

// FIX: Add missing EncouragementNote type.
export interface EncouragementNote {
  id: string;
  text: string;
}

// FIX: Centralized YouTube IFrame API type definitions to fix duplicate declaration errors.
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
    // FIX: Add google and gapi to the Window interface to resolve TypeScript errors in App.tsx.
    google: any;
    gapi: any;
    supabase: {
      createClient: (url: string, key: string) => any;
    };
  }
}