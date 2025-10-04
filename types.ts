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
}

export interface Todo {
  id: number;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string; // Represents the start date of the task
  startTime?: string; // e.g., "14:00"
  endTime?: string;   // e.g., "15:30"
  notes?: string;
  subtasks?: Subtask[];
  recurrence?: RecurrenceRule;
  reminderOffset?: 0 | 10 | 30 | 60; // In minutes before startTime
  notificationSent?: boolean;
  recurrenceId?: string; // A unique ID for a series of recurring tasks
  recurrenceSourceId?: number; // The ID of the task that generated this one
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt:string;
}

export interface Folder {
  id: string;
  name: string;
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
  id: string;
  text: string;
}

// FIX: Add and export the `EncouragementNote` type to fix missing export error.
export interface EncouragementNote {
  id: string;
  text: string;
}

export type ParticleType = 'none' | 'snow' | 'rain' | 'stars' | 'bubbles' | 'sparks';
export type AmbientSoundType = 'none' | 'rain' | 'forest' | 'coffee_shop' | 'ocean';

// --- Browser Types ---
export interface AIConversationTurn {
  role: 'user' | 'model';
  text: string;
  sources?: any[];
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
  id: string; // YouTube Video ID/Playlist ID or Spotify ID
  name: string;
  isFavorite?: boolean;
  type: 'video' | 'playlist' | 'track' | 'album';
  platform: 'youtube' | 'spotify';
  uuid: string;
  thumbnailUrl?: string;
  // FIX: Add optional 'queue' property to support passing the music queue to player components.
  queue?: Playlist[];
}

export interface ThemeColors {
  primary: string;
  secondary: string;
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
  }
}