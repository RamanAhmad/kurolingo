'use strict';
const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { adminOnly, auth, logAdminAction } = require('../middleware/auth');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

// ── Multer Storage ─────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Browser recordings may come as video/webm — treat as audio
    const isAudio = file.mimetype.startsWith('audio') || file.mimetype === 'video/webm';
    const sub = isAudio ? 'audio' : 'images';
    const dir = path.join(UPLOAD_DIR, sub);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext      = path.extname(file.originalname).toLowerCase();
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_\-äöüÄÖÜ]/g, '_')
      .slice(0, 60);
    cb(null, `${basename}_${Date.now()}${ext}`);
  },
});

// SVG bewusst NICHT erlaubt — SVG kann <script>-Tags enthalten (Stored XSS)
const ALLOWED_IMAGE = ['image/jpeg','image/png','image/webp','image/gif'];

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    // Allow ALL audio formats (mp3, wav, ogg, m4a, flac, aac, wma, opus, webm…)
    // Also allow video/webm because browser MediaRecorder often produces that MIME
    const isAudio = file.mimetype.startsWith('audio/') || file.mimetype === 'video/webm';
    const isImage = ALLOWED_IMAGE.includes(file.mimetype);
    cb(null, isAudio || isImage);
  },
});

// ── Multer error handler ───────────────────────────────────────────────────
// Multer errors (file too large, wrong type) must be caught here — they bypass
// the normal Express error handler because multer calls next(err) internally.
function uploadErrorHandler(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ error: 'Datei zu groß (max 30 MB)' });
    return res.status(400).json({ error: `Upload-Fehler: ${err.message}` });
  }
  next(err);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function fileUrl(f) {
  return `/uploads/${f.file_type === 'audio' ? 'audio' : 'images'}/${f.filename}`;
}
function enrichFile(f) { return { ...f, url: fileUrl(f) }; }

// ── Routes ─────────────────────────────────────────────────────────────────

router.post('/upload', adminOnly, uploadMiddleware.array('files', 50), wrap((req, res) => {
  const files = req.files;
  if (!files || files.length === 0)
    return res.status(400).json({ error: 'Keine gültigen Dateien hochgeladen' });

  const db          = getDB();
  const label       = req.body.label        || null;
  const kurdishText = req.body.kurdish_text  || null;
  const pairId      = req.body.pair_id      || null;
  const inserted    = [];

  for (const file of files) {
    const id       = uuid();
    const isAudio  = file.mimetype.startsWith('audio') || file.mimetype === 'video/webm';
    const fileType = isAudio ? 'audio' : 'image';
    db.prepare(`
      INSERT INTO media_files
        (id, filename, original_name, mime_type, file_type, size_bytes, pair_id, label, kurdish_text)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, file.filename, file.originalname, file.mimetype,
      fileType, file.size, pairId,
      label || path.basename(file.originalname, path.extname(file.originalname)),
      kurdishText
    );
    inserted.push(enrichFile(db.prepare('SELECT * FROM media_files WHERE id=?').get(id)));
  }

  saveToDisk();
  logAdminAction(db, req.user, 'media.upload', null, `${files.length} file(s)`);
  res.status(201).json(inserted.length === 1 ? inserted[0] : inserted);
}), uploadErrorHandler);

router.patch('/:id', adminOnly, wrap((req, res) => {
  const db = getDB();
  const { label, kurdish_text, pair_id } = req.body;
  db.prepare(`
    UPDATE media_files
    SET label        = COALESCE(?, label),
        kurdish_text = COALESCE(?, kurdish_text),
        pair_id      = COALESCE(?, pair_id)
    WHERE id = ?
  `).run(label ?? null, kurdish_text ?? null, pair_id ?? null, req.params.id);
  saveToDisk();
  const f = db.prepare('SELECT * FROM media_files WHERE id=?').get(req.params.id);
  if (!f) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json(enrichFile(f));
}));

router.get('/', adminOnly, wrap((req, res) => {
  const { type, pair_id, q } = req.query;
  const db = getDB();
  let sql = 'SELECT * FROM media_files WHERE 1=1';
  const p = [];
  if (type)    { sql += ' AND file_type=?';                                     p.push(type); }
  if (pair_id) { sql += ' AND (pair_id=? OR pair_id IS NULL)';                  p.push(pair_id); }
  if (q)       {
    sql += ' AND (label LIKE ? OR kurdish_text LIKE ? OR original_name LIKE ?)';
    p.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  sql += ' ORDER BY uploaded_at DESC';
  res.json(db.prepare(sql).all(...p).map(enrichFile));
}));

// NOTE: /find must be declared BEFORE /:id (which doesn't exist here as GET, but kept safe)
router.get('/find', auth, wrap((req, res) => {
  const { kurdish_text } = req.query;
  if (!kurdish_text) return res.status(400).json({ error: 'kurdish_text erforderlich' });
  const db   = getDB();
  const file = db.prepare(`
    SELECT * FROM media_files
    WHERE file_type = 'audio' AND kurdish_text = ?
    ORDER BY uploaded_at DESC LIMIT 1
  `).get(kurdish_text.trim());
  if (!file) return res.status(404).json({ error: 'Kein Audio für diesen Text' });
  res.json(enrichFile(file));
}));

router.delete('/:id', adminOnly, wrap((req, res) => {
  const db   = getDB();
  const file = db.prepare('SELECT * FROM media_files WHERE id=?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'Nicht gefunden' });
  const fp = path.join(UPLOAD_DIR, file.file_type === 'audio' ? 'audio' : 'images', file.filename);
  // Delete DB record first, then attempt file cleanup
  db.prepare('DELETE FROM media_files WHERE id=?').run(req.params.id);
  saveToDisk();
  try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
  logAdminAction(db, req.user, 'media.delete', req.params.id, file.original_name);
  res.json({ ok: true });
}));

module.exports = router;
