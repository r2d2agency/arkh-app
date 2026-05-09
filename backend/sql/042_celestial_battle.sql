-- Celestial Battle (Batalha Celestial) - PvP assíncrono via banco
CREATE TABLE IF NOT EXISTS celestial_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'waiting', -- waiting | playing | finished
  turn_user_id UUID REFERENCES users(id),
  winner_user_id UUID REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_action_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS celestial_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES celestial_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(120),
  avatar_url TEXT,
  units_json JSONB NOT NULL DEFAULT '[]'::jsonb,    -- own fleet with placements + hits
  shots_json JSONB NOT NULL DEFAULT '[]'::jsonb,    -- shots fired on opponent: [{idx,state,unit_key?}]
  reveals_json JSONB NOT NULL DEFAULT '[]'::jsonb,  -- cells revealed by miracle cards on opponent
  cards_json JSONB NOT NULL DEFAULT '[]'::jsonb,    -- remaining cards
  psalm_shield BOOLEAN DEFAULT false,
  mana_boost BOOLEAN DEFAULT false,
  score INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_celestial_rooms_church ON celestial_rooms(church_id);
CREATE INDEX IF NOT EXISTS idx_celestial_rooms_status ON celestial_rooms(status);
CREATE INDEX IF NOT EXISTS idx_celestial_rooms_code ON celestial_rooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_celestial_players_room ON celestial_players(room_id);
CREATE INDEX IF NOT EXISTS idx_celestial_players_user ON celestial_players(user_id);
