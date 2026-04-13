-- Add time markers for YouTube segment playback
ALTER TABLE worship_songs ADD COLUMN IF NOT EXISTS start_time INTEGER DEFAULT 0;
ALTER TABLE worship_songs ADD COLUMN IF NOT EXISTS end_time INTEGER;

-- Worship favorites with user ordering
CREATE TABLE IF NOT EXISTS worship_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES worship_songs(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);
CREATE INDEX IF NOT EXISTS idx_worship_favorites_user ON worship_favorites(user_id, position);
