const router = require('express').Router();
const pool = require('../db/pool');

// ========== BIBLE STUDIES ==========

// GET /api/church/studies — list studies
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    
    const isAdmin = req.user.role === 'admin_church' || req.user.role === 'leader';
    const publishFilter = isAdmin ? '' : 'AND bs.is_published = true';
    
    const { rows } = await pool.query(
      `SELECT bs.*, u.name as author_name,
        (SELECT COUNT(*) FROM study_progress sp WHERE sp.study_id = bs.id AND sp.completed = true) as completions
       FROM bible_studies bs
       LEFT JOIN users u ON bs.created_by = u.id
       WHERE bs.church_id = $1 ${publishFilter}
       ORDER BY bs.sort_order, bs.created_at DESC`,
      [churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET studies error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/studies/:id
router.get('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT bs.*, u.name as author_name
       FROM bible_studies bs
       LEFT JOIN users u ON bs.created_by = u.id
       WHERE bs.id = $1 AND bs.church_id = $2`,
      [req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    
    const study = rows[0];
    if (study.linked_service_ids && study.linked_service_ids.length > 0) {
      const { rows: services } = await pool.query(
        `SELECT id, title, preacher, service_date FROM services WHERE id = ANY($1)`,
        [study.linked_service_ids]
      );
      study.linked_services = services;
    } else {
      study.linked_services = [];
    }
    
    const { rows: progressRows } = await pool.query(
      `SELECT * FROM study_progress WHERE user_id = $1 AND study_id = $2`,
      [req.user.id, req.params.id]
    );
    study.user_progress = progressRows[0] || null;
    
    res.json(study);
  } catch (err) {
    console.error('GET study detail error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/studies
router.post('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { title, description, objective, key_verse, base_reading, introduction,
            topics, application, questions, conclusion, category, linked_service_ids, is_published,
            pdf_url, video_url, thumbnail_url } = req.body;
    
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    const { rows } = await pool.query(
      `INSERT INTO bible_studies 
        (church_id, title, description, objective, key_verse, base_reading, introduction,
         topics, application, questions, conclusion, category, linked_service_ids, is_published, created_by,
         pdf_url, video_url, thumbnail_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [churchId, title, description || null, objective || null, key_verse || null,
       base_reading || null, introduction || null,
       JSON.stringify(topics || []), application || null,
       JSON.stringify(questions || []), conclusion || null,
       category || null, linked_service_ids || [], is_published ?? false, req.user.id,
       pdf_url || null, video_url || null, thumbnail_url || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST study error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/studies/:id
router.put('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    
    const { title, description, objective, key_verse, base_reading, introduction,
            topics, application, questions, conclusion, category, linked_service_ids, is_published,
            pdf_url, video_url, thumbnail_url } = req.body;
    
    const { rows } = await pool.query(
      `UPDATE bible_studies SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        objective = COALESCE($3, objective),
        key_verse = COALESCE($4, key_verse),
        base_reading = COALESCE($5, base_reading),
        introduction = COALESCE($6, introduction),
        topics = COALESCE($7, topics),
        application = COALESCE($8, application),
        questions = COALESCE($9, questions),
        conclusion = COALESCE($10, conclusion),
        category = COALESCE($11, category),
        linked_service_ids = COALESCE($12, linked_service_ids),
        is_published = COALESCE($13, is_published),
        pdf_url = $16,
        video_url = $17,
        thumbnail_url = $18
       WHERE id = $14 AND church_id = $15 RETURNING *`,
      [title, description, objective, key_verse, base_reading, introduction,
       topics ? JSON.stringify(topics) : null, application,
       questions ? JSON.stringify(questions) : null, conclusion,
       category, linked_service_ids, is_published,
       req.params.id, churchId,
       pdf_url || null, video_url || null, thumbnail_url || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT study error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/studies/:id
router.delete('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    await pool.query('DELETE FROM bible_studies WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/studies/:id/progress
router.post('/:id/progress', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO study_progress (user_id, study_id, completed, completed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (user_id, study_id) DO UPDATE SET completed = true, completed_at = NOW()
       RETURNING *`,
      [req.user.id, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== STUDY TRAILS ==========

// GET /api/church/trails
router.get('/trails/list', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    
    const isAdmin = req.user.role === 'admin_church' || req.user.role === 'leader';
    const publishFilter = isAdmin ? '' : 'AND st.is_published = true';
    
    const { rows } = await pool.query(
      `SELECT st.*,
        (SELECT COUNT(*) FROM trail_items ti WHERE ti.trail_id = st.id) as item_count,
        (SELECT COUNT(DISTINCT tp.item_id) FROM trail_progress tp 
         JOIN trail_items ti2 ON tp.item_id = ti2.id 
         WHERE ti2.trail_id = st.id AND tp.user_id = $2) as user_completed
       FROM study_trails st
       WHERE st.church_id = $1 ${publishFilter}
       ORDER BY st.created_at DESC`,
      [churchId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET trails error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/trails/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT * FROM study_trails WHERE id = $1 AND church_id = $2`,
      [req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    
    const trail = rows[0];
    const { rows: items } = await pool.query(
      `SELECT ti.*, 
        bs.title as study_title, bs.description as study_description, bs.key_verse as study_key_verse,
        s.title as service_title, s.preacher as service_preacher, s.ai_status as service_ai_status
       FROM trail_items ti
       LEFT JOIN bible_studies bs ON ti.study_id = bs.id
       LEFT JOIN services s ON ti.service_id = s.id
       WHERE ti.trail_id = $1
       ORDER BY ti.sort_order`,
      [req.params.id]
    );
    trail.items = items;
    
    const { rows: progress } = await pool.query(
      `SELECT item_id FROM trail_progress WHERE user_id = $1 AND trail_id = $2`,
      [req.user.id, req.params.id]
    );
    trail.completed_items = progress.map(p => p.item_id);
    
    res.json(trail);
  } catch (err) {
    console.error('GET trail detail error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/trails', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { title, description, objective, is_published, items } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    const { rows } = await pool.query(
      `INSERT INTO study_trails (church_id, title, description, objective, is_published, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [churchId, title, description || null, objective || null, is_published ?? false, req.user.id]
    );
    const trail = rows[0];
    
    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await pool.query(
          `INSERT INTO trail_items (trail_id, content_type, study_id, service_id, sort_order)
           VALUES ($1, $2, $3, $4, $5)`,
          [trail.id, item.content_type, item.study_id || null, item.service_id || null, i]
        );
      }
    }
    
    res.status(201).json(trail);
  } catch (err) {
    console.error('POST trail error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/trails/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    await pool.query('DELETE FROM study_trails WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/trails/:trailId/items/:itemId/complete', async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO trail_progress (user_id, trail_id, item_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_id) DO NOTHING`,
      [req.user.id, req.params.trailId, req.params.itemId]
    );
    res.json({ message: 'Completed' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
