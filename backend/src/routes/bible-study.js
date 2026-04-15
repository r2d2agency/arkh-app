const router = require('express').Router();
const pool = require('../db/pool');

// Helper to get active AI provider (same as assistant.js)
async function getActiveProvider() {
  const { rows } = await pool.query(
    `SELECT id, provider, model, api_keys_encrypted
     FROM ai_providers
     WHERE is_active = true AND COALESCE(array_length(api_keys_encrypted, 1), 0) > 0
     ORDER BY created_at LIMIT 1`
  );
  if (!rows.length) return null;
  const p = rows[0];
  const keys = p.api_keys_encrypted || [];
  return { ...p, apiKey: keys[Math.floor(Math.random() * keys.length)] };
}

async function generateAIResponse(provider, messages, systemPrompt, maxTokens) {
  const body = { model: provider.model, max_tokens: maxTokens, temperature: 0.7 };

  if (provider.provider === 'openai' || provider.provider === 'deepseek' || provider.provider === 'groq') {
    const baseUrl = provider.provider === 'deepseek' ? 'https://api.deepseek.com/v1'
      : provider.provider === 'groq' ? 'https://api.groq.com/openai/v1'
      : 'https://api.openai.com/v1';
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
      body: JSON.stringify({ ...body, messages: [{ role: 'system', content: systemPrompt }, ...messages] }),
    });
    const data = await r.json();
    return data.choices?.[0]?.message?.content || '';
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else if (provider.provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': provider.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ ...body, system: systemPrompt, messages }),
    });
    const data = await r.json();
    return data.content?.[0]?.text || '';
  }
  return '';
}

const difficultyPrompts = {
  easy: `Nível FÁCIL (iniciante na fé):
- Linguagem simples e acessível
- Explique como se fosse para alguém que nunca leu a Bíblia
- Contexto histórico básico
- Uma aplicação prática simples para o dia a dia
- Máximo 3 parágrafos curtos`,

  medium: `Nível MÉDIO (cristão com algum conhecimento):
- Contexto histórico e cultural mais detalhado
- Significado das palavras-chave no original (hebraico/grego)
- Referências cruzadas com outros livros da Bíblia
- Conexões teológicas importantes
- Aplicações práticas relevantes
- 4-5 parágrafos`,

  expert: `Nível EXPERT (estudante avançado/teólogo):
- Análise exegética profunda
- Palavras no original (hebraico/grego) com transliteração
- Contexto histórico-cultural detalhado
- Diferentes interpretações teológicas
- Conexões intertextuais e tipologia
- Implicações teológicas e doutrinárias
- Referências a comentaristas e estudiosos
- 5-7 parágrafos densos`,
};

// GET /api/bible-study/chapter?book=0&chapter=1&difficulty=easy
router.get('/chapter', async (req, res) => {
  try {
    const bookIndex = parseInt(req.query.book);
    const chapter = parseInt(req.query.chapter);
    const difficulty = req.query.difficulty || 'easy';
    const bookName = req.query.bookName || '';

    if (isNaN(bookIndex) || isNaN(chapter)) {
      return res.status(400).json({ error: 'book and chapter required' });
    }
    if (!['easy', 'medium', 'expert'].includes(difficulty)) {
      return res.status(400).json({ error: 'invalid difficulty' });
    }

    // 1. Check global cache first (church_id IS NULL), then church-specific
    const { rows: cached } = await pool.query(
      `SELECT id, study_content, summary, key_points, cross_references, practical_application
       FROM bible_verse_studies
       WHERE book_index = $1 AND chapter = $2 AND verse IS NULL AND difficulty = $3
         AND (church_id IS NULL OR church_id = $4)
       ORDER BY church_id NULLS LAST
       LIMIT 1`,
      [bookIndex, chapter, difficulty, req.user.church_id || null]
    );

    if (cached.length) {
      // Increment hit count
      await pool.query('UPDATE bible_verse_studies SET hit_count = hit_count + 1 WHERE id = $1', [cached[0].id]).catch(() => {});
      return res.json({ ...cached[0], cached: true });
    }

    // 2. Generate with AI
    const provider = await getActiveProvider();
    if (!provider) {
      return res.status(503).json({ error: 'Nenhum provedor de IA configurado' });
    }

    const systemPrompt = `Você é um estudioso bíblico experiente. Gere um estudo do capítulo solicitado.
${difficultyPrompts[difficulty]}

FORMATO DA RESPOSTA (JSON):
{
  "summary": "Resumo de 1-2 frases do capítulo",
  "study_content": "O estudo completo em markdown",
  "key_points": ["Ponto 1", "Ponto 2", "Ponto 3"],
  "cross_references": ["Referência 1", "Referência 2"],
  "practical_application": "Como aplicar na vida"
}

Responda APENAS o JSON, sem markdown code block.`;

    const userMsg = `Gere um estudo de ${bookName} capítulo ${chapter}.`;
    const maxTokens = difficulty === 'expert' ? 3000 : difficulty === 'medium' ? 2000 : 1200;

    const aiText = await generateAIResponse(provider, [{ role: 'user', content: userMsg }], systemPrompt, maxTokens);

    let parsed;
    try {
      // Try to extract JSON from response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiText);
    } catch {
      parsed = {
        summary: '',
        study_content: aiText,
        key_points: [],
        cross_references: [],
        practical_application: '',
      };
    }

    // 3. Save to global cache (church_id = NULL for reusability)
    await pool.query(
      `INSERT INTO bible_verse_studies (book_index, book_name, chapter, verse, difficulty, church_id,
        study_content, summary, key_points, cross_references, practical_application)
       VALUES ($1, $2, $3, NULL, $4, NULL, $5, $6, $7, $8, $9)
       ON CONFLICT (book_index, chapter, verse, difficulty, church_id) DO UPDATE SET
         study_content = EXCLUDED.study_content,
         summary = EXCLUDED.summary,
         key_points = EXCLUDED.key_points,
         cross_references = EXCLUDED.cross_references,
         practical_application = EXCLUDED.practical_application,
         hit_count = bible_verse_studies.hit_count + 1`,
      [bookIndex, bookName, chapter, difficulty,
       parsed.study_content, parsed.summary,
       JSON.stringify(parsed.key_points || []),
       JSON.stringify(parsed.cross_references || []),
       parsed.practical_application]
    ).catch(e => console.error('Cache save error:', e));

    // Track usage
    await pool.query(
      'INSERT INTO ai_usage (church_id, provider, model, tokens_used, cost) VALUES ($1, $2, $3, $4, $5)',
      [req.user.church_id || null, provider.provider, provider.model, maxTokens, 0]
    ).catch(() => {});

    res.json({ ...parsed, cached: false });
  } catch (err) {
    console.error('Bible study error:', err);
    res.status(500).json({ error: 'Erro ao gerar estudo' });
  }
});

module.exports = router;
