'use strict';
const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s && process.env.NODE_ENV === 'production')
    throw new Error('JWT_SECRET env variable must be set in production!');
  return s || 'kurdolingo-secret-dev-only-change-in-production';
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Kein Token' });
  try {
    const payload = jwt.verify(token, getSecret());

    // Token gegen Blacklist prüfen
    if (payload.jti) {
      try {
        const { getDB } = require('../db');
        const db  = getDB();
        const row = db.prepare('SELECT jti FROM token_blacklist WHERE jti=?').get(payload.jti);
        if (row) return res.status(401).json({ error: 'Token ungültig. Bitte erneut anmelden.' });

        // ── Token nach Passwortänderung invalidieren ──────────────────────
        // Wenn das Passwort nach dem Ausstellen des Tokens geändert wurde,
        // ist der Token ungültig. Verhindert, dass gestohlene Tokens nach
        // einem Passwortwechsel weiter funktionieren.
        if (payload.iat) {
          const user = db.prepare('SELECT password_changed_at FROM users WHERE id=?').get(payload.id);
          if (user?.password_changed_at) {
            const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
            if (payload.iat < changedAt) {
              return res.status(401).json({ error: 'Passwort wurde geändert. Bitte erneut anmelden.' });
            }
          }
        }
      } catch (_) { /* DB noch nicht bereit — ignorieren */ }
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiges Token' });
  }
}

function adminOnly(req, res, next) {
  auth(req, res, () => {
    if (req.user?.role !== 'admin')
      return res.status(403).json({ error: 'Admin erforderlich' });
    next();
  });
}

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role,
      jti: uuidv4() },   // Unique Token-ID für Blacklist
    getSecret(),
    { expiresIn: '7d' }
  );
}

function blacklistToken(token) {
  try {
    const payload = jwt.decode(token);
    if (!payload?.jti) return;
    const { getDB, saveToDisk } = require('../db');
    const db = getDB();
    const expiresAt = new Date((payload.exp || 0) * 1000).toISOString();
    db.prepare(
      'INSERT OR IGNORE INTO token_blacklist (jti,user_id,expires_at) VALUES (?,?,?)'
    ).run(payload.jti, payload.id, expiresAt);
    // Abgelaufene Tokens aufräumen (housekeeping)
    db.prepare("DELETE FROM token_blacklist WHERE expires_at < datetime('now')").run();
    saveToDisk();
  } catch (_) {}
}


function logAdminAction(db, adminUser, action, target = null, detail = null) {
  try {
    const { v4: uuid4 } = require('uuid');
    db.prepare(
      'INSERT INTO admin_log (id,admin_id,admin_name,action,target,detail) VALUES (?,?,?,?,?,?)'
    ).run(uuid4(), adminUser.id, adminUser.name, action, target, detail);
  } catch (_) {}
}

module.exports = { auth, adminOnly, sign, blacklistToken, logAdminAction };
