const router = require('express').Router();
const pool = require('../db/pool');

router.get('/', async (req, res) => {
  try {
    const [churches, users, services, aiUsage] = await Promise.all([
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status = \'active\') as active FROM churches'),
      pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users WHERE role != \'super_admin\''),
      pool.query('SELECT COUNT(*) as total FROM services'),
      pool.query('SELECT COALESCE(SUM(tokens_used), 0) as total_tokens, COALESCE(SUM(cost), 0) as total_cost FROM ai_usage WHERE created_at >= date_trunc(\'month\', NOW())')
    ]);

    res.json({
      churches: { total: +churches.rows[0].total, active: +churches.rows[0].active },
      users: { total: +users.rows[0].total, active: +users.rows[0].active },
      services: { total: +services.rows[0].total },
      ai: { tokens: +aiUsage.rows[0].total_tokens, cost: +aiUsage.rows[0].total_cost }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
