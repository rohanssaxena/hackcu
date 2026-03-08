-- Add tool_calls and tool_results columns to chat_messages for agent tool use
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS tool_calls JSONB,
  ADD COLUMN IF NOT EXISTS tool_results JSONB;
