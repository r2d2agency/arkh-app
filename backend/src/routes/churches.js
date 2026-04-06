const router = require('express').Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, p.name as plan_name,
        (SELECT COUNT(*) FROM users WHERE church_id = c.id) as member_count
      FROM churches c
      LEFT JOIN plans p ON p.id = c.plan_id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, slug, plan_id, status } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' });

    const { rows } = await pool.query(
      'INSERT INTO churches (name, slug, plan_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, slug, plan_id || null, status || 'trial']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already exists' });
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, slug, status, plan_id } = req.body;
    const { rows } = await pool.query(
      'UPDATE churches SET name = COALESCE($1, name), slug = COALESCE($2, slug), status = COALESCE($3, status), plan_id = COALESCE($4, plan_id) WHERE id = $5 RETURNING *',
      [name, slug, status, plan_id, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM churches WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
