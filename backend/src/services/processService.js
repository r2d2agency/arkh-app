const pool = require('../db/pool');

/**
 * Process a service: fetch YouTube transcript, send to AI, save results.
 * Runs asynchronously (fire-and-forget from the route handler).
 */
async function processService(serviceId, options = {}) {
  const log = [];
  const addLog = async (step, message, status = 'info') => {
    const entry = { step, message, status, timestamp: new Date().toISOString() };
    log.push(entry);
    try {
      await pool.query(
        `UPDATE services SET processing_logs = $1 WHERE id = $2`,
        [JSON.stringify(log), serviceId]
      );
    } catch (e) {
      console.error('Failed to update processing log:', e);
    }
  };

  try {
    // 1. Get service details
    await addLog('init', 'Iniciando processamento...');
    const { rows: svcRows } = await pool.query('SELECT * FROM services WHERE id = $1', [serviceId]);
    if (!svcRows.length) {
      await addLog('init', 'Serviço não encontrado', 'error');
      return;
    }
    const service = svcRows[0];

    // 2. Get AI provider (specific or default)
    await addLog('provider', 'Buscando provedor de IA...');
    const providerId = options.provider_id || service.provider_id;
    let providerQuery;
    if (providerId) {
      providerQuery = await pool.query(`SELECT * FROM ai_providers WHERE id = $1 AND is_active = true`, [providerId]);
    }
    if (!providerQuery?.rows?.length) {
      providerQuery = await pool.query(`SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1`);
    }
    if (!providerQuery.rows.length) {
      await addLog('provider', 'Nenhum provedor de IA configurado ou ativo. Configure em Admin > IA.', 'error');
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, ['Nenhum provedor de IA configurado', serviceId]);
      return;
    }
    const provider = providerQuery.rows[0];
    const apiKey = (provider.api_keys_encrypted || [])[0] || provider.api_key_encrypted;
    if (!apiKey) {
      await addLog('provider', 'Provedor sem API key configurada', 'error');
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, ['API key não configurada', serviceId]);
      return;
    }
    await addLog('provider', `Usando provedor: ${provider.name} (${provider.provider}/${provider.model})`);

    // Save provider used
    if (providerId) {
      await pool.query('UPDATE services SET provider_id = $1 WHERE id = $2', [provider.id, serviceId]);
    }

    // 3. Get church-level AI settings
    let churchPrompt = null;
    let churchTemp = null;
    let churchMaxTokens = null;
    if (service.church_id) {
      const { rows: churchRows } = await pool.query(
        'SELECT ai_prompt_template, ai_temperature, ai_max_tokens FROM churches WHERE id = $1',
        [service.church_id]
      );
      if (churchRows.length) {
        churchPrompt = churchRows[0].ai_prompt_template;
        churchTemp = churchRows[0].ai_temperature;
        churchMaxTokens = churchRows[0].ai_max_tokens;
      }
    }

    // 4. Fetch previous sermons for cross-referencing
    await addLog('context', 'Buscando pregações anteriores para correlação...');
    let previousContext = '';
    try {
      const { rows: prevRows } = await pool.query(
        `SELECT title, preacher, service_date, ai_summary, ai_topics, ai_key_verses 
         FROM services 
         WHERE church_id = $1 AND id != $2 AND ai_status = 'completed' 
         ORDER BY service_date DESC NULLS LAST 
         LIMIT 5`,
        [service.church_id, serviceId]
      );
      if (prevRows.length > 0) {
        previousContext = '\n\n--- PREGAÇÕES ANTERIORES (para correlação) ---\n';
        prevRows.forEach((prev, i) => {
          const topics = typeof prev.ai_topics === 'string' ? JSON.parse(prev.ai_topics) : (prev.ai_topics || []);
          const verses = typeof prev.ai_key_verses === 'string' ? JSON.parse(prev.ai_key_verses) : (prev.ai_key_verses || []);
          previousContext += `\n${i + 1}. "${prev.title}" - ${prev.preacher || 'Pregador não informado'} (${prev.service_date ? new Date(prev.service_date).toLocaleDateString('pt-BR') : 'data não informada'})`;
          previousContext += `\nResumo: ${(prev.ai_summary || '').slice(0, 300)}`;
          previousContext += `\nTópicos: ${topics.join(', ')}`;
          previousContext += `\nVersículos: ${verses.map(v => v.reference || v).join(', ')}`;
          previousContext += '\n';
        });
        await addLog('context', `${prevRows.length} pregações anteriores carregadas para correlação`);
      } else {
        await addLog('context', 'Nenhuma pregação anterior encontrada', 'info');
      }
    } catch (e) {
      await addLog('context', 'Erro ao buscar pregações anteriores, prosseguindo sem correlação', 'warn');
    }

    // 5. Fetch YouTube transcript
    await addLog('transcript', 'Buscando legenda/transcrição do YouTube...');
    let transcript = '';
    try {
      transcript = await fetchYouTubeTranscript(service.video_id, service.ai_start_time, service.ai_end_time);
      if (!transcript || transcript.length < 50) {
        await addLog('transcript', 'Legenda não disponível ou muito curta. Tentando com descrição do vídeo...', 'warn');
        transcript = `Vídeo: ${service.title}. Pregador: ${service.preacher || 'Não informado'}. Não foi possível obter a transcrição automática deste vídeo.`;
      } else {
        await addLog('transcript', `Transcrição obtida: ${transcript.length} caracteres`);
      }
    } catch (err) {
      await addLog('transcript', `Erro ao buscar transcrição: ${err.message}. Prosseguindo com informações básicas.`, 'warn');
      transcript = `Vídeo: ${service.title}. Pregador: ${service.preacher || 'Não informado'}. Transcrição indisponível.`;
    }

    // Save transcription
    await pool.query('UPDATE services SET transcription = $1 WHERE id = $2', [transcript, serviceId]);

    // 6. Call AI for deep analysis
    await addLog('ai', 'Enviando para IA analisar em profundidade...');

    const systemPrompt = churchPrompt || getDefaultSystemPrompt();

    const userPrompt = `Analise esta pregação/culto de forma PROFUNDA e COMPLETA.

Título: ${service.title}
Pregador: ${service.preacher || 'Não informado'}
Data: ${service.service_date ? new Date(service.service_date).toLocaleDateString('pt-BR') : 'Não informada'}

Transcrição/Conteúdo:
${transcript.slice(0, 20000)}
${previousContext}`;

    const temperature = churchTemp ? parseFloat(churchTemp) : (parseFloat(provider.temperature) || 0.7);
    const maxTokens = churchMaxTokens || provider.max_tokens || 8192;

    let aiResult;
    try {
      aiResult = await callAI(provider, apiKey, systemPrompt, userPrompt, temperature, maxTokens);
      await addLog('ai', 'Resposta da IA recebida, processando...');
    } catch (err) {
      await addLog('ai', `Erro na chamada à IA: ${err.message}`, 'error');
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, [err.message, serviceId]);
      return;
    }

    // 7. Parse AI response
    await addLog('parse', 'Interpretando resposta da IA...');
    let parsed;
    try {
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Resposta da IA não contém JSON válido');
      }
    } catch (err) {
      await addLog('parse', `Erro ao interpretar resposta: ${err.message}. Salvando como texto.`, 'warn');
      parsed = {
        summary: aiResult,
        topics: [],
        key_verses: [],
        practical_applications: [],
        connections: [],
        reflection_questions: [],
      };
    }

    // 8. Save results
    await addLog('save', 'Salvando resultados...');
    await pool.query(
      `UPDATE services SET 
        ai_summary = $1, 
        ai_topics = $2, 
        ai_key_verses = $3, 
        ai_status = 'completed',
        processing_error = NULL
       WHERE id = $4`,
      [
        parsed.summary || '',
        JSON.stringify({
          central_theme: parsed.central_theme || '',
          expanded_summary: parsed.expanded_summary || '',
          topics: parsed.topics || [],
          key_points: parsed.key_points || [],
          deep_explanations: parsed.deep_explanations || [],
          practical_applications: parsed.practical_applications || [],
          connections: parsed.connections || [],
          reflection_questions: parsed.reflection_questions || [],
          group_study_questions: parsed.group_study_questions || [],
          theological_context: parsed.theological_context || '',
          sermon_structure: parsed.sermon_structure || [],
          biblical_connections: parsed.biblical_connections || [],
          key_phrases: parsed.key_phrases || [],
          derived_themes: parsed.derived_themes || [],
          continuation_suggestions: parsed.continuation_suggestions || [],
        }),
        JSON.stringify(parsed.key_verses || []),
        serviceId,
      ]
    );

    // Track usage
    try {
      await pool.query(
        `INSERT INTO ai_usage (church_id, provider, model, tokens_used, cost, endpoint) 
         VALUES ($1, $2, $3, $4, $5, 'service_process')`,
        [service.church_id, provider.provider, provider.model, Math.ceil(transcript.length / 4), 0]
      );
    } catch (e) { /* ignore usage tracking errors */ }

    await addLog('done', '✅ Processamento concluído com sucesso!', 'success');
    console.log(`Service ${serviceId} processed successfully`);

  } catch (err) {
    console.error(`Service processing failed for ${serviceId}:`, err);
    await addLog('error', `Erro fatal: ${err.message}`, 'error');
    await pool.query(
      `UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`,
      [err.message, serviceId]
    );
  }
}

function getDefaultSystemPrompt() {
  return `Você é um teólogo e analista bíblico especializado em pregações cristãs. Sua função é transformar o conteúdo de um culto em um material COMPLETO de estudo bíblico — organizado, profundo, claro e aplicável.

O resultado NÃO deve ser apenas um resumo. Deve ser uma estrutura de ensino e aprendizado.

Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "summary": "Resumo executivo curto e objetivo (5 a 8 linhas) explicando o conteúdo da mensagem.",

  "expanded_summary": "Resumo expandido e detalhado da mensagem, organizado em parágrafos, explicando o raciocínio da pregação.",

  "central_theme": "Frase clara definindo o tema principal da mensagem.",

  "theological_context": "Fundamento bíblico do tema à luz da Bíblia como um todo. Conecte com outros livros ou ensinamentos. Explique o conceito de forma ampla.",

  "sermon_structure": [
    {"part": "Introdução", "description": "O que foi abordado na abertura e seu papel"},
    {"part": "Desenvolvimento 1", "description": "Primeiro ponto principal e seu papel"},
    {"part": "Desenvolvimento 2", "description": "Segundo ponto principal e seu papel"},
    {"part": "Conclusão", "description": "Como o pregador concluiu e seu papel"}
  ],

  "topics": ["tópico detalhado 1", "tópico detalhado 2", "tópico 3", "tópico 4", "tópico 5"],

  "key_points": [
    {"point": "Ponto principal 1", "meaning": "Significado", "concept": "Desenvolvimento do conceito", "teaching": "O que ensina"},
    {"point": "Ponto principal 2", "meaning": "Significado", "concept": "Desenvolvimento do conceito", "teaching": "O que ensina"}
  ],

  "deep_explanations": [
    {"point": "Ponto 1", "deep_meaning": "Aprofundamento do significado", "spiritual_context": "Contexto espiritual", "biblical_principles": "Princípios bíblicos conectados", "practical_examples": "Exemplos práticos"}
  ],

  "key_verses": [
    {"reference": "João 3:16", "text": "Texto completo do versículo", "biblical_context": "Contexto bíblico do versículo", "meaning": "Significado", "usage_in_sermon": "Como foi usado na mensagem"}
  ],

  "biblical_connections": [
    {"reference": "Romanos 8:28", "text": "Texto do versículo", "why_connected": "Por que se conecta com o tema", "how_reinforces": "Como reforça o ensino"}
  ],

  "practical_applications": [
    "Aplicação prática 1 — como aplicar no dia a dia com exemplo real",
    "Aplicação prática 2 — mudança de comportamento sugerida",
    "Aplicação prática 3 — reflexão para a semana"
  ],

  "reflection_questions": [
    "Pergunta para reflexão pessoal 1?",
    "Pergunta para reflexão pessoal 2?",
    "Pergunta para reflexão pessoal 3?"
  ],

  "group_study_questions": [
    "Pergunta para estudo em grupo / encontro nas casas 1?",
    "Pergunta para estudo em grupo 2?",
    "Pergunta para estudo em grupo 3?"
  ],

  "key_phrases": [
    "Frase marcante 1 extraída da mensagem",
    "Frase marcante 2 extraída da mensagem"
  ],

  "derived_themes": ["fé", "ansiedade", "provisão", "confiança"],

  "continuation_suggestions": [
    "Tema relacionado para próximo estudo 1",
    "Caminho de aprofundamento 2"
  ],

  "connections": [
    {"sermon_title": "Título da pregação anterior", "connection": "Como esta mensagem se conecta com a anterior"},
    {"theme": "Tema recorrente", "connection": "Padrão identificado entre as pregações"}
  ]
}

REGRAS IMPORTANTES:
- O resumo executivo deve ter 5-8 linhas objetivas
- O resumo expandido deve ser detalhado com múltiplos parágrafos
- Liste PELO MENOS 5 tópicos relevantes
- Cite TODOS os versículos mencionados com texto completo e contexto bíblico
- Crie PELO MENOS 3 aplicações práticas com exemplos reais
- Crie PELO MENOS 3 perguntas para reflexão pessoal
- Crie PELO MENOS 3 perguntas para estudo em grupo
- Extraia frases-chave marcantes da mensagem
- Liste temas derivados que surgem da mensagem
- Sugira caminhos de continuidade e aprofundamento
- Se houver pregações anteriores fornecidas, IDENTIFIQUE conexões temáticas
- NÃO inventar doutrinas
- Manter neutralidade denominacional
- Usar linguagem clara e acessível
- Evitar termos técnicos difíceis sem explicação
- Manter coerência com o contexto bíblico
- Priorizar clareza, profundidade e aplicação`;
}

/**
 * Fetch YouTube transcript using the timedtext API
 */
async function fetchYouTubeTranscript(videoId, startTime, endTime) {
  if (!videoId) throw new Error('Video ID não encontrado');

  const fetchWithTimeout = (url, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  const langCodes = ['pt', 'pt-BR', 'en', 'es'];
  
  for (const lang of langCodes) {
    try {
      const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`;
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const data = await res.json();
        if (data.events && data.events.length > 0) {
          let startMs = timeToMs(startTime);
          let endMs = timeToMs(endTime);
          
          const segments = data.events
            .filter(e => e.segs && e.segs.length > 0)
            .filter(e => {
              if (!startMs && !endMs) return true;
              const t = e.tStartMs || 0;
              if (startMs && t < startMs) return false;
              if (endMs && t > endMs) return false;
              return true;
            })
            .map(e => e.segs.map(s => s.utf8).join(''))
            .join(' ');
          
          if (segments.length > 50) return segments;
        }
      }
    } catch (e) {
      continue;
    }
  }

  // Fallback: try auto-generated captions
  try {
    const pageRes = await fetchWithTimeout(`https://www.youtube.com/watch?v=${videoId}`, 20000);
    const html = await pageRes.text();
    
    const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})/s);
    if (captionMatch) {
      const captionsData = JSON.parse(captionMatch[1]);
      const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks || [];
      
      if (tracks.length > 0) {
        const track = tracks.find(t => t.languageCode === 'pt') || 
                     tracks.find(t => t.languageCode === 'en') || 
                     tracks[0];
        
        const captionRes = await fetchWithTimeout(track.baseUrl + '&fmt=json3');
        if (captionRes.ok) {
          const data = await captionRes.json();
          if (data.events) {
            let startMs = timeToMs(startTime);
            let endMs = timeToMs(endTime);
            
            return data.events
              .filter(e => e.segs && e.segs.length > 0)
              .filter(e => {
                if (!startMs && !endMs) return true;
                const t = e.tStartMs || 0;
                if (startMs && t < startMs) return false;
                if (endMs && t > endMs) return false;
                return true;
              })
              .map(e => e.segs.map(s => s.utf8).join(''))
              .join(' ');
          }
        }
      }
    }
  } catch (e) {
    // Fallback failed
  }

  throw new Error('Não foi possível obter a transcrição do vídeo.');
}

function timeToMs(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return 0;
}

/**
 * Call AI provider
 */
async function callAI(provider, apiKey, systemPrompt, userPrompt, temperature = 0.7, maxTokens = 8192) {
  const providerType = provider.provider;
  const model = provider.model;

  if (providerType === 'openai' || providerType === 'groq' || providerType === 'deepseek') {
    const baseUrls = {
      openai: 'https://api.openai.com/v1',
      groq: 'https://api.groq.com/openai/v1',
      deepseek: 'https://api.deepseek.com/v1',
    };
    const res = await fetch(`${baseUrls[providerType]}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`${providerType} API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  if (providerType === 'google') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Google API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  if (providerType === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  throw new Error(`Provedor "${providerType}" não suportado`);
}

module.exports = { processService, callAI };
