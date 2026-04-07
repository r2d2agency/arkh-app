-- Add provider_id to services so admin can choose which AI to use per service
ALTER TABLE services ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL;

-- Add custom AI prompt to churches settings
ALTER TABLE churches ADD COLUMN IF NOT EXISTS ai_prompt_template TEXT;

-- Add temperature and max_tokens overrides per church
ALTER TABLE churches ADD COLUMN IF NOT EXISTS ai_temperature DECIMAL(3,2);
ALTER TABLE churches ADD COLUMN IF NOT EXISTS ai_max_tokens INT;
