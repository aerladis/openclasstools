import React, { useState, useEffect } from 'react';
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
  flappy: '🐊'
};

export default function AdminDashboard() {
  const [passcode, setPasscode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('telemetry'); // 'telemetry' | 'remote'
  
  // Telemetry state
  const [sessions, setSessions] = useState([]);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionLogs, setSessionLogs] = useState([]);

  // Socket Remote Control state
  const [connectGameId, setConnectGameId] = useState('');
  const [remoteStatus, setRemoteStatus] = useState('disconnected');
  const [activeGameState, setActiveGameState] = useState(null);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('berkai_admin_passcode');
    if (savedToken) {
      verifyPasscode(savedToken);
    }
  }, []);

  const verifyPasscode = async (code) => {
    setLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/telemetry', {
        headers: { 'x-admin-passcode': code }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem('berkai_admin_passcode', code);
        setSessions(data.sessions || []);
        setOverview(data.overview || null);
      } else {
        setAuthError(data.error || 'Invalid admin passcode');
        sessionStorage.removeItem('berkai_admin_passcode');
      }
    } catch (err) {
      setAuthError('Connection error validating admin access');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (!passcode) return;
    verifyPasscode(passcode);
  };

  const fetchSessionDetails = async (sessionId, gameId) => {
    try {
      const savedCode = sessionStorage.getItem('berkai_admin_passcode');
      const res = await fetch(`/api/admin/session-logs/${gameId}?sessionId=${sessionId}`, {
        headers: { 'x-admin-passcode': savedCode }
      });
      const data = await res.json();
      if (data.success) {
        setSessionLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to fetch session activity logs:', err);
    }
  };

  const filteredSessions = sessions.filter(s => {
    const query = searchFilter.toLowerCase();
    return (
      (s.game_type || '').toLowerCase().includes(query) ||
      (s.game_id || '').toLowerCase().includes(query) ||
      (s.teacher_name || '').toLowerCase().includes(query) ||
      (s.theme || '').toLowerCase().includes(query)
    );
  });

  if (!isAuthenticated) {
    return (
      <div className={styles.authContainer}>
        <div className={`glass-card ${styles.authCard}`}>
          <div className={styles.authIcon}>🛡️</div>
          <h2>Admin Telemetry Dashboard</h2>
          <p>Restricted access for platform administrator</p>

          <form onSubmit={handleLoginSubmit} className={styles.authForm}>
            <input
              type="password"
              className={styles.authInput}
              placeholder="Enter Admin Passcode"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
            />
            {authError && <div className={styles.authError}>{authError}</div>}
            <button type="submit" className={styles.btnAuth} disabled={loading}>
              {loading ? 'Verifying...' : 'Unlock Dashboard 🔓'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adminWrapper}>
      {/* Top Admin Navigation Header */}
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>📊 Admin Telemetry & Analytics Dashboard</h1>
          <span className={styles.supabaseBadge}>⚡ Powered by Supabase DB</span>
        </div>

        <div className={styles.navControls}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'telemetry' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('telemetry')}
          >
            📈 Session Telemetry
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'remote' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('remote')}
          >
            🕹️ Live Game Remote
          </button>

          <a href="/" className={styles.btnReturnHub}>
            🏠 Main Menu
          </a>
          <button
            className={styles.btnLogout}
            onClick={() => {
              sessionStorage.removeItem('berkai_admin_passcode');
              setIsAuthenticated(false);
            }}
          >
            🔒 Lock
          </button>
        </div>
      </header>

      {activeTab === 'telemetry' && (
        <main className={styles.mainContent}>
          {/* Top Metric Cards */}
          {overview && (
            <div className={styles.metricsGrid}>
              <div className={`glass-card ${styles.metricCard}`}>
                <span className={styles.metricIcon}>🎮</span>
                <div>
                  <div className={styles.metricValue}>{overview.totalSessions || 0}</div>
                  <div className={styles.metricLabel}>Total Games Played</div>
                </div>
              </div>

              <div className={`glass-card ${styles.metricCard}`}>
                <span className={styles.metricIcon}>🤖</span>
                <div>
                  <div className={styles.metricValue}>{overview.totalAIContentGenerated || 0}</div>
                  <div className={styles.metricLabel}>AI Cards Generated</div>
                </div>
              </div>

              <div className={`glass-card ${styles.metricCard}`}>
                <span className={styles.metricIcon}>👥</span>
                <div>
                  <div className={styles.metricValue}>{overview.activeTeachersCount || 0}</div>
                  <div className={styles.metricLabel}>Active Teachers</div>
                </div>
              </div>

              <div className={`glass-card ${styles.metricCard}`}>
                <span className={styles.metricIcon}>🔑</span>
                <div>
                  <div className={styles.metricValue}>{overview.customKeyUsagePct || 0}%</div>
                  <div className={styles.metricLabel}>Custom API Key Usage</div>
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className={styles.tableControls}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="🔍 Search by Teacher, Game, Room Code, or Theme..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
            />
            <span className={styles.sessionCountBadge}>
              Showing {filteredSessions.length} of {sessions.length} Game Sessions
            </span>
          </div>

          {/* Game Sessions Data Table */}
          <div className={`glass-card ${styles.tableCard}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Game</th>
                  <th>Room Code</th>
                  <th>Teacher</th>
                  <th>Theme / Context</th>
                  <th>CEFR</th>
                  <th>Teams</th>
                  <th>Key Type</th>
                  <th>Played At</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                      No game sessions logged yet. Play a game to record telemetry!
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map(session => (
                    <tr key={session.id}>
                      <td>
                        <span className={styles.gameTag}>
                          {GAME_ICONS[session.game_type] || '🎲'} {session.game_type?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={styles.codeBadge}>{session.game_id}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#f1f5f9' }}>
                        {session.teacher_name || 'Anonymous Teacher'}
                      </td>
                      <td style={{ color: '#c4b5fd' }}>
                        {session.theme || 'General'}
                      </td>
                      <td>
                        <span className={styles.cefrBadge}>{session.cefr_level || 'B1'}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>
                          {session.teams_count || 0} Teams
                        </span>
                      </td>
                      <td>
                        {session.custom_api_key_used ? (
                          <span className={styles.customKeyBadge}>🔑 Custom Key</span>
                        ) : (
                          <span className={styles.serverKeyBadge}>🌐 Server Key</span>
                        )}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        {new Date(session.created_at).toLocaleString()}
                      </td>
                      <td>
                        <button
                          className={styles.btnInspect}
                          onClick={() => {
                            setSelectedSession(session);
                            fetchSessionDetails(session.id, session.game_id);
                          }}
                        >
                          👁️ Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      )}

      {/* Session Details Inspection Drawer/Modal */}
      {selectedSession && (
        <div className={styles.drawerOverlay} onClick={() => setSelectedSession(null)}>
          <div className={styles.drawerContent} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div>
                <h2>
                  {GAME_ICONS[selectedSession.game_type] || '🎲'} {selectedSession.game_type?.toUpperCase()} — Room {selectedSession.game_id}
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                  Hosted by {selectedSession.teacher_name} on {new Date(selectedSession.created_at).toLocaleString()}
                </p>
              </div>
              <button className={styles.btnClose} onClick={() => setSelectedSession(null)}>✕</button>
            </div>

            <div className={styles.drawerBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoTile}>
                  <strong>Theme / Focus:</strong>
                  <span>{selectedSession.theme}</span>
                </div>
                <div className={styles.infoTile}>
                  <strong>CEFR Level:</strong>
                  <span>{selectedSession.cefr_level || 'B1'}</span>
                </div>
                <div className={styles.infoTile}>
                  <strong>API Key Origin:</strong>
                  <span>{selectedSession.custom_api_key_used ? 'Teacher Custom Key' : 'Default Server Key'}</span>
                </div>
                <div className={styles.infoTile}>
                  <strong>Teams Registered:</strong>
                  <span>{Array.isArray(selectedSession.team_names) ? selectedSession.team_names.join(', ') : selectedSession.teams_count}</span>
                </div>
              </div>

              <h3 style={{ marginTop: '1.5rem', color: '#c4b5fd', fontSize: '1.1rem' }}>
                📜 Activity Telemetry Logs ({sessionLogs.length} Events)
              </h3>

              <div className={styles.logsList}>
                {sessionLogs.length === 0 ? (
                  <div style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>
                    No granular activity events recorded for this session.
                  </div>
                ) : (
                  sessionLogs.map(log => (
                    <div key={log.id} className={styles.logItem}>
                      <span className={styles.logTime}>
                        {new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      <span className={styles.logType}>{log.event_type}</span>
                      <pre className={styles.logJson}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
