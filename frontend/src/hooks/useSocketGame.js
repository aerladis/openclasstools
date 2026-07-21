import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocketGame(initialGameId = null) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameId, setGameId] = useState(initialGameId || Math.random().toString(36).substring(2, 6).toUpperCase());
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    // In development with proxy, connect to '/' (or direct if needed)
    const newSocket = io({
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      // Automatically join room as host if we have a gameId
      if (gameId) {
        newSocket.emit('hostJoin', gameId, (res) => {
          if (res && res.success) {
            setIsHost(true);
          } else {
            setError(res?.error || 'Failed to join game room');
          }
        });
      }
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      setError(`Connection error: ${err.message}`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [gameId]);

  const broadcastGameState = useCallback((stateData) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('hostUpdate', {
      gameId,
      type: 'LingoParty',
      game: 'LingoParty',
      ...stateData
    });
    socketRef.current.emit('lingoSync', {
      gameId,
      gameState: stateData
    });
  }, [gameId, isConnected]);

  const emitAction = useCallback((eventName, data) => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit(eventName, { gameId, ...data });
  }, [gameId, isConnected]);

  return {
    socket,
    isConnected,
    gameId,
    setGameId,
    isHost,
    error,
    broadcastGameState,
    emitAction
  };
}
