const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { transcribeYouTubeWithWhisper } = require('../services/whisperService');

// POST /api/church/notebook-ai/enhance — Enhance note with AI
router.post('/enhance', async (req, res) => {
  try {
    const { content, task } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    // Mocking AI response for now since we don't have a generic completion service 
    // that's easy to call without OpenAI API Key being passed everywhere.
    // In a real scenario, this would call GPT-4.
    
    let enhanced = content;
    if (task === 'format') {
      enhanced = `### Título Sugerido\n\n${content}\n\n---\n*Anotação formatada automaticamente por IA*`;
    } else if (task === 'summarize') {
      enhanced = `**Resumo:** ${content.substring(0, 100)}...`;
    } else if (task === 'verses') {
      enhanced = `${content}\n\n📖 **Versículos Relacionados:**\n- João 3:16\n- Salmos 23:1`;
    }

    res.json({ enhanced });
  } catch (err) {
    console.error('AI Enhance error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
