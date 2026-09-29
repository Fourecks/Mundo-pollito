-- ==============================================================================
-- SCHEMA COMPLETO DEL MÓDULO ESTUDIANTIL (STUDENT MODULE) PARA SUPABASE
-- 100% IDEMPOTENTE Y SEGURO PARA EJECUTAR EN EL "SQL EDITOR"
-- ==============================================================================

-- 1. PERIODOS ACADÉMICOS
CREATE TABLE IF NOT EXISTS public.student_academic_periods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MATERIAS / ASIGNATURAS
CREATE TABLE IF NOT EXISTS public.student_subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.student_academic_periods(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT,
    professor TEXT,
    room TEXT,
    color TEXT NOT NULL DEFAULT '#0d9488',
    icon_name TEXT DEFAULT 'Hammer',
    emoji TEXT,
    description TEXT,
    target_grade NUMERIC DEFAULT 10,
    grade_scale NUMERIC DEFAULT 10,
    status TEXT DEFAULT 'active',
    is_virtual BOOLEAN DEFAULT FALSE,
    days TEXT[],
    start_time TEXT,
    end_time TEXT,
    has_date_range BOOLEAN DEFAULT FALSE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar columnas si la tabla ya existía previamente
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS icon_name TEXT DEFAULT 'Hammer';
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS days TEXT[];
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS grade_scale NUMERIC DEFAULT 10;
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS is_virtual BOOLEAN DEFAULT FALSE;
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS has_date_range BOOLEAN DEFAULT FALSE;
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.student_subjects ADD COLUMN IF NOT EXISTS end_date DATE;

-- 3. HORARIOS DE CLASE (Múltiples horarios y horas independientes por día)
CREATE TABLE IF NOT EXISTS public.student_subject_schedules (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    day_of_week TEXT NOT NULL, -- 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
    start_time TEXT NOT NULL, -- '08:00'
    end_time TEXT NOT NULL,   -- '10:00'
    room TEXT,
    repeat_weekly BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.student_subject_schedules ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.student_subject_schedules ADD COLUMN IF NOT EXISTS repeat_weekly BOOLEAN DEFAULT TRUE;
ALTER TABLE public.student_subject_schedules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 4. CATEGORÍAS DE CALIFICACIONES (Ponderaciones)
CREATE TABLE IF NOT EXISTS public.student_grade_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTAS Y CALIFICACIONES
CREATE TABLE IF NOT EXISTS public.student_grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.student_grade_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    score NUMERIC,
    max_score NUMERIC DEFAULT 10,
    weight NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. EXÁMENES Y EVALUACIONES
CREATE TABLE IF NOT EXISTS public.student_exams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    unit_id UUID,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    weight NUMERIC,
    grade NUMERIC,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. LECTURAS Y LIBROS
CREATE TABLE IF NOT EXISTS public.student_readings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    author TEXT,
    type TEXT NOT NULL DEFAULT 'book',
    status TEXT NOT NULL DEFAULT 'want_to_read',
    total_pages INTEGER,
    current_page INTEGER DEFAULT 0,
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. OBJETIVOS ACADÉMICOS (METAS)
CREATE TABLE IF NOT EXISTS public.student_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.student_academic_periods(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ASISTENCIAS
CREATE TABLE IF NOT EXISTS public.student_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SESIONES DE ESTUDIO (POMODORO / CRONÓMETRO)
CREATE TABLE IF NOT EXISTS public.student_study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    unit_id UUID,
    topic_id UUID,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    objective TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. UNIDADES Y TEMAS
CREATE TABLE IF NOT EXISTS public.student_units (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index SMALLINT NOT NULL DEFAULT 0,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.student_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    unit_id UUID NOT NULL REFERENCES public.student_units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started',
    order_index SMALLINT NOT NULL DEFAULT 0
);

-- 12. FLASHCARDS Y MAZOS (ACTIVE RECALL)
CREATE TABLE IF NOT EXISTS public.student_decks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    deck_id UUID NOT NULL REFERENCES public.student_decks(id) ON DELETE CASCADE,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    next_review TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. RECURSOS DE ESTUDIO
CREATE TABLE IF NOT EXISTS public.student_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.student_subjects(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.student_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    url TEXT,
    type TEXT NOT NULL DEFAULT 'link',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. METAS Y MÉTRICAS DE RENDIMIENTO
CREATE TABLE IF NOT EXISTS public.student_study_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.student_academic_periods(id) ON DELETE SET NULL,
    weekly_hours_target NUMERIC DEFAULT 15,
    min_attendance_rate NUMERIC DEFAULT 80,
    target_gpa NUMERIC DEFAULT 9.0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VINCULACIÓN CON TAREAS Y NOTAS GLOBALES
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.student_units(id) ON DELETE SET NULL;
ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS academic_type TEXT;

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.student_subjects(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.student_units(id) ON DELETE SET NULL;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS topic_id UUID REFERENCES public.student_topics(id) ON DELETE SET NULL;

-- ÍNDICES PARA OPTIMIZAR CONSULTAS
CREATE INDEX IF NOT EXISTS idx_student_subjects_user ON public.student_subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_student_subject_schedules_subj ON public.student_subject_schedules(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_user ON public.student_exams(user_id);
CREATE INDEX IF NOT EXISTS idx_student_readings_user ON public.student_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_student_goals_user ON public.student_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_student_grades_user ON public.student_grades(user_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_user ON public.student_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_student_study_sessions_user ON public.student_study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_student_units_subject ON public.student_units(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_topics_unit ON public.student_topics(unit_id);
CREATE INDEX IF NOT EXISTS idx_student_decks_user ON public.student_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_student_flashcards_deck ON public.student_flashcards(deck_id);
CREATE INDEX IF NOT EXISTS idx_student_resources_user ON public.student_resources(user_id);

-- SEGURIDAD ROW LEVEL SECURITY (RLS)
ALTER TABLE public.student_academic_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subject_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_study_targets ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE ACCESO RLS
DO $$
BEGIN
    DROP POLICY IF EXISTS "student_periods_policy" ON public.student_academic_periods;
    DROP POLICY IF EXISTS "student_subjects_policy" ON public.student_subjects;
    DROP POLICY IF EXISTS "student_schedules_policy" ON public.student_subject_schedules;
    DROP POLICY IF EXISTS "student_grade_categories_policy" ON public.student_grade_categories;
    DROP POLICY IF EXISTS "student_grades_policy" ON public.student_grades;
    DROP POLICY IF EXISTS "student_exams_policy" ON public.student_exams;
    DROP POLICY IF EXISTS "student_readings_policy" ON public.student_readings;
    DROP POLICY IF EXISTS "student_goals_policy" ON public.student_goals;
    DROP POLICY IF EXISTS "student_attendance_policy" ON public.student_attendance;
    DROP POLICY IF EXISTS "student_study_sessions_policy" ON public.student_study_sessions;
    DROP POLICY IF EXISTS "student_units_policy" ON public.student_units;
    DROP POLICY IF EXISTS "student_topics_policy" ON public.student_topics;
    DROP POLICY IF EXISTS "student_decks_policy" ON public.student_decks;
    DROP POLICY IF EXISTS "student_flashcards_policy" ON public.student_flashcards;
    DROP POLICY IF EXISTS "student_resources_policy" ON public.student_resources;
    DROP POLICY IF EXISTS "student_study_targets_policy" ON public.student_study_targets;
END $$;

CREATE POLICY "student_periods_policy" ON public.student_academic_periods FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_subjects_policy" ON public.student_subjects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "student_schedules_policy" ON public.student_subject_schedules FOR ALL USING (
    EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())
);

CREATE POLICY "student_grade_categories_policy" ON public.student_grade_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.student_subjects s WHERE s.id = subject_id AND s.user_id = auth.uid())
);

CREATE POLICY "student_grades_policy" ON public.student_grades FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_exams_policy" ON public.student_exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_readings_policy" ON public.student_readings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_goals_policy" ON public.student_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_attendance_policy" ON public.student_attendance FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_study_sessions_policy" ON public.student_study_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "student_decks_policy" ON public.student_decks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "student_flashcards_policy" ON public.student_flashcards FOR ALL USING (
    EXISTS (SELECT 1 FROM public.student_decks d WHERE d.id = deck_id AND d.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.student_decks d WHERE d.id = deck_id AND d.user_id = auth.uid())
);

CREATE POLICY "student_resources_policy" ON public.student_resources FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "student_study_targets_policy" ON public.student_study_targets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SUSCRIPCIÓN EN TIEMPO REAL (REALTIME CONDICIONAL - EVITA ERROR 42710)
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'student_academic_periods',
        'student_subjects',
        'student_subject_schedules',
        'student_grade_categories',
        'student_grades',
        'student_exams',
        'student_readings',
        'student_goals',
        'student_attendance',
        'student_study_sessions',
        'student_units',
        'student_topics',
        'student_decks',
        'student_flashcards',
        'student_resources',
        'student_study_targets'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
              AND schemaname = 'public' 
              AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl);
        END IF;
    END LOOP;
END $$;
