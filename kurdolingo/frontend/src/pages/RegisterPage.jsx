import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { useT } from '../i18n';
import { IconBolt, IconTrophy, IconStar, IconGlobe } from '../components/ui/icons';

// Reuse the AuthShell from LoginPage pattern — inline here to keep files self-contained
function AuthShell({ children, title, subtitle, switchPrompt, switchLabel, switchTo }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--white)' }}>
      {/* Left panel */}
      <div style={{
        width: '46%', flexShrink: 0,
        background: 'linear-gradient(160deg, #0D9E88 0%, #087A68 50%, #065E50 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-10)', position: 'relative', overflow: 'hidden',
      }} className="hide-mobile">
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 20% 80%, rgba(255,255,255,.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,.04) 0%, transparent 50%)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                    <svg width="72" height="72" viewBox="0 0 512 512" fill="none" style={{ display: 'block', margin: '0 auto 20px', borderRadius: 16 }}>
            <rect width="512" height="512" rx="112" fill="rgba(255,255,255,0.18)"/>
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
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.75)', lineHeight: 1.6, maxWidth: 260, fontWeight: 600 }}>
            Starte jetzt deine Kurdisch-Reise. Kostenlos.
          </p>
          <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
            {[
              { icon: <IconBolt   width={16} height={16} fill="rgba(255,255,255,.85)" />,                    text: 'Sofort loslegen — keine Kreditkarte' },
              { icon: <IconStar   width={16} height={16} stroke="rgba(255,255,255,.85)" strokeWidth={2} />,  text: 'Strukturierter Lernpfad A1–B2' },
              { icon: <IconTrophy width={16} height={16} stroke="rgba(255,255,255,.85)" strokeWidth={2} />,  text: 'Leaderboard & Achievements' },
              { icon: <IconGlobe  width={16} height={16} stroke="rgba(255,255,255,.85)" strokeWidth={2} />,  text: 'Web, Mobile & Desktop' },
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

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-8)', background: 'var(--stone-50)' }}>
        <div className="show-mobile-only" style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
                    <svg width="48" height="48" viewBox="0 0 512 512" fill="none" style={{ display: 'block', margin: '0 auto 10px', borderRadius: 11 }}>
            <rect width="512" height="512" rx="112" fill="#EDE8DC"/>
            <rect x="108" y="130" width="58" height="262" rx="28" fill="#2E8B3A"/>
            <rect x="192" y="130" width="58" height="262" rx="28" fill="#2E8B3A"/>
            <line x1="238" y1="265" x2="395" y2="408" stroke="#2E8B3A" strokeWidth="62" strokeLinecap="round"/>
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
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--teal)' }}>Kurdo<span style={{ color: 'var(--sun)' }}>lingo</span></div>
        </div>

        <div style={{
          width: '100%', maxWidth: 420,
          background: 'var(--white)',
          borderRadius: 'var(--r-2xl)',
          padding: 'var(--sp-8)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ marginBottom: 'var(--sp-6)' }}>
            <h1 style={{ fontSize: 'var(--text-h1)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 'var(--sp-1)' }}>
              {title}
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{subtitle}</p>
          </div>

          {children}

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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } .show-mobile-only { display: none; } @media(max-width:768px){.show-mobile-only{display:block;}}`}</style>
    </div>
  );
}

export default function RegisterPage() {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [err,      setErr]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const loadingRef  = useRef(false);   // synchroner Doppelklick-Guard
  const { register, addToast }  = useStore();
  const t        = useT();
  const navigate = useNavigate();

  const submit = async ev => {
    ev.preventDefault();
    if (loadingRef.current) return;
    if (password.length < 6) return setErr('Passwort muss mindestens 6 Zeichen haben');
    if (password !== password2) return setErr('Passwörter stimmen nicht überein.');
    loadingRef.current = true;
    setErr(''); setLoading(true);
    try {
      await register(email, name, password);
      addToast(t('auth.accountCreated'), 'ok');
      navigate('/');
    } catch (e) {
      setErr(e.response?.data?.error || 'Registrierung fehlgeschlagen');
    } finally { loadingRef.current = false; setLoading(false); }
  };

  return (
    <AuthShell
      title={t('auth.createAccount')}
      subtitle={t('auth.registerSubtitle')}
      switchPrompt={t('auth.hasAccount')}
      switchLabel={t('auth.login')}
      switchTo="/login"
    >
      {err && (
        <div style={{
          background: 'var(--red-lt)', border: '1.5px solid rgba(217,64,64,.3)',
          borderRadius: 'var(--r-md)', padding: 'var(--sp-3) var(--sp-4)',
          marginBottom: 'var(--sp-4)', fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-bold)', color: '#8c1f1f',
          display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
        }}>
          ⚠️ {err}
        </div>
      )}

      <form onSubmit={submit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('auth.name')}</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" required autoComplete="name" />
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('auth.email')}</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de" required autoComplete="email" />
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('auth.password')}</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Mindestens 6 Zeichen" required autoComplete="new-password" maxLength={72} />
          {password.length > 0 && password.length < 6 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--red)', marginTop: 4 }}>
              {t('auth.passwordTooShort')}
            </p>
          )}
        </div>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <label className="form-label">{t('auth.confirmPassword')}</label>
          <input className="input" type="password" value={password2} onChange={e => setPassword2(e.target.value)}
            placeholder="Passwort wiederholen" required autoComplete="new-password" maxLength={72}
            style={{ borderColor: password2 && password !== password2 ? 'var(--red)' : undefined }} />
          {password2 && password !== password2 && (
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--red)', marginTop: 4 }}>
              {t('auth.passwordMismatch')}
            </p>
          )}
        </div>
        <button
          className="btn btn-primary btn-full btn-lg"
          type="submit" disabled={loading}
          style={{ marginTop: 'var(--sp-2)' }}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
              {t('auth.registering')}
            </span>
          ) : t('auth.createAccount')}
        </button>
      </form>

      <p style={{ marginTop: 'var(--sp-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
        Mit der Registrierung akzeptierst du unsere Nutzungsbedingungen.
      </p>
    </AuthShell>
  );
}
