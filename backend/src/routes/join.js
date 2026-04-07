const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

// POST /api/join/:slug — member self-registration for a church
router.post('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find church by slug
    const { rows: churchRows } = await pool.query(
      'SELECT id, name FROM churches WHERE slug = $1 AND status != $2',
      [slug, 'suspended']
    );
    if (!churchRows.length) return res.status(404).json({ error: 'Igreja não encontrada' });
    const church = churchRows[0];

    // Check existing email
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email já cadastrado' });

    const hash = await bcrypt.hash(password, 10);
    const { rows: userRows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, church_id, is_active)
       VALUES ($1, $2, $3, 'member', $4, true) RETURNING id, name, email, role, church_id`,
      [name, email, hash, church.id]
    );
    const user = userRows[0];

    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, church_id: user.church_id },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user,
      church: { id: church.id, name: church.name },
    });
  } catch (err) {
    console.error('Join error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/join/:slug — get church info for join page
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, logo_url FROM churches WHERE slug = $1 AND status != 'suspended'`,
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: 'Igreja não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
