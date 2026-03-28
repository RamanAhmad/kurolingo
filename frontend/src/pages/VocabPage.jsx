import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import api from '../api/client';
import { useStore } from '../store';
import Spinner from '../components/ui/Spinner';
import { useT } from '../i18n';

export default function VocabPage() {
  const t = useT();
  const { activeCourse, user } = useStore();

  const [vocab, setVocab]           = useState([]);
  const [units, setUnits]           = useState([]);
  const [learnedIds, setLearnedIds] = useState(new Set());
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const togglingRef                 = useRef(new Set()); // IDs currently being toggled
  const [togglingTick, setTogglingTick] = useState(0);  // force re-render after toggle state change

  const [search, setSearch]                 = useState('');
  const [wordTypeFilter, setWordTypeFilter] = useState('all');
  const [unitFilter, setUnitFilter]         = useState('all');
  const [learnedFilter, setLearnedFilter]   = useState('all');
  const [expandedId, setExpandedId]         = useState(null);

  // ── Load vocab, units, progress in parallel ───────────────────────────
  useEffect(() => {
    if (!activeCourse?.id) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    const vocabReq    = api.get(`/vocab?pair_id=${activeCourse.id}`);
    const unitsReq    = api.get(`/units?pair_id=${activeCourse.id}`);
    const progressReq = user
      ? api.get('/vocab/progress').catch(() => ({ data: { learned: [] } }))
      : Promise.resolve({ data: { learned: [] } });

    Promise.all([vocabReq, unitsReq, progressReq])
      .then(([vRes, uRes, pRes]) => {
        setVocab(vRes.data || []);
        setUnits(uRes.data || []);
        setLearnedIds(new Set(pRes.data?.learned || []));
        setError(null);
      })
      .catch(() => setError(t('vocab.loadError')))
      .finally(() => setLoading(false));
  }, [activeCourse?.id, user?.id]);

  // ── Toggle learned status — uses ref to avoid stale closure ──────────
  const toggleLearned = useCallback(async (e, vocabId) => {
    e.stopPropagation();
    if (!user) return;
    if (togglingRef.current.has(vocabId)) return;
    togglingRef.current.add(vocabId);
    setTogglingTick(n => n + 1);
    try {
      const res = await api.post(`/vocab/${vocabId}/toggle-learned`);
      setLearnedIds(prev => {
        const next = new Set(prev);
        if (res.data.learned) next.add(vocabId); else next.delete(vocabId);
        return next;
      });
    } catch {}
    togglingRef.current.delete(vocabId);
    setTogglingTick(n => n + 1);
  }, [user]);

  // ── Unit filter — resets dependent filters to avoid 0-result confusion
  const handleUnitFilter = useCallback((unitId) => {
    setUnitFilter(unitId);
    setSearch('');
    setWordTypeFilter('all');
    setExpandedId(null);
  }, []);

  // ── Derived: word types present in current data ───────────────────────
  const wordTypes = useMemo(() => {
    const types = new Set(vocab.map(v => v.word_type).filter(Boolean));
    return ['all', ...Array.from(types)];
  }, [vocab]);

  // ── Type labels — memoized, includes all known types ─────────────────
  const typeLabels = useMemo(() => ({
    all:          t('vocab.all'),
    noun:         t('vocab.noun'),
    verb:         t('vocab.verb'),
    adjective:    t('vocab.adjective'),
    phrase:       t('vocab.phrase'),
    adverb:       t('vocab.adverb'),
    pronoun:      t('vocab.pronoun'),
    number:       t('vocab.number'),
    other:        t('vocab.other'),
    interjection: t('vocab.interjection'),
  }), [t]);

  // ── Unit label — respects UI language (ku first if available) ─────────
  const unitLabel = useCallback((u) => {
    const name = u.title_ku || u.title_tr || '';
    return u.emoji ? `${u.emoji} ${name}` : name;
  }, []);

  // ── Filtered list ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = vocab;
    if (unitFilter !== 'all')          list = list.filter(v => v.unit_id === unitFilter);
    if (wordTypeFilter !== 'all')      list = list.filter(v => v.word_type === wordTypeFilter);
    if (learnedFilter === 'learned')   list = list.filter(v => learnedIds.has(v.id));
    if (learnedFilter === 'unlearned') list = list.filter(v => !learnedIds.has(v.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.kurdish.toLowerCase().includes(q) ||
        v.translation.toLowerCase().includes(q) ||
        (v.pronunciation || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [vocab, unitFilter, wordTypeFilter, learnedFilter, search, learnedIds]);

  const learnedCount = useMemo(() =>
    vocab.filter(v => learnedIds.has(v.id)).length,
  [vocab, learnedIds]);

  const progressPct = vocab.length > 0 ? Math.round((learnedCount / vocab.length) * 100) : 0;

  const hasActiveFilters = search.trim() || wordTypeFilter !== 'all' || learnedFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setWordTypeFilter('all');
    setLearnedFilter('all');
  };

  // ── Loading / error / no course ───────────────────────────────────────
  if (loading) return <Spinner text={t('vocab.loading')} />;

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
      <h2 style={{ fontWeight: 900, marginBottom: 8, color: '#D94040' }}>{error}</h2>
      <button className="btn-primary" onClick={() => window.location.reload()} style={{ marginTop: 12 }}>
        {t('vocab.retry')}
      </button>
    </div>
  );

  if (!activeCourse) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
      <h2 style={{ fontWeight: 900, marginBottom: 8 }}>{t('vocab.noCourse')}</h2>
      <p style={{ color: '#8A8580' }}>{t('vocab.noCourseHint')}</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <span style={{ fontSize: 36 }}>📖</span>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{t('vocab.title')}</h2>
          <p style={{ fontSize: 13, color: '#8A8580', margin: 0, marginTop: 2 }}>
            {vocab.length} {t('vocab.wordsCount')} · {activeCourse.name}
          </p>
        </div>
      </div>

      {/* ── Progress bar (eingeloggte User) ── */}
      {user && vocab.length > 0 && (
        <div style={{
          marginBottom: 20, background: 'var(--white)',
          border: '1.5px solid var(--border)', borderRadius: 14, padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>
              🎯 {learnedCount} {t('vocab.progressLabel')} {vocab.length} {t('vocab.progressLearned')}
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, color: progressPct === 100 ? '#0B9E88' : 'var(--text-secondary)' }}>
              {progressPct}%
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--stone-100)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: progressPct === 100 ? '#0B9E88' : 'linear-gradient(90deg,#0B9E88,#14c9a8)',
              width: `${progressPct}%`, transition: 'width .4s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Unit filter ── */}
      {units.length > 0 && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`badge ${unitFilter === 'all' ? 'badge-teal' : 'badge-gray'}`}
            onClick={() => handleUnitFilter('all')}
            style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12, border: 'none', fontFamily: 'var(--font)' }}>
            {t('vocab.allUnits')}
          </button>
          {units.map(u => (
            <button key={u.id}
              className={`badge ${unitFilter === u.id ? 'badge-teal' : 'badge-gray'}`}
              onClick={() => handleUnitFilter(u.id)}
              style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12, border: 'none', fontFamily: 'var(--font)' }}>
              {unitLabel(u)}
            </button>
          ))}
        </div>
      )}

      {/* ── Suche + Wortart-Filter ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, pointerEvents: 'none' }}>🔍</span>
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('vocab.searchPlaceholder')}
            style={{ paddingLeft: 40, fontSize: 14 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {wordTypes.map(type => (
            <button key={type}
              className={`badge ${wordTypeFilter === type ? 'badge-teal' : 'badge-gray'}`}
              onClick={() => setWordTypeFilter(type)}
              style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12, border: 'none', fontFamily: 'var(--font)' }}>
              {typeLabels[type] || type}
            </button>
          ))}
        </div>
      </div>

      {/* ── Gelernt-Filter (nur eingeloggt) ── */}
      {user && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { key: 'all',       label: t('vocab.filterAll'),       icon: '📚', activeColor: 'var(--teal)' },
            { key: 'unlearned', label: t('vocab.filterUnlearned'), icon: '⏳', activeColor: '#f5a623' },
            { key: 'learned',   label: t('vocab.filterLearned'),   icon: '✅', activeColor: '#0B9E88' },
          ].map(({ key, label, icon, activeColor }) => (
            <button key={key}
              onClick={() => setLearnedFilter(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 14px', fontSize: 12, border: 'none',
                borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 700,
                background: learnedFilter === key ? activeColor : 'var(--stone-100)',
                color: learnedFilter === key ? '#fff' : 'var(--text-secondary)',
                transition: 'all .15s',
              }}>
              {icon} {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Ergebnis-Anzahl ── */}
      <div style={{ fontSize: 12, fontWeight: 800, color: '#8A8580', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {filtered.length} {t('vocab.results')}
      </div>

      {/* ── Vokabelliste oder Leer-State ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#8A8580' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
          <p style={{ marginBottom: hasActiveFilters ? 16 : 0 }}>{t('vocab.noResults')}</p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '8px 20px', borderRadius: 20, border: 'none',
                background: 'var(--teal)', color: '#fff', cursor: 'pointer',
                fontWeight: 700, fontSize: 13, fontFamily: 'var(--font)',
              }}>
              {t('vocab.clearFilters')}
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(v => {
            const isExpanded = expandedId === v.id;
            const isLearned  = learnedIds.has(v.id);
            const isToggling = togglingRef.current.has(v.id);

            return (
              <div key={v.id}
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                style={{
                  background: isLearned ? 'var(--teal-xlt)' : 'var(--white)',
                  border: `1.5px solid ${isExpanded ? 'var(--teal)' : isLearned ? 'rgba(11,158,136,.3)' : 'var(--border)'}`,
                  borderRadius: 14, padding: '14px 18px', cursor: 'pointer',
                  transition: 'all .15s',
                  boxShadow: isExpanded ? '0 4px 16px rgba(0,0,0,.08)' : 'none',
                }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                  {/* Audio / TTS Button */}
                  {v.audio_file ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); new Audio(`/uploads/audio/${v.audio_file}`).play().catch(() => {}); }}
                      style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: isExpanded ? 'var(--teal)' : '#0B9E88',
                        color: '#fff', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0, transition: 'all .15s',
                        boxShadow: '0 2px 0 #097560',
                      }}>🔊</button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if ('speechSynthesis' in window) {
                          const u = new SpeechSynthesisUtterance(v.kurdish);
                          u.lang = 'ku'; u.rate = 0.85;
                          window.speechSynthesis.cancel();
                          window.speechSynthesis.speak(u);
                        }
                      }}
                      style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: isExpanded ? 'var(--teal)' : 'var(--stone-50)',
                        color: isExpanded ? '#fff' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20, flexShrink: 0,
                        transition: 'all .15s', border: 'none', cursor: 'pointer',
                      }}>🔊</button>
                  )}

                  {/* Kurdisch + Übersetzung */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                      {v.kurdish}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 1, wordBreak: 'break-word' }}>
                      {v.translation}
                    </div>
                  </div>

                  {/* Badges + Gelernt-Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {v.pronunciation && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        /{v.pronunciation}/
                      </span>
                    )}
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>
                      {typeLabels[v.word_type] || v.word_type}
                    </span>
                    {v.difficulty && (
                      <span className="badge badge-sun" style={{ fontSize: 10 }}>
                        {v.difficulty}
                      </span>
                    )}

                    {/* ✓ Gelernt-Toggle */}
                    {user && (
                      <button
                        onClick={(e) => toggleLearned(e, v.id)}
                        disabled={isToggling}
                        title={isLearned ? t('vocab.markUnlearned') : t('vocab.markLearned')}
                        style={{
                          width: 32, height: 32, borderRadius: '50%', border: 'none',
                          cursor: isToggling ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, flexShrink: 0,
                          background: isLearned ? '#0B9E88' : 'var(--stone-100)',
                          color: isLearned ? '#fff' : '#8A8580',
                          transition: 'all .2s',
                          opacity: isToggling ? 0.6 : 1,
                          boxShadow: isLearned ? '0 2px 6px rgba(11,158,136,.35)' : 'none',
                          fontWeight: 900,
                        }}>
                        {isLearned ? '✓' : '○'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Ausgeklappt */}
                {isExpanded && (
                  <div style={{
                    marginTop: 14, paddingTop: 14,
                    borderTop: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: 10,
                  }}>
                    {v.pronunciation && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 14 }}>🗣️</span>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                          {t('vocab.pronunciation')}: <strong style={{ color: 'var(--teal)' }}>/{v.pronunciation}/</strong>
                        </span>
                      </div>
                    )}
                    {v.example_ku && (
                      <div style={{
                        background: 'var(--teal-xlt)', borderRadius: 10, padding: '10px 14px',
                        border: '1px solid rgba(11,158,136,.15)',
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#044f43', marginBottom: 4 }}>
                          💬 {t('vocab.example')}
                        </div>
                        <div style={{ fontSize: 14, color: '#2D4A44', fontWeight: 700 }}>{v.example_ku}</div>
                        {v.example_tr && (
                          <div style={{ fontSize: 13, color: '#5A8A80', marginTop: 2, fontStyle: 'italic' }}>
                            {v.example_tr}
                          </div>
                        )}
                      </div>
                    )}
                    {!v.example_ku && !v.pronunciation && (
                      <div style={{ fontSize: 13, color: '#8A8580', fontStyle: 'italic' }}>
                        {t('vocab.noDetails')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
