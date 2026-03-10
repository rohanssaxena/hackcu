-- Ensure exams table exists with all columns needed for Add Exam modal
-- Safe to run: creates table if missing, adds columns if table exists

-- Create table if it doesn't exist (e.g. minimal/fresh schema)
CREATE TABLE IF NOT EXISTS exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  folder_id       UUID NOT NULL,
  course_id       UUID,
  title           TEXT NOT NULL,
  exam_date       TIMESTAMPTZ NOT NULL,
  scope_topic_ids UUID[],
  notes           TEXT,
  weight          FLOAT,
  location        TEXT,
  exam_type       TEXT CHECK (exam_type IN ('midterm', 'final', 'quiz', 'homework', 'project', 'other'))
                  DEFAULT 'midterm',
  predicted_score FLOAT,
  start_date      DATE,
  end_date        DATE,
  start_time      TIME,
  end_time        TIME,
  content         UUID[],
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns that may be missing (e.g. table existed from DDL before migration)
ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS content UUID[];

-- Indexes (ignore if not exists)
CREATE INDEX IF NOT EXISTS idx_exams_folder ON exams(folder_id);
CREATE INDEX IF NOT EXISTS idx_exams_course ON exams(course_id);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(user_id, exam_date);

-- Note: If using a fresh schema, ensure profiles and folders tables exist first.
-- The main DDL.sql creates exams with full foreign keys.
