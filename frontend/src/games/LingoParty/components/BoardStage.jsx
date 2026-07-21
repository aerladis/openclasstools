import React, { useState, useRef } from 'react';
import styles from './BoardStage.module.css';
import BoardMap from './BoardMap';
import ChallengeModal from './ChallengeModal';
import ShopModal from './ShopModal';
import MysteryFateModal from './MysteryFateModal';
import confetti from 'canvas-confetti';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function BoardStage({
  gameState,
  setGameState,
  broadcastGameState,
  playSound
}) {
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'challenge', 'shop', 'mystery'
  const [currentChallenge, setCurrentChallenge] = useState(null);

  const usedChallengeKeysRef = useRef(new Set());

  const activeTeam = gameState.teams[gameState.currentTeamIndex] || gameState.teams[0];

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#6366f1', '#ec4899', '#f59e0b', '#10b981']
    });
  };

  const advanceTurn = (newTeams, isDoubleRoll = false) => {
    const nextIdx = isDoubleRoll
      ? gameState.currentTeamIndex
      : (gameState.currentTeamIndex + 1) % newTeams.length;
    const nextRound = (!isDoubleRoll && nextIdx === 0) ? gameState.round + 1 : gameState.round;

    const updatedState = {
      ...gameState,
      teams: newTeams,
      currentTeamIndex: nextIdx,
      round: nextRound
    };
    setGameState(updatedState);
    broadcastGameState(updatedState);
  };

  const handleTileAction = (tile, teamsList) => {
    const team = teamsList[gameState.currentTeamIndex];
    if (!tile) {
      advanceTurn(teamsList);
      return;
    }

    if (tile.type === 'start') {
      if (playSound) playSound('correct');
      advanceTurn(teamsList);
    } else if (tile.type === 'trophy') {
      if (playSound) playSound('trophy');
      triggerConfetti();
      team.coins += 25;
      team.trophies += 1;
      advanceTurn(teamsList);
    } else if (tile.type === 'chance') {
      setActiveModal('mystery');
    } else if (tile.type === 'shop') {
      setActiveModal('shop');
    } else {
      // Language challenge tile (riddle, scramble, speed, pronunciation, association, grammar, roleplay, taboo)
      const deck = gameState.deck && gameState.deck.length > 0 ? gameState.deck : [];
      const matchingCards = deck.filter(c => c.type === tile.type);

      // Filter out questions already seen in this session
      const unusedCards = matchingCards.filter(c => {
        const key = c.prompt || c.word || c.scrambledWord || c.targetWord;
        return key && !usedChallengeKeysRef.current.has(key);
      });

      // Reset memory for this category if all cards in category have been used
      if (matchingCards.length > 0 && unusedCards.length === 0) {
        matchingCards.forEach(c => {
          const key = c.prompt || c.word || c.scrambledWord || c.targetWord;
          if (key) usedChallengeKeysRef.current.delete(key);
        });
      }

      const pool = unusedCards.length > 0 ? unusedCards : (matchingCards.length > 0 ? matchingCards : deck);
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      const chosenKey = chosen ? (chosen.prompt || chosen.word || chosen.scrambledWord || chosen.targetWord) : null;

      if (chosenKey) {
        usedChallengeKeysRef.current.add(chosenKey);
      }

      setCurrentChallenge(chosen || { type: tile.type, prompt: `Answer a ${tile.type} question!`, coins: 15 });
      setActiveModal('challenge');
    }
  };

  const handleRollDice = async () => {
    if (isRolling || activeModal) return;
    setIsRolling(true);
    if (playSound) playSound('roll');

    // Roll animation loop
    for (let i = 0; i < 14; i++) {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      await new Promise(r => setTimeout(r, 65));
    }

    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(finalRoll);
    setIsRolling(false);

    // Step animation along tiles
    const teamsCopy = gameState.teams.map(t => ({ ...t }));
    const curTeam = teamsCopy[gameState.currentTeamIndex];
    curTeam.startPos = curTeam.position;
    const targetPos = Math.min(gameState.tiles.length - 1, curTeam.position + finalRoll);

    while (curTeam.position < targetPos) {
      curTeam.position += 1;
      setGameState({ ...gameState, teams: teamsCopy });
      await new Promise(r => setTimeout(r, 160));
    }

    // Check what tile they landed on and trigger action
    const landedTile = gameState.tiles[curTeam.position];
    handleTileAction(landedTile, teamsCopy);
  };

  const handleChallengeResolve = ({ result, coins }) => {
    const teamsCopy = gameState.teams.map(t => ({ ...t }));
    const curTeam = teamsCopy[gameState.currentTeamIndex];

    if (result === 'correct') {
      curTeam.coins += coins;
      triggerConfetti();
    } else {
      // If answer is wrong or passed, pawn returns to pre-roll planet!
      if (curTeam.startPos !== undefined) {
        curTeam.position = curTeam.startPos;
      }
    }
    setActiveModal(null);
    setCurrentChallenge(null);
    advanceTurn(teamsCopy);
  };

  const handleMysteryResolve = (eventResult) => {
    const teamsCopy = gameState.teams.map(t => ({ ...t }));
    const curTeam = teamsCopy[gameState.currentTeamIndex];

    if (eventResult) {
      if (eventResult.coins) curTeam.coins = Math.max(0, curTeam.coins + eventResult.coins);
      if (eventResult.steps) {
        curTeam.position = Math.min(gameState.tiles.length - 1, curTeam.position + eventResult.steps);
      }
      if (eventResult.globalCoins) {
        teamsCopy.forEach(t => t.coins += eventResult.globalCoins);
      }
      if (eventResult.item) {
        if (eventResult.item.name === 'Star Trophy') {
          curTeam.trophies += 1;
          triggerConfetti();
        } else {
          curTeam.items.push(eventResult.item);
        }
      }
      setActiveModal(null);
      advanceTurn(teamsCopy, !!eventResult.doubleRoll);
      return;
    }

    setActiveModal(null);
    advanceTurn(teamsCopy);
  };

  const handleBuyItem = (item) => {
    const teamsCopy = gameState.teams.map(t => ({ ...t }));
    const curTeam = teamsCopy[gameState.currentTeamIndex];

    if (curTeam.coins < item.cost) return;
    curTeam.coins -= item.cost;

    if (item.id === 'trophy') {
      curTeam.trophies += 1;
      triggerConfetti();
    } else if (item.id === 'ufo_attack') {
      // Find leading opponent team to zap back -3 planets!
      const targetTeam = teamsCopy.find((t, idx) => idx !== gameState.currentTeamIndex) || curTeam;
      if (targetTeam && targetTeam.id !== curTeam.id) {
        const shieldIdx = (targetTeam.items || []).findIndex(i => i.id === 'shield');
        if (shieldIdx !== -1) {
          targetTeam.items.splice(shieldIdx, 1); // Shield absorbs attack!
        } else {
          targetTeam.position = Math.max(0, targetTeam.position - 3); // Zap back 3 planets!
        }
      }
    } else if (item.id === 'meteor_strike') {
      // Steal 15 coins from leading opponent
      const targetTeam = teamsCopy.find((t, idx) => idx !== gameState.currentTeamIndex) || curTeam;
      if (targetTeam && targetTeam.id !== curTeam.id) {
        const stolen = Math.min(targetTeam.coins, 15);
        targetTeam.coins -= stolen;
        curTeam.coins += stolen;
      }
    } else if (item.id === 'double_dice') {
      curTeam.position = Math.min(gameState.tiles.length - 1, curTeam.position + 3);
    } else {
      curTeam.items = curTeam.items || [];
      curTeam.items.push(item);
    }

    const nextState = { ...gameState, teams: teamsCopy };
    setGameState(nextState);
    broadcastGameState(nextState);
    setActiveModal(null); // Auto-close shop after 1 purchase!
  };

  return (
    <div className={styles.stageContainer}>
      {/* Left Panel: Leaderboard */}
      <aside className={`glass-card ${styles.leftPanel}`}>
        <div className={styles.panelTitle}>🏆 Crew Leaderboard</div>
        <div className={styles.teamList}>
          {gameState.teams.map((team, idx) => (
            <div
              key={team.id}
              className={`${styles.teamItem} ${idx === gameState.currentTeamIndex ? styles.teamItemActive : ''}`}
            >
              <div className={styles.teamInfo}>
                <span className={styles.teamAvatar}>{team.pawn}</span>
                <div>
                  <div className={styles.teamName}>{team.name}</div>
                  <div className={styles.teamPosition}>
                    📍 Tile {team.position}/{gameState.tiles.length - 1}
                    {team.items && team.items.length > 0 && (
                      <span> · 🎒 {team.items.length}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.teamStats}>
                <span className={styles.trophyTag}>⭐ {team.trophies}</span>
                <span className={styles.coinTag}>🪙 {team.coins}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Center Panel: Widescreen Board Map */}
      <main className={styles.centerPanel}>
        <header className={styles.turnHeader}>
          <div className={styles.turnTeamDisplay}>
            <span>{activeTeam?.pawn}</span>
            <span>Mission Turn: {activeTeam?.name}</span>
          </div>
          <div className={styles.roundCounter}>🛸 Orbit {gameState.round}</div>
        </header>

        <BoardMap
          tiles={gameState.tiles}
          teams={gameState.teams}
          onTileClick={(tile) => {
            console.log('Tile inspection:', tile);
          }}
        />
      </main>

      {/* Right Panel: Holographic Dice Controller */}
      <aside className={`glass-card ${styles.rightPanel}`}>
        <div className={styles.panelTitle}>🎲 Warp Drive</div>

        <div className={styles.diceSection}>
          <div className={`${styles.diceBox} ${isRolling ? styles.diceRolling : ''}`}>
            {DICE_FACES[diceValue - 1]}
          </div>

          <button
            className={`btn-primary ${styles.rollBtn}`}
            onClick={handleRollDice}
            disabled={isRolling || activeModal !== null}
          >
            {isRolling ? '⚡ Warping...' : '🚀 Launch Dice!'}
          </button>
        </div>

        <div className={styles.quickActions}>
          <button
            className="btn-secondary"
            style={{ width: '100%' }}
            onClick={() => setActiveModal('shop')}
          >
            🛸 Space Station Shop
          </button>
          <button
            className="btn-secondary"
            style={{ width: '100%' }}
            onClick={() => {
              setGameState(prev => ({ ...prev, activeScreen: 'setup' }));
              broadcastGameState({ ...gameState, activeScreen: 'setup' });
            }}
          >
            ⚙️ Mission Settings
          </button>
        </div>
      </aside>

      {/* Modals */}
      <ChallengeModal
        challenge={currentChallenge}
        activeTeam={activeModal === 'challenge' ? activeTeam : null}
        onResolve={handleChallengeResolve}
        playSound={playSound}
      />

      <ShopModal
        isOpen={activeModal === 'shop'}
        activeTeam={activeTeam}
        onBuyItem={handleBuyItem}
        onClose={() => setActiveModal(null)}
        playSound={playSound}
      />

      <MysteryFateModal
        isOpen={activeModal === 'mystery'}
        activeTeam={activeTeam}
        onResolve={handleMysteryResolve}
        playSound={playSound}
      />
    </div>
  );
}
