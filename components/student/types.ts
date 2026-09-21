export interface AcademicPeriod {
  id: string;
  user_id: string;
  name: string; // e.g. "Ciclo 1 2026"
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  period_id?: string;
  name: string;
  code?: string;
  professor?: string;
  room?: string;
  color: string; // Hex color e.g., "#3B82F6"
  emoji?: string;
  description?: string;
  target_grade?: number;
  grade_scale?: number; // e.g. 10 or 100, default 10
  status?: 'active' | 'completed' | 'archived'; // default active
  is_virtual?: boolean;
  days?: string[]; // e.g. ["Lunes", "Miércoles"]
  start_time?: string; // e.g. "08:00"
  end_time?: string; // e.g. "10:00"
  has_date_range?: boolean;
  start_date?: string; // e.g. "2026-02-01"
  end_date?: string; // e.g. "2026-06-30"
  created_at: string;
}

export interface SubjectSchedule {
  id: string;
  user_id?: string;
  subject_id: string;
  day_of_week: string; // 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  start_time: string; // "08:00"
  end_time: string; // "10:00"
  repeat_weekly?: boolean;
  created_at?: string;
}

export interface Unit {
  id: string;
  subject_id: string;
  name: string;
  order_index: number;
  description?: string;
  status?: 'not_started' | 'in_progress' | 'completed';
}

export interface Topic {
  id: string;
  unit_id: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  order_index: number;
}

export interface Exam {
  id: string;
  user_id: string;
  subject_id: string;
  unit_id?: string;
  title: string;
  type: 'quiz' | 'midterm' | 'final' | 'presentation' | 'lab' | 'other';
  date: string; // YYYY-MM-DD
  time?: string;
  location?: string;
  weight?: number; // 0-100
  grade?: number;
  notes?: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Resource {
  id: string;
  user_id: string;
  subject_id: string;
  unit_id?: string;
  title: string;
  url?: string;
  type: 'link' | 'pdf' | 'video' | 'document' | 'other';
  description?: string;
  created_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string;
  unit_id?: string;
  topic_id?: string;
  duration_minutes: number;
  start_time?: string;
  end_time?: string;
  objective?: string;
  notes?: string;
  status: 'in_progress' | 'completed';
  created_at: string;
}

export interface Reading {
  id: string;
  user_id: string;
  subject_id?: string;
  title: string;
  author?: string;
  type: 'book' | 'paper' | 'article' | 'pdf' | 'other';
  status: 'want_to_read' | 'reading' | 'completed' | 'paused';
  total_pages?: number;
  current_page: number;
  link?: string;
  created_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  subject_id?: string;
  title: string;
  description?: string;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  status: 'new' | 'learning' | 'reviewing' | 'known';
  next_review?: string;
  created_at: string;
}

export interface GradeCategory {
  id: string;
  user_id: string;
  subject_id: string;
  name: string; // e.g. "Parciales", "Laboratorios", "Proyecto final"
  weight: number; // % weight (0-100)
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  period_id?: string;
  subject_id?: string;
  project_id?: number;
  reading_id?: string;
  title: string;
  description?: string;
  type: 'grade' | 'subject' | 'task' | 'reading' | 'project' | 'personal';
  target_value?: number;
  current_value?: number;
  target_date?: string;
  status: 'in_progress' | 'achieved' | 'missed';
  created_at: string;
}

export interface Grade {
  id: string;
  user_id: string;
  subject_id: string;
  category_id?: string;
  exam_id?: string;
  unit_id?: string;
  name: string;
  score?: number | null; // Obtained score (null/undefined if pending)
  max_score: number; // Default 10 or 100
  weight?: number;
  date?: string;
  notes?: string;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  subject_id: string;
  date: string;
  status: 'present' | 'absent' | 'excused';
  created_at: string;
}

export interface StudyTarget {
  id: string;
  user_id: string;
  period_id?: string;
  weekly_hours_target: number;
  min_attendance_rate: number;
  target_gpa: number;
  updated_at: string;
}
