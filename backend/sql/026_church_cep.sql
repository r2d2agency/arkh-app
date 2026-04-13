-- Add CEP column to churches
ALTER TABLE churches ADD COLUMN IF NOT EXISTS cep VARCHAR(10);
