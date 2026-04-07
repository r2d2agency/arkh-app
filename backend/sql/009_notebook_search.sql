-- Migration: Add note_type and service_id reference to study_notes
-- study_notes table already exists in 001_schema.sql
ALTER TABLE study_notes ADD COLUMN IF NOT EXISTS title VARCHAR(500);
ALTER TABLE study_notes ADD COLUMN IF NOT EXISTS note_type VARCHAR(50) DEFAULT 'note';
ALTER TABLE study_notes ADD COLUMN IF NOT EXISTS verse_reference TEXT;
ALTER TABLE study_notes ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_study_notes_user ON study_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_notes_type ON study_notes(note_type);

-- Full text search index on services AI fields
CREATE INDEX IF NOT EXISTS idx_services_ai_summary_gin ON services USING gin(to_tsvector('portuguese', COALESCE(ai_summary, '')));
