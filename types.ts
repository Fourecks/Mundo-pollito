import { GenerateContentResponse } from '@google/genai';

export interface WindowState {
  pos: { x: number; y: number };
  size: { width: number; height: number };
}

export type Priority = 'low' | 'medium' | 'high';

export type WindowType = 'todo' | 'calendar' | 'notes' | 'music' | 'pomodoro' | 'browser' | 'habits' | 'progreso' | 'projects' | 'spotify' | 'finance' | 'student';

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
  assigned_to?: string | null;
  list_id?: string | null;
  // Student Module
  subject_id?: string | null;
  unit_id?: string | null;
  academic_type?: string | null;
}

export interface ProjectMember {
  id: string;
  name: string;
  avatar?: string;
  role: 'owner' | 'lead' | 'member' | 'pending';
  email?: string;
}

export interface ProjectInvitation {
  id: string;
  project_id: number;
  project_name: string;
  project_emoji?: string | null;
  project_color?: string | null;
  inviter_id?: string;
  inviter_name?: string;
  inviter_email?: string;
  sender_id?: string;
  sender_email?: string;
  invitee_email?: string;
  receiver_email?: string;
  status: 'pending' | 'accepted' | 'declined' | 'rejected';
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
  capacity_points?: number;
  completed_points?: number;
  retrospective?: string;
  created_at: string;
}

export interface Milestone {
  id: string;
  project_id: number;
  name: string;
  target_date: string;
  start_date?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delayed';
  description?: string;
  category?: 'Sprint Release' | 'Product Launch' | 'Architecture' | 'Quality Assurance' | 'Client Review' | 'Other';
  progress_percentage?: number;
  owner_email?: string;
  linked_sprint_id?: string;
}

export interface ProjectDocFolder {
  id: string;
  project_id: number;
  name: string;
  color?: string;
  description?: string;
  created_at: string;
}

export interface ProjectDoc {
  id: string;
  project_id: number;
  folder_id?: string | null;
  title: string;
  content: string;
  category?: 'Requirements' | 'Meeting Notes' | 'Architecture' | 'Ideas' | 'Research' | 'Decisions' | 'Specifications' | 'Other';
  file_url?: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  tags?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectInboxItem {
  id: string;
  project_id: number;
  title?: string;
  text: string;
  type?: 'announcement' | 'mention' | 'task_update' | 'alert' | 'idea' | 'note' | 'link';
  priority?: 'urgent' | 'normal' | 'info';
  author_name?: string;
  author_email?: string;
  is_read?: boolean;
  is_starred?: boolean;
  is_archived?: boolean;
  related_tab?: 'kanban' | 'sprints' | 'roadmap' | 'docs' | 'chat';
  related_item_id?: string | number;
  created_at: string;
}

export interface ProjectChatMessage {
  id: string;
  project_id: number;
  channel_id?: string;
  sender_id?: string;
  sender_name: string;
  sender_email: string;
  text: string;
  created_at: string;
  doc_reference?: {
    id: string;
    title: string;
    file_type?: string;
    file_name?: string;
    file_size_formatted?: string;
    folder_name?: string;
    url?: string;
  };
  reactions?: Record<string, string[]>;
  is_pinned?: boolean;
  reply_to?: {
    id: string;
    sender_name: string;
    text: string;
  };
  poll_id?: string;
  thread_id?: string;
  replies_count?: number;
  replies?: ProjectChatMessage[];
}

export interface ProjectChannel {
  id: string;
  project_id: number;
  name: string;
  description?: string;
  emoji: string;
  is_private: boolean;
  password?: string;
  created_at: string;
}

export interface ProjectPollOption {
  id: string;
  text: string;
  voters: string[]; // List of voter names/emails
}

export interface ProjectPoll {
  id: string;
  project_id: number;
  channel_id: string;
  question: string;
  options: ProjectPollOption[];
  allow_multiple: boolean;
  created_by: string;
  created_at: string;
  is_closed?: boolean;
}

export interface ProjectHuddleParticipant {
  name: string;
  email: string;
  has_mic: boolean;
  has_video: boolean;
  has_screen: boolean;
  stream?: MediaStream;
}

export interface ProjectHuddle {
  id: string;
  project_id: number;
  channel_id: string;
  active: boolean;
  started_at: string;
  participants: ProjectHuddleParticipant[];
}

export interface ProjectActivity {
  id: string;
  project_id: number;
  author: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface ProjectExpense {
  id: string;
  project_id: number;
  description: string;
  amount: number;
  date: string;
  category: 'Software' | 'Hardware' | 'Marketing' | 'Services' | 'Travel' | 'Other';
  receipt_url?: string;
  sprint_id?: string;
  created_at: string;
  created_by: string;
  created_by_name?: string;
}

export interface ProjectTimeEntry {
  id: string;
  project_id: number;
  user_email: string;
  user_name: string;
  task_id?: number | string;
  sprint_id?: string;
  date: string;
  duration_minutes: number;
  description?: string;
  created_at: string;
}

export interface Project {
  id: number;
  user_id: string;
  owner_email?: string | null;
  owner_name?: string | null;
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
  doc_folders?: ProjectDocFolder[];
  docs?: ProjectDoc[];
  inbox?: ProjectInboxItem[];
  chat_messages?: ProjectChatMessage[];
  activities?: ProjectActivity[];
  channels?: ProjectChannel[];
  polls?: ProjectPoll[];
  huddles?: ProjectHuddle[];
  expenses?: ProjectExpense[];
  time_entries?: ProjectTimeEntry[];
  quarterly_priorities?: ProjectQuarterlyPriority[];
  lists?: ProjectList[];
}

export interface ProjectListItem {
  id: string;
  list_id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'review';
  assignee_email?: string | null;
  due_date?: string | null;
  priority?: Priority;
  story_points?: number | null;
  tags?: string[];
  notifications_enabled?: boolean;
  comments?: TaskComment[];
  todo_id?: number;
  created_at: string;
}

export interface ProjectList {
  id: string;
  project_id: number;
  name: string;
  description?: string;
  template_type?: 'custom' | 'project_tracking' | 'product_launch' | 'bug_tracking' | 'marketing';
  items: ProjectListItem[];
  created_at: string;
  created_by?: string;
  columns?: string[];
}

export interface ProjectQuarterlyPriority {
  id: string;
  project_id?: number;
  title: string;
  description?: string;
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  priority_level: 'P1' | 'P2' | 'P3' | 'P4';
  impact: 'Alto' | 'Medio' | 'Bajo';
  owner_email?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  created_at: string;
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

export interface PushNotificationPreferences {
  projectMembers: boolean;    // Nuevos miembros en proyectos e invitaciones
  taskReminders: boolean;     // Recordatorios de tareas y alertas de vencimiento
  channelMentions: boolean;   // Menciones en canales (@nombre, @todos) y chats
}

export type NotificationEventType = 'projectMembers' | 'taskReminders' | 'channelMentions' | 'test';

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
  pushPreferences?: PushNotificationPreferences;
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

export interface AppNotification {
  id: string;
  type: 'chat';
  title: string;
  body: string;
  senderName?: string;
  projectName: string;
  projectId: number;
  channelId: string;
  isPrivate: boolean;
  timestamp: string;
  read: boolean;
}

// --- Finance Types ---
export type FinanceAccountType = 'bank' | 'cash' | 'savings' | 'wallet' | 'investment' | 'debit' | 'credit';
export type FinanceTransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'REFUND';

export interface FinanceAccount {
  id: number;
  user_id: string;
  name: string;
  type: FinanceAccountType;
  balance_cents: number; // For credit cards, balance_cents represents current used debt
  credit_limit_cents?: number; // Total credit limit for credit cards
  cutoff_day?: number; // e.g., 15th of month
  due_day?: number; // e.g., 5th of following month
  card_number_last4?: string; // e.g., "4821"
  card_color?: string; // 'slate' | 'emerald' | 'indigo' | 'rose' | 'amber' | 'purple' | 'zinc'
  currency: string;
  is_archived: boolean;
  created_at: string;
  maintenance_fee_type?: 'none' | 'fixed' | 'percent';
  maintenance_fee_value?: number;
  maintenance_fee_freq?: 'monthly' | 'yearly';
  transfer_fee_type?: 'none' | 'fixed' | 'percent';
  transfer_fee_value?: number;
}

export interface FinanceInstallment {
  id: number;
  user_id: string;
  name: string;
  total_amount_cents: number;
  total_installments: number;
  paid_installments: number;
  installment_amount_cents: number;
  account_id?: number; // Card or account used
  start_date: string; // YYYY-MM-DD
  start_month?: string; // YYYY-MM
  payment_day?: number; // Day of month (1-31) for auto-deduction
  last_paid_month?: string; // YYYY-MM of the last auto-processed month
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  is_past_due?: boolean;
  created_at: string;
}

export interface FinanceCategory {
  id: number;
  user_id: string;
  name: string;
  emoji?: string;
  color?: string;
  parent_id?: number;
  is_archived: boolean;
  type?: 'EXPENSE' | 'INCOME' | 'expense' | 'income';
  budget_limit_cents?: number;
}

export interface FinanceTransaction {
  id: number;
  user_id: string;
  account_id: number;
  type: FinanceTransactionType;
  amount_cents: number;
  currency: string;
  category_id?: number;
  date: string; // YYYY-MM-DD
  time?: string;
  description?: string;
  notes?: string;
  merchant?: string;
  payment_method?: string;
  related_transfer_id?: number;
  tags: string[];
  is_recurring_instance: boolean;
  recurring_transaction_id?: number;
  created_at: string;
}

export interface FinanceRecurringTransaction {
    id: number;
    user_id: string;
    account_id: number;
    type: FinanceTransactionType;
    amount_cents: number;
    currency: string;
    category_id?: number;
    description?: string;
    frequency: 'weekly' | 'monthly' | 'yearly' | 'custom';
    frequency_interval: number;
    start_date: string;
    next_date: string;
    end_date?: string;
    auto_create: boolean;
    is_active: boolean;
    is_past_due?: boolean;
}

export interface FinanceBudget {
    id: number;
    user_id: string;
    month: string; // YYYY-MM
    total_amount_cents: number;
}

export interface FinanceBudgetItem {
    id: number;
    user_id: string;
    month: string; // YYYY-MM
    name: string;
    icon?: string;
    color?: string;
    allocated_cents: number;
    category_id?: number;
    created_at?: string;
    updated_at?: string;
}

export interface FinanceSecurity {
    id: number;
    user_id: string;
    pin_hash: string;
    require_on_enter?: boolean;
    require_on_delete?: boolean;
    require_pin_on_entry?: boolean;
    require_pin_on_delete?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface FinanceCategoryBudget {
    id: number;
    user_id: string;
    budget_id: number;
    category_id: number;
    amount_cents: number;
}

export interface FinanceSavingsGoal {
    id: number;
    user_id: string;
    name: string;
    target_amount_cents: number;
    current_amount_cents: number;
    target_date?: string;
    custom_contribution_cents?: number;
    frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    account_id?: number;
    notes?: string;
    is_completed: boolean;
    created_at?: string;
}

export interface FinanceShoppingList {
    id: number;
    user_id: string;
    name: string;
    is_archived: boolean;
    created_at: string;
}

export interface FinanceShoppingItem {
    id: number;
    user_id: string;
    list_id: number;
    name: string;
    is_purchased: boolean;
    quantity?: number;
    price_cents?: number;
    estimated_amount_cents?: number;
    actual_amount_cents?: number;
    created_at: string;
}

export interface FinanceDebt {
    id: number;
    user_id: string;
    name: string;
    type: 'OWE' | 'OWED';
    amount_cents: number;
    remaining_cents: number;
    due_date?: string;
    notes?: string;
    is_archived: boolean;
    created_at: string;
}

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
    OneSignalDeferred: any[];
    __currentActiveChannelContext?: {
      projectId: number;
      channelId: string | null;
      isOpen: boolean;
    };
    __pendingProjectChannel?: {
      projectId: number;
      channelId: string;
    };
  }
}