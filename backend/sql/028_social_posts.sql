-- Social media post generator: track daily usage per member
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  verse_text TEXT,
  verse_reference VARCHAR(100),
  custom_text TEXT,
  template_id VARCHAR(50) NOT NULL DEFAULT 'classic',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_posts_user_date ON social_posts(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_social_posts_church ON social_posts(church_id);
