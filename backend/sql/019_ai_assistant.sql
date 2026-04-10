-- AI Assistant module: usage tracking and plan-based control

-- Church-level AI assistant toggle (stored in church settings JSONB, but we add explicit columns for clarity)
ALTER TABLE churches ADD COLUMN IF NOT EXISTS ai_assistant_enabled BOOLEAN DEFAULT false;

-- Plan-level AI assistant limits
ALTER TABLE plans ADD COLUMN IF NOT EXISTS ai_assistant_enabled BOOLEAN DEFAULT false;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS ai_assistant_daily_limit INT DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS ai_assistant_max_tokens_per_msg INT DEFAULT 2000;

-- AI Assistant conversations
CREATE TABLE IF NOT EXISTS ai_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  context_type VARCHAR(50) DEFAULT 'general', -- general, service, study, notebook
  context_id UUID, -- optional reference to service_id, study_id, etc.
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Assistant messages
CREATE TABLE IF NOT EXISTS ai_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES ai_assistant_conversations(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily usage tracking per user
CREATE TABLE IF NOT EXISTS ai_assistant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  interactions_count INT DEFAULT 0,
  tokens_used INT DEFAULT 0,
  UNIQUE(user_id, usage_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_church ON ai_assistant_conversations(church_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_assistant_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_church ON ai_assistant_usage(church_id);

-- Triggers
DROP TRIGGER IF EXISTS trg_ai_conversations_updated ON ai_assistant_conversations;
CREATE TRIGGER trg_ai_conversations_updated BEFORE UPDATE ON ai_assistant_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
