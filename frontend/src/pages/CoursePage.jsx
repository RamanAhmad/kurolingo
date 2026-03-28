import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useStore } from '../store';
import Spinner from '../components/ui/Spinner';
import { useT } from '../i18n';

export default function CoursePage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const t           = useT();
  const { setActiveCourse, loadProgress } = useStore();
  const [course,  setCourse]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    api.get(`/courses/${id}`)
      .then(r => { setCourse(r.data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [id]);

  if (loading) return <Spinner text={t('course.loading')} />;

  if (error || !course) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
      <h2 style={{ fontWeight: 900, marginBottom: 16 }}>{t('course.notFound')}</h2>
      <button className="btn btn-primary btn-md" onClick={() => navigate('/')}>{t('course.backHome')}</button>
    </div>
  );

  const handleStart = () => {
    setActiveCourse(course);
    loadProgress(course.id);
    navigate('/');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0B9E88 0%, #064d40 100%)',
        borderRadius: 20, padding: '24px 20px', color: '#fff', marginBottom: 28,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 48, lineHeight: 1, filter: 'drop-shadow(0 5px 10px rgba(0,0,0,.28)) drop-shadow(0 2px 4px rgba(0,0,0,.18))', flexShrink: 0 }}>{course.from_flag}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-.01em', wordBreak: 'break-word' }}>{course.name}</div>
            <div style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>
              {course.dialect} · {course.difficulty} · {course.from_name}
            </div>
          </div>
        </div>
        <button
          className="btn btn-lg"
          onClick={handleStart}
          style={{ background: '#fff', color: '#0B9E88', fontWeight: 800, border: 'none', boxShadow: '0 4px 0 rgba(0,0,0,.15)', width: '100%' }}
        >
          {t('course.start')}
        </button>
      </div>

      {/* Description */}
      {course.description && (
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
          {course.description}
        </p>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { icon: '📚', val: course.units?.length ?? '—', label: t('course.units') },
          { icon: '📖', val: course.lesson_count  ?? '—', label: t('course.lessons') },
          { icon: '💬', val: course.vocab_count   ?? '—', label: t('course.vocabCount') },
        ].map(({ icon, val, label }) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '20px 12px', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ fontSize: 32, filter: 'drop-shadow(0 3px 6px rgba(0,0,0,.2)) drop-shadow(0 1px 3px rgba(0,0,0,.14))' }}>{icon}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--teal)', margin: '6px 0' }}>{val}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Units list */}
      {course.units && course.units.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
            {t('course.learningPath')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {course.units.map((unit, i) => (
              <div key={unit.id} style={{
                background: 'var(--white)', border: '1.5px solid var(--border)',
                borderRadius: 14, padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: unit.color || '#0B9E88',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 20,
                  boxShadow: '0 3px 0 rgba(0,0,0,.15), 0 2px 6px rgba(0,0,0,.12)',
                }}>
                  <span style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,.25))' }}>
                    {unit.emoji || `${i + 1}`}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{unit.title_tr}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{unit.title_ku}</div>
                </div>
                <span style={{
                  background: 'var(--stone-50)', borderRadius: 20, padding: '3px 10px',
                  fontSize: 11, fontWeight: 800, color: 'var(--text-muted)',
                }}>
                  {t('course.lessonsCount', { n: unit.lesson_count ?? 0 })}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary btn-lg" onClick={handleStart} style={{ width: '100%' }}>
          {t('course.start')}
        </button>
        <button className="btn btn-ghost btn-lg" onClick={() => navigate(-1)} style={{ width: '100%' }}>
          {t('course.back')}
        </button>
      </div>
    </div>
  );
}
