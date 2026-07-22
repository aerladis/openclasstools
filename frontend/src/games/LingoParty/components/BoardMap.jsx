import React, { useMemo } from 'react';
import styles from './BoardMap.module.css';
import PawnStandeesLayer from './PawnStandeesLayer';

/* ═══════════════════════════════════════════════════════════════
   Coordinate System — Serpentine Winding Path
   Maps tile index → (x%, y%) on a 1600×900 SVG canvas.
   Uses a multi-row serpentine layout for a natural winding board.
   ═══════════════════════════════════════════════════════════════ */
export function getMapCoordinates(index, totalLength) {
  if (totalLength <= 1) return { x: 50, y: 50, sx: 800, sy: 450 };

  const tilesPerRow = 6;
  const ROWS = Math.ceil(totalLength / tilesPerRow);
  const row = Math.floor(index / tilesPerRow);
  const colInRow = index % tilesPerRow;
  const isReversed = row % 2 === 1;

  // Physical column index from left (0 to 5)
  const c = isReversed ? (tilesPerRow - 1 - colInRow) : colInRow;

  // Exact hexagonal honeycomb grid geometry
  const R = 120;
  const Sx = R * Math.sqrt(3); // ~207.85px horizontal spacing between adjacent columns
  const Sy = R * 1.5;          // 180px vertical center-to-center spacing between adjacent rows

  // Center the 6 columns + odd row stagger across 1600 width
  const totalGridWidth = (tilesPerRow - 1 + 0.5) * Sx; // 5.5 * 207.85 = 1143.15px
  const startX = (1600 - totalGridWidth) / 2;          // ~228.4px
  const startY = 140;                                  // Top margin

  // Stagger odd rows horizontally by half a column step so hexagons interlock precisely into adjacent row gaps
  const rowShift = isReversed ? (0.5 * Sx) : 0;
  const sx = startX + c * Sx + rowShift;
  const sy = startY + row * Sy;

  // Dynamic SVG height to hold all rows cleanly
  const svgHeight = Math.max(900, startY + (ROWS - 1) * Sy + 160);
  const x = (sx / 1600) * 100;
  const y = (sy / svgHeight) * 100;

  return { x, y, sx, sy };
}

/* ═══════════════════════════════════════════════════════════════
   Tile Theme Configuration — Planet Colors & Space Icons
   ═══════════════════════════════════════════════════════════════ */
const TILE_CONFIG = {
  start:         { color: '#10b981', glow: 'rgba(16,185,129,0.5)',  icon: '🌍',  label: 'LAUNCH', cssClass: 'tileStart' },
  trophy:        { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', icon: '⭐',  label: 'GOAL',   cssClass: 'tileTrophy' },
  chance:        { color: '#ec4899', glow: 'rgba(236,72,153,0.5)', icon: '🪐',  label: 'FATE',   cssClass: 'tileChance' },
  shop:          { color: '#3b82f6', glow: 'rgba(59,130,246,0.5)', icon: '🛸',  label: 'SHOP',   cssClass: 'tileShop' },
  riddle:        { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)', icon: '🧩',  label: 'Riddle' },
  scramble:      { color: '#06b6d4', glow: 'rgba(6,182,212,0.5)',  icon: '🔤',  label: 'Scramble' },
  pronunciation: { color: '#14b8a6', glow: 'rgba(20,184,166,0.5)', icon: '🗣️', label: 'Pronounce' },
  association:   { color: '#6366f1', glow: 'rgba(99,102,241,0.5)', icon: '🔗',  label: 'Associate' },
  grammar:       { color: '#f43f5e', glow: 'rgba(244,63,94,0.5)',  icon: '✍️',  label: 'Grammar' },
  speed:         { color: '#eab308', glow: 'rgba(234,179,8,0.5)',  icon: '☄️',  label: 'Speed' },
  roleplay:      { color: '#a855f7', glow: 'rgba(168,85,247,0.5)', icon: '💬',  label: 'Roleplay' },
  blackhole:     { color: '#1e1b2e', glow: 'rgba(139,92,246,0.9)', icon: '🕳️', label: 'VOID', cssClass: 'tileBlackhole' },
  vortex:        { color: '#312e81', glow: 'rgba(99,102,241,0.9)', icon: '🌀', label: 'VORTEX', cssClass: 'tileVortex' },
  asteroid:      { color: '#451a03', glow: 'rgba(245,158,11,0.9)', icon: '☄️', label: 'ASTEROID', cssClass: 'tileAsteroid' },
};

const DEFAULT_CONF = { color: '#64748b', glow: 'rgba(100,116,139,0.5)', icon: '🌑', label: '???' };

/* ═══════════════════════════════════════════════════════════════
   Generate SVG smooth path passing directly through all tile centers
   ═══════════════════════════════════════════════════════════════ */
function buildSmoothPath(points) {
  if (!points || points.length < 2) return '';

  let d = `M ${points[0].sx} ${points[0].sy}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

    const cp1x = p1.sx + (p2.sx - p0.sx) / 6;
    const cp1y = p1.sy + (p2.sy - p0.sy) / 6;

    const cp2x = p2.sx - (p3.sx - p1.sx) / 6;
    const cp2y = p2.sy - (p3.sy - p1.sy) / 6;

    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.sx.toFixed(2)} ${p2.sy.toFixed(2)}`;
  }

  return d;
}

/* ═══════════════════════════════════════════════════════════════
   Star Field — generates random star positions
   ═══════════════════════════════════════════════════════════════ */
function generateStars(count = 80) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 0.5,
      dur: `${Math.random() * 4 + 2}s`,
      delay: `${Math.random() * 4}s`,
      opacity: Math.random() * 0.6 + 0.2
    });
  }
  return stars;
}

/* ═══════════════════════════════════════════════════════════════
   Hexagon Generator Helper
   ═══════════════════════════════════════════════════════════════ */
function getHexPoints(R) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = R * Math.cos(angle);
    const y = R * Math.sin(angle);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

/* ═══════════════════════════════════════════════════════════════
   Orbit Galaxy Theme Configuration — Unique Galaxy Palettes Per Orbit
   ═══════════════════════════════════════════════════════════════ */
const ORBIT_THEMES = [
  { name: 'Violet Nebula', color: '#8b5cf6', glow: 'rgba(139,92,246,0.6)', bg: 'radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.22) 0%, transparent 60%)' },
  { name: 'Cyan Cyber Galaxy', color: '#06b6d4', glow: 'rgba(6,182,212,0.6)', bg: 'radial-gradient(ellipse at 30% 20%, rgba(6, 182, 212, 0.22) 0%, transparent 60%)' },
  { name: 'Solar Flare Supernova', color: '#f59e0b', glow: 'rgba(245,158,11,0.6)', bg: 'radial-gradient(ellipse at 30% 20%, rgba(245, 158, 11, 0.22) 0%, transparent 60%)' },
  { name: 'Emerald Quantum Void', color: '#10b981', glow: 'rgba(16,185,129,0.6)', bg: 'radial-gradient(ellipse at 30% 20%, rgba(16, 185, 129, 0.22) 0%, transparent 60%)' },
  { name: 'Prism Deep Space', color: '#ec4899', glow: 'rgba(236,72,153,0.6)', bg: 'radial-gradient(ellipse at 30% 20%, rgba(236, 72, 153, 0.22) 0%, transparent 60%)' }
];

export function getOrbitTheme(orbitNumber = 1) {
  const idx = Math.max(0, (orbitNumber - 1) % ORBIT_THEMES.length);
  return ORBIT_THEMES[idx];
}

/* ═══════════════════════════════════════════════════════════════
   BoardMap Component — Space Odyssey Multi-Shape Widescreen Board
   ═══════════════════════════════════════════════════════════════ */
export default function BoardMap({ tiles = [], teams = [], tileStyle = 'sphere', round = 1, onTileClick, onHoverPlanet }) {
  const stars = useMemo(() => generateStars(90), []);
  const currentOrbitTheme = useMemo(() => getOrbitTheme(round), [round]);

  // Pre-compute SVG coordinates for each tile
  const totalRows = Math.ceil((tiles.length || 42) / 6);
  const svgHeight = Math.max(900, 140 + (totalRows - 1) * 180 + 160);

  const tilePoints = useMemo(() =>
    tiles.map((tile, idx) => {
      const coords = getMapCoordinates(idx, tiles.length);
      return {
        ...tile,
        idx,
        x: coords.x,
        y: coords.y,
        sx: coords.sx,
        sy: coords.sy
      };
    }),
    [tiles]
  );

  const smoothPath = useMemo(() => buildSmoothPath(tilePoints), [tilePoints]);

  return (
    <div className={styles.mapContainer}>
      {/* ── Animated Star Field ── */}
      <div className={styles.starField}>
        {stars.map(s => (
          <div
            key={s.id}
            className={styles.star}
            style={{
              left: s.left,
              top: s.top,
              width: `${s.size}px`,
              height: `${s.size}px`,
              '--twinkle-dur': s.dur,
              animationDelay: s.delay,
              opacity: s.opacity
            }}
          />
        ))}
      </div>

      {/* ── SVG Board ── */}
      <svg className={styles.svgMap} viewBox={`0 0 1600 ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          {/* Cosmic trail gradient */}
          <linearGradient id="cosmicTrailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#6366f1" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
          </linearGradient>

          {/* Glow filter for planets */}
          <filter id="planetGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Render connecting path lines ONLY for sphere & capsule modes (hidden for Honeycomb Hex mode) ── */}
        {tileStyle !== 'hex' && (
          <>
            <path d={smoothPath} className={styles.mapPathGlow} />
            <path d={smoothPath} className={styles.mapPathStardust} />
            <path d={smoothPath} className={styles.mapPath} />
          </>
        )}

        {/* ── Planet Tile Nodes ── */}
        {tilePoints.map((tp) => {
          const conf = TILE_CONFIG[tp.type] || DEFAULT_CONF;
          const isSpecial = tp.type === 'start' || tp.type === 'trophy';
          const isIconicTile = ['start', 'trophy', 'chance', 'shop', 'blackhole', 'vortex', 'asteroid'].includes(tp.type);
          const tileColor = isIconicTile ? conf.color : currentOrbitTheme.color;
          const tileGlow = isIconicTile ? conf.glow : currentOrbitTheme.glow;

          const total = tiles.length;
          // Honeycomb grid scaling — exact radius 118 leaves 2px crisp grout border between adjacent touching hexagons of R=120
          const hexRadius = 118;

          const baseRadius = total > 36 ? 56 : (total > 24 ? 64 : 72);
          const radius = isSpecial ? baseRadius + 12 : baseRadius;
          const cssClass = conf.cssClass || '';

          return (
            <g
              key={tp.idx}
              className={`${styles.tileNode} ${styles[cssClass] || ''}`}
              transform={`translate(${tp.sx}, ${tp.sy})`}
              onClick={() => onTileClick && onTileClick(tp, tp.idx)}
              onMouseEnter={() => onHoverPlanet && onHoverPlanet(tp)}
              onMouseLeave={() => onHoverPlanet && onHoverPlanet(null)}
              style={{ '--tile-glow': tileGlow }}
            >
              {/* Radial gradient defs */}
              <defs>
                <radialGradient id={`planet-${tp.idx}`} cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor={lightenColor(tileColor, 35)} />
                  <stop offset="60%" stopColor={tileColor} />
                  <stop offset="100%" stopColor={darkenColor(tileColor, 35)} />
                </radialGradient>
              </defs>

              {/* ── STYLE 1: SPHERE (Classic Cosmic Orbital Spheres) ── */}
              {tileStyle === 'sphere' && (
                <>
                  <circle r={radius + 10} fill={tileColor} opacity="0.1" className={styles.tileGlowOuter} />
                  <circle r={radius + 6} className={styles.tileOrbitRing} stroke={tileColor} />
                  <circle r={radius} className={styles.tilePlanet} fill={`url(#planet-${tp.idx})`} stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
                  {isIconicTile && <text y="0" className={styles.tileEmoji}>{conf.icon}</text>}
                </>
              )}

              {/* ── STYLE 2: HONEYCOMB SURFACE (Picture 2 Hex Floor Grid) ── */}
              {tileStyle === 'hex' && (
                <>
                  <polygon points={getHexPoints(hexRadius + 2)} fill={tileColor} opacity="0.08" className={styles.tileGlowOuter} />
                  <polygon points={getHexPoints(hexRadius)} className={styles.tilePlanet} fill={`url(#planet-${tp.idx})`} stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
                  <polygon points={getHexPoints(hexRadius * 0.88)} fill="none" stroke={tileColor} strokeWidth="1.5" opacity="0.7" />
                  {isIconicTile ? (
                    <text y="1" textAnchor="middle" dominantBaseline="central" className={styles.tileEmoji} fontSize={hexRadius * 0.46}>{conf.icon}</text>
                  ) : (
                    <text y="1" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize={hexRadius * 0.38} fontWeight="900" style={{ textShadow: '0 0 6px rgba(0,0,0,0.9)' }}>
                      #{tp.idx + 1}
                    </text>
                  )}
                </>
              )}

              {/* ── STYLE 3: CAPSULE (Holographic High-UX Space Capsules) ── */}
              {tileStyle === 'capsule' && (() => {
                const capW = total > 28 ? 136 : 148;
                const capH = total > 28 ? 58 : 64;
                return (
                  <>
                    <rect x={-capW / 2 - 2} y={-capH / 2 - 2} width={capW + 4} height={capH + 4} rx="26" fill={tileColor} opacity="0.14" filter="blur(4px)" className={styles.tileGlowOuter} />
                    <rect x={-capW / 2} y={-capH / 2} width={capW} height={capH} rx="24" fill="rgba(15, 12, 35, 0.88)" stroke={tileColor} strokeWidth="2.5" />
                    <circle cx={-capW / 2 + 24} cy={0} r="19" fill={`url(#planet-${tp.idx})`} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                    {isIconicTile && <text x={-capW / 2 + 24} y="1" textAnchor="middle" dominantBaseline="central" fontSize="18">{conf.icon}</text>}
                    <text x={-capW / 2 + 50} y="-2" textAnchor="start" fill="#ffffff" fontSize="12" fontWeight="800">{conf.label || tp.type.toUpperCase()}</text>
                    <text x={-capW / 2 + 50} y="12" textAnchor="start" fill={tileColor} fontSize="11" fontWeight="900">#{tp.idx + 1}</text>
                  </>
                );
              })()}
            </g>
          );
        })}

        {/* ── ForeignObject overlay so pawn standees live right inside the exact SVG coordinate grid ── */}
        <foreignObject x="0" y="0" width="1600" height={svgHeight} style={{ overflow: 'visible', pointerEvents: 'none' }}>
          <PawnStandeesLayer tiles={tiles} teams={teams} />
        </foreignObject>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Color utility helpers for planet gradients
   ═══════════════════════════════════════════════════════════════ */
function lightenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0x0000FF) + Math.round(2.55 * percent));
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
  const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(2.55 * percent));
  const b = Math.max(0, (num & 0x0000FF) - Math.round(2.55 * percent));
  return `rgb(${r},${g},${b})`;
}
