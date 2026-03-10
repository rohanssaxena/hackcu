-- Delink drill (and other folder-scoped sets) from courses: add folder_id, make course_id optional.
ALTER TABLE study_sets
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE CASCADE;

ALTER TABLE study_sets
  ALTER COLUMN course_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_sets_folder ON study_sets(folder_id);

COMMENT ON COLUMN study_sets.folder_id IS 'Folder this set belongs to (e.g. for drill sets). When set, course_id may be null.';
COMMENT ON COLUMN study_sets.course_id IS 'Optional course association. Null for folder-only sets (e.g. drill).';

-- Optional: backfill folder_id for existing sets that have course_id (so they still appear when loading by folder)
UPDATE study_sets s
SET folder_id = c.folder_id
FROM courses c
WHERE s.course_id = c.id AND s.folder_id IS NULL;
