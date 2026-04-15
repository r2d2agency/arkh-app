-- Group Dynamics / Icebreakers
CREATE TABLE IF NOT EXISTS group_dynamics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES churches(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'icebreaker',
  emoji VARCHAR(10) DEFAULT '🎯',
  min_participants INT DEFAULT 2,
  max_participants INT,
  duration_minutes INT DEFAULT 15,
  is_auto_generated BOOLEAN DEFAULT false,
  generated_week DATE,
  is_global BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(title, is_global, church_id)
);

-- Track which dynamics were used by each group
CREATE TABLE IF NOT EXISTS group_dynamic_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  dynamic_id UUID NOT NULL REFERENCES group_dynamics(id) ON DELETE CASCADE,
  used_by UUID REFERENCES users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  feedback TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5)
);

-- Member responses to dynamics (for interactive ones)
CREATE TABLE IF NOT EXISTS group_dynamic_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dynamic_id UUID NOT NULL REFERENCES group_dynamics(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_dynamics_church ON group_dynamics(church_id);
CREATE INDEX IF NOT EXISTS idx_group_dynamic_usage_group ON group_dynamic_usage(group_id);
CREATE INDEX IF NOT EXISTS idx_group_dynamic_responses_dynamic ON group_dynamic_responses(dynamic_id, group_id);

-- Seed 6 global dynamics available to all churches
INSERT INTO group_dynamics (title, description, instructions, category, emoji, min_participants, duration_minutes, is_global) VALUES
(
  'Duas Verdades e Uma Mentira',
  'Cada pessoa conta 3 fatos sobre si — 2 verdadeiros e 1 mentira. O grupo tenta adivinhar qual é a mentira.',
  '1. Cada participante pensa em 2 verdades e 1 mentira sobre si mesmo.
2. Um por vez, cada pessoa compartilha os 3 fatos.
3. O grupo vota qual acham que é a mentira.
4. A pessoa revela a resposta.
5. Quem acertar mais, vence!',
  'icebreaker', '🤥', 3, 15, true
),
(
  'Versículo da Vida',
  'Cada membro compartilha o versículo bíblico que mais marcou sua vida e explica por quê.',
  '1. Peça que cada pessoa pense no versículo mais significativo da sua vida.
2. Um por vez, cada pessoa lê o versículo e conta a história por trás dele.
3. O grupo pode fazer perguntas e se conectar com a história.
4. Encerre com uma oração coletiva mencionando os versículos compartilhados.',
  'spiritual', '📖', 2, 20, true
),
(
  'Se Deus Mandasse Um WhatsApp',
  'Imagine que Deus te mandou uma mensagem no WhatsApp agora. O que você acha que Ele diria? Cada um compartilha.',
  '1. Peça para cada pessoa fechar os olhos e imaginar por 1 minuto.
2. Cada um escreve ou fala a "mensagem de Deus" que imaginou.
3. O grupo reflete junto sobre os temas que surgiram.
4. Encerre conectando com um versículo relevante.',
  'reflection', '📱', 2, 15, true
),
(
  'Mapa da Minha Semana',
  'Cada pessoa desenha ou descreve em 3 emojis como foi sua semana. O grupo tenta interpretar antes da pessoa explicar.',
  '1. Cada participante escolhe 3 emojis que representam sua semana.
2. Compartilhe os emojis no grupo (pode ser no chat ou falando).
3. Os outros tentam adivinhar o significado.
4. A pessoa explica o real significado de cada emoji.
5. Orem uns pelos outros baseados no que foi compartilhado.',
  'icebreaker', '🗺️', 3, 10, true
),
(
  'Quem é o Personagem Bíblico?',
  'Uma pessoa pensa em um personagem bíblico e os outros fazem perguntas de sim ou não para adivinhar.',
  '1. Uma pessoa pensa em um personagem bíblico (ex: Moisés, Rute, Pedro).
2. Os outros fazem perguntas que só podem ser respondidas com SIM ou NÃO.
3. Máximo de 15 perguntas por rodada.
4. Quem adivinhar, é o próximo a pensar no personagem.
5. Após adivinhar, leiam juntos uma passagem sobre o personagem.',
  'game', '🎭', 3, 15, true
),
(
  'Carta para Meu Eu do Futuro',
  'Cada membro escreve uma breve carta para si mesmo daqui a 6 meses, com metas espirituais e pessoais.',
  '1. Distribua papel ou peça para usarem o celular.
2. Cada pessoa escreve uma carta para si mesmo do futuro (3-5 frases).
3. Inclua: um versículo que quer memorizar, uma meta espiritual e uma gratidão.
4. Quem quiser, pode compartilhar com o grupo.
5. O líder guarda as cartas e devolve após 6 meses.
6. Encerre com oração pelas metas compartilhadas.',
  'reflection', '✉️', 2, 20, true
);
