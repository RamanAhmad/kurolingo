'use strict';
const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { getDB, saveToDisk } = require('../db');
const { adminOnly, logAdminAction } = require('../middleware/auth');

const wrap = fn => (req, res, next) => {
  try { const r = fn(req, res, next); if (r?.catch) r.catch(next); } catch (e) { next(e); }
};

router.get('/', wrap((req, res) => {
  const { pair_id } = req.query;
  const db  = getDB();
  const sql = pair_id
    ? `SELECT u.*,(SELECT COUNT(*) FROM lessons WHERE unit_id=u.id) lc FROM units u WHERE u.pair_id=? ORDER BY u.sort_order`
    : `SELECT u.*,(SELECT COUNT(*) FROM lessons WHERE unit_id=u.id) lc FROM units u ORDER BY u.sort_order`;
  res.json(pair_id ? db.prepare(sql).all(pair_id) : db.prepare(sql).all());
}));

router.post('/', adminOnly, wrap((req, res) => {
  const { pair_id, title_ku, title_tr, emoji, color, sort_order, status } = req.body;
  if (!pair_id || !title_ku || !title_tr) return res.status(400).json({ error: 'Felder fehlen' });
  const db = getDB(); const id = uuid();
  db.prepare(`INSERT INTO units (id,pair_id,title_ku,title_tr,emoji,color,sort_order,status) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, pair_id, title_ku, title_tr, emoji||'📚', color||'#0B9E88', sort_order||0, status||'active');
  saveToDisk();
  logAdminAction(db, req.user, 'unit.create', id, title_tr);
  res.status(201).json(db.prepare('SELECT * FROM units WHERE id=?').get(id));
}));

router.patch('/:id', adminOnly, wrap((req, res) => {
  const { title_ku, title_tr, emoji, color, sort_order, status } = req.body;
  const db = getDB();
  db.prepare(`UPDATE units SET title_ku=COALESCE(?,title_ku),title_tr=COALESCE(?,title_tr),
    emoji=COALESCE(?,emoji),color=COALESCE(?,color),sort_order=COALESCE(?,sort_order),status=COALESCE(?,status) WHERE id=?`)
    .run(title_ku, title_tr, emoji, color, sort_order, status, req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'unit.update', req.params.id);
  res.json(db.prepare('SELECT * FROM units WHERE id=?').get(req.params.id));
}));

router.delete('/:id', adminOnly, wrap((req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM units WHERE id=?').run(req.params.id);
  saveToDisk();
  logAdminAction(db, req.user, 'unit.delete', req.params.id);
  res.json({ ok: true });
}));

module.exports = router;
