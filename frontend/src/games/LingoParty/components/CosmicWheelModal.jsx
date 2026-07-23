import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import styles from './CosmicWheelModal.module.css';

const WHEEL_SEGMENTS = [
  { type: 'riddle', label: 'Riddle', color: '#8b5cf6', icon: '🧩' },
  { type: 'scramble', label: 'Scramble', color: '#06b6d4', icon: '🔤' },
  { type: 'pronunciation', label: 'Speech', color: '#14b8a6', icon: '🗣️' },
  { type: 'grammar', label: 'Grammar', color: '#f43f5e', icon: '✍️' },
  { type: 'speed', label: 'Speed Trivia', color: '#eab308', icon: '⚡' },
  { type: 'roleplay', label: 'Roleplay', color: '#a855f7', icon: '💬' }
];

export default function CosmicWheelModal({ activeTeam, onSpinResult, onClose, playSound }) {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const currentAngleRef = useRef(0);

  const triggerConfetti = () => {
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#a855f7', '#6366f1', '#ec4899', '#f59e0b', '#06b6d4']
    });
  };

  const drawWheel = (angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = 360;

    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 12;
    const n = WHEEL_SEGMENTS.length;
    const arc = (2 * Math.PI) / n;

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    for (let i = 0; i < n; i++) {
      const seg = WHEEL_SEGMENTS[i];
      const startAngle = i * arc;
      const endAngle = startAngle + arc;

      // Segment wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label text & icon
      ctx.save();
      ctx.rotate(startAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 13px Outfit, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(`${seg.icon} ${seg.label}`, r - 16, 4);
      ctx.restore();
    }

    // Outer neon ring
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Center hub cap
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0c23';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    drawWheel(0);
  }, []);

  const spinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setSelectedResult(null);

    const n = WHEEL_SEGMENTS.length;
    const arc = (2 * Math.PI) / n;

    const minTurns = 6.5;
    const extraTurns = Math.random() * 2.5;
    const totalSpinDelta = -((minTurns + extraTurns) * Math.PI * 2 + Math.random() * Math.PI * 2);

    const startAngle = currentAngleRef.current;
    const targetAngle = startAngle + totalSpinDelta;
    const duration = 4500; // 4.5 seconds smooth physics spin
    const startTime = performance.now();
    let lastSegmentIndex = -1;

    const animateSpin = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - t, 4); // Quartic ease-out

      const current = startAngle + totalSpinDelta * easeOut;
      currentAngleRef.current = current;
      drawWheel(current);

      // Sound ticker tick when crossing segments
      const pointerAngle = ((-Math.PI / 2 - current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const curSegIdx = Math.floor(pointerAngle / arc) % n;

      if (curSegIdx !== lastSegmentIndex) {
        lastSegmentIndex = curSegIdx;
        if (playSound) playSound('correct');
      }

      if (t < 1) {
        requestAnimationFrame(animateSpin);
      } else {
        // Spin complete
        const finalPointerAngle = ((-Math.PI / 2 - current) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const winningIdx = Math.floor(finalPointerAngle / arc) % n;
        const winner = WHEEL_SEGMENTS[winningIdx];

        setSelectedResult(winner);
        setIsSpinning(false);

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
          {/* Top Ticker Pointer */}
          <div className={styles.pointer}>▼</div>

          <canvas ref={canvasRef} className={styles.wheelCanvas} />

          {selectedResult && (
            <div className={styles.resultBanner} style={{ '--res-color': selectedResult.color }}>
              <span className={styles.resIcon}>{selectedResult.icon}</span>
              <span>{selectedResult.label} Selected!</span>
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
