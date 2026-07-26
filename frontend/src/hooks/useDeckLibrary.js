import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateDeck, listDecks } from '../services/platformApi';

export default function useDeckLibrary(gameType) {
  const [decks, setDecks] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextDecks = await listDecks(gameType);
      setDecks(nextDecks);
      setSelectedId((current) => (
        nextDecks.some((deck) => deck.id === current)
          ? current
          : (nextDecks[0]?.id || '')
      ));
      return nextDecks;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [gameType]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const selectedDeck = useMemo(
    () => decks.find((deck) => deck.id === selectedId) || null,
    [decks, selectedId],
  );

  const generate = useCallback(async ({ endpoint, deckName, ...input }) => {
    setLoading(true);
    setError('');
    try {
      const deck = await generateDeck(gameType, endpoint, { ...input, deckName });
      setDecks((current) => [deck, ...current.filter((item) => item.id !== deck.id)]);
      setSelectedId(deck.id);
      return deck;
    } catch (requestError) {
      setError(requestError.message);
      throw requestError;
    } finally {
      setLoading(false);
    }
  }, [gameType]);

  return {
    decks,
    selectedDeck,
    loading,
    error,
    refresh,
    select: setSelectedId,
    generate,
  };
}
