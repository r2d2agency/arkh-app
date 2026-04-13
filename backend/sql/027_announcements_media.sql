-- Announcements: add media, video, event_date, event_time columns
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS event_date DATE;
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS event_time TIME;
