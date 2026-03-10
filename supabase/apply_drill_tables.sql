-- Run this in Supabase SQL Editor if set_questions is missing.
-- Idempotent: safe to run more than once.

-- 1. Allow 'drill' (and other set types) in study_sets.type
ALTER TABLE study_sets DROP CONSTRAINT IF EXISTS study_sets_type_check;
ALTER TABLE study_sets ADD CONSTRAINT study_sets_type_check
  CHECK (type IN ('flashcards', 'cheat_sheet', 'practice_exam', 'drill', 'socratic', 'debate'));

-- 2. Drill question tables
CREATE TABLE IF NOT EXISTS set_questions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id     UUID NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  difficulty INT NOT NULL DEFAULT 5 CHECK (difficulty BETWEEN 1 AND 10),
  "order"    INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_set_questions_set ON set_questions(set_id);

CREATE TABLE IF NOT EXISTS set_question_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES set_questions(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  correct     BOOLEAN NOT NULL DEFAULT FALSE,
  explanation TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_set_question_options_question ON set_question_options(question_id);

CREATE TABLE IF NOT EXISTS set_question_objectives (
  question_id  UUID NOT NULL REFERENCES set_questions(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, objective_id)
);
CREATE INDEX IF NOT EXISTS idx_set_question_objectives_question ON set_question_objectives(question_id);
CREATE INDEX IF NOT EXISTS idx_set_question_objectives_objective ON set_question_objectives(objective_id);

-- 3. RLS
ALTER TABLE set_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_question_objectives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users access set_questions via study_sets" ON set_questions;
CREATE POLICY "Users access set_questions via study_sets"
  ON set_questions FOR ALL USING (
    set_id IN (SELECT id FROM study_sets WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users access set_question_options via set_questions" ON set_question_options;
CREATE POLICY "Users access set_question_options via set_questions"
  ON set_question_options FOR ALL USING (
    question_id IN (SELECT id FROM set_questions WHERE set_id IN (SELECT id FROM study_sets WHERE user_id = auth.uid()))
  );

DROP POLICY IF EXISTS "Users access set_question_objectives via set_questions" ON set_question_objectives;
CREATE POLICY "Users access set_question_objectives via set_questions"
  ON set_question_objectives FOR ALL USING (
    question_id IN (SELECT id FROM set_questions WHERE set_id IN (SELECT id FROM study_sets WHERE user_id = auth.uid()))
  );
