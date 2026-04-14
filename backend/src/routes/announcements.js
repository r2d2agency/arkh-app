const router = require('express').Router();
const pool = require('../db/pool');

// Set timezone for this connection
pool.query("SET timezone = 'America/Sao_Paulo'").catch(() => {});

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
    res.json(rows.map(sanitizeRow));
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

    const { title, body, image_url, event_id, is_pinned, notify_members } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    // Build dynamic INSERT based on available columns
    let cols = ['church_id', 'title', 'body', 'image_url', 'event_id', 'is_pinned', 'notify_members', 'created_by'];
    let vals = [churchId, title, body || null, forceHttps(image_url) || null, event_id || null, is_pinned || false, notify_members || false, req.user.id];

    // Optional columns from migrations
    const optionalFields = {
      media_urls: { value: req.body.media_urls || [], transform: v => Array.isArray(v) ? v.map(forceHttps) : [] },
      video_url: { value: req.body.video_url || null },
      event_date: { value: req.body.event_date || null },
      event_time: { value: req.body.event_time || null },
      recurrence: { value: req.body.recurrence || null },
      recurrence_day: { value: req.body.recurrence_day != null ? req.body.recurrence_day : null },
      recurrence_time: { value: req.body.recurrence_time || '09:00' },
    };

    for (const [col, config] of Object.entries(optionalFields)) {
      cols.push(col);
      vals.push(config.transform ? config.transform(config.value) : config.value);
    }

    const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await pool.query(
      `INSERT INTO announcements (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`,
      vals
    );

    if (notify_members) {
      await sendNotifications(churchId, req.user.id, title, body);
    }

    const { rows: full } = await pool.query(
      `SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
       FROM announcements a LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`, [rows[0].id]
    );

    res.status(201).json(sanitizeRow(full[0]));
  } catch (err) {
    console.error('POST announcements error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// PUT /api/church/announcements/:id
router.put('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });

    const { title, body, image_url, is_pinned } = req.body;

    // Build SET clause dynamically — only include base columns guaranteed to exist
    let sets = [];
    let vals = [];
    let idx = 1;

    if (title !== undefined) { sets.push(`title = $${idx++}`); vals.push(title); }
    sets.push(`body = $${idx++}`); vals.push(body || null);
    sets.push(`image_url = $${idx++}`); vals.push(forceHttps(image_url) || null);
    if (is_pinned !== undefined) { sets.push(`is_pinned = $${idx++}`); vals.push(is_pinned); }
    sets.push(`updated_at = NOW()`);

    // Try optional columns — wrapped individually so missing columns don't break the query
    const optionalSets = [];
    const optionalCols = [
      { col: 'media_urls', value: req.body.media_urls },
      { col: 'video_url', value: req.body.video_url },
      { col: 'event_date', value: req.body.event_date },
      { col: 'event_time', value: req.body.event_time },
      { col: 'recurrence', value: req.body.recurrence },
      { col: 'recurrence_day', value: req.body.recurrence_day },
      { col: 'recurrence_time', value: req.body.recurrence_time },
    ];

    for (const { col, value } of optionalCols) {
      if (value !== undefined) {
        sets.push(`${col} = $${idx++}`);
        if (col === 'media_urls') {
          vals.push(Array.isArray(value) ? value.map(forceHttps) : []);
        } else {
          vals.push(value || null);
        }
      }
    }

    vals.push(req.params.id, churchId);
    const whereClause = `WHERE id = $${idx++} AND church_id = $${idx++}`;

    const { rows } = await pool.query(
      `UPDATE announcements SET ${sets.join(', ')} ${whereClause} RETURNING *`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });

    const { rows: full } = await pool.query(
      `SELECT a.*, u.name as author_name, u.avatar_url as author_avatar
       FROM announcements a LEFT JOIN users u ON a.created_by = u.id
       WHERE a.id = $1`, [rows[0].id]
    );
    res.json(sanitizeRow(full[0]));
  } catch (err) {
    console.error('PUT announcements error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
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
    
    // Try updating last_sent_at if column exists
    try {
      await pool.query('UPDATE announcements SET last_sent_at = NOW() WHERE id = $1', [ann.id]);
    } catch (_) { /* column may not exist yet */ }

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
