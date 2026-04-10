const router = require('express').Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, (SELECT COUNT(*) FROM churches WHERE plan_id = p.id) as church_count
      FROM plans p ORDER BY p.price ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, price, interval, max_members, max_ai_tokens, features, ai_assistant_enabled, ai_assistant_daily_limit, ai_assistant_max_tokens_per_msg } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO plans (name, price, interval, max_members, max_ai_tokens, features, ai_assistant_enabled, ai_assistant_daily_limit, ai_assistant_max_tokens_per_msg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [name, price || 0, interval || 'monthly', max_members || 50, max_ai_tokens || 100000, JSON.stringify(features || []),
       ai_assistant_enabled || false, ai_assistant_daily_limit || 0, ai_assistant_max_tokens_per_msg || 2000]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, price, interval, max_members, max_ai_tokens, features, is_active, ai_assistant_enabled, ai_assistant_daily_limit, ai_assistant_max_tokens_per_msg } = req.body;
    const { rows } = await pool.query(
      `UPDATE plans SET name = COALESCE($1, name), price = COALESCE($2, price), interval = COALESCE($3, interval),
       max_members = COALESCE($4, max_members), max_ai_tokens = COALESCE($5, max_ai_tokens),
       features = COALESCE($6, features), is_active = COALESCE($7, is_active),
       ai_assistant_enabled = COALESCE($8, ai_assistant_enabled),
       ai_assistant_daily_limit = COALESCE($9, ai_assistant_daily_limit),
       ai_assistant_max_tokens_per_msg = COALESCE($10, ai_assistant_max_tokens_per_msg)
       WHERE id = $11 RETURNING *`,
      [name, price, interval, max_members, max_ai_tokens, features ? JSON.stringify(features) : null, is_active,
       ai_assistant_enabled, ai_assistant_daily_limit, ai_assistant_max_tokens_per_msg, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
