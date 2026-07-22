import React, { useState, useRef } from 'react';
import styles from './BoardStage.module.css';
import BoardMap from './BoardMap';
import ChallengeModal from './ChallengeModal';
import ShopModal from './ShopModal';
import MysteryFateModal from './MysteryFateModal';
import AttackTargetModal from './AttackTargetModal';
import GuideModal from './GuideModal';
import VictoryModal from './VictoryModal';
import confetti from 'canvas-confetti';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const ITEM_ICONS = { shield: '🛡️' };

export default function BoardStage({
  gameState,
  setGameState,
  broadcastGameState,
  playSound
}) {
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'challenge', 'shop', 'mystery', 'guide', 'victory'
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [categoryAnnouncement, setCategoryAnnouncement] = useState(null);
  const [showQuestionReady, setShowQuestionReady] = useState(false);
  const [pendingTileAction, setPendingTileAction] = useState(null);
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const [pendingAttack, setPendingAttack] = useState(null);

  const usedChallengeKeysRef = useRef(new Set());

  const activeTeam = gameState.teams[gameState.currentTeamIndex] || gameState.teams[0];

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
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
    } else if (tile.type === 'trophy' || tile.type === 'finish') {
      if (playSound) playSound('trophy');
      triggerConfetti();
      team.trophies += 2;
      setActiveModal('victory');
    } else if (tile.type === 'chance') {
      setActiveModal('mystery');
    } else if (tile.type === 'shop') {
      setActiveModal('shop');
    } else if (tile.type === 'blackhole') {
      if (playSound) playSound('damage');
      team.position = Math.max(0, team.position - 4);
      advanceTurn(teamsList);
    } else if (tile.type === 'vortex') {
      if (playSound) playSound('damage');
      const randOffset = Math.random() < 0.5 ? -3 : 3;
      team.position = Math.max(0, Math.min(gameState.tiles.length - 1, team.position + randOffset));
      advanceTurn(teamsList);
    } else if (tile.type === 'asteroid') {
      if (playSound) playSound('damage');
      team.position = Math.max(0, team.position - 2);
      advanceTurn(teamsList);
    } else {
      // Language challenge tile (riddle, scramble, speed, pronunciation, association, grammar, roleplay)
      const deck = gameState.deck && gameState.deck.length > 0 ? gameState.deck : [];
      const cardKey = c => c.prompt || c.word || c.scrambledWord || c.targetWord;
      const matchingCards = deck.filter(c => c.type === tile.type);
      const unusedCards = matchingCards.filter(c => !usedChallengeKeysRef.current.has(cardKey(c)));

      let pool;
      if (unusedCards.length > 0) {
        pool = unusedCards;
      } else if (matchingCards.length > 0) {
        // This category is exhausted — reset its memory so it can be reused
        matchingCards.forEach(c => usedChallengeKeysRef.current.delete(cardKey(c)));
        pool = matchingCards;
      } else {
        // No cards of this tile's type exist at all — prefer a card the crew hasn't seen yet
        // over blindly repeating something just shown on another tile
        const unusedAny = deck.filter(c => !usedChallengeKeysRef.current.has(cardKey(c)));
        pool = unusedAny.length > 0 ? unusedAny : deck;
      }

      const chosen = pool[Math.floor(Math.random() * pool.length)];
      const chosenKey = chosen ? cardKey(chosen) : null;

      if (chosenKey) {
        usedChallengeKeysRef.current.add(chosenKey);
      }

      setCurrentChallenge(chosen || { type: tile.type, prompt: `Answer a ${tile.type} question!` });
      setActiveModal('challenge');
    }
  };

  const handleRollDice = async () => {
    if (isRolling || activeModal || showQuestionReady) return;
    setIsRolling(true);
    setCategoryAnnouncement(null);
    if (playSound) playSound('roll');

    // Roll animation loop
    for (let i = 0; i < 14; i++) {
      setDiceValue(Math.floor(Math.random() * 6) + 1);
      await new Promise(r => setTimeout(r, 65));
    }

    const finalRoll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(finalRoll);
    setIsRolling(false);

    // Step animation along tiles (slower, game-like steps with audio feedback!)
    const teamsCopy = gameState.teams.map(t => ({ ...t }));
    const curTeam = teamsCopy[gameState.currentTeamIndex];
    curTeam.startPos = curTeam.position;
    const targetPos = Math.min(gameState.tiles.length - 1, curTeam.position + finalRoll);

    while (curTeam.position < targetPos) {
      curTeam.position += 1;
      setGameState({ ...gameState, teams: teamsCopy });
      if (playSound) playSound('step');
      await new Promise(r => setTimeout(r, 440)); // 440ms step delay for game-like feel
    }

    // Check destination tile and trigger Top Category Announcement
    const landedTile = gameState.tiles[curTeam.position];
    if (landedTile) {
      const tileLabels = {
        riddle: { text: '🧩 RIDDLE CHALLENGE LANDED!', color: '#8b5cf6' },
        scramble: { text: '🔤 WORD SCRAMBLE LANDED!', color: '#06b6d4' },
        pronunciation: { text: '🗣️ PRONUNCIATION TRIAL LANDED!', color: '#14b8a6' },
        association: { text: '🔗 WORD ASSOCIATION LANDED!', color: '#6366f1' },
        grammar: { text: '🔍 GRAMMAR TRAP LANDED!', color: '#f43f5e' },
        speed: { text: '⚡ SPEED ROUND LANDED!', color: '#eab308' },
        roleplay: { text: '🎭 ROLEPLAY ARENA LANDED!', color: '#a855f7' },
        shop: { text: '🛒 TROPHY STATION LANDED!', color: '#eab308' },
        chance: { text: '🎁 MYSTERY BOX LANDED!', color: '#ec4899' },
        start: { text: '🌍 LAUNCHPAD STATION LANDED!', color: '#10b981' },
        trophy: { text: '⭐ GOAL SANCTUARY REACHED!', color: '#f59e0b' },
        blackhole: { text: '🕳️ BLACK HOLE! GETTING PULLED BACK!', color: '#8b5cf6' }
      };

      const info = tileLabels[landedTile.type] || { text: `🎯 ${(landedTile.label || landedTile.type).toUpperCase()} TILE LANDED!`, color: '#a855f7' };

      setCategoryAnnouncement(info);
      if (playSound) playSound('correct');

      // Hold tile landed state & display "Show Question" button
      setPendingTileAction({ tile: landedTile, teamsList: teamsCopy });
      setShowQuestionReady(true);
    }
  };

  const handleRevealQuestion = () => {
    setShowQuestionReady(false);
    setCategoryAnnouncement(null);
    if (pendingTileAction) {
      handleTileAction(pendingTileAction.tile, pendingTileAction.teamsList);
      setPendingTileAction(null);
    }
  };

  const handleChallengeResolve = ({ result, trophies }) => {
    const teamsCopy = gameState.teams.map(t => ({ ...t }));
    const curTeam = teamsCopy[gameState.currentTeamIndex];

    if (result === 'correct') {
      curTeam.trophies += trophies;
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
      if (eventResult.trophies) curTeam.trophies = Math.max(0, curTeam.trophies + eventResult.trophies);
      if (eventResult.steps) {
        curTeam.position = Math.min(gameState.tiles.length - 1, curTeam.position + eventResult.steps);
      }
      if (eventResult.globalTrophies) {
        teamsCopy.forEach(t => t.trophies += eventResult.globalTrophies);
      }
      setActiveModal(null);
      advanceTurn(teamsCopy, !!eventResult.doubleRoll);
      return;
    }

    setActiveModal(null);
    advanceTurn(teamsCopy);
  };

  const ATTACK_ITEM_IDS = ['ufo_attack', 'meteor_strike'];

  const applyPurchasedItem = (item, curTeam, targetTeam) => {
    if (item.id === 'ufo_attack') {
      if (targetTeam) {
        const shieldIdx = (targetTeam.items || []).findIndex(i => i.id === 'shield');
        if (shieldIdx !== -1) {
          targetTeam.items.splice(shieldIdx, 1); // Shield absorbs attack!
        } else {
          targetTeam.position = Math.max(0, targetTeam.position - 3); // Zap back 3 planets!
        }
      }
    } else if (item.id === 'meteor_strike') {
      if (targetTeam) {
        const stolen = Math.min(targetTeam.trophies, 2);
        targetTeam.trophies -= stolen;
        curTeam.trophies += stolen;
      }
    } else if (item.id === 'double_dice') {
      curTeam.position = Math.min(gameState.tiles.length - 1, curTeam.position + 3);
    } else {
      curTeam.items = curTeam.items || [];
      curTeam.items.push(item);
    }
  };

  const finalizePurchase = (teamsCopy) => {
    setActiveModal(null);
    advanceTurn(teamsCopy);
  };

  const handleShopClose = () => {
    const teamsCopy = gameState.teams.map(t => ({ ...t }));
    setActiveModal(null);
    advanceTurn(teamsCopy);
  };

  const handleBuyItem = (item) => {
    const teamsCopy = gameState.teams.map(t => ({ ...t }));
    const curTeam = teamsCopy[gameState.currentTeamIndex];

    if (curTeam.trophies < item.cost) return;

    const otherTeams = teamsCopy.filter((t, idx) => idx !== gameState.currentTeamIndex);

    if (ATTACK_ITEM_IDS.includes(item.id) && otherTeams.length > 1) {
      // Multiple possible targets — let the crew pick who to attack/steal from
      setPendingAttack({ item, teamsCopy });
      setActiveModal('attack-target');
      return;
    }

    curTeam.trophies -= item.cost;
    applyPurchasedItem(item, curTeam, otherTeams[0]);
    finalizePurchase(teamsCopy);
  };

  const handleAttackTargetSelect = (targetTeamId) => {
    if (!pendingAttack) return;
    const { item, teamsCopy } = pendingAttack;
    const curTeam = teamsCopy[gameState.currentTeamIndex];
    const targetTeam = teamsCopy.find(t => t.id === targetTeamId);

    curTeam.trophies -= item.cost;
    applyPurchasedItem(item, curTeam, targetTeam);
    setPendingAttack(null);
    finalizePurchase(teamsCopy);
  };

  const handleAttackCancel = () => {
    setPendingAttack(null);
    setActiveModal('shop');
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
                      <span className={styles.itemBadges}>
                        {team.items.map((it, i) => (
                          <span key={i} className={styles.itemBadge} title={it.name || 'Item'}>
                            {ITEM_ICONS[it.id] || '🎒'}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className={styles.teamStats}>
                <span className={styles.trophyTag}>🏆 {team.trophies}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Center Panel: Widescreen Board Map */}
      <main className={styles.centerPanel} style={{ position: 'relative' }}>
        {categoryAnnouncement && (
          <div className={styles.categoryFlashBanner} style={{ '--cat-color': categoryAnnouncement.color }}>
            <span className={styles.bannerSparkle}>⚡</span>
            <span className={styles.bannerText}>{categoryAnnouncement.text}</span>
            <span className={styles.bannerSparkle}>⚡</span>
          </div>
        )}

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
          onHoverPlanet={setHoveredPlanet}
        />

        {/* Planet Hover Information Bar under game board */}
        <div className={styles.planetHoverInfoBar}>
          {hoveredPlanet ? (
            <div className={styles.planetHoverContent}>
              <span className={styles.planetHoverIcon}>
                {({
                  start: '🌍', trophy: '⭐', chance: '🪐', shop: '🛸', riddle: '🧩',
                  scramble: '🔤', pronunciation: '🗣️', association: '🔗', grammar: '✍️',
                  speed: '☄️', roleplay: '💬', blackhole: '🕳️'
                })[hoveredPlanet.type] || '🌑'}
              </span>
              <span className={styles.planetHoverTitle}>
                Planet #{hoveredPlanet.idx}: {hoveredPlanet.label || hoveredPlanet.type.toUpperCase()}
              </span>
              <span className={styles.planetHoverDesc}>
                — {({
                  start: 'Launchpad Station — Starting origin for all space exploration crews',
                  trophy: 'Victory Trophy Star — Land here for +2 bonus Trophies!',
                  chance: 'Mystery Box of Fate — Draw a cosmic fate card for rewards or hazards',
                  shop: 'Space Station Shop — Spend Trophies on power-ups, attacks, and extra die rolls',
                  riddle: 'Riddle Challenge — Solve brain-teaser riddles in English',
                  scramble: 'Word Scramble — Unscramble letter tiles before time expires',
                  pronunciation: 'Pronunciation Station — Read aloud with clear English pronunciation',
                  association: 'Word Association — Connect related words & vocabulary concepts',
                  grammar: 'Grammar Trap — Correct sentence structures & grammar rules',
                  speed: 'Speed Challenge — Fast-paced rapid-reaction trivia question',
                  roleplay: 'Roleplay Scenario — Act out practical English conversation scenarios',
                  blackhole: 'Black Hole — Hazard! Pulls your crew backward on the flight path'
                })[hoveredPlanet.type] || 'Language mission challenge planet'}
              </span>
            </div>
          ) : (
            <div className={styles.planetHoverPlaceholder}>
              🪐 Hover over any planet on the board to view its name & mission details
            </div>
          )}
        </div>
      </main>

      {/* Right Panel: Holographic Dice Controller */}
      <aside className={`glass-card ${styles.rightPanel}`}>
        <div className={styles.panelTitle}>🎲 Warp Drive</div>

        <div className={styles.diceSection}>
          <div className={`${styles.diceBox} ${isRolling ? styles.diceRolling : ''}`}>
            {DICE_FACES[diceValue - 1]}
          </div>

          {showQuestionReady ? (
            <button
              className={styles.showQuestionBtn}
              onClick={handleRevealQuestion}
            >
              ❓ Show Question
            </button>
          ) : (
            <button
              className={`btn-primary ${styles.rollBtn}`}
              onClick={handleRollDice}
              disabled={isRolling || activeModal !== null}
            >
              {isRolling ? '⚡ Warping...' : '🎲 Throw the Die!'}
            </button>
          )}
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
            style={{ width: '100%', marginTop: '0.4rem' }}
            onClick={() => setActiveModal('guide')}
          >
            📜 Card Guide & Rules
          </button>
          <button
            className="btn-secondary"
            style={{ width: '100%', marginTop: '0.4rem' }}
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
      {activeModal === 'guide' && (
        <GuideModal onClose={() => setActiveModal(null)} />
      )}

      {activeModal === 'victory' && (
        <VictoryModal
          teams={gameState.teams}
          onPlayAgain={() => {
            setGameState(prev => ({ ...prev, activeScreen: 'setup' }));
            broadcastGameState({ ...gameState, activeScreen: 'setup' });
          }}
          onReturnHub={() => {
            window.location.href = 'index.html';
          }}
        />
      )}

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
        onClose={handleShopClose}
        playSound={playSound}
      />

      <MysteryFateModal
        isOpen={activeModal === 'mystery'}
        activeTeam={activeTeam}
        onResolve={handleMysteryResolve}
        playSound={playSound}
      />

      <AttackTargetModal
        isOpen={activeModal === 'attack-target'}
        item={pendingAttack?.item}
        teams={pendingAttack ? pendingAttack.teamsCopy.filter((t, idx) => idx !== gameState.currentTeamIndex) : []}
        onSelect={handleAttackTargetSelect}
        onCancel={handleAttackCancel}
      />
    </div>
  );
}
