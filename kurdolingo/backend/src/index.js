'use strict';
require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const morgan    = require('morgan');
const { initDB } = require('./db');
const helmet    = require('helmet');
const { loginLimiter, apiLimiter, uploadLimiter } = require('./limiters');

// ── Startup env-var validation ────────────────────────────────────────────────
// Fail fast: better to crash on boot than silently run insecurely.
const REQUIRED_IN_PROD = ['JWT_SECRET'];
const isDev = process.env.NODE_ENV !== 'production';

if (!isDev) {
  const missing = REQUIRED_IN_PROD.filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`❌  Fehlende Umgebungsvariablen: ${missing.join(', ')}`);
    console.error('   Setze sie in der .env-Datei oder als Systemvariablen.');
    process.exit(1);
  }
  if (process.env.JWT_SECRET === 'change-this-in-production') {
    console.error('❌  JWT_SECRET ist noch der Standard-Beispielwert.');
    console.error('   Generiere einen sicheren Wert: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
}

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Helmet: vollständige Security-Header (1 Zeile statt 10 manuelle) ──────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP wird manuell gesetzt

// Path to built frontend — only used in production
const FRONTEND_DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');

// ── Trust proxy ────────────────────────────────────────────────────────────────
const trustProxy = process.env.TRUST_PROXY != null
  ? (process.env.TRUST_PROXY === 'false' ? false : Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)
  : (isDev ? false : 1);
if (trustProxy !== false) app.set('trust proxy', trustProxy);

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options',    'nosniff');
  res.setHeader('X-Frame-Options',           'DENY');
  res.setHeader('X-XSS-Protection',          '1; mode=block');
  res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
  // HSTS: tell browsers to always use HTTPS for the next year
  if (!isDev) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Content-Security-Policy — tight in prod, relaxed in dev (no eval block)
  if (!isDev) {
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

// ── Request logging ───────────────────────────────────────────────────────────
app.use(morgan(isDev ? 'dev' : 'combined'));

// ── CORS ──────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// ── Body parsing ──────────────────────────────────────────────────────────────
// 100kb is plenty for lesson answers, course data, etc.
// Multer handles multipart (file uploads) separately with its own limits.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// ── Static uploads ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Serve built frontend in production ────────────────────────────────────────
// In production, the backend serves the Vite build output.
// In dev, Vite's own dev server handles the frontend (port 3000).
const fs = require('fs');
const serveFrontend = !isDev && fs.existsSync(FRONTEND_DIST);
if (serveFrontend) {
  app.use(express.static(FRONTEND_DIST));
}

// ── API Routes ─────────────────────────────────────────────────────────────────
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

// ── SPA Fallback ──────────────────────────────────────────────────────────────
// CRITICAL: Every non-API route must return index.html so that React Router
// can handle client-side navigation. Without this:
//   - Direct URL access (kurdolingo.de/lesson/l01) → 404
//   - Browser refresh on any page other than / → 404
//   - Shared links → 404
//
// This must come AFTER all /api/* routes and BEFORE the generic 404 handler.
if (serveFrontend) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ── 404 (API only) ────────────────────────────────────────────────────────────
app.use((req, res) => {
  // Only reaches here in dev (no frontend dist) or for unknown /api/ routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint nicht gefunden' });
  }
  // In dev: React Router is handled by Vite dev server
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.status || 500, err.message, isDev ? err.stack : '');
  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Interner Serverfehler',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🦅  Kurdolingo API  →  http://localhost:${PORT}`);
    console.log(`   Health          →  http://localhost:${PORT}/api/health`);
    console.log(`   Frontend        →  ${serveFrontend ? FRONTEND_DIST : 'Vite dev server (Port 3000)'}`);
    console.log(`   Rate limiting   →  ${isDev ? 'OFF (dev mode)' : 'ON'}`);
    console.log(`   Trust proxy     →  ${trustProxy === false ? 'disabled (dev)' : trustProxy}`);
    console.log(`   HSTS            →  ${isDev ? 'OFF (dev)' : 'ON'}\n`);
  });
}).catch(err => {
  console.error('❌ Datenbankfehler beim Start:', err);
  process.exit(1);
});
