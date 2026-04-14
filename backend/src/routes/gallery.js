const router = require('express').Router();
const pool = require('../db/pool');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../../uploads/gallery');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowed = /\.(jpg|jpeg|png|gif|webp|heic)$/i;
  if (allowed.test(path.extname(file.originalname))) cb(null, true);
  else cb(new Error('Tipo de arquivo não permitido'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 20 * 1024 * 1024 } });

// POST /api/church/gallery — upload images, convert to WebP
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    const churchId = req.user.church_id;
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
    const results = [];

    for (const file of req.files) {
      const filename = `${uuidv4()}.webp`;
      const filepath = path.join(uploadDir, filename);

      await sharp(file.buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(filepath);

      const url = `${baseUrl}/uploads/gallery/${filename}`;
      const { rows } = await pool.query(
        `INSERT INTO church_gallery (church_id, uploaded_by, image_url, filename, original_name)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [churchId, req.user.id, url, filename, file.originalname]
      );
      results.push(rows[0]);
    }

    res.status(201).json(results);
  } catch (err) {
    console.error('Gallery upload error:', err);
    res.status(500).json({ error: 'Erro no upload' });
  }
});

// GET /api/church/gallery — list church gallery images
router.get('/', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `SELECT * FROM church_gallery WHERE church_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [churchId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET gallery error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// DELETE /api/church/gallery/:id
router.delete('/:id', async (req, res) => {
  try {
    const churchId = req.user.church_id;
    const { rows } = await pool.query(
      `DELETE FROM church_gallery WHERE id = $1 AND church_id = $2 RETURNING filename`,
      [req.params.id, churchId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Imagem não encontrada' });
    // Try to delete file
    const filepath = path.join(uploadDir, rows[0].filename);
    fs.unlink(filepath, () => {});
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE gallery error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

module.exports = router;
