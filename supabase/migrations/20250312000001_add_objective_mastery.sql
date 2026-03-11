-- Add objective mastery tracking to content_nodes table
-- This migration adds a JSONB column to store Bayesian mastery data per objective

ALTER TABLE content_nodes ADD COLUMN mastery JSONB DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX idx_content_nodes_mastery ON content_nodes USING gin(mastery);

-- Add RLS policy for mastery column
CREATE POLICY "Users can access their own content node mastery"
  ON content_nodes FOR SELECT USING (
    folder_id IN (
      SELECT id FROM folders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own content node mastery"
  ON content_nodes FOR UPDATE USING (
    folder_id IN (
      SELECT id FROM folders WHERE user_id = auth.uid()
    )
  );

-- Example mastery structure:
-- {
--   "objective_1": {
--     "alpha": 1.0,
--     "beta": 1.0,
--     "last_practiced": "2025-03-09T19:00:00Z",
--     "confidence_history": [0.8, 0.9, 0.7],
--     "response_times": [1200, 1500, 1800],
--     "attempts": 3
--   },
--   "objective_2": { ... }
-- }
