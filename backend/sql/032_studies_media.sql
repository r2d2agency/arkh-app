-- Add media fields to bible_studies
ALTER TABLE bible_studies ADD COLUMN IF NOT EXISTS pdf_url TEXT;
ALTER TABLE bible_studies ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE bible_studies ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
