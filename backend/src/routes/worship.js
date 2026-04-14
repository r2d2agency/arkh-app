const router = require('express').Router();
const pool = require('../db/pool');

// List worship songs for the church
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.json([]);
    const { category, search } = req.query;
    let query = 'SELECT * FROM worship_songs WHERE church_id = $1';
    const params = [churchId];
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (title ILIKE $${params.length} OR artist ILIKE $${params.length} OR composer ILIKE $${params.length})`;
    }
    query += ' ORDER BY title ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ========== FAVORITES (must be before /:id) ==========

// GET favorites
router.get('/favorites', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT wf.*, ws.title, ws.artist, ws.category, ws.youtube_url, ws.tone, ws.bpm, ws.start_time, ws.end_time
       FROM worship_favorites wf
       JOIN worship_songs ws ON wf.song_id = ws.id
       WHERE wf.user_id = $1
       ORDER BY wf.position ASC, wf.created_at ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// POST toggle favorite
router.post('/favorites', async (req, res) => {
  try {
    const { song_id } = req.body;
    if (!song_id) return res.status(400).json({ error: 'song_id required' });
    const { rows: existing } = await pool.query(
      'SELECT id FROM worship_favorites WHERE user_id=$1 AND song_id=$2', [req.user.id, song_id]
    );
    if (existing.length) {
      await pool.query('DELETE FROM worship_favorites WHERE id=$1', [existing[0].id]);
      return res.json({ removed: true });
    }
    const { rows: maxRows } = await pool.query(
      'SELECT COALESCE(MAX(position),0)+1 as next_pos FROM worship_favorites WHERE user_id=$1', [req.user.id]
    );
    const { rows } = await pool.query(
      'INSERT INTO worship_favorites (user_id, song_id, position) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, song_id, maxRows[0].next_pos]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// PUT reorder favorites
router.put('/favorites/reorder', async (req, res) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
    for (const item of order) {
      await pool.query('UPDATE worship_favorites SET position=$1 WHERE id=$2 AND user_id=$3',
        [item.position, item.id, req.user.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Categories list
router.get('/meta/categories', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT category FROM worship_songs WHERE church_id = $1 AND category IS NOT NULL ORDER BY category`,
      [req.user.church_id]
    );
    const defaults = ['Adoração', 'Louvor', 'Congregacional', 'Infantil', 'Instrumental'];
    const existing = rows.map(r => r.category);
    const all = [...new Set([...defaults, ...existing])].sort();
    res.json(all);
  } catch (err) {
    res.json(['Adoração', 'Louvor', 'Congregacional', 'Infantil', 'Instrumental']);
  }
});

// Get single (must be after /favorites and /meta/categories)
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM worship_songs WHERE id = $1 AND church_id = $2',
      [req.params.id, req.user.church_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Create
router.post('/', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { title, artist, composer, category, youtube_url, lyrics, chords, bpm, tone, tags, start_time, end_time } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const { rows } = await pool.query(
      `INSERT INTO worship_songs (church_id, title, artist, composer, category, youtube_url, lyrics, chords, bpm, tone, tags, start_time, end_time, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.church_id, title, artist || null, composer || null, category || 'Adoração',
       youtube_url || null, lyrics || null, chords || null, bpm || null, tone || null,
       tags || null, start_time || 0, end_time || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { title, artist, composer, category, youtube_url, lyrics, chords, bpm, tone, tags, start_time, end_time } = req.body;
    const { rows } = await pool.query(
      `UPDATE worship_songs SET title=COALESCE($1,title), artist=$2, composer=$3, category=COALESCE($4,category),
       youtube_url=$5, lyrics=$6, chords=$7, bpm=$8, tone=$9, tags=$10, start_time=$11, end_time=$12, updated_at=NOW()
       WHERE id=$13 AND church_id=$14 RETURNING *`,
      [title, artist||null, composer||null, category, youtube_url||null, lyrics||null, chords||null,
       bpm||null, tone||null, tags||null, start_time||0, end_time||null, req.params.id, req.user.church_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { rowCount } = await pool.query(
      'DELETE FROM worship_songs WHERE id=$1 AND church_id=$2',
      [req.params.id, req.user.church_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// AI Identify — uses youtube title to find lyrics/chords/composer
router.post('/ai-identify', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church' && req.user.role !== 'leader' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { title, artist, youtube_url } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });

    // Get active AI provider
    const { rows: provRows } = await pool.query(
      `SELECT id, provider, model, api_keys_encrypted
       FROM ai_providers WHERE is_active = true AND COALESCE(array_length(api_keys_encrypted, 1), 0) > 0
       ORDER BY created_at LIMIT 1`
    );
    if (!provRows.length) return res.status(503).json({ error: 'Nenhum provedor de IA configurado' });

    const prov = provRows[0];
    const apiKey = prov.api_keys_encrypted[Math.floor(Math.random() * prov.api_keys_encrypted.length)];

    const prompt = `Identifique o louvor/música gospel "${title}"${artist ? ` de ${artist}` : ''}.
Retorne em JSON com exatamente estas chaves:
{
  "title": "nome correto do louvor",
  "artist": "artista/banda principal",
  "composer": "compositor(es)",
  "category": "uma de: Adoração, Louvor, Congregacional, Infantil, Instrumental, Outro",
  "tone": "tom original (ex: G, Am, D)",
  "bpm": número ou null,
  "lyrics": "letra completa do louvor com quebras de linha",
  "chords": "cifra simplificada com acordes posicionados na letra"
}
Retorne APENAS o JSON, sem markdown.`;

    let aiResponse = '';
    if (prov.provider === 'openai' || prov.provider === 'deepseek') {
      const baseUrl = prov.provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: prov.model, temperature: 0.3, max_tokens: 4000,
          messages: [
            { role: 'system', content: 'Você é um especialista em música gospel brasileira. Retorne apenas JSON válido.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await r.json();
      aiResponse = data.choices?.[0]?.message?.content || '';
    } else if (prov.provider === 'google') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${prov.model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: 'Você é um especialista em música gospel brasileira. Retorne apenas JSON válido.' }] },
          generationConfig: { maxOutputTokens: 4000, temperature: 0.3 },
        }),
      });
      const data = await r.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (prov.provider === 'groq') {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: prov.model, temperature: 0.3, max_tokens: 4000,
          messages: [
            { role: 'system', content: 'Você é um especialista em música gospel brasileira. Retorne apenas JSON válido.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      const data = await r.json();
      aiResponse = data.choices?.[0]?.message?.content || '';
    }

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
    } catch {
      return res.status(500).json({ error: 'Não foi possível identificar o louvor', raw: aiResponse });
    }

    res.json({ ...parsed, ai_identified: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao identificar louvor' });
  }
});

module.exports = router;
