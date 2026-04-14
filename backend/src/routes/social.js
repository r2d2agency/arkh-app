const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/social/today — check if user already generated today
router.get('/today', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, verse_text, verse_reference, custom_text, template_id, created_at
       FROM social_posts
       WHERE user_id = $1 AND created_at::date = CURRENT_DATE
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json({ count_today: rows.length, limit: 5, post: rows[0] || null });
  } catch (err) {
    console.error('GET social/today error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/social/generate — save a generated post (1 per day)
router.post('/generate', async (req, res) => {
  try {
    // Check daily limit
    const { rows: existing } = await pool.query(
      `SELECT id FROM social_posts WHERE user_id = $1 AND created_at::date = CURRENT_DATE`,
      [req.user.id]
    );
    if (existing.length >= 5) {
      return res.status(429).json({ error: 'Você atingiu o limite de 5 posts hoje. Volte amanhã!' });
    }

    const { verse_text, verse_reference, custom_text, template_id } = req.body;
    const churchId = req.user.church_id;

    const { rows } = await pool.query(
      `INSERT INTO social_posts (user_id, church_id, verse_text, verse_reference, custom_text, template_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, churchId, verse_text || null, verse_reference || null, custom_text || null, template_id || 'classic']
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST social/generate error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/social/history — user's post history
router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM social_posts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
