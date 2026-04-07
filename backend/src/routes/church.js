const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/services — list services for the logged-in user's church
router.get('/services', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });

    const { rows } = await pool.query(
      `SELECT * FROM services WHERE church_id = $1 ORDER BY created_at DESC`,
      [churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET services error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/services — create a new service
router.post('/services', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });

    const { title, youtube_url, preacher, service_date, ai_start_time, ai_end_time } = req.body;
    if (!title || !youtube_url) return res.status(400).json({ error: 'Title and YouTube URL required' });

    // Extract video ID
    const match = youtube_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const videoId = match ? match[1] : null;
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

    const { rows } = await pool.query(
      `INSERT INTO services (church_id, title, youtube_url, video_id, thumbnail_url, preacher, service_date, ai_start_time, ai_end_time, ai_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING *`,
      [churchId, title, youtube_url, videoId, thumbnailUrl, preacher || null, service_date || null, ai_start_time || null, ai_end_time || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST services error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/services/:id — update a service
router.put('/services/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { title, youtube_url, preacher, service_date, ai_start_time, ai_end_time } = req.body;

    const { rows } = await pool.query(
      `UPDATE services SET
        title = COALESCE($1, title),
        youtube_url = COALESCE($2, youtube_url),
        preacher = COALESCE($3, preacher),
        service_date = COALESCE($4, service_date),
        ai_start_time = COALESCE($5, ai_start_time),
        ai_end_time = COALESCE($6, ai_end_time)
      WHERE id = $7 AND church_id = $8 RETURNING *`,
      [title, youtube_url, preacher, service_date, ai_start_time, ai_end_time, req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT services error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/services/:id
router.delete('/services/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    await pool.query('DELETE FROM services WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE services error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/services/:id/process — trigger AI processing
router.post('/services/:id/process', async (req, res) => {
  try {
    const churchId = req.user.church_id;

    // Check service exists
    const { rows: svcRows } = await pool.query(
      'SELECT * FROM services WHERE id = $1 AND church_id = $2',
      [req.params.id, churchId]
    );
    if (!svcRows.length) return res.status(404).json({ error: 'Service not found' });

    // Update status to processing
    await pool.query(
      `UPDATE services SET ai_status = 'processing' WHERE id = $1`,
      [req.params.id]
    );

    // TODO: Integrate with actual AI provider (agent) to transcribe and generate content
    // For now, mark as queued
    res.json({ message: 'AI processing queued', status: 'processing' });
  } catch (err) {
    console.error('Process service error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
