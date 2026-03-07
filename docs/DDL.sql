-- ============================================================================
-- Micro — Adaptive AI Study Platform
-- Supabase PostgreSQL DDL
-- ============================================================================
-- Covers: auth, workspaces/folders, courses, topics, mastery model, questions,
-- study sets, sessions, FSRS, recommendations, agent/chat, UI state (tabs,
-- favorites, shortcuts, preferences), exams, conflicts, notifications,
-- guided learning, study patterns, and voice Socratic sessions.
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- 1. USER PROFILES
-- ============================================================================
-- Extends Supabase auth.users with app-specific profile data.

CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  full_name       TEXT,
  avatar_url      TEXT,
  phone           TEXT,                                     -- for SMS/call reminders
  timezone        TEXT DEFAULT 'America/Denver',
  onboarded_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- ============================================================================
-- 2. USER PREFERENCES & UI STATE
-- ============================================================================

CREATE TABLE user_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  theme           TEXT CHECK (theme IN ('dark', 'light', 'system')) DEFAULT 'dark',
  sidebar_collapsed BOOLEAN DEFAULT FALSE,
  default_view_mode TEXT CHECK (default_view_mode IN ('list', 'grid')) DEFAULT 'list',
  daily_goal_mins INT DEFAULT 45,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  voice_enabled   BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. WORKSPACES & FOLDERS
-- ============================================================================
-- Hierarchical folder tree for organizing courses and files.
-- Mirrors the "My Workspace" file manager in the frontend.

CREATE TABLE folders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  parent_id       UUID REFERENCES folders(id) ON DELETE CASCADE,  -- NULL = root
  icon            TEXT,                                           -- optional icon identifier
  color           TEXT,                                           -- optional color hex
  sort_order      INT DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,                                   -- bumped on open/study activity
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_folders_user ON folders(user_id);
CREATE INDEX idx_folders_parent ON folders(parent_id);

-- ============================================================================
-- 4. COURSES
-- ============================================================================

CREATE TABLE courses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_id         UUID REFERENCES folders(id) ON DELETE SET NULL,  -- which folder it lives in
  title             TEXT NOT NULL,
  subject           TEXT NOT NULL,
  subject_type      TEXT CHECK (subject_type IN ('stem', 'humanities')) DEFAULT 'stem',
  description       TEXT,
  status            TEXT CHECK (status IN ('processing', 'ready', 'error', 'archived'))
                    DEFAULT 'processing',
  sort_order        INT DEFAULT 0,
  last_accessed_at  TIMESTAMPTZ,                              -- bumped on open/study activity
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_user ON courses(user_id);
CREATE INDEX idx_courses_folder ON courses(folder_id);
CREATE INDEX idx_courses_last_accessed ON courses(user_id, last_accessed_at DESC NULLS LAST);

-- ============================================================================
-- 5. EXAMS
-- ============================================================================
-- First-class entity: a course can have multiple exams (midterm 1, midterm 2,
-- final, quizzes, etc.), each with its own date and scope.

CREATE TABLE exams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  folder_id       UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,  -- linked to exactly one folder
  course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,          -- optional course association
  title           TEXT NOT NULL,                              -- 'Midterm 2', 'Final Exam'
  exam_date       TIMESTAMPTZ NOT NULL,
  scope_topic_ids UUID[],                                     -- which topics are covered
  notes           TEXT,
  weight          FLOAT,                                      -- % of final grade
  location        TEXT,                                       -- room/building
  exam_type       TEXT CHECK (exam_type IN ('midterm', 'final', 'quiz', 'homework', 'project', 'other'))
                  DEFAULT 'midterm',
  predicted_score FLOAT,                                      -- computed by recommendation engine
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_folder ON exams(folder_id);
CREATE INDEX idx_exams_course ON exams(course_id);
CREATE INDEX idx_exams_date ON exams(user_id, exam_date);

-- ============================================================================
-- 6. COURSE FILES
-- ============================================================================

CREATE TABLE course_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  folder_id       UUID REFERENCES folders(id) ON DELETE SET NULL,  -- direct folder placement
  filename        TEXT NOT NULL,
  storage_path    TEXT NOT NULL,                              -- Supabase Storage path
  file_type       TEXT CHECK (file_type IN ('pdf', 'pptx', 'txt', 'md', 'docx', 'png', 'jpg', 'other')),
  file_size_bytes BIGINT,
  mime_type       TEXT,
  processed       BOOLEAN DEFAULT FALSE,
  processing_error TEXT,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_course_files_course ON course_files(course_id);
CREATE INDEX idx_course_files_folder ON course_files(folder_id);

-- ============================================================================
-- 7. TOPICS & TOPIC TREE
-- ============================================================================

CREATE TABLE topics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id             UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  parent_topic_id       UUID REFERENCES topics(id) ON DELETE SET NULL,
  order_index           INT DEFAULT 0,
  difficulty            FLOAT CHECK (difficulty BETWEEN 0 AND 1),
  explanation_quality   FLOAT CHECK (explanation_quality BETWEEN 0 AND 1),
  source_chunks         TEXT[],
  embedding             VECTOR(1536),
  flagged               TEXT CHECK (flagged IN ('exclude', 'pre_mastered', 'needs_attention')),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topics_course ON topics(course_id);
CREATE INDEX idx_topics_parent ON topics(parent_topic_id);
CREATE INDEX idx_topics_embedding ON topics USING ivfflat (embedding vector_cosine_ops);

-- Lesson content generated by the Lesson Plan Agent per topic.
CREATE TABLE topic_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  content_type    TEXT CHECK (content_type IN ('lesson', 'summary', 'worked_example', 'key_definitions'))
                  NOT NULL,
  body            TEXT NOT NULL,                              -- markdown/structured content
  llm_model       TEXT,
  version         INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_topic_content_topic ON topic_content(topic_id);

-- ============================================================================
-- 8. CONTENT CONFLICTS
-- ============================================================================

CREATE TABLE content_conflicts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic_id        UUID REFERENCES topics(id) ON DELETE SET NULL,
  source_a_file   UUID REFERENCES course_files(id) ON DELETE SET NULL,
  source_a_excerpt TEXT NOT NULL,
  source_b_file   UUID REFERENCES course_files(id) ON DELETE SET NULL,
  source_b_excerpt TEXT NOT NULL,
  severity        FLOAT CHECK (severity BETWEEN 0 AND 1),    -- 0 = trivial, 1 = direct contradiction
  resolved        BOOLEAN DEFAULT FALSE,
  resolution_note TEXT,
  detected_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conflicts_course ON content_conflicts(course_id);

-- ============================================================================
-- 9. BAYESIAN KNOWLEDGE MODEL
-- ============================================================================

CREATE TABLE mastery_beliefs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id          UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  p_mastery         FLOAT NOT NULL DEFAULT 0.3
                    CHECK (p_mastery BETWEEN 0.01 AND 0.99),
  attempts          INT DEFAULT 0,
  streak            INT DEFAULT 0,
  last_studied_at   TIMESTAMPTZ,
  last_updated      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

CREATE INDEX idx_mastery_user_topic ON mastery_beliefs(user_id, topic_id);

-- ============================================================================
-- 10. QUESTIONS & ASSESSMENTS
-- ============================================================================

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  type            TEXT CHECK (type IN ('mcq', 'short_answer', 'true_false', 'socratic', 'fill_blank'))
                  NOT NULL,
  prompt          TEXT NOT NULL,
  options         JSONB,                                    -- MCQ choices
  correct_answer  TEXT,
  explanation     TEXT,
  difficulty      FLOAT CHECK (difficulty BETWEEN 0 AND 1),
  quality_score   FLOAT CHECK (quality_score BETWEEN 0 AND 1),
  llm_model       TEXT,
  times_served    INT DEFAULT 0,
  avg_accuracy    FLOAT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_topic ON questions(topic_id);

-- ============================================================================
-- 11. STUDY SESSIONS
-- ============================================================================

CREATE TABLE study_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  session_type    TEXT CHECK (session_type IN (
                    'standard', 'cram', 'spaced_review', 'exam_sim',
                    'guided', 'socratic', 'voice_socratic'
                  )),
  plan            JSONB,                                    -- curriculum agent output
  summary         JSONB,                                    -- post-session stats
  topics_covered  UUID[],
  questions_count INT DEFAULT 0,
  correct_count   INT DEFAULT 0,
  duration_mins   FLOAT
);

CREATE INDEX idx_sessions_user ON study_sessions(user_id, started_at DESC);
CREATE INDEX idx_sessions_course ON study_sessions(course_id);

-- ============================================================================
-- 12. QUESTION ATTEMPTS (audit trail)
-- ============================================================================

CREATE TABLE question_attempts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id          UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  question_id       UUID REFERENCES questions(id) ON DELETE SET NULL,
  session_id        UUID REFERENCES study_sessions(id) ON DELETE SET NULL,
  correct           BOOLEAN NOT NULL,
  confidence        SMALLINT CHECK (confidence BETWEEN 1 AND 3),
  time_taken_ms     INT,
  mastery_before    FLOAT,
  mastery_after     FLOAT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attempts_user_topic ON question_attempts(user_id, topic_id);
CREATE INDEX idx_attempts_session ON question_attempts(session_id);

-- ============================================================================
-- 13. FSRS SPACED REPETITION STATE
-- ============================================================================

CREATE TABLE fsrs_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  stability       FLOAT DEFAULT 1.0,
  difficulty      FLOAT DEFAULT 0.3,
  due_at          TIMESTAMPTZ DEFAULT NOW(),
  last_review     TIMESTAMPTZ,
  review_count    INT DEFAULT 0,
  lapses          INT DEFAULT 0,
  UNIQUE(user_id, topic_id)
);

CREATE INDEX idx_fsrs_due ON fsrs_state(user_id, due_at);

-- ============================================================================
-- 14. STUDY SETS
-- ============================================================================

CREATE TABLE study_sets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT CHECK (type IN ('flashcards', 'cheat_sheet', 'practice_exam'))
                  NOT NULL,
  title           TEXT NOT NULL,
  content         JSONB NOT NULL,
  topic_ids       UUID[],
  card_count      INT,
  mastered_count  INT DEFAULT 0,
  generated_at    TIMESTAMPTZ DEFAULT NOW(),
  last_studied_at TIMESTAMPTZ
);

CREATE INDEX idx_study_sets_course ON study_sets(course_id);
CREATE INDEX idx_study_sets_user ON study_sets(user_id);

-- Per-card progress within a study set. Tracks every card the user has
-- interacted with, so mid-session exits resume exactly where they left off.
CREATE TABLE study_set_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id          UUID NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  card_index      INT NOT NULL,                               -- position in the set's content array
  status          TEXT CHECK (status IN ('unseen', 'seen', 'correct', 'incorrect', 'skipped'))
                  DEFAULT 'unseen',
  ease_rating     SMALLINT CHECK (ease_rating BETWEEN 1 AND 5),  -- self-reported difficulty
  attempts        INT DEFAULT 0,
  last_seen_at    TIMESTAMPTZ,
  UNIQUE(set_id, user_id, card_index)
);

CREATE INDEX idx_set_progress_set ON study_set_progress(set_id, user_id);

-- Tracks each time a user starts/resumes a study set session.
CREATE TABLE study_set_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id          UUID NOT NULL REFERENCES study_sets(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  cards_reviewed  INT DEFAULT 0,
  cards_correct   INT DEFAULT 0,
  resume_index    INT DEFAULT 0,                              -- card index to resume from
  completed       BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_set_sessions_user ON study_set_sessions(user_id, started_at DESC);

-- ============================================================================
-- 15. TOPIC SUPPLEMENTS (web-grounded explanations)
-- ============================================================================

CREATE TABLE topic_supplements (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id              UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  source_url            TEXT,
  summary               TEXT NOT NULL,
  p_mastery_at_trigger  FLOAT,
  expires_at            TIMESTAMPTZ,                         -- 7-day TTL cache
  triggered_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_supplements_topic ON topic_supplements(topic_id);

-- ============================================================================
-- 16. RECOMMENDATION ENGINE
-- ============================================================================

CREATE TABLE study_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  topic_id        UUID REFERENCES topics(id) ON DELETE SET NULL,
  action_type     TEXT CHECK (action_type IN (
                    'review_topic', 'take_quiz', 'socratic_session',
                    'read_supplement', 'generate_set', 'spaced_review',
                    'cram_session', 'voice_socratic', 'exam_sim'
                  )) NOT NULL,
  priority_score  FLOAT,
  reason          TEXT,
  due_date        TIMESTAMPTZ,
  suggested_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_actions_user ON study_actions(user_id, suggested_at DESC);
CREATE INDEX idx_actions_course ON study_actions(course_id);

-- ============================================================================
-- 17. SCHEDULED SESSIONS & REMINDERS
-- ============================================================================

CREATE TABLE scheduled_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  session_type    TEXT CHECK (session_type IN ('standard', 'cram', 'spaced_review', 'guided')),
  duration_mins   INT DEFAULT 45,
  notify          BOOLEAN DEFAULT TRUE,
  reminder_sent   BOOLEAN DEFAULT FALSE,
  status          TEXT CHECK (status IN ('pending', 'started', 'completed', 'missed', 'cancelled'))
                  DEFAULT 'pending',
  session_id      UUID REFERENCES study_sessions(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_user ON scheduled_sessions(user_id, scheduled_at);

-- ============================================================================
-- 18. AGENT RUNS (observability)
-- ============================================================================

CREATE TABLE agent_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  agent_name      TEXT NOT NULL,
  input           JSONB,
  output          JSONB,
  llm_model       TEXT,
  tokens_used     INT,
  latency_ms      INT,
  status          TEXT CHECK (status IN ('success', 'error', 'timeout')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_runs_user ON agent_runs(user_id, created_at DESC);

-- ============================================================================
-- 19. CHAT CONVERSATIONS & MESSAGES
-- ============================================================================
-- Persists the AI chat panel state. Each conversation maps to a thread
-- in the right-hand AI panel.

CREATE TABLE chat_conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES courses(id) ON DELETE SET NULL,
  title           TEXT,                                      -- auto-generated or user-set
  mode            TEXT CHECK (mode IN ('ask', 'act', 'advise')) DEFAULT 'ask',
  pinned          BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON chat_conversations(user_id, updated_at DESC);

CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role            TEXT CHECK (role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
  content         TEXT NOT NULL,
  tool_calls      JSONB,                                     -- agent tool invocations
  tool_results    JSONB,                                     -- tool call outputs
  tokens_used     INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id, created_at);

-- ============================================================================
-- 20. VOICE SOCRATIC SESSIONS
-- ============================================================================

CREATE TABLE socratic_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  topic_id        UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  session_id      UUID REFERENCES study_sessions(id) ON DELETE SET NULL,
  mode            TEXT CHECK (mode IN ('text', 'voice')) DEFAULT 'text',
  turns           JSONB NOT NULL DEFAULT '[]',               -- array of {role, content, timestamp}
  verdict         JSONB,                                     -- {mastery_score, strengths[], gaps[]}
  p_mastery_before FLOAT,
  p_mastery_after FLOAT,
  duration_ms     INT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_socratic_user ON socratic_sessions(user_id, created_at DESC);

-- ============================================================================
-- 21. GUIDED LEARNING SESSIONS
-- ============================================================================

CREATE TABLE guided_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  config          JSONB,                                     -- interval settings, difficulty, etc.
  progress        JSONB,                                     -- current step, topics covered
  status          TEXT CHECK (status IN ('active', 'paused', 'completed', 'abandoned'))
                  DEFAULT 'active'
);

CREATE INDEX idx_guided_user ON guided_sessions(user_id, started_at DESC);

-- ============================================================================
-- 22. UI STATE — OPEN TABS
-- ============================================================================
-- Persists the tab bar state so it survives page reloads and devices.

CREATE TABLE user_tabs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tab_type        TEXT CHECK (tab_type IN (
                    'dashboard', 'workspace', 'course', 'progress',
                    'academics', 'review', 'file', 'chat', 'settings'
                  )) NOT NULL,
  label           TEXT NOT NULL,
  path            TEXT NOT NULL,                              -- route path or resource identifier
  context         JSONB,                                      -- extra state (folder path, course id, scroll pos, etc.)
  sort_order      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT FALSE,
  is_pinned       BOOLEAN DEFAULT FALSE,
  is_modified     BOOLEAN DEFAULT FALSE,
  opened_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tabs_user ON user_tabs(user_id, sort_order);

-- ============================================================================
-- 23. UI STATE — FAVORITES
-- ============================================================================

CREATE TABLE favorites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type     TEXT CHECK (target_type IN ('course', 'folder', 'topic', 'study_set', 'file'))
                  NOT NULL,
  target_id       UUID NOT NULL,
  label           TEXT NOT NULL,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id, sort_order);

-- ============================================================================
-- 24. UI STATE — QUICK ACTION SHORTCUTS
-- ============================================================================

CREATE TABLE user_shortcuts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  action_type     TEXT NOT NULL,                              -- maps to a frontend action/route
  action_payload  JSONB,                                      -- params for the action
  icon            TEXT,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shortcuts_user ON user_shortcuts(user_id, sort_order);

-- ============================================================================
-- 25. UI STATE — CURRENT FOLDER / WORKSPACE STATE
-- ============================================================================
-- Persists the user's current position in the workspace file manager.

CREATE TABLE workspace_state (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  current_folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  view_mode       TEXT CHECK (view_mode IN ('list', 'grid')) DEFAULT 'list',
  sort_field      TEXT DEFAULT 'name',
  sort_asc        BOOLEAN DEFAULT TRUE,
  expanded_folders UUID[],                                    -- folder IDs currently expanded
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 26. NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type            TEXT CHECK (type IN (
                    'session_reminder', 'exam_approaching', 'mastery_drop',
                    'supplement_ready', 'pipeline_complete', 'conflict_detected',
                    'streak_milestone', 'review_due', 'general'
                  )) NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT,
  action_url      TEXT,                                      -- deep link into the app
  read            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ============================================================================
-- 27. STUDY PATTERNS (analytics)
-- ============================================================================

CREATE TABLE study_patterns (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  course_id           UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  minutes_studied     INT DEFAULT 0,
  session_count       INT DEFAULT 0,
  avg_session_mins    FLOAT,
  peak_hour           SMALLINT,
  questions_answered  INT DEFAULT 0,
  accuracy_rate       FLOAT,
  avg_confidence      FLOAT,
  topics_reviewed     INT DEFAULT 0,
  UNIQUE(user_id, course_id, date)
);

CREATE INDEX idx_patterns_user_date ON study_patterns(user_id, date DESC);

-- ============================================================================
-- 28. ROW LEVEL SECURITY (Supabase RLS)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mastery_beliefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fsrs_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_set_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_set_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE socratic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guided_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_patterns ENABLE ROW LEVEL SECURITY;

-- Policies: users can only access their own data.
-- Tables with direct user_id column:

CREATE POLICY "Users own their profile"
  ON profiles FOR ALL USING (id = auth.uid());

CREATE POLICY "Users own their preferences"
  ON user_preferences FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their folders"
  ON folders FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their courses"
  ON courses FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their exams"
  ON exams FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users access their course files"
  ON course_files FOR ALL USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users access their topics"
  ON topics FOR ALL USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users access their topic content"
  ON topic_content FOR ALL USING (
    topic_id IN (
      SELECT t.id FROM topics t
      JOIN courses c ON t.course_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users access their conflicts"
  ON content_conflicts FOR ALL USING (
    course_id IN (SELECT id FROM courses WHERE user_id = auth.uid())
  );

CREATE POLICY "Users own their mastery"
  ON mastery_beliefs FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users access their questions"
  ON questions FOR ALL USING (
    topic_id IN (
      SELECT t.id FROM topics t
      JOIN courses c ON t.course_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users own their sessions"
  ON study_sessions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their attempts"
  ON question_attempts FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their fsrs state"
  ON fsrs_state FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their study sets"
  ON study_sets FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their set progress"
  ON study_set_progress FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their set sessions"
  ON study_set_sessions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users access their supplements"
  ON topic_supplements FOR ALL USING (
    topic_id IN (
      SELECT t.id FROM topics t
      JOIN courses c ON t.course_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users own their study actions"
  ON study_actions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their scheduled sessions"
  ON scheduled_sessions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their agent runs"
  ON agent_runs FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their conversations"
  ON chat_conversations FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users access their messages"
  ON chat_messages FOR ALL USING (
    conversation_id IN (SELECT id FROM chat_conversations WHERE user_id = auth.uid())
  );

CREATE POLICY "Users own their socratic sessions"
  ON socratic_sessions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their guided sessions"
  ON guided_sessions FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their tabs"
  ON user_tabs FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their favorites"
  ON favorites FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their shortcuts"
  ON user_shortcuts FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their workspace state"
  ON workspace_state FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their notifications"
  ON notifications FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users own their study patterns"
  ON study_patterns FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- 29. HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_folders_updated_at BEFORE UPDATE ON folders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_exams_updated_at BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_topics_updated_at BEFORE UPDATE ON topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_conversations_updated_at BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile + preferences on Supabase auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  INSERT INTO user_preferences (user_id) VALUES (NEW.id);
  INSERT INTO workspace_state (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 30. SUPABASE REALTIME
-- ============================================================================
-- Enable realtime for tables that push live updates to the frontend.

ALTER PUBLICATION supabase_realtime ADD TABLE mastery_beliefs;
ALTER PUBLICATION supabase_realtime ADD TABLE topic_supplements;
ALTER PUBLICATION supabase_realtime ADD TABLE courses;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE study_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE content_conflicts;
