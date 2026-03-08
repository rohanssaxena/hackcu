-- Migration: Practice exam attempts (completion tracking)
-- Run in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS practice_exam_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID NOT NULL REFERENCES practice_exams(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score           INT NOT NULL,
  total           INT NOT NULL,
  completed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_exam_attempts_exam ON practice_exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_practice_exam_attempts_user ON practice_exam_attempts(user_id);

ALTER TABLE practice_exam_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users access own attempts" ON practice_exam_attempts;
CREATE POLICY "Users access own attempts"
  ON practice_exam_attempts FOR ALL USING (user_id = auth.uid());
