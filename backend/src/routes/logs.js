const router = require('express').Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const { level, limit = 100, offset = 0 } = req.query;
    let query = `
      SELECT sl.*, u.name as user_name, c.name as church_name
      FROM system_logs sl
      LEFT JOIN users u ON u.id = sl.user_id
      LEFT JOIN churches c ON c.id = sl.church_id
    `;
    const params = [];
    if (level) {
      params.push(level);
      query += ` WHERE sl.level = $${params.length}`;
    }
    query += ` ORDER BY sl.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(+limit, +offset);

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
