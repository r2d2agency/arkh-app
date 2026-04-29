-- Bible Content Storage
CREATE TABLE IF NOT EXISTS bible_books (
  id SERIAL PRIMARY KEY,
  testament VARCHAR(20) NOT NULL, -- 'Old' or 'New'
  name VARCHAR(50) NOT NULL,
  abbreviation VARCHAR(10) NOT NULL,
  chapters_count INTEGER NOT NULL,
  book_index INTEGER UNIQUE NOT NULL -- 1-66
);

CREATE TABLE IF NOT EXISTS bible_verses (
  id BIGSERIAL PRIMARY KEY,
  book_index INTEGER REFERENCES bible_books(book_index),
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  text TEXT NOT NULL,
  version VARCHAR(20) DEFAULT 'AA', -- Almeida Atualizada or similar
  UNIQUE(book_index, chapter, verse, version)
);

CREATE INDEX IF NOT EXISTS idx_bible_verses_lookup ON bible_verses(book_index, chapter);

-- User Bible Interaction (Highlights & Bookmarks)
CREATE TABLE IF NOT EXISTS user_bible_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_index INTEGER NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  color VARCHAR(20) DEFAULT 'yellow', -- yellow, blue, green, pink
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_index, chapter, verse)
);

-- Seed basic book data
INSERT INTO bible_books (testament, name, abbreviation, chapters_count, book_index) VALUES
('Old', 'Gênesis', 'Gn', 50, 1),
('Old', 'Êxodo', 'Êx', 40, 2),
('Old', 'Levítico', 'Lv', 27, 3),
('Old', 'Números', 'Nm', 36, 4),
('Old', 'Deuteronômio', 'Dt', 34, 5),
('Old', 'Josué', 'Js', 24, 6),
('Old', 'Juízes', 'Jz', 21, 7),
('Old', 'Rute', 'Rt', 4, 8),
('Old', '1 Samuel', '1Sm', 31, 9),
('Old', '2 Samuel', '2Sm', 24, 10),
('Old', '1 Reis', '1Rs', 22, 11),
('Old', '2 Reis', '2Rs', 25, 12),
('Old', '1 Crônicas', '1Cr', 29, 13),
('Old', '2 Crônicas', '2Cr', 36, 14),
('Old', 'Esdras', 'Ed', 10, 15),
('Old', 'Neemias', 'Ne', 13, 16),
('Old', 'Ester', 'Et', 10, 17),
('Old', 'Jó', 'Jó', 42, 18),
('Old', 'Salmos', 'Sl', 150, 19),
('Old', 'Provérbios', 'Pv', 31, 20),
('Old', 'Eclesiastes', 'Ec', 12, 21),
('Old', 'Cantares', 'Ct', 8, 22),
('Old', 'Isaías', 'Is', 66, 23),
('Old', 'Jeremias', 'Jr', 52, 24),
('Old', 'Lamentações', 'Lm', 5, 25),
('Old', 'Ezequiel', 'Ez', 48, 26),
('Old', 'Daniel', 'Dn', 12, 27),
('Old', 'Oseias', 'Os', 14, 28),
('Old', 'Joel', 'Jl', 3, 29),
('Old', 'Amós', 'Am', 9, 30),
('Old', 'Obadias', 'Ob', 1, 31),
('Old', 'Jonas', 'Jn', 4, 32),
('Old', 'Miqueias', 'Mq', 7, 33),
('Old', 'Naum', 'Na', 3, 34),
('Old', 'Habacuque', 'Hc', 3, 35),
('Old', 'Sofonias', 'Sf', 3, 36),
('Old', 'Ageu', 'Ag', 2, 37),
('Old', 'Zacarias', 'Zc', 14, 38),
('Old', 'Malaquias', 'Ml', 4, 39),
('New', 'Mateus', 'Mt', 28, 40),
('New', 'Marcos', 'Mc', 16, 41),
('New', 'Lucas', 'Lc', 24, 42),
('New', 'João', 'Jo', 21, 43),
('New', 'Atos', 'At', 28, 44),
('New', 'Romanos', 'Rm', 16, 45),
('New', '1 Coríntios', '1Co', 16, 46),
('New', '2 Coríntios', '2Co', 13, 47),
('New', 'Gálatas', 'Gl', 6, 48),
('New', 'Efésios', 'Ef', 6, 49),
('New', 'Filipenses', 'Fp', 4, 50),
('New', 'Colossenses', 'Cl', 4, 51),
('New', '1 Tessalonicenses', '1Ts', 5, 52),
('New', '2 Tessalonicenses', '2Ts', 3, 53),
('New', '1 Timóteo', '1Tm', 6, 54),
('New', '2 Timóteo', '2Tm', 4, 55),
('New', 'Tito', 'Tt', 3, 56),
('New', 'Filemon', 'Fm', 1, 57),
('New', 'Hebreus', 'Hb', 13, 58),
('New', 'Tiago', 'Tg', 5, 59),
('New', '1 Pedro', '1Pe', 5, 60),
('New', '2 Pedro', '2Pe', 3, 61),
('New', '1 João', '1Jo', 5, 62),
('New', '2 João', '2Jo', 1, 63),
('New', '3 João', '3Jo', 1, 64),
('New', 'Judas', 'Jd', 1, 65),
('New', 'Apocalipse', 'Ap', 22, 66)
ON CONFLICT (book_index) DO NOTHING;
