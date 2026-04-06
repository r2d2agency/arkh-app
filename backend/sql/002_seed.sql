-- Seed: Default plan + Super Admin
INSERT INTO plans (name, price, interval, max_members, max_ai_tokens, features)
VALUES ('Gratuito', 0, 'monthly', 50, 10000, '["transcription","basic_ai"]')
ON CONFLICT DO NOTHING;

-- Super Admin (password: arkhe@2026)
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'admin@arkhe.app',
  '$2a$12$LJ3hFgN1rPD0v5rKBGZGxOZ1V1YB6V0xP5r3YVG9R5z3KhMnO5Iry',
  'Super Admin',
  'super_admin'
) ON CONFLICT (email) DO NOTHING;

-- Default settings
INSERT INTO system_settings (key, value) VALUES
  ('domain', '"arkhe.app"'),
  ('pwa_per_church', 'true'),
  ('service_worker', 'true'),
  ('push_notifications', 'true'),
  ('email_notifications', 'false')
ON CONFLICT (key) DO NOTHING;
