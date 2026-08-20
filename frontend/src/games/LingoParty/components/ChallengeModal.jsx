import React, { useState, useEffect, useRef } from 'react';
import { parseOrderingLines, getCorrectOrderingSteps } from '../utils/orderingUtils';
import styles from './ChallengeModal.module.css';

function cleanPronunciationSentence(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();

  // Strip leading instruction prefixes and labels
  cleaned = cleaned.replace(/^(?:tongue[- ]twister(?: challenge)?|pronunciation(?: challenge)?|recite(?: this(?: sentence)?)?(?: out loud)?(?: \d+ times)?|say(?: the following)?(?: out loud)?|repeat(?: after me)?|instruction[s]?)\s*[:|-]\s*/i, '');
  cleaned = cleaned.replace(/^"(.*)"$/, '$1');
  cleaned = cleaned.replace(/^'(.*)'$/, '$1');

  // Strip trailing metadata in parentheses or brackets like (Focus: ...) or [Speed: Fast]
  cleaned = cleaned.replace(/\s*[\(\[][^\)\]]*(?:focus|speed|stress|level|note|challenge)[^\)\]]*[\)\]]\s*$/i, '');

  return cleaned.trim();
}

function getGuaranteedScramble(scrambledWord, targetWord) {
  const target = String(targetWord || '').toUpperCase().trim();
  const rawScramble = String(scrambledWord || '').toUpperCase().trim();

  const targetChars = target.replace(/[^A-Z]/g, '');
  const scrambleChars = rawScramble.replace(/[^A-Z]/g, '');

  if (!rawScramble || !scrambleChars || scrambleChars === targetChars || scrambleChars.length < 2) {
    const chars = (targetChars || 'WORD').split('');
    let shuffled = [...chars];
    let attempts = 0;
    while (attempts < 25 && shuffled.join('') === targetChars) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      attempts++;
    }
    return shuffled.join(' - ');
  }

  return scrambleChars.split('').join(' - ');
}

const DRAW_W = 1100;
const DRAW_H = 620;
const BRUSH_SIZES = [4, 10, 18];
const DRAW_INK = '#0f172a';

function getShuffledOrderingLines(parsedLines) {
  if (!Array.isArray(parsedLines) || parsedLines.length <= 1) return parsedLines || [];

  const originalStr = parsedLines.join('\n');
  let shuffled = [...parsedLines];
  let attempts = 0;

  while (attempts < 20 && shuffled.join('\n') === originalStr) {
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    attempts++;
  }

  if (shuffled.join('\n') === originalStr && shuffled.length >= 2) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled;
}

export default function ChallengeModal({ challenge, activeTeam, onResolve, playSound, scaffolding }) {
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isClueUnlocked, setIsClueUnlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [timerActive, setTimerActive] = useState(true);
  const [orderedLines, setOrderedLines] = useState([]);
  const [brushSize, setBrushSize] = useState(10);

  const canvasRef = useRef(null);
  const drawWrapperRef = useRef(null);
  const strokesRef = useRef([]);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef(null);

  useEffect(() => {
    setIsAnswerRevealed(false);
    setIsClueUnlocked(false);
    setTimeLeft(45);
    setTimerActive(true);

    if (challenge?.type === 'ordering' && challenge.prompt) {
      const parsed = parseOrderingLines(challenge.prompt);
      setOrderedLines(getShuffledOrderingLines(parsed));
    } else {
      setOrderedLines([]);
    }
  }, [challenge]);

  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const touchStartIdxRef = useRef(null);

  const moveLine = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedLines.length) return;
    reorderLines(index, targetIndex);
  };

  const reorderLines = (fromIndex, toIndex) => {
    if (fromIndex < 0 || fromIndex >= orderedLines.length || toIndex < 0 || toIndex >= orderedLines.length) return;
    const copy = [...orderedLines];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    setOrderedLines(copy);
    if (playSound) playSound('step');
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    const sourceIndex = draggedIndex != null ? draggedIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (sourceIndex !== null && !isNaN(sourceIndex) && sourceIndex !== targetIndex) {
      reorderLines(sourceIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleTouchStart = (index) => {
    touchStartIdxRef.current = index;
    setDraggedIndex(index);
  };

  const handleTouchMove = (e) => {
    if (touchStartIdxRef.current === null) return;
    const touch = e.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY);
    if (targetElement) {
      const itemNode = targetElement.closest('[data-ordering-index]');
      if (itemNode) {
        const hoverIndex = parseInt(itemNode.getAttribute('data-ordering-index'), 10);
        if (!isNaN(hoverIndex) && hoverIndex !== dragOverIndex) {
          setDragOverIndex(hoverIndex);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchStartIdxRef.current !== null && dragOverIndex !== null && touchStartIdxRef.current !== dragOverIndex) {
      reorderLines(touchStartIdxRef.current, dragOverIndex);
    }
    touchStartIdxRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  useEffect(() => {
    if (!challenge || !timerActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge, timerActive, timeLeft]);

  const redrawDrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, DRAW_W, DRAW_H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, DRAW_W, DRAW_H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokesRef.current) {
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.beginPath();
      stroke.points.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
  };

  const fitDrawCanvas = () => {
    const canvas = canvasRef.current;
    const wrapper = drawWrapperRef.current;
    if (!canvas || !wrapper) return;
    const availW = wrapper.clientWidth;
    const availH = wrapper.clientHeight;
    const scale = Math.min(availW / DRAW_W, availH / DRAW_H);
    canvas.style.width = `${Math.floor(DRAW_W * scale)}px`;
    canvas.style.height = `${Math.floor(DRAW_H * scale)}px`;
  };

  useEffect(() => {
    if (challenge?.type !== 'draw') return;
    strokesRef.current = [];
    drawingRef.current = false;
    currentStrokeRef.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = DRAW_W * dpr;
    canvas.height = DRAW_H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawDrawCanvas();
    fitDrawCanvas();

    window.addEventListener('resize', fitDrawCanvas);
    return () => window.removeEventListener('resize', fitDrawCanvas);
  }, [challenge]);

  const getDrawPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const clientX = e.clientX ?? ((e.touches && e.touches[0] && e.touches[0].clientX) ?? 0);
    const clientY = e.clientY ?? ((e.touches && e.touches[0] && e.touches[0].clientY) ?? 0);
    return {
      x: Math.max(0, Math.min(DRAW_W, ((clientX - rect.left) / rect.width) * DRAW_W)),
      y: Math.max(0, Math.min(DRAW_H, ((clientY - rect.top) / rect.height) * DRAW_H))
    };
  };

  const handleDrawPointerDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    try { canvas.setPointerCapture(e.pointerId); } catch { /* older browsers */ }
    drawingRef.current = true;
    const point = getDrawPoint(e);
    if (!point) return;
    currentStrokeRef.current = { color: DRAW_INK, size: brushSize, points: [point] };
    strokesRef.current.push(currentStrokeRef.current);
    redrawDrawCanvas();
    if (playSound) playSound('step');
  };

  const handleDrawPointerMove = (e) => {
    if (!drawingRef.current || !currentStrokeRef.current) return;
    const point = getDrawPoint(e);
    if (!point) return;
    const stroke = currentStrokeRef.current;
    stroke.points.push(point);
    const canvas = canvasRef.current;
    const ctx = canvas && canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    const pts = stroke.points;
    ctx.beginPath();
    ctx.moveTo(pts[pts.length - 2][0], pts[pts.length - 2][1]);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handleDrawPointerUp = () => {
    drawingRef.current = false;
    currentStrokeRef.current = null;
  };

  const handleUndo = () => {
    strokesRef.current.pop();
    redrawDrawCanvas();
    if (playSound) playSound('step');
  };

  const handleClear = () => {
    strokesRef.current = [];
    redrawDrawCanvas();
    if (playSound) playSound('wrong');
  };

  if (!challenge || !activeTeam) return null;

  const handleUnlockClue = () => {
    if (activeTeam.trophies >= 1) {
      activeTeam.trophies -= 1;
      setIsClueUnlocked(true);
      if (playSound) playSound('trophy');
    }
  };

  const handleCorrect = () => {
    if (playSound) playSound('correct');
    onResolve({ result: 'correct', trophies: 1 });
  };

  const handleWrong = () => {
    if (playSound) playSound('wrong');
    onResolve({ result: 'wrong', trophies: 0 });
  };

  const handlePass = () => {
    if (playSound) playSound('wrong');
    onResolve({ result: 'pass', trophies: 0 });
  };

  const renderHighlightedAnswer = (prompt, targetAnswer) => {
    if (!targetAnswer) return null;
    const answerStr = String(targetAnswer);

    if (challenge.type === 'ordering') {
      const steps = getCorrectOrderingSteps(prompt || challenge.question || challenge.word, targetAnswer);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', textAlign: 'left', marginTop: '0.4rem' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ background: '#8b5cf6', color: '#fff', width: '26px', height: '26px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.9rem', flexShrink: 0 }}>
                {i + 1}
              </span>
              <span style={{ fontSize: '1.1rem', color: '#f3e8ff', fontWeight: 600 }}>
                {step.replace(/^([1-9]\d*[.)]|step\s*\d+:?|line\s*\d+:?)\s*/i, '')}
              </span>
            </div>
          ))}
        </div>
      );
    }

    if (!prompt || typeof prompt !== 'string') {
      return <span>{answerStr}</span>;
    }

    const cleanWord = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
    const promptWords = new Set(prompt.split(/\s+/).map(cleanWord));
    const answerWords = answerStr.split(/(\s+)/);

    const hasAnyDifferences = answerWords.some(w => {
      const c = cleanWord(w);
      return c && !promptWords.has(c);
    });

    if (!hasAnyDifferences) {
      return <span>{answerStr}</span>;
    }

    return (
      <span>
        {answerWords.map((token, idx) => {
          const cleaned = cleanWord(token);
          if (!cleaned) return token;
          const isFixedPart = !promptWords.has(cleaned);
          if (isFixedPart) {
            return (
              <span key={idx} className={styles.highlightedAnswerWord}>
                {token}
              </span>
            );
          }
          return token;
        })}
      </span>
    );
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`glass-card ${styles.challengeCard} ${challenge.type === 'draw' ? styles.drawCardNoScroll : ''}`}>
        <div className={styles.headerRow}>
          <span className={styles.typeBadge} style={challenge.isBoss ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: '#fff', fontWeight: 'bold' } : (challenge.type === 'pronunciation' || challenge.type === 'speech' ? { background: 'rgba(20, 184, 166, 0.25)', borderColor: '#14b8a6', color: '#2dd4bf' } : {})}>
            {challenge.isBoss
              ? '👑 BOSS CHALLENGE'
              : challenge.type === 'roleplay'
                ? '🎭 ROLEPLAY SCENARIO'
                : challenge.type === 'draw'
                  ? '✏️ DRAW IT'
                  : challenge.type === 'truefalse'
                  ? '🔄 TRUE OR FALSE'
                  : challenge.type === 'ordering'
                    ? '🔢 CONVERSATION ORDER'
                    : (challenge.type === 'pronunciation' || challenge.type === 'speech')
                      ? '👅 TONGUE-TWISTER'
                      : (challenge.type || 'Challenge').toUpperCase()}
          </span>
          <span className={styles.coinsBadge} style={challenge.isBoss ? { background: 'rgba(56, 189, 248, 0.25)', borderColor: '#38bdf8', color: '#38bdf8' } : {}}>
            {challenge.isBoss ? '🧊 +1 Gibel Cube' : '+1 🏆 Trophy'}
          </span>
        </div>

        {challenge.isMemoryRecall && (
          <div className={styles.memoryRecallBadge}>
            <span className={styles.memoryIcon}>🧠</span>
            <span className={styles.memoryText}>MEMORY RECALL — You've seen this question earlier in the mission!</span>
          </div>
        )}

        {scaffolding && scaffolding.badgeText && (
          <div style={{
            background: scaffolding.isStreakBoost ? 'rgba(168, 85, 247, 0.25)' : 'rgba(245, 158, 11, 0.25)',
            border: `1px solid ${scaffolding.isStreakBoost ? '#a855f7' : '#f59e0b'}`,
            color: scaffolding.isStreakBoost ? '#d8b4fe' : '#fcd34d',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '0.8rem',
            textAlign: 'center'
          }}>
            {scaffolding.badgeText}
          </div>
        )}

        <h2 className={styles.mainPrompt}>
          {challenge.type === 'scramble' ? (
            `🔤 Scrambled Word: ${getGuaranteedScramble(challenge.scrambledWord, challenge.targetWord || challenge.word)}`
          ) : challenge.type === 'ordering' ? (
            '🔢 Put this conversation in the correct order:'
          ) : (challenge.type === 'pronunciation' || challenge.type === 'speech') ? (
            cleanPronunciationSentence(challenge.prompt || challenge.question || challenge.word)
          ) : (
            challenge.prompt || challenge.question || challenge.word || 'Complete the language challenge!'
          )}
        </h2>

        {challenge.type === 'draw' && (
          <div className={styles.drawingContainer}>
            <div className={styles.canvasWrapper} ref={drawWrapperRef}>
              <canvas
                ref={canvasRef}
                className={styles.drawCanvas}
                onPointerDown={handleDrawPointerDown}
                onPointerMove={handleDrawPointerMove}
                onPointerUp={handleDrawPointerUp}
                onPointerCancel={handleDrawPointerUp}
                onPointerLeave={handleDrawPointerUp}
                style={{ touchAction: 'none' }}
              />
            </div>
            <div className={styles.brushControls}>
              {BRUSH_SIZES.map(size => (
                <button
                  key={size}
                  className={`${styles.brushBtn} ${brushSize === size ? styles.brushBtnActive : ''}`}
                  onClick={() => setBrushSize(size)}
                  title={`Brush size ${size}px`}
                >
                  <span className={styles.brushDot} style={{ width: size * 2, height: size * 2 }} />
                </button>
              ))}
              <span className={styles.brushSeparator} />
              <button className={styles.undoBtn} onClick={handleUndo} title="Undo last stroke">
                ↩️ Undo
              </button>
              <button className={styles.clearBtn} onClick={handleClear} title="Clear the canvas">
                🧹 Clear
              </button>
            </div>
          </div>
        )}

        {/* Interactive Conversation Ordering UI */}
        {challenge.type === 'ordering' && (
          <div className={styles.orderingContainer}>
            <div className={styles.orderingList}>
              {orderedLines.map((line, idx) => {
                const isDragging = draggedIndex === idx;
                const isDragOver = dragOverIndex === idx;
                return (
                  <div
                    key={idx}
                    data-ordering-index={idx}
                    className={`${styles.orderingItem} ${isDragging ? styles.dragging : ''} ${isDragOver ? styles.dragOver : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    onTouchStart={() => handleTouchStart(idx)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    <span className={styles.dragHandle} title="Drag to reorder">⋮⋮</span>
                    <span className={styles.orderingIndex}>{idx + 1}</span>
                    <span className={styles.orderingText}>{line}</span>
                    <div className={styles.orderingControls}>
                      <button
                        className={styles.orderBtn}
                        onClick={() => moveLine(idx, -1)}
                        disabled={idx === 0}
                        title="Move line up"
                      >
                        ▲
                      </button>
                      <button
                        className={styles.orderBtn}
                        onClick={() => moveLine(idx, 1)}
                        disabled={idx === orderedLines.length - 1}
                        title="Move line down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {challenge.type === 'roleplay' && (
          <div className={styles.subcontentBox} style={{ background: 'rgba(168, 85, 247, 0.15)', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
            <strong>🎭 Speaking Task: </strong>Perform this out loud for 30 seconds — solo or with your crew! Use natural expressions & target vocabulary.
          </div>
        )}

        {/* Clue Hint Box (Hidden by default, unlockable via Clue Decoder item or 1 trophy) */}
        {challenge.clue && (
          isClueUnlocked ? (
            <div className={styles.subcontentBox}>
              <strong>💡 Clue: </strong>{challenge.clue}
            </div>
          ) : (
            <button
              className={styles.revealClueBtn}
              onClick={handleUnlockClue}
              disabled={activeTeam.trophies < 1}
            >
              {activeTeam.trophies >= 1
                ? '💡 Unlock Hint Clue (Costs 1 🏆)'
                : '🔒 Hint Clue Locked (Needs 1 🏆)'}
            </button>
          )
        )}

        {/* Target Answer / Error Correction Highlight */}
        {(challenge.targetWord != null || challenge.answer != null) && (
          !isAnswerRevealed ? (
            <button
              className={`btn-secondary ${styles.revealAnswerBtn}`}
              onClick={() => setIsAnswerRevealed(true)}
            >
              👁️ Click to Reveal Target Answer
            </button>
          ) : (
            <div className={styles.answerBox}>
              <div className={styles.answerLabel}>Target Answer</div>
              <div className={styles.answerText}>
                {challenge.type === 'truefalse'
                  ? (challenge.answer ? '✅ TRUE' : '❌ FALSE')
                  : renderHighlightedAnswer(challenge.prompt || challenge.question, challenge.targetWord || challenge.answer)}
              </div>
            </div>
          )
        )}

        {/* Timer Bar */}
        <div>
          <div className={styles.timerBarContainer}>
            <div
              className={styles.timerBarFill}
              style={{ width: `${(timeLeft / 45) * 100}%` }}
            />
          </div>
          <div className={styles.timerText}>⏱️ {timeLeft}s remaining</div>
        </div>

        {/* Grading Actions */}
        <div className={styles.actionRow}>
          {challenge.type === 'draw' && (
            <button className={styles.btnPass} onClick={handlePass} title="Skip this challenge — no trophy awarded, team returns to their previous planet">
              ⏭️ Skip / Pass
            </button>
          )}
          <button className={styles.btnCorrect} onClick={handleCorrect}>
            ✅ Correct (+1 🏆)
          </button>
          <button className={styles.btnWrong} onClick={handleWrong}>
            ❌ Incorrect
          </button>
        </div>
      </div>
    </div>
  );
}
