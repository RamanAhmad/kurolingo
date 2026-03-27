'use strict';
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const morgan    = require('morgan');
const { initDB } = require('./db');
const helmet    = require('helmet');
const { loginLimiter, apiLimiter, uploadLimiter } = require('./limiters');

const REQUIRED_IN_PROD = ['JWT_SECRET'];
const isDev = process.env.NODE_ENV !== 'production';

if (!isDev) {
  const missing = REQUIRED_IN_PROD.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌  Fehlende Umgebungsvariablen: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'change-this-in-production'
    || process.env.JWT_SECRET === 'change-this-in-production-use-64-random-hex-chars'
    || process.env.JWT_SECRET.startsWith('change-this')
    || process.env.JWT_SECRET.length < 32) {
    console.error('❌  JWT_SECRET ist unsicher (Standardwert oder zu kurz).');
    process.exit(1);
  }
}

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet({ contentSecurityPolicy: false }));

const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');

const trustProxy = process.env.TRUST_PROXY != null
  ? (process.env.TRUST_PROXY === 'false' ? false : Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)
  : (isDev ? false : 1);
if (trustProxy !== false) app.set('trust proxy', trustProxy);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('X-XSS-Protection',          '1; mode=block');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  if (!isDev) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: blob:; " +
      "media-src 'self' blob:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none';"
    );
  }
  next();
});

app.use(morgan(isDev ? 'dev' : 'combined'));

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const fs = require('fs');
const serveFrontend = !isDev && fs.existsSync(FRONTEND_DIST);
if (serveFrontend) {
  app.use(express.static(FRONTEND_DIST));
}

app.use('/api/auth',        apiLimiter,    require('./routes/auth'));
app.use('/api/courses',     apiLimiter,    require('./routes/courses'));
app.use('/api/units',       apiLimiter,    require('./routes/units'));
app.use('/api/lessons',     apiLimiter,    require('./routes/lessons'));
app.use('/api/exercises',   apiLimiter,    require('./routes/exercises'));
app.use('/api/vocab',       apiLimiter,    require('./routes/vocab'));
app.use('/api/progress',    apiLimiter,    require('./routes/progress'));
app.use('/api/leaderboard', apiLimiter,    require('./routes/leaderboard'));
app.use('/api/shop',        apiLimiter,    require('./routes/shop'));
app.use('/api/kurdistan',   apiLimiter,    require('./routes/kurdistan'));
app.use('/api/media',       uploadLimiter, require('./routes/media'));
app.use('/api/admin',       apiLimiter,    require('./routes/admin'));

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, env: process.env.NODE_ENV, time: new Date().toISOString() })
);

if (serveFrontend) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint nicht gefunden' });
  }
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.status || 500, err.message, isDev ? err.stack : '');
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Interner Serverfehler',
  });
});

// ── Start: erst DB, dann Seed-Check, dann Server ─────────────────────────────
initDB()
  .then(async () => {
    const { getDB }   = require('./db');
    const { seedDB }  = require('./seed');
    const db          = getDB();
    const row         = db.prepare('SELECT COUNT(*) AS n FROM language_pairs').get();
    if (!row || row.n === 0) {
      console.log('📦  Datenbank leer — lade Kursdaten (Seed)…');
      await seedDB();
    }
  })
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🦅  Kurdolingo API  →  http://localhost:${PORT}`);
      console.log(`   Health          →  http://localhost:${PORT}/api/health`);
      console.log(`   Frontend        →  ${serveFrontend ? FRONTEND_DIST : 'Vite dev server'}`);
      console.log(`   NODE_ENV        →  ${process.env.NODE_ENV}`);
      console.log(`   Trust proxy     →  ${trustProxy === false ? 'disabled' : trustProxy}\n`);
    });
  })
  .catch(err => {
    console.error('❌ Datenbankfehler beim Start:', err);
    process.exit(1);
  });
