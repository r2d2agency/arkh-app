const router = require('express').Router();
const pool = require('../db/pool');

// List providers (includes masked keys + actual keys for admin edit)
router.get('/providers', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, name, provider, model, is_active, cost_per_1k_tokens,
        api_keys_encrypted,
        COALESCE(array_length(api_keys_encrypted, 1), 0) as api_key_count,
        created_at
      FROM ai_providers ORDER BY name
    `);
    // Return keys with masking for display, full keys available for edit
    const result = rows.map(r => ({
      ...r,
      api_keys: r.api_keys_encrypted || [],
      api_keys_masked: (r.api_keys_encrypted || []).map(k =>
        k.length > 8 ? k.slice(0, 4) + '••••' + k.slice(-4) : '••••••••'
      ),
    }));
    result.forEach((r: any) => delete r.api_keys_encrypted);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Validate API key against provider
router.post('/providers/validate-key', async (req, res) => {
  try {
    const { provider, model, api_key } = req.body;
    if (!api_key || !provider) return res.status(400).json({ error: 'provider and api_key required' });

    let valid = false;
    let message = '';

    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${api_key}` },
      });
      valid = r.ok;
      message = valid ? 'Token válido' : 'Token inválido ou sem permissão';
    } else if (provider === 'google') {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${api_key}`);
      valid = r.ok;
      message = valid ? 'Token válido' : 'Token inválido';
    } else if (provider === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': api_key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: model || 'claude-3-haiku-20240307', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
      });
      valid = r.status !== 401 && r.status !== 403;
      message = valid ? 'Token válido' : 'Token inválido';
    } else if (provider === 'groq') {
      const r = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${api_key}` },
      });
      valid = r.ok;
      message = valid ? 'Token válido' : 'Token inválido';
    } else if (provider === 'deepseek') {
      const r = await fetch('https://api.deepseek.com/v1/models', {
        headers: { Authorization: `Bearer ${api_key}` },
      });
      valid = r.ok;
      message = valid ? 'Token válido' : 'Token inválido';
    } else {
      message = 'Validação não disponível para este provedor';
      valid = true; // skip validation for custom
    }

    res.json({ valid, message });
  } catch (err) {
    console.error(err);
    res.json({ valid: false, message: 'Erro ao validar token' });
  }
});

// Create provider
router.post('/providers', async (req, res) => {
  try {
    const { name, provider, model, api_keys, is_active, cost_per_1k_tokens } = req.body;
    const keysArray = Array.isArray(api_keys) ? api_keys : (api_keys ? [api_keys] : []);
    const { rows } = await pool.query(
      `INSERT INTO ai_providers (name, provider, model, api_keys_encrypted, is_active, cost_per_1k_tokens)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, provider, model, is_active, cost_per_1k_tokens,
         COALESCE(array_length(api_keys_encrypted, 1), 0) as api_key_count`,
      [name, provider, model, keysArray, is_active ?? true, cost_per_1k_tokens || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Update provider
router.put('/providers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, provider, model, api_keys, is_active, cost_per_1k_tokens } = req.body;
    const sets = [];
    const vals = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx++}`); vals.push(name); }
    if (provider !== undefined) { sets.push(`provider = $${idx++}`); vals.push(provider); }
    if (model !== undefined) { sets.push(`model = $${idx++}`); vals.push(model); }
    if (api_keys !== undefined) {
      const keysArray = Array.isArray(api_keys) ? api_keys : [api_keys];
      sets.push(`api_keys_encrypted = $${idx++}`);
      vals.push(keysArray);
    }
    if (is_active !== undefined) { sets.push(`is_active = $${idx++}`); vals.push(is_active); }
    if (cost_per_1k_tokens !== undefined) { sets.push(`cost_per_1k_tokens = $${idx++}`); vals.push(cost_per_1k_tokens); }

    if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE ai_providers SET ${sets.join(', ')} WHERE id = $${idx}
       RETURNING id, name, provider, model, is_active, cost_per_1k_tokens,
         COALESCE(array_length(api_keys_encrypted, 1), 0) as api_key_count`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Toggle active
router.put('/providers/:id/toggle', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `UPDATE ai_providers SET is_active = NOT is_active WHERE id = $1
       RETURNING id, name, provider, model, is_active, cost_per_1k_tokens,
         COALESCE(array_length(api_keys_encrypted, 1), 0) as api_key_count`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Delete provider
router.delete('/providers/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM ai_providers WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Usage stats
router.get('/usage', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT provider, model, SUM(tokens_used) as total_tokens, SUM(cost) as total_cost, COUNT(*) as requests
      FROM ai_usage WHERE created_at >= date_trunc('month', NOW())
      GROUP BY provider, model ORDER BY total_cost DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
