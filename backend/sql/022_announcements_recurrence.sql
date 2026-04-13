-- Announcements / Mural
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(500) NOT NULL,
  body TEXT,
  image_url TEXT,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  notify_members BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_church ON announcements(church_id);

-- Events table: add recurrence support
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_rule VARCHAR(100); -- 'weekly', 'biweekly', 'monthly'
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_until DATE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Notifications: add church_id and data column for richer notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES churches(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_notifications_church ON notifications(church_id);

-- Notes: allow linking/unlinking service later
-- study_notes already has service_id, just ensure we can update it
