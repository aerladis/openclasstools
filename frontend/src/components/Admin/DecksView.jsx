import React, { useCallback, useEffect, useState } from 'react';
import DeckEditor from './editors/DeckEditor';
import styles from './AdminViews.module.css';

async function request(url, options) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'Deck request failed');
    error.code = body.code;
    throw error;
  }
  return body;
}

export default function DecksView({ csrfToken }) {
  const [decks, setDecks] = useState([]);
  const [gameType, setGameType] = useState('');
  const [query, setQuery] = useState('');
  const [archived, setArchived] = useState('false');
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [versionSessions, setVersionSessions] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams(
        Object.entries({ gameType, query, archived }).filter(([, value]) => value),
      );
      const body = await request(`/api/admin/decks?${params}`);
      setDecks(body.items || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [archived, gameType, query]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const inspect = async (deck) => {
    setSelected(deck);
    setEditing(false);
    setVersionSessions(null);
    try {
      const body = await request(`/api/admin/decks/${deck.id}/history`);
      setHistory(body.versions || []);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const mutate = async (path, method, payload) => {
    setBusy(true);
    setError('');
    try {
      const body = await request(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(payload),
      });
      setSelected(body.deck);
      await load();
      return body.deck;
    } catch (requestError) {
      setError(requestError.code === 'DECK_VERSION_CONFLICT'
        ? 'This deck changed while it was open. Refresh and try again.'
        : requestError.message);
      if (requestError.code === 'DECK_VERSION_CONFLICT') {
        setSelected(null);
        await load();
      }
      throw requestError;
    } finally {
      setBusy(false);
    }
  };

  const publish = async (content) => {
    try {
      const deck = await mutate(`/api/admin/decks/${selected.id}/revisions`, 'POST', {
        expectedVersionId: selected.currentVersion.id,
        content,
        theme: selected.currentVersion.theme,
        cefrLevel: selected.currentVersion.cefrLevel,
      });
      setEditing(false);
      await inspect(deck);
    } catch {
      // Mutation displays its own safe error.
    }
  };

  const rename = async () => {
    const name = window.prompt('New deck name', selected.name);
    if (!name || name === selected.name) return;
    try {
      await mutate(`/api/admin/decks/${selected.id}/name`, 'PATCH', {
        name,
        expectedVersionId: selected.currentVersion.id,
      });
    } catch {
      // Mutation displays its own safe error.
    }
  };

  const toggleArchive = async () => {
    try {
      await mutate(`/api/admin/decks/${selected.id}/archive`, 'PATCH', {
        archived: !selected.archivedAt,
        expectedVersionId: selected.currentVersion.id,
      });
      setSelected(null);
    } catch {
      // Mutation displays its own safe error.
    }
  };

  const showVersionSessions = async (version) => {
    try {
      const params = new URLSearchParams({
        deckVersionId: version.id,
        limit: '100',
      });
      const body = await request(`/api/admin/sessions?${params}`);
      setVersionSessions({
        versionNumber: version.versionNumber,
        items: body.items || [],
      });
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className={styles.view}>
      <div className={styles.filters}>
        <select value={gameType} onChange={(event) => setGameType(event.target.value)}>
          <option value="">All games</option>
          {['who', 'taboo', 'hangman', 'millionaire', 'kelime', 'flashcards', 'hats', 'lingoparty'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search deck name" />
        <select value={archived} onChange={(event) => setArchived(event.target.value)}>
          <option value="false">Active</option>
          <option value="true">Archived</option>
          <option value="all">All</option>
        </select>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.cardGrid}>
        {decks.map((deck) => (
          <button key={deck.id} onClick={() => inspect(deck)}>
            <strong>{deck.name}</strong>
            <span>{deck.gameType} · v{deck.currentVersion.versionNumber}</span>
            <small>{deck.isSystem ? 'System' : deck.currentVersion.source}</small>
          </button>
        ))}
      </div>

      {selected && (
        <div className={styles.drawerBackdrop} onClick={() => setSelected(null)}>
          <aside className={styles.drawerWide} onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setSelected(null)}>Close</button>
            <h2>{selected.name}</h2>
            <p>{selected.gameType} · current version {selected.currentVersion.versionNumber}</p>
            <p>
              {selected.currentVersion.source} · {selected.currentVersion.theme || 'No theme'} ·
              {' '}{selected.currentVersion.cefrLevel || 'No CEFR'} ·
              {' '}{selected.currentVersion.teacherKeyUsed ? 'teacher key' : 'platform/system key'}
            </p>
            <div className={styles.actionRow}>
              <button onClick={rename} disabled={busy}>Rename</button>
              <button onClick={() => setEditing(true)} disabled={busy}>Edit content</button>
              <button onClick={toggleArchive} disabled={busy}>
                {selected.archivedAt ? 'Restore' : 'Archive'}
              </button>
            </div>
            {editing ? (
              <DeckEditor
                gameType={selected.gameType}
                content={selected.currentVersion.content}
                busy={busy}
                onPublish={publish}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                <h3>Revision history</h3>
                <ul>
                  {history.map((version) => (
                    <li key={version.id}>
                      v{version.versionNumber} · {version.source} · {new Date(version.createdAt).toLocaleString()}
                      {' '}
                      <button type="button" onClick={() => showVersionSessions(version)}>
                        Sessions using v{version.versionNumber}
                      </button>
                    </li>
                  ))}
                </ul>
                {versionSessions && (
                  <>
                    <h3>Sessions using v{versionSessions.versionNumber}</h3>
                    {versionSessions.items.length === 0 ? (
                      <p>No sessions used this revision.</p>
                    ) : (
                      <ul>
                        {versionSessions.items.map((session) => (
                          <li key={session.id}>
                            {session.teacherDisplayName} · {session.gameType} ·
                            {' '}{new Date(session.startedAt).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
