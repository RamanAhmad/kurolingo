import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useT } from '../i18n';

export default function ForgotPasswordPage() {
  const t = useT();
  const [email,     setEmail]   = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [err,       setErr]     = useState('');
  const [loading,   setLoading] = useState(false);

  // Dev-only: backend returns the token so testers can skip the e-mail step
  const [devUrl, setDevUrl] = useState('');

  const submit = async ev => {
    ev.preventDefault();
    setErr(''); setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
      if (data.dev_url) setDevUrl(data.dev_url);
    } catch (e) {
      setErr(e.response?.data?.error || t('auth.resetRequestFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 'var(--sp-6)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-8)' }}>
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
              <line x1="360" y1="164" x2="360" y2="182"/>
              <line x1="333" y1="100" x2="320" y2="87"/>
              <line x1="325" y1="128" x2="307" y2="128"/>
            </g>
            <circle cx="360" cy="128" r="44" fill="#FFD020"/>
            <circle cx="348" cy="116" r="14" fill="rgba(255,255,255,0.30)"/>
          </svg>
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--teal)' }}>
            Kurdo<span style={{ color: 'var(--sun)' }}>lingo</span>
          </div>
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div style={{
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: 'var(--sp-8)', textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 'var(--sp-4)' }}>📬</div>
            <h1 style={{
              fontSize: 'var(--text-h1)', fontWeight: 'var(--weight-black)',
              color: 'var(--text-primary)', marginBottom: 'var(--sp-2)',
            }}>
              {t('auth.resetEmailSentTitle')}
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--sp-6)' }}>
              {t('auth.resetEmailSentBody')}
            </p>

            {/* Dev-only hint — never shown in production */}
            {devUrl && (
              <div style={{
                background: 'var(--sun-lt)', border: '1px solid rgba(232,160,32,.3)',
                borderRadius: 'var(--r-md)', padding: 'var(--sp-3) var(--sp-4)',
                marginBottom: 'var(--sp-5)', fontSize: 'var(--text-xs)', color: '#7a4800',
                textAlign: 'left',
              }}>
                <strong>Dev-Modus:</strong> Kein SMTP konfiguriert — Link direkt öffnen:<br />
                <a href={devUrl} style={{ color: 'var(--teal)', wordBreak: 'break-all', fontSize: 11 }}>
                  {devUrl}
                </a>
              </div>
            )}

            <Link to="/login" className="btn btn-primary btn-full btn-lg" style={{ textDecoration: 'none' }}>
              {t('auth.backToLogin')}
            </Link>
          </div>
        ) : (
          /* ── Request form ── */
          <div style={{
            background: 'var(--surface)', border: '1.5px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: 'var(--sp-8)',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h1 style={{
              fontSize: 'var(--text-h1)', fontWeight: 'var(--weight-black)',
              color: 'var(--text-primary)', marginBottom: 'var(--sp-1)',
            }}>
              {t('auth.forgotPassword')}
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-6)' }}>
              {t('auth.forgotPasswordSubtitle')}
            </p>

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
                <label className="form-label">{t('auth.email')}</label>
                <input
                  className="input" type="email"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="deine@email.de" required autoComplete="email"
                />
              </div>
              <button
                className="btn btn-primary btn-full btn-lg"
                type="submit" disabled={loading}
                style={{ marginTop: 'var(--sp-2)' }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 16, height: 16,
                      border: '2px solid rgba(255,255,255,.3)',
                      borderTopColor: '#fff', borderRadius: '50%',
                      display: 'inline-block', animation: 'spin .7s linear infinite',
                    }} />
                    {t('auth.sending')}
                  </span>
                ) : t('auth.sendResetLink')}
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 'var(--sp-5)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              <Link to="/login" style={{ color: 'var(--teal)', fontWeight: 'var(--weight-bold)', textDecoration: 'none' }}>
                ← {t('auth.backToLogin')}
              </Link>
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
