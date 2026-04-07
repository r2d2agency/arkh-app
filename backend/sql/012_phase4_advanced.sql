-- Phase 4: Advanced (Escola Bíblica, Onboarding, Audio Progress, PWA)

-- ========== ESCOLA BÍBLICA (Bible School) ==========

-- Classes (turmas)
CREATE TABLE IF NOT EXISTS school_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(100), -- 'children','youth','adults','new_members','leaders'
  schedule VARCHAR(500), -- e.g. "Domingos 9h"
  max_students INT,
  is_active BOOLEAN DEFAULT true,
  starts_at DATE,
  ends_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons (aulas de cada classe)
CREATE TABLE IF NOT EXISTS school_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content TEXT, -- rich content / markdown
  key_verse VARCHAR(500),
  resources JSONB DEFAULT '[]', -- [{type:'pdf',url:'...',label:'...'}]
  sort_order INT DEFAULT 0,
  lesson_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments (matrículas)
CREATE TABLE IF NOT EXISTS school_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'enrolled', -- 'enrolled','completed','dropped'
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, user_id)
);

-- Attendance (presença por aula)
CREATE TABLE IF NOT EXISTS school_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES school_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  present BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, user_id)
);

-- ========== ONBOARDING ==========

-- Spiritual interests and onboarding data
CREATE TABLE IF NOT EXISTS user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  spiritual_interests TEXT[] DEFAULT '{}', -- ['prayer','worship','study','community','missions']
  experience_level VARCHAR(50), -- 'new_believer','growing','mature','leader'
  preferred_topics TEXT[] DEFAULT '{}', -- ['old_testament','new_testament','theology','family','leadership']
  how_found VARCHAR(200),
  goals TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== AUDIO / VIDEO PROGRESS ==========

CREATE TABLE IF NOT EXISTS media_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  current_time REAL DEFAULT 0, -- seconds
  duration REAL DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_played_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_id)
);

-- ========== FAVORITES ==========

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type VARCHAR(30) NOT NULL, -- 'service','study','lesson'
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_type, content_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_classes_church ON school_classes(church_id);
CREATE INDEX IF NOT EXISTS idx_school_lessons_class ON school_lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_school_enrollments_class ON school_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_school_enrollments_user ON school_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_school_attendance_lesson ON school_attendance(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_media_progress_user ON media_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_media_progress_service ON media_progress(service_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
