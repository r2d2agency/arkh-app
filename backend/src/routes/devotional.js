const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/church/devotional — get today's devotional (or generate from latest sermon)
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    if (!churchId) return res.status(400).json({ error: 'No church' });
    
    const today = new Date().toISOString().split('T')[0];
    
    // Check cache
    const { rows: cached } = await pool.query(
      'SELECT * FROM daily_devotionals WHERE church_id = $1 AND devotional_date = $2',
      [churchId, today]
    );
    
    if (cached.length) return res.json(cached[0]);
    
    // Get latest completed service for context
    const { rows: services } = await pool.query(
      `SELECT id, title, ai_summary, ai_topics, ai_key_verses 
       FROM services WHERE church_id = $1 AND ai_status = 'completed' 
       ORDER BY service_date DESC NULLS LAST LIMIT 3`,
      [churchId]
    );
    
    if (!services.length) {
      // Fallback static devotional
      return res.json({
        verse: 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
        verse_reference: 'João 3:16',
        reflection: 'O amor de Deus é incondicional e eterno. Hoje, descanse nessa verdade e compartilhe esse amor com alguém.',
        devotional_date: today,
        generated: false,
      });
    }
    
    // Try to generate with AI
    try {
      const aiProviders = await pool.query('SELECT * FROM ai_providers WHERE is_active = true LIMIT 1');
      if (!aiProviders.rows.length) throw new Error('No AI provider');
      
      const provider = aiProviders.rows[0];
      const sermonContext = services.map(s => 
        `Pregação: ${s.title}\nResumo: ${s.ai_summary || 'N/A'}\nTópicos: ${JSON.stringify(s.ai_topics || [])}\nVersículos: ${JSON.stringify(s.ai_key_verses || [])}`
      ).join('\n\n');
      
      const prompt = `Com base nas últimas pregações desta igreja, gere um devocional para hoje.

PREGAÇÕES RECENTES:
${sermonContext}

Responda APENAS em JSON válido com esta estrutura:
{
  "verse": "texto do versículo",
  "verse_reference": "Livro capítulo:versículo",
  "reflection": "reflexão de 2-3 parágrafos conectando o versículo com os temas das pregações recentes, aplicação prática para o dia a dia"
}`;

      let aiResponse;
      
      if (provider.provider === 'openai') {
        aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${provider.api_key_encrypted}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: provider.model,
            messages: [
              { role: 'system', content: 'Você é um pastor e teólogo que gera devocionais baseados em pregações da igreja. Responda SOMENTE em JSON.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });
      } else if (provider.provider === 'google') {
        aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.api_key_encrypted}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
          }),
        });
      }
      
      if (aiResponse && aiResponse.ok) {
        const data = await aiResponse.json();
        let text;
        if (provider.provider === 'openai') {
          text = data.choices?.[0]?.message?.content;
        } else {
          text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        }
        
        if (text) {
          // Extract JSON
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            
            // Cache in DB
            await pool.query(
              `INSERT INTO daily_devotionals (church_id, devotional_date, verse, verse_reference, reflection, based_on_service_id)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (church_id, devotional_date) DO NOTHING`,
              [churchId, today, parsed.verse, parsed.verse_reference, parsed.reflection, services[0].id]
            );
            
            return res.json({
              ...parsed,
              devotional_date: today,
              based_on_service_id: services[0].id,
              generated: true,
            });
          }
        }
      }
      throw new Error('AI generation failed');
    } catch (aiErr) {
      console.error('Devotional AI error:', aiErr.message);
      // Fallback: pick a verse from latest sermon
      const svc = services[0];
      const verses = svc.ai_key_verses || [];
      const verse = verses[0] || { text: 'O Senhor é o meu pastor, nada me faltará.', reference: 'Salmos 23:1' };
      
      return res.json({
        verse: verse.text || verse,
        verse_reference: verse.reference || 'Salmos 23:1',
        reflection: `Baseado na pregação "${svc.title}": ${(svc.ai_summary || '').substring(0, 300)}...`,
        devotional_date: today,
        generated: false,
      });
    }
  } catch (err) {
    console.error('Devotional error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;