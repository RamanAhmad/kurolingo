import React, { useEffect, useState } from 'react';
import { useStore } from '../store';
import { IconLogout, IconRefresh, IconSettings, IconPencil, IconCheck, IconX } from '../components/ui/icons';
import { useT, useLangStore } from '../i18n';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Spinner from '../components/ui/Spinner';

// ── Level-System ──────────────────────────────────────────────────────────────
function xpForLevel(lvl) { return lvl * lvl * 50; }
function xpProgress(xp, lvl) {
  const cur  = xpForLevel(lvl - 1);
  const next = xpForLevel(lvl);
  return { current: xp - cur, needed: next - cur, pct: Math.min(100, ((xp - cur) / (next - cur)) * 100) };
}

// ── Streak Calendar ───────────────────────────────────────────────────────────
function StreakCalendar({ history }) {
  const lang = useLangStore(s => s.lang);
  // Map i18n lang codes to BCP 47 locale codes for toLocaleDateString
  const localeMap = { de:'de-DE', en:'en-US', fr:'fr-FR', tr:'tr-TR', ar:'ar-SA', fa:'fa-IR', ku:'en-US' };
  const locale = localeMap[lang] || 'en-US';

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {history.map((d, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: d.active ? 'var(--teal)' : 'var(--stone-100)',
              border: `1px solid ${d.active ? 'var(--teal-dk)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18,
            }}>
              {d.active ? '✅' : ''}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4 }}>
              {new Date(d.date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'short' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, logout, refreshUser, addToast } = useStore();
  const navigate  = useNavigate();
  const t = useT();
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  // Password change
  const [pwOpen,   setPwOpen]   = useState(false);
  const [pwCur,    setPwCur]    = useState('');
  const [pwNew,    setPwNew]    = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/auth/profile-stats')
      .then(r => {
        setStats(r.data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback: zeige nur Store-Daten
        setStats(null);
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, []);

  const handleSaveName = async () => {
    if (!newName.trim() || newName.trim() === user?.name) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.patch('/auth/profile', { name: newName.trim() });
      await refreshUser();
      addToast(t('profile.nameSaved'), 'ok');
      setEditing(false);
    } catch (e) {
      addToast(e.response?.data?.error || t('profile.nameError'), 'err');
    } finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!pwCur || !pwNew) return addToast(t('profile.password.fillBoth'), 'err');
    if (pwNew.length < 6)  return addToast(t('profile.password.tooShort'), 'err');
    setPwSaving(true);
    try {
      await api.patch('/auth/password', { current_password: pwCur, new_password: pwNew });
      addToast(t('profile.password.success'), 'ok');
      setPwOpen(false); setPwCur(''); setPwNew('');
    } catch (e) {
      addToast(e.response?.data?.error || t('profile.password.failed'), 'err');
    } finally { setPwSaving(false); }
  };

  const handleBuyHeart = async () => {
    try {
      await api.post('/auth/buy-hearts');
      await refreshUser();
      load();
      addToast(t('profile.heartBought'), 'ok');
    } catch (e) {
      addToast(e.response?.data?.error || 'Fehler', 'err');
    }
  };

  const displayUser = stats?.user || user;
  const level       = displayUser?.level || 1;
  const totalXp     = displayUser?.total_xp || 0;
  const lvlProg     = xpProgress(totalXp, level);

  if (loading) return <Spinner text={t('profile.loading')} />;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '20px 16px' }}>

      {/* ── Avatar + Name ── */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        {/* Avatar circle */}
        <div style={{
          width: 88, height: 88, borderRadius: 'var(--r-2xl)',
          background: 'linear-gradient(135deg, var(--teal), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, fontWeight: 900, color: 'var(--white)',
          margin: '0 auto 14px',
          boxShadow: '0 6px 20px rgba(11,158,136,.28)',
        }}>
          {displayUser?.name?.[0]?.toUpperCase() ?? '?'}
        </div>

        {/* Name (editable) */}
        {editing ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', maxWidth: 300, margin: '0 auto' }}>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus
              style={{ textAlign: 'center', fontWeight: 900, fontSize: 18 }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={saving}>
              {saving ? '…' : '✓'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>✕</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{displayUser?.name}</h2>
            <button
              onClick={() => { setNewName(displayUser?.name || ''); setEditing(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 6 }}
              title="Name bearbeiten"
            ><IconPencil style={{width:14,height:14}}/></button>
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '4px 0 8px' }}>{displayUser?.email}</p>

        {/* Password change */}
        {!pwOpen ? (
          <button
            onClick={() => setPwOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 6, textDecoration: 'underline' }}
          >🔑 {t('profile.password.change')}</button>
        ) : (
          <div style={{ background: 'var(--stone-100)', borderRadius: 'var(--r-md)', padding: '14px 16px', maxWidth: 300, margin: '8px auto', textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: 'var(--stone-700)' }}>{t('profile.password.title')}</div>
            <input
              type="password" placeholder={t('profile.password.currentPw')} value={pwCur}
              onChange={e => setPwCur(e.target.value)}
              className="input" style={{ marginBottom: 8, fontSize: 14 }}
              autoComplete="current-password"
            />
            <input
              type="password" placeholder={t('profile.password.newPw')} value={pwNew}
              onChange={e => setPwNew(e.target.value)}
              className="input" style={{ marginBottom: 10, fontSize: 14 }}
              autoComplete="new-password"
              onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={handleChangePassword} disabled={pwSaving}>
                {pwSaving ? '…' : t('profile.password.save')}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setPwOpen(false); setPwCur(''); setPwNew(''); }}>
                {t('profile.password.cancel')}
              </button>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span className="badge badge-teal">
            {displayUser?.role === 'admin' ? t('profile.admin') : t('profile.learner')}
          </span>
          <span className="badge badge-teal" style={{ background: 'var(--sun-lt)', color: '#7A4800' }}>
            ⭐ Level {level}
          </span>
        </div>

        {/* Level progress bar */}
        <div style={{ maxWidth: 320, margin: '14px auto 0', padding: '0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5 }}>
            <span>Level {level}</span>
            <span>{lvlProg.current.toLocaleString()} / {lvlProg.needed.toLocaleString()} XP</span>
            <span>Level {level + 1}</span>
          </div>
          <div style={{ height: 10, background: 'var(--stone-100)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: 'linear-gradient(90deg, var(--teal), var(--purple))',
              width: `${lvlProg.pct}%`, transition: 'width .6s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Quick stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(70px,1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { icon: '🔥', val: displayUser?.streak ?? 0,    label: t('profile.streak'),     color: 'var(--sun)' },
          { icon: '⚡', val: totalXp,                     label: t('profile.xpTotal'),   color: 'var(--cyan)' },
          { icon: '💎', val: displayUser?.gems ?? 0,      label: t('profile.gems'),       color: 'var(--purple)' },
          { icon: '❤️', val: displayUser?.hearts ?? 5,    label: t('profile.hearts'),     color: 'var(--red)' },
        ].map(({ icon, val, label, color }) => (
          <div key={label} style={{
            background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
            padding: '12px 8px', textAlign: 'center',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: 24 }}>{icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color, marginTop: 3 }}>
              {typeof val === 'number' ? val.toLocaleString() : val}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.3px', marginTop: 2 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Herzen kaufen */}
      {(displayUser?.hearts ?? 5) < 5 && (
        <div style={{
          background: 'var(--red-lt)', border: '1px solid #F5BABA', borderRadius: 'var(--r-md)',
          padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 22 }}>❤️</span>
          <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#8C1F1F' }}>
            {t('profile.heartLow', {n: displayUser?.hearts})}
          </div>
          <button className="btn btn-danger btn-sm" onClick={handleBuyHeart}
            disabled={(displayUser?.gems ?? 0) < 100}>
            💎 100 → ❤️
          </button>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', background: 'var(--stone-100)', borderRadius: 'var(--r-md)', padding: 4, gap: 4, marginBottom: 18 }}>
        {[
          { id: 'overview',      label: '📊 ' + t('profile.tabs.overview') },
          { id: 'achievements',  label: '🏅 ' + t('profile.tabs.achievements') },
          { id: 'courses',       label: '🌍 ' + t('profile.tabs.courses') },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex: 1, padding: '9px 8px', border: 'none', borderRadius: 9,
            fontFamily: 'var(--font)', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            background: activeTab === t.id ? 'var(--white)' : 'transparent',
            color:      activeTab === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow:  activeTab === t.id ? 'var(--shadow-sm)' : 'none',
            transition: 'all .15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW Tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Real stats */}
          <div className="card">
            <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 14 }}>📈 {t('profile.stats.title')}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: t('profile.stats.completed'), val: stats?.lessons_completed ?? 0,  icon: '✅', color: 'var(--teal)' },
                { label: t('profile.stats.perfect'),       val: stats?.lessons_perfect   ?? 0,  icon: '🎯', color: 'var(--sun)' },
                { label: t('profile.stats.vocab'),          val: stats?.vocab_learned     ?? 0,  icon: '💬', color: 'var(--purple)' },
                { label: t('profile.stats.accuracy'), val: `${stats?.avg_accuracy ?? 0}%`, icon: '📊', color: 'var(--red)' },
                { label: t('profile.stats.attempts'),          val: stats?.total_attempts    ?? 0,  icon: '🔄', color: 'var(--text-muted)' },
              ].map(({ label, val, icon, color }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', background: 'var(--stone-100)', borderRadius: 10,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {icon} {label}
                  </span>
                  <strong style={{ fontSize: 15, color, fontWeight: 900 }}>
                    {typeof val === 'number' ? val.toLocaleString() : val}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          {/* Streak calendar */}
          {stats?.streak_history?.length > 0 && (
            <div className="card">
              <h3 style={{ fontWeight: 900, fontSize: 15, marginBottom: 14 }}>
                🔥 {t('profile.streak7.title')}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginLeft: 8 }}>
                  {t('profile.streak7.active', {n: stats.streak_history.filter(d=>d.active).length})}
                </span>
              </h3>
              <StreakCalendar history={stats.streak_history} />
            </div>
          )}

          {/* No stats yet */}
          {!stats && (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📚</div>
              <p style={{ fontWeight: 700 }}>{t('profile.noStats')}</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>{t('profile.noStatsHint')}</p>
              <button className="btn btn-primary btn-md" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
                {t('profile.startNow')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ACHIEVEMENTS Tab ── */}
      {activeTab === 'achievements' && (
        <div>
          {!stats?.achievements ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
              {t('profile.loadAchievements')}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, fontWeight: 700 }}>
                {t('profile.achievements.countLabel', {n: stats.achievements.filter(a=>a.earned).length, total: stats.achievements.length})}
              </div>

              {/* Earned */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                {stats.achievements.filter(a => a.earned).map(a => (
                  <AchievementCard key={a.id} achievement={a} earned />
                ))}
              </div>

              {/* Locked */}
              {stats.achievements.filter(a => !a.earned).length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase',
                                letterSpacing: '.5px', marginBottom: 10, marginTop: 6 }}>
                    {t('profile.achievementsLocked')}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {stats.achievements.filter(a => !a.earned).map(a => (
                      <AchievementCard key={a.id} achievement={a} earned={false} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── COURSES Tab ── */}
      {activeTab === 'courses' && (
        <div>
          {!stats?.active_courses || stats.active_courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🌍</div>
              <p style={{ fontWeight: 700 }}>{t('profile.courses.noActiveCourse')}</p>
              <button className="btn btn-primary btn-md" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
                {t('profile.courses.chooseCourse')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.active_courses.map(c => {
                const pct = c.total > 0 ? Math.round((c.done / c.total) * 100) : 0;
                return (
                  <div key={c.pair_id} className="card" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <span style={{ fontSize: 28 }}>{c.from_flag}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: 15 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {t('profile.courses.lessonsProgress', {done: c.done, total: c.total})}
                        </div>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--teal)' }}>{pct}%</div>
                    </div>
                    <div style={{ height: 8, background: 'var(--stone-100)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 5,
                        background: pct === 100 ? 'var(--sun)' : 'var(--teal)',
                        width: `${pct}%`, transition: 'width .6s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        {displayUser?.role === 'admin' && (
          <button className="btn btn-primary btn-md" onClick={() => navigate('/admin')}>
            ⚙️ Admin-Panel
          </button>
        )}
        <button className="btn btn-ghost btn-md" onClick={load} disabled={loading}>
          🔄 Aktualisieren
        </button>
        <button
          className="btn btn-danger btn-md"
          style={{ marginLeft: 'auto' }}
          onClick={() => { logout(); navigate('/login'); }}
        >
          {t('profile.logout')}
        </button>
      </div>
    </div>
  );
}

// ── Achievement Card ──────────────────────────────────────────────────────────
function AchievementCard({ achievement, earned }) {
  const t = useT();
  return (
    <div style={{
      background: earned ? 'var(--white)' : 'var(--stone-100)',
      border: `1px solid ${earned ? 'var(--teal)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)', padding: '14px 12px', textAlign: 'center',
      boxShadow: 'var(--shadow-sm)',
      opacity: earned ? 1 : 0.6,
      transition: 'transform .15s',
      cursor: 'default',
    }}
    onMouseEnter={e => earned && (e.currentTarget.style.transform = 'translateY(-2px)')}
    onMouseLeave={e => (e.currentTarget.style.transform = '')}
    >
      <div style={{ fontSize: 32, marginBottom: 6, filter: earned ? 'none' : 'grayscale(1)' }}>
        {earned ? achievement.icon : '🔒'}
      </div>
      <div style={{ fontWeight: 900, fontSize: 13, color: earned ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: 3 }}>
        {achievement.label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
        {achievement.desc}
      </div>
      {earned && (
        <div style={{ marginTop: 6 }}>
          <span style={{ background: 'var(--teal-lt)', color: 'var(--teal-dk)', fontSize: 10,
                         fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>
            ✓ {t('profile.achievementUnlocked')}
          </span>
        </div>
      )}
    </div>
  );
}
