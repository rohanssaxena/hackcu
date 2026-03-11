-- Create question_attempts table
CREATE TABLE IF NOT EXISTS question_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  correct BOOLEAN NOT NULL,
  confidence SMALLINT CHECK (confidence BETWEEN 1 AND 3),
  time_taken_ms INT,
  mastery_before FLOAT,
  mastery_after FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON question_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_question_id ON question_attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_question_attempts_created_at ON question_attempts(created_at);
