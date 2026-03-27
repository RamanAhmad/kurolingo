// Logo.jsx — Kurdolingo Header Logo mit neuem K-Icon
import React from 'react';

// Das neue App-Icon: K mit zwei grünen Balken, orangem Bogen und Sonne
function KurdoIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: size * 0.22, flexShrink: 0 }}>
      {/* Hintergrund */}
      <rect width="512" height="512" rx="112" fill="#EDE8DC"/>

      {/* Linker vertikaler Balken */}
      <rect x="108" y="130" width="58" height="262" rx="28" fill="#2E8B3A"/>

      {/* Mittlerer vertikaler Balken */}
      <rect x="192" y="130" width="58" height="262" rx="28" fill="#2E8B3A"/>

      {/* Diagonales Bein des K */}
      <line x1="238" y1="265" x2="395" y2="408"
        stroke="#2E8B3A" strokeWidth="62" strokeLinecap="round"/>

      {/* Orangefarbener Bogen / Swoosh */}
      <path
        d="M148 295 Q240 178 362 176"
        stroke="url(#arcG)" strokeWidth="54" strokeLinecap="round" fill="none"/>

      {/* Sonnenstrahlen */}
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

      {/* Sonnenkreis */}
      <circle cx="360" cy="128" r="44" fill="url(#sunG)"/>
      {/* Glanzpunkt */}
      <circle cx="348" cy="116" r="14" fill="rgba(255,255,255,0.30)"/>

      <defs>
        <linearGradient id="arcG" x1="148" y1="295" x2="362" y2="176" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FF6B1A"/>
          <stop offset="100%" stopColor="#FF4500"/>
        </linearGradient>
        <radialGradient id="sunG" cx="45%" cy="40%" r="55%">
          <stop offset="0%"   stopColor="#FFE033"/>
          <stop offset="100%" stopColor="#FFAA00"/>
        </radialGradient>
      </defs>
    </svg>
  );
}

export default function Logo({ onClick, size = 40 }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onClick ? 'pointer' : 'default' }}
    >
      <KurdoIcon size={size} />
      <div>
        <div style={{
          fontSize: 20, fontWeight: 900, letterSpacing: '-0.3px',
          color: '#0B9E88', lineHeight: 1,
        }}>
          Kurdo<span style={{ color: '#E8A020' }}>lingo</span>
        </div>
        <div style={{
          fontSize: 10, fontWeight: 700,
          color: 'rgba(255,255,255,.5)',
          letterSpacing: '.8px', textTransform: 'uppercase',
        }}>
          Kurdisch lernen
        </div>
      </div>
    </div>
  );
}
