const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.email, u.name, u.role, u.is_active, u.last_login, u.created_at,
        c.name as church_name
      FROM users u
      LEFT JOIN churches c ON c.id = u.church_id
      WHERE u.role != 'super_admin'
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, password, name, role, church_id } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, name, role, church_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role',
      [email, hash, name, role || 'member', church_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Internal error' });
  }
});

router.put('/:id/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
