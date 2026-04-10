const router = require('express').Router();
const pool = require('../db/pool');
const crypto = require('crypto');

// Normaliza pergunta para cache (lowercase, sem acentos, sem pontuação extra)
function normalizeQuestion(q) {
  return q.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function hashQuestion(normalized) {
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

// ─── Check if AI Assistant is available for this user ───
router.get('/status', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        c.ai_assistant_enabled as church_enabled,
        p.ai_assistant_enabled as plan_enabled,
        p.ai_assistant_daily_limit as daily_limit,
        p.ai_assistant_max_tokens_per_msg as max_tokens_per_msg,
        COALESCE(u.interactions_count, 0) as used_today
      FROM users usr
      JOIN churches c ON c.id = usr.church_id
      LEFT JOIN plans p ON p.id = c.plan_id
      LEFT JOIN ai_assistant_usage u ON u.user_id = usr.id AND u.usage_date = CURRENT_DATE
      WHERE usr.id = $1
    `, [req.user.id]);
    
    if (!rows.length) return res.json({ available: false, reason: 'user_not_found' });
    
    const r = rows[0];
    const available = r.church_enabled && r.plan_enabled;
    const remaining = Math.max(0, (r.daily_limit || 0) - (r.used_today || 0));
    
    res.json({
      available,
      church_enabled: r.church_enabled,
      plan_enabled: r.plan_enabled,
      daily_limit: r.daily_limit || 0,
      used_today: r.used_today || 0,
      remaining,
      max_tokens_per_msg: r.max_tokens_per_msg || 2000,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── List user conversations ───
router.get('/conversations', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, context_type, context_id, title, created_at, updated_at
      FROM ai_assistant_conversations
      WHERE user_id = $1
      ORDER BY updated_at DESC
      LIMIT 50
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── Get conversation messages ───
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT m.id, m.role, m.content, m.created_at
      FROM ai_assistant_messages m
      JOIN ai_assistant_conversations c ON c.id = m.conversation_id
      WHERE m.conversation_id = $1 AND c.user_id = $2
      ORDER BY m.created_at ASC
    `, [req.params.id, req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── Send message to AI ───
router.post('/chat', async (req, res) => {
  try {
    const { message, conversation_id, context_type, context_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });

    // Check availability
    const { rows: statusRows } = await pool.query(`
      SELECT 
        c.ai_assistant_enabled as church_enabled,
        c.id as church_id,
        c.ai_prompt_template,
        p.ai_assistant_enabled as plan_enabled,
        p.ai_assistant_daily_limit as daily_limit,
        p.ai_assistant_max_tokens_per_msg as max_tokens_per_msg,
        COALESCE(u.interactions_count, 0) as used_today
      FROM users usr
      JOIN churches c ON c.id = usr.church_id
      LEFT JOIN plans p ON p.id = c.plan_id
      LEFT JOIN ai_assistant_usage u ON u.user_id = usr.id AND u.usage_date = CURRENT_DATE
      WHERE usr.id = $1
    `, [req.user.id]);

    if (!statusRows.length) return res.status(403).json({ error: 'Usuário não encontrado' });
    const status = statusRows[0];

    if (!status.church_enabled || !status.plan_enabled) {
      return res.status(403).json({ error: 'IA Assistente não está disponível no plano da sua igreja' });
    }
    if (status.daily_limit > 0 && status.used_today >= status.daily_limit) {
      return res.status(429).json({ error: 'Limite diário de interações atingido' });
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { rows: convRows } = await pool.query(
        `INSERT INTO ai_assistant_conversations (user_id, church_id, context_type, context_id, title)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [req.user.id, status.church_id, context_type || 'general', context_id || null, message.substring(0, 80)]
      );
      convId = convRows[0].id;
    }

    // Save user message
    await pool.query(
      'INSERT INTO ai_assistant_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'user', message]
    );

    // Get conversation history
    const { rows: history } = await pool.query(
      'SELECT role, content FROM ai_assistant_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 20',
      [convId]
    );

    // Load context if within service/study
    let contextInfo = '';
    if (context_type === 'service' && context_id) {
      const { rows: svc } = await pool.query(
        'SELECT title, ai_summary, transcription FROM services WHERE id = $1 AND church_id = $2',
        [context_id, status.church_id]
      );
      if (svc.length) {
        contextInfo = `\n\nContexto do culto "${svc[0].title}":\n${svc[0].ai_summary || ''}\n${svc[0].transcription?.substring(0, 3000) || ''}`;
      }
    }

    // Build system prompt
    const systemPrompt = `Você é o Assistente ARKHÉ, uma IA integrada à plataforma ARKHÉ para igrejas.
Sua função é ajudar membros da igreja com:
- Explicações bíblicas e teológicas
- Contextualização de versículos
- Aplicações práticas
- Organização de estudos e anotações
- Perguntas sobre a fé cristã

Diretrizes:
- Use linguagem clara e acessível
- Sempre cite referências bíblicas quando relevante
- Seja respeitoso e acolhedor
- Não assuma posições doutrinárias rígidas
- Foque em explicação e orientação
- Responda em português do Brasil
${contextInfo}
${status.ai_prompt_template ? `\nInstruções adicionais da igreja:\n${status.ai_prompt_template}` : ''}`;

    // Get active AI provider
    const { rows: providers } = await pool.query(
      'SELECT id, provider, model, api_keys_encrypted FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1'
    );

    if (!providers.length) {
      return res.status(503).json({ error: 'Nenhum provedor de IA configurado' });
    }

    const prov = providers[0];
    const apiKeys = prov.api_keys_encrypted || [];
    if (!apiKeys.length) {
      return res.status(503).json({ error: 'Provedor de IA sem chave configurada' });
    }
    const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

    // Call AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];

    let aiResponse = '';
    const maxTokens = status.max_tokens_per_msg || 2000;

    if (prov.provider === 'openai' || prov.provider === 'deepseek') {
      const baseUrl = prov.provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
      const r = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: prov.model, messages, max_tokens: maxTokens, temperature: 0.7 }),
      });
      const data = await r.json();
      aiResponse = data.choices?.[0]?.message?.content || 'Não foi possível gerar resposta.';
    } else if (prov.provider === 'google') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${prov.model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
        }),
      });
      const data = await r.json();
      aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível gerar resposta.';
    } else if (prov.provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: prov.model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: history.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await r.json();
      aiResponse = data.content?.[0]?.text || 'Não foi possível gerar resposta.';
    } else if (prov.provider === 'groq') {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: prov.model, messages, max_tokens: maxTokens, temperature: 0.7 }),
      });
      const data = await r.json();
      aiResponse = data.choices?.[0]?.message?.content || 'Não foi possível gerar resposta.';
    }

    // Save AI response
    await pool.query(
      'INSERT INTO ai_assistant_messages (conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4)',
      [convId, 'assistant', aiResponse, maxTokens]
    );

    // Update usage
    await pool.query(`
      INSERT INTO ai_assistant_usage (user_id, church_id, usage_date, interactions_count, tokens_used)
      VALUES ($1, $2, CURRENT_DATE, 1, $3)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET interactions_count = ai_assistant_usage.interactions_count + 1,
                    tokens_used = ai_assistant_usage.tokens_used + $3
    `, [req.user.id, status.church_id, maxTokens]);

    // Track AI usage
    await pool.query(
      'INSERT INTO ai_usage (church_id, provider, model, tokens_used, cost) VALUES ($1, $2, $3, $4, $5)',
      [status.church_id, prov.provider, prov.model, maxTokens, 0]
    );

    res.json({
      conversation_id: convId,
      message: aiResponse,
    });
  } catch (err) {
    console.error('AI Assistant error:', err);
    res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

// ─── Toggle AI Assistant for church (admin_church) ───
router.put('/toggle', async (req, res) => {
  try {
    if (req.user.role !== 'admin_church') return res.status(403).json({ error: 'Forbidden' });
    const { rows } = await pool.query(
      'UPDATE churches SET ai_assistant_enabled = NOT ai_assistant_enabled WHERE id = $1 RETURNING ai_assistant_enabled',
      [req.user.church_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ai_assistant_enabled: rows[0].ai_assistant_enabled });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ─── Admin: get usage stats per church ───
router.get('/admin/usage', async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Forbidden' });
    const { rows } = await pool.query(`
      SELECT c.name as church_name, c.id as church_id,
        SUM(u.interactions_count) as total_interactions,
        SUM(u.tokens_used) as total_tokens,
        COUNT(DISTINCT u.user_id) as unique_users
      FROM ai_assistant_usage u
      JOIN churches c ON c.id = u.church_id
      WHERE u.usage_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY c.id, c.name
      ORDER BY total_interactions DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
