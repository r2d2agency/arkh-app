const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/groups — all groups (admins/leaders see all, members see only their groups)
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });
    const { rows } = await pool.query(
      `SELECT g.*, (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id)::int as member_count
       FROM groups g WHERE g.church_id = $1 ORDER BY g.created_at DESC`,
      [churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET groups error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/groups/explore — all groups for non-members to browse
router.get('/explore', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });
    const { rows } = await pool.query(
      `SELECT g.*,
        (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id)::int as member_count,
        EXISTS(SELECT 1 FROM group_members gm WHERE gm.group_id = g.id AND gm.user_id = $2) as is_member,
        (SELECT status FROM group_join_requests jr WHERE jr.group_id = g.id AND jr.user_id = $2 ORDER BY jr.created_at DESC LIMIT 1) as join_request_status
       FROM groups g WHERE g.church_id = $1 ORDER BY g.name`,
      [churchId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET groups explore error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/groups
router.post('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Only admins can create groups' });
    const { name, description, address, lat, lng, meeting_day, meeting_time, leader1_name, leader2_name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      `INSERT INTO groups (church_id, name, description, address, lat, lng, meeting_day, meeting_time, leader1_name, leader2_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [churchId, name, description || null, address || null, lat || null, lng || null, meeting_day || null, meeting_time || null, leader1_name || null, leader2_name || null]
    );
    res.status(201).json({ ...rows[0], member_count: 0 });
  } catch (err) {
    console.error('POST groups error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/groups/:id
router.put('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });
    const { name, description, address, lat, lng, meeting_day, meeting_time, leader1_name, leader2_name } = req.body;
    const { rows } = await pool.query(
      `UPDATE groups SET name=COALESCE($1,name), description=$2, address=$3, lat=$4, lng=$5,
        meeting_day=$6, meeting_time=$7, leader1_name=$8, leader2_name=$9, updated_at=NOW()
       WHERE id=$10 AND church_id=$11 RETURNING *`,
      [name, description||null, address||null, lat||null, lng||null, meeting_day||null, meeting_time||null, leader1_name||null, leader2_name||null, req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT groups error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/groups/:id
router.delete('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    await pool.query('DELETE FROM groups WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE groups error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// === JOIN REQUESTS ===

// POST /api/church/groups/:id/join — request to join
router.post('/:id/join', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows: gRows } = await pool.query('SELECT id FROM groups WHERE id=$1 AND church_id=$2', [req.params.id, churchId]);
    if (!gRows.length) return res.status(404).json({ error: 'Group not found' });
    // Check if already member
    const { rows: mRows } = await pool.query('SELECT id FROM group_members WHERE group_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    if (mRows.length) return res.status(409).json({ error: 'Já é membro deste grupo' });
    // Upsert request
    const { rows } = await pool.query(
      `INSERT INTO group_join_requests (group_id, user_id, status) VALUES ($1,$2,'pending')
       ON CONFLICT (group_id, user_id) DO UPDATE SET status='pending', created_at=NOW(), resolved_at=NULL
       RETURNING *`,
      [req.params.id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST join request error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/groups/:id/join-requests — list pending requests (admin/leader)
router.get('/:id/join-requests', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT jr.*, u.name as user_name, u.email as user_email
       FROM group_join_requests jr JOIN users u ON u.id = jr.user_id
       WHERE jr.group_id = $1 AND jr.status = 'pending' ORDER BY jr.created_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET join requests error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/groups/:id/join-requests/:reqId — approve or reject
router.put('/:id/join-requests/:reqId', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved','rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    
    const { rows: [jr] } = await pool.query(
      `UPDATE group_join_requests SET status=$1, resolved_at=NOW(), resolved_by=$2 WHERE id=$3 RETURNING *`,
      [status, req.user.id, req.params.reqId]
    );
    if (!jr) return res.status(404).json({ error: 'Not found' });
    
    if (status === 'approved') {
      await pool.query(
        'INSERT INTO group_members (group_id, user_id, role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
        [jr.group_id, jr.user_id, 'member']
      );
    }
    res.json(jr);
  } catch (err) {
    console.error('PUT join request error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/groups/:id/members
router.get('/:id/members', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT gm.id, gm.user_id, u.name, u.email, gm.role
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.group_id = $1 AND g.church_id = $2
       ORDER BY gm.role DESC, u.name`,
      [req.params.id, churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET group members error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/groups/:id/members
router.post('/:id/members', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const { rows: gRows } = await pool.query('SELECT id FROM groups WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    if (!gRows.length) return res.status(404).json({ error: 'Group not found' });
    const { rows: uRows } = await pool.query('SELECT id FROM users WHERE id = $1 AND church_id = $2', [user_id, churchId]);
    if (!uRows.length) return res.status(400).json({ error: 'User not in this church' });
    const { rows: existing } = await pool.query('SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2', [req.params.id, user_id]);
    if (existing.length) return res.status(409).json({ error: 'Membro já está no grupo' });
    
    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3)',
      [req.params.id, user_id, role || 'member']
    );
    res.status(201).json({ message: 'Added' });
  } catch (err) {
    console.error('POST group member error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/groups/:id/members/:memberId/role
router.put('/:id/members/:memberId/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    await pool.query('UPDATE group_members SET role = $1 WHERE id = $2', [role, req.params.memberId]);
    res.json({ message: 'Updated' });
  } catch (err) {
    console.error('PUT group member role error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/groups/:id/members/:memberId
router.delete('/:id/members/:memberId', async (req, res) => {
  try {
    await pool.query('DELETE FROM group_members WHERE id = $1', [req.params.memberId]);
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error('DELETE group member error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// === ANNOUNCEMENTS ===

router.get('/:id/announcements', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ga.*, u.name as author_name FROM group_announcements ga
       JOIN users u ON u.id = ga.author_id
       WHERE ga.group_id = $1 ORDER BY ga.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET announcements error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/announcements', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });
    const { rows } = await pool.query(
      `INSERT INTO group_announcements (group_id, author_id, content) VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    res.status(201).json({ ...rows[0], author_name: req.user.name });
  } catch (err) {
    console.error('POST announcement error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id/announcements/:annId', async (req, res) => {
  try {
    await pool.query('DELETE FROM group_announcements WHERE id = $1 AND group_id = $2', [req.params.annId, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE announcement error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// === GROUP CONTENT ===

router.get('/:id/content', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT gc.*,
        CASE WHEN gc.content_type = 'service' THEN (SELECT title FROM services WHERE id = gc.content_id)
             WHEN gc.content_type = 'study' THEN (SELECT title FROM bible_studies WHERE id = gc.content_id)
        END as content_title
       FROM group_content gc WHERE gc.group_id = $1 ORDER BY gc.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET group content error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/content', async (req, res) => {
  try {
    const { content_type, content_id } = req.body;
    if (!content_type || !content_id) return res.status(400).json({ error: 'content_type and content_id required' });
    const { rows } = await pool.query(
      `INSERT INTO group_content (group_id, content_type, content_id, added_by) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, content_type, content_id, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST group content error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/:id/content/:contentId', async (req, res) => {
  try {
    await pool.query('DELETE FROM group_content WHERE id = $1 AND group_id = $2', [req.params.contentId, req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE group content error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// === DYNAMICS ===

router.get('/dynamics/available', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT * FROM group_dynamics
       WHERE is_global = true OR church_id = $1
       ORDER BY created_at DESC`,
      [churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET dynamics error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/dynamics/generate', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });

    const churchId = req.user.church_id;
    const { rows: providerRows } = await pool.query(
      'SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1'
    );
    if (!providerRows.length) return res.status(400).json({ error: 'Nenhum provedor de IA configurado.' });

    const provider = providerRows[0];
    const apiKey = (provider.api_keys_encrypted || [])[0] || provider.api_key_encrypted || '';
    if (!apiKey) return res.status(400).json({ error: 'Provedor de IA sem API key.' });

    const { rows: existing } = await pool.query(
      `SELECT title FROM group_dynamics WHERE is_global = true OR church_id = $1`, [churchId]
    );
    const existingTitles = existing.map(d => d.title).join(', ');

    const prompt = `Crie uma dinâmica de grupo criativa e inédita para um grupo de igreja cristã.
DINÂMICAS JÁ EXISTENTES (NÃO REPETIR): ${existingTitles}
Retorne APENAS JSON válido:
{"title":"...","description":"...","instructions":"...","category":"icebreaker|spiritual|reflection|game|creative","emoji":"...","min_participants":2,"duration_minutes":15}`;

    const { callAI } = require('../services/processService');
    const aiText = await callAI(provider, apiKey, 'Você é um pastor criativo especialista em dinâmicas de grupo. Responda SOMENTE com JSON válido.', prompt, 0.9, 2048);

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(502).json({ error: 'A IA não retornou uma dinâmica válida.' });

    const data = JSON.parse(jsonMatch[0]);
    if (!data.title || !data.instructions) return res.status(502).json({ error: 'Resposta da IA incompleta.' });

    const { rows: [dynamic] } = await pool.query(
      `INSERT INTO group_dynamics (church_id, title, description, instructions, category, emoji, min_participants, duration_minutes, is_auto_generated, generated_week)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,CURRENT_DATE) RETURNING *`,
      [churchId, data.title, data.description||'', data.instructions, data.category||'icebreaker', data.emoji||'🎯', data.min_participants||2, data.duration_minutes||15]
    );
    res.json(dynamic);
  } catch (err) {
    console.error('Generate dynamic error:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar dinâmica' });
  }
});

router.post('/:id/dynamics/:dynamicId/use', async (req, res) => {
  try {
    const { rows: [usage] } = await pool.query(
      'INSERT INTO group_dynamic_usage (group_id, dynamic_id, used_by) VALUES ($1,$2,$3) RETURNING *',
      [req.params.id, req.params.dynamicId, req.user.id]
    );
    res.json(usage);
  } catch (err) {
    console.error('Use dynamic error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/dynamics/:dynamicId/respond', async (req, res) => {
  try {
    const { response } = req.body;
    if (!response) return res.status(400).json({ error: 'Response required' });
    const { rows: [resp] } = await pool.query(
      'INSERT INTO group_dynamic_responses (dynamic_id, group_id, user_id, response) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.dynamicId, req.params.id, req.user.id, response]
    );
    res.json(resp);
  } catch (err) {
    console.error('Respond dynamic error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/:id/dynamics/:dynamicId/responses', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dr.*, u.name as user_name FROM group_dynamic_responses dr
       JOIN users u ON u.id = dr.user_id
       WHERE dr.dynamic_id = $1 AND dr.group_id = $2
       ORDER BY dr.created_at DESC`,
      [req.params.dynamicId, req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET responses error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/:id/dynamics/:dynamicId/rate', async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });
    await pool.query(
      `UPDATE group_dynamic_usage SET rating = $1, feedback = $2
       WHERE group_id = $3 AND dynamic_id = $4 AND used_by = $5`,
      [rating, feedback||null, req.params.id, req.params.dynamicId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
