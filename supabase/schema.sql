-- =============================================================================
-- Schema SQL — Gerenciador de Curso de Reforço "Curso Onyou"
-- Execute este script no SQL Editor do seu projeto Supabase
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Matérias
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#4f46e5',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Professores
CREATE TABLE IF NOT EXISTS public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#4f46e5',
  subjects TEXT[] NOT NULL DEFAULT '{}',
  available_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  available_slots TEXT[] NOT NULL DEFAULT '{}',
  max_students_per_slot INT NOT NULL DEFAULT 4 CHECK (max_students_per_slot >= 1 AND max_students_per_slot <= 30),
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Alunos
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  guardian_name TEXT NOT NULL DEFAULT '',
  guardian_phone TEXT NOT NULL DEFAULT '',
  subjects_needed TEXT[] NOT NULL DEFAULT '{}',
  preferred_days INT[] NOT NULL DEFAULT '{1,2,3,4,5}',
  preferred_slots TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Reservas / Agendamentos por Data
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  booking_type TEXT NOT NULL DEFAULT 'individual' CHECK (booking_type IN ('individual', 'grupo')),
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'concluido', 'cancelado', 'falta')),
  topic_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance na agenda mensal e checagem de conflitos
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_date_slot ON public.bookings(teacher_id, date, time_slot);
CREATE INDEX IF NOT EXISTS idx_bookings_student ON public.bookings(student_id);

-- Impede duplicar o mesmo aluno na mesma aula ativa (professor/data/horário)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_unique_active_student_slot
  ON public.bookings(date, time_slot, teacher_id, student_id)
  WHERE status <> 'cancelado';

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso abertas para funcionamento imediato via API pública (anon/authenticated)
-- (Para produção com login, restrinja `TO authenticated` usando o `auth.uid()` nas expressões USING/WITH CHECK)
DROP POLICY IF EXISTS "Acesso total subjects" ON public.subjects;
CREATE POLICY "Acesso total subjects" ON public.subjects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total teachers" ON public.teachers;
CREATE POLICY "Acesso total teachers" ON public.teachers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total students" ON public.students;
CREATE POLICY "Acesso total students" ON public.students FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total bookings" ON public.bookings;
CREATE POLICY "Acesso total bookings" ON public.bookings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Garantir exposição explícita na Data API para as roles anon e authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects, public.teachers, public.students, public.bookings TO anon, authenticated;

-- Matérias iniciais sugeridas
INSERT INTO public.subjects (name, color) VALUES
  ('Matemática', '#4f46e5'),
  ('Física', '#0891b2'),
  ('Química', '#059669'),
  ('Português', '#db2777'),
  ('Redação', '#ea580c'),
  ('Inglês', '#7c3aed'),
  ('Biologia', '#16a34a'),
  ('História', '#b45309')
ON CONFLICT (name) DO NOTHING;
