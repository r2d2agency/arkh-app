const router = require('express').Router();
const pool = require('../db/pool');
const { callAI } = require('../services/processService');
const crypto = require('crypto');

function getProviderApiKey(provider) {
  return (provider.api_keys_encrypted || [])[0] || provider.api_key_encrypted || '';
}

function extractJsonArray(text) {
  if (!text || typeof text !== 'string') throw new Error('IA retornou resposta vazia');
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('IA não retornou JSON válido');
  return JSON.parse(match[0]);
}

// POST /api/church/battles/start-solo — start a solo battle
router.post('/start-solo', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { difficulty = 'medium' } = req.body;

    // Get AI provider
    const { rows: providerRows } = await pool.query(
      'SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1'
    );
    if (!providerRows.length) return res.status(400).json({ error: 'Nenhum provedor de IA ativo.' });
    const provider = providerRows[0];
    const apiKey = getProviderApiKey(provider);
    if (!apiKey) return res.status(400).json({ error: 'API key não configurada.' });

    const diffLabels = { easy: 'fácil', medium: 'médio', hard: 'difícil' };
    const systemPrompt = 'Você é um criador de perguntas bíblicas para um jogo competitivo. Responda SOMENTE com JSON válido.';
    const prompt = `Crie exatamente 10 perguntas bíblicas para um jogo de batalha bíblica.
Dificuldade: ${diffLabels[difficulty] || 'médio'}.
${difficulty === 'easy' ? 'Perguntas simples sobre histórias conhecidas.' : ''}
${difficulty === 'medium' ? 'Perguntas intermediárias sobre personagens, eventos e livros.' : ''}
${difficulty === 'hard' ? 'Perguntas avançadas sobre teologia, profetas, genealogias e contexto histórico.' : ''}

Retorne um JSON array:
[
  {
    "question": "texto da pergunta",
    "reference": "referência bíblica",
    "explanation": "breve explicação da resposta correta com versículo",
    "options": { "a": "opção A", "b": "opção B", "c": "opção C", "d": "opção D" },
    "correct": "a"
  }
]`;

    const aiText = await callAI(provider, apiKey, systemPrompt, prompt, 0.8, 8192);
    const questions = extractJsonArray(aiText);
    if (!Array.isArray(questions) || questions.length < 5) {
      return res.status(502).json({ error: 'IA não gerou perguntas suficientes.' });
    }

    // Create room
    const inviteCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const { rows: [room] } = await pool.query(
      `INSERT INTO battle_rooms (church_id, mode, difficulty, status, max_players, invite_code, created_by, started_at)
       VALUES ($1, 'solo', $2, 'playing', 2, $3, $4, NOW()) RETURNING *`,
      [churchId, difficulty, inviteCode, req.user.id]
    );

    // Create human player
    const { rows: [humanPlayer] } = await pool.query(
      `INSERT INTO battle_players (room_id, user_id, is_ai, display_name, avatar_url)
       VALUES ($1, $2, false, $3, $4) RETURNING *`,
      [room.id, req.user.id, req.user.name, req.user.avatar_url]
    );

    // Create AI player
    const aiNames = { easy: '🤖 Noé (Fácil)', medium: '🤖 Davi (Médio)', hard: '🤖 Salomão (Difícil)' };
    const { rows: [aiPlayer] } = await pool.query(
      `INSERT INTO battle_players (room_id, is_ai, ai_difficulty, display_name)
       VALUES ($1, true, $2, $3) RETURNING *`,
      [room.id, difficulty, aiNames[difficulty] || '🤖 IA']
    );

    // Insert questions
    const dbQuestions = [];
    for (let i = 0; i < Math.min(questions.length, 10); i++) {
      const q = questions[i];
      if (!q.question || !q.options || !q.correct) continue;
      const { rows: [dbQ] } = await pool.query(
        `INSERT INTO battle_questions (room_id, question_text, bible_reference, explanation, option_a, option_b, option_c, option_d, correct_option, question_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [room.id, q.question, q.reference || '', q.explanation || '', q.options.a, q.options.b, q.options.c, q.options.d, q.correct, i]
      );
      dbQuestions.push(dbQ);
    }

    res.json({
      room,
      human_player: humanPlayer,
      ai_player: aiPlayer,
      questions: dbQuestions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        bible_reference: q.bible_reference,
        explanation: q.explanation,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        question_order: q.question_order,
        // Don't send correct_option to client — validated on submit
      })),
    });
  } catch (err) {
    console.error('Start solo battle error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/church/battles/:roomId/answer — submit answer for a question
router.post('/:roomId/answer', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { question_id, selected_option, time_ms, power_used } = req.body;

    // Get question
    const { rows: [question] } = await pool.query(
      'SELECT * FROM battle_questions WHERE id = $1 AND room_id = $2',
      [question_id, roomId]
    );
    if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });

    // Get player
    const { rows: [player] } = await pool.query(
      'SELECT * FROM battle_players WHERE room_id = $1 AND user_id = $2 AND is_ai = false',
      [roomId, req.user.id]
    );
    if (!player) return res.status(404).json({ error: 'Jogador não encontrado' });

    const isCorrect = selected_option === question.correct_option;
    
    // Calculate points: base 100, speed bonus up to 100, combo bonus
    let points = 0;
    if (isCorrect) {
      const speedBonus = Math.max(0, Math.floor((10000 - (time_ms || 10000)) / 100));
      const currentCombo = player.combo + 1;
      const comboMultiplier = 1 + (currentCombo - 1) * 0.2;
      points = Math.floor((100 + speedBonus) * comboMultiplier);
      
      // Check for double power
      if (power_used === 'double') points *= 2;

      await pool.query(
        'UPDATE battle_players SET score = score + $1, combo = combo + 1, max_combo = GREATEST(max_combo, combo + 1), correct_answers = correct_answers + 1, total_answers = total_answers + 1 WHERE id = $2',
        [points, player.id]
      );
    } else {
      await pool.query(
        'UPDATE battle_players SET combo = 0, total_answers = total_answers + 1 WHERE id = $1',
        [player.id]
      );
    }

    // Record answer
    await pool.query(
      `INSERT INTO battle_answers (room_id, question_id, player_id, selected_option, is_correct, time_ms, points_awarded, power_used)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [roomId, question_id, player.id, selected_option, isCorrect, time_ms || 0, points, power_used || null]
    );

    // Record power usage
    if (power_used) {
      await pool.query(
        'INSERT INTO battle_powers (player_id, power_type, used_at_question) VALUES ($1,$2,$3)',
        [player.id, power_used, question.question_order]
      );
    }

    // Simulate AI answer
    const { rows: [aiPlayer] } = await pool.query(
      'SELECT * FROM battle_players WHERE room_id = $1 AND is_ai = true LIMIT 1',
      [roomId]
    );
    let aiCorrect = false;
    let aiPoints = 0;
    if (aiPlayer) {
      const diff = aiPlayer.ai_difficulty || 'medium';
      const correctChance = diff === 'easy' ? 0.4 : diff === 'medium' ? 0.65 : 0.85;
      aiCorrect = Math.random() < correctChance;
      if (aiCorrect) {
        const aiTimeMs = diff === 'easy' ? 5000 + Math.random() * 4000 : diff === 'medium' ? 3000 + Math.random() * 3000 : 1500 + Math.random() * 2000;
        const aiSpeedBonus = Math.max(0, Math.floor((10000 - aiTimeMs) / 100));
        const aiCombo = aiPlayer.combo + 1;
        const aiComboMult = 1 + (aiCombo - 1) * 0.2;
        aiPoints = Math.floor((100 + aiSpeedBonus) * aiComboMult);
        await pool.query(
          'UPDATE battle_players SET score = score + $1, combo = combo + 1, max_combo = GREATEST(max_combo, combo + 1), correct_answers = correct_answers + 1, total_answers = total_answers + 1 WHERE id = $2',
          [aiPoints, aiPlayer.id]
        );
      } else {
        await pool.query(
          'UPDATE battle_players SET combo = 0, total_answers = total_answers + 1 WHERE id = $1',
          [aiPlayer.id]
        );
      }
      // Record AI answer
      const aiSelectedOption = aiCorrect ? question.correct_option : ['a','b','c','d'].filter(o => o !== question.correct_option)[Math.floor(Math.random() * 3)];
      await pool.query(
        `INSERT INTO battle_answers (room_id, question_id, player_id, selected_option, is_correct, time_ms, points_awarded)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [roomId, question_id, aiPlayer.id, aiSelectedOption, aiCorrect, Math.floor(Math.random() * 8000 + 1000), aiPoints]
      );
    }

    // Get updated scores
    const { rows: players } = await pool.query(
      'SELECT id, display_name, is_ai, score, combo, correct_answers, total_answers FROM battle_players WHERE room_id = $1 ORDER BY score DESC',
      [roomId]
    );

    res.json({
      is_correct: isCorrect,
      correct_option: question.correct_option,
      explanation: question.explanation,
      points_awarded: points,
      ai_correct: aiCorrect,
      ai_points: aiPoints,
      players,
    });
  } catch (err) {
    console.error('Answer battle error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/church/battles/:roomId/finish — finish the battle
router.post('/:roomId/finish', async (req, res) => {
  try {
    const { roomId } = req.params;

    await pool.query(
      "UPDATE battle_rooms SET status = 'finished', finished_at = NOW() WHERE id = $1",
      [roomId]
    );

    // Get final standings
    const { rows: players } = await pool.query(
      'SELECT * FROM battle_players WHERE room_id = $1 ORDER BY score DESC',
      [roomId]
    );

    // Assign placements
    for (let i = 0; i < players.length; i++) {
      await pool.query('UPDATE battle_players SET placement = $1 WHERE id = $2', [i + 1, players[i].id]);
    }

    // Calculate XP and points for human player
    const human = players.find(p => !p.is_ai);
    if (human) {
      const won = players[0]?.id === human.id;
      const baseXP = 50;
      const winBonus = won ? 100 : 0;
      const accuracyBonus = human.total_answers > 0 ? Math.floor((human.correct_answers / human.total_answers) * 50) : 0;
      const comboBonus = human.max_combo * 10;
      const totalXP = baseXP + winBonus + accuracyBonus + comboBonus;
      const totalPoints = Math.floor(human.score / 10);

      await pool.query(
        'UPDATE battle_players SET xp_earned = $1, points_earned = $2 WHERE id = $3',
        [totalXP, totalPoints, human.id]
      );

      // Update user_game_points
      await pool.query(
        `INSERT INTO user_game_points (user_id, church_id, total_points, quizzes_completed)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (user_id, church_id) DO UPDATE SET
           total_points = user_game_points.total_points + $3,
           quizzes_completed = user_game_points.quizzes_completed + 1,
           updated_at = NOW()`,
        [human.user_id, req.user.church_id, totalPoints]
      );

      // Recalculate level
      const { rows: [gp] } = await pool.query(
        'SELECT total_points FROM user_game_points WHERE user_id = $1 AND church_id = $2',
        [human.user_id, req.user.church_id]
      );
      if (gp) {
        const PHASES = [
          { level: 1, minPoints: 0 }, { level: 2, minPoints: 30 }, { level: 3, minPoints: 80 },
          { level: 4, minPoints: 150 }, { level: 5, minPoints: 300 }, { level: 6, minPoints: 500 },
        ];
        let level = 1;
        for (const p of PHASES) { if (gp.total_points >= p.minPoints) level = p.level; }
        await pool.query('UPDATE user_game_points SET current_level = $1 WHERE user_id = $2 AND church_id = $3', [level, human.user_id, req.user.church_id]);
      }

      // Refetch
      const { rows: finalPlayers } = await pool.query(
        'SELECT * FROM battle_players WHERE room_id = $1 ORDER BY score DESC',
        [roomId]
      );

      return res.json({
        players: finalPlayers,
        winner: finalPlayers[0],
        human_won: finalPlayers[0]?.user_id === human.user_id,
        xp_earned: totalXP,
        points_earned: totalPoints,
      });
    }

    res.json({ players, winner: players[0] });
  } catch (err) {
    console.error('Finish battle error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/battles/history — user's battle history
router.get('/history', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT br.*, bp.score, bp.placement, bp.xp_earned, bp.points_earned, bp.correct_answers, bp.total_answers
       FROM battle_rooms br
       JOIN battle_players bp ON bp.room_id = br.id AND bp.user_id = $1
       WHERE br.church_id = $2 AND br.status = 'finished'
       ORDER BY br.finished_at DESC LIMIT 20`,
      [req.user.id, req.user.church_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Battle history error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/church/battles/ranking — battle leaderboard
router.get('/ranking', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.name, u.avatar_url, 
              COUNT(bp.id) as battles_played,
              SUM(CASE WHEN bp.placement = 1 THEN 1 ELSE 0 END) as wins,
              SUM(bp.score) as total_score,
              SUM(bp.xp_earned) as total_xp
       FROM battle_players bp
       JOIN battle_rooms br ON br.id = bp.room_id
       JOIN users u ON u.id = bp.user_id
       WHERE br.church_id = $1 AND bp.is_ai = false AND br.status = 'finished'
       GROUP BY u.id, u.name, u.avatar_url
       ORDER BY total_score DESC
       LIMIT 20`,
      [req.user.church_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Battle ranking error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
