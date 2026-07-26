import React, { useState } from 'react';
import styles from './AdminDashboard.module.css';

export default function AdminLogin({ checking, error, loading, onLogin }) {
  const [passcode, setPasscode] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!passcode) return;
    await onLogin(passcode);
    setPasscode('');
  };

  return (
    <div className={styles.authContainer}>
      <div className={`glass-card ${styles.authCard}`}>
        <div className={styles.authIcon}>🛡️</div>
        <h2>OpenClassTools Control Center</h2>
        <p>{checking ? 'Checking administrator session…' : 'Restricted platform administration'}</p>
        {!checking && (
          <form onSubmit={submit} className={styles.authForm}>
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
