const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/polls
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT p.*,
        (SELECT json_agg(json_build_object('id', po.id, 'label', po.label, 'position', po.position,
          'votes', (SELECT COUNT(*)::int FROM poll_votes pv WHERE pv.option_id = po.id))
         ORDER BY po.position) FROM poll_options po WHERE po.poll_id = p.id) as options,
        (SELECT pv2.option_id FROM poll_votes pv2 WHERE pv2.poll_id = p.id AND pv2.user_id = $2) as my_vote
       FROM polls p WHERE p.church_id = $1 ORDER BY p.created_at DESC`,
      [churchId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET polls error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/polls
router.post('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });
    const { title, description, options, group_id, ends_at } = req.body;
    if (!title || !options?.length) return res.status(400).json({ error: 'Title and options required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO polls (church_id, group_id, title, description, created_by, ends_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [churchId, group_id || null, title, description || null, req.user.id, ends_at || null]
      );
      const poll = rows[0];
      for (let i = 0; i < options.length; i++) {
        await client.query(
          'INSERT INTO poll_options (poll_id, label, position) VALUES ($1, $2, $3)',
          [poll.id, options[i], i]
        );
      }
      await client.query('COMMIT');
      // Return full poll
      const full = await pool.query(
        `SELECT p.*,
          (SELECT json_agg(json_build_object('id', po.id, 'label', po.label, 'position', po.position, 'votes', 0)
           ORDER BY po.position) FROM poll_options po WHERE po.poll_id = p.id) as options
         FROM polls p WHERE p.id = $1`, [poll.id]
      );
      res.status(201).json({ ...full.rows[0], my_vote: null });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('POST polls error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/polls/:id/vote
router.post('/:id/vote', async (req, res) => {
  try {
    const { option_id } = req.body;
    if (!option_id) return res.status(400).json({ error: 'option_id required' });
    // Upsert vote
    await pool.query(
      `INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES ($1, $2, $3)
       ON CONFLICT (poll_id, user_id) DO UPDATE SET option_id = $2`,
      [req.params.id, option_id, req.user.id]
    );
    res.json({ message: 'Voted' });
  } catch (err) {
    console.error('POST vote error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/polls/:id
router.delete('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    await pool.query('DELETE FROM polls WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE poll error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
