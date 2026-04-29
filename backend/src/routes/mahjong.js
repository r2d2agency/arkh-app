const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// Util: ordena par
function orderPair(a, b) { return a < b ? [a, b] : [b, a]; }

// GET /api/church/mahjong/levels — lista níveis disponíveis
router.get('/levels', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, shape, difficulty, description, sort_order
       FROM mahjong_levels
       WHERE is_active = true AND (church_id IS NULL OR church_id = $1)
       ORDER BY sort_order, difficulty, name`,
      [req.user.church_id]
    );
    // Anexar best-score do usuário
    const ids = rows.map(r => r.id);
    let bestMap = {};
    if (ids.length) {
      const { rows: bests } = await pool.query(
        `SELECT level_id, MAX(score) AS best_score, MIN(time_seconds) FILTER (WHERE time_seconds > 0) AS best_time
         FROM mahjong_progress WHERE user_id = $1 AND level_id = ANY($2::uuid[]) GROUP BY level_id`,
        [req.user.id, ids]
      );
      bests.forEach(b => { bestMap[b.level_id] = b; });
    }
    res.json(rows.map(r => ({ ...r, best: bestMap[r.id] || null })));
  } catch (err) {
    console.error('Mahjong levels error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/mahjong/levels/:id — devolve layout + peças hidratadas
router.get('/levels/:id', async (req, res) => {
  try {
    const { rows: [lvl] } = await pool.query(
      `SELECT * FROM mahjong_levels
       WHERE id = $1 AND is_active = true AND (church_id IS NULL OR church_id = $2)`,
      [req.params.id, req.user.church_id]
    );
    if (!lvl) return res.status(404).json({ error: 'Nível não encontrado' });

    const layout = Array.isArray(lvl.layout) ? lvl.layout : [];
    const tileIds = [...new Set(layout.map(p => p.tile_id))];
    const { rows: tiles } = await pool.query(
      `SELECT id, kind, text, transliteration, translation, icon, category, context, reference
       FROM mahjong_tiles WHERE id = ANY($1::uuid[])`,
      [tileIds]
    );
    const tileMap = {};
    tiles.forEach(t => { tileMap[t.id] = t; });

    // Cada peça do layout vira uma "instância" com piece_id único + tile_data
    let pieces = layout.map((p, idx) => ({
      piece_id: `${lvl.id}-${idx}`,
      x: parseFloat(p.x), y: parseFloat(p.y), z: parseInt(p.z),
      tile: tileMap[p.tile_id] || null,
    })).filter(p => p.tile);

    // Validação de paridade: Se o layout tiver um número ímpar de peças para um tipo de combinação,
    // o nível pode ser impossível. No entanto, Mahjong Bíblico permite combinações N2/N3.
    // O que importa é que o total de peças seja PAR.
    if (pieces.length % 2 !== 0) {
      console.warn(`Nível ${lvl.name} tem número ímpar de peças (${pieces.length})`);
    }

    res.json({
      id: lvl.id,
      name: lvl.name,
      shape: lvl.shape,
      difficulty: lvl.difficulty,
      description: lvl.description,
      pieces,
    });
  } catch (err) {
    console.error('Mahjong level error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/church/mahjong/match — valida combinação
router.post('/match', async (req, res) => {
  try {
    const { tile_a_id, tile_b_id } = req.body || {};
    if (!tile_a_id || !tile_b_id) return res.status(400).json({ error: 'IDs obrigatórios' });

    // N1: mesma tile (duas instâncias da mesma peça)
    if (tile_a_id === tile_b_id) {
      const { rows: [t] } = await pool.query('SELECT context, text FROM mahjong_tiles WHERE id = $1', [tile_a_id]);
      return res.json({
        match: true, level: 1,
        explanation: t?.context || `Par exato: ${t?.text || ''}.`,
      });
    }

    const [a, b] = orderPair(tile_a_id, tile_b_id);
    const { rows: [rel] } = await pool.query(
      `SELECT match_level, explanation FROM mahjong_relations
       WHERE tile_a_id = $1 AND tile_b_id = $2 LIMIT 1`,
      [a, b]
    );
    if (rel) {
      return res.json({ match: true, level: rel.match_level, explanation: rel.explanation });
    }
    res.json({ match: false });
  } catch (err) {
    console.error('Mahjong match error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/church/mahjong/complete — salva progresso
router.post('/complete', async (req, res) => {
  try {
    const { level_id, score = 0, time_seconds = 0, mode = 'relax', matches_correct = 0, matches_wrong = 0, status = 'completed' } = req.body || {};
    if (!level_id) return res.status(400).json({ error: 'level_id obrigatório' });

    const { rows: [row] } = await pool.query(
      `INSERT INTO mahjong_progress (user_id, level_id, status, mode, score, time_seconds, matches_correct, matches_wrong)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, level_id, status, mode, score, time_seconds, matches_correct, matches_wrong]
    );
    res.json(row);
  } catch (err) {
    console.error('Mahjong complete error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
