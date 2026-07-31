import React, { useState, useCallback } from 'react';
import SetupScreen from './components/SetupScreen';
import BoardStage from './components/BoardStage';
import {
  completeSession,
  startSessionSafely,
} from '../../services/platformApi';

// Sound Synthesizer using Web Audio API
const audioCtx = typeof window !== 'undefined' && window.AudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null;

export function playSound(type = 'roll') {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'roll') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'step') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(880, now + 0.25); // A5
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'wrong') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'trophy') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.3); // D6
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (type === 'damage') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.45);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

export default function LingoPartyGame() {
  const [playSessionId, setPlaySessionId] = useState(null);
  const [trackingWarning, setTrackingWarning] = useState('');

  const [gameState, setGameState] = useState({
    activeScreen: 'setup',
    teams: [],
    currentTeamIndex: 0,
    round: 1,
    boardLength: 42,
    orbitCount: 3,
    tiles: [],
    deck: [],
    mode: 'crew',
    deckId: null,
    deckVersionId: null,
  });

  const generateTiles = (length) => {
    const tiles = [];
    const chance1 = Math.floor(length / 4);
    const chance2 = Math.floor((3 * length) / 4);

    for (let i = 0; i < length; i++) {
      if (i === 0) {
        tiles.push({ id: 0, type: 'start', label: 'Launch Pad' });
      } else if (i === length - 1) {
        tiles.push({ id: i, type: 'trophy', label: 'Goal Sanctuary' });
      } else if (i === chance1 || i === chance2) {
        tiles.push({ id: i, type: 'chance', label: 'Cosmic Fate' });
      } else if (i === Math.floor(length / 2)) {
        tiles.push({ id: i, type: 'shop', label: 'Space Station' });
      } else {
        tiles.push({ id: i, type: 'challenge', label: 'Challenge Tile' });
      }
    }

    // Sprinkle remaining hazard planets (Cosmic Vortex, Asteroid Belt) on challenge tiles
    const remainingEligible = tiles
      .map((t, idx) => idx)
      .filter(idx => !['start', 'trophy', 'chance', 'shop'].includes(tiles[idx].type));

    const hazardTypes = ['vortex', 'asteroid'];
    let hazardCount = Math.min(Math.floor(length / 7), 4);
    if (hazardCount < 1) hazardCount = 1;

    for (let n = 0; n < hazardCount && remainingEligible.length > 0; n++) {
      const pick = Math.floor(Math.random() * remainingEligible.length);
      const tileIdx = remainingEligible.splice(pick, 1)[0];
      const hType = hazardTypes[n % hazardTypes.length];
      const hLabels = { vortex: 'Cosmic Vortex', asteroid: 'Asteroid Belt' };
      tiles[tileIdx] = { id: tileIdx, type: hType, label: hLabels[hType] };
    }

    return tiles;
  };

  const handleStartGame = useCallback(({
    teams,
    boardLength,
    baseColor,
    deck,
    mode,
    orbitCount,
    deckId,
    deckVersionId,
  }) => {
    setTrackingWarning('');
    const tiles = generateTiles(boardLength);
    const initTeams = teams.map(t => ({
      ...t,
      position: 0,
      trophies: 0,
      gibelCubes: 0,
      items: []
    }));

    const newState = {
      activeScreen: 'board',
      teams: initTeams,
      boardLength,
      baseColor,
      tiles,
      deck: deck || [],
      mode: mode || 'crew',
      orbitCount: orbitCount || 3,
      deckId,
      deckVersionId,
      currentTeamIndex: 0,
      round: 1
    };
    setGameState(newState);

    if (deckId && deckVersionId) {
      startSessionSafely({
        gameType: 'lingoparty',
        participantNames: teams.map((team) => team.name),
        deckId,
        deckVersionId,
      }, (error) => {
        setTrackingWarning(
          `Play can continue, but this session is not being recorded: ${error.message}`
        );
      }).then((session) => {
        setPlaySessionId(session?.id || null);
      });
    }
  }, []);

  const handleGameComplete = useCallback((teams, reason = 'victory') => {
    if (!playSessionId) return;
    const rankedTeams = [...teams]
      .sort((left, right) => (
        (right.gibelCubes || 0) - (left.gibelCubes || 0) ||
        (right.trophies || 0) - (left.trophies || 0)
      ));
    completeSession(playSessionId, {
      reason,
      winner: rankedTeams[0]?.name || null,
      teams: teams.map((team) => ({
        name: team.name,
        trophies: team.trophies || 0,
        coins: team.coins || 0,
        position: team.position || 0,
      })),
    }).catch(() => null);
    setPlaySessionId(null);
  }, [playSessionId]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#050311' }}>
      {/* ── Space Odyssey Header ── */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 1.5rem',
        background: 'rgba(8, 6, 26, 0.85)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <a href="/" style={{
            textDecoration: 'none',
            color: '#a855f7',
            fontWeight: 800,
            fontSize: '0.95rem',
            padding: '0.3rem 0.8rem',
            borderRadius: '8px',
            background: 'rgba(168, 85, 247, 0.1)',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            transition: 'all 0.2s ease'
          }}>
            🏠 Hub
          </a>
          <span style={{
            color: '#e2e8f0',
            fontWeight: 800,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🚀 LingoParty
            <span style={{
              fontSize: '0.72rem',
              color: '#c4b5fd',
              background: 'rgba(139, 92, 246, 0.15)',
              padding: '0.15rem 0.6rem',
              borderRadius: '50px',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              SPACE ODYSSEY
            </span>
          </span>
        </div>
      </header>

      {trackingWarning && (
        <div
          role="status"
          style={{
            padding: '0.7rem 1.5rem',
            background: 'rgba(245, 158, 11, 0.16)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.45)',
            color: '#fde68a',
            fontWeight: 700,
          }}
        >
          {trackingWarning}
        </div>
      )}

      {gameState.activeScreen === 'setup' ? (
        <SetupScreen onStartGame={handleStartGame} playSound={playSound} />
      ) : (
        <BoardStage
          gameState={gameState}
          setGameState={setGameState}
          playSound={playSound}
          onGameComplete={handleGameComplete}
        />
      )}
    </div>
  );
}
