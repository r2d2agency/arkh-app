-- Metadados da transcrição para reprocessamento sem buscar no YouTube novamente
ALTER TABLE services ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;
ALTER TABLE services ADD COLUMN IF NOT EXISTS transcription_source TEXT; -- 'youtube_pt' | 'youtube_auto' | 'manual' | etc.
ALTER TABLE services ADD COLUMN IF NOT EXISTS transcription_length INT;
