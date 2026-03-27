import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useStore } from '../store';
import Spinner from '../components/ui/Spinner';
import { useT } from '../i18n';

export default function HomePage() {
  const [courses,    setCourses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [reviewDue,  setReviewDue]  = useState(0);
  const { user, activeCourse, setActiveCourse, loadProgress, progress, loadCourses } = useStore();
  const t = useT();
  const navigate = useNavigate();

  useEffect(() => {
    // Kurse aus Cache oder API laden
    loadCourses().then(data => { setCourses(data || []); setLoading(false); }).catch(() => setLoading(false));
    // Fällige Wiederholungen prüfen
    api.get('/lessons/review').then(r => setReviewDue(r.data.count || 0)).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeCourse?.id) loadProgress(activeCourse.id);
  }, [activeCourse?.id]);

  if (loading) return <Spinner text={t('home.loading')} />;

  // Wiederholungs-Banner — zeige wenn fällige SR-Karten vorhanden
  const ReviewBanner = reviewDue > 0 ? (
    <div
      onClick={() => navigate('/review')}
      style={{
        background: 'linear-gradient(135deg, var(--sun-lt), #FFF3CC)',
        border: '1px solid var(--sun)', borderRadius: 'var(--r-xl)',
        padding: '14px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer', transition: 'transform .15s, box-shadow .15s',
        boxShadow: 'var(--shadow-sm)',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,153,64,.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <span style={{ fontSize: 28, flexShrink: 0 }}>🔁</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: 'var(--sun-dk)' }}>
          {reviewDue} {t('home.reviewDue', {n: reviewDue})}
        </div>
        <div style={{ fontSize: 12, color: 'var(--stone-500)', marginTop: 2 }}>
          {t('home.reviewHint')}
        </div>
      </div>
      <div style={{
        background: 'var(--sun)', color: 'var(--white)', borderRadius: 'var(--r-full)',
        padding: '6px 16px', fontSize: 13, fontWeight: 800, flexShrink: 0,
      }}>
        {t('home.reviewStart')} →
      </div>
    </div>
  ) : null;

  // If no course selected yet, show course picker
  if (!activeCourse) return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px' }}>
      {/* Kurmanji-first hero */}
      <div style={{
        textAlign: 'center', marginBottom: 32,
        padding: '28px 20px',
        background: 'linear-gradient(135deg, var(--teal-xlt), rgba(6,214,160,.06))',
        borderRadius: 20, border: '1.5px solid rgba(13,158,136,.15)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>🏔️</div>
        <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6, color: 'var(--text-primary)' }}>
          {t('home.welcome', {name: user?.name})} 👋
        </h2>
        <p style={{ color: 'var(--teal-dk)', fontSize: 15, fontWeight: 600, maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
          {t('home.kurmanjiHero')}
        </p>
      </div>

      <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>
        {t('home.iSpeak')}
      </p>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 13 }}>
        {t('home.chooseLanguage')}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 14 }}>
        {courses.map(c => (
          <div key={c.id} onClick={() => { setActiveCourse(c); loadProgress(c.id); }}
            className="card card-interactive"
            style={{ padding: '20px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 32 }}>{c.from_flag}</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: 15 }}>{c.from_name}</div>
                <div style={{ fontSize: 12, color: 'var(--teal)', fontWeight: 700 }}>→ Kurmanji</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>{c.name}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span className="badge badge-sun">{c.difficulty}</span>
              <span className="badge badge-gray">{t('home.lessons', {n: c.lesson_count})}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return <>
    {ReviewBanner}
    <CourseHome course={activeCourse} courses={courses} onSwitch={() => setActiveCourse(null)} progress={progress[activeCourse.id] || {}} navigate={navigate} user={user} setActiveCourse={setActiveCourse} loadProgress={loadProgress} reviewDue={reviewDue} />
  </>;
}

function CourseHome({ course, courses, onSwitch, progress, navigate, user, setActiveCourse, loadProgress, reviewDue }) {
  const t = useT();
  const [units, setUnits]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/courses/${course.id}`).then(r => { setUnits(r.data.units || []); setLoading(false); }).catch(() => setLoading(false));
  }, [course.id]);

  if (loading) return <Spinner />;

  // Count completed lessons
  const completedIds = new Set(Object.values(progress).filter(p => p.completed).map(p => p.lesson_id));

  // Find next uncompleted lesson for "Continue Learning"
  const findNextLesson = () => {
    for (const unit of units) {
      // We don't have individual lessons loaded here yet, but we know from progress
      // which lessons are completed. The first unit with incomplete lessons is where to go.
      const unitCompletedCount = Object.values(progress).filter(
        p => p.unit_id === unit.id && p.completed
      ).length;
      if (unitCompletedCount < (unit.lesson_count ?? 0)) {
        return unit.id;
      }
    }
    return null;
  };

  const nextUnitId = findNextLesson();

  return (
    <div className="course-grid" style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: 24 }}>
      {/* ── Course tree ── */}
      <div>
        {/* Course header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 28 }}>{course.from_flag}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{course.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Kurmanji · {course.difficulty}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onSwitch} style={{ marginLeft: 'auto' }}>{t('home.switchCourse')}</button>
        </div>

        {/* Mobile stats bar (visible only on mobile) */}
        <div className="show-mobile" style={{
          display: 'none', overflowX: 'auto', gap: 8, marginBottom: 16,
          padding: '2px 0', WebkitOverflowScrolling: 'touch',
        }}>
          {[
            { icon: '🔥', val: user?.streak ?? 0, color: 'var(--sun)' },
            { icon: '⚡', val: user?.total_xp ?? 0, color: 'var(--cyan)' },
            { icon: '💎', val: user?.gems ?? 0, color: 'var(--purple)' },
            { icon: '❤️', val: user?.hearts ?? 5, color: 'var(--red)' },
            { icon: '✅', val: completedIds.size, color: 'var(--teal)' },
          ].map(({ icon, val, color }, i) => (
            <div key={i} style={{
              background: 'var(--white)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '8px 14px', minWidth: 60,
              display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 15, fontWeight: 900, color }}>{val.toLocaleString()}</span>
            </div>
          ))}
        </div>

        {/* Continue learning button */}
        {completedIds.size > 0 && (
          <ContinueLearningButton units={units} progress={progress} completedIds={completedIds} navigate={navigate} />
        )}

        {units.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📚</div>
            <p>{t('home.noUnits')}</p>
          </div>
        )}

        {units.map((unit, ui) => {
          // ── Unlock logic ──────────────────────────────────────────────
          // Count how many lessons of this unit are completed
          const unitCompletedCount = Object.values(progress).filter(
            p => p.unit_id === unit.id && p.completed
          ).length;

          // Unit 0 is always unlocked.
          // Unit N (N>0) is unlocked when every lesson of Unit N-1 is completed.
          const prevUnit = ui > 0 ? units[ui - 1] : null;
          const prevUnitCompletedCount = prevUnit
            ? Object.values(progress).filter(p => p.unit_id === prevUnit.id && p.completed).length
            : null;
          const unitUnlocked = ui === 0
            || (prevUnit && prevUnitCompletedCount >= (prevUnit.lesson_count ?? 0) && (prevUnit.lesson_count ?? 0) > 0);

          return (
            <UnitSection
              key={unit.id}
              unit={unit}
              unitIndex={ui}
              completedIds={completedIds}
              unitCompletedCount={unitCompletedCount}
              unitUnlocked={unitUnlocked}
              progress={progress}
              navigate={navigate}
              course={course}
            />
          );
        })}
      </div>

      {/* ── Sidebar ── */}
      <div className="hide-mobile">
        {/* Streak */}
        <div className="card" style={{ marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <span style={{ fontSize: 40, lineHeight: 1 }}>🔥</span>
          <div>
            <div style={{ fontSize: 28, fontWeight: 'var(--weight-black)', color: 'var(--sun)', lineHeight: 1 }}>
              {user?.streak ?? 0}
            </div>
            <div className="text-label" style={{ color: 'var(--text-muted)', marginTop: 3 }}>Tage Streak</div>
          </div>
        </div>

        {/* Progress */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '⚡', val: user?.total_xp ?? 0, label: t('home.xpTotal'), color: 'var(--cyan)' },
              { icon: '💎', val: user?.gems ?? 0, label: 'Gems', color: 'var(--purple)' },
              { icon: '❤️', val: user?.hearts ?? 5, label: 'Herzen', color: 'var(--red)' },
              { icon: '✅', val: completedIds.size,                        label: t('home.completions'), color: 'var(--teal)' },
            ].map(({ icon, val, label, color }) => (
              <div key={label} style={{ background: 'var(--stone-100)', borderRadius: 12, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color, marginTop: 2 }}>{val.toLocaleString()}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Other courses */}
        <div className="card">
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>{t('home.otherCourses')}</div>
          {courses.filter(c => c.id !== course.id).slice(0, 3).map(c => (
            <div key={c.id} onClick={() => { setActiveCourse(c); loadProgress(c.id); }}
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-2) var(--sp-2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', transition: 'background var(--dur-fast)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--stone-50)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}>
              <span style={{ fontSize: 22 }}>{c.from_flag}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.from_name} → Kurmanji</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.difficulty}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`@media(max-width:768px){.hide-mobile{display:none!important;}.show-mobile{display:flex!important;}.course-grid{grid-template-columns:1fr!important;padding:16px 12px!important;}}`}</style>
    </div>
  );
}

// "Continue Learning" smart button — finds the next unfinished lesson and links directly
function ContinueLearningButton({ units, progress, completedIds, navigate }) {
  const t = useT();
  const [nextLesson, setNextLesson] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Find the first unit that has incomplete lessons
    const findNext = async () => {
      for (const unit of units) {
        try {
          const r = await api.get(`/lessons?unit_id=${unit.id}`);
          const lessons = r.data || [];
          const first = lessons.find(l => !completedIds.has(l.id));
          if (first) {
            setNextLesson({ ...first, unitTitle: unit.title_tr, unitEmoji: unit.emoji });
            break;
          }
        } catch {}
      }
      setLoaded(true);
    };
    findNext();
  }, [units, completedIds]);

  if (!loaded || !nextLesson) return null;

  return (
    <div
      onClick={() => navigate(`/lesson/${nextLesson.id}`)}
      style={{
        background: 'linear-gradient(135deg, var(--teal), var(--teal-dk))',
        borderRadius: 'var(--r-xl)', padding: '16px 22px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
        boxShadow: 'var(--shadow-lg), var(--shadow-teal)',
        transition: 'transform .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: 'rgba(255,255,255,.2)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 26, flexShrink: 0,
      }}>
        {nextLesson.emoji || '📖'}
      </div>
      <div style={{ flex: 1, color: 'var(--white)' }}>
        <div style={{ fontSize: 11, fontWeight: 800, opacity: .7, textTransform: 'uppercase', letterSpacing: '.5px' }}>
          {t('home.continueLearning')}
        </div>
        <div style={{ fontWeight: 900, fontSize: 16, marginTop: 2 }}>
          {nextLesson.title_tr}
        </div>
        <div style={{ fontSize: 12, opacity: .7, marginTop: 1 }}>
          {nextLesson.unitEmoji} {nextLesson.unitTitle}
        </div>
      </div>
      <div style={{
        background: 'var(--white)', color: 'var(--teal)', borderRadius: 14,
        padding: '10px 18px', fontWeight: 900, fontSize: 14,
        boxShadow: '0 2px 0 rgba(0,0,0,.1)',
      }}>
        ▶ {t('home.startBtn')}
      </div>
    </div>
  );
}

function UnitSection({ unit, unitIndex, completedIds, unitCompletedCount, unitUnlocked, progress, navigate, course }) {
  const [lessons, setLessons] = useState([]);
  const [open, setOpen]       = useState(unitIndex === 0);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      api.get(`/lessons?unit_id=${unit.id}`).then(r => { setLessons(r.data); setLoaded(true); });
    }
  }, [open]);

  // Build rows of skills (max 2 per row, alternating left/right/center)
  const rows = [];
  lessons.forEach((l, i) => {
    const rowIdx = Math.floor(i / 2);
    if (!rows[rowIdx]) rows[rowIdx] = [];
    rows[rowIdx].push(l);
  });

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Unit header */}
      <div
        onClick={() => unitUnlocked && setOpen(o => !o)}
        style={{
          background: unitUnlocked ? (unit.color || 'var(--teal)') : 'var(--stone-400)',
          color: 'var(--white)', borderRadius: 'var(--r-xl)',
          padding: '16px 20px', marginBottom: 16,
          cursor: unitUnlocked ? 'pointer' : 'default',
          display: 'flex', flexDirection: 'column', gap: 10,
          opacity: unitUnlocked ? 1 : 0.75,
          transition: 'opacity var(--dur-base)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17 }}>
              {!unitUnlocked && <span style={{ marginRight: 6, opacity: .7 }}>🔒</span>}
              {unit.emoji} {unit.title_tr}
            </div>
            <div style={{ fontSize: 13, opacity: .8, marginTop: 2 }}>{unit.title_ku}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge" style={{ background: 'rgba(255,255,255,.25)', color: 'var(--white)', fontSize: 12 }}>
              {unitCompletedCount}/{unit.lesson_count ?? lessons.length}
            </span>
            <span style={{ fontSize: 18 }}>{open ? '▲' : '▼'}</span>
          </div>
        </div>
        {/* Unit progress bar */}
        {unitUnlocked && (unit.lesson_count ?? 0) > 0 && (
          <div style={{
            background: 'rgba(0,0,0,.2)', borderRadius: 6, height: 6,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 6,
              background: 'rgba(255,255,255,.8)',
              width: `${Math.min(100, (unitCompletedCount / (unit.lesson_count ?? 1)) * 100)}%`,
              transition: 'width .4s ease',
            }} />
          </div>
        )}
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, paddingBottom: 8 }}>
          {rows.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: 18, justifyContent: 'center' }}>
              {row.map((lesson, li) => {
                const done       = completedIds.has(lesson.id);
                // Lesson index within the flat sorted list for this unit
                const lessonIndex = ri * 2 + li;

                // ── Per-lesson unlock rule ──────────────────────────────
                // A lesson is unlocked when:
                //   1. Its unit is unlocked (prev unit fully complete, or first unit), AND
                //   2. It is the first lesson in the unit, OR the previous lesson is done
                //
                // "Previous lesson" = the lesson with lessonIndex - 1 in the sorted list.
                // We check if that lesson's ID is in completedIds.
                const prevLesson = lessonIndex > 0 ? lessons[lessonIndex - 1] : null;
                const prevLessonDone = prevLesson ? completedIds.has(prevLesson.id) : true;
                const lessonUnlocked = unitUnlocked && (lessonIndex === 0 || prevLessonDone);

                // ── Skill state ─────────────────────────────────────────
                // skill-current: the next actionable lesson (first undone, unlocked)
                // skill-done:    completed
                // skill-active:  unlocked but not yet started
                // skill-locked:  prerequisites not met
                const isCurrentLesson = lessonUnlocked && !done &&
                  (lessonIndex === 0 || completedIds.has(lessons[lessonIndex - 1]?.id));

                let nodeClass = 'skill-node ';
                if (done)                        nodeClass += 'skill-done';
                else if (!lessonUnlocked)        nodeClass += 'skill-locked';
                else if (isCurrentLesson)        nodeClass += 'skill-current';
                else                             nodeClass += 'skill-active';

                return (
                  <button
                    key={lesson.id}
                    className={nodeClass}
                    disabled={!lessonUnlocked && !done}
                    onClick={() => navigate(`/lesson/${lesson.id}`)}
                    title={`${lesson.title_tr} – ${lesson.title_ku}`}
                    style={{ position: 'relative' }}
                  >
                    {done && <span className="skill-crown">👑</span>}
                    <span className="skill-icon">{lesson.emoji}</span>
                    <span style={{ fontSize: 10, lineHeight: 1.2 }}>{lesson.title_tr}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
