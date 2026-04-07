-- AI Agents
CREATE TABLE IF NOT EXISTS ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  role VARCHAR(100) NOT NULL,
  provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
  system_prompt TEXT,
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INT DEFAULT 2048,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_provider ON ai_agents(provider_id);

DROP TRIGGER IF EXISTS trg_agents_updated ON ai_agents;
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
