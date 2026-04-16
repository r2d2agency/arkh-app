-- Versículo Rush — Tap game (solo + desafio online)

CREATE TABLE IF NOT EXISTS rush_verses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(120) NOT NULL,
  text TEXT NOT NULL,
  word_count INT NOT NULL,
  difficulty VARCHAR(20) NOT NULL DEFAULT 'easy', -- easy (<=8), medium (9-14), hard (15+)
  explanation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rush_verses_difficulty ON rush_verses(difficulty);

CREATE TABLE IF NOT EXISTS rush_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL DEFAULT 'solo', -- solo, online
  status VARCHAR(20) DEFAULT 'waiting', -- waiting, playing, finished
  rounds INT DEFAULT 5,
  current_round INT DEFAULT 0,
  invite_code VARCHAR(10),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rush_rooms_church ON rush_rooms(church_id);
CREATE INDEX IF NOT EXISTS idx_rush_rooms_invite ON rush_rooms(invite_code);

CREATE TABLE IF NOT EXISTS rush_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rush_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(120),
  avatar_url TEXT,
  score INT DEFAULT 0,
  combo INT DEFAULT 0,
  max_combo INT DEFAULT 0,
  correct_taps INT DEFAULT 0,
  wrong_taps INT DEFAULT 0,
  rounds_completed INT DEFAULT 0,
  total_time_ms INT DEFAULT 0,
  placement INT,
  xp_earned INT DEFAULT 0,
  points_earned INT DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rush_players_room ON rush_players(room_id);
CREATE INDEX IF NOT EXISTS idx_rush_players_user ON rush_players(user_id);

-- Seed: 30 versículos variados (curto/médio/longo)
INSERT INTO rush_verses (reference, text, word_count, difficulty, explanation) VALUES
('João 3:16', 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito', 14, 'medium', 'O versículo central do amor de Deus pela humanidade.'),
('Salmos 23:1', 'O Senhor é o meu pastor e nada me faltará', 9, 'medium', 'Confiança absoluta no cuidado de Deus.'),
('Filipenses 4:13', 'Posso todas as coisas naquele que me fortalece', 7, 'easy', 'A força vem de Cristo em todas as circunstâncias.'),
('Provérbios 3:5', 'Confia no Senhor de todo o teu coração', 8, 'easy', 'Convite à confiança plena em Deus.'),
('Romanos 8:28', 'Todas as coisas cooperam para o bem daqueles que amam a Deus', 12, 'medium', 'Promessa de propósito divino na vida do cristão.'),
('Mateus 6:33', 'Buscai primeiro o reino de Deus e a sua justiça', 9, 'medium', 'Prioridade espiritual acima das preocupações materiais.'),
('Isaías 41:10', 'Não temas porque eu sou contigo não te assombres', 8, 'easy', 'Promessa de presença e proteção divina.'),
('Salmos 119:105', 'Lâmpada para os meus pés é tua palavra e luz para o meu caminho', 13, 'medium', 'A Palavra como guia para a caminhada da vida.'),
('Jeremias 29:11', 'Porque eu bem sei os pensamentos que tenho a vosso respeito', 11, 'medium', 'Deus tem planos de paz para nós.'),
('Tiago 1:5', 'Se algum de vós tem falta de sabedoria peça a Deus', 11, 'medium', 'Convite à oração por sabedoria.'),
('Gálatas 5:22', 'Mas o fruto do Espírito é amor gozo paz longanimidade', 10, 'medium', 'Os frutos do Espírito Santo no crente.'),
('1 Coríntios 13:4', 'O amor é sofredor é benigno o amor não é invejoso', 11, 'medium', 'Definição prática do amor cristão.'),
('Mateus 11:28', 'Vinde a mim todos os que estais cansados e sobrecarregados', 10, 'medium', 'Convite ao descanso em Cristo.'),
('Salmos 46:10', 'Aquietai-vos e sabei que eu sou Deus', 7, 'easy', 'Convite à contemplação da soberania de Deus.'),
('João 14:6', 'Eu sou o caminho e a verdade e a vida', 9, 'medium', 'Cristo como único caminho ao Pai.'),
('Efésios 2:8', 'Porque pela graça sois salvos por meio da fé', 9, 'medium', 'A salvação é dom de Deus pela fé.'),
('Hebreus 11:1', 'Ora a fé é o firme fundamento das coisas que se esperam', 12, 'medium', 'Definição bíblica de fé.'),
('Romanos 12:2', 'Não vos conformeis com este mundo mas transformai-vos pela renovação da vossa mente', 13, 'medium', 'Transformação cristã pela renovação da mente.'),
('Salmos 27:1', 'O Senhor é a minha luz e a minha salvação a quem temerei', 13, 'medium', 'Confiança absoluta diante do medo.'),
('Provérbios 16:3', 'Confia ao Senhor as tuas obras', 6, 'easy', 'Entregar planos a Deus para que prosperem.'),
('1 João 4:8', 'Aquele que não ama não conhece a Deus porque Deus é amor', 12, 'medium', 'Deus é amor em sua essência.'),
('Mateus 5:16', 'Assim resplandeça a vossa luz diante dos homens para que vejam as vossas boas obras e glorifiquem o vosso Pai', 19, 'hard', 'Vivência cristã que glorifica a Deus.'),
('Salmos 139:14', 'Eu te louvarei porque de um modo assombroso e tão maravilhoso fui feito', 13, 'medium', 'Maravilhamento pela criação humana.'),
('Romanos 10:9', 'Se com a tua boca confessares ao Senhor Jesus e em teu coração creres', 14, 'medium', 'O caminho da salvação confessada.'),
('Mateus 28:19', 'Portanto ide ensinai todas as nações batizando-as em nome do Pai do Filho e do Espírito Santo', 16, 'hard', 'A Grande Comissão.'),
('1 Pedro 5:7', 'Lançando sobre ele toda a vossa ansiedade porque ele tem cuidado de vós', 13, 'medium', 'Entregar ansiedades ao Senhor.'),
('Gênesis 1:1', 'No princípio criou Deus os céus e a terra', 8, 'easy', 'O início de tudo pela criação divina.'),
('Apocalipse 3:20', 'Eis que estou à porta e bato se alguém ouvir a minha voz e abrir a porta entrarei em sua casa', 21, 'hard', 'Cristo bate à porta do coração.'),
('Lucas 6:31', 'E como vós quereis que os homens vos façam a vós fazei-lhes vós também', 14, 'medium', 'A regra de ouro.'),
('2 Timóteo 1:7', 'Porque Deus não nos deu o espírito de temor mas de fortaleza e de amor e de moderação', 17, 'hard', 'O espírito que vem de Deus é poder e domínio próprio.')
ON CONFLICT DO NOTHING;
