'use strict';
const router = require('express').Router();
const { getDB, saveToDisk } = require('../db');
const { adminOnly, logAdminAction } = require('../middleware/auth');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

router.get('/stats', adminOnly, wrap((_req, res) => {
  const db = getDB();
  res.json({
    users:       db.prepare('SELECT COUNT(*) n FROM users').get().n,
    courses:     db.prepare('SELECT COUNT(*) n FROM language_pairs').get().n,
    units:       db.prepare('SELECT COUNT(*) n FROM units').get().n,
    lessons:     db.prepare('SELECT COUNT(*) n FROM lessons').get().n,
    exercises:   db.prepare('SELECT COUNT(*) n FROM exercises').get().n,
    vocab:       db.prepare('SELECT COUNT(*) n FROM vocabulary').get().n,
    completions: db.prepare('SELECT COUNT(*) n FROM user_progress WHERE completed=1').get().n,
  });
}));

router.get('/users', adminOnly, wrap((_req, res) => {
  res.json(getDB().prepare(
    'SELECT id,email,name,role,streak,total_xp,gems,hearts,level,last_login,created_at FROM users ORDER BY created_at DESC'
  ).all());
}));

router.patch('/users/:id', adminOnly, wrap((req, res) => {
  const { role, gems, hearts } = req.body || {};

  if (role && !['user', 'admin'].includes(role))
    return res.status(400).json({ error: 'Ungültige Rolle' });

  if (gems !== undefined && gems !== null) {
    const g = Number(gems);
    if (!Number.isInteger(g) || g < 0 || g > 1_000_000)
      return res.status(400).json({ error: 'Gems: muss eine ganze Zahl zwischen 0 und 1.000.000 sein' });
  }
  if (hearts !== undefined && hearts !== null) {
    const h = Number(hearts);
    if (!Number.isInteger(h) || h < 0 || h > 5)
      return res.status(400).json({ error: 'Herzen: muss eine ganze Zahl zwischen 0 und 5 sein' });
  }

  const db = getDB();
  db.prepare(
    'UPDATE users SET role=COALESCE(?,role),gems=COALESCE(?,gems),hearts=COALESCE(?,hearts) WHERE id=?'
  ).run(role ?? null, gems ?? null, hearts ?? null, req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'user.update', req.params.id,
    JSON.stringify({ role, gems, hearts }));
  res.json({ ok: true });
}));

router.delete('/users/:id', adminOnly, wrap((req, res) => {
  if (req.params.id === req.user.id)
    return res.status(400).json({ error: 'Du kannst deinen eigenen Account nicht löschen' });
  const db = getDB();
  // Cascade delete related records
  db.prepare('DELETE FROM user_progress WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM exercise_xp_log WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM sr_cards WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM shop_purchases WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM kd_quiz_results WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM kd_community_reactions WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM kd_community_reports WHERE reporter_id=?').run(req.params.id);
  db.prepare('DELETE FROM kd_community WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM token_blacklist WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM user_vocab_progress WHERE user_id=?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'user.delete', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;

// ── GET /admin/log — Admin-Aktionsprotokoll ───────────────────────────────────
router.get('/log', adminOnly, wrap((req, res) => {
  const db = getDB();
  try {
    const rows = db.prepare(
      'SELECT * FROM admin_log ORDER BY created_at DESC LIMIT 100'
    ).all();
    res.json(rows);
  } catch {
    res.json([]); // Tabelle noch nicht vorhanden
  }
}));

