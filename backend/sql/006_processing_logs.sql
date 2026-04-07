-- Processing logs for AI service processing
ALTER TABLE services ADD COLUMN IF NOT EXISTS processing_logs JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS processing_error TEXT;
