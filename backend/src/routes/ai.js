const router = require('express').Router();
const pool = require('../db/pool');

// List providers (with key count, never expose actual keys)
router.get('/providers', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, provider, model, is_active, cost_per_1k_tokens,
        COALESCE(array_length(api_keys_encrypted, 1), 0) as api_key_count,
        created_at
      FROM ai_providers ORDER BY name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Create provider
router.post('/providers', async (req, res) => {
  try {
    const { name, provider, model, api_keys, is_active, cost_per_1k_tokens } = req.body;
    const keysArray = Array.isArray(api_keys) ? api_keys : (api_keys ? [api_keys] : []);
    const { rows } = await pool.query(
      `INSERT INTO ai_providers (name, provider, model, api_keys_encrypted, is_active, cost_per_1k_tokens)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, provider, model, is_active, cost_per_1k_tokens,
         COALESCE(array_length(api_keys_encrypted, 1), 0) as api_key_count`,
      [name, provider, model, keysArray, is_active ?? true, cost_per_1k_tokens || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Update provider
router.put('/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, provider, model, api_keys, is_active, cost_per_1k_tokens } = req.body;
    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (provider !== undefined) { sets.push(`provider = $${idx++}`); vals.push(provider); }
    if (model !== undefined) { sets.push(`model = $${idx++}`); vals.push(model); }
    if (api_keys !== undefined) {
      const keysArray = Array.isArray(api_keys) ? api_keys : [api_keys];
      sets.push(`api_keys_encrypted = $${idx++}`);
      vals.push(keysArray);
    }
    if (is_active !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(is_active); }
    if (cost_per_1k_tokens !== undefined) { sets.push(`cost_per_1k_tokens = $${idx++}`); vals.push(cost_per_1k_tokens); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE ai_providers SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, name, provider, model, is_active, cost_per_1k_tokens,
         COALESCE(array_length(api_keys_encrypted, 1), 0) as api_key_count`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Toggle active
router.put('/providers/:id/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE ai_providers SET is_active = NOT is_active WHERE id = $1
       RETURNING id, name, provider, model, is_active, cost_per_1k_tokens,
         COALESCE(array_length(api_keys_encrypted, 1), 0) as api_key_count`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete provider
router.delete('/providers/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM ai_providers WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Usage stats
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
