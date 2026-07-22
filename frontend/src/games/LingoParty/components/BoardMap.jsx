import React, { useMemo } from 'react';
import styles from './BoardMap.module.css';
import PawnStandeesLayer from './PawnStandeesLayer';

/* ═══════════════════════════════════════════════════════════════
   Coordinate System — Serpentine Winding Path
   Maps tile index → (x%, y%) on a 1600×900 SVG canvas.
   Dynamically calculates row count & padding to hold 16, 24, 30, 36, or 40+ planets cleanly!
   ═══════════════════════════════════════════════════════════════ */
export function getMapCoordinates(index, totalLength) {
  if (totalLength <= 1) return { x: 50, y: 50 };

  const ROWS = totalLength > 28 ? 5 : (totalLength > 16 ? 4 : 3);
  const padX = totalLength > 28 ? 6 : (totalLength > 16 ? 8 : 10);
  const padY = totalLength > 28 ? 12 : (totalLength > 16 ? 14 : 16);
  const rowHeight = (100 - padY * 2) / (ROWS - 1);

  const tilesPerRow = Math.ceil(totalLength / ROWS);
  const row = Math.min(ROWS - 1, Math.floor(index / tilesPerRow));
  const col = index % tilesPerRow;
  const isReversed = row % 2 === 1;

  const tilesInThisRow = (row === ROWS - 1) ? (totalLength - (ROWS - 1) * tilesPerRow) : tilesPerRow;
  const safeTilesInRow = Math.max(1, tilesInThisRow);

  const colProgress = safeTilesInRow > 1 ? col / (safeTilesInRow - 1) : 0.5;
  const x = padX + (isReversed ? (1 - colProgress) : colProgress) * (100 - padX * 2);
  const y = padY + row * rowHeight;

  // Gentle vertical wave for organic serpentine flight path
  const wave = Math.sin(colProgress * Math.PI) * (totalLength > 28 ? 1.2 : 2) * (row % 2 === 0 ? -1 : 1);

  return { x, y: y + wave };
}

/* ═══════════════════════════════════════════════════════════════
   Tile Theme Configuration — Planet Colors & Space Icons
   ═══════════════════════════════════════════════════════════════ */
const TILE_CONFIG = {
  start:         { color: '#10b981', glow: 'rgba(16,185,129,0.6)',  icon: '🌍',  label: 'LAUNCH', cssClass: 'tileStart' },
  trophy:        { color: '#f59e0b', glow: 'rgba(245,158,11,0.6)', icon: '⭐',  label: 'GOAL SANCTUARY', cssClass: 'tileTrophy' },
  chance:        { color: '#ec4899', glow: 'rgba(236,72,153,0.6)', icon: '🪐',  label: 'MYSTERY FATE',   cssClass: 'tileChance' },
  shop:          { color: '#3b82f6', glow: 'rgba(59,130,246,0.6)', icon: '🛸',  label: 'ARMORY STATION', cssClass: 'tileShop' },
  riddle:        { color: '#8b5cf6', glow: 'rgba(139,92,246,0.5)', icon: '🧩',  label: 'Riddle Challenge' },
  scramble:      { color: '#06b6d4', glow: 'rgba(6,182,212,0.5)',  icon: '🔤',  label: 'Scramble Challenge' },
  pronunciation: { color: '#14b8a6', glow: 'rgba(20,184,166,0.5)', icon: '🗣️', label: 'Speech Challenge' },
  association:   { color: '#6366f1', glow: 'rgba(99,102,241,0.5)', icon: '🔗',  label: 'Collocation Challenge' },
  grammar:       { color: '#f43f5e', glow: 'rgba(244,63,94,0.5)',  icon: '✍️',  label: 'Grammar Challenge' },
  speed:         { color: '#eab308', glow: 'rgba(234,179,8,0.5)',  icon: '⚡',  label: 'Speed Challenge' },
  roleplay:      { color: '#a855f7', glow: 'rgba(168,85,247,0.5)', icon: '💬',  label: 'Roleplay Dialogue' },
  blackhole:     { color: '#1e1b2e', glow: 'rgba(139,92,246,0.9)', icon: '🕳️', label: 'BLACK HOLE VOID', cssClass: 'tileBlackhole' },
  vortex:        { color: '#312e81', glow: 'rgba(99,102,241,0.9)', icon: '🌀', label: 'COSMIC VORTEX', cssClass: 'tileVortex' },
  asteroid:      { color: '#78350f', glow: 'rgba(245,158,11,0.9)', icon: '☄️', label: 'ASTEROID FIELD', cssClass: 'tileAsteroid' },
};

const DEFAULT_CONF = { color: '#64748b', glow: 'rgba(100,116,139,0.5)', icon: '🌑', label: 'Unknown Planet' };

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
function generateStars(count = 100) {
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
   BoardMap Component — Space Odyssey Widescreen Gamespace
   ═══════════════════════════════════════════════════════════════ */
export default function BoardMap({ tiles = [], teams = [], onTileClick, onHoverPlanet }) {
  const stars = useMemo(() => generateStars(100), []);

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
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
            <stop offset="30%" stopColor="#6366f1" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#a855f7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.85" />
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
          const hasRings = tp.type === 'chance' || tp.type === 'shop' || tp.type === 'trophy' || tp.type === 'riddle' || tp.type === 'roleplay';
          const isBlackhole = tp.type === 'blackhole';
          const isVortex = tp.type === 'vortex';
          const isAsteroid = tp.type === 'asteroid';

          const total = tiles.length;
          const baseRadius = total > 28 ? 34 : (total > 16 ? 42 : 52);
          const radius = isSpecial ? baseRadius + 10 : baseRadius;
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
              {/* Outer atmospheric glow halo */}
              <circle
                r={radius + (total > 28 ? 12 : 18)}
                fill={conf.color}
                opacity="0.16"
                className={styles.tileGlowOuter}
              />

              {/* Orbiting Ring */}
              <circle
                r={radius + (total > 28 ? 7 : 10)}
                className={styles.tileOrbitRing}
                stroke={conf.color}
              />

              {/* Planetary 3D Ring System for Gas Giant Tiles */}
              {hasRings && (
                <ellipse
                  rx={radius * 1.48}
                  ry={radius * 0.42}
                  fill="none"
                  stroke={conf.color}
                  strokeWidth={total > 28 ? "2" : "3"}
                  opacity="0.65"
                  transform="rotate(-22)"
                  className={styles.planetRings}
                />
              )}

              {/* Black Hole Event Horizon Swirl */}
              {isBlackhole && (
                <circle
                  r={radius + 8}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="3"
                  strokeDasharray="6 8"
                  className={styles.blackholeSwirl}
                />
              )}

              {/* Cosmic Vortex Spiral Ring */}
              {isVortex && (
                <circle
                  r={radius + 10}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeDasharray="10 6"
                  className={styles.vortexSpiral}
                />
              )}

              {/* Asteroid Belt Orbiting Rocks */}
              {isAsteroid && (
                <circle
                  r={radius + 10}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="3 12"
                  className={styles.asteroidBelt}
                />
              )}

              {/* Planet sphere */}
              <circle
                r={radius}
                className={styles.tilePlanet}
                fill={`url(#planet-${tp.idx})`}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="2"
              />

              {/* Per-tile radial gradient */}
              <defs>
                <radialGradient id={`planet-${tp.idx}`} cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor={lightenColor(conf.color, 45)} />
                  <stop offset="60%" stopColor={conf.color} />
                  <stop offset="100%" stopColor={darkenColor(conf.color, 35)} />
                </radialGradient>
              </defs>

              {/* Planet Emoji Icon */}
              <text
                y="0"
                className={styles.tileEmoji}
                style={{ fontSize: `${radius * (total > 28 ? 0.9 : 0.85)}px` }}
              >
                {conf.icon}
              </text>

              {/* Tile Step Number Badge */}
              <g transform={`translate(0, ${radius + (total > 28 ? 9 : 13)})`}>
                <rect
                  x="-16"
                  y="-9"
                  width="32"
                  height="18"
                  rx="9"
                  fill="rgba(15, 12, 30, 0.88)"
                  stroke={conf.color}
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize={total > 28 ? "10" : "11"}
                  fontWeight="800"
                >
                  #{tp.idx + 1}
                </text>
              </g>
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
