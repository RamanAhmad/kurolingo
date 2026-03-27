'use strict';
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { auth } = require('../middleware/auth');
const { applyRegen, minutesUntilNextRegen } = require('../heartRegen');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

router.get('/:pairId', auth, wrap((req, res) => {
  res.json(getDB().prepare(`
    SELECT up.*,l.title_ku,l.title_tr,l.emoji,l.unit_id
    FROM user_progress up JOIN lessons l ON l.id=up.lesson_id
    WHERE up.user_id=? AND up.pair_id=?
  `).all(req.user.id, req.params.pairId));
}));

router.post('/complete', auth, wrap((req, res) => {
  const db = getDB();
  const { lesson_id, pair_id, xp_earned, accuracy, hearts_remaining } = req.body || {};
  if (!lesson_id || !pair_id)
    return res.status(400).json({ error: 'lesson_id & pair_id erforderlich' });

  const lesson = db.prepare('SELECT id FROM lessons WHERE id=? AND pair_id=?').get(lesson_id, pair_id);
  if (!lesson) return res.status(404).json({ error: 'Lektion nicht gefunden' });

  const xp  = Number(xp_earned) || 0;
  const acc = Number(accuracy)  || 0;

  if (hearts_remaining !== undefined && hearts_remaining !== null) {
    const newHearts = Math.max(0, Math.min(5, Number(hearts_remaining)));
    const now = new Date().toISOString();
    const unlimitedActive = db.prepare(`
      SELECT 1 FROM shop_purchases
      WHERE user_id=? AND item_type='unlimited' AND active_until > ?
      LIMIT 1
    `).get(req.user.id, now);

    if (!unlimitedActive) {
      const currentUser = db.prepare('SELECT hearts FROM users WHERE id=?').get(req.user.id);
      // SECURITY: Client darf Herzen nur REDUZIEREN, nie erhöhen.
      // Verhindert Cheat: POST hearts_remaining=5 wenn User nur 2 hat.
      if (currentUser && newHearts < currentUser.hearts) {
        db.prepare("UPDATE users SET hearts=?, last_heart_lost=datetime('now') WHERE id=?")
          .run(newHearts, req.user.id);
      }
      // Else: newHearts >= currentUser.hearts → ignorieren (kein Update)
    }
  }

  applyRegen(db, req.user.id);

  const existing = db.prepare(
    'SELECT id FROM user_progress WHERE user_id=? AND lesson_id=?'
  ).get(req.user.id, lesson_id);

  if (existing) {
    db.prepare(`
      UPDATE user_progress
      SET completed=1, xp_earned=MAX(xp_earned,?), accuracy=?,
          attempts=attempts+1, last_played=datetime('now')
      WHERE user_id=? AND lesson_id=?
    `).run(xp, acc, req.user.id, lesson_id);
  } else {
    db.prepare(`
      INSERT INTO user_progress (id,user_id,lesson_id,pair_id,completed,xp_earned,accuracy,attempts,last_played)
      VALUES (?,?,?,?,1,?,?,1,datetime('now'))
    `).run(uuid(), req.user.id, lesson_id, pair_id, xp, acc);
  }

  saveToDisk();
  const updatedUser = db.prepare('SELECT total_xp,streak,gems,hearts,level FROM users WHERE id=?').get(req.user.id);

  // Level aus XP berechnen und DB aktualisieren wenn nötig
  const newLevel = Math.floor(Math.sqrt((updatedUser.total_xp || 0) / 50)) + 1;
  if (newLevel !== updatedUser.level) {
    db.prepare('UPDATE users SET level=? WHERE id=?').run(newLevel, req.user.id);
    saveToDisk();
  }

  res.json({
    ...updatedUser,
    level: newLevel,
    next_regen_minutes: updatedUser.hearts < 5 ? minutesUntilNextRegen(db, req.user.id) : 0,
  });
}));

module.exports = router;
