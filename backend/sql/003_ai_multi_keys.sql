-- Migration: Add support for multiple API keys per AI provider
-- Run this on your database

-- Add array column for multiple keys
ALTER TABLE ai_providers ADD COLUMN IF NOT EXISTS api_keys_encrypted TEXT[] DEFAULT '{}';

-- Migrate existing single key to array
UPDATE ai_providers
SET api_keys_encrypted = ARRAY[api_key_encrypted]
WHERE api_key_encrypted IS NOT NULL AND api_key_encrypted != ''
  AND (api_keys_encrypted IS NULL OR api_keys_encrypted = '{}');

-- Optionally drop old column after confirming migration
-- ALTER TABLE ai_providers DROP COLUMN IF EXISTS api_key_encrypted;
