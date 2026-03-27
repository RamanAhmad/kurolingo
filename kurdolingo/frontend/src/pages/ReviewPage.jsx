import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useStore } from '../store';
import Spinner from '../components/ui/Spinner';
import { useT } from '../i18n';

export default function ReviewPage() {
  const navigate = useNavigate();
  const { user, addToast } = useStore();
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [exercises, setExercises] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [selected, setSelected] = useState(null);
  const [textVal, setTextVal] = useState('');
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const areaRef = useRef(null);

  useEffect(() => {
    api.get('/lessons/review')
      .then(r => {
        const due = r.data?.due || [];
        if (due.length === 0) {
          addToast(t('review.noDue'), 'ok');
          navigate('/');
          return;
        }
        // Parse JSON fields
        const parsed = due.map(e => ({
          ...e,
          options: typeof e.options === 'string' ? JSON.parse(e.options) : e.options,
          pairs: typeof e.pairs === 'string' ? JSON.parse(e.pairs) : e.pairs,
          words: typeof e.words === 'string' ? JSON.parse(e.words) : e.words,
        }));
        setExercises(parsed);
        setLoading(false);
      })
      .catch(() => {
        addToast(t('review.loadError'), 'err');
        navigate('/');
      });
  }, []);

  if (loading) return <Spinner text={t('review.loading')} />;

  if (finished) {
    const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 100;
    const stars = accuracy === 100 ? 3 : accuracy >= 70 ? 2 : 1;
    return (
      <div style={{
        minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16, animation: 'bounce 1s ease' }}>🔁</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[1, 2, 3].map(i => (
            <span key={i} style={{
              fontSize: 38, filter: i <= stars ? 'none' : 'grayscale(1) opacity(.3)',
              animation: i <= stars ? `starPop .4s ${i * 0.15}s ease both` : 'none',
            }}>⭐</span>
          ))}
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: '#0B9E88', marginBottom: 8 }}>
          {t('review.done')}
        </h2>
        <p style={{ color: '#8A8580', marginBottom: 32, fontSize: 16 }}>
          {score.correct}/{score.total} {t('review.correctCount')}
        </p>
        <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}
          style={{ borderRadius: 18, padding: '15px 40px', fontSize: 16, fontWeight: 900 }}>
          {t('lesson.end.home')}
        </button>
        <style>{`
          @keyframes bounce{0%,100%{transform:translateY(0)}40%{transform:translateY(-20px)}}
          @keyframes starPop{0%{transform:scale(0) rotate(-30deg);opacity:0}60%{transform:scale(1.3) rotate(5deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
        `}</style>
      </div>
    );
  }

  const ex = exercises[current];
  if (!ex) return null;

  const progress = ((current + (answered ? 1 : 0)) / exercises.length) * 100;

  const shake = () => {
    if (!areaRef.current) return;
    areaRef.current.classList.add('shake');
    setTimeout(() => areaRef.current?.classList.remove('shake'), 420);
  };

  const handleSubmit = async () => {
    if (answered) {
      // Next
      if (current + 1 >= exercises.length) {
        setFinished(true);
      } else {
        setCurrent(c => c + 1);
        setAnswered(false);
        setLastCorrect(false);
        setSelected(null);
        setTextVal('');
      }
      return;
    }

    let answer;
    if (ex.type === 'mc') answer = selected;
    else answer = textVal.trim();
    if (!answer) return;

    setSubmitting(true);
    try {
      const { data } = await api.post(`/lessons/${ex.lesson_id}/submit`, {
        exercise_id: ex.id,
        user_answer: answer,
      });
      setAnswered(true);
      setLastCorrect(data.correct);
      setScore(s => ({
        correct: data.correct ? s.correct + 1 : s.correct,
        total: s.total + 1,
      }));
      if (!data.correct) shake();
    } catch {
      addToast(t('review.submitError'), 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const typeLabel = {
    mc: t('lesson.typeLabels.mc'),
    listen: t('lesson.typeLabels.listen'),
    fill: t('lesson.typeLabels.fill'),
    arrange: t('lesson.typeLabels.arrange'),
  }[ex.type] || ex.type;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--stone-50)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 20px', gap: 14,
        borderBottom: '1px solid var(--border)', background: 'var(--white)',
        position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 8px rgba(0,0,0,.06)',
      }}>
        <button onClick={() => navigate('/')} style={{
          width: 34, height: 34, borderRadius: '50%', background: 'var(--stone-50)',
          border: '1.5px solid var(--border)', fontSize: 14, cursor: 'pointer',
          color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'var(--font)', flexShrink: 0,
        }}>✕</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ fontSize: 18 }}>🔁</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--sun-dk)' }}>{t('review.title')}</span>
        </div>

        <div className="progress-bar" style={{ flex: 2 }}>
          <div className="progress-fill" style={{ width: `${progress}%`, background: 'var(--sun)' }} />
        </div>

        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-muted)' }}>
          {current + 1}/{exercises.length}
        </span>
      </div>

      {/* Exercise */}
      <div style={{ flex: 1, maxWidth: 600, margin: '0 auto', width: '100%', padding: '24px 20px 160px' }}>
        <div ref={areaRef} style={{
          background: 'var(--white)', borderRadius: 'var(--r-xl)',
          border: '1.5px solid var(--border)', padding: '28px 24px 24px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 900, marginBottom: 16, color: 'var(--sun)',
            textTransform: 'uppercase', letterSpacing: '.09em',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sun)', display: 'inline-block' }} />
            🔁 {typeLabel}
          </div>

          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8, lineHeight: 1.35, color: 'var(--text-primary)' }}>
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

          {/* MC */}
          {ex.type === 'mc' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              {(ex.options || []).map((opt, i) => {
                let cls = 'choice-btn';
                if (answered) {
                  if (opt === ex.answer) cls += ' correct';
                  else if (opt === selected) cls += ' wrong';
                } else if (opt === selected) cls += ' selected';
                return (
                  <button key={i} className={cls} disabled={answered || submitting}
                    onClick={() => !answered && setSelected(opt)}>{opt}</button>
                );
              })}
            </div>
          )}

          {/* Text input types: listen, fill */}
          {(ex.type === 'listen' || ex.type === 'fill') && (
            <input className="input" value={textVal}
              onChange={e => setTextVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={ex.type === 'listen' ? t('lesson.typeAnswer') : t('lesson.fillBlank')}
              disabled={answered} autoComplete="off" autoCorrect="off" spellCheck={false}
              style={{
                fontSize: 18, padding: '14px 18px', marginTop: 12,
                borderColor: answered ? (lastCorrect ? 'var(--teal)' : 'var(--red)') : undefined,
                background: answered ? (lastCorrect ? 'var(--teal-xlt)' : 'var(--red-lt)') : undefined,
              }} />
          )}

          {/* Feedback */}
          {answered && (
            <div className={`feedback ${lastCorrect ? 'feedback-ok' : 'feedback-err'}`} style={{ marginTop: 20 }}>
              <div className="fb-icon">{lastCorrect ? '✅' : '💔'}</div>
              <div>
                <h4>{lastCorrect ? t('lesson.correct') : t('lesson.wrong')}</h4>
                <p>{lastCorrect ? t('lesson.xpEarned', { xp: 10 }) : t('lesson.rightAnswer', { answer: ex.answer })}</p>
              </div>
            </div>
          )}

          {/* Check / Next button */}
          <div style={{
            position: 'sticky', bottom: 0, background: 'linear-gradient(to top, var(--stone-50) 70%, transparent)',
            padding: '16px 0 4px', marginTop: 24,
          }}>
            <button onClick={handleSubmit}
              disabled={!answered && ((ex.type === 'mc' ? !selected : !textVal.trim()) || submitting)}
              className={`btn btn-lg btn-full ${
                answered ? (lastCorrect ? 'btn-primary' : 'btn-danger') :
                ((ex.type === 'mc' ? selected : textVal.trim()) ? 'btn-primary' : 'btn-check-inactive')
              }`}
              style={{ textTransform: 'uppercase', letterSpacing: '.6px', borderRadius: 18, fontSize: 16, padding: '17px', fontWeight: 900 }}>
              {submitting ? '…' : answered ? t('lesson.next') : t('lesson.check')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
