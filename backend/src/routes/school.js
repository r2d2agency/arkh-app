const router = require('express').Router();
const pool = require('../db/pool');

// ========== CLASSES ==========

// GET /api/church/school/classes
router.get('/classes', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    
    const isAdmin = req.user.role === 'admin_church' || req.user.role === 'leader';
    const activeFilter = isAdmin ? '' : 'AND sc.is_active = true';
    
    const { rows } = await pool.query(
      `SELECT sc.*, u.name as teacher_name,
        (SELECT COUNT(*) FROM school_enrollments se WHERE se.class_id = sc.id AND se.status = 'enrolled') as student_count,
        (SELECT COUNT(*) FROM school_lessons sl WHERE sl.class_id = sc.id) as lesson_count,
        EXISTS(SELECT 1 FROM school_enrollments se2 WHERE se2.class_id = sc.id AND se2.user_id = $2) as is_enrolled
       FROM school_classes sc
       LEFT JOIN users u ON sc.teacher_id = u.id
       WHERE sc.church_id = $1 ${activeFilter}
       ORDER BY sc.created_at DESC`,
      [churchId, req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET classes error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/school/classes/:id
router.get('/classes/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT sc.*, u.name as teacher_name
       FROM school_classes sc
       LEFT JOIN users u ON sc.teacher_id = u.id
       WHERE sc.id = $1 AND sc.church_id = $2`,
      [req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    
    const cls = rows[0];
    
    // Get lessons
    const { rows: lessons } = await pool.query(
      `SELECT sl.*, 
        (SELECT COUNT(*) FROM school_attendance sa WHERE sa.lesson_id = sl.id AND sa.present = true) as attendance_count
       FROM school_lessons sl WHERE sl.class_id = $1 ORDER BY sl.sort_order, sl.lesson_date`,
      [req.params.id]
    );
    cls.lessons = lessons;
    
    // Get enrolled students
    const { rows: students } = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, se.enrolled_at, se.status
       FROM school_enrollments se
       JOIN users u ON se.user_id = u.id
       WHERE se.class_id = $1 ORDER BY u.name`,
      [req.params.id]
    );
    cls.students = students;
    
    // Check if current user is enrolled
    cls.is_enrolled = students.some(s => s.id === req.user.id);
    
    // Get user attendance
    const { rows: attendance } = await pool.query(
      `SELECT lesson_id FROM school_attendance WHERE user_id = $1 AND lesson_id = ANY(
        SELECT id FROM school_lessons WHERE class_id = $2
      )`,
      [req.user.id, req.params.id]
    );
    cls.user_attendance = attendance.map(a => a.lesson_id);
    
    res.json(cls);
  } catch (err) {
    console.error('GET class detail error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/school/classes
router.post('/classes', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { title, description, teacher_id, category, schedule, max_students, starts_at, ends_at, is_active } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    const { rows } = await pool.query(
      `INSERT INTO school_classes (church_id, title, description, teacher_id, category, schedule, max_students, starts_at, ends_at, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [churchId, title, description || null, teacher_id || null, category || null,
       schedule || null, max_students || null, starts_at || null, ends_at || null, is_active ?? true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST class error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/school/classes/:id
router.put('/classes/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { title, description, teacher_id, category, schedule, max_students, starts_at, ends_at, is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE school_classes SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        teacher_id = $3, category = COALESCE($4, category),
        schedule = COALESCE($5, schedule), max_students = $6,
        starts_at = $7, ends_at = $8, is_active = COALESCE($9, is_active),
        updated_at = NOW()
       WHERE id = $10 AND church_id = $11 RETURNING *`,
      [title, description, teacher_id || null, category, schedule, max_students || null,
       starts_at || null, ends_at || null, is_active, req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT class error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/school/classes/:id
router.delete('/classes/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    await pool.query('DELETE FROM school_classes WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== LESSONS ==========

// POST /api/church/school/classes/:classId/lessons
router.post('/classes/:classId/lessons', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { title, description, content, key_verse, resources, sort_order, lesson_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    
    const { rows } = await pool.query(
      `INSERT INTO school_lessons (class_id, title, description, content, key_verse, resources, sort_order, lesson_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.classId, title, description || null, content || null,
       key_verse || null, JSON.stringify(resources || []), sort_order || 0, lesson_date || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST lesson error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/school/lessons/:id
router.put('/lessons/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { title, description, content, key_verse, resources, sort_order, lesson_date } = req.body;
    const { rows } = await pool.query(
      `UPDATE school_lessons SET
        title = COALESCE($1, title), description = COALESCE($2, description),
        content = COALESCE($3, content), key_verse = COALESCE($4, key_verse),
        resources = COALESCE($5, resources), sort_order = COALESCE($6, sort_order),
        lesson_date = $7
       WHERE id = $8 RETURNING *`,
      [title, description, content, key_verse,
       resources ? JSON.stringify(resources) : null, sort_order, lesson_date || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/school/lessons/:id
router.delete('/lessons/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    await pool.query('DELETE FROM school_lessons WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== ENROLLMENT ==========

// POST /api/church/school/classes/:id/enroll
router.post('/classes/:id/enroll', async (req, res) => {
  try {
    // Check max_students
    const { rows: cls } = await pool.query('SELECT max_students FROM school_classes WHERE id = $1', [req.params.id]);
    if (!cls.length) return res.status(404).json({ error: 'Class not found' });
    
    if (cls[0].max_students) {
      const { rows: count } = await pool.query(
        'SELECT COUNT(*) as c FROM school_enrollments WHERE class_id = $1 AND status = $2',
        [req.params.id, 'enrolled']
      );
      if (parseInt(count[0].c) >= cls[0].max_students) {
        return res.status(400).json({ error: 'Turma lotada' });
      }
    }
    
    const { rows } = await pool.query(
      `INSERT INTO school_enrollments (class_id, user_id) VALUES ($1, $2)
       ON CONFLICT (class_id, user_id) DO UPDATE SET status = 'enrolled' RETURNING *`,
      [req.params.id, req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/school/classes/:id/enroll
router.delete('/classes/:id/enroll', async (req, res) => {
  try {
    await pool.query(
      `UPDATE school_enrollments SET status = 'dropped' WHERE class_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Unenrolled' });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== ATTENDANCE ==========

// POST /api/church/school/lessons/:id/attendance
router.post('/lessons/:id/attendance', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { user_ids } = req.body; // array of user IDs that were present
    if (!user_ids || !Array.isArray(user_ids)) return res.status(400).json({ error: 'user_ids required' });
    
    // Clear existing
    await pool.query('DELETE FROM school_attendance WHERE lesson_id = $1', [req.params.id]);
    
    // Insert new
    for (const uid of user_ids) {
      await pool.query(
        'INSERT INTO school_attendance (lesson_id, user_id, present) VALUES ($1, $2, true)',
        [req.params.id, uid]
      );
    }
    res.json({ message: 'Attendance saved', count: user_ids.length });
  } catch (err) {
    console.error('Attendance error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
