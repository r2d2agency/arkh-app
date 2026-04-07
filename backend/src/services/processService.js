const pool = require('../db/pool');

/**
 * Process a service: fetch YouTube transcript, send to AI, save results.
 * Runs asynchronously (fire-and-forget from the route handler).
 */
async function processService(serviceId) {
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

    // 2. Get active AI provider
    await addLog('provider', 'Buscando provedor de IA...');
    const { rows: providerRows } = await pool.query(
      `SELECT * FROM ai_providers WHERE is_active = true ORDER BY created_at LIMIT 1`
    );
    if (!providerRows.length) {
      await addLog('provider', 'Nenhum provedor de IA configurado ou ativo. Configure em Admin > IA.', 'error');
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, ['Nenhum provedor de IA configurado', serviceId]);
      return;
    }
    const provider = providerRows[0];
    const apiKey = (provider.api_keys_encrypted || [])[0];
    if (!apiKey) {
      await addLog('provider', 'Provedor sem API key configurada', 'error');
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, ['API key não configurada', serviceId]);
      return;
    }
    await addLog('provider', `Usando provedor: ${provider.name} (${provider.provider}/${provider.model})`);

    // 3. Fetch YouTube transcript
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

    // 4. Call AI for summary, topics, key verses
    await addLog('ai', 'Enviando para IA analisar...');
    
    const systemPrompt = `Você é um assistente especializado em análise de pregações e cultos cristãos. Responda SEMPRE em JSON válido com a seguinte estrutura:
{
  "summary": "Resumo da pregação em 3-5 parágrafos",
  "topics": ["tópico 1", "tópico 2", ...],
  "key_verses": [{"reference": "João 3:16", "text": "Porque Deus amou o mundo..."}, ...]
}`;

    const userPrompt = `Analise esta pregação/culto e gere um resumo detalhado, os principais tópicos abordados e os versículos-chave mencionados ou relacionados.

Título: ${service.title}
Pregador: ${service.preacher || 'Não informado'}
Data: ${service.service_date || 'Não informada'}

Transcrição/Conteúdo:
${transcript.slice(0, 15000)}`;

    let aiResult;
    try {
      aiResult = await callAI(provider, apiKey, systemPrompt, userPrompt);
      await addLog('ai', 'Resposta da IA recebida, processando...');
    } catch (err) {
      await addLog('ai', `Erro na chamada à IA: ${err.message}`, 'error');
      await pool.query(`UPDATE services SET ai_status = 'error', processing_error = $1 WHERE id = $2`, [err.message, serviceId]);
      return;
    }

    // 5. Parse AI response
    await addLog('parse', 'Interpretando resposta da IA...');
    let parsed;
    try {
      // Try to extract JSON from the response
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
      };
    }

    // 6. Save results
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
        JSON.stringify(parsed.topics || []),
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

/**
 * Fetch YouTube transcript using the innertube API
 */
async function fetchYouTubeTranscript(videoId, startTime, endTime) {
  if (!videoId) throw new Error('Video ID não encontrado');

  const fetchWithTimeout = (url, timeoutMs = 15000) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  };

  // Try fetching captions via YouTube's timedtext API
  const langCodes = ['pt', 'pt-BR', 'en', 'es'];
  
  for (const lang of langCodes) {
    try {
      const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${videoId}&fmt=json3`;
      const res = await fetch(url);
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

  // Fallback: try to get auto-generated captions
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    const html = await pageRes.text();
    
    // Extract caption track URLs from the page
    const captionMatch = html.match(/"captions":\s*(\{.*?"playerCaptionsTracklistRenderer".*?\})/s);
    if (captionMatch) {
      const captionsData = JSON.parse(captionMatch[1]);
      const tracks = captionsData?.playerCaptionsTracklistRenderer?.captionTracks || [];
      
      if (tracks.length > 0) {
        // Prefer Portuguese, then English
        const track = tracks.find(t => t.languageCode === 'pt') || 
                     tracks.find(t => t.languageCode === 'en') || 
                     tracks[0];
        
        const captionRes = await fetch(track.baseUrl + '&fmt=json3');
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

  throw new Error('Não foi possível obter a transcrição do vídeo. Verifique se o vídeo tem legendas disponíveis.');
}

function timeToMs(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
  return 0;
}

/**
 * Call AI provider with the given prompt
 */
async function callAI(provider, apiKey, systemPrompt, userPrompt) {
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
        temperature: parseFloat(provider.temperature) || 0.7,
        max_tokens: provider.max_tokens || 4096,
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
            temperature: parseFloat(provider.temperature) || 0.7,
            maxOutputTokens: provider.max_tokens || 4096,
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
        max_tokens: provider.max_tokens || 4096,
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

  throw new Error(`Provedor "${providerType}" não suportado para processamento`);
}

module.exports = { processService };
