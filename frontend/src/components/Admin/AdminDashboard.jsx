import React, { useCallback, useEffect, useState } from 'react';
import styles from './AdminDashboard.module.css';

const GAME_ICONS = {
  lingoparty: '🎲',
  who: '🎭',
  taboo: '🃏',
  hangman: '💀',
  bottle: '🍾',
  wheel: '🎡',
  kelime: '🔤',
  flashcards: '📇',
  millionaire: '💰',
  hats: '🎩',
};

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || 'The request failed');
    error.status = response.status;
    throw error;
  }
  return body;
}

export default function AdminDashboard() {
  const [authState, setAuthState] = useState('checking');
  const [csrfToken, setCsrfToken] = useState('');
  const [passcode, setPasscode] = useState('');
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSessions = useCallback(async () => {
    const response = await fetch('/api/admin/sessions', {
      credentials: 'same-origin',
    });
    const body = await readJson(response);
    setSessions(body.items || []);
    setSummary(body.summary || {});
  }, []);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const response = await fetch('/api/admin/session', {
          credentials: 'same-origin',
        });
        const body = await readJson(response);
        if (!active) return;
        setCsrfToken(body.csrfToken);
        setAuthState('authenticated');
        await fetchSessions();
      } catch {
        if (active) setAuthState('anonymous');
      }
    };
    restore();
    return () => {
      active = false;
    };
  }, [fetchSessions]);

  const login = async (event) => {
    event.preventDefault();
    if (!passcode) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });
      const body = await readJson(response);
      setPasscode('');
      setCsrfToken(body.csrfToken);
      setAuthState('authenticated');
      await fetchSessions();
    } catch (requestError) {
      setPasscode('');
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'x-csrf-token': csrfToken },
      });
    } finally {
      setCsrfToken('');
      setSessions([]);
      setAuthState('anonymous');
    }
  };

  if (authState !== 'authenticated') {
    return (
      <div className={styles.authContainer}>
        <div className={`glass-card ${styles.authCard}`}>
          <div className={styles.authIcon}>🛡️</div>
          <h2>OpenClassTools Control Center</h2>
          <p>
            {authState === 'checking'
              ? 'Checking administrator session…'
              : 'Restricted platform administration'}
          </p>
          {authState === 'anonymous' && (
            <form onSubmit={login} className={styles.authForm}>
              <input
                type="password"
                autoComplete="current-password"
                className={styles.authInput}
                placeholder="Administrator passcode"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                required
              />
              {error && <div className={styles.authError}>{error}</div>}
              <button type="submit" className={styles.btnAuth} disabled={loading}>
                {loading ? 'Signing in…' : 'Open control center'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminWrapper}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>OpenClassTools Control Center</h1>
          <span className={styles.supabaseBadge}>Protected administrator session</span>
        </div>
        <div className={styles.navControls}>
          <a href="/" className={styles.btnReturnHub}>Main menu</a>
          <button className={styles.btnLogout} onClick={logout}>Lock</button>
        </div>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.metricsGrid}>
          <div className={`glass-card ${styles.metricCard}`}>
            <span className={styles.metricIcon}>🎮</span>
            <div>
              <div className={styles.metricValue}>{summary.totalSessions || 0}</div>
              <div className={styles.metricLabel}>Recent sessions</div>
            </div>
          </div>
          <div className={`glass-card ${styles.metricCard}`}>
            <span className={styles.metricIcon}>✅</span>
            <div>
              <div className={styles.metricValue}>{summary.completedSessions || 0}</div>
              <div className={styles.metricLabel}>Completed</div>
            </div>
          </div>
          <div className={`glass-card ${styles.metricCard}`}>
            <span className={styles.metricIcon}>⌛</span>
            <div>
              <div className={styles.metricValue}>{summary.abandonedSessions || 0}</div>
              <div className={styles.metricLabel}>Abandoned</div>
            </div>
          </div>
          <div className={`glass-card ${styles.metricCard}`}>
            <span className={styles.metricIcon}>🔑</span>
            <div>
              <div className={styles.metricValue}>
                {summary.teacherKeyUsagePercent || 0}%
              </div>
              <div className={styles.metricLabel}>Teacher-key generations</div>
            </div>
          </div>
        </div>

        <div className={`glass-card ${styles.tableCard}`}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Game</th>
                <th>Room</th>
                <th>Teacher</th>
                <th>Participants</th>
                <th>Deck / version</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan="7">No recorded sessions yet.</td>
                </tr>
              ) : sessions.map((session) => (
                <tr key={session.id}>
                  <td>
                    <span className={styles.gameTag}>
                      {GAME_ICONS[session.gameType] || '🎲'} {session.gameType}
                    </span>
                  </td>
                  <td><span className={styles.codeBadge}>{session.roomCode || '—'}</span></td>
                  <td>{session.teacherDisplayName}</td>
                  <td>{session.participantNames?.join(', ') || '—'}</td>
                  <td>
                    {session.deckName || 'Deckless'}
                    {session.deckVersion ? ` · v${session.deckVersion.versionNumber}` : ''}
                  </td>
                  <td>{session.status}</td>
                  <td>{new Date(session.startedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
