-- DEV ONLY: Disable RLS on drill-related tables so the app works with anon key and no auth.
-- Run this in Supabase SQL Editor. Do NOT use in production (anyone could read/write all data).

ALTER TABLE study_sets DISABLE ROW LEVEL SECURITY;
ALTER TABLE set_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE set_question_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE set_question_objectives DISABLE ROW LEVEL SECURITY;
