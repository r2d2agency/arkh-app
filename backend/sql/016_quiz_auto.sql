-- Quiz auto-generation support
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS generated_week DATE;

-- Per-church setting for auto quiz generation
ALTER TABLE churches ADD COLUMN IF NOT EXISTS auto_quiz_enabled BOOLEAN DEFAULT true;
