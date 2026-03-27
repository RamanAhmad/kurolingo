import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useT } from '../i18n';

export default function ResetPasswordPage() {
  const t = useT();
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();

  const tokenFromUrl      = searchParams.get('token') || '';

  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [err,       setErr]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  const mismatch  = password2.length > 0 && password !== password2;
  const tooShort  = password.length > 0 && password.length < 6;
  const canSubmit = !loading && password.length >= 6 && password === password2 && !!tokenFromUrl;

  const submit = async ev => {
    ev.preventDefault();
    if (!canSubmit) return;
    setErr(''); setLoading(true);
    try {
      await api.post('/auth/reset-password', { token: tokenFromUrl, new_password: password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (e) {
      setErr(e.response?.data?.error || t('auth.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  /* ── Kein Token in der URL ── */
  if (!tokenFromUrl) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--bg)', padding: 'var(--sp-6)',
      }}>
        <div style={{
          width: '100%', maxWidth: 400, background: 'var(--surface)',
          border: '1.5px solid var(--border)', borderRadius: 'var(--r-lg)',
          padding: 'var(--sp-8)', textAlign: 'center', boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 'var(--sp-4)' }}>🔗</div>
          <h1 style={{
            fontSize: 'var(--text-h1)', fontWeight: 'var(--weight-black)',
            color: 'var(--text-primary)', marginBottom: 'var(--sp-2)',
          }}>
            {t('auth.resetInvalidTitle')}
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--sp-6)', lineHeight: 1.6 }}>
            {t('auth.resetInvalidBody')}
          </p>
          <Link to="/forgot-password" className="btn btn-primary btn-full btn-lg" style={{ textDecoration: 'none' }}>
            {t('auth.requestNewLink')}
          </Link>
        </div>
      </div>
    );
  }

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

        <div style={{
          background: 'var(--surface)', border: '1.5px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: 'var(--sp-8)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          {done ? (
            /* ── Erfolg ── */
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 'var(--sp-4)' }}>✅</div>
              <h1 style={{
                fontSize: 'var(--text-h1)', fontWeight: 'var(--weight-black)',
                color: 'var(--text-primary)', marginBottom: 'var(--sp-2)',
              }}>
                {t('auth.resetSuccessTitle')}
              </h1>
              <p style={{
                fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                marginBottom: 'var(--sp-6)', lineHeight: 1.6,
              }}>
                {t('auth.resetSuccessBody')}
              </p>
              {/* Fortschrittsbalken als visuelles Feedback für den Auto-Redirect */}
              <div style={{
                height: 4, background: 'var(--teal-lt)', borderRadius: 'var(--r-full)',
                overflow: 'hidden', marginBottom: 'var(--sp-6)',
              }}>
                <div style={{
                  height: '100%', background: 'var(--teal)', borderRadius: 'var(--r-full)',
                  animation: 'progressBar 3s linear forwards',
                }} />
              </div>
              <Link to="/login" className="btn btn-primary btn-full btn-lg"
                style={{ textDecoration: 'none' }}>
                {t('auth.backToLogin')}
              </Link>
            </div>
          ) : (
            /* ── Formular ── */
            <>
              <h1 style={{
                fontSize: 'var(--text-h1)', fontWeight: 'var(--weight-black)',
                color: 'var(--text-primary)', marginBottom: 'var(--sp-1)',
              }}>
                {t('auth.newPassword')}
              </h1>
              <p style={{
                fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                marginBottom: 'var(--sp-6)',
              }}>
                {t('auth.newPasswordSubtitle')}
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

              <form onSubmit={submit} noValidate
                style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

                {/* Neues Passwort */}
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('auth.newPasswordLabel')}</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required maxLength={72}
                      autoComplete="new-password"
                      style={{ paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(p => !p)}
                      style={{
                        position: 'absolute', right: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-secondary)', fontSize: 16, padding: 0,
                        lineHeight: 1,
                      }}
                      aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
                    >
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {tooShort && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--red)', marginTop: 4 }}>
                      {t('auth.passwordTooShort')}
                    </p>
                  )}
                </div>

                {/* Passwort bestätigen */}
                <div className="form-row" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('auth.confirmPassword')}</label>
                  <input
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    value={password2}
                    onChange={e => setPassword2(e.target.value)}
                    placeholder="••••••••"
                    required maxLength={72}
                    autoComplete="new-password"
                    style={{ borderColor: mismatch ? 'var(--red)' : undefined }}
                  />
                  {mismatch && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--red)', marginTop: 4 }}>
                      {t('auth.passwordMismatch')}
                    </p>
                  )}
                </div>

                <button
                  className="btn btn-primary btn-full btn-lg"
                  type="submit" disabled={!canSubmit}
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
                      {t('auth.savingPassword')}
                    </span>
                  ) : t('auth.setNewPassword')}
                </button>
              </form>

              <p style={{
                textAlign: 'center', marginTop: 'var(--sp-5)',
                fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
              }}>
                <Link to="/login" style={{
                  color: 'var(--teal)', fontWeight: 'var(--weight-bold)',
                  textDecoration: 'none',
                }}>
                  ← {t('auth.backToLogin')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes progressBar { from { width: 0%; } to { width: 100%; } }
      `}</style>
    </div>
  );
}
