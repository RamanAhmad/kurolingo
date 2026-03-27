'use strict';
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { adminOnly, auth, logAdminAction } = require('../middleware/auth');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

const toJSON   = v => v ? JSON.stringify(v) : null;
const fromJSON = e => ({ ...e,
  options: e.options ? JSON.parse(e.options) : null,
  pairs:   e.pairs   ? JSON.parse(e.pairs)   : null,
  words:   e.words   ? JSON.parse(e.words)   : null,
});

// Strip answer from exercises for non-admin users to prevent cheating
const stripAnswer = (e, isAdmin) => {
  if (isAdmin) return e;
  const { answer, ...safe } = e;
  return safe;
};

router.get('/', auth, wrap((req, res) => {
  const { lesson_id } = req.query;
  const db = getDB();
  if (!lesson_id) return res.status(400).json({ error: 'lesson_id erforderlich' });
  const isAdmin = req.user?.role === 'admin';
  res.json(db.prepare('SELECT * FROM exercises WHERE lesson_id=? ORDER BY sort_order').all(lesson_id).map(fromJSON).map(e => stripAnswer(e, isAdmin)));
}));

const VALID_TYPES = ['mc', 'listen', 'arrange', 'fill', 'match'];

router.post('/', adminOnly, wrap((req, res) => {
  const { lesson_id, type, question, answer, options, pairs, words, hint, tts_text, audio_file, image_file, sort_order } = req.body;
  if (!lesson_id || !type || !question || !answer) return res.status(400).json({ error: 'Felder fehlen' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: `Ungültiger Typ. Erlaubt: ${VALID_TYPES.join(', ')}` });
  const db = getDB(); const id = uuid();
  db.prepare(`INSERT INTO exercises (id,lesson_id,type,question,answer,options,pairs,words,hint,tts_text,audio_file,image_file,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, lesson_id, type, question, answer, toJSON(options), toJSON(pairs), toJSON(words), hint||null, tts_text||answer, audio_file||null, image_file||null, sort_order||0);
  saveToDisk();
  logAdminAction(db, req.user, 'exercise.create', id, `${type}: ${question.slice(0, 50)}`);
  res.status(201).json(fromJSON(db.prepare('SELECT * FROM exercises WHERE id=?').get(id)));
}));

router.patch('/:id', adminOnly, wrap((req, res) => {
  const { question, answer, options, pairs, words, hint, tts_text, audio_file, image_file } = req.body;
  const db = getDB();
  db.prepare(`UPDATE exercises SET question=COALESCE(?,question),answer=COALESCE(?,answer),
    options=COALESCE(?,options),pairs=COALESCE(?,pairs),words=COALESCE(?,words),
    hint=COALESCE(?,hint),tts_text=COALESCE(?,tts_text),audio_file=COALESCE(?,audio_file),image_file=COALESCE(?,image_file) WHERE id=?`)
    .run(question, answer, toJSON(options), toJSON(pairs), toJSON(words), hint, tts_text, audio_file, image_file, req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'exercise.update', req.params.id);
  res.json(fromJSON(db.prepare('SELECT * FROM exercises WHERE id=?').get(req.params.id)));
}));

router.delete('/:id', adminOnly, wrap((req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM exercises WHERE id=?').run(req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'exercise.delete', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
