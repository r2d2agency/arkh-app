const router = require('express').Router();
const pool = require('../db/pool');

// GET /api/bible/books
router.get('/books', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM bible_books ORDER BY book_index');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar livros' });
  }
});

// GET /api/bible/chapter/:bookIndex/:chapter
router.get('/chapter/:bookIndex/:chapter', async (req, res) => {
  try {
    const { bookIndex, chapter } = req.params;
    
    // Check if we have verses for this chapter
    const { rows: verses } = await pool.query(
      'SELECT * FROM bible_verses WHERE book_index = $1 AND chapter = $2 ORDER BY verse',
      [bookIndex, chapter]
    );

    // Get user highlights for this chapter
    const { rows: highlights } = await pool.query(
      'SELECT verse, color, note FROM user_bible_highlights WHERE user_id = $1 AND book_index = $2 AND chapter = $3',
      [req.user.id, bookIndex, chapter]
    );

    if (verses.length > 0) {
      return res.json({ verses, highlights });
    }

    // FALLBACK: If no verses in DB, return empty list (UI will use AI or suggest loading)
    // In a real app, you'd populate bible_verses from a JSON or API once.
    res.json({ verses: [], highlights });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar capítulo' });
  }
});

// POST /api/bible/highlight
router.post('/highlight', async (req, res) => {
  try {
    const { book_index, chapter, verse, color, note } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO user_bible_highlights (user_id, book_index, chapter, verse, color, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, book_index, chapter, verse)
       DO UPDATE SET color = EXCLUDED.color, note = EXCLUDED.note, created_at = NOW()
       RETURNING *`,
      [req.user.id, book_index, chapter, verse, color || 'yellow', note || null]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar marcação' });
  }
});

// DELETE /api/bible/highlight/:book/:chapter/:verse
router.delete('/highlight/:book/:chapter/:verse', async (req, res) => {
  try {
    const { book, chapter, verse } = req.params;
    await pool.query(
      'DELETE FROM user_bible_highlights WHERE user_id = $1 AND book_index = $2 AND chapter = $3 AND verse = $4',
      [req.user.id, book, chapter, verse]
    );
    res.json({ message: 'Marcação removida' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover marcação' });
  }
});

module.exports = router;
