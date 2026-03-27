'use strict';
const { v4: uuid } = require('uuid');
const router = require('express').Router();
const { getDB, saveToDisk } = require('../db');
const { auth, adminOnly } = require('../middleware/auth');

// ── Catalogue ─────────────────────────────────────────────────────────────────
const ITEMS = {
  heart:      { id:'heart',      icon:'❤️',     name:'Extra Herz',     desc:'+1 Herz sofort',              price:100, category:'instant', durationHours:0   },
  heart_pack: { id:'heart_pack', icon:'❤️‍🔥',    name:'Herz-Paket',     desc:'Alle 5 Herzen auffüllen',     price:350, category:'instant', durationHours:0   },
  freeze:     { id:'freeze',     icon:'🧊',      name:'Streak Freeze',  desc:'Streak für 1 Tag schützen',   price:200, category:'timed',   durationHours:24  },
  xp_boost:   { id:'xp_boost',  icon:'⚡',      name:'XP-Boost',       desc:'2× XP für 30 Minuten',        price:150, category:'timed',   durationHours:0.5 },
  unlimited:  { id:'unlimited',  icon:'👑',      name:'Kein Limit',     desc:'Unbegrenzte Herzen 7 Tage',   price:650, category:'timed',   durationHours:168 },
};

// ── Helpers (exported for use in other routes) ────────────────────────────────
function ensureTable(db) {
  // Robuste Einzelstatements — jeder Fehler wird separat abgefangen
  const stmts = [
    `CREATE TABLE IF NOT EXISTS shop_purchases (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      item_type TEXT NOT NULL, gems_spent INTEGER NOT NULL DEFAULT 0,
      active_until TEXT, purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shop_user ON shop_purchases(user_id, item_type)`,
    `CREATE TABLE IF NOT EXISTS exercise_xp_log (
      user_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
      awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, exercise_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_xp_log_user ON exercise_xp_log(user_id)`,
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];
  for (const sql of stmts) {
    try { db.prepare(sql).run(); } catch (_) {
      try { db.exec(sql); } catch (__) {}
    }
  }
}

function getActivePurchases(db, userId) {
  ensureTable(db);
  const now = new Date().toISOString();
  return db.prepare(
    `SELECT * FROM shop_purchases WHERE user_id=? AND (active_until IS NULL OR active_until>?) ORDER BY purchased_at DESC`
  ).all(userId, now);
}

function isActive(purchases, itemType) {
  const now = new Date().toISOString();
  return purchases.some(p => p.item_type === itemType && (!p.active_until || p.active_until > now));
}

// ── GET /api/shop ─────────────────────────────────────────────────────────────
router.get('/', auth, (req, res) => {
  try {
    const db   = getDB();
    const user = db.prepare('SELECT gems, hearts FROM users WHERE id=?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden' });

    const purchases = getActivePurchases(db, req.user.id);

    const items = Object.values(ITEMS).map(item => {
      const active      = isActive(purchases, item.id);
      const activeEntry = purchases.find(p => p.item_type === item.id && p.active_until);
      return {
        ...item,
        active,
        active_until:   activeEntry ? activeEntry.active_until : null,
        can_afford:     user.gems >= item.price,
        already_active: active && item.category === 'timed',
      };
    });

    res.json({ items, gems: user.gems, hearts: user.hearts });
  } catch (err) {
    console.error('Shop GET error:', err.message);
    res.status(500).json({ error: 'Shop konnte nicht geladen werden: ' + err.message });
  }
});

// ── POST /api/shop/buy ────────────────────────────────────────────────────────
router.post('/buy', auth, (req, res) => {
  try {
    const { item_id } = req.body;
    const item = ITEMS[item_id];
    if (!item) return res.status(400).json({ error: 'Unbekanntes Item: ' + item_id });

    const db   = getDB();
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden' });
    if (user.gems < item.price)
      return res.status(400).json({ error: `Nicht genug Gems. Du hast ${user.gems}, brauchst ${item.price}.` });

    const purchases = getActivePurchases(db, req.user.id);

    if (item.category === 'timed' && isActive(purchases, item.id))
      return res.status(400).json({ error: `${item.name} ist bereits aktiv.` });
    if (item.id === 'heart' && user.hearts >= 5)
      return res.status(400).json({ error: 'Deine Herzen sind bereits voll.' });

    const activeUntil = item.durationHours > 0
      ? new Date(Date.now() + item.durationHours * 3600000).toISOString()
      : null;

    db.prepare('UPDATE users SET gems=gems-? WHERE id=?').run(item.price, req.user.id);

    if (item.id === 'heart')      db.prepare('UPDATE users SET hearts=MIN(5,hearts+1) WHERE id=?').run(req.user.id);
    if (item.id === 'heart_pack') db.prepare('UPDATE users SET hearts=5 WHERE id=?').run(req.user.id);
    if (item.id === 'unlimited')  db.prepare('UPDATE users SET hearts=5 WHERE id=?').run(req.user.id);

    db.prepare(
      `INSERT INTO shop_purchases (id,user_id,item_type,gems_spent,active_until) VALUES (?,?,?,?,?)`
    ).run(uuid(), req.user.id, item.id, item.price, activeUntil);

    saveToDisk();

    const updated = db.prepare('SELECT gems, hearts FROM users WHERE id=?').get(req.user.id);
    res.json({
      ok: true, item, active_until: activeUntil,
      gems: updated.gems, hearts: updated.hearts,
      message: buildMsg(item),
    });
  } catch (err) {
    console.error('Shop BUY error:', err.message);
    res.status(500).json({ error: 'Kauf fehlgeschlagen: ' + err.message });
  }
});


// ── GET /api/shop/diag — Diagnose welche Tabellen existieren ─────────────────
router.get('/diag', adminOnly, (req, res) => {
  try {
    const db = getDB();
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();
    const tableNames = tables.map(t => t.name);
    const required = ['users','shop_purchases','exercise_xp_log','password_reset_tokens',
                      'language_pairs','units','lessons','exercises'];
    const missing  = required.filter(t => !tableNames.includes(t));
    res.json({ tables: tableNames, missing, ok: missing.length === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/shop/active ──────────────────────────────────────────────────────
router.get('/active', auth, (req, res) => {
  try {
    const db        = getDB();
    const purchases = getActivePurchases(db, req.user.id);
    res.json({
      xp_boost:  isActive(purchases, 'xp_boost'),
      freeze:    isActive(purchases, 'freeze'),
      unlimited: isActive(purchases, 'unlimited'),
      purchases: purchases.map(p => ({
        item_type: p.item_type, active_until: p.active_until, purchased_at: p.purchased_at,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function buildMsg(item) {
  const msgs = {
    heart:      '❤️ Herz gekauft!',
    heart_pack: '❤️ Alle Herzen aufgefüllt!',
    freeze:     '🧊 Streak Freeze aktiv – dein Streak ist geschützt!',
    xp_boost:   '⚡ XP-Boost aktiv – 2× XP für 30 Minuten!',
    unlimited:  '👑 Kein Limit! Unbegrenzte Herzen für 7 Tage!',
  };
  return msgs[item.id] || `${item.icon} ${item.name} gekauft!`;
}

// Export router + helpers for other routes
module.exports            = router;
module.exports.getActivePurchases = getActivePurchases;
module.exports.isActive           = isActive;
