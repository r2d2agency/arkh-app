const router = require('express').Router();
const pool = require('../db/pool');

// List agents with provider info
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT a.*, p.name as provider_name, p.provider as provider_type, p.model as provider_model
      FROM ai_agents a
      LEFT JOIN ai_providers p ON a.provider_id = p.id
      ORDER BY a.name
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Create agent
router.post('/', async (req, res) => {
  try {
    const { name, description, role, provider_id, system_prompt, temperature, max_tokens, is_active } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO ai_agents (name, description, role, provider_id, system_prompt, temperature, max_tokens, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, description || null, role, provider_id || null, system_prompt || null, temperature ?? 0.7, max_tokens ?? 2048, is_active ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Update agent
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, role, provider_id, system_prompt, temperature, max_tokens, is_active } = req.body;
    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (description !== undefined) { sets.push(`description = $${idx++}`); vals.push(description); }
    if (role !== undefined) { sets.push(`role = $${idx++}`); vals.push(role); }
    if (provider_id !== undefined) { sets.push(`provider_id = $${idx++}`); vals.push(provider_id || null); }
    if (system_prompt !== undefined) { sets.push(`system_prompt = $${idx++}`); vals.push(system_prompt); }
    if (temperature !== undefined) { sets.push(`temperature = $${idx++}`); vals.push(temperature); }
    if (max_tokens !== undefined) { sets.push(`max_tokens = $${idx++}`); vals.push(max_tokens); }
    if (is_active !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(is_active); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE ai_agents SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
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
router.put('/:id/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE ai_agents SET is_active = NOT is_active WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete agent
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM ai_agents WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
