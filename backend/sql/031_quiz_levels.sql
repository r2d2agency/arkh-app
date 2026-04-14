-- Phase system for quiz levels
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS phase_level INT DEFAULT 1;

-- Track user's accumulated game points
CREATE TABLE IF NOT EXISTS user_game_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  total_points INT DEFAULT 0,
  current_level INT DEFAULT 1,
  quizzes_completed INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, church_id)
);

CREATE INDEX IF NOT EXISTS idx_user_game_points_user ON user_game_points(user_id, church_id);

-- Column to mark quizzes as personal challenge quizzes
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_challenge BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS challenge_user_id UUID REFERENCES users(id);
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS challenge_level INT DEFAULT 1;
