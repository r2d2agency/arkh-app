-- PIX keys for offerings and tithes
ALTER TABLE churches ADD COLUMN IF NOT EXISTS pix_key_type VARCHAR(20);
ALTER TABLE churches ADD COLUMN IF NOT EXISTS pix_key VARCHAR(255);
ALTER TABLE churches ADD COLUMN IF NOT EXISTS pix_beneficiary VARCHAR(255);
ALTER TABLE churches ADD COLUMN IF NOT EXISTS pix_enabled BOOLEAN DEFAULT false;
