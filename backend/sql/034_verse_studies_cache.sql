-- Cache de estudos de versículos bíblicos para economizar tokens de IA
CREATE TABLE IF NOT EXISTS bible_verse_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_index INT NOT NULL,          -- índice do livro (0-65)
  book_name VARCHAR(50) NOT NULL,
  chapter INT NOT NULL,
  verse INT,                         -- NULL = estudo do capítulo inteiro
  difficulty VARCHAR(10) NOT NULL DEFAULT 'easy', -- easy, medium, expert
  study_content TEXT NOT NULL,
  summary TEXT,                      -- resumo curto
  key_points JSONB,                  -- pontos-chave
  cross_references JSONB,            -- referências cruzadas
  practical_application TEXT,
  hit_count INT DEFAULT 1,
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_index, chapter, verse, difficulty, church_id)
);

-- Cache global (church_id NULL) para estudos genéricos reutilizáveis
CREATE INDEX IF NOT EXISTS idx_verse_study_lookup 
  ON bible_verse_studies(book_index, chapter, verse, difficulty);
CREATE INDEX IF NOT EXISTS idx_verse_study_church 
  ON bible_verse_studies(church_id, book_index, chapter);
CREATE INDEX IF NOT EXISTS idx_verse_study_hits 
  ON bible_verse_studies(hit_count DESC);

DROP TRIGGER IF EXISTS trg_verse_study_updated ON bible_verse_studies;
CREATE TRIGGER trg_verse_study_updated 
  BEFORE UPDATE ON bible_verse_studies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
