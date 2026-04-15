-- Enhanced groups: location, meeting schedule, leaders, join requests

ALTER TABLE groups ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS meeting_day VARCHAR(20); -- 'monday','tuesday', etc.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS meeting_time TIME;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS leader1_name VARCHAR(255);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS leader2_name VARCHAR(255);
ALTER TABLE groups ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Join requests
CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending','approved','rejected'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_join_requests_group ON group_join_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user ON group_join_requests(user_id);
