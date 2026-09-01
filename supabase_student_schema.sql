-- Student Module Schema

-- 1. ACADEMIC PERIODS
CREATE TABLE IF NOT EXISTS public.student_academic_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SUBJECTS
CREATE TABLE IF NOT EXISTS public.student_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.student_academic_periods(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    professor TEXT,
    room TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    emoji TEXT,
    description TEXT,
    target_grade NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SUBJECT SCHEDULES
CREATE TABLE IF NOT EXISTS public.student_subject_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL, -- 0=Sun, 1=Mon, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room TEXT
);

-- 4. UNITS
CREATE TABLE IF NOT EXISTS public.student_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index SMALLINT NOT NULL DEFAULT 0,
    description TEXT
);

-- 5. TOPICS
CREATE TABLE IF NOT EXISTS public.student_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.student_units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, completed
    order_index SMALLINT NOT NULL DEFAULT 0
);

-- 6. EXAMS
CREATE TABLE IF NOT EXISTS public.student_exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.student_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    date DATE NOT NULL,
    time TIME,
    location TEXT,
    weight NUMERIC,
    grade NUMERIC,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADD COLUMNS TO GLOBAL TODOS FOR STUDENT TASKS
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.student_units(id) ON DELETE SET NULL;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS academic_type TEXT;

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_student_subjects_user ON public.student_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_user ON public.student_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_student_units_subject ON public.student_units(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_topics_unit ON public.student_topics(unit_id);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.student_academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exams ENABLE ROW LEVEL SECURITY;

-- SECURITY POLICIES
CREATE POLICY "student_periods_policy" ON public.student_academic_periods FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_subjects_policy" ON public.student_subjects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_schedules_policy" ON public.student_subject_schedules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())
);
CREATE POLICY "student_units_policy" ON public.student_units FOR ALL USING (
    EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())
);
CREATE POLICY "student_topics_policy" ON public.student_topics FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.student_units u 
        JOIN public.student_subjects s ON u.subject_id = s.id 
        WHERE u.id = unit_id AND s.user_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.student_units u 
        JOIN public.student_subjects s ON u.subject_id = s.id 
        WHERE u.id = unit_id AND s.user_id = auth.uid()
    )
);
CREATE POLICY "student_exams_policy" ON public.student_exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_academic_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_subject_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_units;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_topics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_exams;

-- ==========================================
-- PHASE 3: KNOWLEDGE (Resources & Notes)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.student_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.student_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT,
    type TEXT NOT NULL DEFAULT 'link', -- link, pdf, video, document, etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integrate academic fields into global Notes table
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.student_units(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.student_topics(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_resources_user ON public.student_resources(user_id);
ALTER TABLE public.student_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_resources_policy" ON public.student_resources FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_resources;

-- ==========================================
-- PHASE 4: STUDY (Sessions & Time Tracking)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.student_study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.student_units(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.student_topics(id) ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    objective TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed', -- 'in_progress', 'completed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_study_sessions_user ON public.student_study_sessions(user_id);
ALTER TABLE public.student_study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_study_sessions_policy" ON public.student_study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_study_sessions;

-- ==========================================
-- PHASE 5: LIBRARY (Books & Readings)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.student_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    author TEXT,
    type TEXT NOT NULL DEFAULT 'book', -- book, paper, article, pdf
    status TEXT NOT NULL DEFAULT 'want_to_read', -- want_to_read, reading, completed, paused
    total_pages INTEGER,
    current_page INTEGER DEFAULT 0,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_readings_user ON public.student_readings(user_id);
ALTER TABLE public.student_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_readings_policy" ON public.student_readings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_readings;

-- ==========================================
-- PHASE 7: ACTIVE RECALL (Flashcards & Decks)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.student_decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_decks_user ON public.student_decks(user_id);
ALTER TABLE public.student_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_decks_policy" ON public.student_decks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_decks;

CREATE TABLE IF NOT EXISTS public.student_flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.student_decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', -- new, learning, reviewing, known
    next_review TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_flashcards_deck ON public.student_flashcards(deck_id);
ALTER TABLE public.student_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_flashcards_policy" ON public.student_flashcards FOR ALL USING (
    EXISTS (SELECT 1 FROM public.student_decks d WHERE d.id = deck_id AND d.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.student_decks d WHERE d.id = deck_id AND d.user_id = auth.uid())
);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_flashcards;

-- ==========================================
-- PHASE 8: ACADEMIC GOALS (Milestones)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.student_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.student_academic_periods(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, achieved, missed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_goals_user ON public.student_goals(user_id);
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_goals_policy" ON public.student_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_goals;


-- ==========================================
-- PHASE 6: ACADEMIC PERFORMANCE (Grades & Attendance)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.student_grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    score NUMERIC,
    max_score NUMERIC DEFAULT 10,
    weight NUMERIC, -- percentage 0-100
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_grades_user ON public.student_grades(user_id);
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_grades_policy" ON public.student_grades FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_grades;

CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present', -- present, absent, excused
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_attendance_user ON public.student_attendance(user_id);
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_attendance_policy" ON public.student_attendance FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_attendance;

-- ==========================================
-- PHASE 9: ACADEMIC ANALYTICS & STUDY INSIGHTS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.student_study_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.student_academic_periods(id) ON DELETE SET NULL,
    weekly_hours_target NUMERIC DEFAULT 15,
    min_attendance_rate NUMERIC DEFAULT 80,
    target_gpa NUMERIC DEFAULT 9.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_study_targets_user ON public.student_study_targets(user_id);
ALTER TABLE public.student_study_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "student_study_targets_policy" ON public.student_study_targets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_study_targets;

