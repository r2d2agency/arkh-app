const router = require('express').Router();
const pool = require('../db/pool');

// Force HTTPS on URLs to avoid mixed content
function forceHttps(url) {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

function sanitizeRow(row) {
  if (!row) return row;
  if (row.image_url) row.image_url = forceHttps(row.image_url);
  if (row.author_avatar) row.author_avatar = forceHttps(row.author_avatar);
  if (Array.isArray(row.media_urls)) row.media_urls = row.media_urls.map(forceHttps);
  return row;
}

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

    const { title, body, image_url, media_urls, video_url, event_id, event_date, event_time, is_pinned, notify_members, recurrence, recurrence_day, recurrence_time } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const { rows } = await pool.query(
      `INSERT INTO announcements (church_id, title, body, image_url, media_urls, video_url, event_id, event_date, event_time, is_pinned, notify_members, created_by, recurrence, recurrence_day, recurrence_time)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [churchId, title, body || null, image_url || null, media_urls || [], video_url || null,
       event_id || null, event_date || null, event_time || null,
       is_pinned || false, notify_members || false, req.user.id,
       recurrence || null, recurrence_day != null ? recurrence_day : null, recurrence_time || '09:00']
    );

    if (notify_members) {
      await sendNotifications(churchId, req.user.id, title, body);
    }

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

    const { title, body, image_url, media_urls, video_url, event_date, event_time, is_pinned, recurrence, recurrence_day, recurrence_time } = req.body;
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
        recurrence = $9,
        recurrence_day = $10,
        recurrence_time = COALESCE($11, '09:00'),
        updated_at = NOW()
       WHERE id = $12 AND church_id = $13 RETURNING *`,
      [title, body || null, image_url || null, media_urls || [], video_url || null,
       event_date || null, event_time || null, is_pinned,
       recurrence || null, recurrence_day != null ? recurrence_day : null, recurrence_time || '09:00',
       req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const { rows: full } = await pool.query(
      `SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
       FROM announcements a LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`, [rows[0].id]
    );
    res.json(full[0]);
  } catch (err) {
    console.error('PUT announcements error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/announcements/:id/resend — resend notifications
router.post('/:id/resend', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await pool.query(
      'SELECT * FROM announcements WHERE id = $1 AND church_id = $2',
      [req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const ann = rows[0];
    await sendNotifications(churchId, req.user.id, ann.title, ann.body);
    await pool.query('UPDATE announcements SET last_sent_at = NOW() WHERE id = $1', [ann.id]);

    res.json({ message: 'Notifications resent' });
  } catch (err) {
    console.error('Resend error:', err);
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

// Helper: send notifications to all church members
async function sendNotifications(churchId, excludeUserId, title, body) {
  const { rows: members } = await pool.query(
    `SELECT id FROM users WHERE church_id = $1 AND is_active = true AND id != $2`,
    [churchId, excludeUserId]
  );
  if (members.length === 0) return;
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

module.exports = router;
