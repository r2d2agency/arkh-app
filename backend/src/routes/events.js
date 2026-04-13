const router = require('express').Router();
const pool = require('../db/pool');
const { addWeeks, addMonths, isBefore, parseISO } = require('date-fns');

// GET /api/church/events
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { month } = req.query;
    let query = 'SELECT * FROM events WHERE church_id = $1';
    const params = [churchId];
    if (month) {
      query += ` AND DATE_TRUNC('month', starts_at) = DATE_TRUNC('month', $2::date)`;
      params.push(`${month}-01`);
    }
    query += ' ORDER BY starts_at ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('GET events error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/events
router.post('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Forbidden' });
    const { title, description, location, event_type, starts_at, ends_at, all_day, recurrence_rule, recurrence_until } = req.body;
    if (!title || !starts_at) return res.status(400).json({ error: 'Title and starts_at required' });

    // Create main event
    const { rows } = await pool.query(
      `INSERT INTO events (church_id, title, description, location, event_type, starts_at, ends_at, all_day, recurrence_rule, recurrence_until, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [churchId, title, description || null, location || null, event_type || 'general',
       starts_at, ends_at || null, all_day || false, recurrence_rule || null, recurrence_until || null, req.user.id]
    );

    const parent = rows[0];
    const created = [parent];

    // Generate recurring instances
    if (recurrence_rule && recurrence_until) {
      let current = parseISO(starts_at);
      const until = parseISO(recurrence_until);
      const duration = ends_at ? (new Date(ends_at).getTime() - new Date(starts_at).getTime()) : 0;

      const advance = (d) => {
        if (recurrence_rule === 'weekly') return addWeeks(d, 1);
        if (recurrence_rule === 'biweekly') return addWeeks(d, 2);
        if (recurrence_rule === 'monthly') return addMonths(d, 1);
        return addWeeks(d, 1);
      };

      current = advance(current);
      while (isBefore(current, until)) {
        const newEnd = duration ? new Date(current.getTime() + duration).toISOString() : null;
        const { rows: r } = await pool.query(
          `INSERT INTO events (church_id, title, description, location, event_type, starts_at, ends_at, all_day, recurrence_parent_id, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
          [churchId, title, description || null, location || null, event_type || 'general',
           current.toISOString(), newEnd, all_day || false, parent.id, req.user.id]
        );
        created.push(r[0]);
        current = advance(current);
      }
    }

    res.status(201).json(created.length === 1 ? created[0] : created);
  } catch (err) {
    console.error('POST events error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT /api/church/events/:id
router.put('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { title, description, location, event_type, starts_at, ends_at, all_day } = req.body;
    const { rows } = await pool.query(
      `UPDATE events SET title=$1, description=$2, location=$3, event_type=$4,
       starts_at=$5, ends_at=$6, all_day=$7, updated_at=NOW()
       WHERE id=$8 AND church_id=$9 RETURNING *`,
      [title, description, location, event_type, starts_at, ends_at, all_day, req.params.id, churchId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT events error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/events/:id
router.delete('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    // Also delete child recurring events
    await pool.query('DELETE FROM events WHERE (id = $1 OR recurrence_parent_id = $1) AND church_id = $2', [req.params.id, churchId]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE events error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
