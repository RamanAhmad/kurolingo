import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/client';
import { useStore } from '../store';
import Spinner from '../components/ui/Spinner';
import { IconRefresh } from '../components/ui/icons';
import { useT } from '../i18n';

const AVATAR_COLORS = [
  '#0B9E88','#6B48FF','#E8A020','#D94040',
  '#1CB0F6','#CE82FF','#FF9600','#2E7D32',
];

function avatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function Avatar({ name, size = 44, isMe }) {
  const color = isMe ? 'var(--teal)' : avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '28%',
      background: color, color: 'var(--white)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: size * 0.36, flexShrink: 0,
      outline: isMe ? '2px solid var(--teal)' : 'none',
      outlineOffset: isMe ? '2px' : '0',
      boxShadow: isMe ? 'var(--shadow-teal)' : '0 1px 4px rgba(0,0,0,.08)',
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

const MEDAL = ['🥇', '🥈', '🥉'];

function RankBadge({ rank }) {
  if (rank <= 3) return (
    <span style={{ fontSize: 26, width: 36, textAlign: 'center', flexShrink: 0 }}>
      {MEDAL[rank - 1]}
    </span>
  );
  return (
    <div style={{
      width: 36, textAlign: 'center', fontWeight: 900,
      fontSize: rank > 99 ? 13 : 16,
      color: rank <= 10 ? 'var(--text-primary)' : 'var(--text-muted)',
      flexShrink: 0,
    }}>
      {rank}
    </div>
  );
}

export default function LeaderboardPage() {
  const { user }                  = useStore();
  const [period,   setPeriod]     = useState('week');
  const t = useT();
  const [pairId,   setPairId]     = useState('');
  const [courses,  setCourses]    = useState([]);
  const [data,     setData]       = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState('');

  // Load courses for filter
  useEffect(() => {
    api.get('/leaderboard/courses')
      .then(r => setCourses(r.data))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ period });
    if (pairId) params.set('pair_id', pairId);

    api.get(`/leaderboard?${params}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(e => {
        setError(e.response?.data?.error || t('leaderboard.loadError'));
        setLoading(false);
      });
  }, [period, pairId]);

  useEffect(() => { load(); }, [load]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '28px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 4 }}>🏆 {t('leaderboard.title')}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {period === 'week' ? t('leaderboard.weekSubtitle') : t('leaderboard.allSubtitle')}
        </p>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {/* Period toggle */}
        <div style={{
          display: 'flex', background: 'var(--stone-100)', borderRadius: 'var(--r-md)',
          padding: 4, gap: 4, flexShrink: 0,
        }}>
          {[
            { val: 'week',    label: '🗓️ ' + t('leaderboard.thisWeek') },
            { val: 'alltime', label: '⭐ ' + t('leaderboard.allTime') },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setPeriod(opt.val)}
              style={{
                padding: '8px 16px', border: 'none', borderRadius: 9,
                fontFamily: 'var(--font)', fontWeight: 800, fontSize: 13,
                cursor: 'pointer', transition: 'all .15s',
                background: period === opt.val ? 'var(--white)' : 'transparent',
                color:      period === opt.val ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow:  period === opt.val ? 'var(--shadow-xs)' : 'none',
              }}
            >{opt.label}</button>
          ))}
        </div>

        {/* Course filter */}
        {courses.length > 0 && (
          <select
            value={pairId}
            onChange={e => setPairId(e.target.value)}
            style={{
              flex: 1, minWidth: 160, padding: '9px 14px',
              border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
              fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600,
              background: 'var(--white)', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="">🌍 {t('leaderboard.allCourses')}</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.from_flag} {c.from_name} → Kurdisch
              </option>
            ))}
          </select>
        )}

        {/* Refresh */}
        <button
          onClick={load}
          className="btn btn-ghost btn-sm"
          style={{ flexShrink: 0 }}
          disabled={loading}
        >
          {loading ? '…' : <IconRefresh style={{width:14,height:14}}/>}
        </button>
      </div>

      {/* Stats row */}
      {data && !loading && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: t('leaderboard.participants'), val: data.total_users, icon: '👥' },
            { label: period === 'week' ? t('leaderboard.myXpWeek') : t('leaderboard.myXpAll'),
              val: (data.entries.find(e => e.isMe) || data.my_rank)?.xp?.toLocaleString() ?? '0',
              icon: '⚡' },
            { label: t('leaderboard.myRank'),
              val: data.entries.find(e => e.isMe)
                ? `#${data.entries.find(e => e.isMe).rank}`
                : data.my_rank ? `#${data.my_rank.rank}` : '—',
              icon: '🏅' },
          ].map(({ label, val, icon }) => (
            <div key={label} style={{
              flex: 1, background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-lg)', padding: '12px 14px', textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: 20 }}>{icon}</div>
              <div style={{ fontWeight: 900, fontSize: 18, color: 'var(--text-primary)', margin: '3px 0' }}>{val}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'var(--red-lt)', border: '1px solid #F5BABA', borderRadius: 'var(--r-md)',
                      padding: '14px 18px', color: '#8C1F1F', fontWeight: 700, marginBottom: 16 }}>
          ❌ {error}
        </div>
      )}

      {/* Loading */}
      {loading && <Spinner text={t('leaderboard.loading')} />}

      {/* Entries */}
      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.entries.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{t('leaderboard.empty')}</p>
              <p style={{ fontSize: 14, marginTop: 6 }}>
                {period === 'week'
                  ? t('leaderboard.emptyWeekHint') : t('leaderboard.emptyAllHint')}
              </p>
            </div>
          )}

          {data.entries.map((entry, i) => (
            <LeaderboardRow key={entry.id} entry={entry} rank={entry.rank} isTop3={entry.rank <= 3} />
          ))}

          {/* Separator + user's own rank if not in list */}
          {data.my_rank && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{t('leaderboard.myPlace')}</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
              <LeaderboardRow
                entry={{ ...data.my_rank, name: user?.name || 'Du', isMe: true }}
                rank={data.my_rank.rank}
                isTop3={false}
              />
            </>
          )}
        </div>
      )}

      {/* Empty week nudge */}
      {!loading && data?.entries.length > 0 && period === 'week' && (
        <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--sun-lt)',
                      border: '1px solid var(--sun)', borderRadius: 'var(--r-md)',
                      fontSize: 13, color: '#7A4800', fontWeight: 600 }}>
          🔥 {t('leaderboard.weekEndsIn', { n: daysUntilMonday() })} {t('leaderboard.keepGoing')}
        </div>
      )}
    </div>
  );
}

// ── Single row ───────────────────────────────────────────────────────────────
function LeaderboardRow({ entry, rank, isTop3 }) {
  const t = useT();
  const isMe = entry.isMe;

  return (
    <div style={{
      background: isMe ? 'var(--teal-lt)' : isTop3 ? 'var(--sun-lt)' : 'var(--white)',
      border: `1px solid ${isMe ? 'var(--teal)' : isTop3 ? 'var(--sun)' : 'var(--border)'}`,
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-sm)',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'transform .12s',
    }}
    onMouseEnter={e => !isMe && (e.currentTarget.style.transform = 'translateY(-1px)')}
    onMouseLeave={e => (e.currentTarget.style.transform = '')}
    >
      <RankBadge rank={rank} />
      <Avatar name={entry.name} isMe={isMe} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 800, fontSize: 15,
          display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        }}>
          {entry.name}
          {isMe && (
            <span style={{ fontSize: 11, background: 'var(--teal)', color: 'var(--white)', padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>{t('leaderboard.me')}</span>
          )}
          {rank === 1 && (
            <span style={{ fontSize: 11, background: 'var(--sun-lt)', color: '#7A4800',
                           padding: '2px 8px', borderRadius: 20, fontWeight: 800 }}>
              👑 #1
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>🔥 {entry.streak ?? 0} Streak
          </span>
          {entry.lessons_done > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              ✅ {t('leaderboard.lessonsLabel', {n: entry.lessons_done})}
            </span>
          )}
          {entry.level && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('leaderboard.levelLabel', {n: entry.level})}
            </span>
          )}
        </div>
      </div>

      {/* XP */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 17, color: 'var(--cyan)' }}>
          ⚡ {Number(entry.xp || 0).toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>XP</div>
      </div>
    </div>
  );
}

// ── Helper ───────────────────────────────────────────────────────────────────
function daysUntilMonday() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon…
  const daysLeft = day === 0 ? 1 : 8 - day;
  return daysLeft;
}
