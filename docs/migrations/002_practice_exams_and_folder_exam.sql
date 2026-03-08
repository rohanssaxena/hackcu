-- Migration: Practice exams + folder exam_date
-- Run in Supabase SQL editor.

-- 1. Add exam_date to folders
ALTER TABLE folders ADD COLUMN IF NOT EXISTS exam_date TIMESTAMPTZ;

-- 2. Practice exams (folder-scoped)
CREATE TABLE IF NOT EXISTS practice_exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id       UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT 'Practice Exam',
  settings        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_exams_folder ON practice_exams(folder_id);
CREATE INDEX IF NOT EXISTS idx_practice_exams_user ON practice_exams(user_id);

-- 3. Practice questions
CREATE TABLE IF NOT EXISTS practice_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID NOT NULL REFERENCES practice_exams(id) ON DELETE CASCADE,
  objective_id    UUID REFERENCES objectives(id) ON DELETE SET NULL,
  question        TEXT NOT NULL,
  topic           TEXT,
  options         JSONB NOT NULL,
  "order"         INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_questions_exam ON practice_questions(exam_id);

-- 4. RLS for practice_exams
ALTER TABLE practice_exams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own practice exams" ON practice_exams;
CREATE POLICY "Users access own practice exams"
  ON practice_exams FOR ALL USING (user_id = auth.uid());

-- 5. RLS for practice_questions (via exam ownership)
ALTER TABLE practice_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access practice questions via exam" ON practice_questions;
CREATE POLICY "Users access practice questions via exam"
  ON practice_questions FOR ALL USING (
    exam_id IN (SELECT id FROM practice_exams WHERE user_id = auth.uid())
  );
