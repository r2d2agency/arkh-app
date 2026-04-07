const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

// Public: church self-registration
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { church_name, slug, admin_name, email, password, phone } = req.body;

    if (!church_name || !slug || !admin_name || !email || !password) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug deve conter apenas letras minúsculas, números e hífens' });
    }

    await client.query('BEGIN');

    // Check if slug already exists
    const { rows: existing } = await client.query('SELECT id FROM churches WHERE slug = $1', [slug]);
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este slug já está em uso' });
    }

    // Check if email already exists
    const { rows: existingUser } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este email já está cadastrado' });
    }

    // Get free plan if exists
    const { rows: freePlan } = await client.query(
      "SELECT id FROM plans WHERE price = 0 AND is_active = true ORDER BY created_at LIMIT 1"
    );

    // Create church
    const { rows: churchRows } = await client.query(
      `INSERT INTO churches (name, slug, plan_id, status, settings)
       VALUES ($1, $2, $3, 'trial', '{"theme": "default"}')
       RETURNING *`,
      [church_name, slug, freePlan.length ? freePlan[0].id : null]
    );
    const church = churchRows[0];

    // Create admin user
    const hash = await bcrypt.hash(password, 12);
    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, password_hash, name, role, church_id)
       VALUES ($1, $2, $3, 'admin_church', $4)
       RETURNING id, email, name, role, church_id`,
      [email, hash, admin_name, church.id]
    );
    const user = userRows[0];

    // Log
    await client.query(
      `INSERT INTO system_logs (level, action, message, user_id, church_id)
       VALUES ('info', 'church_registered', $1, $2, $3)`,
      [`Igreja "${church_name}" cadastrada via auto-registro`, user.id, church.id]
    );

    await client.query('COMMIT');

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, church_id: user.church_id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, church_id: user.church_id },
      church
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'Dados duplicados' });
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
});

module.exports = router;
