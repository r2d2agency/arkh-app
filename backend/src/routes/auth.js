const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const remember = req.body.remember || false;
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, church_id: user.church_id },
      process.env.JWT_SECRET,
      { expiresIn: remember ? '30d' : '7d' }
    );

    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + (remember ? 90 : 30) * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return res.status(400).json({ error: 'Refresh token required' });

    const { rows } = await pool.query(
      'SELECT rt.*, u.email, u.role, u.church_id FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id WHERE rt.token = $1 AND rt.expires_at > NOW()',
      [refresh_token]
    );
    if (!rows.length) return res.status(401).json({ error: 'Invalid refresh token' });

    const row = rows[0];
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refresh_token]);

    const accessToken = jwt.sign(
      { id: row.user_id, email: row.email, role: row.role, church_id: row.church_id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const newRefresh = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [row.user_id, newRefresh, expiresAt]
    );

    res.json({ access_token: accessToken, refresh_token: newRefresh });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/logout', async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refresh_token]);
  }
  res.json({ message: 'Logged out' });
});

module.exports = router;
