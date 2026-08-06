import React, { useState } from 'react';
import styles from './MysteryFateModal.module.css';

const MYSTERY_EVENTS = [
  { icon: '🎲', title: 'Lucky Die Roll!', desc: 'Cosmic fortune shines on you! Throw the Die again immediately!', doubleRoll: true },
  { icon: '⚡', title: 'Double Roll Battery!', desc: 'Supercharged warp engine! Get +1 Trophy and Throw the Die again immediately!', trophies: 1, doubleRoll: true },
  { icon: '💫', title: 'Time Warp Extra Roll!', desc: 'A temporal anomaly opens up! Advance +1 Planet and Throw the Die again!', steps: 1, doubleRoll: true },
  { icon: '🛡️', title: 'Cosmic Shield Surge!', desc: 'Energy shields online! Get +1 Trophy and protection for your team!', trophies: 1 },
  { icon: '💎', title: 'Stardust Crystal Vault!', desc: 'You uncovered ancient alien stardust crystals! +2 Trophies!', trophies: 2 },
  { icon: '🛸', title: 'Alien Escort Shuttle!', desc: 'A friendly alien ship guides your team forward! Advance +2 Planets!', steps: 2 },
  { icon: '⭐', title: 'Supernova Boost!', desc: 'Cosmic wind accelerates your engine! +1 Trophy and Advance +1 Planet!', trophies: 1, steps: 1 },
  { icon: '🎯', title: 'Bullseye Navigation!', desc: 'Perfect orbital trajectory! Throw the Die again immediately with +1 Trophy!', trophies: 1, doubleRoll: true },
  { icon: '🌌', title: 'Nebula Overcharge!', desc: 'Cosmic plasma overcharges your thrusters! Advance +2 Planets and Draw again!', steps: 2, doubleRoll: true },
  { icon: '🌟', title: 'AI Scholarship!', desc: 'The AI rewards your team for outstanding work! +2 Trophies!', trophies: 2 },
  { icon: '🚀', title: 'Hyperdrive Booster!', desc: 'You catch a favorable cosmic slipstream! Advance +3 Planets immediately!', steps: 3 },
  { icon: '🎒', title: 'Mystery Gift Box!', desc: 'Secret cargo crate found! +1 bonus Trophy added to your wallet!', trophies: 1 },
  { icon: '☄️', title: 'Comet Slingshot!', desc: 'Slingshot around a comet! Advance +2 Planets!', steps: 2 },
  { icon: '👑', title: 'Cosmic Crown Award!', desc: 'Space Federation commends your crew! Gain +1 Trophy!', trophies: 1 },
  { icon: '🧊', title: 'Cosmic Cube Discovery!', desc: 'RARE FIND: You discovered a rare Gibel Cube drifting in deep space! +1 Gibel Cube!', gibelCubes: 1 }
];

export default function MysteryFateModal({ isOpen, activeTeam, onResolve, playSound }) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [currentIcon, setCurrentIcon] = useState('🎁');
  const [currentTitle, setCurrentTitle] = useState('Click to Reveal Your Fate!');
  const [currentDesc, setCurrentDesc] = useState('Are the space gods in your favor today? Click below to draw your fate card!');
  const [drawnEvent, setDrawnEvent] = useState(null);

  if (!isOpen || !activeTeam) return null;

  const handleReveal = async () => {
    if (isShuffling) return;
    setIsShuffling(true);
    if (playSound) playSound('roll');

    // Suspenseful slowing card shuffle animation
    const icons = ['✨', '💎', '🛡️', '⚡', '🛸', '🌟', '🧊', '🚀', '🎁', '🎲'];
    const delays = [160, 200, 250, 320, 400, 520, 680, 850];

    for (let i = 0; i < delays.length; i++) {
      const idx = Math.floor(Math.random() * icons.length);
      setCurrentIcon(icons[idx]);
      setCurrentTitle(i < 4 ? 'Shuffling Cosmic Fate Cards...' : i < 6 ? 'Slowing down...' : 'Revealing your fate...');
      if (playSound) playSound('roll');
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }

    // Weighted event selection: rare Gibel Cube has ~5% probability, standard positive events have 95%
    const isRareCube = Math.random() < 0.05;
    let randomEvt;
    if (isRareCube) {
      const cubeEvents = MYSTERY_EVENTS.filter(e => e.gibelCubes);
      randomEvt = cubeEvents[Math.floor(Math.random() * cubeEvents.length)];
    } else {
      const standardEvents = MYSTERY_EVENTS.filter(e => !e.gibelCubes);
      randomEvt = standardEvents[Math.floor(Math.random() * standardEvents.length)];
    }
    setDrawnEvent(randomEvt);
    setCurrentIcon(randomEvt.icon);
    setCurrentTitle(randomEvt.title);
    setCurrentDesc(randomEvt.desc);
    setIsRevealed(true);
    setIsShuffling(false);
    if (playSound) playSound((randomEvt.steps && randomEvt.steps < 0) || (randomEvt.trophies && randomEvt.trophies < 0) ? 'damage' : 'trophy');
  };

  const handleClose = () => {
    if (!drawnEvent) {
      onResolve && onResolve(null);
      return;
    }
    const eventResult = drawnEvent;
    setIsRevealed(false);
    setDrawnEvent(null);
    setCurrentIcon('🎁');
    setCurrentTitle('Click to Reveal Your Fate!');
    setCurrentDesc('Are the space gods in your favor today? Click below to draw your fate card!');
    onResolve && onResolve(eventResult);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`glass-card ${styles.mysteryCardBox}`}>
        <h2 className={styles.modalTitle}>🎁 Mystery Box of Fate</h2>
        <p className={styles.teamSubtitle}>{activeTeam.name} stepped onto the Chance Planet!</p>

        <div className={`${styles.revealArea} ${isRevealed ? styles.revealAreaRevealed : ''}`}>
          <div className={styles.giftIcon}>{currentIcon}</div>
          <div className={styles.eventTitle}>{currentTitle}</div>
          <div className={styles.eventDesc}>{currentDesc}</div>
        </div>

        {!isRevealed ? (
          <button
            className={`btn-accent ${styles.actionBtn}`}
            onClick={handleReveal}
            disabled={isShuffling}
          >
            {isShuffling ? 'Shuffling...' : '✨ Draw Your Fate Card!'}
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
