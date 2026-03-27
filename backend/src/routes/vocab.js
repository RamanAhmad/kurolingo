'use strict';
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { auth, adminOnly, logAdminAction } = require('../middleware/auth');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

router.get('/', wrap((req, res) => {
  const { pair_id, unit_id, q } = req.query;
  const db = getDB();
  let sql = 'SELECT * FROM vocabulary WHERE 1=1'; const p = [];
  if (pair_id) { sql += ' AND pair_id=?'; p.push(pair_id); }
  if (unit_id) { sql += ' AND unit_id=?'; p.push(unit_id); }
  if (q) {
    const term = String(q).slice(0, 100);
    sql += ' AND (kurdish LIKE ? OR translation LIKE ?)';
    p.push(`%${term}%`, `%${term}%`);
  }
  sql += ' ORDER BY created_at DESC';
  res.json(db.prepare(sql).all(...p));
}));

router.post('/', adminOnly, wrap((req, res) => {
  const { pair_id, unit_id, kurdish, translation, pronunciation, word_type, difficulty, audio_file, image_file, example_ku, example_tr } = req.body;
  if (!pair_id || !kurdish || !translation)
    return res.status(400).json({ error: 'pair_id, kurdish, translation erforderlich' });
  const db = getDB(); const id = uuid();
  db.prepare(`INSERT INTO vocabulary (id,pair_id,unit_id,kurdish,translation,pronunciation,word_type,difficulty,audio_file,image_file,example_ku,example_tr)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, pair_id, unit_id||null, kurdish, translation, pronunciation||null, word_type||'noun', difficulty||'A1', audio_file||null, image_file||null, example_ku||null, example_tr||null);
  saveToDisk();
  logAdminAction(db, req.user, 'vocab.create', id, `${kurdish} → ${translation}`);
  res.status(201).json(db.prepare('SELECT * FROM vocabulary WHERE id=?').get(id));
}));

router.patch('/:id', adminOnly, wrap((req, res) => {
  const { kurdish, translation, pronunciation, audio_file, image_file, example_ku, example_tr } = req.body;
  const db = getDB();
  db.prepare(`UPDATE vocabulary SET kurdish=COALESCE(?,kurdish),translation=COALESCE(?,translation),
    pronunciation=COALESCE(?,pronunciation),audio_file=COALESCE(?,audio_file),image_file=COALESCE(?,image_file),
    example_ku=COALESCE(?,example_ku),example_tr=COALESCE(?,example_tr) WHERE id=?`)
    .run(kurdish, translation, pronunciation, audio_file, image_file, example_ku, example_tr, req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'vocab.update', req.params.id);
  res.json(db.prepare('SELECT * FROM vocabulary WHERE id=?').get(req.params.id));
}));

router.delete('/:id', adminOnly, wrap((req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM vocabulary WHERE id=?').run(req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'vocab.delete', req.params.id);
  res.json({ ok: true });
}));

router.post('/bulk', adminOnly, wrap((req, res) => {
  const { pair_id, unit_id, items } = req.body;
  if (!pair_id || !Array.isArray(items))
    return res.status(400).json({ error: 'pair_id & items[] erforderlich' });
  const db  = getDB();
  const ins = db.prepare(`INSERT OR IGNORE INTO vocabulary (id,pair_id,unit_id,kurdish,translation,pronunciation) VALUES (?,?,?,?,?,?)`);
  db.transaction(list => {
    for (const i of list) ins.run(uuid(), pair_id, unit_id||null, i.kurdish, i.translation, i.pronunciation||null);
  })(items);
  saveToDisk();
  res.json({ inserted: items.length });
}));

// ── GET /vocab/progress — alle gelernten Vocab-IDs des eingeloggten Users ──
router.get('/progress', auth, wrap((req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare('SELECT vocab_id FROM user_vocab_progress WHERE user_id=?').all(req.user.id);
    res.json({ learned: rows.map(r => r.vocab_id) });
  } catch { res.json({ learned: [] }); }
}));

// ── POST /vocab/:id/toggle-learned — Lernstatus umschalten ──────────────────
router.post('/:id/toggle-learned', auth, wrap((req, res) => {
  const db = getDB();
  const vocabId = req.params.id;
  try {
    const existing = db.prepare('SELECT 1 FROM user_vocab_progress WHERE user_id=? AND vocab_id=?').get(req.user.id, vocabId);
    if (existing) {
      db.prepare('DELETE FROM user_vocab_progress WHERE user_id=? AND vocab_id=?').run(req.user.id, vocabId);
      saveToDisk();
      res.json({ learned: false });
    } else {
      db.prepare('INSERT OR IGNORE INTO user_vocab_progress (user_id, vocab_id) VALUES (?,?)').run(req.user.id, vocabId);
      saveToDisk();
      res.json({ learned: true });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
}));

module.exports = router;
