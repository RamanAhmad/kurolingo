import React from 'react';

export default function Spinner({ size = 40, text = 'Lädt…' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 'var(--sp-12)', gap: 'var(--sp-4)',
    }}>
      <div style={{
        width: size, height: size,
        border: `3px solid var(--border)`,
        borderTopColor: 'var(--teal)',
        borderRadius: '50%',
        animation: 'spin .7s linear infinite',
      }} />
      {text && (
        <p style={{
          fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)',
          color: 'var(--text-muted)',
        }}>{text}</p>
      )}
    </div>
  );
}
