'use strict';
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { auth, adminOnly, logAdminAction } = require('../middleware/auth');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

router.get('/', wrap((_req, res) => {
  const db = getDB();
  res.json(db.prepare(`
    SELECT lp.*,
      (SELECT COUNT(*) FROM units      WHERE pair_id=lp.id) unit_count,
      (SELECT COUNT(*) FROM lessons    WHERE pair_id=lp.id) lesson_count,
      (SELECT COUNT(*) FROM vocabulary WHERE pair_id=lp.id) vocab_count
    FROM language_pairs lp WHERE lp.status!='draft' ORDER BY lp.sort_order,lp.created_at
  `).all());
}));

router.get('/all', adminOnly, wrap((_req, res) => {
  const db = getDB();
  res.json(db.prepare(`
    SELECT lp.*,
      (SELECT COUNT(*) FROM units      WHERE pair_id=lp.id) unit_count,
      (SELECT COUNT(*) FROM lessons    WHERE pair_id=lp.id) lesson_count,
      (SELECT COUNT(*) FROM vocabulary WHERE pair_id=lp.id) vocab_count,
      (SELECT COUNT(DISTINCT user_id) FROM user_progress WHERE pair_id=lp.id) learner_count
    FROM language_pairs lp ORDER BY lp.sort_order,lp.created_at
  `).all());
}));

router.get('/:id', wrap((req, res) => {
  const db   = getDB();
  const pair = db.prepare('SELECT * FROM language_pairs WHERE id=?').get(req.params.id);
  if (!pair) return res.status(404).json({ error: 'Nicht gefunden' });
  const units = db.prepare(`
    SELECT u.*,(SELECT COUNT(*) FROM lessons WHERE unit_id=u.id) lesson_count
    FROM units u WHERE u.pair_id=? ORDER BY u.sort_order
  `).all(pair.id);
  res.json({ ...pair, units });
}));

router.post('/', adminOnly, wrap((req, res) => {
  const { from_code, from_name, from_flag, from_tts, dialect, name, description, status, difficulty } = req.body;
  if (!from_code || !from_name || !name)
    return res.status(400).json({ error: 'from_code, from_name, name erforderlich' });
  const db  = getDB();
  const raw = `${from_code}-ku`;
  const id  = db.prepare('SELECT id FROM language_pairs WHERE id=?').get(raw) ? `${raw}-${Date.now()}` : raw;
  db.prepare(`INSERT INTO language_pairs (id,from_code,from_name,from_flag,from_tts,dialect,name,description,status,difficulty)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, from_code, from_name, from_flag||'🌐', from_tts||'de-DE', dialect||'Kurmanji', name, description||'', status||'draft', difficulty||'A1');
  db.prepare(`INSERT INTO units (id,pair_id,title_ku,title_tr,emoji,color,sort_order) VALUES (?,?,?,?,?,?,1)`)
    .run(uuid(), id, 'Destpêkên Kurdî', 'Grundlagen', '🌟', '#0B9E88');
  saveToDisk();
  logAdminAction(db, req.user, 'course.create', id, name);
  res.status(201).json(db.prepare('SELECT * FROM language_pairs WHERE id=?').get(id));
}));

router.patch('/:id', adminOnly, wrap((req, res) => {
  const { name, description, status, difficulty, from_tts, dialect } = req.body;
  const db = getDB();
  db.prepare(`UPDATE language_pairs SET
    name=COALESCE(?,name), description=COALESCE(?,description), status=COALESCE(?,status),
    difficulty=COALESCE(?,difficulty), from_tts=COALESCE(?,from_tts), dialect=COALESCE(?,dialect)
    WHERE id=?`).run(name, description, status, difficulty, from_tts, dialect, req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'course.update', req.params.id);
  res.json(db.prepare('SELECT * FROM language_pairs WHERE id=?').get(req.params.id));
}));

router.delete('/:id', adminOnly, wrap((req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM language_pairs WHERE id=?').run(req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'course.delete', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
