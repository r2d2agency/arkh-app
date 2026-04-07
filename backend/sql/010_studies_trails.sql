-- Bible Studies (created by church admin)
CREATE TABLE IF NOT EXISTS bible_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  objective TEXT,
  key_verse TEXT,
  base_reading TEXT,
  introduction TEXT,
  topics JSONB DEFAULT '[]',
  application TEXT,
  questions JSONB DEFAULT '[]',
  conclusion TEXT,
  attachments JSONB DEFAULT '[]',
  linked_service_ids UUID[] DEFAULT '{}',
  category VARCHAR(100),
  is_published BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bible_studies_church ON bible_studies(church_id);

DROP TRIGGER IF EXISTS trg_bible_studies_updated ON bible_studies;
CREATE TRIGGER trg_bible_studies_updated BEFORE UPDATE ON bible_studies FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Study Trails (sequences of studies/services)
CREATE TABLE IF NOT EXISTS study_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  objective TEXT,
  cover_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_trails_church ON study_trails(church_id);

DROP TRIGGER IF EXISTS trg_study_trails_updated ON study_trails;
CREATE TRIGGER trg_study_trails_updated BEFORE UPDATE ON study_trails FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trail items (ordered content in a trail)
CREATE TABLE IF NOT EXISTS trail_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID REFERENCES study_trails(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'study' or 'service'
  study_id UUID REFERENCES bible_studies(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trail_items_trail ON trail_items(trail_id);

-- User progress on trails
CREATE TABLE IF NOT EXISTS trail_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trail_id UUID REFERENCES study_trails(id) ON DELETE CASCADE,
  item_id UUID REFERENCES trail_items(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_trail_progress_user ON trail_progress(user_id);

-- User progress on individual studies
CREATE TABLE IF NOT EXISTS study_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  study_id UUID REFERENCES bible_studies(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, study_id)
);
