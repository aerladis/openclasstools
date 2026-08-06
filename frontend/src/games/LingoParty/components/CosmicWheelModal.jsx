import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import styles from './CosmicWheelModal.module.css';

const WHEEL_SEGMENTS = [
  { type: 'riddle', label: 'Riddle', color: '#8b5cf6', icon: '🧩', weight: 1.0 },
  { type: 'scramble', label: 'Scramble', color: '#06b6d4', icon: '🔤', weight: 1.0 },
  { type: 'pronunciation', label: 'Tongue-Twister', color: '#14b8a6', icon: '👅', weight: 1.0 },
  { type: 'cube', label: 'CUBE JACKPOT!', color: '#0284c7', icon: '🧊', weight: 0.3, isSpecial: true },
  { type: 'grammar', label: 'Grammar', color: '#f43f5e', icon: '✍️', weight: 1.0 },
  { type: 'speed', label: 'Speed Trivia', color: '#eab308', icon: '⚡', weight: 1.0 },
  { type: 'roleplay', label: 'Roleplay', color: '#a855f7', icon: '💬', weight: 1.0 },
  { type: 'ordering', label: 'Ordering', color: '#f97316', icon: '🔢', weight: 1.0 }
];

const totalWeight = WHEEL_SEGMENTS.reduce((sum, seg) => sum + (seg.weight || 1), 0);

const getSegmentAngles = () => {
  let current = 0;
  return WHEEL_SEGMENTS.map(seg => {
    const arc = (2 * Math.PI * (seg.weight || 1)) / totalWeight;
    const startAngle = current;
    const endAngle = current + arc;
    current = endAngle;
    return { ...seg, startAngle, endAngle, arc };
  });
};

export default function CosmicWheelModal({ activeTeam, onSpinResult, onClose, playSound }) {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [pointerColor, setPointerColor] = useState('#f59e0b');
  const currentAngleRef = useRef(0);

  const triggerConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#a855f7', '#6366f1', '#ec4899', '#f59e0b', '#06b6d4']
    });
  };

  // Bitmap allocation happens once here (mount + container resizes), never per frame
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 520;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const getSegmentAtAngle = (angle) => {
    const segmentsWithAngles = getSegmentAngles();
    const pointerAngle = ((-Math.PI / 2 - angle) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const found = segmentsWithAngles.find(s => pointerAngle >= s.startAngle && pointerAngle < s.endAngle);
    return found || segmentsWithAngles[0];
  };

  const isGrindingRef = useRef(false);
  const grindPosRef = useRef({ x: 260, y: 260 });
  const sparksRef = useRef([]);
  const frictionTimeRef = useRef(0);

  const handlePointerDown = (e) => {
    if (!isSpinning) return;
    isGrindingRef.current = true;
    updateGrindPos(e);
  };

  const handlePointerMove = (e) => {
    if (isGrindingRef.current) {
      updateGrindPos(e);
    }
  };

  const handlePointerUp = () => {
    isGrindingRef.current = false;
  };

  const updateGrindPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0 ? e.changedTouches[0] : e);
    const clientX = touch.clientX ?? e.clientX ?? 0;
    const clientY = touch.clientY ?? e.clientY ?? 0;
    grindPosRef.current = {
      x: (clientX - rect.left) * (520 / rect.width),
      y: (clientY - rect.top) * (520 / rect.height)
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouchStart = (e) => {
      if (!isSpinning) return;
      if (e.cancelable) e.preventDefault();
      isGrindingRef.current = true;
      updateGrindPos(e);
    };

    const onTouchMove = (e) => {
      if (!isGrindingRef.current) return;
      if (e.cancelable) e.preventDefault();
      updateGrindPos(e);
    };

    const onTouchEnd = () => {
      isGrindingRef.current = false;
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isSpinning]);

  const drawWheel = (angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = 520;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 16;
    const segmentsWithAngles = getSegmentAngles();

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    for (const seg of segmentsWithAngles) {
      const { startAngle, endAngle, arc } = seg;

      // Segment wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = seg.isSpecial ? '#38bdf8' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = seg.isSpecial ? 4 : 2.5;
      ctx.stroke();

      // Label text & icon
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = seg.isSpecial ? '#fef08a' : '#ffffff';
      ctx.font = seg.isSpecial ? '900 15px Outfit, sans-serif' : '900 17px Outfit, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 6;
      ctx.fillText(`${seg.icon} ${seg.label}`, r - (seg.isSpecial ? 16 : 24), 6);
      ctx.restore();
    }

    // Outer neon ring
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Center hub cap
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0c23';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();

    // Spawn high-visibility friction sparks if user touches/grinds the turning wheel (Smartboard optimized)
    if (isGrindingRef.current && isSpinning) {
      const { x, y } = grindPosRef.current;
      for (let i = 0; i < 10; i++) {
        const speed = Math.random() * 14 + 4;
        const sparkAngle = Math.random() * Math.PI * 2;
        sparksRef.current.push({
          x,
          y,
          vx: Math.cos(sparkAngle) * speed,
          vy: Math.sin(sparkAngle) * speed - 2,
          life: 1.0,
          decay: Math.random() * 0.06 + 0.03,
          size: Math.random() * 8 + 3,
          color: ['#ffffff', '#fef08a', '#f59e0b', '#ef4444', '#38bdf8'][Math.floor(Math.random() * 5)]
        });
      }
    }

    // Draw active contact heat glow and high-brightness sparks
    if (isGrindingRef.current && isSpinning) {
      const { x, y } = grindPosRef.current;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, 32, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.shadowColor = '#fef08a';
      ctx.shadowBlur = 24;
      ctx.fill();
      ctx.restore();
    }

    // Draw and update active friction sparks overlay
    sparksRef.current = sparksRef.current.filter(p => p.life > 0);
    for (const p of sparksRef.current) {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.size * p.life), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  useEffect(() => {
    resizeCanvas();
    drawWheel(currentAngleRef.current);

    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      resizeCanvas();
      drawWheel(currentAngleRef.current);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSelectedResult(null);
    frictionTimeRef.current = 0;

    const n = WHEEL_SEGMENTS.length;
    const arc = (2 * Math.PI) / n;

    const minTurns = 8.5;
    const extraTurns = Math.random() * 3.5;
    const totalSpinDelta = -((minTurns + extraTurns) * Math.PI * 2 + Math.random() * Math.PI * 2);

    const startAngle = currentAngleRef.current;
    const baseDuration = 7500; // 7.5 seconds long spin
    const startTime = performance.now();
    let lastSegmentIndex = -1;

    const animateSpin = (now) => {
      // Apply physical friction deceleration time boost when user holds finger on canvas
      if (isGrindingRef.current) {
        frictionTimeRef.current += 20; // Accelerates slowdown phase (physical control illusion)
      }

      const elapsed = now - startTime + frictionTimeRef.current;
      const t = Math.min(1, elapsed / baseDuration);
      const easeOut = 1 - Math.pow(1 - t, 5); // Quintic ease-out

      const current = startAngle + totalSpinDelta * easeOut;
      currentAngleRef.current = current;
      drawWheel(current);

      // Update pointer color to match current segment
      const curSeg = getSegmentAtAngle(current);
      if (curSeg) {
        setPointerColor(curSeg.color);
      }

      // Sound ticker tick when crossing segments
      const pointerAngle = ((-Math.PI / 2 - current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const curSegIdx = Math.floor(pointerAngle / arc) % n;

      if (curSegIdx !== lastSegmentIndex) {
        lastSegmentIndex = curSegIdx;
      }

      if (t < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        isGrindingRef.current = false;
        const winner = getSegmentAtAngle(current);
        setSelectedResult(winner);
        setPointerColor(winner.color);

        if (playSound) playSound('trophy');
        triggerConfetti();

        setTimeout(() => {
          onSpinResult(winner);
        }, 1600);
      }
    };

    requestAnimationFrame(animateSpin);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`glass-card ${styles.wheelCard}`}>
        <div className={styles.wheelHeader}>
          <h2>🌀 Wheel of Cosmic Fate</h2>
          <p className={styles.turnSubtext}>
            {activeTeam?.pawn} {activeTeam?.name}'s Turn — Spin to determine your mission!
          </p>
        </div>

        <div className={styles.canvasContainer}>
          {/* Top Ticker Pointer — crisp SVG arrow with thick black border */}
          <div className={styles.pointer} style={{ color: pointerColor }}>
            <svg width="48" height="48" viewBox="0 0 44 44" fill="none" style={{ filter: `drop-shadow(0 0 14px ${pointerColor})` }}>
              <path d="M22 40 L6 8 C6 8, 13 4, 22 4 C31 4, 38 8, 38 8 Z" fill="currentColor" stroke="#000000" strokeWidth="4.5" strokeLinejoin="round" />
              <path d="M22 40 L6 8 C6 8, 13 4, 22 4 C31 4, 38 8, 38 8 Z" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>

          <canvas
            ref={canvasRef}
            className={styles.wheelCanvas}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ cursor: isSpinning ? 'grab' : 'pointer', touchAction: 'none' }}
          />

          {selectedResult && (
            <div className={styles.resultBanner} style={{ '--res-color': selectedResult.color }}>
              <span className={styles.resIcon}>{selectedResult.icon}</span>
              <span>{selectedResult.label}</span>
            </div>
          )}
        </div>

        <div className={styles.actionRow}>
          <button
            className={styles.spinBtn}
            onClick={spinWheel}
            disabled={isSpinning}
          >
            {isSpinning ? '🌀 Spinning Wheel...' : '⚡ SPIN THE WHEEL'}
          </button>
        </div>
      </div>
    </div>
  );
}
