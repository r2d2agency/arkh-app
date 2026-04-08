-- Quiz auto-generation support
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS generated_week DATE; -- week the quiz was generated for

-- Church setting for auto quiz generation
INSERT INTO settings (key, value) VALUES ('auto_quiz_enabled', 'true') ON CONFLICT (key) DO NOTHING;
