'use strict';
/**
 * db.js — Universelle SQLite-Datenbankschicht
 *
 * Lädt automatisch den besten verfügbaren SQLite-Treiber:
 *
 *   1. better-sqlite3  → bevorzugt (schnell, WAL, sofortiger Disk-Write)
 *                        Benötigt C++ Kompilierung — funktioniert auf Linux/Mac
 *                        und Windows mit Node 18/20/22 (LTS).
 *
 *   2. sql.js          → automatischer Fallback (reines JavaScript/WASM)
 *                        Funktioniert auf ALLEN Plattformen und Node-Versionen,
 *                        inkl. Node 24 auf Windows. Leicht langsamer.
 *
 * Öffentliche API (identisch für beide Treiber):
 *   getDB()       → DB-Instanz
 *   initDB()      → Promise<DB>
 *   saveToDisk()  → Disk-Flush (No-op bei better-sqlite3, aktiv bei sql.js)
 */
const path = require('path');
const fs   = require('fs');

const DB_PATH = path.join(__dirname, '..', 'kurdolingo.db');

let _db         = null;
let _sqlInst    = null;  // nur bei sql.js-Fallback belegt
let _dirty      = false; // nur bei sql.js relevant
let _usingSqlJs = false;

// ── sql.js Fallback-Klassen ────────────────────────────────────────────────
// Wrappen die sql.js API in die better-sqlite3-kompatible synchrone API.

class SqlJsStatement {
  constructor(sqlInst, sql) {
    this._sqlInst = sqlInst;
    this._sql     = sql;
  }
  _bind(params) {
    if (!params || params.length === 0) return [];
    return params.map(v => {
      if (v === undefined) return null;
      if (v === true)  return 1;
      if (v === false) return 0;
      return v;
    });
  }
  get(...params) {
    try {
      const stmt = this._sqlInst.prepare(this._sql);
      stmt.bind(this._bind(params));
      const found = stmt.step();
      const row   = found ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    } catch (e) { throw new Error(`SQL get: ${e.message} | ${this._sql}`); }
  }
  all(...params) {
    try {
      const stmt = this._sqlInst.prepare(this._sql);
      const rows = [];
      stmt.bind(this._bind(params));
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    } catch (e) { throw new Error(`SQL all: ${e.message} | ${this._sql}`); }
  }
  run(...params) {
    try {
      this._sqlInst.run(this._sql, this._bind(params));
      _dirty = true;
      return { changes: this._sqlInst.getRowsModified() };
    } catch (e) {
      if (e.message?.includes('UNIQUE')) {
        const err = new Error('UNIQUE constraint failed: ' + e.message);
        throw err;
      }
      throw new Error(`SQL run: ${e.message} | ${this._sql}`);
    }
  }
}

class SqlJsDB {
  constructor(sqlInst) { this._sqlInst = sqlInst; }
  prepare(sql) { return new SqlJsStatement(this._sqlInst, sql); }
  exec(sql) {
    // sql.js run() führt nur das ERSTE Statement aus bei Multi-Statement-Strings.
    // Wir splitten daher an Semikolons und führen jedes Statement einzeln aus.
    const stmts = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
    for (const stmt of stmts) {
      this._sqlInst.run(stmt + ';');
    }
    _dirty = true;
    return this;
  }
  pragma(p)    { try { this._sqlInst.run(`PRAGMA ${p}`); } catch {} return this; }
  transaction(fn) {
    return (...args) => {
      this._sqlInst.run('BEGIN');
      try {
        const r = fn(...args);
        this._sqlInst.run('COMMIT');
        _dirty = true;
        return r;
      } catch (e) {
        try { this._sqlInst.run('ROLLBACK'); } catch {}
        throw e;
      }
    };
  }
  backup() { return Promise.resolve(); } // No-op — sql.js hat kein .backup()
}

// ── saveToDisk ────────────────────────────────────────────────────────────
function saveToDisk() {
  if (!_usingSqlJs || !_sqlInst || !_dirty) return;
  try {
    const data = _sqlInst.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    _dirty = false;
  } catch (e) {
    console.error('[DB] Warnung — Speichern fehlgeschlagen:', e.message);
  }
}

// ── getDB ─────────────────────────────────────────────────────────────────
function getDB() {
  if (_db) return _db;
  throw new Error('DB nicht initialisiert — initDB() zuerst aufrufen');
}

// ── Schema & Migrations (geteilt zwischen beiden Treibern) ─────────────────
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
    streak INTEGER NOT NULL DEFAULT 0, last_login TEXT,
    total_xp INTEGER NOT NULL DEFAULT 0, gems INTEGER NOT NULL DEFAULT 100,
    hearts INTEGER NOT NULL DEFAULT 5, level INTEGER NOT NULL DEFAULT 1,
    last_heart_lost TEXT, password_changed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS language_pairs (
    id TEXT PRIMARY KEY, from_code TEXT NOT NULL, from_name TEXT NOT NULL,
    from_flag TEXT NOT NULL DEFAULT '?', from_tts TEXT NOT NULL DEFAULT 'de-DE',
    dialect TEXT NOT NULL DEFAULT 'Kurmanji', name TEXT NOT NULL,
    description TEXT, status TEXT NOT NULL DEFAULT 'draft',
    difficulty TEXT NOT NULL DEFAULT 'A1', sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    pair_id TEXT NOT NULL REFERENCES language_pairs(id) ON DELETE CASCADE,
    title_ku TEXT NOT NULL, title_tr TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '?', color TEXT NOT NULL DEFAULT '#0B9E88',
    sort_order INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS lessons (
    id TEXT PRIMARY KEY,
    unit_id TEXT NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    pair_id TEXT NOT NULL REFERENCES language_pairs(id) ON DELETE CASCADE,
    title_ku TEXT NOT NULL, title_tr TEXT NOT NULL,
    emoji TEXT NOT NULL DEFAULT '?', difficulty TEXT NOT NULL DEFAULT 'A1',
    tip TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    type TEXT NOT NULL, question TEXT NOT NULL, answer TEXT NOT NULL,
    options TEXT, pairs TEXT, words TEXT, hint TEXT, tts_text TEXT,
    audio_file TEXT, image_file TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS vocabulary (
    id TEXT PRIMARY KEY,
    pair_id TEXT NOT NULL REFERENCES language_pairs(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES units(id),
    kurdish TEXT NOT NULL, translation TEXT NOT NULL, pronunciation TEXT,
    word_type TEXT DEFAULT 'noun', difficulty TEXT DEFAULT 'A1',
    audio_file TEXT, image_file TEXT, example_ku TEXT, example_tr TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS user_progress (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    pair_id TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0, accuracy REAL NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0, last_played TEXT,
    UNIQUE(user_id, lesson_id)
  );
  CREATE TABLE IF NOT EXISTS media_files (
    id TEXT PRIMARY KEY, filename TEXT NOT NULL, original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL, file_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL DEFAULT 0, pair_id TEXT,
    label TEXT, kurdish_text TEXT, duration_ms INTEGER,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS shop_purchases (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    item_type TEXT NOT NULL, gems_spent INTEGER NOT NULL DEFAULT 0,
    active_until TEXT, purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS exercise_xp_log (
    user_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
    awarded_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, exercise_id)
  );
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used       INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_shop_user      ON shop_purchases(user_id, item_type);
  CREATE INDEX IF NOT EXISTS idx_xp_log_user    ON exercise_xp_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_prt_user       ON password_reset_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_units_pair     ON units(pair_id);
  CREATE INDEX IF NOT EXISTS idx_lessons_unit   ON lessons(unit_id);
  CREATE INDEX IF NOT EXISTS idx_lessons_pair   ON lessons(pair_id);
  CREATE INDEX IF NOT EXISTS idx_exercises_less ON exercises(lesson_id);




  -- ── Admin-Aktions-Log ────────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS admin_log (
    id         TEXT PRIMARY KEY,
    admin_id   TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action     TEXT NOT NULL,
    target     TEXT,
    detail     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_admin_log_time ON admin_log(created_at);
  -- ── JWT Token Blacklist (für Logout + Passwortänderung) ──────────────────────
  CREATE TABLE IF NOT EXISTS token_blacklist (
    jti         TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    blacklisted_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_blacklist_exp ON token_blacklist(expires_at);
  -- ── Spaced Repetition (SM-2 Algorithmus) ────────────────────────────────────
  -- next_review: wann die Übung wieder gezeigt werden soll (ISO-Datum)
  -- interval:    aktuelles Wiederholungsintervall in Tagen
  -- ease:        Leichtigkeitsfaktor (2.5 = normal, sinkt bei falschen Antworten)
  -- repetitions: wie oft korrekt beantwortet
  CREATE TABLE IF NOT EXISTS sr_cards (
    id           TEXT PRIMARY KEY,
    user_id      TEXT NOT NULL,
    exercise_id  TEXT NOT NULL,
    next_review  TEXT NOT NULL DEFAULT (date('now')),
    interval     INTEGER NOT NULL DEFAULT 1,
    ease         REAL NOT NULL DEFAULT 2.5,
    repetitions  INTEGER NOT NULL DEFAULT 0,
    last_quality INTEGER,
    updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, exercise_id)
  );
  CREATE INDEX IF NOT EXISTS idx_sr_user_date ON sr_cards(user_id, next_review);
  -- ── Kurdistan-Sektion ──────────────────────────────────────────────────────
  CREATE TABLE IF NOT EXISTS kd_celebrities (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    image_url   TEXT,
    birth_year  INTEGER,
    category    TEXT NOT NULL DEFAULT 'kultur',
    description TEXT NOT NULL,
    fun_fact    TEXT,
    options     TEXT NOT NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS kd_stories (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'märchen',
    read_time   INTEGER NOT NULL DEFAULT 3,
    audio_file  TEXT,
    active      INTEGER NOT NULL DEFAULT 1,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS kd_events (
    id          TEXT PRIMARY KEY,
    day         INTEGER NOT NULL,
    month       INTEGER NOT NULL,
    year        INTEGER,
    title       TEXT NOT NULL,
    description TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT 'geschichte',
    active      INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS kd_quiz_results (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL,
    celebrity_id  TEXT NOT NULL,
    correct       INTEGER NOT NULL DEFAULT 0,
    answered_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_kd_events_date   ON kd_events(month, day);

  CREATE TABLE IF NOT EXISTS kd_community (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    user_name  TEXT NOT NULL,
    message    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS kd_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_kd_community_user ON kd_community(user_id);
  CREATE INDEX IF NOT EXISTS idx_kd_community_time ON kd_community(created_at);
  CREATE INDEX IF NOT EXISTS idx_kd_quiz_user     ON kd_quiz_results(user_id);
  CREATE INDEX IF NOT EXISTS idx_vocab_pair     ON vocabulary(pair_id);
  CREATE INDEX IF NOT EXISTS idx_prog_user      ON user_progress(user_id);
  CREATE TABLE IF NOT EXISTS user_vocab_progress (
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vocab_id  TEXT NOT NULL REFERENCES vocabulary(id) ON DELETE CASCADE,
    learned_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, vocab_id)
  );
  CREATE INDEX IF NOT EXISTS idx_uvp_user ON user_vocab_progress(user_id);
`;

const MIGRATIONS = [
  `ALTER TABLE media_files ADD COLUMN label TEXT`,
  `ALTER TABLE media_files ADD COLUMN kurdish_text TEXT`,
  `ALTER TABLE media_files ADD COLUMN duration_ms INTEGER`,
  `ALTER TABLE users       ADD COLUMN last_heart_lost TEXT`,
  `CREATE INDEX IF NOT EXISTS idx_media_kurdish ON media_files(kurdish_text)`,
  `ALTER TABLE kd_stories  ADD COLUMN audio_file TEXT`,
  // ── Community v2: reply_to, edited, pinned ─────────────────────────────
  `ALTER TABLE kd_community ADD COLUMN reply_to    TEXT`,
  `ALTER TABLE kd_community ADD COLUMN edited      INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kd_community ADD COLUMN pinned      INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE kd_community ADD COLUMN edited_at   TEXT`,
  // ── Community reactions ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS kd_community_reactions (
    id         TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id    TEXT NOT NULL,
    emoji      TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(message_id, user_id, emoji)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_kd_react_msg  ON kd_community_reactions(message_id)`,
  `CREATE INDEX IF NOT EXISTS idx_kd_react_user ON kd_community_reactions(user_id)`,
  // ── Community reports ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS kd_community_reports (
    id          TEXT PRIMARY KEY,
    message_id  TEXT NOT NULL,
    reporter_id TEXT NOT NULL,
    reason      TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    resolved    INTEGER NOT NULL DEFAULT 0,
    UNIQUE(message_id, reporter_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_kd_report_msg ON kd_community_reports(message_id)`,
];

function applySchemaAndMigrations(db) {
  db.exec(SCHEMA);
  for (const sql of MIGRATIONS) {
    try { db.exec(sql); } catch (_) {}
  }
}

// ── initDB ─────────────────────────────────────────────────────────────────
async function initDB() {
  if (_db) return _db;

  // ── Versuch 1: better-sqlite3 (nativ, schnell) ────────────────────────────
  try {
    const Database = require('better-sqlite3');
    // Auf Windows mit Node 24 lädt require() ohne Fehler, aber new Database()
    // wirft "Could not locate the bindings file" — deshalb testen wir hier.
    const bsdb = new Database(DB_PATH);
    bsdb.pragma('journal_mode = WAL');
    bsdb.pragma('foreign_keys = ON');
    bsdb.pragma('synchronous = NORMAL');
    bsdb.pragma('journal_size_limit = 67108864');
    applySchemaAndMigrations(bsdb);
    _db = bsdb;
    console.log('✓  Datenbank bereit (better-sqlite3, WAL-Modus):', DB_PATH);
    return _db;
  } catch (e) {
    // Jeden Fehler von better-sqlite3 beim Laden als "fehlende Binaries" behandeln,
    // AUSSER es ist ein echter DB-Fehler (Disk voll, korrupte Datei etc.)
    const isBinaryMissing =
      e.code === 'MODULE_NOT_FOUND' ||
      (e.message && (
        e.message.includes('locate the bindings file') ||
        e.message.includes('was compiled against a different') ||
        e.message.includes('NODE_MODULE_VERSION') ||
        e.message.includes('The specified module could not be found') ||
        e.message.includes('invalid ELF') ||
        e.message.includes('better_sqlite3.node') ||
        e.message.includes('node_modules/better-sqlite3')
      ));

    if (!isBinaryMissing) throw e; // echter DB-Fehler — weiterwerfen

    console.log('⚠  better-sqlite3 Binaries nicht verfügbar → sql.js Fallback');
    console.log('   (Node ' + process.version + ' auf ' + process.platform + ')');
  }

  // ── Versuch 2: sql.js Fallback (WASM, plattformunabhängig) ───────────────
  try {
    console.log('Lade sql.js (WASM-SQLite, kein Kompilieren nötig)...');
    const initSqlJs = require('sql.js');
    const SQL       = await initSqlJs();

    _usingSqlJs = true;

    if (fs.existsSync(DB_PATH)) {
      console.log('   Lade bestehende Datenbank:', DB_PATH);
      _sqlInst = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      console.log('   Erstelle neue Datenbank:', DB_PATH);
      _sqlInst = new SQL.Database();
    }

    _db = new SqlJsDB(_sqlInst);
    _db.pragma('foreign_keys = ON');
    applySchemaAndMigrations(_db);

    // Periodischer Flush (sql.js lebt im RAM)
    setInterval(saveToDisk, 2000).unref();
    process.on('exit',    saveToDisk);
    process.on('SIGINT',  () => { saveToDisk(); process.exit(0); });
    process.on('SIGTERM', () => { saveToDisk(); process.exit(0); });
    saveToDisk(); // Einmal sofort speichern

    console.log('✓  Datenbank bereit (sql.js WASM-Fallback)');
    console.log('   Hinweis: Für bessere Performance installiere Node.js LTS (22.x)');
    console.log('   https://nodejs.org/de');
    return _db;
  } catch (e2) {
    console.error('❌  Kein SQLite-Treiber verfügbar.');
    console.error('   better-sqlite3:', 'fehlende Binaries für diese Node-Version');
    console.error('   sql.js:', e2.message);
    console.error('\n   Lösung: cd backend && npm install');
    throw e2;
  }
}

// ── Auto-Seed: Demo & Admin anlegen wenn DB komplett leer ─────────────────────
// Läuft nach initDB() — prüft ob users-Tabelle leer ist und legt
// Demo/Admin-User an damit der Login-Hinweis im Dev-Modus sofort funktioniert.

// Auto-Seed: Komplette Demo-Daten beim ersten Start automatisch laden
async function autoSeedIfEmpty() {
  try {
    const db  = getDB();
    const row = db.prepare('SELECT COUNT(*) AS n FROM users').get();
    if (row && row.n > 0) return; // Bereits Daten vorhanden

    console.log('\n📦  Datenbank leer — lade vollständige Demo-Daten…');
    const seedModule = require('./seed');
    await seedModule.run();
    console.log('✓  Demo-Daten vollständig geladen\n');
  } catch (err) {
    console.warn('[autoSeed] Fehler:', err.message);
  }
}
const _origInitDB = initDB;
async function initDBWithSeed() {
  const db = await _origInitDB();
  await autoSeedIfEmpty();
  return db;
}

module.exports = { getDB, initDB: initDBWithSeed, saveToDisk };
