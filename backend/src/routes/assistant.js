const router = require('express').Router();
const pool = require('../db/pool');
const crypto = require('crypto');

function normalizeQuestion(q) {
  return q.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function hashQuestion(normalized) {
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function getMasterPrompt() {
  try {
    const { rows } = await pool.query(`SELECT value FROM system_settings WHERE key = 'assistant_master_prompt' LIMIT 1`);
    if (!rows.length) return '';
    const raw = rows[0].value;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object' && typeof raw.text === 'string') return raw.text;
    return '';
  } catch {
    return '';
  }
}

async function getActiveProvider() {
  const { rows } = await pool.query(
    `SELECT id, provider, model, api_keys_encrypted
     FROM ai_providers
     WHERE is_active = true AND COALESCE(array_length(api_keys_encrypted, 1), 0) > 0
     ORDER BY created_at
     LIMIT 1`
  );

  if (!rows.length) return null;

  const provider = rows[0];
  const apiKeys = provider.api_keys_encrypted || [];
  const apiKey = apiKeys[Math.floor(Math.random() * apiKeys.length)];

  return { ...provider, apiKey };
}

async function generateAIResponse(provider, messages, systemPrompt, maxTokens) {
  let aiResponse = '';

  if (provider.provider === 'openai' || provider.provider === 'deepseek') {
    const baseUrl = provider.provider === 'deepseek' ? 'https://api.deepseek.com/v1' : 'https://api.openai.com/v1';
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });
    const data = await r.json();
    aiResponse = data.choices?.[0]?.message?.content || 'Não foi possível gerar resposta.';
  } else if (provider.provider === 'google') {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
      }),
    });
    const data = await r.json();
    aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Não foi possível gerar resposta.';
  } else if (provider.provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await r.json();
    aiResponse = data.content?.[0]?.text || 'Não foi possível gerar resposta.';
  } else if (provider.provider === 'groq') {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });
    const data = await r.json();
    aiResponse = data.choices?.[0]?.message?.content || 'Não foi possível gerar resposta.';
  }

  return aiResponse || 'Não foi possível gerar resposta.';
}

router.get('/status', async (req, res) => {
  try {
    const provider = await getActiveProvider();
    const providerAvailable = !!provider;

    if (req.user.role === 'super_admin') {
      return res.json({
        available: providerAvailable,
        church_enabled: true,
        plan_enabled: true,
        daily_limit: 0,
        used_today: 0,
        remaining: 0,
        max_tokens_per_msg: 4000,
      });
    }

    const { rows } = await pool.query(`
      SELECT 
        COALESCE(c.ai_assistant_enabled, false) as church_enabled,
        (COALESCE(p.ai_assistant_enabled, false) OR COALESCE(p.price, 0) > 0) as plan_enabled,
        COALESCE(p.ai_assistant_daily_limit, 0) as daily_limit,
        COALESCE(p.ai_assistant_max_tokens_per_msg, 2000) as max_tokens_per_msg,
        COALESCE(u.interactions_count, 0) as used_today
      FROM users usr
      JOIN churches c ON c.id = usr.church_id
      LEFT JOIN plans p ON p.id = c.plan_id
      LEFT JOIN ai_assistant_usage u ON u.user_id = usr.id AND u.usage_date = CURRENT_DATE
      WHERE usr.id = $1
    `, [req.user.id]);

    if (!rows.length) return res.json({ available: false, reason: 'user_not_found' });

    const r = rows[0];
    const available = providerAvailable && r.church_enabled && r.plan_enabled;
    const remaining = r.daily_limit > 0
      ? Math.max(0, r.daily_limit - (r.used_today || 0))
      : 0;

    res.json({
      available,
      church_enabled: r.church_enabled,
      plan_enabled: r.plan_enabled,
      daily_limit: r.daily_limit,
      used_today: r.used_today || 0,
      remaining,
      max_tokens_per_msg: r.max_tokens_per_msg,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

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

router.post('/chat', async (req, res) => {
  try {
    const { message, conversation_id, context_type, context_id } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message required' });

    const provider = await getActiveProvider();
    if (!provider) {
      return res.status(503).json({ error: 'Nenhum provedor de IA configurado' });
    }

    const masterPrompt = await getMasterPrompt();

    if (req.user.role === 'super_admin') {
const systemPrompt = `Você é o Assistente ARKHÉ para Super Admin.
REGRAS: Seja CURTO e DIRETO. Máximo 3-4 parágrafos. Responda em pt-BR. Vá direto ao ponto.
Ajude com: plataforma, config, planos, IA, igrejas, membros.
${masterPrompt ? `\nPrompt mestre:\n${masterPrompt}` : ''}`;

      const aiResponse = await generateAIResponse(
        provider,
        [{ role: 'user', content: message }],
        systemPrompt,
        4000,
      );

      await pool.query(
        'INSERT INTO ai_usage (church_id, provider, model, tokens_used, cost) VALUES ($1, $2, $3, $4, $5)',
        [null, provider.provider, provider.model, 4000, 0]
      ).catch(() => {});

      return res.json({
        conversation_id: conversation_id || 'super-admin',
        message: aiResponse,
      });
    }

    const { rows: statusRows } = await pool.query(`
      SELECT 
        COALESCE(c.ai_assistant_enabled, false) as church_enabled,
        c.id as church_id,
        c.ai_assistant_prompt,
        (COALESCE(p.ai_assistant_enabled, false) OR COALESCE(p.price, 0) > 0) as plan_enabled,
        COALESCE(p.ai_assistant_daily_limit, 0) as daily_limit,
        COALESCE(p.ai_assistant_max_tokens_per_msg, 2000) as max_tokens_per_msg,
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

    let convId = conversation_id;
    if (!convId) {
      const { rows: convRows } = await pool.query(
        `INSERT INTO ai_assistant_conversations (user_id, church_id, context_type, context_id, title)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [req.user.id, status.church_id, context_type || 'general', context_id || null, message.substring(0, 80)]
      );
      convId = convRows[0].id;
    }

    await pool.query(
      'INSERT INTO ai_assistant_messages (conversation_id, role, content) VALUES ($1, $2, $3)',
      [convId, 'user', message]
    );

    const normalized = normalizeQuestion(message);
    const qHash = hashQuestion(normalized);
    const isFirstMessage = !conversation_id;

    if (isFirstMessage) {
      const { rows: cached } = await pool.query(
        `SELECT id, response FROM ai_assistant_cache
         WHERE church_id = $1 AND question_hash = $2 AND context_type = $3
         LIMIT 1`,
        [status.church_id, qHash, context_type || 'general']
      );

      if (cached.length) {
        const cachedResponse = cached[0].response;

        await pool.query(
          'UPDATE ai_assistant_cache SET hit_count = hit_count + 1 WHERE id = $1',
          [cached[0].id]
        );

        await pool.query(
          'INSERT INTO ai_assistant_messages (conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4)',
          [convId, 'assistant', cachedResponse, 0]
        );

        await pool.query(`
          INSERT INTO ai_assistant_usage (user_id, church_id, usage_date, interactions_count, tokens_used)
          VALUES ($1, $2, CURRENT_DATE, 1, 0)
          ON CONFLICT (user_id, usage_date)
          DO UPDATE SET interactions_count = ai_assistant_usage.interactions_count + 1
        `, [req.user.id, status.church_id]);

        return res.json({
          conversation_id: convId,
          message: cachedResponse,
          cached: true,
        });
      }
    }

    const { rows: history } = await pool.query(
      'SELECT role, content FROM ai_assistant_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 20',
      [convId]
    );

    let contextInfo = '';
    let relatedServices = [];

    // If inside a specific service context, load it
    if (context_type === 'service' && context_id) {
      const { rows: svc } = await pool.query(
        'SELECT title, preacher, service_date, ai_summary, ai_topics, ai_key_verses, transcription FROM services WHERE id = $1 AND church_id = $2',
        [context_id, status.church_id]
      );
      if (svc.length) {
        const s = svc[0];
        contextInfo = `\n\n=== CONTEXTO DO CULTO ===\nTítulo: "${s.title}"`;
        if (s.preacher) contextInfo += `\nPregador: ${s.preacher}`;
        if (s.service_date) contextInfo += `\nData: ${new Date(s.service_date).toLocaleDateString('pt-BR')}`;
        if (s.ai_summary) contextInfo += `\nResumo: ${s.ai_summary}`;
        if (s.ai_topics?.length) contextInfo += `\nTópicos: ${JSON.stringify(s.ai_topics)}`;
        if (s.ai_key_verses?.length) contextInfo += `\nVersículos: ${JSON.stringify(s.ai_key_verses)}`;
        if (s.transcription) contextInfo += `\nTranscrição completa:\n${s.transcription.substring(0, 6000)}`;
      }
    }

    // Search related services/sermons based on the user message — use transcriptions as knowledge base
    if (context_type !== 'service') {
      try {
        const keywords = message.replace(/[^a-zA-ZÀ-ú0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 5);
        if (keywords.length > 0) {
          const searchQuery = keywords.join(' | ');
          const { rows: foundServices } = await pool.query(`
            SELECT id, title, service_date, preacher, ai_summary, 
                   SUBSTRING(transcription FROM 1 FOR 3000) as transcription_excerpt
            FROM services
            WHERE church_id = $1 AND ai_status = 'completed'
              AND (
                to_tsvector('portuguese', COALESCE(title,'') || ' ' || COALESCE(ai_summary,'') || ' ' || COALESCE(transcription,''))
                @@ to_tsquery('portuguese', $2)
              )
            ORDER BY service_date DESC NULLS LAST
            LIMIT 3
          `, [status.church_id, searchQuery]);

          if (foundServices.length) {
            relatedServices = foundServices.map(s => ({ id: s.id, title: s.title, date: s.service_date }));
            contextInfo += `\n\n=== BASE DE CONHECIMENTO: Cultos/pregações da igreja ===\n`;
            contextInfo += foundServices.map(s => {
              let entry = `--- Culto: "${s.title}"`;
              if (s.preacher) entry += ` | Pregador: ${s.preacher}`;
              if (s.service_date) entry += ` | Data: ${new Date(s.service_date).toLocaleDateString('pt-BR')}`;
              entry += `\nResumo: ${(s.ai_summary || 'Sem resumo').substring(0, 300)}`;
              if (s.transcription_excerpt) {
                entry += `\nTrecho da transcrição: ${s.transcription_excerpt}`;
              }
              return entry;
            }).join('\n\n');
          }
        }

        // Fallback: if no full-text results, try ILIKE
        if (!relatedServices.length) {
          const likeTerms = message.replace(/[^a-zA-ZÀ-ú0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 3);
          if (likeTerms.length > 0) {
            const likeClauses = likeTerms.map((_, i) => `(COALESCE(title,'') || ' ' || COALESCE(ai_summary,'') || ' ' || COALESCE(transcription,'')) ILIKE $${i + 2}`);
            const likeParams = likeTerms.map(t => `%${t}%`);
            const { rows: fallbackServices } = await pool.query(`
              SELECT id, title, service_date, preacher, ai_summary,
                     SUBSTRING(transcription FROM 1 FOR 3000) as transcription_excerpt
              FROM services
              WHERE church_id = $1 AND ai_status = 'completed' AND (${likeClauses.join(' OR ')})
              ORDER BY service_date DESC NULLS LAST
              LIMIT 3
            `, [status.church_id, ...likeParams]);

            if (fallbackServices.length) {
              relatedServices = fallbackServices.map(s => ({ id: s.id, title: s.title, date: s.service_date }));
              contextInfo += `\n\n=== BASE DE CONHECIMENTO: Cultos/pregações da igreja ===\n`;
              contextInfo += fallbackServices.map(s => {
                let entry = `--- Culto: "${s.title}"`;
                if (s.preacher) entry += ` | Pregador: ${s.preacher}`;
                if (s.service_date) entry += ` | Data: ${new Date(s.service_date).toLocaleDateString('pt-BR')}`;
                entry += `\nResumo: ${(s.ai_summary || 'Sem resumo').substring(0, 300)}`;
                if (s.transcription_excerpt) {
                  entry += `\nTrecho da transcrição: ${s.transcription_excerpt}`;
                }
                return entry;
              }).join('\n\n');
            }
          }
        }
      } catch (searchErr) {
        console.error('Service search error:', searchErr);
      }
    }

    const systemPrompt = `Você é o Assistente ARKHÉ, IA da plataforma ARKHÉ para igrejas.

REGRAS OBRIGATÓRIAS DE RESPOSTA:
- Seja CURTO e DIRETO. Máximo 3-4 parágrafos curtos.
- Use frases objetivas. Nada de introduções longas.
- Cite versículos de forma inline (ex: "Jo 3:16").
- Se encontrou cultos/pregações relacionados, MENCIONE brevemente.
- Responda em português do Brasil.
- Não repita a pergunta do usuário.
- Vá direto ao ponto.
${contextInfo}
${masterPrompt ? `\nPrompt mestre:\n${masterPrompt}` : ''}
${status.ai_assistant_prompt ? `\nContexto da igreja:\n${status.ai_assistant_prompt}` : ''}`;

    const maxTokens = status.max_tokens_per_msg || 2000;
    const aiResponse = await generateAIResponse(
      provider,
      history.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
      maxTokens,
    );

    await pool.query(
      'INSERT INTO ai_assistant_messages (conversation_id, role, content, tokens_used) VALUES ($1, $2, $3, $4)',
      [convId, 'assistant', aiResponse, maxTokens]
    );

    if (isFirstMessage && aiResponse && !aiResponse.includes('Não foi possível')) {
      await pool.query(`
        INSERT INTO ai_assistant_cache (church_id, question_hash, question_normalized, context_type, context_id, response)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (church_id, question_hash, context_type) DO UPDATE SET
          response = EXCLUDED.response,
          hit_count = ai_assistant_cache.hit_count + 1,
          updated_at = NOW()
      `, [status.church_id, qHash, normalized, context_type || 'general', context_id || null, aiResponse]).catch(() => {});
    }

    await pool.query(`
      INSERT INTO ai_assistant_usage (user_id, church_id, usage_date, interactions_count, tokens_used)
      VALUES ($1, $2, CURRENT_DATE, 1, $3)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET interactions_count = ai_assistant_usage.interactions_count + 1,
                    tokens_used = ai_assistant_usage.tokens_used + $3
    `, [req.user.id, status.church_id, maxTokens]);

    await pool.query(
      'INSERT INTO ai_usage (church_id, provider, model, tokens_used, cost) VALUES ($1, $2, $3, $4, $5)',
      [status.church_id, provider.provider, provider.model, maxTokens, 0]
    );

    res.json({
      conversation_id: convId,
      message: aiResponse,
      related_services: relatedServices.length ? relatedServices : undefined,
    });
  } catch (err) {
    console.error('AI Assistant error:', err);
    res.status(500).json({ error: 'Erro ao processar mensagem' });
  }
});

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
