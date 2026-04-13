const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/announcements
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
       FROM announcements a
       LEFT JOIN users u ON a.created_by = u.id
       WHERE a.church_id = $1
       ORDER BY a.is_pinned DESC, a.created_at DESC
       LIMIT 50`,
      [churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET announcements error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/announcements
router.post('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });

    const { title, body, image_url, media_urls, video_url, event_id, event_date, event_time, is_pinned, notify_members } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const { rows } = await pool.query(
      `INSERT INTO announcements (church_id, title, body, image_url, media_urls, video_url, event_id, event_date, event_time, is_pinned, notify_members, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [churchId, title, body || null, image_url || null, media_urls || [], video_url || null,
       event_id || null, event_date || null, event_time || null,
       is_pinned || false, notify_members || false, req.user.id]
    );

    // If notify_members, create notifications for all church members
    if (notify_members) {
      const { rows: members } = await pool.query(
        `SELECT id FROM users WHERE church_id = $1 AND is_active = true AND id != $2`,
        [churchId, req.user.id]
      );
      if (members.length > 0) {
        const values = members.map((m, i) => 
          `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
        ).join(',');
        const params = members.flatMap(m => [
          m.id, `📢 ${title}`, body || title, 'announcement', churchId
        ]);
        await pool.query(
          `INSERT INTO notifications (user_id, title, body, type, church_id) VALUES ${values}`,
          params
        );
      }
    }

    // Fetch with author info
    const { rows: full } = await pool.query(
      `SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
       FROM announcements a LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`, [rows[0].id]
    );

    res.status(201).json(full[0]);
  } catch (err) {
    console.error('POST announcements error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/announcements/:id
router.put('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });

    const { title, body, image_url, media_urls, video_url, event_date, event_time, is_pinned } = req.body;
    const { rows } = await pool.query(
      `UPDATE announcements SET
        title = COALESCE($1, title),
        body = $2,
        image_url = $3,
        media_urls = COALESCE($4, media_urls),
        video_url = $5,
        event_date = $6,
        event_time = $7,
        is_pinned = COALESCE($8, is_pinned),
        updated_at = NOW()
       WHERE id = $9 AND church_id = $10 RETURNING *`,
      [title, body || null, image_url || null, media_urls || [], video_url || null,
       event_date || null, event_time || null, is_pinned, req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT announcements error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/announcements/:id
router.delete('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    await pool.query('DELETE FROM announcements WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE announcements error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
