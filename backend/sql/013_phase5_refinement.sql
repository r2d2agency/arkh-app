-- Phase 5: Refinement + School Enrollment Approval

-- ========== SCHOOL ENROLLMENT APPROVAL ==========
-- Add enrollment_status to track pending/approved/rejected
ALTER TABLE school_enrollments ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE school_enrollments ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE school_enrollments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
-- status already exists: 'enrolled','completed','dropped' — add 'pending','rejected'

-- ========== DEVOTIONAL CACHE ==========
CREATE TABLE IF NOT EXISTS daily_devotionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  devotional_date DATE NOT NULL,
  verse TEXT NOT NULL,
  verse_reference VARCHAR(200) NOT NULL,
  reflection TEXT NOT NULL,
  based_on_service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, devotional_date)
);

CREATE INDEX IF NOT EXISTS idx_devotionals_church_date ON daily_devotionals(church_id, devotional_date DESC);

-- ========== PERSONALIZED SUGGESTIONS LOG ==========
CREATE TABLE IF NOT EXISTS user_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(30) NOT NULL,
  content_id UUID NOT NULL,
  reason TEXT,
  seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suggestions_user ON user_suggestions(user_id);
