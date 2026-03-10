-- Add start/end date and time columns to exams
ALTER TABLE exams
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME,
  ADD COLUMN IF NOT EXISTS content UUID[];

-- Use content for content node IDs; scope_topic_ids remains for backward compatibility
