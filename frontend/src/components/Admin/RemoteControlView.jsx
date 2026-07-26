import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import styles from './AdminViews.module.css';

function extractPack(data) {
  if (Array.isArray(data?.characters)) return { type: data.type, characters: data.characters };
  if (Array.isArray(data?.words)) return { type: data.type, words: data.words };
  if (Array.isArray(data?.cards)) return { type: data.type, cards: data.cards };
  if (Array.isArray(data?.questions)) return { type: data.type, questions: data.questions };
  return null;
}

export default function RemoteControlView() {
  const socketRef = useRef(null);
  const joinedGameRef = useRef('');
  const [gameId, setGameId] = useState('');
  const [joinedGameId, setJoinedGameId] = useState('');
  const [status, setStatus] = useState('Not connected');
  const [gameState, setGameState] = useState(null);
  const [packText, setPackText] = useState('');
  const [packError, setPackError] = useState('');

  useEffect(() => {
    const socket = io({ withCredentials: true });
    socketRef.current = socket;

    const receiveState = (data) => {
      if (data?.gameId && data.gameId !== joinedGameRef.current) return;
      setGameState(data);
    };
    socket.on('adminUpdate', receiveState);
    socket.on('lingoSyncClient', (data) => {
      if (data?.gameId !== joinedGameRef.current) return;
      setGameState({ game: 'LingoParty', gameId: data.gameId, ...(data.gameState || data) });
    });
    socket.on('adminWordListSync', (data) => {
      if (data?.gameId !== joinedGameRef.current) return;
      const pack = extractPack(data);
      if (pack) setPackText(JSON.stringify(pack, null, 2));
      setGameState((current) => ({ ...current, ...data }));
    });
    socket.on('disconnect', () => setStatus('Connection lost'));
    return () => socket.disconnect();
  }, []);

  const join = () => {
    const normalized = gameId.trim().toUpperCase();
    setPackError('');
    socketRef.current?.emit('adminJoin', normalized, (response) => {
      if (!response?.success) {
        setStatus(response?.error || 'Unable to join');
        return;
      }
      joinedGameRef.current = normalized;
      setJoinedGameId(normalized);
      setStatus(`Connected to ${normalized}`);
      setGameState(null);
      setPackText('');
      socketRef.current.emit('requestState', normalized);
    });
  };

  const adminCommand = (action, extra = {}) => {
    if (!joinedGameRef.current) return;
    socketRef.current?.emit('adminUpdateHost', {
      gameId: joinedGameRef.current,
      game: gameState?.game,
      action,
      ...extra,
    });
  };

  const lingoCommand = (action, extra = {}) => {
    if (!joinedGameRef.current) return;
    socketRef.current?.emit('lingoAction', {
      gameId: joinedGameRef.current,
      action,
      ...extra,
    });
  };

  const syncPack = () => {
    try {
      const pack = JSON.parse(packText);
      if (!extractPack(pack)) throw new Error('The pack does not contain a supported list.');
      socketRef.current?.emit('updateWordListAdmin', {
        gameId: joinedGameRef.current,
        ...pack,
      });
      setPackError('Live pack synchronized.');
    } catch (error) {
      setPackError(error.message || 'The live pack is invalid.');
    }
  };

  const millionaire = gameState?.game === 'Who Wants to Be a Millionaire';
  const lingo = gameState?.game === 'LingoParty';

  return (
    <section className={styles.view}>
      <div className={styles.remoteJoin}>
        <input
          value={gameId}
          maxLength={4}
          aria-label="Room code"
          placeholder="Room code"
          onChange={(event) => setGameId(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && join()}
        />
        <button onClick={join}>Connect</button>
        <button
          onClick={() => socketRef.current?.emit('requestState', joinedGameId)}
          disabled={!joinedGameId}
        >
          Refresh state
        </button>
        <span>{status}</span>
      </div>

      <h2>{gameState?.game || 'Waiting for host state'}</h2>

      <div className={styles.actionRow}>
        {[
          'START_GAME',
          'PREV_QUESTION',
          'NEXT_QUESTION',
          'REVEAL_LETTER',
          'TOGGLE_TIMER',
          'CORRECT_ANSWER',
          'PASS_QUESTION',
        ].map((action) => (
          <button key={action} onClick={() => adminCommand(action)} disabled={!joinedGameId}>
            {action.replaceAll('_', ' ')}
          </button>
        ))}
      </div>

      {millionaire && (
        <div className={styles.remotePanel}>
          <h3>Millionaire controls</h3>
          <div className={styles.actionRow}>
            {(gameState.options || []).map((option, answerIndex) => (
              <button
                key={answerIndex}
                disabled={gameState.hiddenAnswers?.includes(answerIndex)}
                onClick={() => adminCommand('SELECT_ANSWER', { answerIndex })}
              >
                {String.fromCharCode(65 + answerIndex)}. {option}
              </button>
            ))}
          </div>
          <div className={styles.actionRow}>
            {[
              ['fiftyFifty', '50:50'],
              ['phoneFriend', 'Phone'],
              ['askAudience', 'Audience'],
            ].map(([lifeline, label]) => (
              <button
                key={lifeline}
                disabled={gameState.lifelines?.[lifeline]?.used}
                onClick={() => adminCommand('USE_LIFELINE', { lifeline })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {lingo && (
        <div className={styles.remotePanel}>
          <h3>LingoParty controls</h3>
          <div className={styles.actionRow}>
            <button onClick={() => lingoCommand('ROLL_DICE')}>Roll dice</button>
            <button onClick={() => lingoCommand('GRADE_ANSWER', { grade: 'correct' })}>Correct</button>
            <button onClick={() => lingoCommand('GRADE_ANSWER', { grade: 'wrong' })}>Wrong</button>
            <button onClick={() => lingoCommand('GRADE_ANSWER', { grade: 'pass' })}>Pass</button>
          </div>
        </div>
      )}

      {packText && (
        <div className={styles.remotePanel}>
          <h3>Live host pack</h3>
          <p>This changes the connected host only. Publish persistent changes from the Decks tab.</p>
          <textarea
            className={styles.packEditor}
            value={packText}
            onChange={(event) => setPackText(event.target.value)}
          />
          <button onClick={syncPack}>Synchronize live pack</button>
          {packError && <p>{packError}</p>}
        </div>
      )}

      <pre className={styles.statePreview}>
        {gameState ? JSON.stringify(gameState, null, 2) : 'Waiting for host state…'}
      </pre>
    </section>
  );
}
