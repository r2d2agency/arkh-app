const router = require('express').Router();
const pool = require('../db/pool');

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
       WHERE q.church_id = $1 ${activeFilter}
       ORDER BY q.created_at DESC`,
      [churchId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET quizzes error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/quizzes/:id — quiz with questions and options
router.get('/:id', async (req, res) => {
  try {
    const { rows: [quiz] } = await pool.query(
      'SELECT * FROM quizzes WHERE id = $1 AND church_id = $2',
      [req.params.id, req.user.church_id]
    );
    if (!quiz) return res.status(404).json({ error: 'Not found' });

    const { rows: questions } = await pool.query(
      'SELECT * FROM quiz_questions WHERE quiz_id = $1 ORDER BY question_order',
      [quiz.id]
    );

    for (const q of questions) {
      const { rows: options } = await pool.query(
        'SELECT id, option_text, option_order FROM quiz_options WHERE question_id = $1 ORDER BY option_order',
        [q.id]
      );
      q.options = options;
    }

    quiz.questions = questions;
    res.json(quiz);
  } catch (err) {
    console.error('GET quiz detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/church/quizzes/:id/submit — submit answers
router.post('/:id/submit', async (req, res) => {
  try {
    const { answers, time_spent_seconds } = req.body; // answers: { questionId: optionId }
    if (!answers) return res.status(400).json({ error: 'Answers required' });

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

    await pool.query(
      'INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, time_spent_seconds) VALUES ($1, $2, $3, $4, $5)',
      [req.params.id, req.user.id, score, questions.length, time_spent_seconds || 0]
    );

    res.json({ score, total: questions.length, results });
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ADMIN CRUD =====

// POST /api/church/quizzes — create quiz
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });

    const { title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active } = req.body;
    const { rows: [quiz] } = await pool.query(
      `INSERT INTO quizzes (church_id, title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.church_id, title, description || '', category || 'general', difficulty || 'easy', time_limit_seconds || 30, cover_emoji || '📖', is_active || false, req.user.id]
    );
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/church/quizzes/:id
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });

    const { title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active } = req.body;
    const { rows: [quiz] } = await pool.query(
      `UPDATE quizzes SET title=$1, description=$2, category=$3, difficulty=$4, time_limit_seconds=$5, cover_emoji=$6, is_active=$7, updated_at=NOW()
       WHERE id=$8 AND church_id=$9 RETURNING *`,
      [title, description, category, difficulty, time_limit_seconds, cover_emoji, is_active, req.params.id, req.user.church_id]
    );
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/church/quizzes/:id
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM quizzes WHERE id=$1 AND church_id=$2', [req.params.id, req.user.church_id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/church/quizzes/:id/questions — add question with options
router.post('/:id/questions', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });

    const { question_text, bible_reference, options } = req.body;
    // options: [{ option_text, is_correct }]
    if (!question_text || !options || options.length < 2) return res.status(400).json({ error: 'question_text and at least 2 options required' });

    const { rows: [maxOrder] } = await pool.query(
      'SELECT COALESCE(MAX(question_order), 0) + 1 as next_order FROM quiz_questions WHERE quiz_id = $1',
      [req.params.id]
    );

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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/church/quizzes/questions/:questionId
router.delete('/questions/:questionId', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM quiz_questions WHERE id = $1', [req.params.questionId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
