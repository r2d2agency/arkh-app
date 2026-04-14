const router = require('express').Router();
const pool = require('../db/pool');
const { callAI } = require('../services/processService');

function getProviderApiKey(provider) {
  return (provider.api_keys_encrypted || [])[0] || provider.api_key_encrypted || '';
}

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') throw new Error('A IA retornou uma resposta vazia');
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('A IA não retornou JSON válido');
  return JSON.parse(jsonMatch[0]);
}

function normalizeQuizData(quizData) {
  const questions = Array.isArray(quizData?.questions) ? quizData.questions : [];
  const normalizedQuestions = questions
    .map((question) => {
      const questionText = String(question?.question || '').trim();
      const options = Array.isArray(question?.options)
        ? question.options.map((option) => String(option || '').trim()).filter(Boolean).slice(0, 4)
        : [];
      if (!questionText || options.length < 2) return null;
      const parsedCorrect = Number.parseInt(String(question?.correct ?? 0), 10);
      return {
        question: questionText,
        reference: question?.reference ? String(question.reference).trim() : null,
        options,
        correct: Number.isNaN(parsedCorrect) || parsedCorrect < 0 || parsedCorrect >= options.length ? 0 : parsedCorrect,
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  if (normalizedQuestions.length < 3) throw new Error('A IA não retornou perguntas válidas suficientes');

  return {
    title: String(quizData?.title || '').trim() || 'Quiz Bíblico',
    description: String(quizData?.description || '').trim(),
    emoji: String(quizData?.emoji || '📖').trim() || '📖',
    questions: normalizedQuestions,
  };
}

// Phase definitions
const PHASES = [
  { level: 1, name: 'Iniciante', difficulty: 'easy', minPoints: 0, emoji: '🌱' },
  { level: 2, name: 'Aprendiz', difficulty: 'easy', minPoints: 30, emoji: '📗' },
  { level: 3, name: 'Conhecedor', difficulty: 'medium', minPoints: 80, emoji: '⚡' },
  { level: 4, name: 'Sábio', difficulty: 'medium', minPoints: 150, emoji: '🧠' },
  { level: 5, name: 'Mestre', difficulty: 'hard', minPoints: 300, emoji: '🔥' },
  { level: 6, name: 'Doutor da Lei', difficulty: 'hard', minPoints: 500, emoji: '👑' },
];

function getPhaseForLevel(level) {
  return PHASES.find(p => p.level === level) || PHASES[0];
}

function getLevelForPoints(points) {
  let level = 1;
  for (const phase of PHASES) {
    if (points >= phase.minPoints) level = phase.level;
  }
  return level;
}

// GET /api/church/quizzes — list active quizzes for members
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    const isAdmin = req.user.role === 'admin_church' || req.user.role === 'leader';
    const activeFilter = isAdmin ? '' : 'AND q.is_active = true';

    const { rows } = await pool.query(
      `SELECT q.*,
        (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) as question_count,
        (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.quiz_id = q.id) as attempt_count,
        (SELECT MAX(qa2.score) FROM quiz_attempts qa2 WHERE qa2.quiz_id = q.id AND qa2.user_id = $2) as best_score,
        (SELECT qa3.total_questions FROM quiz_attempts qa3 WHERE qa3.quiz_id = q.id AND qa3.user_id = $2 ORDER BY qa3.score DESC LIMIT 1) as best_total
       FROM quizzes q
       WHERE q.church_id = $1 ${activeFilter} AND (q.is_challenge = false OR q.is_challenge IS NULL OR q.challenge_user_id = $2)
       ORDER BY q.created_at DESC`,
      [churchId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET quizzes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/quizzes/my-scores — user's total score across all quizzes
router.get('/my-scores', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows: [stats] } = await pool.query(
      `SELECT
        COALESCE(SUM(sub.best_score), 0) as total_points,
        COUNT(sub.quiz_id) as quizzes_played,
        COALESCE(SUM(sub.best_total), 0) as total_possible
       FROM (
         SELECT qa.quiz_id, MAX(qa.score) as best_score, MAX(qa.total_questions) as best_total
         FROM quiz_attempts qa
         JOIN quizzes q ON q.id = qa.quiz_id
         WHERE qa.user_id = $1 AND q.church_id = $2
         GROUP BY qa.quiz_id
       ) sub`,
      [req.user.id, churchId]
    );
    const { rows: leaderboard } = await pool.query(
      `SELECT u.name, u.avatar_url, sub.total_points, sub.quizzes_played
       FROM (
         SELECT qa.user_id, SUM(best) as total_points, COUNT(*) as quizzes_played
         FROM (
           SELECT qa2.user_id, qa2.quiz_id, MAX(qa2.score) as best
           FROM quiz_attempts qa2
           JOIN quizzes q ON q.id = qa2.quiz_id
           WHERE q.church_id = $1
           GROUP BY qa2.user_id, qa2.quiz_id
         ) qa
         GROUP BY qa.user_id
       ) sub
       JOIN users u ON u.id = sub.user_id
       ORDER BY sub.total_points DESC
       LIMIT 10`,
      [churchId]
    );
    res.json({ ...stats, leaderboard });
  } catch (err) {
    console.error('GET my-scores error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/quizzes/my-progress — user's level/phase progress
router.get('/my-progress', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    // Get or create user_game_points
    let { rows: [gp] } = await pool.query(
      'SELECT * FROM user_game_points WHERE user_id = $1 AND church_id = $2',
      [req.user.id, churchId]
    );
    if (!gp) {
      // Calculate from existing attempts
      const { rows: [stats] } = await pool.query(
        `SELECT COALESCE(SUM(best), 0) as total_points, COUNT(*) as quizzes_completed
         FROM (
           SELECT MAX(qa.score) as best FROM quiz_attempts qa
           JOIN quizzes q ON q.id = qa.quiz_id
           WHERE qa.user_id = $1 AND q.church_id = $2
           GROUP BY qa.quiz_id
         ) sub`,
        [req.user.id, churchId]
      );
      const totalPts = +stats.total_points;
      const level = getLevelForPoints(totalPts);
      const { rows: [created] } = await pool.query(
        `INSERT INTO user_game_points (user_id, church_id, total_points, current_level, quizzes_completed)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, church_id) DO UPDATE SET total_points=$3, current_level=$4, quizzes_completed=$5
         RETURNING *`,
        [req.user.id, churchId, totalPts, level, +stats.quizzes_completed]
      );
      gp = created;
    }

    const currentLevel = gp.current_level || 1;
    const currentPhase = getPhaseForLevel(currentLevel);
    const nextPhase = PHASES.find(p => p.level === currentLevel + 1);

    res.json({
      total_points: gp.total_points,
      current_level: currentLevel,
      quizzes_completed: gp.quizzes_completed,
      current_phase: currentPhase,
      next_phase: nextPhase || null,
      phases: PHASES,
      points_to_next: nextPhase ? Math.max(0, nextPhase.minPoints - gp.total_points) : 0,
    });
  } catch (err) {
    console.error('GET my-progress error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/church/quizzes/generate-challenge — generate a personal challenge quiz
router.post('/generate-challenge', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { level } = req.body;
    const requestedLevel = Math.min(Math.max(level || 1, 1), 6);

    // Check user has unlocked this level
    let { rows: [gp] } = await pool.query(
      'SELECT * FROM user_game_points WHERE user_id = $1 AND church_id = $2',
      [req.user.id, churchId]
    );
    const userLevel = gp ? (gp.current_level || 1) : 1;
    if (requestedLevel > userLevel) {
      return res.status(403).json({ error: 'Fase ainda não desbloqueada!' });
    }

    const phase = getPhaseForLevel(requestedLevel);
    const { rows: providerRows } = await pool.query(
      'SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1'
    );
    if (!providerRows.length) return res.status(400).json({ error: 'Nenhum provedor de IA ativo.' });

    const provider = providerRows[0];
    const apiKey = getProviderApiKey(provider);
    if (!apiKey) return res.status(400).json({ error: 'API key não configurada.' });

    const diffLabels = { easy: 'fácil', medium: 'médio', hard: 'difícil' };
    const diffLabel = diffLabels[phase.difficulty] || 'médio';
    const questionsCount = Math.min(3 + requestedLevel, 8);

    // Get previously used topics to avoid repetition
    const { rows: prevQuizzes } = await pool.query(
      `SELECT q.title FROM quizzes q
       WHERE q.church_id = $1 AND q.is_challenge = true AND q.challenge_user_id = $2
       ORDER BY q.created_at DESC LIMIT 10`,
      [churchId, req.user.id]
    );
    const prevTopics = prevQuizzes.map(q => q.title).join(', ');

    const systemPrompt = 'Você é um criador de quizzes bíblicos educativos. Responda SOMENTE com JSON válido, sem markdown e sem blocos de código.';
    const prompt = `Crie um quiz bíblico de DESAFIO nível ${requestedLevel} (${phase.name}) com exatamente ${questionsCount} perguntas.
Dificuldade: ${diffLabel}. Nível ${requestedLevel} de 6.
${requestedLevel <= 2 ? 'Use perguntas básicas sobre histórias conhecidas da Bíblia.' : ''}
${requestedLevel === 3 || requestedLevel === 4 ? 'Use perguntas intermediárias envolvendo detalhes de histórias, personagens secundários, e conexões entre livros.' : ''}
${requestedLevel >= 5 ? 'Use perguntas avançadas sobre teologia, profetas, genealogias, contexto histórico, e passagens menos conhecidas.' : ''}
${prevTopics ? `EVITE repetir os seguintes temas já usados: ${prevTopics}` : ''}
Retorne APENAS um JSON válido no formato:
{
  "title": "título criativo e único do desafio",
  "description": "breve descrição do desafio",
  "emoji": "emoji representativo",
  "questions": [
    {
      "question": "texto da pergunta",
      "reference": "referência bíblica (ex: Gênesis 1:1)",
      "options": ["opção A", "opção B", "opção C", "opção D"],
      "correct": 0
    }
  ]
}`;

    const aiText = await callAI(provider, apiKey, systemPrompt, prompt, 0.8, 4096);
    const rawQuizData = extractJsonObject(aiText);
    const quizData = normalizeQuizData(rawQuizData);

    const { rows: [quiz] } = await pool.query(
      `INSERT INTO quizzes (church_id, title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active, is_auto_generated, is_challenge, challenge_user_id, challenge_level, generated_week, created_by)
       VALUES ($1,$2,$3,'general',$4,$5,$6,true,true,true,$7,$8,CURRENT_DATE,$7) RETURNING *`,
      [churchId, quizData.title, quizData.description, phase.difficulty, phase.difficulty === 'hard' ? 25 : phase.difficulty === 'medium' ? 30 : 40, quizData.emoji, req.user.id, requestedLevel]
    );

    for (let qi = 0; qi < quizData.questions.length; qi++) {
      const q = quizData.questions[qi];
      const { rows: [question] } = await pool.query(
        'INSERT INTO quiz_questions (quiz_id, question_text, bible_reference, question_order) VALUES ($1,$2,$3,$4) RETURNING *',
        [quiz.id, q.question, q.reference, qi]
      );
      for (let oi = 0; oi < q.options.length; oi++) {
        await pool.query(
          'INSERT INTO quiz_options (question_id, option_text, is_correct, option_order) VALUES ($1,$2,$3,$4)',
          [question.id, q.options[oi], oi === q.correct, oi]
        );
      }
    }

    res.json(quiz);
  } catch (err) {
    console.error('Generate challenge error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/quizzes/auto-settings
router.get('/auto-settings', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT auto_quiz_enabled FROM churches WHERE id = $1', [req.user.church_id]);
    res.json({ auto_quiz_enabled: rows[0]?.auto_quiz_enabled ?? true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/church/quizzes/auto-settings
router.put('/auto-settings', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') return res.status(403).json({ error: 'Forbidden' });
    const { auto_quiz_enabled } = req.body;
    await pool.query('UPDATE churches SET auto_quiz_enabled = $1 WHERE id = $2', [!!auto_quiz_enabled, req.user.church_id]);
    res.json({ auto_quiz_enabled: !!auto_quiz_enabled });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/church/quizzes/generate — admin AI-generate quizzes (unchanged)
router.post('/generate', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') return res.status(403).json({ error: 'Forbidden' });
    const churchId = req.user.church_id;
    const { category, count } = req.body;
    const categories = category ? [category] : ['kids', 'youth', 'adults'];
    const quizzesPerCat = Math.max(Number(count) || 1, 1);
    const { rows: providerRows } = await pool.query('SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1');
    if (!providerRows.length) return res.status(400).json({ error: 'Nenhum provedor de IA ativo encontrado.' });
    const provider = providerRows[0];
    const apiKey = getProviderApiKey(provider);
    if (!apiKey) return res.status(400).json({ error: 'O provedor de IA ativo não possui API key configurada.' });

    const generated = [];
    const warnings = [];
    const catLabels = { kids: 'crianças (7-12 anos)', youth: 'jovens (13-25 anos)', adults: 'adultos' };
    const systemPrompt = 'Você é um criador de quizzes bíblicos educativos. Responda SOMENTE com JSON válido, sem markdown e sem blocos de código.';

    for (const cat of categories) {
      for (let i = 0; i < quizzesPerCat; i++) {
        const diffOptions = cat === 'kids' ? 'easy' : cat === 'youth' ? 'medium' : 'hard';
        const prompt = `Crie um quiz bíblico para ${catLabels[cat] || cat} com exatamente 5 perguntas.
Para cada pergunta, forneça 4 alternativas e indique qual é a correta.
Dificuldade: ${diffOptions === 'easy' ? 'fácil' : diffOptions === 'medium' ? 'médio' : 'difícil'}.
Use temas variados: personagens bíblicos, livros da Bíblia, histórias, versículos e aplicações práticas.
Retorne APENAS um JSON válido no formato:
{
  "title": "título criativo do quiz",
  "description": "breve descrição",
  "emoji": "emoji representativo",
  "questions": [
    { "question": "texto da pergunta", "reference": "referência bíblica", "options": ["A","B","C","D"], "correct": 0 }
  ]
}`;
        try {
          const aiText = await callAI(provider, apiKey, systemPrompt, prompt, 0.7, 4096);
          const rawQuizData = extractJsonObject(aiText);
          const quizData = normalizeQuizData(rawQuizData);
          const { rows: [quiz] } = await pool.query(
            `INSERT INTO quizzes (church_id, title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active, is_auto_generated, generated_week, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,true,true,CURRENT_DATE,$8) RETURNING *`,
            [churchId, quizData.title, quizData.description, cat, diffOptions, cat === 'kids' ? 45 : 30, quizData.emoji, req.user.id]
          );
          for (let qi = 0; qi < quizData.questions.length; qi++) {
            const q = quizData.questions[qi];
            const { rows: [question] } = await pool.query(
              'INSERT INTO quiz_questions (quiz_id, question_text, bible_reference, question_order) VALUES ($1,$2,$3,$4) RETURNING *',
              [quiz.id, q.question, q.reference, qi]
            );
            for (let oi = 0; oi < q.options.length; oi++) {
              await pool.query('INSERT INTO quiz_options (question_id, option_text, is_correct, option_order) VALUES ($1,$2,$3,$4)', [question.id, q.options[oi], oi === q.correct, oi]);
            }
          }
          generated.push(quiz);
        } catch (aiErr) {
          warnings.push(`${cat}: ${aiErr instanceof Error ? aiErr.message : 'Erro'}`);
        }
      }
    }
    if (!generated.length) return res.status(502).json({ error: warnings[0] || 'Erro ao gerar quizzes.' });
    res.json({ generated: generated.length, quizzes: generated, warnings });
  } catch (err) {
    console.error('Generate quizzes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/quizzes/:id — quiz with questions and options
router.get('/:id', async (req, res) => {
  try {
    const { rows: [quiz] } = await pool.query(
      `SELECT q.*,
        (SELECT MAX(qa.score) FROM quiz_attempts qa WHERE qa.quiz_id = q.id AND qa.user_id = $3) as best_score,
        (SELECT qa2.total_questions FROM quiz_attempts qa2 WHERE qa2.quiz_id = q.id AND qa2.user_id = $3 ORDER BY qa2.score DESC LIMIT 1) as best_total
       FROM quizzes q WHERE q.id = $1 AND q.church_id = $2`,
      [req.params.id, req.user.church_id, req.user.id]
    );
    if (!quiz) return res.status(404).json({ error: 'Not found' });
    const { rows: questions } = await pool.query('SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY question_order', [quiz.id]);
    for (const q of questions) {
      const { rows: options } = await pool.query('SELECT id, option_text, option_order FROM quiz_options WHERE question_id = $1 ORDER BY option_order', [q.id]);
      q.options = options;
    }
    quiz.questions = questions;
    res.json(quiz);
  } catch (err) {
    console.error('GET quiz detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/church/quizzes/:id/submit — submit answers (1 attempt per quiz per user)
router.post('/:id/submit', async (req, res) => {
  try {
    const { answers, time_spent_seconds } = req.body;
    if (!answers) return res.status(400).json({ error: 'Answers required' });

    const { rows: existing } = await pool.query(
      'SELECT id FROM quiz_attempts WHERE quiz_id = $1 AND user_id = $2 LIMIT 1',
      [req.params.id, req.user.id]
    );
    if (existing.length > 0) return res.status(409).json({ error: 'Você já jogou este quiz.' });

    const { rows: questions } = await pool.query(
      'SELECT qq.id, qo.id as correct_option_id FROM quiz_questions qq JOIN quiz_options qo ON qo.question_id = qq.id AND qo.is_correct = true WHERE qq.quiz_id = $1',
      [req.params.id]
    );

    let score = 0;
    const results = [];
    for (const q of questions) {
      const isCorrect = answers[q.id] === q.correct_option_id;
      if (isCorrect) score++;
      results.push({ question_id: q.id, correct_option_id: q.correct_option_id, selected: answers[q.id], is_correct: isCorrect });
    }

    // Get quiz level info
    const { rows: [quizInfo] } = await pool.query('SELECT challenge_level FROM quizzes WHERE id = $1', [req.params.id]);
    const quizLevel = quizInfo?.challenge_level || 1;

    await pool.query(
      'INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, time_spent_seconds, phase_level) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.params.id, req.user.id, score, questions.length, time_spent_seconds || 0, quizLevel]
    );

    // Update user_game_points
    const churchId = req.user.church_id;
    const { rows: [currentGP] } = await pool.query(
      'SELECT * FROM user_game_points WHERE user_id = $1 AND church_id = $2',
      [req.user.id, churchId]
    );

    const newTotal = (currentGP?.total_points || 0) + score;
    const newCompleted = (currentGP?.quizzes_completed || 0) + 1;
    const newLevel = getLevelForPoints(newTotal);

    await pool.query(
      `INSERT INTO user_game_points (user_id, church_id, total_points, current_level, quizzes_completed, updated_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT (user_id, church_id) DO UPDATE SET total_points=$3, current_level=$4, quizzes_completed=$5, updated_at=NOW()`,
      [req.user.id, churchId, newTotal, newLevel, newCompleted]
    );

    const leveledUp = currentGP && newLevel > (currentGP.current_level || 1);

    res.json({ score, total: questions.length, results, total_points: newTotal, new_level: newLevel, leveled_up: leveledUp });
  } catch (err) {
    console.error('Submit quiz error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/quizzes/:id/ranking
router.get('/:id/ranking', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT qa.user_id, u.name, MAX(qa.score) as best_score, qa.total_questions, MIN(qa.time_spent_seconds) as best_time
       FROM quiz_attempts qa JOIN users u ON u.id = qa.user_id
       WHERE qa.quiz_id = $1
       GROUP BY qa.user_id, u.name, qa.total_questions
       ORDER BY best_score DESC, best_time ASC
       LIMIT 20`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== ADMIN CRUD =====
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') return res.status(403).json({ error: 'Forbidden' });
    const { title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active } = req.body;
    const { rows: [quiz] } = await pool.query(
      `INSERT INTO quizzes (church_id, title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.church_id, title, description || '', category || 'general', difficulty || 'easy', time_limit_seconds || 30, cover_emoji || '📖', is_active || false, req.user.id]
    );
    res.json(quiz);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') return res.status(403).json({ error: 'Forbidden' });
    const { title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active } = req.body;
    const { rows: [quiz] } = await pool.query(
      `UPDATE quizzes SET title=$1, description=$2, category=$3, difficulty=$4, time_limit_seconds=$5, cover_emoji=$6, is_active=$7, updated_at=NOW()
       WHERE id=$8 AND church_id=$9 RETURNING *`,
      [title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active, req.params.id, req.user.church_id]
    );
    res.json(quiz);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM quizzes WHERE id=$1 AND church_id=$2', [req.params.id, req.user.church_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/questions', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') return res.status(403).json({ error: 'Forbidden' });
    const { question_text, bible_reference, options } = req.body;
    if (!question_text || !options || options.length < 2) return res.status(400).json({ error: 'question_text and at least 2 options required' });
    const { rows: [maxOrder] } = await pool.query('SELECT COALESCE(MAX(question_order), 0) + 1 as next_order FROM quiz_questions WHERE quiz_id = $1', [req.params.id]);
    const { rows: [question] } = await pool.query(
      'INSERT INTO quiz_questions (quiz_id, question_text, bible_reference, question_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, question_text, bible_reference || null, maxOrder.next_order]
    );
    const insertedOptions = [];
    for (let i = 0; i < options.length; i++) {
      const { rows: [opt] } = await pool.query(
        'INSERT INTO quiz_options (question_id, option_text, is_correct, option_order) VALUES ($1,$2,$3,$4) RETURNING *',
        [question.id, options[i].option_text, options[i].is_correct || false, i]
      );
      insertedOptions.push(opt);
    }
    question.options = insertedOptions;
    res.json(question);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/questions/:questionId', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM quiz_questions WHERE id = $1', [req.params.questionId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
