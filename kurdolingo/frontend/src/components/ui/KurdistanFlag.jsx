// Kurdistan-Flagge als React-SVG-Komponente
// Basiert auf: https://de.wikipedia.org/wiki/Datei:Flag_of_Kurdistan.svg
// Farben: Rot, Weiß, Grün mit goldener Sonne (Şemsa Kurdistanê)
import React from 'react';

export default function KurdistanFlag({ size = 20, style = {} }) {
  const w = size * 1.5; // 3:2 Seitenverhältnis
  const h = size;
  const cx = w / 2;
  const cy = h / 2;
  // Sonnenradius: ~1/4 der Flaggenhöhe
  const sr = h * 0.26;
  // 21 Strahlen
  const RAYS = 21;

  const rays = Array.from({ length: RAYS }, (_, i) => {
    const angle = (i * 360) / RAYS;
    const rad   = (angle * Math.PI) / 180;
    const inner = sr * 0.55;
    const outer = sr * 0.95;
    const tipW  = (Math.PI / RAYS) * inner * 0.45;

    const x1 = cx + Math.cos(rad) * inner;
    const y1 = cy + Math.sin(rad) * inner;
    const x2 = cx + Math.cos(rad) * outer;
    const y2 = cy + Math.sin(rad) * outer;
    // Side points for ray width
    const perpRad = rad + Math.PI / 2;
    const lx1 = x1 + Math.cos(perpRad) * tipW;
    const ly1 = y1 + Math.sin(perpRad) * tipW;
    const rx1 = x1 - Math.cos(perpRad) * tipW;
    const ry1 = y1 - Math.sin(perpRad) * tipW;
    return `M${lx1},${ly1} L${x2},${y2} L${rx1},${ry1}`;
  });

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: 2, ...style }}
      aria-label="Kurdistan Flag"
    >
      {/* Drei horizontale Streifen: Rot, Weiß, Grün */}
      <rect x="0" y="0"         width={w} height={h / 3}     fill="#D01C1F" />
      <rect x="0" y={h / 3}    width={w} height={h / 3}     fill="#FFFFFF" />
      <rect x="0" y={h * 2/3}  width={w} height={h / 3 + 1} fill="#007A3D" />

      {/* Goldene Sonne (Şemsa Kurdistanê) */}
      <g fill="#F8C300">
        {/* Strahlen */}
        {rays.map((d, i) => <path key={i} d={d} />)}
        {/* Sonnenkreis */}
        <circle cx={cx} cy={cy} r={sr * 0.42} />
        {/* Innerer weißer Kreis (optisch) */}
        <circle cx={cx} cy={cy} r={sr * 0.22} fill="#F8C300" />
      </g>
    </svg>
  );
}
