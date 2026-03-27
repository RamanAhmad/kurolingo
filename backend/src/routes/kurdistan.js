'use strict';
const router    = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { auth, adminOnly, logAdminAction } = require('../middleware/auth');
const { chatLimiter } = require('../limiters');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

// ── Seed-Daten (werden beim ersten Aufruf eingefügt wenn leer) ────────────────
const SEED_CELEBRITIES = [
  {
    id: 'cel-01', name: 'Newroz Şêxo', birth_year: 1942, category: 'musik',
    image_url: '',
    description: 'Newroz Şêxo war eine der bedeutendsten kurdischen Sängerinnen des 20. Jahrhunderts. Ihre Stimme prägte Generationen und gilt als Stimme des kurdischen Volkes.',
    fun_fact: 'Sie wurde als "Königin des kurdischen Liedes" bezeichnet.',
    options: JSON.stringify(['Newroz Şêxo', 'Şivan Perwer', 'Hasan Cizîrî', 'Cahit Sıtkı Tarancı']),
    sort_order: 1,
  },
  {
    id: 'cel-02', name: 'Şivan Perwer', birth_year: 1955, category: 'musik',
    image_url: '',
    description: 'Şivan Perwer ist der bekannteste kurdische Sänger weltweit. Seine Lieder wurden zum Symbol des kurdischen Widerstands und der Identität.',
    fun_fact: 'Er lebte jahrzehntelang im Exil in Europa und sang trotzdem auf Kurdisch.',
    options: JSON.stringify(['Masoud Barzani', 'Şivan Perwer', 'Ahmad Moftizadeh', 'Zinar Zebari']),
    sort_order: 2,
  },
  {
    id: 'cel-03', name: 'Kemal Burkay', birth_year: 1937, category: 'literatur',
    image_url: '',
    description: 'Kemal Burkay ist ein kurdischer Dichter, Schriftsteller und Politiker. Er gilt als einer der wichtigsten kurdischen Intellektuellen des 20. Jahrhunderts.',
    fun_fact: 'Seine Gedichte wurden in über 20 Sprachen übersetzt.',
    options: JSON.stringify(['Mehmed Uzun', 'Kemal Burkay', 'Cigerxwîn', 'Nali']),
    sort_order: 3,
  },
  {
    id: 'cel-04', name: 'Cigerxwîn', birth_year: 1903, category: 'literatur',
    image_url: '',
    description: 'Cigerxwîn (Şêxmus Hesen) war ein kurdischer Dichter aus Syrien. Sein Name bedeutet "blutende Seele" – ein Symbol für seine leidenschaftliche Poesie.',
    fun_fact: 'Er schrieb über 3.000 Gedichte in Kurmanji.',
    options: JSON.stringify(['Cigerxwîn', 'Nali', 'Haji Qadir Koyi', 'Piremêrd']),
    sort_order: 4,
  },
];

const SEED_STORIES = [
  {
    id: 'story-01', title: 'Der kluge Hase und der Löwe', category: 'märchen', read_time: 4,
    content: `Es war einmal in den Bergen Kurdistans ein Löwe, der jeden Tag ein Tier fraß. Die Tiere des Waldes kamen zusammen und beschlossen: "Wir schicken jeden Tag eines von uns freiwillig zum Löwen, damit er nicht alle tötet."

Als der Tag des Hasen gekommen war, ging er langsam zum Löwen. Der Löwe war wütend über die Verspätung. Der Hase sagte: "Verzeih mir, o mächtiger König! Ich wurde von einem anderen Löwen aufgehalten, der behauptet, der wahre König dieser Berge zu sein."

Der Löwe brüllte vor Wut: "Zeig mir diesen Eindringling!" Der Hase führte ihn zu einem tiefen Brunnen. Der Löwe schaute hinein – und sah seinen eigenen Spiegelblid. Überzeugt, dass es ein Rivale sei, sprang er in den Brunnen.

So rettete der kleine Hase mit seinem Verstand alle Tiere des Waldes. Denn Klugheit ist mächtiger als Stärke.`,
    sort_order: 1,
  },
  {
    id: 'story-02', title: 'Mem û Zîn – Die größte Liebesgeschichte', category: 'epos', read_time: 5,
    content: `Mem û Zîn ist das berühmteste Liebensepos der kurdischen Literatur, geschrieben von Ahmad Khani im 17. Jahrhundert.

Mem, ein edler junger Mann aus dem Stamm der Botî, sieht Zîn zum ersten Mal während des Newroz-Festes. Er verliebt sich sofort in sie. Zîn, die Schwester des Fürsten von Cizîr, erwidert seine Liebe.

Doch Beko, ein neidischer Minister, hasst Mem und tut alles, um ihre Liebe zu zerstören. Er lügt und intrigiert, bis Mem ins Gefängnis geworfen wird.

Zîn wartet treu auf ihn. Als Mem endlich freigelassen wird, ist er so schwach, dass er stirbt – kurz bevor er Zîn wiedersehen kann. Zîn stirbt vor Schmerz an seinem Grab.

Ahmad Khani schrieb dieses Epos nicht nur als Liebesgeschichte, sondern als Ruf nach kurdischer Einheit: "Wenn die Kurden vereint wären, könnten sie die Welt regieren."`,
    sort_order: 2,
  },
  {
    id: 'story-03', title: 'Kawa der Schmied – Der erste Newroz', category: 'legende', read_time: 4,
    content: `Vor langer Zeit herrschte der grausame König Dehak über das Land. Er hatte zwei Schlangen auf seinen Schultern, die jeden Tag mit dem Gehirn zweier junger Männer gefüttert werden mussten.

Das Volk lebte in Angst und Trauer. Jeden Tag wurden zwei junge Männer zum Palast gebracht.

Kawa, ein mutiger Schmied, konnte dies nicht mehr ertragen. Sein eigener Sohn sollte das nächste Opfer sein. Da erhob sich Kawa mit seinem Hammer und führte das Volk gegen Dehak.

Am 21. März – dem ersten Tag des Frühlings – besiegte Kawa den Tyrannen. Er zündete auf dem höchsten Berggipfel ein großes Feuer an, damit alle Menschen das Ende der Unterdrückung sehen konnten.

Seitdem feiern die Kurden jedes Jahr am 21. März Newroz – das Neue Jahr. Die Feuer von Kawa brennen noch immer in den Herzen des kurdischen Volkes.`,
    sort_order: 3,
  },
];

const SEED_EVENTS = [
  { id: 'ev-01', day: 21, month: 3, year: null,  title: 'Newroz – Kurdisches Neujahr', description: 'Newroz bedeutet "Neuer Tag" auf Kurdisch. Es ist das wichtigste Fest des kurdischen Volkes und wird seit Jahrtausenden gefeiert. Die Feuer symbolisieren den Sieg des Lichts über die Dunkelheit.', category: 'kultur' },
  { id: 'ev-02', day: 16, month: 3, year: 1988,  title: 'Halabdscha-Massaker', description: 'Am 16. März 1988 wurde die kurdische Stadt Halabdscha mit Chemiewaffen angegriffen. Über 5.000 Menschen starben. Es ist der schlimmste Chemiewaffenangriff auf eine Zivilbevölkerung in der Geschichte.', category: 'geschichte' },
  { id: 'ev-03', day: 11, month: 3, year: 1970,  title: 'Irakisch-Kurdisches Abkommen', description: 'Am 11. März 1970 unterzeichneten die irakische Regierung und die kurdische Bewegung ein Autonomieabkommen. Es war ein historischer Moment für kurdische Selbstbestimmung.', category: 'politik' },
  { id: 'ev-04', day: 6,  month: 8, year: null,  title: 'Tag der kurdischen Sprache', description: 'Der 6. August wird als inoffizieller Tag der kurdischen Sprache gefeiert. Er erinnert an die Bedeutung der Muttersprache für die Bewahrung der kurdischen Kultur und Identität.', category: 'kultur' },
  { id: 'ev-05', day: 15, month: 2, year: 1999,  title: 'Verhaftung Abdullah Öcalans', description: 'Am 15. Februar 1999 wurde Abdullah Öcalan, der Gründer der PKK, verhaftet. Dieses Datum ist für viele Kurden ein bedeutender politischer Wendepunkt.', category: 'politik' },
  { id: 'ev-06', day: 1,  month: 5, year: null,  title: 'Tag der Arbeit in Kurdistan', description: 'Wie in vielen Ländern feiern auch Kurden den 1. Mai als Tag der Arbeit. In Kurdistan hat er zusätzliche Bedeutung als Symbol für Solidarität und Gleichheit.', category: 'kultur' },
  { id: 'ev-07', day: 31, month: 10, year: null, title: 'Gedenktag Kurdischer Märtyrer', description: 'An diesem Tag gedenken viele Kurden ihrer Märtyrer – Menschen, die ihr Leben für die Freiheit und Würde des kurdischen Volkes gegeben haben.', category: 'geschichte' },
];

function seedIfEmpty(db) {
  // Celebrities
  const celCount = db.prepare('SELECT COUNT(*) AS n FROM kd_celebrities').get();
  if (!celCount || celCount.n === 0) {
    for (const c of SEED_CELEBRITIES) {
      try {
        db.prepare(`INSERT INTO kd_celebrities
          (id,name,birth_year,category,image_url,description,fun_fact,options,sort_order)
          VALUES (?,?,?,?,?,?,?,?,?)`)
          .run(c.id, c.name, c.birth_year, c.category, c.image_url, c.description, c.fun_fact, c.options, c.sort_order);
      } catch (_) {}
    }
  }
  // Stories
  const stCount = db.prepare('SELECT COUNT(*) AS n FROM kd_stories').get();
  if (!stCount || stCount.n === 0) {
    for (const s of SEED_STORIES) {
      try {
        db.prepare(`INSERT INTO kd_stories (id,title,content,category,read_time,sort_order)
          VALUES (?,?,?,?,?,?)`)
          .run(s.id, s.title, s.content, s.category, s.read_time, s.sort_order);
      } catch (_) {}
    }
  }
  // Events
  const evCount = db.prepare('SELECT COUNT(*) AS n FROM kd_events').get();
  if (!evCount || evCount.n === 0) {
    for (const e of SEED_EVENTS) {
      try {
        db.prepare(`INSERT INTO kd_events (id,day,month,year,title,description,category)
          VALUES (?,?,?,?,?,?,?)`)
          .run(e.id, e.day, e.month, e.year || null, e.title, e.description, e.category);
      } catch (_) {}
    }
  }
  saveToDisk();
}

// ── GET /api/kurdistan/celebrities ───────────────────────────────────────────
router.get('/celebrities', auth, wrap((req, res) => {
  const db = getDB();
  seedIfEmpty(db);
  const rows = db.prepare(
    `SELECT * FROM kd_celebrities WHERE active=1 ORDER BY sort_order, created_at`
  ).all().map(r => ({ ...r, options: JSON.parse(r.options || '[]') }));
  res.json(rows);
}));

// ── POST /api/kurdistan/celebrities/:id/answer ────────────────────────────────
router.post('/celebrities/:id/answer', auth, wrap((req, res) => {
  const db  = getDB();
  const cel = db.prepare('SELECT * FROM kd_celebrities WHERE id=?').get(req.params.id);
  if (!cel) return res.status(404).json({ error: 'Nicht gefunden' });

  const { answer } = req.body || {};
  const correct = answer === cel.name ? 1 : 0;

  db.prepare(`INSERT INTO kd_quiz_results (id,user_id,celebrity_id,correct)
    VALUES (?,?,?,?)`)
    .run(uuid(), req.user.id, cel.id, correct);
  saveToDisk();

  res.json({ correct: !!correct, name: cel.name,
    description: cel.description, fun_fact: cel.fun_fact });
}));

// ── GET /api/kurdistan/quiz-history — Quiz-Ergebnisse des Users ───────────────
router.get('/quiz-history', auth, wrap((req, res) => {
  const db = getDB();
  const results = db.prepare(`
    SELECT qr.id, qr.celebrity_id, qr.correct, qr.answered_at,
           c.name AS celebrity_name, c.category
    FROM kd_quiz_results qr
    JOIN kd_celebrities c ON c.id = qr.celebrity_id
    WHERE qr.user_id = ?
    ORDER BY qr.answered_at DESC LIMIT 50
  `).all(req.user.id);

  const stats = db.prepare(`
    SELECT COUNT(*) AS total,
           SUM(CASE WHEN correct=1 THEN 1 ELSE 0 END) AS correct_count
    FROM kd_quiz_results WHERE user_id = ?
  `).get(req.user.id);

  res.json({
    results,
    total: stats?.total || 0,
    correct: stats?.correct_count || 0,
    accuracy: stats?.total > 0 ? Math.round((stats.correct_count / stats.total) * 100) : 0,
  });
}));

// ── GET /api/kurdistan/stories ────────────────────────────────────────────────
router.get('/stories', auth, wrap((req, res) => {
  const db = getDB();
  seedIfEmpty(db);
  const rows = db.prepare(
    `SELECT * FROM kd_stories WHERE active=1 ORDER BY sort_order, created_at`
  ).all();
  res.json(rows);
}));

// ── GET /api/kurdistan/events/all — Alle Events (Admin) ─────────────────────
router.get('/events/all', auth, wrap((req, res) => {
  const db = getDB();
  seedIfEmpty(db);
  const rows = db.prepare(
    `SELECT * FROM kd_events WHERE active=1 ORDER BY month, day, year`
  ).all();
  res.json(rows);
}));

// ── GET /api/kurdistan/events/today ──────────────────────────────────────────
// Accepts optional ?tz_offset=-180 (minutes from UTC, like Date.getTimezoneOffset())
// so events match the user's local date, not the server's UTC date.
router.get('/events/today', auth, wrap((req, res) => {
  const db = getDB();
  seedIfEmpty(db);

  // Calculate "today" in the user's timezone
  const offsetMin = parseInt(req.query.tz_offset) || 0;
  const now = new Date(Date.now() - offsetMin * 60000);
  const day   = now.getUTCDate();
  const month = now.getUTCMonth() + 1;

  const rows  = db.prepare(
    `SELECT * FROM kd_events WHERE day=? AND month=? AND active=1 ORDER BY year`
  ).all(day, month);
  res.json({ day, month, events: rows });
}));

// ── ADMIN: CRUD für alle 3 Tabellen ──────────────────────────────────────────

// Celebrities
router.post('/celebrities', adminOnly, wrap((req, res) => {
  const { name, image_url, birth_year, category, description, fun_fact, options, sort_order } = req.body;
  if (!name || !description || !options?.length)
    return res.status(400).json({ error: 'name, description und options erforderlich' });
  const db = getDB();
  const id = uuid();
  db.prepare(`INSERT INTO kd_celebrities
    (id,name,image_url,birth_year,category,description,fun_fact,options,sort_order)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, name, image_url||'', birth_year||null, category||'kultur',
      description, fun_fact||'', JSON.stringify(options), sort_order||0);
  saveToDisk();
  const row = db.prepare('SELECT * FROM kd_celebrities WHERE id=?').get(id);
  res.status(201).json({ ...row, options: JSON.parse(row.options) });
}));

router.patch('/celebrities/:id', adminOnly, wrap((req, res) => {
  const { name, image_url, birth_year, category, description, fun_fact, options, sort_order, active } = req.body;
  const db = getDB();
  db.prepare(`UPDATE kd_celebrities SET
    name=COALESCE(?,name), image_url=COALESCE(?,image_url),
    birth_year=COALESCE(?,birth_year), category=COALESCE(?,category),
    description=COALESCE(?,description), fun_fact=COALESCE(?,fun_fact),
    options=COALESCE(?,options), sort_order=COALESCE(?,sort_order),
    active=COALESCE(?,active) WHERE id=?`)
    .run(name, image_url, birth_year, category, description, fun_fact,
      options ? JSON.stringify(options) : null, sort_order, active, req.params.id);
  saveToDisk();
  const row = db.prepare('SELECT * FROM kd_celebrities WHERE id=?').get(req.params.id);
  res.json({ ...row, options: JSON.parse(row.options || '[]') });
}));

router.delete('/celebrities/:id', adminOnly, wrap((req, res) => {
  getDB().prepare('DELETE FROM kd_celebrities WHERE id=?').run(req.params.id);
  saveToDisk();
  res.json({ ok: true });
}));

// Stories
router.post('/stories', adminOnly, wrap((req, res) => {
  const { title, content, category, read_time, sort_order, audio_file } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'title und content erforderlich' });
  const db = getDB(); const id = uuid();
  db.prepare(`INSERT INTO kd_stories (id,title,content,category,read_time,sort_order,audio_file)
    VALUES (?,?,?,?,?,?,?)`)
    .run(id, title, content, category||'märchen', read_time||3, sort_order||0, audio_file||null);
  saveToDisk();
  res.status(201).json(db.prepare('SELECT * FROM kd_stories WHERE id=?').get(id));
}));

router.patch('/stories/:id', adminOnly, wrap((req, res) => {
  const { title, content, category, read_time, sort_order, active, audio_file } = req.body;
  const db = getDB();
  db.prepare(`UPDATE kd_stories SET
    title=COALESCE(?,title), content=COALESCE(?,content),
    category=COALESCE(?,category), read_time=COALESCE(?,read_time),
    sort_order=COALESCE(?,sort_order), active=COALESCE(?,active),
    audio_file=COALESCE(?,audio_file) WHERE id=?`)
    .run(title, content, category, read_time, sort_order, active, audio_file, req.params.id);
  saveToDisk();
  res.json(db.prepare('SELECT * FROM kd_stories WHERE id=?').get(req.params.id));
}));

router.delete('/stories/:id', adminOnly, wrap((req, res) => {
  getDB().prepare('DELETE FROM kd_stories WHERE id=?').run(req.params.id);
  saveToDisk();
  res.json({ ok: true });
}));

// Events
router.post('/events', adminOnly, wrap((req, res) => {
  const { day, month, year, title, description, category } = req.body;
  if (!day || !month || !title || !description)
    return res.status(400).json({ error: 'day, month, title, description erforderlich' });
  const db = getDB(); const id = uuid();
  db.prepare(`INSERT INTO kd_events (id,day,month,year,title,description,category)
    VALUES (?,?,?,?,?,?,?)`)
    .run(id, day, month, year||null, title, description, category||'geschichte');
  saveToDisk();
  res.status(201).json(db.prepare('SELECT * FROM kd_events WHERE id=?').get(id));
}));

router.patch('/events/:id', adminOnly, wrap((req, res) => {
  const { day, month, year, title, description, category, active } = req.body;
  const db = getDB();
  db.prepare(`UPDATE kd_events SET
    day=COALESCE(?,day), month=COALESCE(?,month), year=COALESCE(?,year),
    title=COALESCE(?,title), description=COALESCE(?,description),
    category=COALESCE(?,category), active=COALESCE(?,active) WHERE id=?`)
    .run(day, month, year, title, description, category, active, req.params.id);
  saveToDisk();
  res.json(db.prepare('SELECT * FROM kd_events WHERE id=?').get(req.params.id));
}));

router.delete('/events/:id', adminOnly, wrap((req, res) => {
  getDB().prepare('DELETE FROM kd_events WHERE id=?').run(req.params.id);
  saveToDisk();
  res.json({ ok: true });
}));


// ── Community-Chat ────────────────────────────────────────────────────────────

function isChatEnabled(db) {
  try {
    const row = db.prepare("SELECT value FROM kd_settings WHERE key='chat_enabled'").get();
    return !row || row.value !== '0';  // default: aktiviert
  } catch { return true; }
}

function ensureSettings(db) {
  try {
    db.prepare("INSERT OR IGNORE INTO kd_settings (key,value) VALUES ('chat_enabled','1')").run();
  } catch (_) {}
}

// ── XSS-Sanitizer — strips dangerous HTML/script content ─────────────────────
function sanitizeMessage(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 500);
}

// ── Reaction helper — aggregate reactions for messages ────────────────────────
function getReactionsForMessages(db, messageIds, userId) {
  if (!messageIds.length) return {};
  const placeholders = messageIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT message_id, emoji, COUNT(*) as count,
            SUM(CASE WHEN user_id=? THEN 1 ELSE 0 END) as user_reacted
     FROM kd_community_reactions
     WHERE message_id IN (${placeholders})
     GROUP BY message_id, emoji`
  ).all(userId, ...messageIds);
  const map = {};
  for (const r of rows) {
    if (!map[r.message_id]) map[r.message_id] = [];
    map[r.message_id].push({ emoji: r.emoji, count: r.count, user_reacted: !!r.user_reacted });
  }
  return map;
}

// ── Report count helper ──────────────────────────────────────────────────────
function getReportCounts(db, messageIds) {
  if (!messageIds.length) return {};
  const placeholders = messageIds.map(() => '?').join(',');
  const rows = db.prepare(
    `SELECT message_id, COUNT(*) as count FROM kd_community_reports
     WHERE message_id IN (${placeholders}) AND resolved=0
     GROUP BY message_id`
  ).all(...messageIds);
  const map = {};
  for (const r of rows) map[r.message_id] = r.count;
  return map;
}

// GET /api/kurdistan/community — alle Nachrichten (neueste zuerst, max 50)
router.get('/community', auth, wrap((req, res) => {
  const db = getDB();
  ensureSettings(db);
  const enabled = isChatEnabled(db);
  const offset = Math.max(0, parseInt(req.query.offset) || 0);
  const limit  = 50;
  const search = (req.query.search || '').trim().slice(0, 100);
  const total  = db.prepare('SELECT COUNT(*) AS n FROM kd_community').get()?.n || 0;

  let query = `SELECT c.id, c.user_id, c.user_name, c.message, c.created_at,
          c.reply_to, c.edited, c.pinned, c.edited_at,
          CASE WHEN c.user_id=? THEN 1 ELSE 0 END AS is_own
   FROM kd_community c`;
  const params = [req.user.id];

  if (search) {
    query += ` WHERE c.message LIKE ?`;
    params.push(`%${search}%`);
  }

  query += ` ORDER BY c.pinned DESC, c.created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const messages = db.prepare(query).all(...params);
  const ids = messages.map(m => m.id);
  const reactions = getReactionsForMessages(db, ids, req.user.id);
  const reports = req.user.role === 'admin' ? getReportCounts(db, ids) : {};

  // Attach reply_to message content (preview)
  const replyIds = messages.filter(m => m.reply_to).map(m => m.reply_to);
  const replyMap = {};
  if (replyIds.length) {
    const rPlaceholders = replyIds.map(() => '?').join(',');
    const replyRows = db.prepare(
      `SELECT id, user_name, message FROM kd_community WHERE id IN (${rPlaceholders})`
    ).all(...replyIds);
    for (const r of replyRows) replyMap[r.id] = { user_name: r.user_name, message: r.message.slice(0, 80) };
  }

  // Enrich messages
  const enriched = messages.map(m => ({
    ...m,
    reactions: reactions[m.id] || [],
    report_count: reports[m.id] || 0,
    reply_preview: m.reply_to ? (replyMap[m.reply_to] || null) : null,
  }));

  // Online count: users who posted in last 10 minutes
  const onlineCount = db.prepare(
    `SELECT COUNT(DISTINCT user_id) as n FROM kd_community
     WHERE created_at > datetime('now','-10 minutes')`
  ).get()?.n || 0;

  res.json({ enabled, messages: enriched, total, offset, limit, online_count: onlineCount });
}));

// POST /api/kurdistan/community — neue Nachricht
router.post('/community', auth, chatLimiter, wrap((req, res) => {
  const db = getDB();
  ensureSettings(db);
  if (!isChatEnabled(db))
    return res.status(403).json({ error: 'Der Community-Bereich ist gerade deaktiviert.' });

  const { message, reply_to } = req.body || {};
  if (!message || typeof message !== 'string')
    return res.status(400).json({ error: 'Nachricht darf nicht leer sein.' });

  const sanitized = sanitizeMessage(message);
  if (!sanitized || sanitized.length < 2) return res.status(400).json({ error: 'Nachricht muss mindestens 2 Zeichen haben.' });

  // Validate reply_to if given
  if (reply_to) {
    const parent = db.prepare('SELECT id FROM kd_community WHERE id=?').get(reply_to);
    if (!parent) return res.status(400).json({ error: 'Die zu beantwortende Nachricht existiert nicht.' });
  }

  const id  = uuid();
  db.prepare(`INSERT INTO kd_community (id,user_id,user_name,message,reply_to)
    VALUES (?,?,?,?,?)`)
    .run(id, req.user.id, req.user.name, sanitized, reply_to || null);
  saveToDisk();

  const row = db.prepare('SELECT * FROM kd_community WHERE id=?').get(id);
  res.status(201).json({ ...row, is_own: 1, reactions: [], report_count: 0, reply_preview: null });
}));

// PUT /api/kurdistan/community/:id — eigene Nachricht bearbeiten
router.put('/community/:id', auth, chatLimiter, wrap((req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM kd_community WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });
  if (row.user_id !== req.user.id) return res.status(403).json({ error: 'Nur eigene Nachrichten bearbeiten' });

  // Max 15 min nach Erstellung
  const ageMs = Date.now() - new Date(row.created_at).getTime();
  if (ageMs > 15 * 60 * 1000) return res.status(403).json({ error: 'Bearbeiten nur innerhalb von 15 Minuten möglich.' });

  const { message } = req.body || {};
  const sanitized = sanitizeMessage(message);
  if (!sanitized || sanitized.length < 2) return res.status(400).json({ error: 'Nachricht muss mindestens 2 Zeichen haben.' });

  db.prepare(`UPDATE kd_community SET message=?, edited=1, edited_at=datetime('now') WHERE id=?`)
    .run(sanitized, req.params.id);
  saveToDisk();

  const updated = db.prepare('SELECT * FROM kd_community WHERE id=?').get(req.params.id);
  res.json({ ...updated, is_own: 1 });
}));

// DELETE /api/kurdistan/community/:id — eigene Nachricht oder Admin löscht
router.delete('/community/:id', auth, wrap((req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM kd_community WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });

  // Eigene oder Admin
  if (row.user_id !== req.user.id && req.user.role !== 'admin')
    return res.status(403).json({ error: 'Keine Berechtigung' });

  // Cleanup reactions and reports
  db.prepare('DELETE FROM kd_community_reactions WHERE message_id=?').run(req.params.id);
  db.prepare('DELETE FROM kd_community_reports WHERE message_id=?').run(req.params.id);
  db.prepare('DELETE FROM kd_community WHERE id=?').run(req.params.id);
  saveToDisk();

  if (req.user.role === 'admin' && row.user_id !== req.user.id) {
    logAdminAction(db, req.user, 'community_delete', row.id, `Nachricht von ${row.user_name} gelöscht`);
  }
  res.json({ ok: true });
}));

// POST /api/kurdistan/community/:id/react — Reaktion hinzufügen/entfernen (toggle)
router.post('/community/:id/react', auth, wrap((req, res) => {
  const db = getDB();
  const msg = db.prepare('SELECT id FROM kd_community WHERE id=?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Nicht gefunden' });

  const { emoji } = req.body || {};
  const ALLOWED_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','👏','💡','🎉','💪'];
  if (!emoji || !ALLOWED_EMOJIS.includes(emoji))
    return res.status(400).json({ error: 'Ungültiges Emoji' });

  // Toggle: exists → remove, otherwise → add
  const existing = db.prepare(
    'SELECT id FROM kd_community_reactions WHERE message_id=? AND user_id=? AND emoji=?'
  ).get(req.params.id, req.user.id, emoji);

  if (existing) {
    db.prepare('DELETE FROM kd_community_reactions WHERE id=?').run(existing.id);
  } else {
    db.prepare('INSERT INTO kd_community_reactions (id,message_id,user_id,emoji) VALUES (?,?,?,?)')
      .run(uuid(), req.params.id, req.user.id, emoji);
  }
  saveToDisk();

  // Return updated reactions for this message
  const reactions = db.prepare(
    `SELECT emoji, COUNT(*) as count,
            SUM(CASE WHEN user_id=? THEN 1 ELSE 0 END) as user_reacted
     FROM kd_community_reactions WHERE message_id=? GROUP BY emoji`
  ).all(req.user.id, req.params.id);

  res.json({ reactions: reactions.map(r => ({ emoji: r.emoji, count: r.count, user_reacted: !!r.user_reacted })) });
}));

// POST /api/kurdistan/community/:id/report — Nachricht melden
router.post('/community/:id/report', auth, wrap((req, res) => {
  const db = getDB();
  const msg = db.prepare('SELECT id, user_id FROM kd_community WHERE id=?').get(req.params.id);
  if (!msg) return res.status(404).json({ error: 'Nicht gefunden' });
  if (msg.user_id === req.user.id) return res.status(400).json({ error: 'Eigene Nachrichten können nicht gemeldet werden.' });

  const { reason } = req.body || {};
  const ALLOWED_REASONS = ['spam', 'offensive', 'harassment', 'other'];
  if (!reason || !ALLOWED_REASONS.includes(reason))
    return res.status(400).json({ error: 'Ungültiger Grund' });

  // Check duplicate
  const existing = db.prepare(
    'SELECT id FROM kd_community_reports WHERE message_id=? AND reporter_id=?'
  ).get(req.params.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'Bereits gemeldet' });

  db.prepare('INSERT INTO kd_community_reports (id,message_id,reporter_id,reason) VALUES (?,?,?,?)')
    .run(uuid(), req.params.id, req.user.id, reason);
  saveToDisk();

  // Auto-hide: if 3+ reports, auto-delete
  const reportCount = db.prepare(
    'SELECT COUNT(*) as n FROM kd_community_reports WHERE message_id=? AND resolved=0'
  ).get(req.params.id)?.n || 0;

  if (reportCount >= 3) {
    db.prepare('DELETE FROM kd_community WHERE id=?').run(req.params.id);
    db.prepare('UPDATE kd_community_reports SET resolved=1 WHERE message_id=?').run(req.params.id);
    saveToDisk();
    return res.json({ ok: true, auto_removed: true });
  }

  res.json({ ok: true, auto_removed: false });
}));

// PATCH /api/kurdistan/community/:id/pin — Admin: Nachricht anpinnen/lösen
router.patch('/community/:id/pin', adminOnly, wrap((req, res) => {
  const db = getDB();
  const row = db.prepare('SELECT * FROM kd_community WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden' });

  const newPinned = row.pinned ? 0 : 1;
  db.prepare('UPDATE kd_community SET pinned=? WHERE id=?').run(newPinned, req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, newPinned ? 'community_pin' : 'community_unpin', row.id, row.message.slice(0, 50));
  res.json({ ok: true, pinned: newPinned });
}));

// DELETE /api/kurdistan/community — Admin: alle Nachrichten löschen
router.delete('/community', adminOnly, wrap((req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM kd_community_reactions').run();
  db.prepare('DELETE FROM kd_community_reports').run();
  db.prepare('DELETE FROM kd_community').run();
  saveToDisk();
  logAdminAction(db, req.user, 'community_clear_all', null, 'Alle Community-Nachrichten gelöscht');
  res.json({ ok: true });
}));

// PATCH /api/kurdistan/settings/chat — Chat aktivieren/deaktivieren
router.patch('/settings/chat', adminOnly, wrap((req, res) => {
  const { enabled } = req.body || {};
  const db = getDB();
  ensureSettings(db);
  db.prepare("INSERT OR REPLACE INTO kd_settings (key,value) VALUES ('chat_enabled',?)")
    .run(enabled ? '1' : '0');
  saveToDisk();
  res.json({ enabled: !!enabled });
}));

module.exports = router;
