-- Worship songs / Louvores
CREATE TABLE IF NOT EXISTS worship_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL,
  artist VARCHAR(300),
  composer VARCHAR(500),
  category VARCHAR(100) DEFAULT 'Adoração',
  youtube_url TEXT,
  lyrics TEXT,
  chords TEXT,
  bpm INTEGER,
  tone VARCHAR(10),
  tags TEXT[],
  ai_identified BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worship_songs_church ON worship_songs(church_id);
CREATE INDEX IF NOT EXISTS idx_worship_songs_category ON worship_songs(church_id, category);
