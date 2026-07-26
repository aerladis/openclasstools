import React, { useState } from 'react';
import SessionsView from './SessionsView';
import DecksView from './DecksView';
import RemoteControlView from './RemoteControlView';
import styles from './AdminDashboard.module.css';

export default function AdminShell({ csrfToken, onLogout }) {
  const [tab, setTab] = useState('sessions');

  return (
    <div className={styles.adminWrapper}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>OpenClassTools Control Center</h1>
          <span className={styles.supabaseBadge}>Protected administrator session</span>
        </div>
        <div className={styles.navControls}>
          {[
            ['sessions', 'Sessions'],
            ['decks', 'Decks'],
            ['remote', 'Live remote'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={`${styles.tabBtn} ${tab === value ? styles.activeTab : ''}`}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
          <a href="/" className={styles.btnReturnHub}>Main menu</a>
          <button className={styles.btnLogout} onClick={onLogout}>Lock</button>
        </div>
      </header>
      <main className={styles.mainContent}>
        {tab === 'sessions' && <SessionsView />}
        {tab === 'decks' && <DecksView csrfToken={csrfToken} />}
        {tab === 'remote' && <RemoteControlView />}
      </main>
    </div>
  );
}
