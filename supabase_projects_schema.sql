-- ==========================================
-- SCRIPT DE ACTUALIZACIÓN DE TABLA: projects
-- ==========================================
-- Ejecuta este código en el editor SQL de Supabase para añadir 
-- todas las columnas necesarias y robustecer el módulo de proyectos.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS emoji TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS target_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS lead TEXT,
  ADD COLUMN IF NOT EXISTS kanban_columns JSONB,
  ADD COLUMN IF NOT EXISTS sprints JSONB,
  ADD COLUMN IF NOT EXISTS milestones JSONB,
  ADD COLUMN IF NOT EXISTS docs JSONB,
  ADD COLUMN IF NOT EXISTS inbox JSONB,
  ADD COLUMN IF NOT EXISTS activities JSONB,
  ADD COLUMN IF NOT EXISTS members JSONB,
  ADD COLUMN IF NOT EXISTS template_type TEXT,
  ADD COLUMN IF NOT EXISTS goal_id INTEGER;
