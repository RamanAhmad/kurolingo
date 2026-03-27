import React, { useState, useRef, useEffect } from 'react';
import { useLangStore, AVAILABLE_LANGS } from '../../i18n';
import KurdistanFlag from './KurdistanFlag';

// Renders flag — special case for Kurdish (SVG), others use emoji
function Flag({ code, flag, size = 18 }) {
  if (flag === 'KU_FLAG' || code === 'ku') {
    return <KurdistanFlag size={size} />;
  }
  return <span style={{ fontSize: size, lineHeight: 1 }}>{flag}</span>;
}

export default function LangPicker({ compact = false }) {
  const { lang, setLang } = useLangStore();
  const [open, setOpen]   = useState(false);
  const ref               = useRef();
  const current           = AVAILABLE_LANGS.find(l => l.code === lang) || AVAILABLE_LANGS[0];

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(255,255,255,.09)',
          border: '1.5px solid rgba(255,255,255,.15)',
          borderRadius: 10, padding: compact ? '4px 8px' : '6px 11px',
          cursor: 'pointer', fontFamily: 'var(--font)',
          fontWeight: 800, fontSize: compact ? 12 : 13,
          color: 'rgba(255,255,255,.88)', transition: 'background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.09)'}
        title="Change language / Sprache ändern"
      >
        <Flag code={current.code} flag={current.flag} size={compact ? 14 : 18} />
        {!compact && (
          <span style={{ fontFamily: "'Nunito', sans-serif", direction: 'ltr' }}>
            {current.label}
          </span>
        )}
        {current.dir === 'rtl' && !compact && (
          <span style={{
            fontSize: 9, background: 'rgba(232,160,32,.35)', color: '#E8A020',
            padding: '1px 5px', borderRadius: 6, fontWeight: 900,
          }}>RTL</span>
        )}
        <span style={{ fontSize: 9, opacity: .6, marginLeft: 1 }}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0,
          background: '#1E2D3D', borderRadius: 14,
          border: '1.5px solid rgba(255,255,255,.1)',
          boxShadow: '0 12px 32px rgba(0,0,0,.35)',
          overflow: 'hidden', zIndex: 999, minWidth: 180,
          direction: 'ltr',
        }}>
          {/* Header */}
          <div style={{
            padding: '9px 14px 7px', fontSize: 10, fontWeight: 900,
            color: 'rgba(255,255,255,.35)', textTransform: 'uppercase',
            letterSpacing: '.06em', borderBottom: '1px solid rgba(255,255,255,.07)',
          }}>
            UI Language
          </div>

          {AVAILABLE_LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '9px 14px',
                background: l.code === lang ? 'rgba(11,158,136,.22)' : 'none',
                border: 'none', cursor: 'pointer',
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700, fontSize: 13,
                color: l.code === lang ? '#5DD6F0' : 'rgba(255,255,255,.78)',
                textAlign: 'left', transition: 'background .1s',
              }}
              onMouseEnter={e => { if (l.code !== lang) e.currentTarget.style.background = 'rgba(255,255,255,.07)'; }}
              onMouseLeave={e => { if (l.code !== lang) e.currentTarget.style.background = 'none'; }}
            >
              <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Flag code={l.code} flag={l.flag} size={20} />
              </span>
              <span style={{
                flex: 1,
                fontFamily: ['ar','fa'].includes(l.code)
                  ? "'Noto Sans Arabic', sans-serif"
                  : "'Nunito', sans-serif",
              }}>
                {l.label}
              </span>
              {l.dir === 'rtl' && (
                <span style={{
                  fontSize: 9, background: 'rgba(232,160,32,.25)',
                  color: '#E8A020', padding: '1px 5px', borderRadius: 5,
                  fontWeight: 900, flexShrink: 0,
                }}>RTL</span>
              )}
              {l.code === lang && (
                <span style={{ color: '#0B9E88', fontSize: 14, flexShrink: 0 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
