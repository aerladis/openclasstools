import React, { useState, useEffect, useCallback } from 'react';
import SetupScreen from './components/SetupScreen';
import BoardStage from './components/BoardStage';
import { useSocketGame } from '../../hooks/useSocketGame';

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
    }
  } catch (err) {
    console.warn('Audio play error:', err);
  }
}

export default function LingoPartyGame() {
  const { socket, isConnected, gameId, isHost, broadcastGameState } = useSocketGame();

  const [gameState, setGameState] = useState({
    gameId,
    activeScreen: 'setup',
    teams: [],
    currentTeamIndex: 0,
    round: 1,
    boardLength: 22,
    tiles: [],
    deck: []
  });

  const generateTiles = (length, deck) => {
    const tiles = [];
    for (let i = 0; i < length; i++) {
      if (i === 0) {
        tiles.push({ id: 0, type: 'start', label: 'Launch Pad' });
      } else if (i === length - 1) {
        tiles.push({ id: i, type: 'trophy', label: 'Goal Sanctuary' });
      } else if (i % 6 === 0) {
        tiles.push({ id: i, type: 'chance', label: 'Cosmic Fate' });
      } else if (i % 5 === 0) {
        tiles.push({ id: i, type: 'shop', label: 'Space Station' });
      } else {
        // Assign challenge card type from deck or cycling types
        const types = ['riddle', 'scramble', 'pronunciation', 'association', 'grammar', 'speed', 'roleplay'];
        const card = deck && deck[i % deck.length];
        const assignedType = card?.type || types[i % types.length];
        tiles.push({ id: i, type: assignedType, label: assignedType });
      }
    }
    return tiles;
  };

  const handleStartGame = useCallback(({ teams, boardLength, deck }) => {
    const tiles = generateTiles(boardLength, deck);
    const newState = {
      ...gameState,
      gameId,
      activeScreen: 'board',
      teams,
      boardLength,
      tiles,
      deck,
      currentTeamIndex: 0,
      round: 1
    };
    setGameState(newState);
    broadcastGameState(newState);
  }, [gameId, gameState, broadcastGameState]);

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <span style={{
            background: 'rgba(139, 92, 246, 0.12)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            padding: '0.25rem 0.75rem',
            borderRadius: '50px',
            fontSize: '0.82rem',
            fontWeight: 800,
            color: '#c4b5fd'
          }}>
            📡 Station: {gameId || 'HOST'}
          </span>
          <span style={{
            color: isConnected ? '#10b981' : '#ef4444',
            fontSize: '0.82rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: isConnected ? '#10b981' : '#ef4444',
              boxShadow: `0 0 8px ${isConnected ? '#10b981' : '#ef4444'}`,
              display: 'inline-block'
            }} />
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      {gameState.activeScreen === 'setup' ? (
        <SetupScreen onStartGame={handleStartGame} playSound={playSound} />
      ) : (
        <BoardStage
          gameState={gameState}
          setGameState={setGameState}
          broadcastGameState={broadcastGameState}
          playSound={playSound}
        />
      )}
    </div>
  );
}
