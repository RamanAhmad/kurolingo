/**
 * KurdistanPage.jsx — Kurdistan: Kultur, Geschichte & Persönlichkeiten
 *
 * v2 Fixes:
 *  ✅ Toter CommunityChat-Code entfernt (250 Zeilen, jetzt eigene CommunityPage)
 *  ✅ MONTHS_DE → i18n-Monatsnamen
 *  ✅ "Wird geladen…" → t('common.loading')
 *  ✅ Kategorien (kultur, musik…) → i18n-Labels
 *  ✅ Quiz: Shuffle + Completion-Tracking + Score-Summary
 *  ✅ Events: Client-Zeitzone an Backend gesendet (UTC-Fix)
 *  ✅ Stories: Zuklappen per Klick auf aktive Story
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import api from '../api/client';
import { useStore } from '../store';
import Spinner from '../components/ui/Spinner';
import { useT } from '../i18n';

// ── Kategorie-Farben ──────────────────────────────────────────────────────────
const CAT_COLORS = {
  kultur:      { bg: '#E8FAF7', border: '#0B9E88', text: '#044f43' },
  musik:       { bg: '#EDE8FF', border: '#6B48FF', text: '#3a2490' },
  literatur:   { bg: '#FEF3DC', border: '#E8A020', text: '#7a4800' },
  geschichte:  { bg: '#FFE8E8', border: '#D94040', text: '#8c1f1f' },
  politik:     { bg: '#E6F1FB', border: '#378ADD', text: '#0C447C' },
  märchen:     { bg: '#FEF3DC', border: '#E8A020', text: '#7a4800' },
  epos:        { bg: '#EDE8FF', border: '#6B48FF', text: '#3a2490' },
  legende:     { bg: '#E8FAF7', border: '#0B9E88', text: '#044f43' },
};
const catStyle = (cat) => CAT_COLORS[cat] || { bg: '#F5F4F1', border: '#8A8580', text: '#3D4F61' };

// ── Kategorie-Label (i18n) ───────────────────────────────────────────────────
function catLabel(cat, t) {
  const key = `kurdistan.cat_${cat}`;
  const val = t(key);
  // Falls kein i18n-Key existiert, fallback auf Originalwert mit Großbuchstabe
  return val !== key ? val : (cat ? cat.charAt(0).toUpperCase() + cat.slice(1) : '');
}

// ── Monatsname (i18n) ────────────────────────────────────────────────────────
function getMonthName(monthNum) {
  try {
    // Nutze Intl für locale-aware Monatsnamen
    const date = new Date(2024, monthNum - 1, 1);
    return date.toLocaleString(undefined, { month: 'long' });
  } catch {
    return String(monthNum);
  }
}

// ── Fisher-Yates-Shuffle ─────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ══════════════════════════════════════════════════════════════════════════════
// SEKTION 1: Berühmtheiten-Quiz
// ══════════════════════════════════════════════════════════════════════════════
function CelebrityQuiz() {
  const t = useT();
  const [celebrities, setCelebrities] = useState([]);
  const [current,     setCurrent]     = useState(0);
  const [selected,    setSelected]    = useState(null);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [score,       setScore]       = useState({ correct: 0, total: 0 });
  const [finished,    setFinished]    = useState(false);

  useEffect(() => {
    api.get('/kurdistan/celebrities')
      .then(r => {
        setCelebrities(shuffle(r.data));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const cel = celebrities[current];

  const handleAnswer = async (option) => {
    if (selected || submitting) return;
    setSelected(option);
    setSubmitting(true);
    try {
      const { data } = await api.post(`/kurdistan/celebrities/${cel.id}/answer`, { answer: option });
      setResult(data);
      setScore(s => ({
        correct: s.correct + (data.correct ? 1 : 0),
        total: s.total + 1,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (current + 1 >= celebrities.length) {
      setFinished(true);
      return;
    }
    setSelected(null);
    setResult(null);
    setCurrent(c => c + 1);
  };

  const handleRestart = () => {
    setCelebrities(shuffle(celebrities));
    setCurrent(0);
    setSelected(null);
    setResult(null);
    setScore({ correct: 0, total: 0 });
    setFinished(false);
  };

  if (loading) return <Spinner text={t('common.loading')} />;
  if (!celebrities.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
      {t('kurdistan.quizEmpty')}
    </div>
  );

  // ── Quiz-Abschluss ──
  if (finished) {
    const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div style={{
        maxWidth: 440, margin: '0 auto', textAlign: 'center',
        background: 'var(--surface)', border: '1.5px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '40px 32px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>
          {pct >= 80 ? '🏆' : pct >= 50 ? '👏' : '💪'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
          {t('kurdistan.quizFinished')}
        </div>
        <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
          {t('kurdistan.quizResult', { correct: score.correct, total: score.total, pct })}
        </div>
        {/* Score-Bar */}
        <div style={{
          height: 8, background: 'var(--stone-100)', borderRadius: 'var(--r-full)',
          overflow: 'hidden', marginBottom: 28,
        }}>
          <div style={{
            height: '100%', borderRadius: 'var(--r-full)',
            width: `${pct}%`, transition: 'width .6s ease',
            background: pct >= 80 ? 'var(--teal)' : pct >= 50 ? 'var(--sun)' : 'var(--red)',
          }} />
        </div>
        <button onClick={handleRestart}
          className="btn btn-primary btn-full btn-lg"
          style={{ borderRadius: 16, fontWeight: 900 }}>
          {t('kurdistan.quizRestart')}
        </button>
      </div>
    );
  }

  const cs = catStyle(cel.category);

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      {/* Score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700 }}>
          {current + 1} / {celebrities.length}
        </div>
        <div style={{
          background: 'var(--teal-lt)', borderRadius: 'var(--r-full)',
          padding: '4px 14px', fontSize: 13, fontWeight: 800, color: 'var(--teal-dk)',
        }}>
          ✅ {score.correct} / {score.total}
        </div>
      </div>

      {/* Progress-Bar */}
      <div style={{
        height: 4, background: 'var(--stone-100)', borderRadius: 'var(--r-full)',
        overflow: 'hidden', marginBottom: 16,
      }}>
        <div style={{
          height: '100%', borderRadius: 'var(--r-full)',
          width: `${((current) / celebrities.length) * 100}%`,
          background: 'var(--teal)', transition: 'width .3s ease',
        }} />
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--surface)', border: '1.5px solid var(--border)',
        borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Bild-Bereich */}
        <div style={{
          height: 220, background: `linear-gradient(135deg, ${cs.bg}, #E8E5E0)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {cel.image_url ? (
            <img src={cel.image_url} alt={cel.name} loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 72, marginBottom: 8 }}>🧑‍🎤</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                {t('kurdistan.quizHint')}
              </div>
            </div>
          )}
          {/* Kategorie-Badge */}
          <div style={{
            position: 'absolute', top: 14, right: 14,
            background: cs.bg, border: `1.5px solid ${cs.border}`,
            borderRadius: 'var(--r-full)', padding: '3px 12px',
            fontSize: 11, fontWeight: 800, color: cs.text,
          }}>
            {catLabel(cel.category, t)}
          </div>
        </div>

        <div style={{ padding: '20px 24px 24px' }}>
          <div style={{
            fontSize: 18, fontWeight: 900, color: 'var(--text-primary)',
            marginBottom: 16, lineHeight: 1.3,
          }}>
            {t('kurdistan.quizQuestion')}
          </div>

          {/* Antwort-Optionen */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {(cel.options || []).map((opt, i) => {
              let bg = 'var(--surface)', border = 'var(--border)', color = 'var(--text-primary)', shadow = '0 2px 0 var(--stone-100)';
              if (selected) {
                if (opt === result?.name) { bg = 'var(--teal-lt)'; border = 'var(--teal)'; color = '#044f43'; shadow = '0 2px 0 var(--teal-dk)'; }
                else if (opt === selected && !result?.correct) { bg = 'var(--red-lt)'; border = 'var(--red)'; color = '#8c1f1f'; shadow = '0 2px 0 var(--red-dk)'; }
              }
              return (
                <button key={i} onClick={() => handleAnswer(opt)}
                  disabled={!!selected || submitting}
                  style={{
                    background: bg, border: `2px solid ${border}`, borderRadius: 14,
                    padding: '12px 10px', fontSize: 13, fontWeight: 800,
                    color, cursor: selected ? 'default' : 'pointer',
                    boxShadow: shadow, transition: 'all .15s', textAlign: 'center',
                    fontFamily: 'var(--font)',
                  }}>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Ergebnis */}
          {result && (
            <div style={{
              background: result.correct ? 'var(--teal-lt)' : 'var(--red-lt)',
              border: `1.5px solid ${result.correct ? 'rgba(11,158,136,.25)' : 'rgba(217,64,64,.25)'}`,
              borderRadius: 'var(--r-lg)', padding: '14px 18px', marginBottom: 16,
              animation: 'feedbackIn .28s cubic-bezier(.34,1.56,.64,1)',
            }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: result.correct ? '#044f43' : '#8c1f1f', marginBottom: 6 }}>
                {result.correct ? t('kurdistan.quizCorrect') : t('kurdistan.quizWrong', { name: result.name })}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>
                {result.description}
              </div>
              {result.fun_fact && (
                <div style={{
                  fontSize: 12, color: 'var(--teal-dk)', fontStyle: 'italic',
                  borderTop: '1px solid rgba(11,158,136,.2)', paddingTop: 8, marginTop: 8,
                }}>
                  💡 {result.fun_fact}
                </div>
              )}
            </div>
          )}

          {result && (
            <button onClick={handleNext}
              className="btn btn-primary btn-full btn-lg"
              style={{ borderRadius: 16, fontWeight: 900, letterSpacing: '.4px' }}>
              {current + 1 < celebrities.length ? t('kurdistan.quizNext') : t('kurdistan.quizShowResult')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEKTION 2: Geschichten mit Vorlese-Funktion
// ══════════════════════════════════════════════════════════════════════════════
function StoriesSection() {
  const t = useT();
  const [stories,  setStories]  = useState([]);
  const [active,   setActive]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [playing,  setPlaying]  = useState(false);
  const uttRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    api.get('/kurdistan/stories')
      .then(r => { setStories(r.data); setLoading(false); })
      .catch(() => setLoading(false));
    return () => {
      window.speechSynthesis?.cancel();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const handleRead = useCallback((story) => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }

    if (playing && active?.id === story.id) {
      setPlaying(false);
      return;
    }
    setActive(story);
    setPlaying(true);

    if (story.audio_file) {
      const url = story.audio_file.startsWith('http') ? story.audio_file : `/uploads/audio/${story.audio_file}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlaying(false); audioRef.current = null; };
      audio.onerror = () => {
        audioRef.current = null;
        playTTS(story.content);
      };
      audio.play().catch(() => {
        audioRef.current = null;
        playTTS(story.content);
      });
    } else {
      playTTS(story.content);
    }
  }, [playing, active]);

  const playTTS = (text) => {
    if (!('speechSynthesis' in window)) { setPlaying(false); return; }
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'de-DE';
    utt.rate = 0.88;
    const voices = window.speechSynthesis.getVoices();
    const deVoice = voices.find(v => v.lang.startsWith('de'));
    if (deVoice) utt.voice = deVoice;
    utt.onend = () => setPlaying(false);
    utt.onerror = () => setPlaying(false);
    uttRef.current = utt;
    window.speechSynthesis.speak(utt);
  };

  const handleStop = () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  };

  const toggleStory = (story) => {
    if (active?.id === story.id) {
      handleStop();
      setActive(null);
    } else {
      setActive(story);
    }
  };

  if (loading) return <Spinner text={t('common.loading')} />;
  if (!stories.length) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
      {t('kurdistan.storiesEmpty')}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {stories.map(story => {
        const cs  = catStyle(story.category);
        const isActive = active?.id === story.id;
        const isPlaying = isActive && playing;

        return (
          <div key={story.id} style={{
            background: 'var(--surface)', border: `1.5px solid ${isActive ? 'var(--teal)' : 'var(--border)'}`,
            borderRadius: 'var(--r-xl)', padding: '20px 24px',
            boxShadow: isActive ? '0 4px 20px rgba(11,158,136,.1)' : 'var(--shadow-xs)',
            transition: 'all .2s var(--ease)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleStory(story)}>
                <div style={{
                  display: 'inline-block', background: cs.bg, border: `1px solid ${cs.border}`,
                  color: cs.text, borderRadius: 'var(--r-full)', padding: '2px 10px',
                  fontSize: 10, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase',
                }}>
                  {catLabel(story.category, t)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                  {story.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {t('kurdistan.storiesReadTime', { n: story.read_time })}
                </div>
              </div>

              {/* Play/Stop Button */}
              <button
                onClick={() => isPlaying ? handleStop() : handleRead(story)}
                style={{
                  width: 52, height: 52, borderRadius: 16, border: 'none',
                  background: isPlaying ? 'var(--red)' : 'var(--teal)',
                  color: '#fff', cursor: 'pointer', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 0 ${isPlaying ? 'var(--red-dk)' : 'var(--teal-dk)'}`,
                  transition: 'all .15s', marginLeft: 16,
                  fontFamily: 'var(--font)',
                }}
              >
                {isPlaying ? (
                  <span style={{ fontSize: 20 }}>⏹</span>
                ) : (
                  <SoundIcon />
                )}
              </button>
            </div>

            {/* Vorlese-Fortschritt */}
            {isPlaying && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                background: 'var(--teal-xlt)', borderRadius: 10, padding: '8px 14px',
              }}>
                <WaveAnimation />
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--teal-dk)' }}>
                  {t('kurdistan.storiesReading')}
                </span>
              </div>
            )}

            {/* Text — sichtbar wenn aktiv, zuklappbar */}
            {isActive && (
              <div style={{
                fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)',
                borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4,
                whiteSpace: 'pre-line',
              }}>
                {story.content}
              </div>
            )}

            {/* Klick zum Lesen ohne Vorlesen */}
            {!isActive && (
              <button
                onClick={() => setActive(story)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--teal)', fontSize: 13, fontWeight: 800,
                  padding: 0, fontFamily: 'var(--font)',
                }}>
                {t('kurdistan.storiesRead')}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SoundIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="none"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}

function WaveAnimation() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 18 }}>
      {[10, 16, 22, 14, 8].map((h, i) => (
        <div key={i} style={{
          width: 3, height: h, background: 'var(--teal)',
          borderRadius: 2, animation: `wave .8s ${i * 0.12}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SEKTION 3: Tages-Events (mit Zeitzonen-Fix)
// ══════════════════════════════════════════════════════════════════════════════
function TodayEvents() {
  const t = useT();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sende Client-Zeitzone an Backend, damit "heute" korrekt ist
    const tzOffset = new Date().getTimezoneOffset();
    api.get(`/kurdistan/events/today?tz_offset=${tzOffset}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Spinner text={t('common.loading')} />;

  const today    = new Date();
  const dayStr   = today.getDate();
  const monthStr = getMonthName(today.getMonth() + 1);

  return (
    <div>
      {/* Datum-Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        background: 'var(--surface)', border: '1.5px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '16px 22px',
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--teal), var(--teal-dk))',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{dayStr}</div>
          <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,.8)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{monthStr}</div>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-primary)' }}>
            {t('kurdistan.eventsTitle')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {data?.events?.length
              ? t('kurdistan.eventsCount', { n: data.events.length })
              : t('kurdistan.eventsNone')}
          </div>
        </div>
      </div>

      {/* Events */}
      {(!data?.events || data.events.length === 0) ? (
        <div style={{
          textAlign: 'center', padding: '40px 20px',
          background: 'var(--stone-50)', borderRadius: 'var(--r-xl)',
          border: '2px dashed var(--border)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-secondary)' }}>
            {t('kurdistan.eventsNoneDay', { day: dayStr, month: monthStr })}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            {t('kurdistan.eventsNoneHint')}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.events.map(ev => {
            const cs = catStyle(ev.category);
            return (
              <div key={ev.id} style={{
                background: 'var(--surface)', borderRadius: 'var(--r-xl)',
                border: `1.5px solid ${cs.border}`,
                borderLeft: `5px solid ${cs.border}`,
                padding: '18px 22px', boxShadow: 'var(--shadow-xs)',
                borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', flex: 1 }}>
                    {ev.title}
                  </div>
                  {ev.year && (
                    <div style={{
                      background: cs.bg, color: cs.text,
                      borderRadius: 'var(--r-full)', padding: '3px 12px',
                      fontSize: 12, fontWeight: 800, flexShrink: 0, marginLeft: 12,
                    }}>
                      {ev.year}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {ev.description}
                </div>
                <div style={{
                  marginTop: 10, fontSize: 11, fontWeight: 800,
                  color: cs.text, textTransform: 'uppercase', letterSpacing: '.06em',
                }}>
                  {catLabel(ev.category, t)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// HAUPT-SEITE
// ══════════════════════════════════════════════════════════════════════════════
export default function KurdistanPage() {
  const [tab, setTab] = useState('quiz');
  const t = useT();

  const TABS = [
    { id: 'quiz',    label: t('kurdistan.tabQuiz'),    icon: '🧑‍🎤' },
    { id: 'stories', label: t('kurdistan.tabStories'), icon: '📖' },
    { id: 'events',  label: t('kurdistan.tabEvents'),  icon: '📅' },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 20px 80px' }}>

      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #0B9E88, #6B48FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, flexShrink: 0,
          }}>
            🏔️
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {t('kurdistan.title')}
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t('kurdistan.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 28,
        background: 'var(--stone-50)', borderRadius: 'var(--r-lg)',
        padding: 6, border: '1.5px solid var(--border)',
      }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              flex: 1, padding: '9px 8px', border: 'none', cursor: 'pointer',
              borderRadius: 10, fontSize: 12, fontWeight: 800,
              fontFamily: 'var(--font)', transition: 'all .15s',
              background: tab === id ? 'var(--white)' : 'transparent',
              color:      tab === id ? 'var(--teal)' : 'var(--text-secondary)',
              boxShadow:  tab === id ? 'var(--shadow-xs)' : 'none',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab-Inhalt */}
      {tab === 'quiz'    && <CelebrityQuiz />}
      {tab === 'stories' && <StoriesSection />}
      {tab === 'events'  && <TodayEvents />}

      <style>{`
        @keyframes feedbackIn {
          from { opacity: 0; transform: translateY(10px) scale(.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes wave {
          0%,100% { transform: scaleY(.4); }
          50%     { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
