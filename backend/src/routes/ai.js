const router = require('express').Router();
const pool = require('../db/pool');

router.get('/providers', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, provider, model, is_active, cost_per_1k_tokens, created_at FROM ai_providers ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/providers', async (req, res) => {
  try {
    const { name, provider, model, api_key_encrypted, is_active, cost_per_1k_tokens } = req.body;
    const { rows } = await pool.query(
      'INSERT INTO ai_providers (name, provider, model, api_key_encrypted, is_active, cost_per_1k_tokens) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, provider, model, is_active, cost_per_1k_tokens',
      [name, provider, model, api_key_encrypted, is_active ?? true, cost_per_1k_tokens || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT provider, model, SUM(tokens_used) as total_tokens, SUM(cost) as total_cost, COUNT(*) as requests
      FROM ai_usage WHERE created_at >= date_trunc('month', NOW())
      GROUP BY provider, model ORDER BY total_cost DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
