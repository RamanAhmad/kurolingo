import React from 'react';

// Statische Mehrsprachigkeit — kein Hook möglich in Class-Komponenten
const ERROR_TEXTS = {
  title:    'Etwas ist schiefgelaufen / Something went wrong / Xeletiyek çêbû / حدث خطأ',
  subtitle: 'Bitte lade die Seite neu. / Please reload the page. / Ji kerema xwe rûpelê ji nû ve bar bike.',
  reload:   '🔄',
  home:     '🏠',
};



export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    // In production: send to error tracking (Sentry etc.)
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg)', padding: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 8 }}>
            {ERROR_TEXTS.title}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-body)', marginBottom: 28, maxWidth: 400 }}>
            {ERROR_TEXTS.subtitle}
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-primary btn-md"
              onClick={() => window.location.reload()}
            >
              🔄 Seite neu laden
            </button>
            <button
              className="btn btn-ghost btn-md"
              onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
            >
              🏠 Zur Startseite
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details style={{
              marginTop: 32, textAlign: 'left', background: 'var(--surface)',
              border: '1.5px solid var(--border)', borderRadius: 12, padding: 16,
              maxWidth: 600, width: '100%',
            }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 13, color: 'var(--red)' }}>
                Fehlerdetails (nur in Entwicklung)
              </summary>
              <pre style={{ fontSize: 11, marginTop: 10, overflow: 'auto',
                            color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
