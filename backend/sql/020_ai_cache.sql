-- Cache de respostas da IA para evitar gastar tokens com perguntas repetidas
CREATE TABLE IF NOT EXISTS ai_assistant_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  question_hash VARCHAR(64) NOT NULL, -- SHA-256 da pergunta normalizada
  question_normalized TEXT NOT NULL,
  context_type VARCHAR(50) DEFAULT 'general',
  context_id UUID,
  response TEXT NOT NULL,
  hit_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, question_hash, context_type)
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_lookup ON ai_assistant_cache(church_id, question_hash, context_type);
CREATE INDEX IF NOT EXISTS idx_ai_cache_hits ON ai_assistant_cache(hit_count DESC);

DROP TRIGGER IF EXISTS trg_ai_cache_updated ON ai_assistant_cache;
CREATE TRIGGER trg_ai_cache_updated BEFORE UPDATE ON ai_assistant_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at();
