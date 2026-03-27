#!/usr/bin/env node
'use strict';
/**
 * migrate.js — sql.js → better-sqlite3 Migration
 *
 * Hintergrund:
 *   sql.js und better-sqlite3 nutzen beide das identische SQLite3-Dateiformat.
 *   Eine von sql.js geschriebene .db-Datei ist ohne Konversion mit better-sqlite3
 *   lesbar — das ist ein Feature von SQLite, nicht von den Bibliotheken.
 *
 * Was dieses Script tut:
 *   1. Öffnet die bestehende kurdolingo.db mit better-sqlite3
 *   2. Prüft die Integrität (PRAGMA integrity_check)
 *   3. Führt alle ausstehenden Schema-Migrations aus (additive ALTER TABLE)
 *   4. Gibt einen Bericht aus
 *
 * Wann ausführen:
 *   - Einmalig nach dem Upgrade von sql.js auf better-sqlite3
 *   - Danach nie wieder nötig — initDB() führt Migrations automatisch aus
 *
 * Verwendung:
 *   cd backend
 *   npm install better-sqlite3
 *   node src/migrate.js
 */

const path = require('path');
const fs   = require('fs');

const DB_PATH = path.join(__dirname, '..', 'kurdolingo.db');

console.log('\n🔄  Kurdolingo DB Migration — sql.js → better-sqlite3\n');

// ── Voraussetzungen prüfen ────────────────────────────────────────────────
let Database;
try {
  Database = require('better-sqlite3');
} catch {
  console.error('❌  better-sqlite3 nicht installiert.');
  console.error('   Ausführen: cd backend && npm install better-sqlite3\n');
  process.exit(1);
}

if (!fs.existsSync(DB_PATH)) {
  console.log('ℹ️   Keine bestehende Datenbank gefunden unter:', DB_PATH);
  console.log('   Eine neue wird beim ersten Start automatisch erstellt.\n');
  console.log('✅  Migration nicht nötig — bereit für Neustart.\n');
  process.exit(0);
}

const size = fs.statSync(DB_PATH).size;
console.log(`📁  Gefundene Datenbank: ${DB_PATH} (${(size / 1024).toFixed(1)} KB)`);

// ── Backup erstellen ──────────────────────────────────────────────────────
const backupPath = DB_PATH + '.bak-' + Date.now();
fs.copyFileSync(DB_PATH, backupPath);
console.log(`💾  Backup erstellt: ${backupPath}`);

// ── Datenbank öffnen und prüfen ───────────────────────────────────────────
let db;
try {
  db = new Database(DB_PATH);
} catch (err) {
  console.error('\n❌  Datenbank konnte nicht geöffnet werden:', err.message);
  console.error('   Die Original-Datei wurde nicht verändert.\n');
  process.exit(1);
}

// Integrity check
console.log('\n🔍  Prüfe Datenbankintegrität…');
const integrity = db.pragma('integrity_check');
if (integrity[0]?.integrity_check !== 'ok') {
  console.error('❌  Integritätsprüfung fehlgeschlagen:', JSON.stringify(integrity));
  db.close();
  process.exit(1);
}
console.log('✅  Integrität OK');

// ── WAL aktivieren ────────────────────────────────────────────────────────
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
console.log('✅  WAL-Modus aktiviert');

// ── Migrations ausführen ──────────────────────────────────────────────────
console.log('\n🔧  Führe Schema-Migrations aus…');

const migrations = [
  { sql: `ALTER TABLE media_files ADD COLUMN label TEXT`,         name: 'media_files.label' },
  { sql: `ALTER TABLE media_files ADD COLUMN kurdish_text TEXT`,  name: 'media_files.kurdish_text' },
  { sql: `ALTER TABLE media_files ADD COLUMN duration_ms INTEGER`,name: 'media_files.duration_ms' },
  { sql: `ALTER TABLE users       ADD COLUMN last_heart_lost TEXT`,name: 'users.last_heart_lost' },
  {
    sql: `CREATE TABLE IF NOT EXISTS exercise_xp_log (
      user_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
      awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, exercise_id)
    )`,
    name: 'exercise_xp_log table',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_xp_log_user   ON exercise_xp_log(user_id)`,
    name: 'idx_xp_log_user',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_media_kurdish ON media_files(kurdish_text)`,
    name: 'idx_media_kurdish',
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS shop_purchases (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      item_type TEXT NOT NULL, gems_spent INTEGER NOT NULL DEFAULT 0,
      active_until TEXT, purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    name: 'shop_purchases table',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_shop_user ON shop_purchases(user_id, item_type)`,
    name: 'idx_shop_user',
  },
  // ── Passwort-Reset-Tokens ────────────────────────────────────────────────
  {
    sql: `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token      TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    name: 'password_reset_tokens table',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_prt_user ON password_reset_tokens(user_id)`,
    name: 'idx_prt_user',
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS user_vocab_progress (
      user_id   TEXT NOT NULL,
      vocab_id  TEXT NOT NULL,
      learned_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, vocab_id)
    )`,
    name: 'user_vocab_progress table',
  },
  {
    sql: `CREATE INDEX IF NOT EXISTS idx_uvp_user ON user_vocab_progress(user_id)`,
    name: 'idx_uvp_user',
  },
];

let applied = 0;
let skipped = 0;
for (const { sql, name } of migrations) {
  try {
    db.exec(sql);
    console.log(`   ✓  ${name}`);
    applied++;
  } catch (e) {
    // "duplicate column name" or "already exists" — expected for previously migrated DBs
    console.log(`   –  ${name} (bereits vorhanden)`);
    skipped++;
  }
}

// ── Statistik ausgeben ────────────────────────────────────────────────────
console.log('\n📊  Datenbankinhalt nach Migration:');
const tables = [
  'users', 'language_pairs', 'units', 'lessons',
  'exercises', 'vocabulary', 'user_progress', 'media_files',
  'shop_purchases', 'exercise_xp_log',
];
for (const t of tables) {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get();
    console.log(`   ${t.padEnd(22)} ${String(row.n).padStart(6)} Zeilen`);
  } catch {
    console.log(`   ${t.padEnd(22)}  (Tabelle fehlt)`);
  }
}

db.close();

console.log(`
✅  Migration abgeschlossen
   ${applied} Migration(en) angewendet, ${skipped} bereits vorhanden
   Backup liegt unter: ${backupPath}

🚀  Nächster Schritt: Backend neu starten
   npm run dev   (Entwicklung)
   npm start     (Produktion)
`);
