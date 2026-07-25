import React, { useEffect, useState } from 'react';
import AdminLogin from './AdminLogin';
import AdminShell from './AdminShell';

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Administrator request failed');
  return body;
}

export default function AdminDashboard() {
  const [authState, setAuthState] = useState('checking');
  const [csrfToken, setCsrfToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    readJson(fetch('/api/admin/session', { credentials: 'same-origin' }))
      .then((body) => {
        if (!active) return;
        setCsrfToken(body.csrfToken);
        setAuthState('authenticated');
      })
      .catch(() => {
        if (active) setAuthState('anonymous');
      });
    return () => {
      active = false;
    };
  }, []);

  const login = async (passcode) => {
    setLoading(true);
    setError('');
    try {
      const body = await readJson(await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      }));
      setCsrfToken(body.csrfToken);
      setAuthState('authenticated');
    } catch (requestError) {
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
      setAuthState('anonymous');
    }
  };

  if (authState !== 'authenticated') {
    return (
      <AdminLogin
        checking={authState === 'checking'}
        error={error}
        loading={loading}
        onLogin={login}
      />
    );
  }

  return <AdminShell csrfToken={csrfToken} onLogout={logout} />;
}
