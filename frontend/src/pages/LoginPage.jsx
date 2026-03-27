import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useT } from '../i18n';
import { IconCheck, IconFlame, IconVolume, IconGlobe } from '../components/ui/icons';

// Shared auth layout with split panel
function AuthShell({ children, title, subtitle, switchPrompt, switchLabel, switchTo }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'var(--white)',
    }}>
      {/* ── Left panel — branding ── */}
      <div style={{
        width: '46%', flexShrink: 0,
        background: 'linear-gradient(160deg, #0D9E88 0%, #087A68 50%, #065E50 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-10)', position: 'relative', overflow: 'hidden',
      }} className="hide-mobile">
        {/* Subtle mesh gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 80%, rgba(255,255,255,.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,.04) 0%, transparent 50%)',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <svg width="68" height="68" viewBox="0 0 512 512" fill="none" style={{ display: 'block', margin: '0 auto 24px', borderRadius: 18, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,.15))' }}>
            <rect width="512" height="512" rx="112" fill="rgba(255,255,255,0.15)"/>
            <rect x="108" y="130" width="58" height="262" rx="28" fill="white"/>
            <rect x="192" y="130" width="58" height="262" rx="28" fill="white"/>
            <line x1="238" y1="265" x2="395" y2="408" stroke="white" strokeWidth="62" strokeLinecap="round"/>
            <path d="M148 295 Q240 178 362 176" stroke="#FFAA33" strokeWidth="54" strokeLinecap="round" fill="none"/>
            <g stroke="#FFE066" strokeWidth="9" strokeLinecap="round">
              <line x1="360" y1="92"  x2="360" y2="74"/>
              <line x1="387" y1="100" x2="400" y2="87"/>
              <line x1="395" y1="128" x2="413" y2="128"/>
              <line x1="360" y1="164" x2="360" y2="182"/>
              <line x1="333" y1="100" x2="320" y2="87"/>
              <line x1="325" y1="128" x2="307" y2="128"/>
            </g>
            <circle cx="360" cy="128" r="44" fill="#FFD020"/>
            <circle cx="348" cy="116" r="14" fill="rgba(255,255,255,0.35)"/>
          </svg>

          <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', marginBottom: 12 }}>
            Kurdo<span style={{ color: '#F9C85A' }}>lingo</span>
          </div>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,.7)', lineHeight: 1.7, maxWidth: 280, fontWeight: 600 }}>
            Kurdisch lernen — interaktiv, spielerisch und effektiv.
          </p>

          {/* Feature list */}
          <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {[
              { icon: <IconCheck width={16} height={16} stroke="rgba(255,255,255,.85)" strokeWidth={2.5} />, text: 'Interaktive Lektionen & Übungen' },
              { icon: <IconFlame width={16} height={16} fill="rgba(255,255,255,.85)" />,                    text: 'Daily Streaks & Gamification' },
              { icon: <IconVolume width={16} height={16} fill="rgba(255,255,255,.85)" />,                   text: 'Native Audio-Aussprache' },
              { icon: <IconGlobe width={16} height={16} stroke="rgba(255,255,255,.85)" strokeWidth={2} />,  text: 'Kurmanji & Sorani Dialekte' },
            ].map(({ icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: 'rgba(255,255,255,.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{icon}</span>
                <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 13, fontWeight: 700 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-8)', background: 'var(--stone-50)',
      }}>
        {/* Mobile logo */}
        <div className="show-mobile-only" style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
          <svg width="48" height="48" viewBox="0 0 512 512" fill="none" style={{ display: 'block', margin: '0 auto 12px', borderRadius: 12 }}>
            <rect width="512" height="512" rx="112" fill="var(--teal-lt)"/>
            <rect x="108" y="130" width="58" height="262" rx="28" fill="var(--teal)"/>
            <rect x="192" y="130" width="58" height="262" rx="28" fill="var(--teal)"/>
            <line x1="238" y1="265" x2="395" y2="408" stroke="var(--teal)" strokeWidth="62" strokeLinecap="round"/>
            <path d="M148 295 Q240 178 362 176" stroke="#FF5500" strokeWidth="54" strokeLinecap="round" fill="none"/>
            <g stroke="#FFCC00" strokeWidth="9" strokeLinecap="round">
              <line x1="360" y1="92"  x2="360" y2="74"/>
              <line x1="387" y1="100" x2="400" y2="87"/>
              <line x1="395" y1="128" x2="413" y2="128"/>
              <line x1="387" y1="156" x2="400" y2="169"/>
              <line x1="360" y1="164" x2="360" y2="182"/>
              <line x1="333" y1="156" x2="320" y2="169"/>
              <line x1="325" y1="128" x2="307" y2="128"/>
              <line x1="333" y1="100" x2="320" y2="87"/>
            </g>
            <circle cx="360" cy="128" r="44" fill="#FFD020"/>
            <circle cx="348" cy="116" r="14" fill="rgba(255,255,255,0.30)"/>
          </svg>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--teal)' }}>Kurdo<span style={{ color: 'var(--sun)' }}>lingo</span></div>
        </div>

        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--white)',
          borderRadius: 'var(--r-2xl)',
          padding: 'var(--sp-8) var(--sp-8)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}>
          {/* Heading */}
          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--sp-1)' }}>
              {title}
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{subtitle}</p>
          </div>

          {children}

          {/* Switch link */}
          <p style={{ textAlign: 'center', marginTop: 'var(--sp-6)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {switchPrompt}{' '}
            <Link to={switchTo} style={{ color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>
              {switchLabel}
            </Link>
          </p>
        </div>

        {/* Legal footer */}
        <div style={{
          display: 'flex', gap: 16, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {[
            { to: '/impressum', label: 'Impressum' },
            { to: '/datenschutz', label: 'Datenschutz' },
            { to: '/nutzungsbedingungen', label: 'Nutzungsbedingungen' },
          ].map(l => (
            <Link key={l.to} to={l.to} style={{
              fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none',
              fontWeight: 600,
            }}>{l.label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);
  const loadingRef              = useRef(false);
  const { login, addToast }     = useStore();
  const t        = useT();
  const navigate = useNavigate();

  const submit = async ev => {
    ev.preventDefault();
    if (loadingRef.current) return;
    loadingRef.current = true;
    setErr(''); setLoading(true);
    try {
      await login(email, password);
      addToast(t('auth.welcomeBack'), 'ok');
      navigate('/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Anmeldung fehlgeschlagen');
    } finally { loadingRef.current = false; setLoading(false); }
  };

  return (
    <AuthShell
      title={t('auth.login')}
      subtitle={t('auth.loginSubtitle')}
      switchPrompt={t('auth.noAccount')}
      switchLabel={t('auth.register')}
      switchTo="/register"
    >
      {err && (
        <div style={{
          background: 'var(--red-lt)', border: '1px solid rgba(224,72,72,.2)',
          borderRadius: 'var(--r-md)', padding: 'var(--sp-3) var(--sp-4)',
          marginBottom: 'var(--sp-4)', fontSize: 'var(--text-sm)',
          fontWeight: 700, color: '#8c1f1f',
          display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        }}>
          <span style={{ fontSize: 16 }}>!</span> {err}
        </div>
      )}

      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('auth.email')}</label>
          <input
            className="input" type="email"
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="deine@email.de" required autoComplete="email"
          />
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-1)' }}>
            <label className="form-label" style={{ marginBottom: 0 }}>{t('auth.password')}</label>
            <Link to="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--teal)', fontWeight: 700, textDecoration: 'none' }}>
              {t('auth.forgotPasswordLink')}
            </Link>
          </div>
          <input
            className="input" type="password"
            value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" required autoComplete="current-password"
            maxLength={72}
          />
        </div>
        <button
          className="btn btn-primary btn-full btn-lg"
          type="submit" disabled={loading}
          style={{ marginTop: 'var(--sp-2)' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
              {t('auth.loggingIn')}
            </span>
          ) : t('auth.login')}
        </button>
      </form>

      {/* Dev credentials hint */}
      {import.meta.env.DEV && (
        <div style={{
          marginTop: 'var(--sp-5)', padding: 'var(--sp-3) var(--sp-4)',
          background: 'var(--sun-lt)', border: '1px solid rgba(232,160,32,.2)',
          borderRadius: 'var(--r-md)', fontSize: 'var(--text-xs)', color: '#7a4800',
        }}>
          <strong>Dev:</strong> admin@kurdolingo.de / admin123 · demo@kurdolingo.de / demo123
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .show-mobile-only { display: none; } @media(max-width:768px){.show-mobile-only{display:block;}}`}</style>
    </AuthShell>
  );
}
