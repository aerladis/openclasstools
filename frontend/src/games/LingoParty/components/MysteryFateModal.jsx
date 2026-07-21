import React, { useState } from 'react';
import styles from './MysteryFateModal.module.css';

const MYSTERY_EVENTS = [
  { icon: '🌀', title: 'Spatial Wormhole!', desc: 'A sudden gravitational anomaly pulls your rocket backward! Move BACK -3 Planets!', steps: -3 },
  { icon: '💥', title: 'Solar Flare Hazard!', desc: 'Solar radiation disables your shields! Pay 20 Coins to Mission Repair!', coins: -20 },
  { icon: '🏴‍☠️', title: 'Cosmic Pirate Ambush!', desc: 'Space pirates raid your cargo bay! Lose 15 Coins!', coins: -15 },
  { icon: '🌌', title: 'Black Hole Slingshot!', desc: 'Gravitational pull hurls your ship backward! Move BACK -2 Planets!', steps: -2 },
  { icon: '🧊', title: 'Asteroid Field Collision!', desc: 'Emergency maneuvers required! Lose 10 Coins and move BACK -1 Planet!', coins: -10, steps: -1 },
  { icon: '🌟', title: 'AI Scholarship!', desc: 'The AI rewards your team for outstanding work! +25 Coins!', coins: 25 },
  { icon: '🚀', title: 'Warp Speed Tailwind!', desc: 'You catch a favorable cosmic slipstream! Advance +3 Planets immediately!', steps: 3 },
  { icon: '🎒', title: 'Mystery Gift Box!', desc: 'Secret cargo crate found! A Star Trophy or Item added to your inventory!', item: { name: 'Star Trophy', cost: 0, icon: '🏆', effect: '+1 Trophy' } },
  { icon: '⚡', title: 'Double Roll Battery!', desc: 'Supercharged warp engine! Get +20 Coins and take ANOTHER dice roll immediately!', coins: 20, doubleRoll: true }
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

    // Suspense card shuffle animation
    const icons = ['🌀', '💥', '🏴‍☠️', '🌌', '🧊', '🌟', '🚀', '🎁'];
    for (let i = 0; i < 7; i++) {
      setCurrentIcon(icons[i % icons.length]);
      setCurrentTitle('Shuffling Fate Cards...');
      await new Promise(resolve => setTimeout(resolve, 110));
    }

    const randomEvt = MYSTERY_EVENTS[Math.floor(Math.random() * MYSTERY_EVENTS.length)];
    setDrawnEvent(randomEvt);
    setCurrentIcon(randomEvt.icon);
    setCurrentTitle(randomEvt.title);
    setCurrentDesc(randomEvt.desc);
    setIsRevealed(true);
    setIsShuffling(false);
    if (playSound) playSound(randomEvt.steps && randomEvt.steps < 0 ? 'wrong' : 'trophy');
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
            {drawnEvent?.doubleRoll ? '⚡ Take Double Roll!' : '🚀 Continue Adventure!'}
          </button>
        )}
      </div>
    </div>
  );
}
