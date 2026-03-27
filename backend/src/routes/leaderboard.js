'use strict';
const router = require('express').Router();
const { getDB } = require('../db');
const { auth }  = require('../middleware/auth');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

/**
 * GET /api/leaderboard
 * Query params:
 *   period  = 'week' | 'alltime'  (default: week)
 *   pair_id = string              (optional: filter by course)
 *   limit   = number              (default: 20, max: 100)
 */
router.get('/', auth, wrap((req, res) => {
  const db       = getDB();
  const period   = req.query.period   || 'week';
  const pairId   = req.query.pair_id  || null;
  const limitRaw = parseInt(req.query.limit, 10);
  const limit    = Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20, 100);

  let rows;

  if (period === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sql = `
      SELECT u.id AS _uid, u.name, u.streak, u.level,
        COALESCE(SUM(up.xp_earned), 0) AS xp,
        COUNT(CASE WHEN up.completed = 1 THEN 1 END) AS lessons_done
      FROM users u
      LEFT JOIN user_progress up
        ON up.user_id = u.id AND up.last_played >= ?
        ${pairId ? 'AND up.pair_id = ?' : ''}
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY xp DESC, u.streak DESC
      LIMIT ?
    `;
    rows = db.prepare(sql).all(...(pairId ? [weekAgo, pairId, limit] : [weekAgo, limit]));
  } else {
    const sql = `
      SELECT u.id AS _uid, u.name, u.streak, u.level, u.total_xp AS xp,
        (SELECT COUNT(*) FROM user_progress
         WHERE user_id = u.id AND completed = 1
         ${pairId ? 'AND pair_id = ?' : ''}) AS lessons_done
      FROM users u
      WHERE u.role != 'admin'
      ORDER BY xp DESC, u.streak DESC
      LIMIT ?
    `;
    rows = db.prepare(sql).all(...(pairId ? [pairId, limit] : [limit]));
  }

  let myRank = null;
  const myEntry = rows.find(r => r._uid === req.user.id);

  if (!myEntry) {
    if (period === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const myXp = db.prepare(`
        SELECT COALESCE(SUM(xp_earned), 0) AS xp FROM user_progress
        WHERE user_id = ? AND last_played >= ?
        ${pairId ? 'AND pair_id = ?' : ''}
      `).get(...(pairId ? [req.user.id, weekAgo, pairId] : [req.user.id, weekAgo]));

      const rank = db.prepare(`
        SELECT COUNT(*) + 1 AS rank FROM users u
        LEFT JOIN (
          SELECT user_id, SUM(xp_earned) AS wXp FROM user_progress
          WHERE last_played >= ? ${pairId ? 'AND pair_id = ?' : ''}
          GROUP BY user_id
        ) w ON w.user_id = u.id
        WHERE u.role != 'admin' AND COALESCE(w.wXp, 0) > ?
      `).get(...(pairId ? [weekAgo, pairId, myXp.xp] : [weekAgo, myXp.xp]));

      myRank = { id: req.user.id, name: req.user.name, xp: myXp.xp, rank: rank.rank, isMe: true };
    } else {
      const me   = db.prepare('SELECT total_xp, streak, level FROM users WHERE id = ?').get(req.user.id);
      const rank = db.prepare(`SELECT COUNT(*) + 1 AS rank FROM users WHERE role != 'admin' AND total_xp > ?`).get(me.total_xp);
      myRank = { id: req.user.id, name: req.user.name, xp: me.total_xp, streak: me.streak, level: me.level, rank: rank.rank, isMe: true };
    }
  }

  res.json({
    period,
    pair_id:     pairId,
    entries:     rows.map((r, i) => { const { _uid, ...pub } = r; return { ...pub, rank: i + 1, isMe: _uid === req.user.id }; }),
    my_rank:     myEntry ? null : myRank,
    total_users: db.prepare("SELECT COUNT(*) n FROM users WHERE role != 'admin'").get().n,
  });
}));

router.get('/courses', auth, wrap((_req, res) => {
  res.json(getDB().prepare(`
    SELECT id, from_name, from_flag, name FROM language_pairs
    WHERE status != 'draft' ORDER BY sort_order
  `).all());
}));

module.exports = router;
