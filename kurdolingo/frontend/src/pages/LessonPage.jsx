import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useStore } from '../store';
import Spinner from '../components/ui/Spinner';
import { useT } from '../i18n';

// ── Audio Player — NUR echte Dateien, kein TTS ───────────────────────────────
function playFile(audioFile) {
  if (!audioFile) return;
  const url   = audioFile.startsWith('http') ? audioFile : `/uploads/audio/${audioFile}`;
  const audio = new Audio(url);
  audio.play().catch(err => console.warn('Audio nicht abspielbar:', err.message));
  return audio;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LessonPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const {
    session, startSession, submitAnswer, nextExercise,
    endSession, completeLesson, loseHeart, activeCourse, addToast,
  } = useStore();
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [showTip, setShowTip] = useState(false);
  const [tipText, setTipText] = useState('');

  useEffect(() => {
    api.get(`/lessons/${id}`)
      .then(r => {
        startSession(r.data);
        // Show tip intro if lesson has a tip
        if (r.data.tip) {
          setTipText(r.data.tip);
          setShowTip(true);
        }
        setLoading(false);
      })
      .catch(() => {
        addToast(t('lesson.loadError'), 'err');
        navigate('/');
      });
    return () => endSession();
  }, [id]);

  if (loading || !session) return <Spinner text={t('lesson.loading')} />;

  // Tip intro screen
  if (showTip) return (
    <TipIntro
      tip={tipText}
      lessonTitle={session.lesson?.title_tr || ''}
      lessonEmoji={session.lesson?.emoji || '📖'}
      onContinue={() => setShowTip(false)}
    />
  );

  if (session.finished)    return (
    <EndScreen
      session={session}
      navigate={navigate}
      completeLesson={completeLesson}
      activeCourse={activeCourse}
      lessonId={id}
    />
  );

  // Bug 1 fix: no hearts left → Game Over screen, lesson cannot continue
  if (session.hearts === 0 && !session.answered) return (
    <GameOver
      navigate={navigate}
      endSession={endSession}
      lessonId={id}
    />
  );

  const ex       = session.exercises[session.current];
  const total    = session.exercises.length;
  const progress = ((session.current + (session.answered ? 1 : 0)) / total) * 100;

  // Guard: empty lesson or exercise out of range
  if (!ex || total === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>📭</div>
        <p style={{ fontWeight: 700, color: '#8A8580' }}>
          {t('lesson.loadError')}
        </p>
        <button className="btn btn-primary btn-md" onClick={() => { endSession(); navigate('/'); }}>
          {t('common.backHome')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--stone-50)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '10px 20px', gap: 14,
        borderBottom: '1px solid var(--border)',
        background: 'var(--white)',
        position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 8px rgba(0,0,0,.06)',
      }}>
        <button
          onClick={() => { endSession(); navigate(-1); }}
          style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--stone-50)', border: '1.5px solid var(--border)',
            fontSize: 14, cursor: 'pointer', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all var(--dur-fast) var(--ease)', fontFamily: 'var(--font)',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--stone-100)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--stone-50)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >✕</button>

        <div className="progress-bar" style={{ flex: 1 }}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Exercise counter */}
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', flexShrink: 0, minWidth: 36, textAlign: 'center' }}>
          {session.current + 1}/{total}
        </span>

        <HeartsDisplay
          hearts={session.hearts}
          prevHearts={session.prevHearts ?? session.hearts}
        />
      </div>

      {/* Exercise */}
      <div style={{ flex: 1, maxWidth: 600, margin: '0 auto', width: '100%', padding: '24px 20px 160px' }}>
        <ExerciseRenderer
          key={ex.id}
          ex={ex}
          answered={session.answered}
          lastCorrect={session.lastCorrect}
          onSubmit={submitAnswer}
          onNext={nextExercise}
          onLoseHeart={loseHeart}
        />
      </div>
    </div>
  );
}

// ── Hearts with break animation ───────────────────────────────────────────────
function HeartsDisplay({ hearts, prevHearts }) {
  const [breaking, setBreaking] = useState(-1);

  useEffect(() => {
    if (prevHearts > hearts) {
      setBreaking(hearts); // index of newly-lost heart
      const t = setTimeout(() => setBreaking(-1), 600);
      return () => clearTimeout(t);
    }
  }, [hearts, prevHearts]);

  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`heart${i >= hearts ? ' lost' : ''}${i === breaking ? ' breaking' : ''}`}
        >❤️</span>
      ))}
    </div>
  );
}

// ── TTS helper — Browser Web Speech API fallback ─────────────────────────────
function speakTTS(text, lang = 'ku') {
  if (!('speechSynthesis' in window) || !text) return false;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  // Kurmanji has no dedicated voice — use Turkish (closest phonetically)
  // or fall back to whatever is available
  const voices = window.speechSynthesis.getVoices();
  const preferred = ['tr-TR', 'tr', 'de-DE', 'de', 'en-US'];
  for (const code of preferred) {
    const v = voices.find(v => v.lang.startsWith(code));
    if (v) { utt.voice = v; break; }
  }
  utt.rate = 0.85;  // slightly slower for language learning
  utt.pitch = 1;
  window.speechSynthesis.speak(utt);
  return true;
}

// ── Audio Button — real file OR TTS fallback ──────────────────────────────────
function AudioButton({ audioFile, ttsText, label }) {
  const t        = useT();
  const [playing, setPlaying] = useState(false);
  const audioRef  = useRef(null);
  const hasTTS    = !audioFile && !!ttsText && 'speechSynthesis' in window;

  const playAudioFile = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    const url   = audioFile.startsWith('http') ? audioFile : `/uploads/audio/${audioFile}`;
    const audio = new Audio(url);
    audioRef.current = audio;
    setPlaying(true);
    audio.play().catch(() => setPlaying(false));
    audio.onended = () => setPlaying(false);
    audio.onerror = () => {
      // Audio file failed — fall through to TTS if text is available
      setPlaying(false);
      if (ttsText) speakTTS(ttsText);
    };
  };

  const handlePlay = () => {
    if (playing) return;
    if (audioFile) {
      playAudioFile();
    } else if (hasTTS) {
      setPlaying(true);
      // Echtes onend-Event statt Zeitschätzung
      const utt = new SpeechSynthesisUtterance(ttsText);
      const voices = window.speechSynthesis.getVoices();
      const preferred = ['tr-TR', 'tr', 'de-DE', 'de', 'en-US'];
      for (const code of preferred) {
        const v = voices.find(v => v.lang.startsWith(code));
        if (v) { utt.voice = v; break; }
      }
      utt.rate  = 0.85;
      utt.onend = () => setPlaying(false);
      utt.onerror = () => setPlaying(false);
      // Sicherheits-Fallback: falls onend nicht feuert (Safari-Bug)
      const fallbackMs = Math.max(3000, ttsText.length * 100);
      const fallback = setTimeout(() => setPlaying(false), fallbackMs);
      utt.onend = () => { clearTimeout(fallback); setPlaying(false); };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utt);
    }
  };

  // No audio and no TTS support → show info placeholder
  if (!audioFile && !hasTTS) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        background: '#F5F4F1', border: '2px dashed #E0DDD8', borderRadius: 14,
        marginBottom: 20, color: '#8A8580',
      }}>
        <span style={{ fontSize: 22 }}>🎙️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t('lesson.noAudio')}</div>
          <div style={{ fontSize: 12, marginTop: 2 }}>{t('lesson.noAudioHint')}</div>
        </div>
      </div>
    );
  }

  const isTTSMode = !audioFile && hasTTS;

  return (
    <button
      onClick={handlePlay}
      disabled={playing}
      style={{
        background: playing ? '#097560' : isTTSMode ? '#6B48FF' : '#0B9E88',
        border: 'none', borderRadius: 14, padding: '14px 22px', cursor: playing ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
        boxShadow: `0 4px 0 ${playing ? '#065a48' : isTTSMode ? '#4a30cc' : '#097560'}`,
        fontFamily: 'var(--font)', fontSize: 15, fontWeight: 700, color: 'white',
        transition: 'background .15s',
      }}
    >
      {playing ? <SoundWaves /> : <span style={{ fontSize: 22 }}>{isTTSMode ? '🗣️' : '🔊'}</span>}
      <span>
        {playing
          ? t('lesson.playing')
          : isTTSMode ? t('lesson.listenTTS') : (label || t('lesson.listen'))}
      </span>
    </button>
  );
}

const SoundWaves = React.memo(function SoundWaves() {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 28 }}>
      {[12, 20, 28, 20, 12].map((h, i) => (
        <div key={i} style={{
          width: 4, height: h, background: 'white', borderRadius: 2,
          animation: `wave 0.8s ${i * 0.1}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
});

// ── Kurdish Special Character Keys ───────────────────────────────────────────
const KURDISH_CHARS = ['ê', 'î', 'û', 'ş', 'ç', 'ğ'];
function KurdishKeys({ onInsert }) {
  return (
    <div style={{
      display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap',
    }}>
      {KURDISH_CHARS.map(ch => (
        <button
          key={ch}
          type="button"
          onClick={(e) => { e.preventDefault(); onInsert(ch); }}
          style={{
            width: 40, height: 38, borderRadius: 10,
            border: '2px solid var(--border)',
            background: 'var(--white)', cursor: 'pointer',
            fontSize: 17, fontWeight: 800, color: 'var(--teal)',
            fontFamily: 'var(--font)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 0 var(--border)',
            transition: 'all .1s',
          }}
          onMouseDown={e => e.preventDefault()}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--teal-xlt)'; e.currentTarget.style.borderColor = 'var(--teal)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {ch}
        </button>
      ))}
    </div>
  );
}

// ── Exercise Renderer ─────────────────────────────────────────────────────────
function ExerciseRenderer({ ex, answered, lastCorrect, onSubmit, onNext, onLoseHeart }) {
  const t = useT();
  const [selected,      setSelected]      = useState(null);
  const [textVal,       setTextVal]       = useState('');
  const [wordAnswer,    setWordAnswer]    = useState([]);  // [{idx, word}]
  const [usedIdxs,      setUsedIdxs]     = useState([]);
  const [matchSel,      setMatchSel]      = useState(null);
  const [matchDone,     setMatchDone]     = useState([]);
  const [matchWrong,    setMatchWrong]    = useState([]);
  const [matchFinished, setMatchFinished] = useState(false);
  const [matchResult,   setMatchResult]   = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const areaRef      = useRef();
  const submittingRef = useRef(false);

  // ── Globale Keyboard-Shortcuts ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      // 1-4: Multiple Choice auswählen
      if (ex.type === 'mc' && !answered && ['1','2','3','4'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        const opts = ex.options || [];
        if (opts[idx] !== undefined) setSelected(opts[idx]);
      }
      // Space oder Enter: Weiter nach Antwort
      if ((e.key === ' ' || e.key === 'Enter') && answered && ex.type !== 'match') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ex, answered, onNext]);  // synchroner Guard gegen Doppelklick

  // Auto-play audio when exercise loads (listen type only)
  useEffect(() => {
    if (ex.type === 'listen') {
      const t = setTimeout(() => {
        if (ex.audio_file) {
          playFile(ex.audio_file);
        } else if (ex.tts_text || ex.answer) {
          speakTTS(ex.tts_text || ex.answer || '');
        }
      }, 450);
      return () => clearTimeout(t);
    }
  }, []);

  const shake = () => {
    if (!areaRef.current) return;
    areaRef.current.classList.add('shake');
    setTimeout(() => areaRef.current?.classList.remove('shake'), 420);
  };

  const doSubmit = async (userAnswer) => {
    // submittingRef ist synchron — verhindert Race Condition bei schnellem Doppelklick,
    // auch bevor React den submitting-State in der nächsten Render-Runde aktualisiert hat.
    if (submittingRef.current || answered) return null;
    if (userAnswer == null || userAnswer === '') return null;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await onSubmit(ex.id, String(userAnswer));
      if (result && !result.correct) shake();
      return result;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCheck = async () => {
    if (answered)              { onNext(); return; }
    if (submittingRef.current) return;
    let answer;
    switch (ex.type) {
      case 'mc':      answer = selected;              break;
      case 'listen':  answer = textVal.trim();        break;
      case 'arrange': answer = wordAnswer.map(w => w.word).join(' '); break;
      case 'fill':    answer = textVal.trim();        break;
      default:        return;
    }
    if (!answer) return;
    await doSubmit(answer);
  };

  // Match pair logic
  const handleMatchPick = async (val) => {
    if (matchFinished || matchWrong.length > 0 || submittingRef.current) return;
    if (matchDone.includes(val)) return;
    if (!matchSel)       { setMatchSel(val); return; }
    if (matchSel === val) { setMatchSel(null); return; }

    const pair = ex.pairs?.find(p =>
      (matchSel === p.k && val === p.t) || (matchSel === p.t && val === p.k)
    );

    if (pair) {
      const newDone = [...matchDone, pair.k, pair.t];
      setMatchDone(newDone);
      setMatchSel(null);
      if (newDone.length === ex.pairs.length * 2) {
        setMatchFinished(true);
        setSubmitting(true);
        try {
          const r = await onSubmit(ex.id, ex.answer || pair.k);
          setMatchResult(r);
        } finally { setSubmitting(false); }
      }
    } else {
      // Wrong pair: flash red + lose a heart, but do NOT set answered=true
      setMatchWrong([matchSel, val]);
      setMatchSel(null);
      shake();
      onLoseHeart();  // deducts heart locally without touching answered state
      setTimeout(() => setMatchWrong([]), 700);
    }
  };

  // Arrange helpers
  const addWord = (idx) => {
    if (usedIdxs.includes(idx) || answered) return;
    setWordAnswer(a => [...a, { idx, word: ex.words[idx] }]);
    setUsedIdxs(u => [...u, idx]);
  };
  const removeWord = (pos) => {
    if (answered) return;
    const item = wordAnswer[pos];
    setWordAnswer(a => a.filter((_, i) => i !== pos));
    setUsedIdxs(u => { const c = [...u]; c.splice(c.indexOf(item.idx), 1); return c; });
  };

  const canCheck =
    ex.type === 'mc'      ? selected !== null :
    ex.type === 'listen'  ? textVal.trim().length > 0 :
    ex.type === 'arrange' ? wordAnswer.length > 0 :
    ex.type === 'fill'    ? textVal.trim().length > 0 :
    false;

  const typeLabel = {
    mc:      t('lesson.typeLabels.mc'),
    listen:  t('lesson.typeLabels.listen'),
    arrange: t('lesson.typeLabels.arrange'),
    match:   t('lesson.typeLabels.match'),
    fill:    t('lesson.typeLabels.fill'),
  }[ex.type] || ex.type;

  return (
    <div ref={areaRef} style={{ background: 'var(--white)', borderRadius: 'var(--r-xl)', border: '1.5px solid var(--border)', padding: '28px 24px 24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 11, fontWeight: 900, marginBottom: 16, color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '.09em', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', display: 'inline-block' }} />
        {typeLabel}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, lineHeight: 1.35, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>
        {ex.question}
      </div>
      {ex.hint && (
        <div style={{
          fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20,
          fontStyle: 'italic', display: 'flex', gap: 8, alignItems: 'center',
          background: 'var(--stone-50)', borderRadius: 10, padding: '9px 14px',
          border: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>💡</span>
          <span>{ex.hint}</span>
        </div>
      )}

      {/* ── Multiple Choice ── */}
      {ex.type === 'mc' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
          {(ex.options || []).map((opt, i) => {
            let cls = 'choice-btn';
            if (answered) {
              if (opt === ex.answer) cls += ' correct';
              else if (opt === selected) cls += ' wrong';
            } else if (opt === selected) cls += ' selected';
            return (
              <button key={i} className={cls}
                disabled={answered || submitting}
                aria-label={`Option ${i+1}: ${opt}`}
                aria-pressed={opt === selected}
                onClick={() => !answered && setSelected(opt)}>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Listen & Type ── */}
      {ex.type === 'listen' && (
        <>
          <AudioButton audioFile={ex.audio_file} ttsText={ex.tts_text || ex.answer || ''} label={ex.tts_text || ex.answer || ''} />
          <input
            className={`input${answered
              ? (textVal.trim().toLowerCase() === (ex.answer || '').toLowerCase() ? ' correct' : ' wrong')
              : ''}`}
            value={textVal}
            onChange={e => setTextVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
            placeholder={t('lesson.typeAnswer')}
            disabled={answered}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            style={{ fontSize: 18, padding: '14px 18px' }}
            id="listen-input"
          />
          {!answered && <KurdishKeys onInsert={ch => setTextVal(v => v + ch)} />}
          {answered && textVal.trim().toLowerCase() !== (ex.answer || '').toLowerCase() && (
            <div style={{
              marginTop: 10, padding: '12px 16px',
              background: 'var(--teal-lt)', borderRadius: 12,
              fontSize: 14, fontWeight: 800, color: '#044f43',
              border: '1.5px solid rgba(11,158,136,.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>💡</span>
              {t('lesson.rightAnswer', {answer: ex.answer || ''})}
            </div>
          )}
        </>
      )}

      {/* ── Word Arrange ── */}
      {ex.type === 'arrange' && (
        <>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 64, padding: '14px 16px',
            border: `2px solid ${answered ? (lastCorrect ? 'var(--teal)' : 'var(--red)') : wordAnswer.length > 0 ? 'var(--teal)' : 'var(--border-dk)'}`,
            borderRadius: 16,
            background: answered ? (lastCorrect ? 'var(--teal-xlt)' : 'var(--red-lt)') : wordAnswer.length > 0 ? 'var(--teal-xlt)' : 'var(--white)',
            marginBottom: 12, transition: 'all var(--dur-base) var(--ease)',
          }}>
            {wordAnswer.length === 0
              ? <span style={{ color: 'var(--text-muted)', fontSize: 14, padding: 4, alignSelf: 'center', fontStyle: 'italic' }}>
                  {t('lesson.addWords')}
                </span>
              : wordAnswer.map((item, i) => (
                  <button key={`p${i}`} className="word-tile placed"
                    disabled={answered} onClick={() => removeWord(i)}>
                    {item.word}
                  </button>
                ))
            }
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '14px 16px',
                        border: '2px dashed var(--border-dk)', borderRadius: 16, background: 'var(--stone-50)' }}>
            {(ex.words || []).map((w, i) => (
              <button key={i} className={`word-tile${usedIdxs.includes(i) ? ' used' : ''}`}
                disabled={answered || usedIdxs.includes(i)} onClick={() => addWord(i)}>
                {w}
              </button>
            ))}
          </div>
          {answered && !lastCorrect && (
            <div style={{
              marginTop: 12, padding: '12px 16px',
              background: 'var(--teal-lt)', borderRadius: 12,
              fontSize: 14, fontWeight: 800, color: '#044f43',
              border: '1.5px solid rgba(11,158,136,.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>💡</span>
              {t('lesson.rightOrder', {answer: ex.answer || ''})}
            </div>
          )}
        </>
      )}

      {/* ── Match Pairs ── */}
      {ex.type === 'match' && (
        <MatchPairs
          ex={ex}
          matchSel={matchSel} matchDone={matchDone}
          matchWrong={matchWrong} matchFinished={matchFinished}
          matchResult={matchResult} submitting={submitting}
          onPick={handleMatchPick} onNext={onNext}
          onLoseHeart={onLoseHeart}
        />
      )}

      {/* ── Fill ── */}
      {ex.type === 'fill' && (
        <div style={{ marginTop: 12 }}>
          <input className="input" value={textVal}
            onChange={e => setTextVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCheck()}
            placeholder={t('lesson.fillBlank')} disabled={answered}
            autoComplete="off" autoCorrect="off" spellCheck={false}
            style={{
              fontSize: 18, padding: '15px 18px',
              borderRadius: 14, fontWeight: 800,
              borderColor: answered ? (lastCorrect ? 'var(--teal)' : 'var(--red)') : undefined,
              background: answered ? (lastCorrect ? 'var(--teal-xlt)' : 'var(--red-lt)') : undefined,
            }} />
          {!answered && <KurdishKeys onInsert={ch => setTextVal(v => v + ch)} />}
          {answered && !lastCorrect && (
            <div style={{
              marginTop: 10, padding: '12px 16px',
              background: 'var(--teal-lt)', borderRadius: 12,
              fontSize: 14, fontWeight: 800, color: '#044f43',
              border: '1.5px solid rgba(11,158,136,.2)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>💡</span>
              {t('lesson.rightAnswer', {answer: ex.answer || ''})}
            </div>
          )}
        </div>
      )}

      {/* Feedback (non-match) */}
      {answered && ex.type !== 'match' && (
        <div className={`feedback ${lastCorrect ? 'feedback-ok' : 'feedback-err'}`}
             style={{ marginTop: 20 }}
             role="status" aria-live="polite" aria-atomic="true">
          <div className="fb-icon">{lastCorrect ? '✅' : '💔'}</div>
          <div>
            <h4>{lastCorrect ? t('lesson.correct') : t('lesson.wrong')}</h4>
            <p>{lastCorrect ? t('lesson.xpEarned', {xp:10}) : t('lesson.rightAnswer', {answer: ex.answer || ''})}</p>
          </div>
        </div>
      )}

      {/* Check / Next button (non-match) — sticky bottom */}
      {ex.type !== 'match' && (
        <div style={{
          position: 'sticky', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(to top, var(--stone-50) 70%, transparent)',
          padding: '16px 0 4px', marginTop: 24,
        }}>
          <button
            onClick={handleCheck}
            disabled={!answered && (!canCheck || submitting)}
            className={`btn btn-lg btn-full ${
              answered
                ? (lastCorrect ? 'btn-primary' : 'btn-danger')
                : (canCheck ? 'btn-primary' : 'btn-check-inactive')
            }`}
            style={{ textTransform: 'uppercase', letterSpacing: '.6px', borderRadius: 18, fontSize: 16, padding: '17px', fontWeight: 900 }}
          >
            {submitting ? '…' : answered ? t('lesson.next') : t('lesson.check')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Match Pairs Component ─────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MatchPairs({ ex, matchSel, matchDone, matchWrong, matchFinished, matchResult, submitting, onPick, onNext, onLoseHeart }) {
  const t = useT();
  // Shuffle once on mount via useState with initializer function
  const [lefts]  = React.useState(() => shuffle((ex.pairs || []).map(p => p.k)));
  const [rights] = React.useState(() => shuffle((ex.pairs || []).map(p => p.t)));

  const tile = (val) => ({
    background:  matchDone.includes(val) ? '#D0F5EF' : matchSel === val ? '#D0F5EF' : matchWrong.includes(val) ? '#FFE8E8' : '#fff',
    borderColor: matchDone.includes(val) ? '#0B9E88' : matchSel === val ? '#0B9E88' : matchWrong.includes(val) ? '#D94040' : '#E0DDD8',
    opacity:     matchDone.includes(val) ? 0.6 : 1,
    transition:  'background .2s, border-color .2s',
  });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lefts.map((val, i) => (
            <button key={i} className="choice-btn" style={tile(val)}
              disabled={matchDone.includes(val) || matchFinished || submitting}
              onClick={() => onPick(val)}>{val}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rights.map((val, i) => (
            <button key={i} className="choice-btn" style={tile(val)}
              disabled={matchDone.includes(val) || matchFinished || submitting}
              onClick={() => onPick(val)}>{val}</button>
          ))}
        </div>
      </div>

      {matchFinished && matchResult && (
        <>
          <div className={`feedback ${matchResult.correct ? 'feedback-ok' : 'feedback-err'}`}
               style={{ marginTop: 20 }}>
            <div className="fb-icon">{matchResult.correct ? '✅' : '💔'}</div>
            <div>
              <h4>{matchResult.correct ? t('lesson.allPairsFound') : t('lesson.wrong')}</h4>
              <p>{matchResult.correct ? t('lesson.xpEarned', {xp: 10}) : t('lesson.keepPracticing')}</p>
            </div>
          </div>
          <div style={{
            position: 'sticky', bottom: 0,
            background: 'linear-gradient(to top, var(--stone-50) 70%, transparent)',
            padding: '16px 0 4px', marginTop: 16,
          }}>
            <button
              className={`btn btn-lg btn-full ${matchResult.correct ? 'btn-primary' : 'btn-danger'}`}
              onClick={onNext}
              style={{ textTransform: 'uppercase', letterSpacing: '.6px', borderRadius: 18, fontSize: 16, padding: '17px', fontWeight: 900 }}>
              {t('lesson.next')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}


// ── Tip Intro Screen ─────────────────────────────────────────────────────────
function TipIntro({ tip, lessonTitle, lessonEmoji, onContinue }) {
  const t = useT();
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--white)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, marginBottom: 16, animation: 'bounce .8s ease' }}>{lessonEmoji}</div>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
        {lessonTitle}
      </h2>
      <div style={{
        maxWidth: 440, margin: '0 auto 32px',
        background: 'linear-gradient(135deg, var(--teal-xlt), #E8FAF6)',
        border: '2px solid rgba(11,158,136,.2)', borderRadius: 20,
        padding: '24px 28px', textAlign: 'left',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 22 }}>💡</span>
          <span style={{ fontWeight: 900, fontSize: 15, color: 'var(--teal-dk)' }}>{t('lesson.tipTitle')}</span>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: '#2D4A44', margin: 0, whiteSpace: 'pre-line' }}>
          {tip}
        </p>
      </div>
      <button
        className="btn btn-primary btn-lg"
        onClick={onContinue}
        style={{ borderRadius: 18, padding: '15px 48px', fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '.6px' }}
      >
        {t('lesson.startExercises')} 🚀
      </button>
      <style>{'@keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-12px)}}'}</style>
    </div>
  );
}

// ── Game Over ─────────────────────────────────────────────────────────────────
function GameOver({ navigate, endSession, lessonId }) {
  const t = useT();
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--white)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 'var(--sp-10) var(--sp-5)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 80, marginBottom: 'var(--sp-5)', animation: 'bounce .8s ease' }}>💔</div>
      <h2 style={{ fontSize: 'var(--text-display)', fontWeight: 'var(--weight-black)', color: 'var(--red)', marginBottom: 'var(--sp-3)', letterSpacing: '-.02em' }}>
        {t('lesson.gameOver.title')}
      </h2>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-10)', maxWidth: 320, lineHeight: 1.6 }}>
        {t('lesson.gameOver.subtitle')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', width: '100%', maxWidth: 320 }}>
        <button
          className="btn btn-primary btn-lg btn-full"
          onClick={() => { endSession(); navigate(`/lesson/${lessonId}`); }}
        >
          🔄 {t('lesson.gameOver.retry')}
        </button>
        <button
          className="btn btn-ghost btn-lg btn-full"
          onClick={() => { endSession(); navigate('/'); }}
        >
          🏠 {t('lesson.gameOver.home')}
        </button>
      </div>
      <style>{'@keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-18px)}}'}</style>
    </div>
  );
}

// ── End Screen ────────────────────────────────────────────────────────────────
function EndScreen({ session, navigate, completeLesson, activeCourse, lessonId }) {
  const t = useT();
  const [saved, setSaved] = useState(false);
  const [nextLessonId, setNextLessonId] = useState(null);
  const xpEarned = session.correct * 10;
  const accuracy = session.total > 0 ? Math.round((session.correct / session.total) * 100) : 100;

  // Stars based on accuracy: 100%=3, >=70%=2, else 1
  const stars = accuracy === 100 ? 3 : accuracy >= 70 ? 2 : 1;

  useEffect(() => {
    if (!saved) {
      setSaved(true);
      const pairId = activeCourse?.id || session.lesson?.pair_id;
      if (pairId) {
        completeLesson(lessonId, pairId, xpEarned, accuracy);
      }
    }
    // Find next lesson in same unit
    if (session.lesson?.unit_id) {
      api.get(`/lessons?unit_id=${session.lesson.unit_id}`).then(r => {
        const lessons = r.data || [];
        const idx = lessons.findIndex(l => l.id === lessonId);
        if (idx >= 0 && idx < lessons.length - 1) {
          setNextLessonId(lessons[idx + 1].id);
        }
      }).catch(() => {});
    }
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 80, marginBottom: 16, animation: 'bounce 1s ease' }}>🎉</div>

      {/* Stars */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'center' }}>
        {[1, 2, 3].map(i => (
          <span key={i} style={{
            fontSize: 38, filter: i <= stars ? 'none' : 'grayscale(1) opacity(.3)',
            animation: i <= stars ? `starPop .4s ${i * 0.15}s ease both` : 'none',
          }}>⭐</span>
        ))}
      </div>

      <div style={{ fontSize: 32, fontWeight: 900, color: '#0B9E88', marginBottom: 8 }}>{t('lesson.end.title')}</div>
      <div style={{ fontSize: 16, color: '#8A8580', marginBottom: 32 }}>{t('lesson.end.subtitle')}</div>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
        {[
          { icon: '⚡', val: `+${xpEarned} XP`, label: t('lesson.end.xp'),       color: '#0B9E88', bg: 'var(--teal-xlt)', border: 'rgba(11,158,136,.2)' },
          { icon: '🎯', val: `${accuracy}%`,    label: t('lesson.end.accuracy'),  color: '#6B48FF', bg: 'var(--purple-lt)', border: 'rgba(107,72,255,.2)' },
          { icon: '❤️', val: session.hearts,    label: t('lesson.end.hearts'),    color: '#D94040', bg: 'var(--red-lt)',    border: 'rgba(217,64,64,.2)'   },
        ].map(({ icon, val, label, color, bg, border }) => (
          <div key={label} style={{
            background: bg, border: `2px solid ${border}`,
            borderRadius: 20, padding: '22px 32px', minWidth: 110,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <div style={{ fontSize: 34, lineHeight: 1 }}>{icon}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1.1 }}>{val}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color, opacity: .7,
                          textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        {nextLessonId && (
          <button className="btn btn-primary btn-lg btn-full" onClick={() => navigate(`/lesson/${nextLessonId}`)}
            style={{ borderRadius: 18, padding: '15px 40px', fontSize: 16, fontWeight: 900 }}>
            {t('lesson.end.nextLesson')} →
          </button>
        )}
        {accuracy < 100 && (
          <button className="btn btn-ghost btn-lg btn-full" onClick={() => { navigate(`/lesson/${lessonId}`); }}
            style={{ borderRadius: 18, padding: '15px 40px', fontSize: 16, fontWeight: 900 }}>
            🔄 {t('lesson.end.retry')}
          </button>
        )}
        <button className="btn btn-ghost btn-lg btn-full" onClick={() => navigate('/')}
          style={{ borderRadius: 18, padding: '15px 40px', fontSize: 16, fontWeight: 900 }}>
          {t('lesson.end.home')}
        </button>
      </div>
      <style>{`
        @keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-20px)}}
        @keyframes starPop{0%{transform:scale(0) rotate(-30deg);opacity:0}60%{transform:scale(1.3) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
      `}</style>
    </div>
  );
}
