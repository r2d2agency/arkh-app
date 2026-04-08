const router = require('express').Router();
const pool = require('../db/pool');

// Public - list all active churches for catalog
router.get('/', async (req, res) => {
  try {
    const { city, state, region, search, lat, lng, radius } = req.query;
    let query = `
      SELECT id, name, slug, logo_url, cover_url, description, address, city, state, region,
             lat, lng, whatsapp, phone, photos,
             (SELECT COUNT(*) FROM users WHERE church_id = churches.id) as member_count
      FROM churches
      WHERE status = 'active'
    `;
    const params = [];
    let idx = 1;

    if (search) {
      query += ` AND (name ILIKE $${idx} OR city ILIKE $${idx} OR description ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (city) {
      query += ` AND city ILIKE $${idx}`;
      params.push(`%${city}%`);
      idx++;
    }
    if (state) {
      query += ` AND state = $${idx}`;
      params.push(state);
      idx++;
    }
    if (region) {
      query += ` AND region ILIKE $${idx}`;
      params.push(`%${region}%`);
      idx++;
    }

    // If lat/lng provided, order by distance and optionally filter by radius (km)
    if (lat && lng) {
      const latN = parseFloat(lat);
      const lngN = parseFloat(lng);
      if (!isNaN(latN) && !isNaN(lngN)) {
        query += ` AND lat IS NOT NULL AND lng IS NOT NULL`;
        if (radius) {
          query += ` AND (6371 * acos(cos(radians($${idx})) * cos(radians(lat)) * cos(radians(lng) - radians($${idx + 1})) + sin(radians($${idx})) * sin(radians(lat)))) <= $${idx + 2}`;
          params.push(latN, lngN, parseFloat(radius));
          idx += 3;
        } else {
          params.push(latN, lngN);
          idx += 2;
        }
        query += ` ORDER BY (6371 * acos(cos(radians($${idx - 2})) * cos(radians(lat)) * cos(radians(lng) - radians($${idx - 1})) + sin(radians($${idx - 2})) * sin(radians(lat)))) ASC`;
      } else {
        query += ` ORDER BY name ASC`;
      }
    } else {
      query += ` ORDER BY name ASC`;
    }

    query += ` LIMIT 100`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Catalog error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Public - get single church details
router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, slug, logo_url, cover_url, description, address, city, state, region,
             lat, lng, whatsapp, phone, photos,
             (SELECT COUNT(*) FROM users WHERE church_id = churches.id) as member_count
      FROM churches
      WHERE slug = $1 AND status = 'active'
    `, [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Church not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
