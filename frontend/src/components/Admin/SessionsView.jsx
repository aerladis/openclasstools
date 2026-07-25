import React, { useCallback, useEffect, useState } from 'react';
import styles from './AdminViews.module.css';

const EMPTY_FILTERS = {
  gameType: '',
  teacher: '',
  participant: '',
  deck: '',
  roomCode: '',
  theme: '',
  cefr: '',
  status: '',
  from: '',
  to: '',
};

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Unable to load sessions');
  return body;
}

export default function SessionsView() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({});
  const [nextCursor, setNextCursor] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (cursor = '') => {
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams(
        Object.entries({ ...filters, cursor, limit: '50' }).filter(([, value]) => value),
      );
      const body = await readJson(await fetch(`/api/admin/sessions?${query}`, {
        credentials: 'same-origin',
      }));
      setSessions(body.items || []);
      setSummary(body.summary || {});
      setNextCursor(body.nextCursor || null);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const inspect = async (id) => {
    try {
      const body = await readJson(await fetch(`/api/admin/sessions/${id}`, {
        credentials: 'same-origin',
      }));
      setSelected(body.session);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <section className={styles.view}>
      <div className={styles.metrics}>
        <article><strong>{summary.totalSessions || 0}</strong><span>Sessions</span></article>
        <article><strong>{summary.completedSessions || 0}</strong><span>Completed</span></article>
        <article><strong>{summary.abandonedSessions || 0}</strong><span>Abandoned</span></article>
        <article><strong>{summary.generatedDecks || 0}</strong><span>Generated decks</span></article>
        <article><strong>{summary.teacherKeyUsagePercent || 0}%</strong><span>Teacher key</span></article>
      </div>

      <div className={styles.filters}>
        {Object.keys(EMPTY_FILTERS).map((key) => (
          key === 'gameType' ? (
            <select
              key={key}
              aria-label="Game type"
              value={filters[key]}
              onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
            >
              <option value="">All games</option>
              {[
                'who', 'taboo', 'hangman', 'millionaire', 'kelime',
                'flashcards', 'hats', 'lingoparty', 'bottle', 'wheel',
              ].map((game) => <option key={game} value={game}>{game}</option>)}
            </select>
          ) : key === 'status' ? (
            <select
              key={key}
              aria-label="Session status"
              value={filters[key]}
              onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          ) : (
            <input
              key={key}
              type={key === 'from' || key === 'to' ? 'datetime-local' : 'text'}
              aria-label={key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}
              value={filters[key]}
              placeholder={key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)}
              onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
            />
          )
        ))}
      </div>

      {error && (
        <p className={styles.error}>
          {error} <button onClick={() => load()}>Retry</button>
        </p>
      )}
      {Object.keys(summary.sessionsByGame || {}).length > 0 && (
        <p>
          By game: {Object.entries(summary.sessionsByGame)
            .map(([game, count]) => `${game} ${count}`)
            .join(' · ')}
        </p>
      )}
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>Game</th><th>Teacher</th><th>Participants</th><th>Deck</th>
              <th>Generation</th><th>Status</th><th>Started</th><th />
            </tr>
          </thead>
          <tbody>
            {!loading && sessions.length === 0 && (
              <tr><td colSpan="8">No matching sessions.</td></tr>
            )}
            {sessions.map((session) => (
              <tr key={session.id}>
                <td>{session.gameType}<small>{session.roomCode || 'no room'}</small></td>
                <td>{session.teacherDisplayName}</td>
                <td>{session.participantNames?.join(', ') || '—'}</td>
                <td>{session.deckName || 'Deckless'}{session.deckVersion ? ` · v${session.deckVersion.versionNumber}` : ''}</td>
                <td>
                  {session.deckVersion
                    ? `${session.deckVersion.source} · ${session.deckVersion.teacherKeyUsed ? 'teacher key' : 'platform/system'}`
                    : '—'}
                </td>
                <td>{session.status}</td>
                <td>{new Date(session.startedAt).toLocaleString()}</td>
                <td><button onClick={() => inspect(session.id)}>Inspect</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nextCursor && <button onClick={() => load(nextCursor)}>Next page</button>}

      {selected && (
        <div className={styles.drawerBackdrop} onClick={() => setSelected(null)}>
          <aside className={styles.drawer} onClick={(event) => event.stopPropagation()}>
            <button onClick={() => setSelected(null)}>Close</button>
            <h2>{selected.gameType} session</h2>
            <dl>
              <dt>Teacher</dt><dd>{selected.teacherDisplayName}</dd>
              <dt>Participants</dt><dd>{selected.participantNames?.join(', ') || '—'}</dd>
              <dt>Deck version</dt><dd>{selected.deckName || 'Deckless'} {selected.deckVersion ? `v${selected.deckVersion.versionNumber}` : ''}</dd>
              <dt>Theme / CEFR</dt>
              <dd>{selected.deckVersion
                ? `${selected.deckVersion.theme || '—'} / ${selected.deckVersion.cefrLevel || '—'}`
                : '—'}</dd>
              <dt>Generation</dt>
              <dd>{selected.deckVersion
                ? `${selected.deckVersion.source}; ${selected.deckVersion.teacherKeyUsed ? 'teacher key' : 'platform/system key'}`
                : '—'}</dd>
              <dt>Started / ended</dt>
              <dd>
                {new Date(selected.startedAt).toLocaleString()} / {selected.endedAt
                  ? new Date(selected.endedAt).toLocaleString()
                  : 'still active'}
              </dd>
              <dt>Result</dt><dd><pre>{JSON.stringify(selected.result, null, 2)}</pre></dd>
              {selected.deckVersion?.content && (
                <>
                  <dt>Exact content</dt>
                  <dd><pre>{JSON.stringify(selected.deckVersion.content, null, 2)}</pre></dd>
                </>
              )}
            </dl>
            <h3>Activity</h3>
            {(selected.activity || []).map((event) => (
              <pre key={event.id}>{event.eventType}: {JSON.stringify(event.details)}</pre>
            ))}
          </aside>
        </div>
      )}
    </section>
  );
}
