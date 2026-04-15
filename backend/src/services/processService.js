const pool = require('../db/pool');

function safeParseJson(raw, fallback) {
  if (raw == null) return fallback;
  if (typeof raw !== 'string') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      const cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .trim();
      return JSON.parse(cleaned);
    } catch {
      return fallback;
    }
  }
}

function detectTruncation(response) {
  const text = String(response || '').trim();
  const openBraces = (text.match(/{/g) || []).length;
  const closeBraces = (text.match(/}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/]/g) || []).length;
  if (openBraces !== closeBraces || openBrackets !== closeBrackets) return true;
  return [/\.\.\.$/, /…$/, /\[truncated\]/i, /\[continued\]/i].some((p) => p.test(text));
}

function extractJsonFromResponse(response) {
  let cleaned = String(response || '')
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonStart = cleaned.search(/[\[{]/);
  const startChar = jsonStart !== -1 ? cleaned[jsonStart] : null;
  const jsonEnd = startChar === '[' ? cleaned.lastIndexOf(']') : cleaned.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON object found in response');
  }

  cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\x00-\x1F\x7F]/g, '');

  return JSON.parse(cleaned);
}

function extractSummaryText(value) {
  if (!value) return '';
  if (typeof value !== 'string') return String(value);
  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return trimmed;
  const parsed = safeParseJson(trimmed, null);
  if (!parsed) return trimmed;
  if (typeof parsed === 'string') return parsed;
  return parsed.summary || parsed.resumo || parsed.expanded_summary || parsed.text || trimmed;
}

function normalizeTopicsForContext(raw) {
  const parsed = safeParseJson(raw, []);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.topics)) return parsed.topics;
  return [];
}

function normalizeVersesForContext(raw) {
  const parsed = safeParseJson(raw, []);
  if (Array.isArray(parsed)) return parsed;
  return [];
}
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
        let usableCount = 0;
        prevRows.forEach((prev, i) => {
          const topics = normalizeTopicsForContext(prev.ai_topics);
          const verses = normalizeVersesForContext(prev.ai_key_verses);
          const summary = extractSummaryText(prev.ai_summary).slice(0, 300);
          previousContext += `\n${i + 1}. "${prev.title}" - ${prev.preacher || 'Pregador não informado'} (${prev.service_date ? new Date(prev.service_date).toLocaleDateString('pt-BR') : 'data não informada'})`;
          previousContext += `\nResumo: ${summary || 'Sem resumo disponível'}`;
          if (topics.length) previousContext += `\nTópicos: ${topics.join(', ')}`;
          if (verses.length) previousContext += `\nVersículos: ${verses.map(v => v.reference || v).join(', ')}`;
          previousContext += '\n';
          usableCount += 1;
        });
        await addLog('context', `${usableCount} pregações anteriores carregadas para correlação`);
      } else {
        await addLog('context', 'Nenhuma pregação anterior encontrada', 'info');
      }
    } catch (e) {
      await addLog('context', `Erro ao buscar pregações anteriores, prosseguindo sem correlação: ${e.message}`, 'warn');
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
      if (detectTruncation(aiResult)) {
        await addLog('parse', 'Resposta potencialmente truncada detectada; tentando extração robusta.', 'warn');
      }
      parsed = extractJsonFromResponse(aiResult);
    } catch (err) {
      await addLog('parse', `Erro ao interpretar resposta: ${err.message}. Salvando como texto.`, 'warn');
      parsed = {
        summary: extractSummaryText(aiResult),
        expanded_summary: '',
        topics: [],
        key_verses: [],
        practical_applications: [],
        connections: [],
        reflection_questions: [],
        key_points: [],
        deep_explanations: [],
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

⚠️ REGRA CRÍTICA SOBRE VERSÍCULOS:
- "key_verses" deve conter SOMENTE versículos que foram EXPLICITAMENTE CITADOS ou LIDOS pelo pregador durante a mensagem.
- NÃO adicione versículos que você acha que "combinam" ou "se relacionam" com o tema.
- NÃO invente citações que não aparecem na transcrição.
- Se o pregador disse "em João 3:16 diz que...", então João 3:16 é um key_verse.
- Se o pregador NÃO mencionou um versículo específico, ele NÃO deve aparecer em key_verses.
- Versículos que você sugere como complemento vão em "biblical_connections", NÃO em "key_verses".

⚠️ REGRA CRÍTICA SOBRE O RESUMO:
- O "summary" e "expanded_summary" devem mencionar os versículos que o pregador citou.
- Exemplo: "O pregador abriu com Salmo 23 e desenvolveu o tema usando Romanos 8:28..."

Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "summary": "Resumo executivo (5-8 linhas). DEVE mencionar os versículos citados pelo pregador.",

  "expanded_summary": "Resumo expandido e detalhado (mínimo 8 parágrafos), explicando o raciocínio da pregação passo a passo, citando os versículos usados pelo pregador em cada ponto.",

  "central_theme": "Frase clara definindo o tema principal da mensagem.",

  "theological_context": "Fundamento bíblico do tema à luz da Bíblia como um todo.",

  "sermon_structure": [
    {"part": "Introdução", "description": "O que foi abordado e quais versículos foram usados"},
    {"part": "Desenvolvimento 1", "description": "Primeiro ponto e versículos citados"},
    {"part": "Desenvolvimento 2", "description": "Segundo ponto e versículos citados"},
    {"part": "Conclusão", "description": "Como o pregador concluiu"}
  ],

  "topics": ["tópico 1", "tópico 2", "tópico 3", "tópico 4", "tópico 5"],

  "key_points": [
    {"point": "Ponto principal 1", "meaning": "Significado", "concept": "Conceito desenvolvido", "teaching": "O que ensina"}
  ],

  "deep_explanations": [
    {"point": "Ponto 1", "deep_meaning": "Aprofundamento", "spiritual_context": "Contexto espiritual", "biblical_principles": "Princípios bíblicos", "practical_examples": "Exemplos práticos"}
  ],

  "key_verses": [
    {"reference": "João 3:16", "text": "Texto completo do versículo", "biblical_context": "Contexto bíblico", "meaning": "Significado no contexto da pregação", "usage_in_sermon": "COMO e QUANDO o pregador usou este versículo na mensagem — transcreva o trecho se possível"}
  ],

  "biblical_connections": [
    {"reference": "Romanos 8:28", "text": "Texto do versículo", "why_connected": "Por que se relaciona com o tema", "how_reinforces": "Como complementa o ensino — estes NÃO foram citados pelo pregador, são sugestões complementares"}
  ],

  "practical_applications": [
    "Aplicação prática 1 — como aplicar no dia a dia",
    "Aplicação prática 2 — mudança de comportamento",
    "Aplicação prática 3 — reflexão para a semana"
  ],

  "reflection_questions": ["Pergunta 1?", "Pergunta 2?", "Pergunta 3?"],
  "group_study_questions": ["Pergunta para grupo 1?", "Pergunta para grupo 2?", "Pergunta para grupo 3?"],
  "key_phrases": ["Frase marcante 1 da mensagem", "Frase marcante 2"],
  "derived_themes": ["tema derivado 1", "tema derivado 2"],
  "continuation_suggestions": ["Sugestão de continuidade 1", "Sugestão 2"],
  "connections": [
    {"sermon_title": "Pregação anterior", "connection": "Conexão temática identificada"}
  ]
}

REGRAS IMPORTANTES:
- O resumo executivo (summary) DEVE citar os versículos mencionados pelo pregador
- O resumo expandido (expanded_summary) deve ter NO MÍNIMO 8 parágrafos e mencionar versículos citados
- key_verses = SOMENTE versículos CITADOS EXPLICITAMENTE na transcrição pelo pregador
- biblical_connections = versículos complementares sugeridos por você (NÃO citados pelo pregador)
- Se a transcrição não contém citação explícita de nenhum versículo, key_verses deve ser array vazio []
- Gere PELO MENOS 5 key_points com meaning, concept e teaching
- Gere PELO MENOS 3 deep_explanations
- Crie PELO MENOS 3 aplicações práticas
- Crie PELO MENOS 3 perguntas reflexão e 3 para grupo
- NÃO inventar doutrinas
- Manter neutralidade denominacional
- Manter coerência com o contexto bíblico`;
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
