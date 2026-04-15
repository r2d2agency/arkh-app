-- Batalha Bíblica - PvP & Solo Game

CREATE TABLE IF NOT EXISTS battle_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL DEFAULT 'solo', -- solo, pvp
  difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, finished
  max_players INT DEFAULT 2,
  invite_code VARCHAR(10),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS battle_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES battle_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  is_ai BOOLEAN DEFAULT false,
  ai_difficulty VARCHAR(20),
  display_name VARCHAR(100),
  avatar_url TEXT,
  score INT DEFAULT 0,
  combo INT DEFAULT 0,
  max_combo INT DEFAULT 0,
  correct_answers INT DEFAULT 0,
  total_answers INT DEFAULT 0,
  xp_earned INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  placement INT,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES battle_rooms(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  bible_reference VARCHAR(200),
  explanation TEXT,
  option_a VARCHAR(500) NOT NULL,
  option_b VARCHAR(500) NOT NULL,
  option_c VARCHAR(500) NOT NULL,
  option_d VARCHAR(500) NOT NULL,
  correct_option CHAR(1) NOT NULL, -- a, b, c, d
  question_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS battle_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES battle_rooms(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES battle_questions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES battle_players(id) ON DELETE CASCADE,
  selected_option CHAR(1), -- a, b, c, d or null (skipped)
  is_correct BOOLEAN DEFAULT false,
  time_ms INT DEFAULT 0,
  points_awarded INT DEFAULT 0,
  power_used VARCHAR(30),
  answered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS battle_powers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES battle_players(id) ON DELETE CASCADE,
  power_type VARCHAR(30) NOT NULL, -- skip, freeze, double, eliminate
  used_at_question INT,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battle_rooms_church ON battle_rooms(church_id);
CREATE INDEX IF NOT EXISTS idx_battle_players_room ON battle_players(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_players_user ON battle_players(user_id);
CREATE INDEX IF NOT EXISTS idx_battle_questions_room ON battle_questions(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_room ON battle_answers(room_id);
