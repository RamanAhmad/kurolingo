'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { auth, sign, blacklistToken } = require('../middleware/auth');
const { loginLimiter, resetLimiter } = require('../limiters');
const { applyRegen, minutesUntilNextRegen } = require('../heartRegen');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

let _shop = null;
function getShop() { if (!_shop) _shop = require('./shop'); return _shop; }

const clean = ({ password, ...u }) => u;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateEmail(e) { return typeof e === 'string' && EMAIL_RE.test(e.trim()); }
function validatePassword(p) { return typeof p === 'string' && p.length >= 6; }
function validateName(n) { return typeof n === 'string' && n.trim().length >= 2 && n.trim().length <= 50; }

// ── POST /register ─────────────────────────────────────────────────────────
router.post('/register', loginLimiter, wrap(async (req, res) => {
  const { email, name, password } = req.body || {};
  if (!validateEmail(email))       return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });
  if (!validateName(name))         return res.status(400).json({ error: 'Name: 2–50 Zeichen erforderlich' });
  if (!validatePassword(password)) return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

  const db = getDB();
  const id = uuid();

  const hash = await bcrypt.hash(password, 10);
  try {
    db.prepare(`INSERT INTO users (id,email,name,password) VALUES (?,?,?,?)`)
      .run(id, email.toLowerCase().trim(), name.trim(), hash);
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'E-Mail bereits vergeben' });
    throw e;
  }
  saveToDisk();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  res.status(201).json({ token: sign(user), user: clean(user) });
}));

// ── POST /login ────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'E-Mail und Passwort erforderlich' });

  const db   = getDB();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(
    typeof email === 'string' ? email.toLowerCase().trim() : ''
  );

  const ok = user && await bcrypt.compare(password, user.password);
  if (!ok) {
    await bcrypt.hash('dummy', 10); // constant-time
    return res.status(401).json({ error: 'Falsche Anmeldedaten' });
  }

  // ── Streak logic with timezone tolerance ────────────────────────────────────
  // Problem: UTC date comparisons break for users in non-UTC timezones.
  // A user in Kurdistan (UTC+3) learning at 23:00 local time = 20:00 UTC.
  // On the server, their "today" is still yesterday. The next day at 01:00 local
  // = 22:00 UTC, which is also still "yesterday" on the server — streak breaks.
  //
  // Solution: use a 36-hour grace window instead of strict calendar-day comparison.
  //   - "Continuing streak": last login was between 1 and 36 hours ago
  //   - "Same session":      last login was within the last hour
  //   - "Streak broken":     last login was more than 36 hours ago
  //
  // This tolerates UTC+14 (easternmost timezone) without being abusable:
  // a user can only earn one streak increment per day because the same-session
  // window (1h) prevents rapid re-logins from double-counting.
  const now       = Date.now();
  const lastMs    = user.last_login ? new Date(user.last_login).getTime() : 0;
  const elapsedH  = (now - lastMs) / 3600000; // hours since last login

  let streak = user.streak;

  if (elapsedH < 1) {
    // Same session — no change
  } else if (elapsedH <= 36) {
    // Within the grace window — streak continues
    streak = (streak || 0) + 1;
  } else {
    // More than 36 hours — streak broken (unless freeze active)
    let freezeActive = false;
    try {
      const shop = getShop();
      const purchases = shop.getActivePurchases(db, user.id);
      freezeActive = shop.isActive(purchases, 'freeze');
    } catch (_) {}
    if (!freezeActive) streak = 1;
  }

  db.prepare('UPDATE users SET last_login=?, streak=? WHERE id=?')
    .run(new Date().toISOString(), streak, user.id);
  saveToDisk();

  applyRegen(db, user.id);

  const updated = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
  res.json({
    token: sign(updated),
    user: {
      ...clean(updated),
      next_regen_minutes: updated.hearts < 5 ? minutesUntilNextRegen(db, user.id) : 0,
    },
  });
}));


// ── POST /logout — Token blacklisten ─────────────────────────────────────────
router.post('/logout', auth, wrap((req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  blacklistToken(token);
  res.json({ ok: true });
}));

// ── GET /me ────────────────────────────────────────────────────────────────
router.get('/me', auth, wrap((req, res) => {
  const db = getDB();
  applyRegen(db, req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Nicht gefunden' });
  res.json({ ...clean(user), next_regen_minutes: user.hearts < 5 ? minutesUntilNextRegen(db, req.user.id) : 0 });
}));

// ── GET /profile-stats ─────────────────────────────────────────────────────
router.get('/profile-stats', auth, wrap((req, res) => {
  const db  = getDB();
  const uid = req.user.id;

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(uid);
  if (!user) return res.status(404).json({ error: 'Nicht gefunden' });

  const lessonStats = db.prepare(`
    SELECT
      COUNT(*)                                                      AS lessons_attempted,
      SUM(CASE WHEN completed=1 THEN 1 ELSE 0 END)                 AS lessons_completed,
      SUM(CASE WHEN completed=1 AND accuracy=1 THEN 1 ELSE 0 END)  AS lessons_perfect,
      SUM(xp_earned)                                               AS xp_from_lessons,
      AVG(CASE WHEN completed=1 THEN accuracy END)                 AS avg_accuracy,
      SUM(attempts)                                                AS total_attempts
    FROM user_progress WHERE user_id=?
  `).get(uid);

  const vocabLearned = db.prepare(`
    SELECT COUNT(DISTINCT v.id) AS count
    FROM user_progress up
    JOIN lessons l ON l.id = up.lesson_id
    JOIN vocabulary v ON v.unit_id = l.unit_id
    WHERE up.user_id=? AND up.completed=1
  `).get(uid);

  const activeCourses = db.prepare(`
    SELECT DISTINCT up.pair_id, lp.name, lp.from_flag, lp.from_name,
      COUNT(CASE WHEN up.completed=1 THEN 1 END) AS done,
      COUNT(*) AS total
    FROM user_progress up
    JOIN language_pairs lp ON lp.id=up.pair_id
    WHERE up.user_id=?
    GROUP BY up.pair_id
  `).all(uid);

  const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const activeDays = db.prepare(`
    SELECT DISTINCT substr(last_played, 1, 10) AS day
    FROM user_progress
    WHERE user_id=? AND completed=1 AND last_played >= ?
  `).all(uid, sevenDaysAgo).map(r => r.day);

  const last7days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    last7days.push({ date: d, active: activeDays.includes(d) });
  }

  const newLevel = Math.floor(Math.sqrt((user.total_xp || 0) / 50)) + 1;
  if (newLevel !== user.level) {
    db.prepare('UPDATE users SET level=? WHERE id=?').run(newLevel, uid);
    saveToDisk();
  }

  res.json({
    user:              { ...clean(user), level: newLevel },
    lessons_completed: lessonStats.lessons_completed || 0,
    lessons_attempted: lessonStats.lessons_attempted || 0,
    lessons_perfect:   lessonStats.lessons_perfect   || 0,
    vocab_learned:     vocabLearned.count || 0,
    avg_accuracy:      Math.round((lessonStats.avg_accuracy || 0) * 100),
    total_attempts:    lessonStats.total_attempts || 0,
    active_courses:    activeCourses,
    streak_history:    last7days,
    achievements:      computeAchievements({
      user, lessons_completed: lessonStats.lessons_completed || 0,
      lessons_perfect: lessonStats.lessons_perfect || 0,
      vocab_learned: vocabLearned.count || 0,
      avg_accuracy: lessonStats.avg_accuracy || 0,
      active_courses: activeCourses.length,
    }),
  });
}));

// ── PATCH /profile ─────────────────────────────────────────────────────────
router.patch('/profile', auth, wrap((req, res) => {
  const { name } = req.body || {};
  if (!validateName(name))
    return res.status(400).json({ error: 'Name: 2–50 Zeichen erforderlich' });
  const db = getDB();
  db.prepare('UPDATE users SET name=? WHERE id=?').run(name.trim(), req.user.id);
  saveToDisk();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  res.json(clean(user));
}));

// ── POST /buy-hearts ───────────────────────────────────────────────────────
router.post('/buy-hearts', auth, wrap((req, res) => {
  const db   = getDB();
  const user = db.prepare('SELECT gems,hearts FROM users WHERE id=?').get(req.user.id);
  if (!user)            return res.status(404).json({ error: 'Nicht gefunden' });
  if (user.hearts >= 5) return res.status(400).json({ error: 'Herzen bereits voll' });
  if (user.gems < 100)  return res.status(400).json({ error: 'Nicht genug Gems (100 benötigt)' });
  db.prepare('UPDATE users SET hearts=MIN(5,hearts+1), gems=gems-100 WHERE id=?').run(req.user.id);
  saveToDisk();
  res.json(db.prepare('SELECT hearts,gems FROM users WHERE id=?').get(req.user.id));
}));

// ── Achievements ───────────────────────────────────────────────────────────
function computeAchievements({ user, lessons_completed, lessons_perfect, vocab_learned, active_courses }) {
  const xp = user.total_xp || 0;
  return [
    { id:'first_lesson',   icon:'🌟', label:'Erste Lektion',    desc:'1 Lektion abgeschlossen',      earned: lessons_completed >= 1  },
    { id:'five_lessons',   icon:'📚', label:'Bücherwurm',        desc:'5 Lektionen abgeschlossen',    earned: lessons_completed >= 5  },
    { id:'twenty_lessons', icon:'🎓', label:'Fleißiger Schüler', desc:'20 Lektionen abgeschlossen',   earned: lessons_completed >= 20 },
    { id:'streak3',        icon:'🔥', label:'3 Tage Streak',     desc:'3 Tage hintereinander',        earned: (user.streak||0) >= 3   },
    { id:'streak7',        icon:'💪', label:'Woche durch',       desc:'7 Tage Streak',                earned: (user.streak||0) >= 7   },
    { id:'streak30',       icon:'🏆', label:'Monats-Champion',   desc:'30 Tage Streak',               earned: (user.streak||0) >= 30  },
    { id:'xp100',          icon:'⚡', label:'XP-Starter',        desc:'100 XP verdient',              earned: xp >= 100               },
    { id:'xp500',          icon:'⚡', label:'XP-Sammler',        desc:'500 XP verdient',              earned: xp >= 500               },
    { id:'xp1000',         icon:'💎', label:'XP-Meister',        desc:'1000 XP verdient',             earned: xp >= 1000              },
    { id:'vocab10',        icon:'💬', label:'Wort-Anfänger',     desc:'10 Vokabeln gelernt',          earned: vocab_learned >= 10     },
    { id:'vocab50',        icon:'📖', label:'Vokabel-Profi',     desc:'50 Vokabeln gelernt',          earned: vocab_learned >= 50     },
    { id:'perfect1',       icon:'🎯', label:'Perfektionist',     desc:'1 perfekte Lektion (100%)',     earned: lessons_perfect >= 1    },
    { id:'perfect5',       icon:'🥇', label:'Meister-Schüler',   desc:'5 perfekte Lektionen',         earned: lessons_perfect >= 5    },
    { id:'multilang',      icon:'🌍', label:'Polyglot',          desc:'2 Kurse aktiv',                earned: active_courses >= 2     },
  ];
}

// ── PATCH /password ───────────────────────────────────────────────────────────
router.patch('/password', auth, wrap(async (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'Aktuelles und neues Passwort erforderlich' });
  if (!validatePassword(new_password))
    return res.status(400).json({ error: 'Neues Passwort muss mindestens 6 Zeichen haben' });

  const db   = getDB();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden' });

  const ok = await bcrypt.compare(current_password, user.password);
  if (!ok) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

  const hash = await bcrypt.hash(new_password, 10);
  db.prepare("UPDATE users SET password=?, password_changed_at=datetime('now') WHERE id=?").run(hash, req.user.id);
  saveToDisk();
  res.json({ ok: true });
}));


// ── POST /forgot-password ──────────────────────────────────────────────────────
// Generates a secure reset token and (in production) sends it via e-mail.
// In development the token is logged to the console and returned in the response
// so you can test without an SMTP server.
//
// Security notes:
//   - Always returns 200 even if the email is not found (prevents user enumeration)
//   - Token is a 32-byte random hex string (256 bit entropy)
//   - Expires after 1 hour
//   - Old unused tokens for the same user are deleted first
router.post('/forgot-password', resetLimiter, wrap(async (req, res) => {
  const { email } = req.body || {};
  if (!validateEmail(email)) return res.status(400).json({ error: 'Ungültige E-Mail-Adresse' });

  const db   = getDB();
  const user = db.prepare('SELECT id, email, name FROM users WHERE email=?')
    .get(email.toLowerCase().trim());

  // Always respond the same way regardless of whether the user exists
  const genericOk = () => res.json({ ok: true, message: 'Falls die E-Mail existiert, wurde ein Link gesendet.' });

  if (!user) return genericOk();

  // Delete old (unused) tokens for this user before creating a new one
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id=? AND used=0').run(user.id);

  const crypto    = require('crypto');
  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // +1 hour

  db.prepare(
    'INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?,?,?)'
  ).run(token, user.id, expiresAt);
  saveToDisk();

  const resetUrl  = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  const isDev     = process.env.NODE_ENV !== 'production';

  // ── Send e-mail (production) ───────────────────────────────────────────────
  if (!isDev && process.env.SMTP_HOST) {
    try {
      let nodemailer;
      try { nodemailer = require('nodemailer'); } catch (_) {
        console.warn('[forgot-password] nodemailer nicht installiert — npm install nodemailer');
      }
      if (!nodemailer) throw new Error('nodemailer nicht verfügbar');
      const transporter = nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from:    process.env.SMTP_FROM || '"Kurdolingo" <noreply@kurdolingo.de>',
        to:      user.email,
        subject: 'Passwort zurücksetzen — Kurdolingo',
        text: [
          `Hallo ${user.name},`,
          '',
          'Du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt.',
          'Klicke auf den folgenden Link (gültig für 1 Stunde):',
          '',
          resetUrl,
          '',
          'Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail.',
          '',
          '— Dein Kurdolingo-Team',
        ].join('\n'),
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#0B9E88;margin-bottom:8px">Passwort zurücksetzen</h2>
            <p style="color:#2C3A4A">Hallo <strong>${user.name}</strong>,</p>
            <p style="color:#5E7082">du hast eine Anfrage zum Zurücksetzen deines Passworts gestellt. Der Link ist <strong>1 Stunde</strong> gültig.</p>
            <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:13px 28px;background:#0B9E88;color:#fff;text-decoration:none;border-radius:12px;font-weight:700">Passwort zurücksetzen</a>
            <p style="color:#8A8580;font-size:12px">Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>
            <hr style="border:none;border-top:1px solid #E0DDD8;margin:24px 0">
            <p style="color:#8A8580;font-size:12px">— Dein Kurdolingo-Team</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error('[forgot-password] E-Mail konnte nicht gesendet werden:', mailErr.message);
      // Don't expose the error to the client — the token is still valid
    }
  } else {
    // ── Dev mode: log token to console ──────────────────────────────────────
    console.log('\n🔑  [DEV] Passwort-Reset-Token für', user.email);
    console.log('   Token  :', token);
    console.log('   URL    :', resetUrl);
    console.log('   Läuft ab:', expiresAt, '\n');
  }

  // In dev we also return the token in the response so the UI can prefill it
  res.json({
    ok: true,
    message: 'Falls die E-Mail existiert, wurde ein Link gesendet.',
    ...(isDev ? { dev_token: token, dev_url: resetUrl } : {}),
  });
}));

// ── POST /reset-password ───────────────────────────────────────────────────────
// Validates the token and sets a new password.
//
// Security notes:
//   - Token must not be expired AND not already used
//   - Token is marked used=1 immediately (cannot be replayed)
//   - Old unused tokens for the same user are also cleaned up afterwards
router.post('/reset-password', resetLimiter, wrap(async (req, res) => {
  const { token, new_password } = req.body || {};
  if (!token || typeof token !== 'string')
    return res.status(400).json({ error: 'Token fehlt' });
  if (!validatePassword(new_password))
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen haben' });

  const db  = getDB();
  const row = db.prepare(
    "SELECT * FROM password_reset_tokens WHERE token=? AND used=0 AND expires_at > datetime('now')"
  ).get(token);

  if (!row) return res.status(400).json({ error: 'Token ungültig oder abgelaufen' });

  // Mark token as used FIRST — prevents race conditions / replay
  db.prepare('UPDATE password_reset_tokens SET used=1 WHERE token=?').run(token);

  const user = db.prepare('SELECT id FROM users WHERE id=?').get(row.user_id);
  if (!user) return res.status(404).json({ error: 'Nutzer nicht gefunden' });

  const hash = await bcrypt.hash(new_password, 10);
  db.prepare("UPDATE users SET password=?, password_changed_at=datetime('now') WHERE id=?").run(hash, row.user_id);

  // Clean up remaining unused tokens for this user
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id=? AND used=0').run(row.user_id);

  saveToDisk();

  console.log('[reset-password] Passwort zurückgesetzt für user_id:', row.user_id);

  res.json({ ok: true, message: 'Passwort erfolgreich zurückgesetzt. Du kannst dich jetzt anmelden.' });
}));

module.exports = router;
