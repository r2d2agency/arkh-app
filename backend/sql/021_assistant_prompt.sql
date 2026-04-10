-- Prompt complementar do assistente de IA por igreja (doutrina, descrição, contexto)
ALTER TABLE churches ADD COLUMN IF NOT EXISTS ai_assistant_prompt TEXT;
