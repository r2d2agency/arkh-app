const express = require('express');
const pool = require('../db/pool');
const router = express.Router();

// Util: random invite code
function code(n = 6) {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = ''; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

// Pick verses from DB, biased by difficulty progression
async function pickVerses(rounds = 5, startDifficulty = 'easy') {
  const order = ['easy', 'medium', 'hard'];
  let idx = order.indexOf(startDifficulty);
  if (idx < 0) idx = 0;
  const out = [];
  for (let i = 0; i < rounds; i++) {
    const diff = order[Math.min(idx + Math.floor(i / 2), order.length - 1)];
    const { rows } = await pool.query(
      'SELECT id, reference, text, word_count, difficulty, explanation FROM rush_verses WHERE difficulty = $1 ORDER BY random() LIMIT 1',
      [diff]
    );
    if (rows[0]) out.push(rows[0]);
  }
  // Fallback if pool small
  while (out.length < rounds) {
    const { rows } = await pool.query('SELECT id, reference, text, word_count, difficulty, explanation FROM rush_verses ORDER BY random() LIMIT 1');
    if (rows[0]) out.push(rows[0]); else break;
  }
  return out;
}

// ========== SOLO ==========

router.post('/solo/start', async (req, res) => {
  try {
    const { rounds = 5 } = req.body || {};
    const { rows: [room] } = await pool.query(
      `INSERT INTO rush_rooms (church_id, mode, status, rounds, created_by, started_at)
       VALUES ($1, 'solo', 'playing', $2, $3, NOW()) RETURNING *`,
      [req.user.church_id, rounds, req.user.id]
    );
    const { rows: [player] } = await pool.query(
      `INSERT INTO rush_players (room_id, user_id, display_name, avatar_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [room.id, req.user.id, req.user.name || 'Você', req.user.avatar_url || null]
    );
    const verses = await pickVerses(rounds, 'easy');
    res.json({ room, player, verses });
  } catch (err) {
    console.error('Rush solo start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== DESAFIO ONLINE ==========

router.post('/online/create', async (req, res) => {
  try {
    const { rounds = 5 } = req.body || {};
    const inviteCode = code(6);
    const { rows: [room] } = await pool.query(
      `INSERT INTO rush_rooms (church_id, mode, status, rounds, invite_code, created_by)
       VALUES ($1, 'online', 'waiting', $2, $3, $4) RETURNING *`,
      [req.user.church_id, rounds, inviteCode, req.user.id]
    );
    await pool.query(
      `INSERT INTO rush_players (room_id, user_id, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)`,
      [room.id, req.user.id, req.user.name || 'Jogador', req.user.avatar_url || null]
    );
    res.json({ room });
  } catch (err) {
    console.error('Rush online create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/online/join', async (req, res) => {
  try {
    const { invite_code } = req.body || {};
    if (!invite_code) return res.status(400).json({ error: 'invite_code obrigatório' });
    const { rows: [room] } = await pool.query(
      `SELECT * FROM rush_rooms WHERE invite_code = $1 AND church_id = $2 AND status = 'waiting'`,
      [invite_code.toUpperCase(), req.user.church_id]
    );
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
    const { rows: existing } = await pool.query(
      'SELECT id FROM rush_players WHERE room_id = $1 AND user_id = $2',
      [room.id, req.user.id]
    );
    if (existing.length === 0) {
      await pool.query(
        `INSERT INTO rush_players (room_id, user_id, display_name, avatar_url)
         VALUES ($1, $2, $3, $4)`,
        [room.id, req.user.id, req.user.name || 'Jogador', req.user.avatar_url || null]
      );
    }
    res.json({ room });
  } catch (err) {
    console.error('Rush online join error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/online/:roomId', async (req, res) => {
  try {
    const { rows: [room] } = await pool.query('SELECT * FROM rush_rooms WHERE id = $1', [req.params.roomId]);
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
    const { rows: players } = await pool.query(
      'SELECT * FROM rush_players WHERE room_id = $1 ORDER BY score DESC, joined_at ASC',
      [room.id]
    );
    res.json({ room, players });
  } catch (err) {
    console.error('Rush room get error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/online/:roomId/start', async (req, res) => {
  try {
    const { rows: [room] } = await pool.query('SELECT * FROM rush_rooms WHERE id = $1', [req.params.roomId]);
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
    if (room.created_by !== req.user.id) return res.status(403).json({ error: 'Apenas o criador pode iniciar' });
    if (room.status !== 'waiting') return res.status(400).json({ error: 'Sala já iniciada' });
    const verses = await pickVerses(room.rounds, 'easy');
    await pool.query(
      `UPDATE rush_rooms SET status = 'playing', started_at = NOW() WHERE id = $1`,
      [room.id]
    );
    res.json({ verses });
  } catch (err) {
    console.error('Rush online start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sync de progresso durante a partida online
router.post('/online/:roomId/progress', async (req, res) => {
  try {
    const { score, combo, max_combo, correct_taps, wrong_taps, rounds_completed } = req.body || {};
    await pool.query(
      `UPDATE rush_players
         SET score = COALESCE($1, score),
             combo = COALESCE($2, combo),
             max_combo = GREATEST(COALESCE($3, max_combo), max_combo),
             correct_taps = COALESCE($4, correct_taps),
             wrong_taps = COALESCE($5, wrong_taps),
             rounds_completed = COALESCE($6, rounds_completed)
       WHERE room_id = $7 AND user_id = $8`,
      [score, combo, max_combo, correct_taps, wrong_taps, rounds_completed, req.params.roomId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Rush progress error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== FINISH (calcula XP e pontos integrando ao Game Core) ==========

router.post('/:roomId/finish', async (req, res) => {
  try {
    const { score, max_combo, correct_taps, wrong_taps, rounds_completed, total_time_ms } = req.body || {};
    const { rows: [room] } = await pool.query('SELECT * FROM rush_rooms WHERE id = $1', [req.params.roomId]);
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });

    await pool.query(
      `UPDATE rush_players
         SET score = COALESCE($1, score),
             max_combo = COALESCE($2, max_combo),
             correct_taps = COALESCE($3, correct_taps),
             wrong_taps = COALESCE($4, wrong_taps),
             rounds_completed = COALESCE($5, rounds_completed),
             total_time_ms = COALESCE($6, total_time_ms)
       WHERE room_id = $7 AND user_id = $8`,
      [score, max_combo, correct_taps, wrong_taps, rounds_completed, total_time_ms, room.id, req.user.id]
    );

    // Define placements
    const { rows: players } = await pool.query(
      'SELECT * FROM rush_players WHERE room_id = $1 ORDER BY score DESC, total_time_ms ASC',
      [room.id]
    );
    for (let i = 0; i < players.length; i++) {
      await pool.query('UPDATE rush_players SET placement = $1 WHERE id = $2', [i + 1, players[i].id]);
    }

    const me = players.find(p => p.user_id === req.user.id);
    if (!me) return res.status(404).json({ error: 'Jogador não encontrado' });

    // Recompensas (Game Core)
    const baseXP = 30;
    const accuracy = (me.correct_taps + me.wrong_taps) > 0
      ? me.correct_taps / (me.correct_taps + me.wrong_taps) : 0;
    const accuracyBonus = Math.floor(accuracy * 60);
    const comboBonus = (me.max_combo || 0) * 8;
    const winBonus = (room.mode === 'online' && players[0]?.id === me.id) ? 80 : 0;
    const totalXP = baseXP + accuracyBonus + comboBonus + winBonus;
    const totalPoints = Math.max(1, Math.floor((me.score || 0) / 12));

    await pool.query(
      'UPDATE rush_players SET xp_earned = $1, points_earned = $2 WHERE id = $3',
      [totalXP, totalPoints, me.id]
    );

    await pool.query(
      `INSERT INTO user_game_points (user_id, church_id, total_points, quizzes_completed)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, church_id) DO UPDATE SET
         total_points = user_game_points.total_points + $3,
         quizzes_completed = user_game_points.quizzes_completed + 1,
         updated_at = NOW()`,
      [req.user.id, req.user.church_id, totalPoints]
    );

    const { rows: [gp] } = await pool.query(
      'SELECT total_points FROM user_game_points WHERE user_id = $1 AND church_id = $2',
      [req.user.id, req.user.church_id]
    );
    if (gp) {
      const PHASES = [
        { level: 1, minPoints: 0 }, { level: 2, minPoints: 30 }, { level: 3, minPoints: 80 },
        { level: 4, minPoints: 150 }, { level: 5, minPoints: 300 }, { level: 6, minPoints: 500 },
      ];
      let level = 1;
      for (const p of PHASES) { if (gp.total_points >= p.minPoints) level = p.level; }
      await pool.query(
        'UPDATE user_game_points SET current_level = $1 WHERE user_id = $2 AND church_id = $3',
        [level, req.user.id, req.user.church_id]
      );
    }

    if (room.mode === 'solo' || players.every(p => p.placement)) {
      await pool.query(
        `UPDATE rush_rooms SET status = 'finished', finished_at = NOW() WHERE id = $1 AND status != 'finished'`,
        [room.id]
      );
    }

    const { rows: finalPlayers } = await pool.query(
      'SELECT * FROM rush_players WHERE room_id = $1 ORDER BY score DESC, total_time_ms ASC',
      [room.id]
    );

    res.json({
      players: finalPlayers,
      winner: finalPlayers[0],
      xp_earned: totalXP,
      points_earned: totalPoints,
      placement: me.placement,
    });
  } catch (err) {
    console.error('Rush finish error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== HISTÓRICO E RANKING ==========

router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT rr.id, rr.mode, rr.rounds, rr.finished_at,
              rp.score, rp.placement, rp.xp_earned, rp.points_earned,
              rp.correct_taps, rp.wrong_taps, rp.max_combo
         FROM rush_rooms rr
         JOIN rush_players rp ON rp.room_id = rr.id AND rp.user_id = $1
        WHERE rr.church_id = $2 AND rr.status = 'finished'
        ORDER BY rr.finished_at DESC LIMIT 20`,
      [req.user.id, req.user.church_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Rush history error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/ranking', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.name, u.avatar_url,
              COUNT(rp.id) as games_played,
              SUM(CASE WHEN rp.placement = 1 THEN 1 ELSE 0 END) as wins,
              SUM(rp.score) as total_score,
              SUM(rp.xp_earned) as total_xp,
              MAX(rp.max_combo) as best_combo
         FROM rush_players rp
         JOIN rush_rooms rr ON rr.id = rp.room_id
         JOIN users u ON u.id = rp.user_id
        WHERE rr.church_id = $1 AND rr.status = 'finished'
        GROUP BY u.id, u.name, u.avatar_url
        ORDER BY total_score DESC NULLS LAST
        LIMIT 20`,
      [req.user.church_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Rush ranking error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
