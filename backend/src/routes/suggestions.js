const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/suggestions — personalized content suggestions
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    
    // Get user onboarding data
    const { rows: onboarding } = await pool.query(
      'SELECT * FROM user_onboarding WHERE user_id = $1',
      [req.user.id]
    );
    
    const interests = onboarding[0]?.preferred_topics || [];
    const level = onboarding[0]?.experience_level || 'growing';
    
    const suggestions = [];
    
    // 1. Suggest services based on interests (search AI topics)
    if (interests.length > 0) {
      const interestPattern = interests.map(i => `%${i}%`).join('|');
      const { rows: services } = await pool.query(
        `SELECT id, title, preacher, service_date, thumbnail_url, youtube_url, ai_status, 'service' as content_type
         FROM services 
         WHERE church_id = $1 AND ai_status = 'completed'
         AND (CAST(ai_topics AS TEXT) ILIKE ANY($2) OR title ILIKE ANY($2))
         ORDER BY service_date DESC NULLS LAST LIMIT 5`,
        [churchId, interests.map(i => `%${i}%`)]
      );
      services.forEach(s => suggestions.push({ ...s, reason: 'Baseado nos seus interesses' }));
    }
    
    // 2. Suggest studies for their level
    const { rows: studies } = await pool.query(
      `SELECT id, title, description, category, difficulty, 'study' as content_type
       FROM bible_studies
       WHERE church_id = $1 AND is_published = true
       ORDER BY created_at DESC LIMIT 5`,
      [churchId]
    );
    studies.forEach(s => suggestions.push({ ...s, reason: 'Estudo recomendado' }));
    
    // 3. Most popular services (by notes count)
    const { rows: popular } = await pool.query(
      `SELECT s.id, s.title, s.preacher, s.service_date, s.thumbnail_url, s.youtube_url, s.ai_status,
         'service' as content_type, COUNT(sn.id) as note_count
       FROM services s
       LEFT JOIN study_notes sn ON sn.service_id = s.id
       WHERE s.church_id = $1 AND s.ai_status = 'completed'
       GROUP BY s.id
       ORDER BY note_count DESC, s.service_date DESC LIMIT 3`,
      [churchId]
    );
    popular.forEach(s => suggestions.push({ ...s, reason: 'Popular na sua igreja' }));
    
    // 4. Unfinished content (media_progress < 90%)
    const { rows: unfinished } = await pool.query(
      `SELECT s.id, s.title, s.preacher, s.service_date, s.thumbnail_url, s.youtube_url,
         'service' as content_type, mp.progress_seconds, mp.duration_seconds,
         ROUND((mp.progress_seconds / NULLIF(mp.duration_seconds, 0)) * 100) as progress_pct
       FROM media_progress mp
       JOIN services s ON mp.service_id = s.id
       WHERE mp.user_id = $1 AND mp.completed = false AND mp.progress_seconds > 0
       ORDER BY mp.last_played_at DESC LIMIT 5`,
      [req.user.id]
    );
    unfinished.forEach(s => suggestions.push({ ...s, reason: 'Continuar assistindo' }));
    
    // Deduplicate by id
    const seen = new Set();
    const unique = suggestions.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
    
    res.json(unique);
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// GET /api/church/continue-watching — media in progress
router.get('/continue-watching', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.title, s.preacher, s.service_date, s.thumbnail_url, s.youtube_url,
         mp.progress_seconds, mp.duration_seconds,
         ROUND((mp.progress_seconds / NULLIF(mp.duration_seconds, 0)) * 100) as progress_pct
       FROM media_progress mp
       JOIN services s ON mp.service_id = s.id
       WHERE mp.user_id = $1 AND mp.completed = false AND mp.progress_seconds > 10
       ORDER BY mp.last_played_at DESC LIMIT 5`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;