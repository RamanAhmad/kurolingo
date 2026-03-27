'use strict';
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { auth, adminOnly, logAdminAction } = require('../middleware/auth');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

let _shopHelpers = null;
function getShop() {
  if (!_shopHelpers) _shopHelpers = require('./shop');
  return _shopHelpers;
}

const parseEx = e => ({
  ...e,
  options: e.options ? JSON.parse(e.options) : null,
  pairs:   e.pairs   ? JSON.parse(e.pairs)   : null,
  words:   e.words   ? JSON.parse(e.words)   : null,
});

router.get('/', auth, wrap((req, res) => {
  const { pair_id, unit_id } = req.query;
  const db = getDB();
  let q = `SELECT l.*,(SELECT COUNT(*) FROM exercises WHERE lesson_id=l.id) ex_count FROM lessons l WHERE 1=1`;
  const p = [];
  if (pair_id) { q += ' AND l.pair_id=?'; p.push(pair_id); }
  if (unit_id) { q += ' AND l.unit_id=?'; p.push(unit_id); }
  q += ' ORDER BY l.sort_order,l.created_at';
  res.json(db.prepare(q).all(...p));
}));

router.get('/:id', auth, wrap((req, res) => {
  const db     = getDB();
  const lesson = db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.id);
  if (!lesson) return res.status(404).json({ error: 'Nicht gefunden' });
  const isAdmin = req.user?.role === 'admin';
  const exercises = db.prepare('SELECT * FROM exercises WHERE lesson_id=? ORDER BY sort_order,created_at').all(lesson.id).map(parseEx)
    .map(e => { if (isAdmin) return e; const { answer, ...safe } = e; return safe; });
  res.json({ ...lesson, exercises });
}));

router.post('/', adminOnly, wrap((req, res) => {
  const { unit_id, pair_id, title_ku, title_tr, emoji, difficulty, tip, sort_order, status } = req.body;
  if (!unit_id || !pair_id || !title_ku || !title_tr) return res.status(400).json({ error: 'Felder fehlen' });
  const db = getDB(); const id = uuid();
  db.prepare(`INSERT INTO lessons (id,unit_id,pair_id,title_ku,title_tr,emoji,difficulty,tip,sort_order,status)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, unit_id, pair_id, title_ku, title_tr, emoji||'📖', difficulty||'A1', tip||null, sort_order||0, status||'active');
  saveToDisk();
  logAdminAction(db, req.user, 'lesson.create', id, title_tr);
  res.status(201).json(db.prepare('SELECT * FROM lessons WHERE id=?').get(id));
}));

router.patch('/:id', adminOnly, wrap((req, res) => {
  const { title_ku, title_tr, emoji, difficulty, tip, sort_order, status } = req.body;
  const db = getDB();
  db.prepare(`UPDATE lessons SET title_ku=COALESCE(?,title_ku),title_tr=COALESCE(?,title_tr),
    emoji=COALESCE(?,emoji),difficulty=COALESCE(?,difficulty),tip=COALESCE(?,tip),
    sort_order=COALESCE(?,sort_order),status=COALESCE(?,status) WHERE id=?`)
    .run(title_ku, title_tr, emoji, difficulty, tip, sort_order, status, req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'lesson.update', req.params.id);
  res.json(db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.id));
}));

router.delete('/:id', adminOnly, wrap((req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM lessons WHERE id=?').run(req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'lesson.delete', req.params.id);
  res.json({ ok: true });
}));

// POST /api/lessons/:id/submit — answer check + XP (einmal pro Übung)

// GET /api/lessons/review — fällige SR-Übungen für heute
router.get('/review', auth, wrap((req, res) => {
  const db  = getDB();
  const uid = req.user.id;
  const today = new Date().toISOString().slice(0, 10);

  const due = db.prepare(`
    SELECT e.*, sr.next_review, sr.interval, sr.ease, sr.repetitions, sr.last_quality
    FROM sr_cards sr
    JOIN exercises e ON e.id = sr.exercise_id
    WHERE sr.user_id=? AND sr.next_review <= ?
    ORDER BY sr.next_review ASC
    LIMIT 20
  `).all(uid, today).map(parseEx);

  res.json({ due, count: due.length, today });
}));

router.post('/:id/submit', auth, wrap((req, res) => {
  const db = getDB();
  const { exercise_id, user_answer } = req.body;
  if (!exercise_id || user_answer == null)
    return res.status(400).json({ error: 'exercise_id und user_answer erforderlich' });

  const ex = db.prepare('SELECT * FROM exercises WHERE id=? AND lesson_id=?').get(exercise_id, req.params.id);
  if (!ex) return res.status(404).json({ error: 'Übung nicht gefunden' });

  const correct = norm(user_answer) === norm(ex.answer);

  // XP nach kognitiver Schwierigkeit des Übungstyps
  const XP_BY_TYPE = { mc: 5, listen: 8, arrange: 10, fill: 12, match: 8 };
  const baseXp     = XP_BY_TYPE[ex.type] || 8;

  let xpGained = 0;
  if (correct) {
    const inserted = db.prepare(
      `INSERT OR IGNORE INTO exercise_xp_log (user_id, exercise_id) VALUES (?, ?)`
    ).run(req.user.id, exercise_id);

    if (inserted.changes > 0) {
      let multiplier = 1;
      try {
        const shop = getShop();
        const purchases = shop.getActivePurchases(db, req.user.id);
        if (shop.isActive(purchases, 'xp_boost')) multiplier = 2;
      } catch (_) {}

      xpGained = baseXp * multiplier;
      db.prepare('UPDATE users SET total_xp=total_xp+?, gems=gems+1 WHERE id=?')
        .run(xpGained, req.user.id);
      saveToDisk();
    }
  }

  // SM-2 Spaced-Repetition-Karte aktualisieren (Fehler werden geloggt, blockieren aber nie den Response)
  updateSR(db, req.user.id, exercise_id, correct);

  res.json({ correct, correct_answer: ex.answer, xp_gained: xpGained });
}));


// ── SM-2 Spaced Repetition Algorithmus ───────────────────────────────────────
// quality: 0-5 (0-2 = falsch/schwer, 3-5 = richtig, 5 = perfekt)
// Quelle: SuperMemo SM-2 (Wozniak, 1987) — bewährt seit 40 Jahren
function sm2Update(card, quality) {
  let { interval, ease, repetitions } = card;

  if (quality >= 3) {
    // Korrekte Antwort
    if (repetitions === 0)      interval = 1;
    else if (repetitions === 1) interval = 6;
    else                        interval = Math.round(interval * ease);
    repetitions += 1;
  } else {
    // Falsche Antwort — zurück zum Anfang
    repetitions = 0;
    interval    = 1;
  }

  // Ease-Faktor anpassen (zwischen 1.3 und 2.5)
  ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    interval,
    ease: Math.round(ease * 100) / 100,
    repetitions,
    next_review: nextReview.toISOString().slice(0, 10),
    last_quality: quality,
  };
}

function updateSR(db, userId, exerciseId, correct) {
  try {
    // Qualität: korrekt=4, falsch=1 (vereinfacht — später erweiterbar)
    const quality = correct ? 4 : 1;

    const existing = db.prepare(
      'SELECT * FROM sr_cards WHERE user_id=? AND exercise_id=?'
    ).get(userId, exerciseId);

    const updated = sm2Update(
      existing || { interval: 1, ease: 2.5, repetitions: 0 },
      quality
    );

    const { v4: uuid } = require('uuid');
    db.prepare(`
      INSERT INTO sr_cards (id,user_id,exercise_id,next_review,interval,ease,repetitions,last_quality,updated_at)
      VALUES (?,?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(user_id,exercise_id) DO UPDATE SET
        next_review=excluded.next_review, interval=excluded.interval,
        ease=excluded.ease, repetitions=excluded.repetitions,
        last_quality=excluded.last_quality, updated_at=excluded.updated_at
    `).run(
      existing?.id || uuid(), userId, exerciseId,
      updated.next_review, updated.interval, updated.ease,
      updated.repetitions, updated.last_quality
    );
  } catch (e) {
    // SR ist optional — Fehler nie den Hauptflow blockieren
    console.warn('[SR] Update fehlgeschlagen:', e.message);
  }
}

const MAX_ANSWER_LEN = 500;

// Normalize Kurdish answers tolerantly.
// Learners often type without diacritics (ê→e, î→i, û→u, ş→s/sh, ç→c/ch).
// We accept both forms so a missing accent doesn't count as wrong.
const DIACRITIC_MAP = [
  [/ê/g, 'e'], [/î/g, 'i'], [/û/g, 'u'], [/â/g, 'a'], [/ô/g, 'o'],
  [/Ê/g, 'e'], [/Î/g, 'i'], [/Û/g, 'u'], [/Â/g, 'a'], [/Ô/g, 'o'],
  [/ş/g, 's'], [/Ş/g, 's'], [/ç/g, 'c'], [/Ç/g, 'c'],
  [/ğ/g, 'g'], [/Ğ/g, 'g'], [/ı/g, 'i'], [/İ/g, 'i'],
];

function normKu(s) {
  let r = s.toLowerCase();
  for (const [from, to] of DIACRITIC_MAP) r = r.replace(from, to);
  return r;
}

function norm(s) {
  if (!s) return '';
  const clean = String(s).slice(0, MAX_ANSWER_LEN).toLowerCase().trim().replace(/\s+/g, ' ');
  return normKu(clean);
}

module.exports = router;
