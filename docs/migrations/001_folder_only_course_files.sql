-- Migration: Use folders instead of courses for course_files
-- Run this in Supabase SQL editor before using folder-only mode.

-- 1. Add outline columns to folders if missing (used by outline/content pipelines)
ALTER TABLE folders ADD COLUMN IF NOT EXISTS outline_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS lc_generated BOOLEAN DEFAULT FALSE;

-- 2. Make course_id nullable (files can exist in folders without a course)
ALTER TABLE course_files
  ALTER COLUMN course_id DROP NOT NULL;

-- 3. Update RLS: allow access via folder_id (user owns the folder)
DROP POLICY IF EXISTS "Users access their course files" ON course_files;
CREATE POLICY "Users access their course files"
  ON course_files FOR ALL USING (
    folder_id IN (SELECT id FROM folders WHERE user_id = auth.uid())
    OR
    (course_id IS NOT NULL AND course_id IN (SELECT id FROM courses WHERE user_id = auth.uid()))
  );
