-- Status individual por etapa do processamento da pregação
-- Permite que cada etapa (transcrição, resumo, versículos, pontos-chave) seja executada e
-- rastreada separadamente. Cada chave: 'pending' | 'processing' | 'completed' | 'error'
ALTER TABLE services ADD COLUMN IF NOT EXISTS processing_stages JSONB DEFAULT '{}'::jsonb;

-- Backfill: cultos com transcrição já recebem stage transcribe='completed'
UPDATE services SET processing_stages = jsonb_set(
  COALESCE(processing_stages, '{}'::jsonb),
  '{transcribe}', '"completed"'::jsonb
) WHERE transcription IS NOT NULL AND length(transcription) > 200
  AND (processing_stages->>'transcribe') IS NULL;

-- Backfill: cultos com ai_summary preenchido recebem stage summary='completed' etc.
UPDATE services SET processing_stages = processing_stages
  || jsonb_build_object('summary', 'completed')
  WHERE ai_summary IS NOT NULL AND ai_summary <> '' AND (processing_stages->>'summary') IS NULL;

UPDATE services SET processing_stages = processing_stages
  || jsonb_build_object('verses', 'completed')
  WHERE ai_key_verses IS NOT NULL AND ai_key_verses::text NOT IN ('null','[]','""')
    AND (processing_stages->>'verses') IS NULL;

UPDATE services SET processing_stages = processing_stages
  || jsonb_build_object('keypoints', 'completed')
  WHERE ai_topics IS NOT NULL AND ai_topics::text NOT IN ('null','[]','""','{}')
    AND (processing_stages->>'keypoints') IS NULL;
