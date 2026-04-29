DELETE FROM mahjong_levels WHERE church_id IS NULL; DELETE FROM mahjong_relations; DELETE FROM mahjong_tiles WHERE church_id IS NULL;
-- Mahjong Bíblico — peças, relações, níveis e progresso

-- Biblioteca de peças
CREATE TABLE IF NOT EXISTS mahjong_tiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE, -- NULL = global
  kind VARCHAR(20) NOT NULL, -- original | translation | symbol | verse | category
  text VARCHAR(255) NOT NULL,
  transliteration VARCHAR(255),
  translation VARCHAR(255),
  icon VARCHAR(50), -- nome de ícone lucide ou emoji
  category VARCHAR(80),
  context TEXT, -- contexto bíblico curto (1-2 frases)
  reference VARCHAR(80), -- ex: "João 3:16"
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mahjong_tiles_church ON mahjong_tiles(church_id);
CREATE INDEX IF NOT EXISTS idx_mahjong_tiles_kind ON mahjong_tiles(kind);

-- Relações de combinação (não direcionada — guardamos sempre tile_a < tile_b)
CREATE TABLE IF NOT EXISTS mahjong_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tile_a_id UUID NOT NULL REFERENCES mahjong_tiles(id) ON DELETE CASCADE,
  tile_b_id UUID NOT NULL REFERENCES mahjong_tiles(id) ON DELETE CASCADE,
  match_level INT NOT NULL DEFAULT 1, -- 1, 2 ou 3
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tile_a_id, tile_b_id)
);
CREATE INDEX IF NOT EXISTS idx_mahjong_rel_a ON mahjong_relations(tile_a_id);
CREATE INDEX IF NOT EXISTS idx_mahjong_rel_b ON mahjong_relations(tile_b_id);

-- Níveis (layouts)
CREATE TABLE IF NOT EXISTS mahjong_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE, -- NULL = global
  name VARCHAR(120) NOT NULL,
  shape VARCHAR(40) DEFAULT 'pyramid', -- pyramid | cross | temple | custom
  difficulty INT DEFAULT 1, -- 1..5
  layout JSONB NOT NULL, -- [{x,y,z,tile_id}]
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mahjong_levels_church ON mahjong_levels(church_id);

-- Progresso do jogador
CREATE TABLE IF NOT EXISTS mahjong_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES mahjong_levels(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'completed', -- completed | abandoned
  mode VARCHAR(20) DEFAULT 'relax', -- relax | study | challenge
  score INT DEFAULT 0,
  time_seconds INT DEFAULT 0,
  matches_correct INT DEFAULT 0,
  matches_wrong INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mahjong_prog_user ON mahjong_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_mahjong_prog_level ON mahjong_progress(level_id);

-- ============================================================
-- SEED: peças globais + 1 nível inicial "Iniciante - Pirâmide"
-- ============================================================
DO $$
DECLARE
  t_shalom UUID; t_shalom_pt UUID;
  t_ahava UUID; t_ahava_pt UUID;
  t_emunah UUID; t_emunah_pt UUID;
  t_ruach UUID; t_ruach_pt UUID;
  t_chesed UUID; t_chesed_pt UUID;
  t_torah UUID; t_torah_pt UUID;
  t_lamb_sym UUID; t_lamb_verse UUID;
  t_light_sym UUID; t_light_verse UUID;
  t_cat_amor UUID; t_cat_fe UUID;
  lvl_id UUID;
BEGIN
  -- Skip se já tem peças globais
  IF EXISTS (SELECT 1 FROM mahjong_tiles WHERE church_id IS NULL LIMIT 1) THEN
    RETURN;
  END IF;

  -- Palavras originais + traduções
  INSERT INTO mahjong_tiles (kind, text, transliteration, translation, icon, context, reference) VALUES
    ('original','שָׁלוֹם','shalom','paz','✡','Mais que ausência de conflito — plenitude e bem-estar integral.','Números 6:26')
    RETURNING id INTO t_shalom;
  INSERT INTO mahjong_tiles (kind, text, icon, context) VALUES
    ('translation','paz','🕊','A tradução mais comum de shalom.') RETURNING id INTO t_shalom_pt;

  INSERT INTO mahjong_tiles (kind, text, transliteration, translation, icon, context, reference) VALUES
    ('original','אַהֲבָה','ahavá','amor','❤','Amor de aliança, fiel e ativo.','Deuteronômio 6:5')
    RETURNING id INTO t_ahava;
  INSERT INTO mahjong_tiles (kind, text, icon) VALUES ('translation','amor','💗') RETURNING id INTO t_ahava_pt;

  INSERT INTO mahjong_tiles (kind, text, transliteration, translation, icon, context, reference) VALUES
    ('original','אֱמוּנָה','emunáh','fé','✦','Fidelidade firme — confiar e ser confiável.','Habacuque 2:4')
    RETURNING id INTO t_emunah;
  INSERT INTO mahjong_tiles (kind, text, icon) VALUES ('translation','fé','🙏') RETURNING id INTO t_emunah_pt;

  INSERT INTO mahjong_tiles (kind, text, transliteration, translation, icon, context, reference) VALUES
    ('original','רוּחַ','rúach','espírito/vento','🌬','Vento, fôlego e Espírito — a vida que sopra de Deus.','Gênesis 1:2')
    RETURNING id INTO t_ruach;
  INSERT INTO mahjong_tiles (kind, text, icon) VALUES ('translation','espírito','🕊') RETURNING id INTO t_ruach_pt;

  INSERT INTO mahjong_tiles (kind, text, transliteration, translation, icon, context, reference) VALUES
    ('original','חֶסֶד','chésed','bondade leal','🤝','Misericórdia que cumpre a aliança — graça que não falha.','Lamentações 3:22')
    RETURNING id INTO t_chesed;
  INSERT INTO mahjong_tiles (kind, text, icon) VALUES ('translation','bondade','✨') RETURNING id INTO t_chesed_pt;

  INSERT INTO mahjong_tiles (kind, text, transliteration, translation, icon, context, reference) VALUES
    ('original','תּוֹרָה','toráh','ensino/lei','📜','Não apenas regras — ensino que dá direção e vida.','Salmo 119:105')
    RETURNING id INTO t_torah;
  INSERT INTO mahjong_tiles (kind, text, icon) VALUES ('translation','lei','📖') RETURNING id INTO t_torah_pt;

  -- Símbolos e versículos
  INSERT INTO mahjong_tiles (kind, text, icon, context) VALUES
    ('symbol','Cordeiro','🐑','Símbolo de Cristo, sacrifício e mansidão.') RETURNING id INTO t_lamb_sym;
  INSERT INTO mahjong_tiles (kind, text, icon, context, reference) VALUES
    ('verse','"Eis o Cordeiro de Deus..."','📖','João aponta para Jesus como o sacrifício final.','João 1:29')
    RETURNING id INTO t_lamb_verse;

  INSERT INTO mahjong_tiles (kind, text, icon, context) VALUES
    ('symbol','Luz','💡','Símbolo da presença, verdade e direção de Deus.') RETURNING id INTO t_light_sym;
  INSERT INTO mahjong_tiles (kind, text, icon, context, reference) VALUES
    ('verse','"Lâmpada para os meus pés..."','📖','A Palavra ilumina cada passo da caminhada.','Salmo 119:105')
    RETURNING id INTO t_light_verse;

  -- Categorias
  INSERT INTO mahjong_tiles (kind, text, icon, context) VALUES
    ('category','Amor','💞','Categoria espiritual: relacionamento, aliança, doação.') RETURNING id INTO t_cat_amor;
  INSERT INTO mahjong_tiles (kind, text, icon, context) VALUES
    ('category','Fé','⛪','Categoria espiritual: confiança, fidelidade, perseverança.') RETURNING id INTO t_cat_fe;

  -- Relações N1 (idênticas - cada palavra original combina consigo via 2ª cópia visual no tabuleiro)
  -- Aqui simulamos "iguais" ligando original ↔ original via auto-relação não é possível,
  -- então no jogo geramos 2 instâncias da mesma peça. O backend valida por tile_id igual.

  -- Relações N2 (original ↔ tradução)
  INSERT INTO mahjong_relations (tile_a_id, tile_b_id, match_level, explanation) VALUES
    (LEAST(t_shalom, t_shalom_pt), GREATEST(t_shalom, t_shalom_pt), 2, 'Shalom (שָׁלוֹם) é traduzido como "paz" — mas inclui plenitude e harmonia.'),
    (LEAST(t_ahava, t_ahava_pt), GREATEST(t_ahava, t_ahava_pt), 2, 'Ahavá (אַהֲבָה) é o amor de aliança da Torá.'),
    (LEAST(t_emunah, t_emunah_pt), GREATEST(t_emunah, t_emunah_pt), 2, 'Emunáh (אֱמוּנָה) significa fé como fidelidade firme.'),
    (LEAST(t_ruach, t_ruach_pt), GREATEST(t_ruach, t_ruach_pt), 2, 'Rúach (רוּחַ) une vento, fôlego e Espírito.'),
    (LEAST(t_chesed, t_chesed_pt), GREATEST(t_chesed, t_chesed_pt), 2, 'Chésed (חֶסֶד) é bondade que cumpre a aliança.'),
    (LEAST(t_torah, t_torah_pt), GREATEST(t_torah, t_torah_pt), 2, 'Toráh (תּוֹרָה) é "ensino" — mais que código de regras.');

  -- Relações N3 (símbolo ↔ versículo, categoria ↔ original)
  INSERT INTO mahjong_relations (tile_a_id, tile_b_id, match_level, explanation) VALUES
    (LEAST(t_lamb_sym, t_lamb_verse), GREATEST(t_lamb_sym, t_lamb_verse), 3, 'O Cordeiro aponta para Cristo — João 1:29.'),
    (LEAST(t_light_sym, t_light_verse), GREATEST(t_light_sym, t_light_verse), 3, 'A luz da Palavra guia — Salmo 119:105.'),
    (LEAST(t_cat_amor, t_ahava), GREATEST(t_cat_amor, t_ahava), 3, 'Ahavá pertence à categoria espiritual do Amor.'),
    (LEAST(t_cat_amor, t_chesed), GREATEST(t_cat_amor, t_chesed), 3, 'Chésed é bondade amorosa — categoria Amor.'),
    (LEAST(t_cat_fe, t_emunah), GREATEST(t_cat_fe, t_emunah), 3, 'Emunáh é a fé fiel — categoria Fé.'),
    (LEAST(t_cat_fe, t_torah), GREATEST(t_cat_fe, t_torah), 3, 'Toráh sustenta a vida de fé.');

  -- Nível 1: Pirâmide corrigida (Grid de 2x2 para cada peça)
  INSERT INTO mahjong_levels (name, shape, difficulty, description, sort_order, layout) VALUES (
    'Iniciante — Pares Hebraicos', 'pyramid', 1,
    'Combine cada palavra hebraica com sua tradução. Layout clássico em 3D.',
    1,
    jsonb_build_array(
      -- Base (Camada 0) - 4x2 grid de peças (8 peças)
      jsonb_build_object('x',0,'y',0,'z',0,'tile_id',t_shalom),
      jsonb_build_object('x',2,'y',0,'z',0,'tile_id',t_shalom_pt),
      jsonb_build_object('x',4,'y',0,'z',0,'tile_id',t_ahava),
      jsonb_build_object('x',6,'y',0,'z',0,'tile_id',t_ahava_pt),
      jsonb_build_object('x',0,'y',2,'z',0,'tile_id',t_emunah),
      jsonb_build_object('x',2,'y',2,'z',0,'tile_id',t_emunah_pt),
      jsonb_build_object('x',4,'y',2,'z',0,'tile_id',t_ruach),
      jsonb_build_object('x',6,'y',2,'z',0,'tile_id',t_ruach_pt),
      -- Topo (Camada 1) - 2 peças centralizadas que travam as de baixo
      jsonb_build_object('x',2,'y',1,'z',1,'tile_id',t_chesed),
      jsonb_build_object('x',4,'y',1,'z',1,'tile_id',t_chesed_pt)
    )
  );

  -- Nível 2: Cruz (Grid corrigido)
  INSERT INTO mahjong_levels (name, shape, difficulty, description, sort_order, layout) VALUES (
    'Símbolos da Aliança', 'cross', 2,
    'Ligue símbolos a versículos e palavras a categorias.',
    2,
    jsonb_build_array(
      -- Peças em cruz (10 peças)
      jsonb_build_object('x',4,'y',0,'z',0,'tile_id',t_lamb_sym),
      jsonb_build_object('x',4,'y',2,'z',0,'tile_id',t_lamb_verse),
      jsonb_build_object('x',4,'y',4,'z',0,'tile_id',t_light_sym),
      jsonb_build_object('x',4,'y',6,'z',0,'tile_id',t_light_verse),
      jsonb_build_object('x',0,'y',3,'z',0,'tile_id',t_cat_amor),
      jsonb_build_object('x',2,'y',3,'z',0,'tile_id',t_ahava),
      jsonb_build_object('x',6,'y',3,'z',0,'tile_id',t_chesed),
      jsonb_build_object('x',8,'y',3,'z',0,'tile_id',t_cat_fe),
      jsonb_build_object('x',4,'y',3,'z',1,'tile_id',t_emunah), -- Central sobreposta
      jsonb_build_object('x',4,'y',3,'z',2,'tile_id',t_torah)   -- Topo da pilha central
    )
  );
END $$;
