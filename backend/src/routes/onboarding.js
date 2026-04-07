const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/onboarding — get user onboarding status
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_onboarding WHERE user_id = $1',
      [req.user.id]
    );
    res.json(rows[0] || { completed: false });
  } catch (err) {
    console.error('GET onboarding error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST /api/church/onboarding — save onboarding
router.post('/', async (req, res) => {
  try {
    const { spiritual_interests, experience_level, preferred_topics, how_found, goals } = req.body;
    
    const { rows } = await pool.query(
      `INSERT INTO user_onboarding (user_id, spiritual_interests, experience_level, preferred_topics, how_found, goals, completed, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         spiritual_interests = COALESCE($2, user_onboarding.spiritual_interests),
         experience_level = COALESCE($3, user_onboarding.experience_level),
         preferred_topics = COALESCE($4, user_onboarding.preferred_topics),
         how_found = COALESCE($5, user_onboarding.how_found),
         goals = COALESCE($6, user_onboarding.goals),
         completed = true, completed_at = NOW(), updated_at = NOW()
       RETURNING *`,
      [req.user.id, spiritual_interests || [], experience_level || null,
       preferred_topics || [], how_found || null, goals || null]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('POST onboarding error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
