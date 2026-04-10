const router = require('express').Router();
const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

// ========== SERVICES ==========

// GET /api/church/services
router.get('/services', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });
    const { rows } = await pool.query(
      `SELECT * FROM services WHERE church_id = $1 ORDER BY COALESCE(service_date, created_at::date) DESC, created_at DESC`,
      [churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET services error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/services/:id
router.get('/services/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });
    const { rows } = await pool.query(
      `SELECT * FROM services WHERE id = $1 AND church_id = $2`,
      [req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET service detail error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/services
router.post('/services', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });
    const { title, youtube_url, preacher, service_date, ai_start_time, ai_end_time } = req.body;
    if (!title || !youtube_url) return res.status(400).json({ error: 'Title and YouTube URL required' });
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

// PUT /api/church/services/:id
router.put('/services/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { title, youtube_url, preacher, service_date, ai_start_time, ai_end_time } = req.body;
    const { rows } = await pool.query(
      `UPDATE services SET title=COALESCE($1,title), youtube_url=COALESCE($2,youtube_url), preacher=COALESCE($3,preacher), service_date=COALESCE($4,service_date), ai_start_time=COALESCE($5,ai_start_time), ai_end_time=COALESCE($6,ai_end_time) WHERE id=$7 AND church_id=$8 RETURNING *`,
      [
        title || null,
        youtube_url || null,
        preacher || null,
        service_date || null,
        ai_start_time || null,
        ai_end_time || null,
        req.params.id,
        churchId
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT services error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
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

// POST /api/church/services/:id/process
router.post('/services/:id/process', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows: svcRows } = await pool.query(
      'SELECT * FROM services WHERE id = $1 AND church_id = $2',
      [req.params.id, churchId]
    );
    if (!svcRows.length) return res.status(404).json({ error: 'Service not found' });
    
    const { provider_id } = req.body || {};
    
    // Set status to processing and clear old logs
    await pool.query(
      `UPDATE services SET ai_status = 'processing', processing_logs = '[]', processing_error = NULL WHERE id = $1`,
      [req.params.id]
    );
    
    // Fire-and-forget: process asynchronously
    const { processService } = require('../services/processService');
    processService(req.params.id, { provider_id }).catch(err => {
      console.error('Background processing error:', err);
    });
    
    res.json({ message: 'AI processing started', status: 'processing' });
  } catch (err) {
    console.error('Process service error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/ai-settings — get church AI settings
router.get('/ai-settings', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    const { rows } = await pool.query(
      'SELECT ai_prompt_template, ai_temperature, ai_max_tokens, ai_assistant_enabled, ai_assistant_prompt FROM churches WHERE id = $1',
      [churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/ai-settings — update church AI settings
router.put('/ai-settings', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    if (req.user.role !== 'admin_church') return res.status(403).json({ error: 'Admin only' });
    
    const { ai_prompt_template, ai_temperature, ai_max_tokens, ai_assistant_prompt } = req.body;
    await pool.query(
      `UPDATE churches SET 
        ai_prompt_template = COALESCE($1, ai_prompt_template),
        ai_temperature = COALESCE($2, ai_temperature),
        ai_max_tokens = COALESCE($3, ai_max_tokens),
        ai_assistant_prompt = $4
       WHERE id = $5`,
      [ai_prompt_template || null, ai_temperature || null, ai_max_tokens || null, ai_assistant_prompt ?? null, churchId]
    );
    res.json({ message: 'AI settings updated' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/ai-providers — list active AI providers for selection
router.get('/ai-providers', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, provider, model FROM ai_providers WHERE is_active = true ORDER BY name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/services/:id/status — poll processing status and logs
router.get('/services/:id/status', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT ai_status, processing_logs, processing_error, ai_summary, ai_topics, ai_key_verses 
       FROM services WHERE id = $1 AND church_id = $2`,
      [req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== MEMBERS ==========

// GET /api/church/members
router.get('/members', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });
    const { rows } = await pool.query(
      `SELECT id, name, email, role, avatar_url, is_active, last_login, created_at
       FROM users WHERE church_id = $1 ORDER BY created_at DESC`,
      [churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET members error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/members/invite — create member with temporary password
router.post('/members/invite', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });

    const { name, email, role } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    // Check if email already exists
    const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email já cadastrado' });

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(tempPassword, 10);

    const memberRole = role || 'member';
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, church_id, is_active)
       VALUES ($1, $2, $3, $4, $5, true) RETURNING id, name, email, role, created_at`,
      [name, email, hash, memberRole, churchId]
    );

    res.status(201).json({ ...rows[0], temp_password: tempPassword });
  } catch (err) {
    console.error('Invite member error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/invite-link — get the invite link for this church
router.get('/invite-link', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });

    const { rows } = await pool.query('SELECT slug FROM churches WHERE id = $1', [churchId]);
    if (!rows.length) return res.status(404).json({ error: 'Church not found' });

    res.json({ slug: rows[0].slug, church_id: churchId });
  } catch (err) {
    console.error('Invite link error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/members/:id
router.delete('/members/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    // Don't allow deleting yourself
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });
    await pool.query('DELETE FROM users WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE member error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/members/:id/role
router.put('/members/:id/role', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { role } = req.body;
    if (!['member', 'leader', 'admin_church'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    // Only admin_church can promote
    if (req.user.role !== 'admin_church') return res.status(403).json({ error: 'Only admins can change roles' });
    const { rows } = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 AND church_id = $3 RETURNING id, name, email, role',
      [role, req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Update role error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== PROFILE / PASSWORD ==========

// PUT /api/church/profile/password
router.put('/profile/password', async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
    if (new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/info — get church info
router.get('/info', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    const { rows } = await pool.query('SELECT id, name, slug, logo_url, status FROM churches WHERE id = $1', [churchId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== NOTES (CADERNO) ==========

// GET /api/church/notes — get user notes
router.get('/notes', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT sn.*, s.title as service_title 
       FROM study_notes sn 
       LEFT JOIN services s ON sn.service_id = s.id
       WHERE sn.user_id = $1 
       ORDER BY sn.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET notes error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/notes — create note
router.post('/notes', async (req, res) => {
  try {
    const { service_id, title, content, note_type, verse_reference } = req.body;
    if (!content && !title) return res.status(400).json({ error: 'Content required' });
    const { rows } = await pool.query(
      `INSERT INTO study_notes (user_id, service_id, title, content, note_type, verse_reference)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, service_id || null, title || null, content || '', note_type || 'note', verse_reference || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST notes error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/notes/:id — delete note
router.delete('/notes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM study_notes WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== SEARCH ==========

// GET /api/church/search?q=query — search services
router.get('/search', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    const q = req.query.q;
    if (!q || q.length < 2) return res.json([]);

    const searchTerm = `%${q}%`;
    const { rows } = await pool.query(
      `SELECT id, title, preacher, service_date, ai_status, ai_summary, ai_topics, ai_key_verses, youtube_url, created_at
       FROM services 
       WHERE church_id = $1 AND ai_status = 'completed' AND (
         title ILIKE $2 OR 
         preacher ILIKE $2 OR 
         ai_summary ILIKE $2 OR 
         CAST(ai_topics AS TEXT) ILIKE $2 OR 
         CAST(ai_key_verses AS TEXT) ILIKE $2
       )
       ORDER BY service_date DESC NULLS LAST
       LIMIT 20`,
      [churchId, searchTerm]
    );
    res.json(rows);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
