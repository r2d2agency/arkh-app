const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/groups
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

// POST /api/church/groups
router.post('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church associated' });
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader')
      return res.status(403).json({ error: 'Only admins can create groups' });
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      `INSERT INTO groups (church_id, name, description) VALUES ($1, $2, $3) RETURNING *`,
      [churchId, name, description || null]
    );
    res.status(201).json({ ...rows[0], member_count: 0 });
  } catch (err) {
    console.error('POST groups error:', err);
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
    // Verify group belongs to church
    const { rows: gRows } = await pool.query('SELECT id FROM groups WHERE id = $1 AND church_id = $2', [req.params.id, churchId]);
    if (!gRows.length) return res.status(404).json({ error: 'Group not found' });
    // Verify user belongs to church
    const { rows: uRows } = await pool.query('SELECT id FROM users WHERE id = $1 AND church_id = $2', [user_id, churchId]);
    if (!uRows.length) return res.status(400).json({ error: 'User not in this church' });
    // Check duplicate
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

module.exports = router;
