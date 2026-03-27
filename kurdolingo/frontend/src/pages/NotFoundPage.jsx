import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const t = useT();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: 'var(--sp-6)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ fontSize: 80, lineHeight: 1, marginBottom: 'var(--sp-6)', filter: 'saturate(.6)' }}>
          🗺️
        </div>
        <div style={{ fontSize: 'var(--text-display)', fontWeight: 'var(--weight-black)', color: 'var(--text-primary)', lineHeight: 1, marginBottom: 'var(--sp-3)' }}>
          404
        </div>
        <h1 style={{ fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-black)', marginBottom: 'var(--sp-3)', color: 'var(--text-primary)' }}>
          Seite nicht gefunden
        </h1>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'var(--sp-8)' }}>
          Diese Seite existiert nicht oder wurde verschoben. Lass uns zurück zum Lernen gehen.
        </p>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-md" onClick={() => navigate('/')}>
            🏠 Zur Startseite
          </button>
          <button className="btn btn-ghost btn-md" onClick={() => navigate(-1)}>
            ← Zurück
          </button>
        </div>
      </div>
    </div>
  );
}
