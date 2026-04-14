-- Church image gallery for story backgrounds
CREATE TABLE IF NOT EXISTS church_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_church_gallery_church ON church_gallery(church_id);
