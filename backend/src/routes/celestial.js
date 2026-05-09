const router = require('express').Router();
const pool = require('../db/pool');
const crypto = require('crypto');

// ===== Game constants (mirror frontend) =====
const BOARD = 10;
const UNITS = [
  { key: 'arca',       name: 'Arca da Aliança',        size: 5 },
  { key: 'salomao',    name: 'Navio de Salomão',       size: 4 },
  { key: 'discipulos', name: 'Barco dos Discípulos',   size: 3 },
  { key: 'carruagem',  name: 'Carruagem de Fogo',      size: 3 },
  { key: 'torre',      name: 'Torre de Vigia',         size: 2 },
  { key: 'muralha',    name: 'Muralha de Jericó',      size: 2 },
  { key: 'tribos',     name: 'Acampamento das Tribos', size: 1 },
];
const INITIAL_CARDS = () => [
  { key: 'mar',     uses: 1 },
  { key: 'estrela', uses: 2 },
  { key: 'salmo',   uses: 1 },
  { key: 'mana',    uses: 1 },
];

function randomFleet() {
  const occ = new Set();
  const placed = [];
  for (const u of UNITS) {
    let attempts = 0;
    while (attempts++ < 500) {
      const orient = Math.random() < 0.5 ? 'h' : 'v';
      const maxR = orient === 'v' ? BOARD - u.size : BOARD - 1;
      const maxC = orient === 'h' ? BOARD - u.size : BOARD - 1;
      const r = Math.floor(Math.random() * (maxR + 1));
      const c = Math.floor(Math.random() * (maxC + 1));
      const cells = [];
      let ok = true;
      for (let i = 0; i < u.size; i++) {
        const idx = (r + (orient === 'v' ? i : 0)) * BOARD + (c + (orient === 'h' ? i : 0));
        if (occ.has(idx)) { ok = false; break; }
        cells.push(idx);
      }
      if (!ok) continue;
      cells.forEach(i => occ.add(i));
      placed.push({
        key: u.key, size: u.size, cells, hits: [],
        hp: u.key === 'muralha' ? 3 : u.size,
        sunk: false, dodged: false,
      });
      break;
    }
  }
  return placed;
}

function inviteCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function getRoom(roomId) {
  const { rows } = await pool.query('SELECT * FROM celestial_rooms WHERE id = $1', [roomId]);
  return rows[0];
}
async function getPlayers(roomId) {
  const { rows } = await pool.query(
    'SELECT * FROM celestial_players WHERE room_id = $1 ORDER BY joined_at ASC',
    [roomId]
  );
  return rows;
}

// View sanitized for the caller
function buildView(room, players, userId) {
  const me = players.find(p => p.user_id === userId);
  const opp = players.find(p => p.user_id !== userId);
  if (!me) return null;

  return {
    room: {
      id: room.id,
      invite_code: room.invite_code,
      status: room.status,
      turn_user_id: room.turn_user_id,
      winner_user_id: room.winner_user_id,
      created_by: room.created_by,
      last_action_at: room.last_action_at,
    },
    me: {
      user_id: me.user_id,
      display_name: me.display_name,
      avatar_url: me.avatar_url,
      units: me.units_json,           // full visibility of own fleet
      shots: me.shots_json,           // shots I fired (visible on opponent board)
      reveals: me.reveals_json,
      cards: me.cards_json,
      psalm_shield: me.psalm_shield,
      mana_boost: me.mana_boost,
      score: me.score,
    },
    opponent: opp ? {
      user_id: opp.user_id,
      display_name: opp.display_name,
      avatar_url: opp.avatar_url,
      // Only reveal sunk units fully + shots they fired on me (so I see hits/misses on my board)
      sunk_units: (opp.units_json || []).filter(u => u.sunk).map(u => ({ key: u.key, cells: u.cells })),
      shots: opp.shots_json,
      score: opp.score,
      remaining: (opp.units_json || []).filter(u => !u.sunk).length,
    } : null,
  };
}

// ===== Routes =====

// POST /create — create a room, auto-place fleet, become player 1
router.post('/create', async (req, res) => {
  try {
    const code = inviteCode();
    const { rows: [room] } = await pool.query(
      `INSERT INTO celestial_rooms (church_id, invite_code, status, created_by, turn_user_id)
       VALUES ($1, $2, 'waiting', $3, $3) RETURNING *`,
      [req.user.church_id, code, req.user.id]
    );
    await pool.query(
      `INSERT INTO celestial_players (room_id, user_id, display_name, avatar_url, units_json, cards_json)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
      [room.id, req.user.id, req.user.name, req.user.avatar_url || null,
       JSON.stringify(randomFleet()), JSON.stringify(INITIAL_CARDS())]
    );
    res.json({ room_id: room.id, invite_code: code });
  } catch (e) {
    console.error('celestial/create', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /join { invite_code }
router.post('/join', async (req, res) => {
  try {
    const code = String(req.body.invite_code || '').toUpperCase().trim();
    if (!code) return res.status(400).json({ error: 'Código obrigatório' });

    const { rows: [room] } = await pool.query(
      `SELECT * FROM celestial_rooms WHERE invite_code = $1`, [code]
    );
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
    if (room.status === 'finished') return res.status(400).json({ error: 'Sala finalizada' });

    // Already a player?
    const { rows: existing } = await pool.query(
      'SELECT * FROM celestial_players WHERE room_id = $1 AND user_id = $2',
      [room.id, req.user.id]
    );
    if (existing.length) {
      return res.json({ room_id: room.id, invite_code: code, rejoined: true });
    }

    const { rows: players } = await pool.query(
      'SELECT user_id FROM celestial_players WHERE room_id = $1',
      [room.id]
    );
    if (players.length >= 2) return res.status(400).json({ error: 'Sala cheia' });

    await pool.query(
      `INSERT INTO celestial_players (room_id, user_id, display_name, avatar_url, units_json, cards_json)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
      [room.id, req.user.id, req.user.name, req.user.avatar_url || null,
       JSON.stringify(randomFleet()), JSON.stringify(INITIAL_CARDS())]
    );

    await pool.query(
      `UPDATE celestial_rooms SET status='playing', started_at=NOW(), last_action_at=NOW() WHERE id=$1`,
      [room.id]
    );

    res.json({ room_id: room.id, invite_code: code });
  } catch (e) {
    console.error('celestial/join', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /room/:id — polled by both clients every 2s
router.get('/room/:id', async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
    const players = await getPlayers(room.id);
    const view = buildView(room, players, req.user.id);
    if (!view) return res.status(403).json({ error: 'Você não está nesta sala' });
    res.json(view);
  } catch (e) {
    console.error('celestial/room get', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /room/:id/shoot { cells: number[] }
router.post('/room/:id/shoot', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [room] } = await client.query(
      'SELECT * FROM celestial_rooms WHERE id = $1 FOR UPDATE', [req.params.id]
    );
    if (!room) throw new Error('Sala não encontrada');
    if (room.status !== 'playing') throw new Error('Partida não está em andamento');
    if (room.turn_user_id !== req.user.id) throw new Error('Não é sua vez');

    const { rows: players } = await client.query(
      'SELECT * FROM celestial_players WHERE room_id = $1 FOR UPDATE',
      [room.id]
    );
    const me = players.find(p => p.user_id === req.user.id);
    const opp = players.find(p => p.user_id !== req.user.id);
    if (!me || !opp) throw new Error('Jogadores não prontos');

    let cells = (req.body.cells || []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 100);
    if (!cells.length) throw new Error('Nenhuma célula');

    // Apply mana boost (cross) if active and only one cell sent
    if (me.mana_boost && cells.length === 1) {
      const idx = cells[0];
      const r = Math.floor(idx / BOARD), c = idx % BOARD;
      const extras = [[-1,0],[1,0],[0,-1],[0,1]]
        .map(([dr,dc]) => [r+dr,c+dc])
        .filter(([nr,nc]) => nr>=0&&nc>=0&&nr<BOARD&&nc<BOARD)
        .map(([nr,nc]) => nr*BOARD+nc);
      cells = [idx, ...extras];
      me.mana_boost = false;
    } else if (cells.length > 1 && !me.mana_boost) {
      throw new Error('Tiro múltiplo requer Chuva de Maná');
    }

    const oppUnits = opp.units_json || [];
    const myShots = me.shots_json || [];
    const shotIdxSet = new Set(myShots.map(s => s.idx));

    let anyHit = false;
    let scoreGain = 0;

    for (const idx of cells) {
      if (shotIdxSet.has(idx)) continue;
      shotIdxSet.add(idx);

      const target = oppUnits.find(u => !u.sunk && u.cells.includes(idx));
      if (!target) {
        myShots.push({ idx, state: 'miss' });
        continue;
      }
      // discípulos esquiva (25% chance) - one-shot
      if (target.key === 'discipulos' && !target.dodged && Math.random() < 0.25) {
        target.dodged = true;
        myShots.push({ idx, state: 'miss' });
        continue;
      }
      // arca sagrada — 1º tiro só revela
      if (target.key === 'arca' && (target.hits || []).length === 0) {
        target.hits.push(idx);
        myShots.push({ idx, state: 'revealed', unit_key: target.key });
        continue;
      }
      target.hits = Array.from(new Set([...(target.hits || []), idx]));
      target.hp = (target.hp ?? target.size) - 1;
      anyHit = true;

      const allHit = target.cells.every(c => target.hits.includes(c));
      const sunk = target.key === 'muralha' ? target.hp <= 0 : allHit;
      if (sunk) {
        target.sunk = true;
        scoreGain += 100;
        myShots.push({ idx, state: 'sunk', unit_key: target.key });
        // Mark all its cells as sunk for visualization
        for (const c of target.cells) {
          if (c !== idx) {
            // remove existing entries on same idx
            for (let i = myShots.length - 1; i >= 0; i--) {
              if (myShots[i].idx === c) myShots.splice(i, 1);
            }
            myShots.push({ idx: c, state: 'sunk', unit_key: target.key });
          }
        }
      } else {
        myShots.push({ idx, state: 'hit' });
      }
    }
    if (anyHit) scoreGain += 25;

    // Persist shooter state
    await client.query(
      `UPDATE celestial_players SET shots_json=$1::jsonb, mana_boost=$2, score = score + $3 WHERE id=$4`,
      [JSON.stringify(myShots), me.mana_boost, scoreGain, me.id]
    );
    // Persist opponent units
    await client.query(
      `UPDATE celestial_players SET units_json=$1::jsonb WHERE id=$2`,
      [JSON.stringify(oppUnits), opp.id]
    );

    // Win check
    const allSunk = oppUnits.every(u => u.sunk);
    if (allSunk) {
      await client.query(
        `UPDATE celestial_rooms SET status='finished', finished_at=NOW(), winner_user_id=$1, last_action_at=NOW() WHERE id=$2`,
        [me.user_id, room.id]
      );
    } else {
      // Switch turn only if no hit (classic battleship: hit = play again)
      const nextTurn = anyHit ? me.user_id : opp.user_id;
      await client.query(
        `UPDATE celestial_rooms SET turn_user_id=$1, last_action_at=NOW() WHERE id=$2`,
        [nextTurn, room.id]
      );
    }

    await client.query('COMMIT');

    // Return updated view
    const updated = await getRoom(room.id);
    const updatedPlayers = await getPlayers(room.id);
    res.json(buildView(updated, updatedPlayers, req.user.id));
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('celestial/shoot', e);
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

// POST /room/:id/card { key, target_idx? }
router.post('/room/:id/card', async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
    if (room.status !== 'playing') return res.status(400).json({ error: 'Partida não em andamento' });
    if (room.turn_user_id !== req.user.id) return res.status(403).json({ error: 'Não é sua vez' });

    const players = await getPlayers(room.id);
    const me = players.find(p => p.user_id === req.user.id);
    const opp = players.find(p => p.user_id !== req.user.id);
    if (!me || !opp) return res.status(400).json({ error: 'Jogadores não prontos' });

    const { key, target_idx } = req.body;
    const cards = me.cards_json || [];
    const card = cards.find(c => c.key === key && c.uses > 0);
    if (!card) return res.status(400).json({ error: 'Carta indisponível' });

    const reveals = me.reveals_json || [];
    const oppUnits = opp.units_json || [];

    const revealCell = (idx) => {
      if (idx < 0 || idx >= 100) return;
      if (reveals.find(r => r.idx === idx)) return;
      const u = oppUnits.find(u => u.cells.includes(idx) && !u.sunk);
      reveals.push(u ? { idx, unit_key: u.key } : { idx });
    };

    if (key === 'estrela') {
      if (typeof target_idx !== 'number') return res.status(400).json({ error: 'Alvo necessário' });
      const r = Math.floor(target_idx / BOARD), c = target_idx % BOARD;
      for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
        const nr=r+dr, nc=c+dc;
        if (nr>=0 && nc>=0 && nr<BOARD && nc<BOARD) revealCell(nr*BOARD + nc);
      }
    } else if (key === 'mar') {
      if (typeof target_idx !== 'number') return res.status(400).json({ error: 'Alvo necessário' });
      const r = Math.floor(target_idx / BOARD);
      for (let c=0; c<BOARD; c++) revealCell(r*BOARD + c);
    } else if (key === 'salmo') {
      me.psalm_shield = true;
    } else if (key === 'mana') {
      me.mana_boost = true;
    } else {
      return res.status(400).json({ error: 'Carta inválida' });
    }

    card.uses -= 1;
    const newCards = cards.filter(c => c.uses > 0);

    await pool.query(
      `UPDATE celestial_players SET cards_json=$1::jsonb, reveals_json=$2::jsonb, psalm_shield=$3, mana_boost=$4 WHERE id=$5`,
      [JSON.stringify(newCards), JSON.stringify(reveals), me.psalm_shield, me.mana_boost, me.id]
    );
    await pool.query(`UPDATE celestial_rooms SET last_action_at=NOW() WHERE id=$1`, [room.id]);

    const updated = await getRoom(room.id);
    const updatedPlayers = await getPlayers(room.id);
    res.json(buildView(updated, updatedPlayers, req.user.id));
  } catch (e) {
    console.error('celestial/card', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /room/:id/forfeit
router.post('/room/:id/forfeit', async (req, res) => {
  try {
    const room = await getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: 'Sala não encontrada' });
    const players = await getPlayers(room.id);
    const opp = players.find(p => p.user_id !== req.user.id);
    await pool.query(
      `UPDATE celestial_rooms SET status='finished', finished_at=NOW(), winner_user_id=$1, last_action_at=NOW() WHERE id=$2`,
      [opp ? opp.user_id : null, room.id]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('celestial/forfeit', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /history — last 20 finished rooms for this user
router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id, r.invite_code, r.finished_at, r.winner_user_id,
              p.score, op.user_id AS opp_user_id, op.display_name AS opp_name, op.score AS opp_score
       FROM celestial_rooms r
       JOIN celestial_players p ON p.room_id = r.id AND p.user_id = $1
       LEFT JOIN celestial_players op ON op.room_id = r.id AND op.user_id <> $1
       WHERE r.status='finished' AND r.church_id = $2
       ORDER BY r.finished_at DESC LIMIT 20`,
      [req.user.id, req.user.church_id]
    );
    res.json(rows);
  } catch (e) {
    console.error('celestial/history', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
