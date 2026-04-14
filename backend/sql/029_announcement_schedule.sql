-- Announcements: add recurrence/schedule columns
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20); -- 'weekly', null
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS recurrence_day INTEGER; -- 0=Sun..6=Sat
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS recurrence_time TIME DEFAULT '09:00';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;
