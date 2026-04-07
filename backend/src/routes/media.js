const router = require('express').Router();
const pool = require('../db/pool');

// ========== MEDIA PROGRESS ==========

// GET /api/church/media/progress — get all user progress
router.get('/progress', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT mp.*, s.title as service_title, s.thumbnail_url
       FROM media_progress mp
       JOIN services s ON mp.service_id = s.id
       WHERE mp.user_id = $1
       ORDER BY mp.last_played_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/media/progress/:serviceId — update progress
router.put('/progress/:serviceId', async (req, res) => {
  try {
    const { current_time, duration, completed } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO media_progress (user_id, service_id, current_time, duration, completed, last_played_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id, service_id) DO UPDATE SET
         current_time = $3, duration = COALESCE($4, media_progress.duration),
         completed = COALESCE($5, media_progress.completed), last_played_at = NOW()
       RETURNING *`,
      [req.user.id, req.params.serviceId, current_time || 0, duration || 0, completed || false]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== FAVORITES ==========

// GET /api/church/media/favorites
router.get('/favorites', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.*, 
        CASE WHEN f.content_type = 'service' THEN s.title
             WHEN f.content_type = 'study' THEN bs.title
             ELSE NULL END as content_title,
        CASE WHEN f.content_type = 'service' THEN s.thumbnail_url ELSE NULL END as thumbnail_url
       FROM favorites f
       LEFT JOIN services s ON f.content_type = 'service' AND f.content_id = s.id
       LEFT JOIN bible_studies bs ON f.content_type = 'study' AND f.content_id = bs.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/media/favorites
router.post('/favorites', async (req, res) => {
  try {
    const { content_type, content_id } = req.body;
    if (!content_type || !content_id) return res.status(400).json({ error: 'content_type and content_id required' });
    
    const { rows } = await pool.query(
      `INSERT INTO favorites (user_id, content_type, content_id) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, content_type, content_id) DO NOTHING RETURNING *`,
      [req.user.id, content_type, content_id]
    );
    res.json(rows[0] || { message: 'Already favorited' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/media/favorites/:contentType/:contentId
router.delete('/favorites/:contentType/:contentId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM favorites WHERE user_id = $1 AND content_type = $2 AND content_id = $3',
      [req.user.id, req.params.contentType, req.params.contentId]
    );
    res.json({ message: 'Removed' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
