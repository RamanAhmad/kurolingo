'use strict';
/**
 * limiters.js — Shared rate-limit instances
 *
 * Extracted into their own module so that route files can import them
 * without creating a circular dependency with index.js.
 *
 * Limits (production):
 *   loginLimiter  — 10 attempts / 15 min / IP  (brute-force protection)
 *   apiLimiter    — 200 requests / 1 min / IP   (general abuse protection)
 *   uploadLimiter — 20 uploads  / 1 hr  / IP    (expensive disk+DB op)
 *
 * All limiters are no-ops in development (NODE_ENV !== 'production').
 */
const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';
const skipInDev = () => isDev;

// ── Login / Register — 10 per 15 min ─────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { error: 'Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: skipInDev,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen.' });
  },
});

// ── General API — 200 per minute ─────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      200,
  message:  { error: 'Zu viele Anfragen. Bitte kurz warten.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: skipInDev,
});

// ── Upload — 20 per hour ──────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      20,
  message:  { error: 'Upload-Limit erreicht. Bitte in einer Stunde erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: skipInDev,
});

// ── Password Reset — 5 per hour per IP ───────────────────────────────────────
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max:      5,
  message:  { error: 'Zu viele Reset-Anfragen. Bitte in einer Stunde erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: skipInDev,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Zu viele Reset-Anfragen. Bitte in einer Stunde erneut versuchen.' });
  },
});

// ── Chat — 10 Nachrichten pro Minute pro Nutzer ───────────────────────────────
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      10,
  message:  { error: 'Zu viele Nachrichten. Bitte kurz warten.' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: skipInDev,
  keyGenerator: (req) => req.user?.id || req.ip,  // per Nutzer, nicht per IP
  handler: (_req, res) => {
    res.status(429).json({ error: 'Zu viele Nachrichten. Bitte kurz warten.' });
  },
});

module.exports = { loginLimiter, apiLimiter, uploadLimiter, resetLimiter, chatLimiter };
