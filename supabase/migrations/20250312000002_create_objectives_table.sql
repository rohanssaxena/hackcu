-- Create objectives table with Bayesian mastery tracking
-- This provides both full Bayesian benefits and simple current progress display

-- First, create the objectives table if it doesn't exist
CREATE TABLE IF NOT EXISTS objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_node_id UUID NOT NULL REFERENCES content_nodes(id) ON DELETE CASCADE,
  objective TEXT NOT NULL,
  weight INT DEFAULT 5 CHECK (weight BETWEEN 1 AND 10),
  checkpoints UUID[] DEFAULT '{}',
  
  -- Bayesian parameters for sophisticated tracking
  alpha FLOAT DEFAULT 1.0,
  beta FLOAT DEFAULT 1.0,
  
  -- Current progress level (calculated from alpha/beta)
  mastery_level FLOAT DEFAULT 0.0 CHECK (mastery_level BETWEEN 0 AND 1),
  
  -- Metadata for analytics and spaced repetition
  attempts INT DEFAULT 0,
  last_practiced TIMESTAMPTZ,
  confidence_score FLOAT DEFAULT 0.0 CHECK (confidence_score BETWEEN 0 AND 1),
  
  -- DKT integration fields
  dkt_prediction FLOAT DEFAULT 0.0 CHECK (dkt_prediction BETWEEN 0 AND 1),
  hybrid_mastery FLOAT DEFAULT 0.0 CHECK (hybrid_mastery BETWEEN 0 AND 1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(content_node_id, objective)
);

-- Add indexes for performance
CREATE INDEX idx_objectives_content_node ON objectives(content_node_id);
CREATE INDEX idx_objectives_mastery ON objectives(mastery_level);
CREATE INDEX idx_objectives_last_practiced ON objectives(last_practiced);
CREATE INDEX idx_objectives_hybrid ON objectives(hybrid_mastery);

-- Enable RLS
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own objectives"
  ON objectives FOR SELECT USING (
    content_node_id IN (
      SELECT id FROM content_nodes 
      WHERE folder_id IN (
        SELECT id FROM folders WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own objectives"
  ON objectives FOR UPDATE USING (
    content_node_id IN (
      SELECT id FROM content_nodes 
      WHERE folder_id IN (
        SELECT id FROM folders WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their own objectives"
  ON objectives FOR INSERT WITH CHECK (
    content_node_id IN (
      SELECT id FROM content_nodes 
      WHERE folder_id IN (
        SELECT id FROM folders WHERE user_id = auth.uid()
      )
    )
  );

-- Migration: Move objectives from content_nodes.objectives JSON to this table
-- This will be run once to migrate existing data
CREATE OR REPLACE FUNCTION migrate_objectives_from_content_nodes()
RETURNS void AS $$
DECLARE
  content_node RECORD;
  objective_data JSON;
  objective_id TEXT;
BEGIN
  -- Loop through all content nodes that have objectives in JSON
  FOR content_node IN 
    SELECT id, objectives 
    FROM content_nodes 
    WHERE objectives IS NOT NULL 
    AND jsonb_typeof(objectives) = 'array'
  LOOP
    -- Loop through each objective in the JSON array
    FOR i IN 0..jsonb_array_length(content_node.objectives) - 1 LOOP
      objective_data := content_node.objectives -> i;
      objective_id := (objective_data ->> 'id');
      
      -- Insert into objectives table
      INSERT INTO objectives (
        content_node_id,
        objective_id,
        objective,
        weight,
        checkpoints,
        alpha,
        beta,
        mastery_level,
        attempts,
        created_at,
        updated_at
      ) VALUES (
        content_node.id,
        objective_id,
        objective_data ->> 'objective',
        COALESCE((objective_data ->> 'weight')::INT, 5),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(objective_data -> 'checkpoints')), ARRAY[]::UUID[]),
        1.0, -- alpha
        1.0, -- beta
        0.0, -- mastery_level
        0,   -- attempts
        NOW(),
        NOW()
      )
      ON CONFLICT (content_node_id, objective) DO UPDATE SET
        weight = EXCLUDED.weight,
        checkpoints = EXCLUDED.checkpoints,
        updated_at = NOW();
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Uncomment to run migration (run once, then comment out)
-- SELECT migrate_objectives_from_content_nodes();
