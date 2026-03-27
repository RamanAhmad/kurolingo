import React, { useEffect, useState, useRef } from 'react';
import {
  IconPlus, IconPencil, IconTrash, IconSave, IconX, IconArrowLeft,
  IconRefresh, IconSettings, IconUpload, IconSearch, IconCheck,
  IconPlay, IconVolume, IconLink, IconLogout, IconUser, IconDownload,
  IconGlobe, IconBook, IconMic, IconImage, IconCopy, IconAdmin, IconFilter,
} from '../components/ui/icons';
import { useNavigate, Routes, Route } from 'react-router-dom';
import api from '../api/client';
import { useStore } from '../store';
import Spinner from '../components/ui/Spinner';

// ── Shared helpers ──────────────────────────────────────────────────────────
function Badge({ children, type = 'gray' }) {
  return <span className={`badge badge-${type}`}>{children}</span>;
}

function StatCard({ icon, val, label, color }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 30, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color }}>{typeof val === 'number' ? val.toLocaleString() : val}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: '#8A8580', textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-ghost btn-xs" onClick={onClose} title="Schließen"><IconX style={{width:13,height:13}}/></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

function useToast() {
  const addToast = useStore(s => s.addToast);
  return addToast;
}

// ── Main Admin Page ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',     label: '📊 Dashboard' },
  { id: 'courses',       label: '🌍 Sprachpaare' },
  { id: 'units',         label: '🗂️ Einheiten' },
  { id: 'lessons',       label: '📚 Lektionen' },
  { id: 'exercises',     label: '✏️ Übungen' },
  { id: 'vocab',         label: '📖 Vokabeln' },
  { id: 'audio-manager', label: '🎙️ Audio-Manager' },
  { id: 'media',         label: '🖼️ Bilder' },
  { id: 'users',         label: '👥 Nutzer' },
  { id: 'kurdistan',     label: '🏔️ Kurdistan' },
];

export default function AdminPage() {
  const [tab, setTab] = useState('dashboard');
  const navigate = useNavigate();
  const user = useStore(s => s.user);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F4F1', display: 'flex', flexDirection: 'column' }}>
      {/* Admin Top Bar */}
      <div style={{ background: '#1A2744', height: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 14, flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0B9E88', display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="19" fill="#0B9E88"/>
            <path d="M13 10L13 30M13 20L23 10M13 20L24 30" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M27 9L28.2 12.5L32 12.5L29 14.8L30.2 18.3L27 16L23.8 18.3L25 14.8L22 12.5L25.8 12.5Z" fill="#E8A020"/>
          </svg>
          Kurdolingo
        </div>
        <span style={{ background: '#D94040', color: 'white', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>ADMIN</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>👤 {user?.name}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')} style={{ color: 'rgba(255,255,255,.7)', borderColor: 'rgba(255,255,255,.2)' }}><IconArrowLeft style={{width:13,height:13}}/> App</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#fff', borderBottom: '2px solid #E0DDD8', display: 'flex', overflowX: 'auto', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '14px 18px', border: 'none', background: 'none',
            fontFamily: 'var(--font)', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
            color: tab === t.id ? '#0B9E88' : '#8A8580',
            borderBottom: `3px solid ${tab === t.id ? '#0B9E88' : 'transparent'}`,
            transition: 'color .15s'
          }}>{t.label}</button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'dashboard' && <DashboardTab onNavigate={setTab} />}
        {tab === 'courses'   && <CoursesTab />}
        {tab === 'units'     && <UnitsTab />}
        {tab === 'lessons'   && <LessonsTab />}
        {tab === 'exercises' && <ExercisesTab />}
        {tab === 'vocab'     && <VocabTab />}
        {tab === 'audio-manager' && <AudioManagerTab />}
        {tab === 'media'         && <MediaTab />}
        {tab === 'users'     && <UsersTab />}
        {tab === 'kurdistan' && <KurdistanAdminTab />}
      </div>
    </div>
  );
}

// ── Dashboard Tab ───────────────────────────────────────────────────────────
function DashboardTab({ onNavigate }) {
  const [stats, setStats] = useState(null);

  useEffect(() => { api.get('/admin/stats').then(r => setStats(r.data)); }, []);
  if (!stats) return <Spinner />;

  return (
    <div style={{ padding: '24px 20px', maxWidth: 860 }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 20 }}>Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard icon="👥" val={stats.users}       label="Nutzer"       color="#5DD6F0" />
        <StatCard icon="🌍" val={stats.courses}     label="Kurse"        color="#0B9E88" />
        <StatCard icon="📚" val={stats.lessons}     label="Lektionen"    color="#E8A020" />
        <StatCard icon="✏️" val={stats.exercises}   label="Übungen"      color="#B594FF" />
        <StatCard icon="📖" val={stats.vocab}       label="Vokabeln"     color="#6B48FF" />
        <StatCard icon="✅" val={stats.completions} label="Abschlüsse"   color="#0B9E88" />
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 900, marginBottom: 14, fontSize: 16 }}>⚡ Schnellaktionen</h3>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-md" onClick={() => onNavigate('courses')}><IconPlus style={{width:15,height:15}}/> Neuen Kurs</button>
          <button className="btn btn-accent btn-md" onClick={() => onNavigate('lessons')}><IconBook style={{width:15,height:15}}/> Neue Lektion</button>
          <button className="btn btn-ghost btn-md" onClick={() => onNavigate('exercises')}><IconPencil style={{width:15,height:15}}/> Neue Übung</button>
          <button className="btn btn-ghost btn-md" onClick={() => onNavigate('audio-manager')}><IconMic style={{width:15,height:15}}/> Audio hochladen</button>
          <button className="btn btn-ghost btn-md" onClick={() => onNavigate('media')}><IconImage style={{width:15,height:15}}/> Bilder hochladen</button>
        </div>
      </div>
    </div>
  );
}

// ── Courses Tab ─────────────────────────────────────────────────────────────
function CoursesTab() {
  const [courses, setCourses] = useState([]);
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ from_code:'', from_name:'', from_flag:'🌐', from_tts:'de-DE', name:'', description:'', status:'draft', difficulty:'A1', dialect:'Kurmanji' });
  const toast = useToast();

  const load = () => api.get('/courses/all').then(r => setCourses(r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.from_code || !form.from_name || !form.name) return toast('Pflichtfelder ausfüllen', 'err');
    try {
      await api.post('/courses', form);
      toast(`Kurs erstellt!`, 'ok');
      setModal(false); load();
    } catch (e) { toast(e.response?.data?.error || 'Fehler', 'err'); }
  };

  const del = async (id) => {
    if (!confirm('Kurs und alle Inhalte löschen?')) return;
    await api.delete(`/courses/${id}`);
    toast('Gelöscht', 'info'); load();
  };

  const toggle = async (c) => {
    await api.patch(`/courses/${c.id}`, { status: c.status === 'active' ? 'draft' : 'active' });
    load();
  };

  const statusBadge = s => s === 'active' ? 'teal' : s === 'beta' ? 'sun' : 'gray';

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900 }}>🌍 Sprachpaare</h2>
        <button className="btn btn-primary btn-md" onClick={() => setModal(true)}><IconGlobe style={{width:14,height:14}}/> Sprachpaar</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 16 }}>
        {courses.map(c => (
          <div key={c.id} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 32 }}>{c.from_flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: 15 }}>{c.from_name} → Kurdisch</div>
                <div style={{ fontSize: 12, color: '#8A8580' }}>{c.name}</div>
              </div>
              <Badge type={statusBadge(c.status)}>{c.status}</Badge>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <Badge type="gray">{c.dialect}</Badge>
              <Badge type="sun">{c.difficulty}</Badge>
              <Badge type="teal">{c.unit_count ?? 0} Einheiten</Badge>
              <Badge type="gray">{c.lesson_count ?? 0} Lektionen</Badge>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>
                {c.status === 'active' ? '🔒 Deaktivieren' : '✅ Aktivieren'}
              </button>
              <button className="btn btn-ghost-danger btn-sm" onClick={() => del(c.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="🌍 Neues Sprachpaar"
        footer={<><button className="btn btn-ghost btn-md" onClick={() => setModal(false)}>Abbrechen</button><button className="btn btn-primary btn-md" onClick={save}><IconSave style={{width:14,height:14}}/> Speichern</button></>}>
        <div className="form-grid">
          <div className="form-row"><label className="form-label">Sprachcode *</label><input className="input" value={form.from_code} onChange={e => setForm({...form,from_code:e.target.value})} placeholder="de" /></div>
          <div className="form-row"><label className="form-label">Sprachname *</label><input className="input" value={form.from_name} onChange={e => setForm({...form,from_name:e.target.value})} placeholder="Deutsch" /></div>
          <div className="form-row"><label className="form-label">Flagge Emoji</label><input className="input" value={form.from_flag} onChange={e => setForm({...form,from_flag:e.target.value})} placeholder="🇩🇪" style={{fontSize:20,textAlign:'center'}} /></div>
          <div className="form-row"><label className="form-label">TTS-Sprache</label><input className="input" value={form.from_tts} onChange={e => setForm({...form,from_tts:e.target.value})} placeholder="de-DE" /></div>
        </div>
        <div className="form-row"><label className="form-label">Kursname *</label><input className="input" value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Kurdisch für Deutsche" /></div>
        <div className="form-grid">
          <div className="form-row"><label className="form-label">Dialekt</label>
            <select className="select" value={form.dialect} onChange={e => setForm({...form,dialect:e.target.value})}>
              {['Kurmanji','Sorani','Badini','Zazaki'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="form-row"><label className="form-label">Niveau</label>
            <select className="select" value={form.difficulty} onChange={e => setForm({...form,difficulty:e.target.value})}>
              {['A1','A2','B1','B2'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row"><label className="form-label">Status</label>
          <select className="select" value={form.status} onChange={e => setForm({...form,status:e.target.value})}>
            {['draft','active','beta'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-row"><label className="form-label">Beschreibung</label><textarea className="textarea" value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Kurzbeschreibung…" /></div>
      </Modal>
    </div>
  );
}

// ── Units Tab ───────────────────────────────────────────────────────────────
function UnitsTab() {
  const [units, setUnits]     = useState([]);
  const [courses, setCourses] = useState([]);
  const [pairId, setPairId]   = useState('');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ pair_id:'', title_ku:'', title_tr:'', emoji:'📚', color:'#0B9E88', sort_order:1, status:'active' });
  const toast = useToast();

  useEffect(() => { api.get('/courses/all').then(r => { setCourses(r.data); if (r.data[0]) setPairId(r.data[0].id); }); }, []);
  useEffect(() => { if (pairId) api.get(`/units?pair_id=${pairId}`).then(r => setUnits(r.data)); }, [pairId]);

  const save = async () => {
    if (!form.title_ku || !form.title_tr) return toast('Titel fehlen', 'err');
    try {
      await api.post('/units', { ...form, pair_id: pairId });
      toast('Einheit erstellt!', 'ok'); setModal(false);
      api.get(`/units?pair_id=${pairId}`).then(r => setUnits(r.data));
    } catch { toast('Fehler', 'err'); }
  };

  const del = async id => {
    if (!confirm('Einheit löschen?')) return;
    await api.delete(`/units/${id}`);
    api.get(`/units?pair_id=${pairId}`).then(r => setUnits(r.data));
    toast('Gelöscht', 'info');
  };

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900 }}>🗂️ Einheiten</h2>
        <button className="btn btn-primary btn-md" onClick={() => setModal(true)}><IconPlus style={{width:14,height:14}}/> Neue Einheit</button>
      </div>
      <select className="select" style={{ maxWidth: 320, marginBottom: 16 }} value={pairId} onChange={e => setPairId(e.target.value)}>
        {courses.map(c => <option key={c.id} value={c.id}>{c.from_flag} {c.from_name} → Kurdisch</option>)}
      </select>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {units.map(u => (
          <div key={u.id} style={{ background: '#fff', border: `2px solid ${u.color || '#E0DDD8'}`, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 26 }}>{u.emoji}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>{u.title_tr} <span style={{ fontSize: 13, color: '#8A8580', fontWeight: 600 }}>· {u.title_ku}</span></div>
              <div style={{ fontSize: 12, color: '#8A8580', marginTop: 2 }}>Reihenfolge {u.sort_order} · <Badge type={u.status==='active'?'teal':'gray'}>{u.status}</Badge></div>
            </div>
            <Badge type="gray">{u.lc ?? 0} Lektionen</Badge>
            <button className="btn btn-ghost-danger btn-sm" onClick={() => del(u.id)}>🗑️</button>
          </div>
        ))}
        {units.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#8A8580' }}>Keine Einheiten. Bitte Sprachpaar wählen.</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="🗂️ Neue Einheit"
        footer={<><button className="btn btn-ghost btn-md" onClick={() => setModal(false)}>Abbrechen</button><button className="btn btn-primary btn-md" onClick={save}><IconSave style={{width:14,height:14}}/> Speichern</button></>}>
        <div className="form-grid">
          <div className="form-row"><label className="form-label">Titel Kurdisch *</label><input className="input" value={form.title_ku} onChange={e => setForm({...form,title_ku:e.target.value})} placeholder="Destpêkên Kurdî" /></div>
          <div className="form-row"><label className="form-label">Titel Übersetzung *</label><input className="input" value={form.title_tr} onChange={e => setForm({...form,title_tr:e.target.value})} placeholder="Grundlagen" /></div>
          <div className="form-row"><label className="form-label">Emoji</label><input className="input" value={form.emoji} onChange={e => setForm({...form,emoji:e.target.value})} style={{textAlign:'center',fontSize:20}} /></div>
          <div className="form-row"><label className="form-label">Farbe</label><input type="color" value={form.color} onChange={e => setForm({...form,color:e.target.value})} style={{height:44,width:'100%',borderRadius:10,border:'2px solid #E0DDD8',cursor:'pointer',padding:4}} /></div>
          <div className="form-row"><label className="form-label">Reihenfolge</label><input className="input" type="number" value={form.sort_order} onChange={e => setForm({...form,sort_order:+e.target.value})} /></div>
          <div className="form-row"><label className="form-label">Status</label><select className="select" value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option value="active">Aktiv</option><option value="locked">Gesperrt</option></select></div>
        </div>
      </Modal>
    </div>
  );
}

// ── Lessons Tab ─────────────────────────────────────────────────────────────
function LessonsTab() {
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [units, setUnits]     = useState([]);
  const [pairId, setPairId]   = useState('');
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState({ unit_id:'', title_ku:'', title_tr:'', emoji:'📖', difficulty:'A1', tip:'', status:'active' });
  const toast = useToast();

  useEffect(() => { api.get('/courses/all').then(r => { setCourses(r.data); if (r.data[0]) setPairId(r.data[0].id); }); }, []);
  useEffect(() => {
    if (!pairId) return;
    api.get(`/lessons?pair_id=${pairId}`).then(r => setLessons(r.data));
    api.get(`/units?pair_id=${pairId}`).then(r => setUnits(r.data));
  }, [pairId]);

  const save = async () => {
    if (!form.unit_id || !form.title_ku || !form.title_tr) return toast('Pflichtfelder ausfüllen', 'err');
    try {
      await api.post('/lessons', { ...form, pair_id: pairId });
      toast('Lektion erstellt!', 'ok'); setModal(false);
      api.get(`/lessons?pair_id=${pairId}`).then(r => setLessons(r.data));
    } catch { toast('Fehler', 'err'); }
  };

  const del = async id => {
    if (!confirm('Lektion löschen?')) return;
    await api.delete(`/lessons/${id}`);
    api.get(`/lessons?pair_id=${pairId}`).then(r => setLessons(r.data));
    toast('Gelöscht', 'info');
  };

  const diffColor = { A1:'teal', A2:'sun', B1:'sun', B2:'gray' };

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900 }}>📚 Lektionen</h2>
        <button className="btn btn-primary btn-md" onClick={() => setModal(true)}><IconPlus style={{width:14,height:14}}/> Neue Lektion</button>
      </div>
      <select className="select" style={{ maxWidth: 320, marginBottom: 16 }} value={pairId} onChange={e => setPairId(e.target.value)}>
        {courses.map(c => <option key={c.id} value={c.id}>{c.from_flag} {c.from_name} → Kurdisch</option>)}
      </select>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Lektion</th><th>Einheit</th><th>Übungen</th><th>Niveau</th><th>Status</th><th>Aktionen</th></tr></thead>
          <tbody>
            {lessons.map(l => (
              <tr key={l.id}>
                <td><span style={{ fontSize: 18, marginRight: 8 }}>{l.emoji}</span><strong>{l.title_tr}</strong> <span style={{ color: '#8A8580', fontSize: 13 }}>· {l.title_ku}</span></td>
                <td>{units.find(u => u.id === l.unit_id)?.title_tr ?? '—'}</td>
                <td><strong>{l.ex_count ?? 0}</strong></td>
                <td><Badge type={diffColor[l.difficulty] || 'gray'}>{l.difficulty}</Badge></td>
                <td><Badge type={l.status==='active'?'teal':'gray'}>{l.status}</Badge></td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-xs" title="Bearbeiten"><IconPencil style={{width:13,height:13}}/></button>
                  <button className="btn btn-ghost-danger btn-xs" onClick={() => del(l.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {lessons.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#8A8580' }}>Keine Lektionen</div>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="📚 Neue Lektion"
        footer={<><button className="btn btn-ghost btn-md" onClick={() => setModal(false)}>Abbrechen</button><button className="btn btn-primary btn-md" onClick={save}><IconSave style={{width:14,height:14}}/> Speichern</button></>}>
        <div className="form-row"><label className="form-label">Einheit *</label>
          <select className="select" value={form.unit_id} onChange={e => setForm({...form,unit_id:e.target.value})}>
            <option value="">— Einheit wählen —</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.emoji} {u.title_tr}</option>)}
          </select>
        </div>
        <div className="form-grid">
          <div className="form-row"><label className="form-label">Titel Kurdisch *</label><input className="input" value={form.title_ku} onChange={e => setForm({...form,title_ku:e.target.value})} placeholder="Silav" /></div>
          <div className="form-row"><label className="form-label">Titel Übersetzung *</label><input className="input" value={form.title_tr} onChange={e => setForm({...form,title_tr:e.target.value})} placeholder="Begrüßungen" /></div>
          <div className="form-row"><label className="form-label">Emoji</label><input className="input" value={form.emoji} onChange={e => setForm({...form,emoji:e.target.value})} style={{textAlign:'center',fontSize:20}} /></div>
          <div className="form-row"><label className="form-label">Niveau</label><select className="select" value={form.difficulty} onChange={e => setForm({...form,difficulty:e.target.value})}>{['A1','A2','B1','B2'].map(d=><option key={d}>{d}</option>)}</select></div>
        </div>
        <div className="form-row"><label className="form-label">Lern-Tipp</label><textarea className="textarea" value={form.tip} onChange={e => setForm({...form,tip:e.target.value})} placeholder="Hinweis für Lernende…" /></div>
        <div className="form-row"><label className="form-label">Status</label><select className="select" value={form.status} onChange={e => setForm({...form,status:e.target.value})}><option value="active">Aktiv</option><option value="draft">Entwurf</option><option value="locked">Gesperrt</option></select></div>
      </Modal>
    </div>
  );
}

// ── Direct File Upload Button (inline, no modal) ──────────────────────────
function DirectUploadButton({ onUploaded, accept = 'audio/*,video/webm', label: labelText }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const toast = useToast();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('files', file);
    if (labelText) fd.append('kurdish_text', labelText);
    try {
      const r = await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const uploaded = Array.isArray(r.data) ? r.data[0] : r.data;
      toast(`${file.name} hochgeladen!`, 'ok');
      if (onUploaded) onUploaded(uploaded.filename);
    } catch { toast('Upload fehlgeschlagen', 'err'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  return (
    <>
      <input ref={fileRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleFile} />
      <button
        className="btn btn-sm"
        onClick={() => fileRef.current.click()}
        disabled={uploading}
        style={{ background: '#0B9E88', color: '#fff', fontWeight: 800, border: 'none', boxShadow: '0 2px 0 #097560' }}
      >
        {uploading ? '⏳ Lädt…' : '⬆️ Datei hochladen'}
      </button>
    </>
  );
}

// ── Media Picker Modal ──────────────────────────────────────────────────────
function MediaPickerModal({ open, onClose, onSelect, type = 'audio' }) {
  const [files, setFiles]     = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef();
  const toast   = useToast();

  useEffect(() => {
    if (open) api.get(`/media?type=${type}`).then(r => setFiles(r.data)).catch(() => {});
  }, [open, type]);

  const reloadFiles = () => api.get(`/media?type=${type}`).then(r => setFiles(r.data)).catch(() => {});

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('files', file);
    try {
      await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast(`${file.name} hochgeladen!`, 'ok');
      reloadFiles();
    } catch { toast('Upload fehlgeschlagen', 'err'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-header">
          <h3>{type === 'audio' ? '🎵 Audio auswählen' : '🖼️ Bild auswählen'}</h3>
          <button className="btn btn-ghost btn-xs" onClick={onClose} title="Schließen"><IconX style={{width:13,height:13}}/></button>
        </div>
        <div className="modal-body">
          {/* Upload zone for audio */}
          {type === 'audio' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <input ref={fileRef} type="file" accept="audio/*,video/webm" style={{ display:'none' }} onChange={upload} />
              <button className="btn btn-primary btn-sm" onClick={() => fileRef.current.click()} disabled={uploading} style={{ flex: 1 }}>
                {uploading ? '⏳ Lädt hoch…' : '⬆️ Audio-Datei hochladen (alle Formate)'}
              </button>
            </div>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={upload} />
              <button className="btn btn-primary btn-sm" onClick={() => fileRef.current.click()} disabled={uploading} style={{ marginBottom: 14 }}>
                {uploading ? '⏳ Lädt hoch…' : '⬆️ Bilddatei hochladen'}
              </button>
            </>
          )}

          {/* Kein Audio Option */}
          <div
            onClick={() => { onSelect(null); onClose(); }}
            style={{ padding: '10px 14px', border: '2px solid #E0DDD8', borderRadius: 10, cursor: 'pointer', marginBottom: 8, fontSize: 14, fontWeight: 700, color: '#8A8580', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span>⊘</span> Kein {type === 'audio' ? 'Audio' : 'Bild'}{type === 'audio' ? ' (Browser-TTS als Fallback)' : ''}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
            {files.map(f => (
              <div
                key={f.id}
                onClick={() => { onSelect(f.filename); onClose(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '2px solid #E0DDD8', borderRadius: 10, cursor: 'pointer', transition: 'border-color .15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#0B9E88'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E0DDD8'}
              >
                <span style={{ fontSize: 22 }}>{type === 'audio' ? '🎵' : '🖼️'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{f.original_name}</div>
                  <div style={{ fontSize: 11, color: '#8A8580' }}>{Math.round(f.size_bytes / 1024)} KB · {f.filename}</div>
                </div>
                {type === 'audio' && (
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={e => {
                      e.stopPropagation();
                      const a = new Audio(f.url);
                      a.play().catch(() => {});
                    }}
                   title="Abspielen"><IconPlay style={{width:13,height:13}}/></button>
                )}
                <button className="btn btn-primary btn-xs" onClick={e => { e.stopPropagation(); onSelect(f.filename); onClose(); }}>
                  Wählen
                </button>
              </div>
            ))}
            {files.length === 0 && (
              <div style={{ textAlign: 'center', padding: 32, color: '#8A8580' }}>
                Noch keine {type === 'audio' ? 'Audio-' : 'Bild-'}Dateien. Lade eine hoch!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Exercises Tab ───────────────────────────────────────────────────────────
function ExercisesTab() {
  const [exercises, setExercises]   = useState([]);
  const [lessons,   setLessons]     = useState([]);
  const [courses,   setCourses]     = useState([]);
  const [pairId,    setPairId]      = useState('');
  const [lessonId,  setLessonId]    = useState('');
  const [modal,     setModal]       = useState(false);
  const [editEx,    setEditEx]      = useState(null);
  const [audioPickerOpen, setAudioPickerOpen] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'mc', question: '', answer: '',
    options: ['', '', '', ''],
    pairs: [{ k: '', t: '' }, { k: '', t: '' }],
    words: '', hint: '', tts_text: '',
    audio_file: '', image_file: '',
  });
  const toast = useToast();

  useEffect(() => {
    api.get('/courses/all').then(r => {
      setCourses(r.data);
      if (r.data[0]) setPairId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!pairId) return;
    api.get(`/lessons?pair_id=${pairId}`).then(r => {
      setLessons(r.data);
      if (r.data[0]) setLessonId(r.data[0].id);
    });
  }, [pairId]);

  useEffect(() => {
    if (lessonId) api.get(`/exercises?lesson_id=${lessonId}`).then(r => setExercises(r.data));
  }, [lessonId]);

  const resetForm = () => setForm({
    type: 'mc', question: '', answer: '',
    options: ['', '', '', ''], pairs: [{ k: '', t: '' }, { k: '', t: '' }],
    words: '', hint: '', tts_text: '', audio_file: '', image_file: '',
  });

  const openNew = () => { resetForm(); setEditEx(null); setModal(true); };

  const openEdit = (ex) => {
    setEditEx(ex);
    setForm({
      type:       ex.type,
      question:   ex.question,
      answer:     ex.answer,
      options:    ex.options  || ['', '', '', ''],
      pairs:      ex.pairs    || [{ k: '', t: '' }, { k: '', t: '' }],
      words:      Array.isArray(ex.words) ? ex.words.join(', ') : (ex.words || ''),
      hint:       ex.hint       || '',
      tts_text:   ex.tts_text   || '',
      audio_file: ex.audio_file || '',
      image_file: ex.image_file || '',
    });
    setModal(true);
  };

  const save = async () => {
    if (!lessonId || !form.question || !form.answer)
      return toast('Frage und Antwort sind Pflichtfelder', 'err');

    const payload = {
      lesson_id:  lessonId,
      type:       form.type,
      question:   form.question,
      answer:     form.answer,
      hint:       form.hint       || null,
      tts_text:   form.tts_text   || form.answer,
      audio_file: form.audio_file || null,
      image_file: form.image_file || null,
    };

    if (form.type === 'mc')
      payload.options = form.options.filter(Boolean);
    if (form.type === 'match')
      payload.pairs = form.pairs.filter(p => p.k && p.t);
    if (form.type === 'arrange')
      payload.words = form.words.split(',').map(w => w.trim()).filter(Boolean);

    try {
      if (editEx) {
        await api.patch(`/exercises/${editEx.id}`, payload);
        toast('Übung aktualisiert!', 'ok');
      } else {
        await api.post('/exercises', payload);
        toast('Übung erstellt!', 'ok');
      }
      setModal(false);
      api.get(`/exercises?lesson_id=${lessonId}`).then(r => setExercises(r.data));
    } catch { toast('Fehler beim Speichern', 'err'); }
  };

  const del = async id => {
    if (!confirm('Übung löschen?')) return;
    await api.delete(`/exercises/${id}`);
    api.get(`/exercises?lesson_id=${lessonId}`).then(r => setExercises(r.data));
    toast('Gelöscht', 'info');
  };

  const typeLabels = {
    mc: 'Multiple Choice', listen: 'Hören & Tippen',
    arrange: 'Wörter ordnen', match: 'Paare', fill: 'Lückentext',
  };
  const typeBadge = { mc: 'teal', listen: 'teal', arrange: 'sun', match: 'gray', fill: 'sun' };

  return (
    <div style={{ padding: '24px 20px' }}>
      {/* Media pickers */}
      <MediaPickerModal
        open={audioPickerOpen}
        type="audio"
        onClose={() => setAudioPickerOpen(false)}
        onSelect={f => setForm(prev => ({ ...prev, audio_file: f || '' }))}
      />
      <MediaPickerModal
        open={imagePickerOpen}
        type="image"
        onClose={() => setImagePickerOpen(false)}
        onSelect={f => setForm(prev => ({ ...prev, image_file: f || '' }))}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900 }}>✏️ Übungen</h2>
        <button className="btn btn-primary btn-md" onClick={openNew}><IconPlus style={{width:14,height:14}}/> Neue Übung</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="select" style={{ flex: 1, minWidth: 180 }} value={pairId} onChange={e => setPairId(e.target.value)}>
          {courses.map(c => <option key={c.id} value={c.id}>{c.from_flag} {c.from_name}</option>)}
        </select>
        <select className="select" style={{ flex: 1, minWidth: 180 }} value={lessonId} onChange={e => setLessonId(e.target.value)}>
          {lessons.map(l => <option key={l.id} value={l.id}>{l.emoji} {l.title_tr}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Frage</th><th>Typ</th><th>Antwort</th>
              <th>Audio</th><th>Bild</th><th>Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {exercises.map(e => (
              <tr key={e.id}>
                <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.question}
                </td>
                <td><Badge type={typeBadge[e.type] || 'gray'}>{typeLabels[e.type] || e.type}</Badge></td>
                <td style={{ color: '#0B9E88', fontWeight: 700, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.answer}
                </td>
                <td>
                  {e.audio_file
                    ? <span
                        title={e.audio_file}
                        style={{ color: '#5DD6F0', cursor: 'pointer', fontSize: 18 }}
                        onClick={() => { const a = new Audio(`/uploads/audio/${e.audio_file}`); a.play().catch(()=>{}); }}
                      >🎵</span>
                    : <span style={{ color: '#D94040', fontSize: 12, fontWeight: 700 }} title="Kein Audio — TTS-Fallback">⚠️ fehlt</span>
                  }
                </td>
                <td>
                  {e.image_file
                    ? <span title={e.image_file} style={{ fontSize: 18 }}>🖼️</span>
                    : <span style={{ color: '#8A8580' }}>—</span>
                  }
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => openEdit(e)}>✏️</button>
                  <button className="btn btn-ghost-danger btn-xs" onClick={() => del(e.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {exercises.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#8A8580' }}>
            Lektion wählen und Übungen hinzufügen
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editEx ? '✏️ Übung bearbeiten' : '✏️ Neue Übung erstellen'}
        footer={
          <>
            <button className="btn btn-ghost btn-md" onClick={() => setModal(false)}>Abbrechen</button>
            <button className="btn btn-primary btn-md" onClick={save}><IconSave style={{width:14,height:14}}/> Speichern</button>
          </>
        }
      >
        {/* Type + Answer */}
        <div className="form-grid">
          <div className="form-row">
            <label className="form-label">Übungstyp *</label>
            <select className="select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label className="form-label">Richtige Antwort *</label>
            <input className="input" value={form.answer}
              onChange={e => setForm({ ...form, answer: e.target.value })}
              placeholder="z.B. Silav" />
          </div>
        </div>

        {/* Question */}
        <div className="form-row">
          <label className="form-label">Frage / Aufgabe *</label>
          <input className="input" value={form.question}
            onChange={e => setForm({ ...form, question: e.target.value })}
            placeholder="z.B. Wie sagt man 'Hallo' auf Kurmanji?" />
        </div>

        {/* MC Options */}
        {form.type === 'mc' && (
          <div className="form-row">
            <label className="form-label">Antwortoptionen</label>
            <p style={{ fontSize: 12, color: '#8A8580', marginBottom: 8 }}>
              Erste Option = richtige Antwort (muss mit "Richtige Antwort" übereinstimmen)
            </p>
            {form.options.map((o, i) => (
              <input key={i} className="input" value={o} style={{ marginBottom: 6 }}
                onChange={e => {
                  const opts = [...form.options];
                  opts[i] = e.target.value;
                  setForm({ ...form, options: opts });
                }}
                placeholder={i === 0 ? 'Richtige Option (= Antwort oben)' : `Falsche Option ${i}`}
              />
            ))}
          </div>
        )}

        {/* Match Pairs */}
        {form.type === 'match' && (
          <div className="form-row">
            <label className="form-label">Paare (Kurdisch ↔ Übersetzung)</label>
            {form.pairs.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input className="input" value={p.k} placeholder="Kurdisch" style={{ flex: 1 }}
                  onChange={e => {
                    const pairs = [...form.pairs];
                    pairs[i] = { ...pairs[i], k: e.target.value };
                    setForm({ ...form, pairs });
                  }} />
                <span style={{ color: '#8A8580', fontWeight: 900 }}>↔</span>
                <input className="input" value={p.t} placeholder="Übersetzung" style={{ flex: 1 }}
                  onChange={e => {
                    const pairs = [...form.pairs];
                    pairs[i] = { ...pairs[i], t: e.target.value };
                    setForm({ ...form, pairs });
                  }} />
                <button className="btn btn-ghost-danger btn-xs"
                  onClick={() => setForm({ ...form, pairs: form.pairs.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button className="btn btn-ghost btn-sm"
              onClick={() => setForm({ ...form, pairs: [...form.pairs, { k: '', t: '' }] })}>
              ➕ Paar hinzufügen
            </button>
          </div>
        )}

        {/* Arrange Words */}
        {form.type === 'arrange' && (
          <div className="form-row">
            <label className="form-label">Wörter (Komma-getrennt)</label>
            <input className="input" value={form.words}
              onChange={e => setForm({ ...form, words: e.target.value })}
              placeholder="Ez, ji, Almanyayê, me" />
            <p className="form-hint">Werden in zufälliger Reihenfolge angezeigt. Richtige Reihenfolge = "Richtige Antwort"</p>
          </div>
        )}

        {/* TTS Fallback + Hint */}
        <div className="form-grid">
          <div className="form-row">
            <label className="form-label">TTS-Fallback-Text</label>
            <input className="input" value={form.tts_text}
              onChange={e => setForm({ ...form, tts_text: e.target.value })}
              placeholder="Wird nur vorgelesen wenn kein Audio vorhanden" />
            <p className="form-hint">Nur als Notfall-Fallback — eigene Aufnahme ist besser!</p>
          </div>
          <div className="form-row">
            <label className="form-label">Lern-Hinweis</label>
            <input className="input" value={form.hint}
              onChange={e => setForm({ ...form, hint: e.target.value })}
              placeholder="Tipp für Lernende…" />
          </div>
        </div>

        {/* ── Audio & Bild Zuweisung ── */}
        <div style={{ borderTop: '2px solid #E0DDD8', paddingTop: 16, marginTop: 8 }}>
          <label className="form-label" style={{ marginBottom: 10 }}>🎵 Audio-Aufnahme & 🖼️ Bild zuweisen</label>
          <div className="form-grid">
            {/* Audio */}
            <div className="form-row">
              <label className="form-label">Audio-Datei</label>
              {/* Current file display */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <div style={{
                  flex: 1, padding: '10px 12px', border: '2px solid #E0DDD8',
                  borderRadius: 10, fontSize: 13, fontWeight: 600,
                  color: form.audio_file ? '#0B9E88' : '#D94040',
                  background: form.audio_file ? '#D0F5EF' : '#FFF5F5',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {form.audio_file ? `🎵 ${form.audio_file}` : '⚠️ Kein Audio — bitte aufnehmen oder hochladen!'}
                </div>
                {form.audio_file && (
                  <button className="btn btn-ghost btn-xs"
                    onClick={() => { const a = new Audio(`/uploads/audio/${form.audio_file}`); a.play().catch(()=>{}); }}
                    title="Abspielen"><IconPlay style={{width:13,height:13}}/></button>
                )}
                {form.audio_file && (
                  <button className="btn btn-ghost-danger btn-xs"
                    onClick={() => setForm({ ...form, audio_file: '' })} title="Entfernen">✕</button>
                )}
              </div>
              {/* Inline Upload + Library buttons */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <DirectUploadButton
                  onUploaded={(filename) => setForm(prev => ({ ...prev, audio_file: filename }))}
                  label={form.answer || form.tts_text}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setAudioPickerOpen(true)}>
                  📂 Aus Bibliothek wählen
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="form-row">
              <label className="form-label">Bild-Datei</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  flex: 1, padding: '10px 12px', border: '2px solid #E0DDD8',
                  borderRadius: 10, fontSize: 13, fontWeight: 600,
                  color: form.image_file ? '#E8A020' : '#8A8580',
                  background: form.image_file ? '#FEF3DC' : '#F5F4F1',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {form.image_file ? `🖼️ ${form.image_file}` : '— Kein Bild —'}
                </div>
                <button className="btn btn-accent btn-xs" onClick={() => setImagePickerOpen(true)}>
                  📂 Wählen
                </button>
                {form.image_file && (
                  <button className="btn btn-ghost-danger btn-xs"
                    onClick={() => setForm({ ...form, image_file: '' })} title="Entfernen">✕</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Vocab Tab ────────────────────────────────────────────────────────────────
function VocabTab() {
  const [vocab, setVocab]   = useState([]);
  const [courses, setCourses] = useState([]);
  const [pairId, setPairId] = useState('');
  const [q, setQ]           = useState('');
  const [modal, setModal]   = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm]     = useState({ kurdish:'', translation:'', pronunciation:'', word_type:'noun', difficulty:'A1', audio_file:'', example_ku:'', example_tr:'' });
  const toast = useToast();

  useEffect(() => { api.get('/courses/all').then(r => { setCourses(r.data); if (r.data[0]) setPairId(r.data[0].id); }); }, []);
  const load = () => { if (pairId) api.get(`/vocab?pair_id=${pairId}${q?`&q=${q}`:''}`).then(r => setVocab(r.data)); };
  useEffect(() => { load(); }, [pairId, q]);

  const openNew = () => {
    setEditId(null);
    setForm({ kurdish:'', translation:'', pronunciation:'', word_type:'noun', difficulty:'A1', audio_file:'', example_ku:'', example_tr:'' });
    setModal(true);
  };

  const openEdit = (v) => {
    setEditId(v.id);
    setForm({
      kurdish: v.kurdish, translation: v.translation, pronunciation: v.pronunciation || '',
      word_type: v.word_type || 'noun', difficulty: v.difficulty || 'A1',
      audio_file: v.audio_file || '', example_ku: v.example_ku || '', example_tr: v.example_tr || '',
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.kurdish || !form.translation) return toast('Kurdisch und Übersetzung sind Pflicht', 'err');
    try {
      if (editId) {
        await api.patch(`/vocab/${editId}`, form);
        toast('Vokabel aktualisiert!', 'ok');
      } else {
        await api.post('/vocab', { ...form, pair_id: pairId });
        toast('Vokabel gespeichert!', 'ok');
      }
      setModal(false); setEditId(null); load();
    } catch { toast('Fehler', 'err'); }
  };

  const del = async id => { await api.delete(`/vocab/${id}`); load(); toast('Gelöscht', 'info'); };

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900 }}>📖 Vokabeln</h2>
        <button className="btn btn-primary btn-md" onClick={openNew}><IconPlus style={{width:14,height:14}}/> Vokabel</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select className="select" style={{ flex: 1, minWidth: 200 }} value={pairId} onChange={e => setPairId(e.target.value)}>
          {courses.map(c => <option key={c.id} value={c.id}>{c.from_flag} {c.from_name} → Kurdisch</option>)}
        </select>
        <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="🔍 Suchen…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Kurdisch</th><th>Übersetzung</th><th>Aussprache</th><th>Typ</th><th>Niveau</th><th>Audio</th><th>Aktionen</th></tr></thead>
          <tbody>
            {vocab.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 800, color: '#0B9E88' }}>{v.kurdish}</td>
                <td>{v.translation}</td>
                <td><code style={{ fontSize: 12, color: '#8A8580' }}>{v.pronunciation || '—'}</code></td>
                <td><Badge type="gray">{v.word_type}</Badge></td>
                <td><Badge type="teal">{v.difficulty}</Badge></td>
                <td>
                  {v.audio_file
                    ? <span style={{ cursor: 'pointer', fontSize: 18 }} title={v.audio_file}
                        onClick={() => { const a = new Audio(`/uploads/audio/${v.audio_file}`); a.play().catch(()=>{}); }}>🎵</span>
                    : <span style={{ color: '#D94040', fontSize: 12, fontWeight: 700 }}>⚠️ fehlt</span>
                  }
                </td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-xs" title="Bearbeiten" onClick={() => openEdit(v)}><IconPencil style={{width:13,height:13}}/></button>
                  <button className="btn btn-ghost-danger btn-xs" onClick={() => del(v.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vocab.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#8A8580' }}>Keine Vokabeln</div>}
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditId(null); }} title={editId ? '📖 Vokabel bearbeiten' : '📖 Neue Vokabel'}
        footer={<><button className="btn btn-ghost btn-md" onClick={() => { setModal(false); setEditId(null); }}>Abbrechen</button><button className="btn btn-primary btn-md" onClick={save}><IconSave style={{width:14,height:14}}/> Speichern</button></>}>
        <div className="form-grid">
          <div className="form-row"><label className="form-label">Kurdisch *</label><input className="input" value={form.kurdish} onChange={e => setForm({...form,kurdish:e.target.value})} placeholder="Silav" /></div>
          <div className="form-row"><label className="form-label">Übersetzung *</label><input className="input" value={form.translation} onChange={e => setForm({...form,translation:e.target.value})} placeholder="Hallo" /></div>
          <div className="form-row"><label className="form-label">Aussprache</label><input className="input" value={form.pronunciation} onChange={e => setForm({...form,pronunciation:e.target.value})} placeholder="si-LAV" /></div>
          <div className="form-row"><label className="form-label">Wortart</label><select className="select" value={form.word_type} onChange={e => setForm({...form,word_type:e.target.value})}>{['noun','verb','adjective','phrase','number','adverb','pronoun'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="form-row"><label className="form-label">Niveau</label><select className="select" value={form.difficulty} onChange={e => setForm({...form,difficulty:e.target.value})}>{['A1','A2','B1','B2'].map(d=><option key={d}>{d}</option>)}</select></div>
        </div>
        {/* Example sentences */}
        <div className="form-grid" style={{ marginTop: 12 }}>
          <div className="form-row"><label className="form-label">Beispiel (Kurdisch)</label><input className="input" value={form.example_ku} onChange={e => setForm({...form,example_ku:e.target.value})} placeholder="Silav, navê min Azad e." /></div>
          <div className="form-row"><label className="form-label">Beispiel (Übersetzung)</label><input className="input" value={form.example_tr} onChange={e => setForm({...form,example_tr:e.target.value})} placeholder="Hallo, mein Name ist Azad." /></div>
        </div>
        {/* Audio upload */}
        <div style={{ borderTop: '2px solid #E0DDD8', paddingTop: 14, marginTop: 14 }}>
          <label className="form-label" style={{ marginBottom: 8 }}>🎵 Audio-Datei</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <div style={{
              flex: 1, padding: '10px 12px', border: '2px solid #E0DDD8',
              borderRadius: 10, fontSize: 13, fontWeight: 600,
              color: form.audio_file ? '#0B9E88' : '#D94040',
              background: form.audio_file ? '#D0F5EF' : '#FFF5F5',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
            }}>
              {form.audio_file ? `🎵 ${form.audio_file}` : '⚠️ Kein Audio — bitte hochladen!'}
            </div>
            {form.audio_file && (
              <button className="btn btn-ghost btn-xs"
                onClick={() => { const a = new Audio(`/uploads/audio/${form.audio_file}`); a.play().catch(()=>{}); }}
                title="Abspielen"><IconPlay style={{width:13,height:13}}/></button>
            )}
            {form.audio_file && (
              <button className="btn btn-ghost-danger btn-xs"
                onClick={() => setForm({ ...form, audio_file: '' })} title="Entfernen">✕</button>
            )}
          </div>
          <DirectUploadButton
            onUploaded={(filename) => setForm(prev => ({ ...prev, audio_file: filename }))}
            label={form.kurdish}
          />
        </div>
      </Modal>
    </div>
  );
}

// ── Media Tab ────────────────────────────────────────────────────────────────
function MediaTab() {
  const [files, setFiles]   = useState([]);
  const [type, setType]     = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const toast = useToast();

  const load = () => api.get(`/media${type?`?type=${type}`:''}`).then(r => setFiles(r.data));
  useEffect(() => { load(); }, [type]);

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Datei hochgeladen!', 'ok'); load();
    } catch { toast('Upload fehlgeschlagen', 'err'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const del = async id => {
    await api.delete(`/media/${id}`); load(); toast('Gelöscht', 'info');
  };

  const copy = (url) => {
    navigator.clipboard.writeText(url);
    toast('URL kopiert!', 'info');
  };

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 22, fontWeight: 900 }}>🖼️ Medien-Bibliothek</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input ref={fileRef} type="file" accept="audio/*,image/*" style={{ display: 'none' }} onChange={upload} />
          <button className="btn btn-primary btn-md" onClick={() => fileRef.current.click()} disabled={uploading}>
            {uploading ? '⏳ Lädt hoch…' : '⬆️ Datei hochladen'}
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        style={{ border: '2px dashed #E0DDD8', borderRadius: 14, padding: 28, textAlign: 'center', cursor: 'pointer', background: '#fafbfc', marginBottom: 20 }}
        onClick={() => fileRef.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const dt = new DataTransfer(); dt.items.add(f); fileRef.current.files = dt.files; upload({ target: fileRef.current }); } }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>📁</div>
        <p style={{ fontWeight: 700, color: '#8A8580', fontSize: 14 }}>Datei hier ablegen oder klicken</p>
        <span style={{ fontSize: 12, color: '#8A8580' }}>MP3, WAV, JPG, PNG, WebP · max. 15 MB</span>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['', 'Alle'], ['audio', '🎵 Audio'], ['image', '🖼️ Bilder']].map(([v, l]) => (
          <button key={v} className={`btn btn-sm ${type === v ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setType(v)}>{l}</button>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
        {files.map(f => (
          <div key={f.id} className="card" style={{ padding: 12, position: 'relative' }}>
            <div style={{ height: 72, background: '#F5F4F1', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 8 }}>
              {f.file_type === 'audio' ? '🎵' : '🖼️'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#2C3A4A' }}>{f.original_name}</div>
            <div style={{ fontSize: 11, color: '#8A8580', marginTop: 2 }}>{Math.round(f.size_bytes / 1024)} KB</div>
            <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
              <button className="btn btn-ghost btn-xs" style={{ flex: 1 }} onClick={() => copy(f.url)}><IconLink style={{width:13,height:13}}/></button>
              <button className="btn btn-ghost-danger btn-xs" onClick={() => del(f.id)}>🗑️</button>
            </div>
          </div>
        ))}
        {files.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40, color: '#8A8580' }}>Keine Dateien</div>}
      </div>
    </div>
  );
}

// ── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const toast = useToast();

  const load = () => api.get('/admin/users').then(r => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const del = async id => {
    if (!confirm('Nutzer löschen?')) return;
    await api.delete(`/admin/users/${id}`); load(); toast('Nutzer gelöscht', 'info');
  };

  const promote = async (u) => {
    await api.patch(`/admin/users/${u.id}`, { role: u.role === 'admin' ? 'user' : 'admin' });
    load(); toast('Rolle geändert', 'ok');
  };

  return (
    <div style={{ padding: '24px 20px' }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 20 }}>👥 Nutzerverwaltung</h2>
      <div style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead><tr><th>Nutzer</th><th>Streak</th><th>XP</th><th>Gems</th><th>Rolle</th><th>Letzter Login</th><th>Aktionen</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.role === 'admin' ? '#0B9E88' : '#6B48FF', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13 }}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: '#8A8580' }}>{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>🔥 {u.streak}</td>
                <td style={{ color: '#5DD6F0', fontWeight: 700 }}>⚡ {u.total_xp.toLocaleString()}</td>
                <td style={{ color: '#B594FF', fontWeight: 700 }}>💎 {u.gems}</td>
                <td><Badge type={u.role === 'admin' ? 'teal' : 'gray'}>{u.role}</Badge></td>
                <td style={{ fontSize: 12, color: '#8A8580' }}>{u.last_login ? new Date(u.last_login).toLocaleDateString('de-DE') : '—'}</td>
                <td style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => promote(u)} title="Rolle wechseln">
                    {u.role === 'admin' ? '👤' : '⚙️'}
                  </button>
                  <button className="btn btn-ghost-danger btn-xs" onClick={() => del(u.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Audio Manager Tab ─────────────────────────────────────────────────────────
function AudioManagerTab() {
  const [files,     setFiles]     = useState([]);
  const [exercises, setExercises] = useState([]);
  const [lessons,   setLessons]   = useState([]);
  const [courses,   setCourses]   = useState([]);
  const [pairId,    setPairId]    = useState('');
  const [lessonId,  setLessonId]  = useState('');
  const [search,    setSearch]    = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editKurd,  setEditKurd]  = useState('');
  const [view,      setView]      = useState('files'); // 'files' | 'assign'
  const [currentAudio, setCurrentAudio] = useState(null);
  const fileInputRef = useRef();
  const toast = useToast();

  // Load courses
  useEffect(() => {
    api.get('/courses/all').then(r => {
      setCourses(r.data);
      if (r.data[0]) setPairId(r.data[0].id);
    });
  }, []);

  // Load lessons when pair changes
  useEffect(() => {
    if (pairId) api.get(`/lessons?pair_id=${pairId}`).then(r => {
      setLessons(r.data);
      if (r.data[0]) setLessonId(r.data[0].id);
    });
  }, [pairId]);

  // Load exercises when lesson changes
  useEffect(() => {
    if (lessonId) api.get(`/exercises?lesson_id=${lessonId}`).then(r => setExercises(r.data));
  }, [lessonId]);

  const loadFiles = () => {
    const q = search ? `&q=${encodeURIComponent(search)}` : '';
    api.get(`/media?type=audio${q}`).then(r => setFiles(r.data)).catch(() => {});
  };
  useEffect(() => { loadFiles(); }, [search]);

  // Upload handler — supports multiple files at once
  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setUploading(true);

    const fd = new FormData();
    selected.forEach(f => fd.append('files', f));
    if (pairId) fd.append('pair_id', pairId);

    try {
      await api.post('/media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast(`${selected.length} Datei(en) hochgeladen!`, 'ok');
      loadFiles();
    } catch { toast('Upload fehlgeschlagen', 'err'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  // Drag & drop
  const handleDrop = async (e) => {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#E0DDD8';
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('audio/') || f.type === 'video/webm');
    if (!dropped.length) return toast('Nur Audio-Dateien erlaubt', 'err');

    setUploading(true);
    const fd = new FormData();
    dropped.forEach(f => fd.append('files', f));
    if (pairId) fd.append('pair_id', pairId);

    try {
      await api.post('/media/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast(`${dropped.length} Aufnahme(n) hochgeladen!`, 'ok');
      loadFiles();
    } catch { toast('Upload fehlgeschlagen', 'err'); }
    finally { setUploading(false); }
  };

  // Play preview
  const playPreview = (url) => {
    if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }
    const audio = new Audio(url);
    setCurrentAudio(audio);
    audio.play().catch(() => {});
    audio.onended = () => setCurrentAudio(null);
  };

  // Save label edit
  const saveEdit = async (id) => {
    try {
      await api.patch(`/media/${id}`, { label: editLabel, kurdish_text: editKurd });
      toast('Gespeichert!', 'ok');
      setEditingId(null);
      loadFiles();
    } catch { toast('Fehler beim Speichern', 'err'); }
  };

  // Assign audio to exercise
  const assignAudio = async (exId, filename) => {
    try {
      await api.patch(`/exercises/${exId}`, { audio_file: filename || null });
      toast(filename ? `Audio zugewiesen!` : 'Audio entfernt', 'ok');
      api.get(`/exercises?lesson_id=${lessonId}`).then(r => setExercises(r.data));
    } catch { toast('Fehler', 'err'); }
  };

  // Delete file
  const deleteFile = async (id, filename) => {
    if (!confirm(`"${filename}" wirklich löschen?`)) return;
    try {
      await api.delete(`/media/${id}`);
      toast('Datei gelöscht', 'info');
      loadFiles();
    } catch { toast('Fehler beim Löschen', 'err'); }
  };

  const filteredFiles = files.filter(f =>
    !search ||
    f.label?.toLowerCase().includes(search.toLowerCase()) ||
    f.kurdish_text?.toLowerCase().includes(search.toLowerCase()) ||
    f.original_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '24px 20px' }}>
      <input ref={fileInputRef} type="file" accept="audio/*,video/webm" multiple
        style={{ display: 'none' }} onChange={handleUpload} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                    marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>🎙️ Audio-Manager</h2>
          <p style={{ color: '#8A8580', fontSize: 14, marginTop: 3 }}>
            Aufnahmen hochladen · beschriften · Übungen zuweisen
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className={`btn btn-sm ${view === 'files' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('files')}>
            📁 Dateien ({files.length})
          </button>
          <button
            className={`btn btn-sm ${view === 'assign' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setView('assign')}>
            🔗 Zuweisen
          </button>
        </div>
      </div>

      {/* ── FILES VIEW ── */}
      {view === 'files' && (
        <>
          {/* Upload zone */}
          <div
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#0B9E88'; }}
            onDragLeave={e => { e.currentTarget.style.borderColor = '#E0DDD8'; }}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
            style={{
              border: '2px dashed #E0DDD8', borderRadius: 16, padding: '32px 20px',
              textAlign: 'center', cursor: 'pointer', background: '#FAFBFC',
              marginBottom: 20, transition: 'border-color .2s',
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎙️</div>
            {uploading ? (
              <p style={{ fontWeight: 700, color: '#0B9E88' }}>⏳ Wird hochgeladen…</p>
            ) : (
              <>
                <p style={{ fontWeight: 800, fontSize: 15 }}>
                  Aufnahmen hier ablegen oder klicken
                </p>
                <p style={{ fontSize: 13, color: '#8A8580', marginTop: 6 }}>
                  Mehrere Dateien gleichzeitig möglich · Alle Audio-Formate erlaubt · max. 30 MB pro Datei
                </p>
              </>
            )}
          </div>

          {/* Naming guide */}
          <div style={{ background: '#FEF3DC', border: '2px solid #E8A020', borderRadius: 12,
                        padding: '12px 16px', marginBottom: 16, fontSize: 13 }}>
            <strong style={{ color: '#7A4800' }}>💡 Tipp:</strong>
            <span style={{ color: '#7A4800' }}>
              {' '}Benenne Dateien so: <code style={{ background: 'rgba(0,0,0,.08)', padding: '1px 5px', borderRadius: 4 }}>silav.mp3</code>,{' '}
              <code style={{ background: 'rgba(0,0,0,.08)', padding: '1px 5px', borderRadius: 4 }}>nave_min_ali_ye.mp3</code> — dann kannst du unten den kurdischen Text eingeben um sie Übungen zuzuweisen.
            </span>
          </div>

          {/* Search */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff',
                          border: '2px solid #E0DDD8', borderRadius: 11, padding: '7px 13px', flex: 1 }}>
              <span style={{ fontSize: 16 }}><IconSearch style={{width:16,height:16}}/></span>
              <input
                style={{ border: 'none', outline: 'none', fontFamily: 'var(--font)', fontSize: 14,
                         fontWeight: 600, flex: 1, background: 'none' }}
                placeholder="Suche nach Name, Beschriftung, kurdischem Text…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Files list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredFiles.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#8A8580' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎙️</div>
                <p style={{ fontWeight: 700 }}>Noch keine Aufnahmen</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Lade deine ersten Aufnahmen hoch!</p>
              </div>
            )}
            {filteredFiles.map(f => (
              <div key={f.id} style={{
                background: '#fff', border: '2px solid #E0DDD8', borderRadius: 14,
                padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {/* Play button */}
                <button
                  onClick={() => playPreview(f.url)}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', background: '#0B9E88',
                    border: 'none', cursor: 'pointer', color: 'white', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, boxShadow: '0 3px 0 #097560',
                  }} title="Abspielen"><IconPlay style={{width:13,height:13}}/></button>

                {/* File info / edit */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingId === f.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        className="input"
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        placeholder="Beschriftung (z.B. Hallo)"
                        style={{ padding: '7px 10px', fontSize: 13 }}
                      />
                      <input
                        className="input"
                        value={editKurd}
                        onChange={e => setEditKurd(e.target.value)}
                        placeholder="Kurdischer Text genau (z.B. Silav)"
                        style={{ padding: '7px 10px', fontSize: 13 }}
                      />
                    </div>
                  ) : (
                    <>
                      <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {f.label || f.original_name}
                        {f.kurdish_text && (
                          <span style={{ background: '#D0F5EF', color: '#076558', fontSize: 12,
                                         fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
                            {f.kurdish_text}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#8A8580', marginTop: 2 }}>
                        {f.original_name} · {Math.round(f.size_bytes / 1024)} KB
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {editingId === f.id ? (
                    <>
                      <button className="btn btn-primary btn-xs" onClick={() => saveEdit(f.id)}><IconSave style={{width:13,height:13}}/></button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setEditingId(null)}>✕</button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-ghost btn-xs"
                        title="Beschriftung bearbeiten"
                        onClick={() => {
                          setEditingId(f.id);
                          setEditLabel(f.label || '');
                          setEditKurd(f.kurdish_text || '');
                        }}>✏️</button>
                      <button
                        className="btn btn-ghost-danger btn-xs"
                        onClick={() => deleteFile(f.id, f.original_name)}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── ASSIGN VIEW ── */}
      {view === 'assign' && (
        <>
          <p style={{ fontSize: 14, color: '#8A8580', marginBottom: 16 }}>
            Wähle Sprachpaar → Lektion → Übung und weise jeweils eine Audio-Datei zu.
          </p>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <select className="select" style={{ flex: 1, minWidth: 180 }}
              value={pairId} onChange={e => setPairId(e.target.value)}>
              {courses.map(c => <option key={c.id} value={c.id}>{c.from_flag} {c.from_name}</option>)}
            </select>
            <select className="select" style={{ flex: 1, minWidth: 180 }}
              value={lessonId} onChange={e => setLessonId(e.target.value)}>
              {lessons.map(l => <option key={l.id} value={l.id}>{l.emoji} {l.title_tr}</option>)}
            </select>
          </div>

          {exercises.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#8A8580' }}>
              Lektion wählen um Übungen zu sehen
            </div>
          )}

          {/* Exercise → Audio assignment */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {exercises.map(ex => (
              <div key={ex.id} style={{
                background: '#fff', border: `2px solid ${ex.audio_file ? '#0B9E88' : '#E0DDD8'}`,
                borderRadius: 14, padding: '14px 16px',
              }}>
                {/* Exercise info */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    background: '#EAF3DE', color: '#3B6D11', fontSize: 11, fontWeight: 800,
                    padding: '3px 9px', borderRadius: 20, flexShrink: 0, marginTop: 2,
                  }}>
                    {ex.type === 'mc' ? 'MC' : ex.type === 'listen' ? 'Hören' :
                     ex.type === 'arrange' ? 'Ordnen' : ex.type === 'match' ? 'Paare' : ex.type}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ex.question}</div>
                    <div style={{ fontSize: 12, color: '#0B9E88', marginTop: 2 }}>
                      Antwort: <strong>{ex.answer}</strong>
                    </div>
                  </div>
                </div>

                {/* Current audio + selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {/* Current status */}
                  {ex.audio_file ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#D0F5EF',
                                  borderRadius: 10, padding: '6px 12px', flex: 1, minWidth: 180 }}>
                      <button
                        onClick={() => playPreview(`/uploads/audio/${ex.audio_file}`)}
                        style={{ width: 28, height: 28, borderRadius: '50%', background: '#0B9E88',
                                 border: 'none', cursor: 'pointer', color: 'white', fontSize: 12,
                                 flexShrink: 0 }} title="Abspielen"><IconPlay style={{width:13,height:13}}/></button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#076558',
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🎵 {ex.audio_file}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, padding: '6px 12px', background: '#F5F4F1',
                                  borderRadius: 10, fontSize: 12, fontWeight: 700, color: '#8A8580',
                                  minWidth: 180 }}>
                      ⚠️ Kein Audio zugewiesen
                    </div>
                  )}

                  {/* Audio selector dropdown */}
                  <select
                    className="select"
                    style={{ flex: 1, minWidth: 200, fontSize: 13 }}
                    value={ex.audio_file || ''}
                    onChange={e => assignAudio(ex.id, e.target.value)}
                  >
                    <option value="">— Kein Audio —</option>
                    {files.map(f => (
                      <option key={f.id} value={f.filename}>
                        {f.label || f.original_name}
                        {f.kurdish_text ? ` (${f.kurdish_text})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Upload directly per exercise */}
                  {!ex.audio_file && (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <DirectUploadButton
                        onUploaded={(filename) => { assignAudio(ex.id, filename); loadFiles(); }}
                        label={ex.answer || ex.tts_text}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {exercises.length > 0 && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: '#F5F4F1',
                          borderRadius: 12, fontSize: 13, color: '#8A8580' }}>
              <strong>Zugewiesen:</strong>{' '}
              {exercises.filter(e => e.audio_file).length} / {exercises.length} Übungen haben Audio
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Kurdistan Admin Tab ───────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
function KurdistanAdminTab() {
  const [section, setSection] = React.useState('celebrities');

  const sections = [
    { id: 'celebrities', label: '🧑‍🎤 Berühmtheiten' },
    { id: 'stories',     label: '📖 Geschichten'    },
    { id: 'events',      label: '📅 Tages-Events'   },
    { id: 'community',   label: '💬 Community-Chat' },
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>🏔️ Kurdistan-Verwaltung</h2>
      <p style={{ fontSize: 14, color: '#8A8580', marginBottom: 24 }}>
        Berühmtheiten, Geschichten und historische Ereignisse pflegen
      </p>

      {/* Sub-Tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 28,
        borderBottom: '2px solid #E0DDD8',
      }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            padding: '10px 18px', border: 'none', background: 'none',
            fontFamily: 'var(--font)', fontWeight: 800, fontSize: 13,
            cursor: 'pointer', color: section === s.id ? '#0B9E88' : '#8A8580',
            borderBottom: `3px solid ${section === s.id ? '#0B9E88' : 'transparent'}`,
            marginBottom: -2, transition: 'color .15s',
          }}>{s.label}</button>
        ))}
      </div>

      {section === 'celebrities' && <CelebritiesAdmin />}
      {section === 'stories'     && <StoriesAdmin />}
      {section === 'events'      && <EventsAdmin />}
      {section === 'community'   && <CommunityAdmin />}
    </div>
  );
}

// ── Berühmtheiten-Verwaltung ──────────────────────────────────────────────────
function CelebritiesAdmin() {
  const [items,   setItems]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form,    setForm]    = React.useState(null); // null=list, 'new'=neu, id=edit
  const [saving,  setSaving]  = React.useState(false);
  const [msg,     setMsg]     = React.useState('');

  const EMPTY = { name:'', image_url:'', birth_year:'', category:'musik',
    description:'', fun_fact:'', options:['','','',''] };
  const [data, setData] = React.useState(EMPTY);

  const load = () => {
    setLoading(true);
    api.get('/kurdistan/celebrities')
      .then(r => { setItems(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  React.useEffect(load, []);

  const openNew  = () => { setData(EMPTY); setForm('new'); setMsg(''); };
  const openEdit = (item) => {
    setData({
      name: item.name, image_url: item.image_url||'',
      birth_year: item.birth_year||'', category: item.category,
      description: item.description, fun_fact: item.fun_fact||'',
      options: item.options?.length === 4 ? item.options : ['','','',''],
    });
    setForm(item.id);
    setMsg('');
  };

  const save = async () => {
    if (!data.name || !data.description) return setMsg('Name und Beschreibung sind Pflichtfelder.');
    const opts = data.options.filter(o => o.trim());
    if (opts.length < 2) return setMsg('Mindestens 2 Antwortoptionen erforderlich.');
    if (!opts.includes(data.name)) return setMsg('Eine Option muss der richtige Name sein.');
    setSaving(true); setMsg('');
    try {
      const payload = { ...data, birth_year: data.birth_year ? Number(data.birth_year) : null,
        options: data.options.filter(o => o.trim()) };
      if (form === 'new') {
        await api.post('/kurdistan/celebrities', payload);
      } else {
        await api.patch(`/kurdistan/celebrities/${form}`, payload);
      }
      setMsg('✅ Gespeichert!');
      load();
      setTimeout(() => setForm(null), 800);
    } catch(e) {
      setMsg('❌ ' + (e.response?.data?.error || e.message));
    } finally { setSaving(false); }
  };

  const del = async (id, name) => {
    if (!window.confirm(`"${name}" wirklich löschen?`)) return;
    await api.delete(`/kurdistan/celebrities/${id}`);
    load();
  };

  if (form !== null) return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setForm(null)} className="btn btn-ghost btn-sm">← Zurück</button>
        <h3 style={{ fontWeight: 900, fontSize: 18 }}>{form === 'new' ? 'Neue Berühmtheit' : 'Bearbeiten'}</h3>
      </div>

      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16,
        background: msg.startsWith('✅') ? '#D0F5EF' : '#FFE8E8',
        color: msg.startsWith('✅') ? '#044f43' : '#8c1f1f', fontWeight: 700, fontSize: 13 }}>{msg}</div>}

      <AdminFormField label="Name *">
        <input className="input" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="z.B. Şivan Perwer" />
      </AdminFormField>
      <AdminFormField label="Bild-URL">
        <input className="input" value={data.image_url} onChange={e => setData({...data, image_url: e.target.value})} placeholder="https://... (leer = Emoji-Platzhalter)" />
        {data.image_url && <img src={data.image_url} alt="" style={{ marginTop: 8, height: 80, borderRadius: 10, objectFit: 'cover' }} />}
      </AdminFormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AdminFormField label="Geburtsjahr">
          <input className="input" type="number" value={data.birth_year} onChange={e => setData({...data, birth_year: e.target.value})} placeholder="z.B. 1955" />
        </AdminFormField>
        <AdminFormField label="Kategorie">
          <select className="input" value={data.category} onChange={e => setData({...data, category: e.target.value})}>
            {['musik','literatur','sport','politik','kultur','wissenschaft','film','kunst'].map(c =>
              <option key={c} value={c}>{c}</option>)}
          </select>
        </AdminFormField>
      </div>
      <AdminFormField label="Beschreibung *">
        <textarea className="input" rows={4} value={data.description}
          onChange={e => setData({...data, description: e.target.value})}
          placeholder="Wer ist diese Person? Was hat sie geleistet?" style={{ resize: 'vertical' }} />
      </AdminFormField>
      <AdminFormField label="Fun Fact">
        <input className="input" value={data.fun_fact} onChange={e => setData({...data, fun_fact: e.target.value})} placeholder="Interessante Zusatzinfo…" />
      </AdminFormField>
      <AdminFormField label="4 Antwortoptionen * (eine davon muss der richtige Name sein)">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: opt === data.name && opt ? '#D0F5EF' : '#F5F4F1',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
                color: opt === data.name && opt ? '#044f43' : '#8A8580',
              }}>{i + 1}</span>
              <input className="input" value={opt} style={{ flex: 1 }}
                onChange={e => {
                  const opts = [...data.options];
                  opts[i] = e.target.value;
                  setData({...data, options: opts});
                }}
                placeholder={i === 0 ? 'Richtige Antwort (= Name oben)' : `Falsche Option ${i}`} />
              {opt === data.name && opt && <span style={{ fontSize: 16 }}>✅</span>}
            </div>
          ))}
        </div>
      </AdminFormField>

      <button onClick={save} disabled={saving} className="btn btn-primary btn-lg"
        style={{ marginTop: 8 }}>
        {saving ? 'Speichert…' : '💾 Speichern'}
      </button>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#8A8580' }}>Lädt…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontWeight: 700, color: '#8A8580' }}>{items.length} Berühmtheit(en)</span>
        <button onClick={openNew} className="btn btn-primary btn-md">+ Neue Berühmtheit</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: '#fff', border: '1.5px solid #E0DDD8', borderRadius: 16,
            overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
          }}>
            {/* Bild */}
            <div style={{
              height: 120, background: '#F5F4F1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {item.image_url
                ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 52 }}>🧑‍🎤</span>}
            </div>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 2 }}>{item.name}</div>
              <div style={{ fontSize: 12, color: '#8A8580', marginBottom: 8 }}>
                {item.category} {item.birth_year ? `· *${item.birth_year}` : ''}
              </div>
              <div style={{ fontSize: 12, color: '#5E7082', marginBottom: 12, lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {item.description}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm" style={{ flex: 1 }}>✏️ Bearbeiten</button>
                <button onClick={() => del(item.id, item.name)} className="btn btn-ghost-danger btn-sm">🗑️</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 48, color: '#8A8580' }}>
            Noch keine Berühmtheiten. Klicke auf "+ Neue Berühmtheit".
          </div>
        )}
      </div>
    </div>
  );
}

// ── Geschichten-Verwaltung ────────────────────────────────────────────────────
function StoriesAdmin() {
  const [items,   setItems]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form,    setForm]    = React.useState(null);
  const [saving,  setSaving]  = React.useState(false);
  const [msg,     setMsg]     = React.useState('');

  const EMPTY = { title:'', content:'', category:'märchen', read_time:3, sort_order:0, audio_file:'' };
  const [data, setData] = React.useState(EMPTY);

  const load = () => {
    setLoading(true);
    api.get('/kurdistan/stories')
      .then(r => { setItems(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  React.useEffect(load, []);

  const openNew  = () => { setData(EMPTY); setForm('new'); setMsg(''); };
  const openEdit = (item) => {
    setData({ title: item.title, content: item.content, category: item.category,
      read_time: item.read_time, sort_order: item.sort_order, audio_file: item.audio_file || '' });
    setForm(item.id); setMsg('');
  };

  const save = async () => {
    if (!data.title || !data.content) return setMsg('Titel und Text sind Pflichtfelder.');
    setSaving(true); setMsg('');
    try {
      const payload = { ...data, audio_file: data.audio_file || null };
      if (form === 'new') await api.post('/kurdistan/stories', payload);
      else await api.patch(`/kurdistan/stories/${form}`, payload);
      setMsg('✅ Gespeichert!');
      load();
      setTimeout(() => setForm(null), 800);
    } catch(e) {
      setMsg('❌ ' + (e.response?.data?.error || e.message));
    } finally { setSaving(false); }
  };

  const del = async (id, title) => {
    if (!window.confirm(`"${title}" wirklich löschen?`)) return;
    await api.delete(`/kurdistan/stories/${id}`);
    load();
  };

  const toggleActive = async (item) => {
    await api.patch(`/kurdistan/stories/${item.id}`, { active: item.active ? 0 : 1 });
    load();
  };

  if (form !== null) return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setForm(null)} className="btn btn-ghost btn-sm">← Zurück</button>
        <h3 style={{ fontWeight: 900, fontSize: 18 }}>{form === 'new' ? 'Neue Geschichte' : 'Bearbeiten'}</h3>
      </div>
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16,
        background: msg.startsWith('✅') ? '#D0F5EF' : '#FFE8E8',
        color: msg.startsWith('✅') ? '#044f43' : '#8c1f1f', fontWeight: 700, fontSize: 13 }}>{msg}</div>}

      <AdminFormField label="Titel *">
        <input className="input" value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="z.B. Kawa der Schmied" />
      </AdminFormField>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <AdminFormField label="Kategorie">
          <select className="input" value={data.category} onChange={e => setData({...data, category: e.target.value})}>
            {['märchen','epos','legende','geschichte','gedicht'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </AdminFormField>
        <AdminFormField label="Lesezeit (Minuten)">
          <input className="input" type="number" min={1} max={30} value={data.read_time}
            onChange={e => setData({...data, read_time: Number(e.target.value)})} />
        </AdminFormField>
      </div>
      <AdminFormField label="Text * (wird auch vorgelesen falls kein Audio)">
        <textarea className="input" rows={12} value={data.content}
          onChange={e => setData({...data, content: e.target.value})}
          placeholder="Schreibe die Geschichte hier…" style={{ resize: 'vertical', lineHeight: 1.7 }} />
        <div style={{ fontSize: 11, color: '#8A8580', marginTop: 4 }}>
          {data.content.length} Zeichen · ca. {Math.ceil(data.content.split(' ').length / 150)} Min. Lesezeit
        </div>
      </AdminFormField>

      {/* ── Audio für Geschichte ── */}
      <div style={{ borderTop: '2px solid #E0DDD8', paddingTop: 16, marginTop: 12, marginBottom: 16 }}>
        <label style={{ fontWeight: 900, fontSize: 14, display: 'block', marginBottom: 10 }}>🎵 Audio-Datei (Vorlesung der Geschichte)</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <div style={{
            flex: 1, padding: '10px 12px', border: '2px solid #E0DDD8',
            borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: data.audio_file ? '#0B9E88' : '#8A8580',
            background: data.audio_file ? '#D0F5EF' : '#F5F4F1',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {data.audio_file ? `🎵 ${data.audio_file}` : '— Kein Audio (Browser-TTS als Fallback) —'}
          </div>
          {data.audio_file && (
            <button className="btn btn-ghost btn-xs"
              onClick={() => { const a = new Audio(`/uploads/audio/${data.audio_file}`); a.play().catch(()=>{}); }}
              title="Abspielen">▶️</button>
          )}
          {data.audio_file && (
            <button className="btn btn-ghost-danger btn-xs"
              onClick={() => setData({ ...data, audio_file: '' })} title="Entfernen">✕</button>
          )}
        </div>
        <DirectUploadButton
          onUploaded={(filename) => setData(prev => ({ ...prev, audio_file: filename }))}
          label={data.title}
        />
        <p style={{ fontSize: 11, color: '#8A8580', marginTop: 6 }}>
          Lade eine Audio-Aufnahme der Geschichte hoch — alle Formate erlaubt (MP3, WAV, OGG, M4A…)
        </p>
      </div>

      <button onClick={save} disabled={saving} className="btn btn-primary btn-lg" style={{ marginTop: 8 }}>
        {saving ? 'Speichert…' : '💾 Speichern'}
      </button>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#8A8580' }}>Lädt…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span style={{ fontWeight: 700, color: '#8A8580' }}>{items.length} Geschichte(n)</span>
        <button onClick={openNew} className="btn btn-primary btn-md">+ Neue Geschichte</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{
            background: '#fff', border: '1.5px solid #E0DDD8', borderRadius: 14,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
            opacity: item.active ? 1 : 0.5,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 3 }}>{item.title}</div>
              <div style={{ fontSize: 12, color: '#8A8580', display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.category} · ⏱ {item.read_time} Min · {item.content.length} Zeichen
                {item.audio_file
                  ? <span style={{ color: '#0B9E88', fontWeight: 800, cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); const a = new Audio(`/uploads/audio/${item.audio_file}`); a.play().catch(()=>{}); }}>🎵 Audio</span>
                  : <span style={{ color: '#D94040', fontWeight: 700 }}>⚠️ Kein Audio</span>
                }
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => toggleActive(item)} className={`btn btn-sm ${item.active ? 'btn-ghost' : 'btn-accent'}`}>
                {item.active ? '⏸ Ausblenden' : '▶ Anzeigen'}
              </button>
              <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm">✏️</button>
              <button onClick={() => del(item.id, item.title)} className="btn btn-ghost-danger btn-sm">🗑️</button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A8580' }}>
            Noch keine Geschichten. Klicke auf "+ Neue Geschichte".
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tages-Events-Verwaltung ───────────────────────────────────────────────────
function EventsAdmin() {
  const [items,   setItems]   = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [form,    setForm]    = React.useState(null);
  const [saving,  setSaving]  = React.useState(false);
  const [msg,     setMsg]     = React.useState('');
  const [filter,  setFilter]  = React.useState('');

  const MONTHS = ['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
  const EMPTY  = { day:1, month:1, year:'', title:'', description:'', category:'geschichte' };
  const [data,  setData]  = React.useState(EMPTY);

  const load = () => {
    setLoading(true);
    // Alle Events laden über einen direkten API-Call
    api.get('/kurdistan/events/all').then(r => { setItems(r.data || []); setLoading(false); })
      .catch(() => {
        // Fallback: heutigen Tag laden
        api.get('/kurdistan/events/today').then(r => { setItems(r.data?.events || []); setLoading(false); })
          .catch(() => setLoading(false));
      });
  };
  React.useEffect(load, []);

  const openNew  = () => { setData(EMPTY); setForm('new'); setMsg(''); };
  const openEdit = (item) => {
    setData({ day: item.day, month: item.month, year: item.year||'',
      title: item.title, description: item.description, category: item.category });
    setForm(item.id); setMsg('');
  };

  const save = async () => {
    if (!data.title || !data.description) return setMsg('Titel und Beschreibung sind Pflichtfelder.');
    if (!data.day || !data.month) return setMsg('Tag und Monat sind Pflichtfelder.');
    setSaving(true); setMsg('');
    try {
      const payload = { ...data, day: Number(data.day), month: Number(data.month),
        year: data.year ? Number(data.year) : null };
      if (form === 'new') await api.post('/kurdistan/events', payload);
      else await api.patch(`/kurdistan/events/${form}`, payload);
      setMsg('✅ Gespeichert!');
      load();
      setTimeout(() => setForm(null), 800);
    } catch(e) {
      setMsg('❌ ' + (e.response?.data?.error || e.message));
    } finally { setSaving(false); }
  };

  const del = async (id, title) => {
    if (!window.confirm(`"${title}" wirklich löschen?`)) return;
    await api.delete(`/kurdistan/events/${id}`);
    load();
  };

  if (form !== null) return (
    <div style={{ maxWidth: 620 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => setForm(null)} className="btn btn-ghost btn-sm">← Zurück</button>
        <h3 style={{ fontWeight: 900, fontSize: 18 }}>{form === 'new' ? 'Neues Ereignis' : 'Bearbeiten'}</h3>
      </div>
      {msg && <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 16,
        background: msg.startsWith('✅') ? '#D0F5EF' : '#FFE8E8',
        color: msg.startsWith('✅') ? '#044f43' : '#8c1f1f', fontWeight: 700, fontSize: 13 }}>{msg}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <AdminFormField label="Tag *">
          <input className="input" type="number" min={1} max={31} value={data.day}
            onChange={e => setData({...data, day: e.target.value})} />
        </AdminFormField>
        <AdminFormField label="Monat *">
          <select className="input" value={data.month} onChange={e => setData({...data, month: Number(e.target.value)})}>
            {MONTHS.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </AdminFormField>
        <AdminFormField label="Jahr (optional)">
          <input className="input" type="number" value={data.year}
            onChange={e => setData({...data, year: e.target.value})} placeholder="z.B. 1988" />
        </AdminFormField>
      </div>
      <AdminFormField label="Kategorie">
        <select className="input" value={data.category} onChange={e => setData({...data, category: e.target.value})}>
          {['geschichte','politik','kultur','sport','wissenschaft'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </AdminFormField>
      <AdminFormField label="Titel *">
        <input className="input" value={data.title} onChange={e => setData({...data, title: e.target.value})} placeholder="z.B. Newroz – Kurdisches Neujahr" />
      </AdminFormField>
      <AdminFormField label="Beschreibung *">
        <textarea className="input" rows={5} value={data.description}
          onChange={e => setData({...data, description: e.target.value})}
          placeholder="Was ist an diesem Tag passiert?" style={{ resize: 'vertical' }} />
      </AdminFormField>
      <button onClick={save} disabled={saving} className="btn btn-primary btn-lg" style={{ marginTop: 8 }}>
        {saving ? 'Speichert…' : '💾 Speichern'}
      </button>
    </div>
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#8A8580' }}>Lädt…</div>;

  const filtered = filter
    ? items.filter(e => e.title.toLowerCase().includes(filter.toLowerCase()) ||
        e.description.toLowerCase().includes(filter.toLowerCase()))
    : items;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <input className="input" placeholder="🔍 Suchen…" value={filter}
          onChange={e => setFilter(e.target.value)} style={{ maxWidth: 260 }} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#8A8580', fontSize: 13 }}>{items.length} Ereignis(se)</span>
          <button onClick={openNew} className="btn btn-primary btn-md">+ Neues Ereignis</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(item => (
          <div key={item.id} style={{
            background: '#fff', border: '1.5px solid #E0DDD8', borderRadius: 14,
            padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 16,
          }}>
            {/* Datum-Badge */}
            <div style={{
              width: 52, height: 52, borderRadius: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #0B9E88, #097560)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{item.day}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,.8)', fontWeight: 800, textTransform: 'uppercase' }}>
                {MONTHS[item.month]}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 2 }}>
                {item.title}
                {item.year && <span style={{ fontWeight: 700, color: '#8A8580', marginLeft: 8 }}>{item.year}</span>}
              </div>
              <div style={{ fontSize: 12, color: '#5E7082', lineHeight: 1.5,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {item.description}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => openEdit(item)} className="btn btn-ghost btn-sm">✏️</button>
              <button onClick={() => del(item.id, item.title)} className="btn btn-ghost-danger btn-sm">🗑️</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#8A8580' }}>
            {filter ? 'Keine Treffer.' : 'Noch keine Ereignisse. Klicke auf "+ Neues Ereignis".'}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hilfs-Komponente ──────────────────────────────────────────────────────────
function AdminFormField({ label, children }) {
  return (
    <div className="form-row" style={{ marginBottom: 16 }}>
      <label className="form-label" style={{ marginBottom: 6, display: 'block', fontWeight: 800, fontSize: 13, color: '#3D4F61' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Community-Chat Admin ──────────────────────────────────────────────────────
function CommunityAdmin() {
  const [messages, setMessages] = React.useState([]);
  const [enabled,  setEnabled]  = React.useState(true);
  const [loading,  setLoading]  = React.useState(true);
  const [toggling, setToggling] = React.useState(false);

  const load = () => {
    setLoading(true);
    api.get('/kurdistan/community')
      .then(r => {
        setEnabled(r.data.enabled);
        setMessages(r.data.messages.slice().reverse());
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };
  React.useEffect(load, []);

  const toggle = async () => {
    setToggling(true);
    try {
      const { data } = await api.patch('/kurdistan/settings/chat', { enabled: !enabled });
      setEnabled(data.enabled);
    } finally { setToggling(false); }
  };

  const deleteMsg = async (id) => {
    if (!window.confirm('Diese Nachricht löschen?')) return;
    await api.delete(`/kurdistan/community/${id}`);
    setMessages(m => m.filter(msg => msg.id !== id));
  };

  const deleteAll = async () => {
    if (!window.confirm('Alle Nachrichten unwiderruflich löschen?')) return;
    await api.delete('/kurdistan/community');
    setMessages([]);
  };

  const timeStr = (d) => new Date(d).toLocaleString('de-DE', {
    day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'
  });

  return (
    <div>
      {/* Status-Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#fff', border: '1.5px solid #E0DDD8', borderRadius: 16,
        padding: '16px 20px', marginBottom: 20,
      }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
            Community-Chat
          </div>
          <div style={{ fontSize: 13, color: '#8A8580' }}>
            {messages.length} Nachricht{messages.length !== 1 ? 'en' : ''} gesamt
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Aktiv/Inaktiv Toggle */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: enabled ? '#D0F5EF' : '#F5F4F1',
            border: `1.5px solid ${enabled ? '#0B9E88' : '#E0DDD8'}`,
            borderRadius: 12, padding: '8px 16px',
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: enabled ? '#0B9E88' : '#B8B4B0',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, fontWeight: 800,
              color: enabled ? '#044f43' : '#8A8580' }}>
              {enabled ? 'Aktiviert' : 'Deaktiviert'}
            </span>
            <button
              onClick={toggle}
              disabled={toggling}
              className={`btn btn-sm ${enabled ? 'btn-danger' : 'btn-primary'}`}
              style={{ marginLeft: 4 }}>
              {toggling ? '…' : enabled ? '🔒 Deaktivieren' : '🔓 Aktivieren'}
            </button>
          </div>
        </div>
      </div>

      {/* Aktions-Leiste */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <button onClick={load} className="btn btn-ghost btn-sm">↻ Aktualisieren</button>
        {messages.length > 0 && (
          <button onClick={deleteAll} className="btn btn-ghost-danger btn-sm">
            🗑️ Alle Nachrichten löschen
          </button>
        )}
      </div>

      {/* Nachrichten-Tabelle */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#8A8580' }}>Lädt…</div>
      ) : messages.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#8A8580',
          background: '#F5F4F1', borderRadius: 16, border: '2px dashed #E0DDD8' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
          <div style={{ fontWeight: 700 }}>Noch keine Nachrichten</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              background: '#fff', border: '1.5px solid #E0DDD8', borderRadius: 14,
              padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12,
            }}>
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: '#0B9E88',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0,
              }}>
                {(msg.user_name||'?')[0].toUpperCase()}
              </div>

              {/* Inhalt */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: '#1A2233' }}>
                    {msg.user_name}
                  </span>
                  <span style={{ fontSize: 11, color: '#8A8580' }}>
                    {timeStr(msg.created_at)}
                  </span>
                </div>
                <div style={{
                  fontSize: 13, color: '#3D4F61', lineHeight: 1.5,
                  wordBreak: 'break-word',
                }}>
                  {msg.message}
                </div>
              </div>

              {/* Löschen */}
              <button
                onClick={() => deleteMsg(msg.id)}
                className="btn btn-ghost-danger btn-sm"
                style={{ flexShrink: 0 }}>
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
