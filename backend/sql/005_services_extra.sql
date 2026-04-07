-- Add columns for church services that were missing
ALTER TABLE services ADD COLUMN IF NOT EXISTS preacher VARCHAR(255);
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS ai_start_time TIME;
ALTER TABLE services ADD COLUMN IF NOT EXISTS ai_end_time TIME;
