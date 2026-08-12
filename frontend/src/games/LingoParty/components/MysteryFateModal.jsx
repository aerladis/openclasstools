import React, { useState, useRef, useEffect } from 'react';
import styles from './MysteryFateModal.module.css';
import confetti from 'canvas-confetti';

const MYSTERY_EVENTS = [
  { id: '1', icon: '🎲', title: 'Lucky Die Roll!', desc: 'Cosmic fortune shines on you! Throw the Die again immediately!', doubleRoll: true, isGood: true },
  { id: '2', icon: '⚡', title: 'Double Roll Battery!', desc: 'Supercharged warp engine! Get +1 Trophy and Throw the Die again immediately!', trophies: 1, doubleRoll: true, isGood: true },
  { id: '3', icon: '💫', title: 'Time Warp Extra Roll!', desc: 'A temporal anomaly opens up! Advance +1 Planet and Throw the Die again!', steps: 1, doubleRoll: true, isGood: true },
  { id: '4', icon: '🛡️', title: 'Cosmic Shield Surge!', desc: 'Energy shields online! Get +1 Trophy and protection for your team!', trophies: 1, isGood: true },
  { id: '5', icon: '💎', title: 'Stardust Crystal Vault!', desc: 'You uncovered ancient alien stardust crystals! +2 Trophies!', trophies: 2, isGood: true },
  { id: '6', icon: '🛸', title: 'Alien Escort Shuttle!', desc: 'A friendly alien ship guides your team forward! Advance +2 Planets!', steps: 2, isGood: true },
  { id: '7', icon: '⭐', title: 'Supernova Boost!', desc: 'Cosmic wind accelerates your engine! +1 Trophy and Advance +1 Planet!', trophies: 1, steps: 1, isGood: true },
  { id: '8', icon: '🎯', title: 'Bullseye Navigation!', desc: 'Perfect orbital trajectory! Throw the Die again immediately with +1 Trophy!', trophies: 1, doubleRoll: true, isGood: true },
  { id: '9', icon: '🌌', title: 'Nebula Overcharge!', desc: 'Cosmic plasma overcharges your thrusters! Advance +2 Planets and Draw again!', steps: 2, doubleRoll: true, isGood: true },
  { id: '10', icon: '🌟', title: 'AI Scholarship!', desc: 'The AI rewards your team for outstanding work! +2 Trophies!', trophies: 2, isGood: true },
  { id: '11', icon: '🚀', title: 'Hyperdrive Booster!', desc: 'You catch a favorable cosmic slipstream! Advance +3 Planets immediately!', steps: 3, isGood: true },
  { id: '12', icon: '🎒', title: 'Mystery Gift Box!', desc: 'Secret cargo crate found! +1 bonus Trophy added to your wallet!', trophies: 1, isGood: true },
  { id: '13', icon: '☄️', title: 'Comet Slingshot!', desc: 'Slingshot around a comet! Advance +2 Planets!', steps: 2, isGood: true },
  { id: '14', icon: '👑', title: 'Cosmic Crown Award!', desc: 'Space Federation commends your crew! Gain +1 Trophy!', trophies: 1, isGood: true },
  { id: '15', icon: '🧊', title: 'Cosmic Cube Discovery!', desc: 'RARE FIND: You discovered a rare Gibel Cube drifting in deep space! +1 Gibel Cube!', gibelCubes: 1, isGood: true },
  { id: '16', icon: '💥', title: 'Asteroid Collision!', desc: 'Space debris damaged your thrusters! Pushed back -1 Planet!', steps: -1, isGood: false },
  { id: '17', icon: '🏴‍☠️', title: 'Space Pirate Toll!', desc: 'Space pirates raided your wallet! -1 Trophy paid as toll!', trophies: -1, isGood: false }
];

const WINNING_INDEX = 38;
const CARD_WIDTH = 130;
const CARD_GAP = 10;
const ITEM_STEP = CARD_WIDTH + CARD_GAP; // 140px

export default function MysteryFateModal({ isOpen, activeTeam, onResolve, playSound }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [drawnEvent, setDrawnEvent] = useState(null);
  const [ribbonCards, setRibbonCards] = useState([]);
  const [translateX, setTranslateX] = useState(0);

  const reelViewportRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastIndexRef = useRef(-1);

  // Initialize reel cards ribbon
  useEffect(() => {
    if (isOpen) {
      setIsRevealed(false);
      setIsSpinning(false);
      setDrawnEvent(null);
      setTranslateX(0);
      lastIndexRef.current = -1;

      // Generate 45 initial display cards
      const initialCards = Array.from({ length: 45 }, (_, i) => {
        return MYSTERY_EVENTS[i % MYSTERY_EVENTS.length];
      });
      setRibbonCards(initialCards);
    }
  }, [isOpen]);

  if (!isOpen || !activeTeam) return null;

  const handleSpinCase = () => {
    if (isSpinning || isRevealed) return;
    setIsSpinning(true);

    // Weighted event selection: rare Gibel Cube ~5%, standard positive 85%, penalty 10%
    const randVal = Math.random();
    let randomEvt;
    if (randVal < 0.05) {
      const cubeEvents = MYSTERY_EVENTS.filter(e => e.gibelCubes);
      randomEvt = cubeEvents[Math.floor(Math.random() * cubeEvents.length)];
    } else if (randVal < 0.15) {
      const badEvents = MYSTERY_EVENTS.filter(e => e.isGood === false);
      randomEvt = badEvents[Math.floor(Math.random() * badEvents.length)];
    } else {
      const goodEvents = MYSTERY_EVENTS.filter(e => e.isGood && !e.gibelCubes);
      randomEvt = goodEvents[Math.floor(Math.random() * goodEvents.length)];
    }

    setDrawnEvent(randomEvt);

    // Dynamic card step based on screen height (mobile landscape vs desktop)
    const isMobileLandscape = typeof window !== 'undefined' && window.innerHeight <= 520;
    const cardWidth = isMobileLandscape ? 100 : CARD_WIDTH;
    const itemStep = isMobileLandscape ? 110 : ITEM_STEP;

    // Build 45 cards ribbon with randomEvt forced at WINNING_INDEX (38)
    const newRibbon = Array.from({ length: 45 }, (_, i) => {
      if (i === WINNING_INDEX) return randomEvt;
      const pool = MYSTERY_EVENTS.filter(e => e.id !== randomEvt.id);
      return pool[Math.floor(Math.random() * pool.length)];
    });
    setRibbonCards(newRibbon);

    // Calculate target offset to center WINNING_INDEX under pointer
    const viewportWidth = reelViewportRef.current ? reelViewportRef.current.clientWidth : 540;
    const centerOffset = viewportWidth / 2 - cardWidth / 2;
    const jitter = Math.floor(Math.random() * 30 - 15); // random jitter inside card center
    const finalOffset = -(WINNING_INDEX * itemStep - centerOffset + jitter);

    const startTime = performance.now();
    const duration = 4500; // 4.5 seconds reel deceleration

    const updateReelAnimation = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Custom CS:GO deceleration cubic-bezier curve (0.1, 0.85, 0.25, 1.0)
      const ease = 1 - Math.pow(1 - progress, 3.5);
      const currentX = finalOffset * ease;
      setTranslateX(currentX);

      // Track item index under center pointer for audio ticks!
      const pointerPos = -currentX + viewportWidth / 2;
      const currentIndex = Math.floor(pointerPos / itemStep);

      if (currentIndex !== lastIndexRef.current && currentIndex >= 0 && currentIndex <= WINNING_INDEX) {
        lastIndexRef.current = currentIndex;
        if (playSound) playSound('tick');
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateReelAnimation);
      } else {
        // Halt reel & reveal outcome
        setIsSpinning(false);
        setIsRevealed(true);
        if (playSound) {
          playSound(randomEvt.isGood ? 'trophy' : 'damage');
        }
        if (randomEvt.isGood) {
          try { confetti(); } catch (e) {}
        }
      }
    };

    animFrameRef.current = requestAnimationFrame(updateReelAnimation);
  };

  const handleClose = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    const eventResult = drawnEvent;
    setIsRevealed(false);
    setIsSpinning(false);
    setDrawnEvent(null);
    onResolve && onResolve(eventResult);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`glass-card ${styles.mysteryCardBox}`}>
        <div className={styles.modalHeaderGroup}>
          <h2 className={styles.modalTitle}>🎁 Cosmic Case Opener</h2>
          <p className={styles.teamSubtitle}>{activeTeam.name} is spinning the Chance Case!</p>
        </div>

        {/* Reel Container */}
        <div className={styles.reelContainer}>
          <div className={styles.needlePointerTop}>🔻</div>
          <div className={styles.needlePointerBottom}>▲</div>
          <div className={styles.centerLine}></div>

          <div className={styles.reelViewport} ref={reelViewportRef}>
            <div
              className={styles.reelRibbon}
              style={{ transform: `translateX(${translateX}px)` }}
            >
              {ribbonCards.map((card, idx) => (
                <div
                  key={`${card.id}-${idx}`}
                  className={`${styles.reelCard} ${card.isGood ? styles.cardGood : styles.cardBad} ${
                    isRevealed && idx === WINNING_INDEX ? styles.cardWinner : ''
                  }`}
                >
                  <span className={styles.cardIcon}>{card.icon}</span>
                  <span className={styles.cardTitle}>{card.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revealed Outcome Description */}
        {isRevealed && drawnEvent && (
          <div className={`${styles.revealArea} ${drawnEvent.isGood ? styles.revealGood : styles.revealBad}`}>
            <div className={styles.resultHeader}>
              <span className={styles.resultIcon}>{drawnEvent.icon}</span>
              <div>
                <h3 className={styles.resultTitle}>{drawnEvent.title}</h3>
                <p className={styles.resultDesc}>{drawnEvent.desc}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {!isRevealed ? (
          <button
            className={`btn-accent ${styles.actionBtn}`}
            onClick={handleSpinCase}
            disabled={isSpinning}
          >
            {isSpinning ? '🎰 Opening Case...' : '✨ Open Cosmic Case!'}
          </button>
        ) : (
          <button
            className={`btn-primary ${styles.actionBtn}`}
            onClick={handleClose}
          >
            {drawnEvent?.doubleRoll ? '🎲 Throw the Die Again!' : '🚀 Continue Adventure!'}
          </button>
        )}
      </div>
    </div>
  );
}
