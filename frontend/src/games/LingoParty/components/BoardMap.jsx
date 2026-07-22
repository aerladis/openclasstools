import React, { useMemo } from 'react';
import styles from './BoardMap.module.css';
import PawnStandeesLayer from './PawnStandeesLayer';

/* ═══════════════════════════════════════════════════════════════
   Coordinate System — Serpentine Winding Path
   Maps tile index → (x%, y%) on a 1600×900 SVG canvas.
   Uses a multi-row serpentine layout for a natural winding board.
   ═══════════════════════════════════════════════════════════════ */
export function getMapCoordinates(index, totalLength) {
  if (totalLength <= 1) return { x: 50, y: 50 };

  const ROWS = 3;
  const padX = 10;
  const padY = 16;
  const rowHeight = (100 - padY * 2) / (ROWS - 1);

  const tilesPerRow = Math.ceil(totalLength / ROWS);
  const row = Math.min(ROWS - 1, Math.floor(index / tilesPerRow));
  const col = index % tilesPerRow;
  const isReversed = row % 2 === 1;

  // Calculate actual number of tiles in this specific row so every row stretches evenly
  const tilesInThisRow = (row === ROWS - 1) ? (totalLength - (ROWS - 1) * tilesPerRow) : tilesPerRow;
  const safeTilesInRow = Math.max(1, tilesInThisRow);

  const colProgress = safeTilesInRow > 1 ? col / (safeTilesInRow - 1) : 0.5;
  const x = padX + (isReversed ? (1 - colProgress) : colProgress) * (100 - padX * 2);
  const y = padY + row * rowHeight;

  // Gentle vertical wave for organic aesthetic while keeping rows well separated
  const wave = Math.sin(colProgress * Math.PI) * 2 * (row % 2 === 0 ? -1 : 1);

  return { x, y: y + wave };
}

/* ═══════════════════════════════════════════════════════════════
   Tile Theme Configuration — Planet Colors & Space Icons
   ═══════════════════════════════════════════════════════════════ */
const TILE_CONFIG = {
  start:         { color: '#10b981', glow: 'rgba(16,185,129,0.5)',  icon: '🌍',  label: 'LAUNCH', cssClass: 'tileStart' },
  trophy:        { color: '#f59e0b', glow: 'rgba(245,158,11,0.5)', icon: '⭐',  label: 'GOAL',   cssClass: 'tileTrophy' },
  chance:        { color: '#ec4899', glow: 'rgba(236,72,153,0.5)', icon: '🪐',  label: 'FATE',   cssClass: 'tileChance' },
  shop:          { color: '#3b82f6', glow: 'rgba(59,130,246,0.5)', icon: '🛸',  label: 'STATION', cssClass: 'tileShop' },
  riddle:        { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)', icon: '🧩',  label: 'Riddle' },
  scramble:      { color: '#06b6d4', glow: 'rgba(6,182,212,0.5)',  icon: '🔤',  label: 'Scramble' },
  pronunciation: { color: '#14b8a6', glow: 'rgba(20,184,166,0.5)', icon: '🗣️', label: 'Pronounce' },
  association:   { color: '#6366f1', glow: 'rgba(99,102,241,0.5)', icon: '🔗',  label: 'Associate' },
  grammar:       { color: '#f43f5e', glow: 'rgba(244,63,94,0.5)',  icon: '✍️',  label: 'Grammar' },
  speed:         { color: '#eab308', glow: 'rgba(234,179,8,0.5)',  icon: '☄️',  label: 'Speed' },
  roleplay:      { color: '#a855f7', glow: 'rgba(168,85,247,0.5)', icon: '💬',  label: 'Roleplay' },
  blackhole:     { color: '#1e1b2e', glow: 'rgba(139,92,246,0.9)', icon: '🕳️', label: 'VOID', cssClass: 'tileBlackhole' },
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
   BoardMap Component — Space Odyssey
   ═══════════════════════════════════════════════════════════════ */
export default function BoardMap({ tiles = [], teams = [], onTileClick, onHoverPlanet }) {
  const stars = useMemo(() => generateStars(90), []);

  // Pre-compute SVG coordinates for each tile
  const tilePoints = useMemo(() =>
    tiles.map((tile, idx) => {
      const coords = getMapCoordinates(idx, tiles.length);
      return {
        ...tile,
        idx,
        x: coords.x,
        y: coords.y,
        sx: (coords.x / 100) * 1600,
        sy: (coords.y / 100) * 900
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
      <svg className={styles.svgMap} viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet">
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

        {/* Glow trail (wide, blurred) */}
        <path d={smoothPath} className={styles.mapPathGlow} />

        {/* Stardust trail (faint dots) */}
        <path d={smoothPath} className={styles.mapPathStardust} />

        {/* Main cosmic trail */}
        <path d={smoothPath} className={styles.mapPath} />

        {/* ── Planet Tile Nodes ── */}
        {tilePoints.map((tp) => {
          const conf = TILE_CONFIG[tp.type] || DEFAULT_CONF;
          const isSpecial = tp.type === 'start' || tp.type === 'trophy';
          const radius = isSpecial ? 66 : 54;
          const cssClass = conf.cssClass || '';

          return (
            <g
              key={tp.idx}
              className={`${styles.tileNode} ${styles[cssClass] || ''}`}
              transform={`translate(${tp.sx}, ${tp.sy})`}
              onClick={() => onTileClick && onTileClick(tp, tp.idx)}
              onMouseEnter={() => onHoverPlanet && onHoverPlanet(tp)}
              onMouseLeave={() => onHoverPlanet && onHoverPlanet(null)}
              style={{ '--tile-glow': conf.glow }}
            >
              {/* Outer glow halo */}
              <circle
                r={radius + 24}
                fill={conf.color}
                opacity="0.12"
                className={styles.tileGlowOuter}
              />

              {/* Orbit ring (hover effect) */}
              <circle
                r={radius + 14}
                className={styles.tileOrbitRing}
              />

              {/* Planet body — gradient sphere */}
              <circle
                r={radius}
                className={styles.tilePlanet}
                fill={`url(#planet-${tp.idx})`}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />

              {/* Per-tile radial gradient for sphere look */}
              <defs>
                <radialGradient id={`planet-${tp.idx}`} cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor={lightenColor(conf.color, 40)} />
                  <stop offset="60%" stopColor={conf.color} />
                  <stop offset="100%" stopColor={darkenColor(conf.color, 30)} />
                </radialGradient>
              </defs>

              {/* Centered Planet Emoji Icon */}
              <text y="0" className={styles.tileEmoji}>
                {conf.icon}
              </text>
            </g>
          );
        })}
      </svg>

      {/* ── Floating Pawn Standees ── */}
      <PawnStandeesLayer tiles={tiles} teams={teams} />
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
