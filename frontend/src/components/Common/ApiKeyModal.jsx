import React, { useState, useEffect } from 'react';
import styles from './ApiKeyModal.module.css';
import {
  getTeacherContext,
  saveTeacherSettings,
  verifyTeacherKey,
} from '../../services/platformApi';

export default function ApiKeyModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      const context = getTeacherContext();
      setApiKey(context.geminiApiKey);
      setTeacherName(context.teacherDisplayName);
      setSavedStatus(false);
      setError('');
      setVerifying(false);
      setVerifiedSuccess('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !apiKey || apiKey.length < 10 || !teacherName.trim()) {
      setVerifiedSuccess('');
      return;
    }

    const timer = setTimeout(async () => {
      setVerifying(true);
      setError('');
      setVerifiedSuccess('');
      try {
        const res = await verifyTeacherKey({
          teacherDisplayName: teacherName,
          geminiApiKey: apiKey,
        });
        setVerifiedSuccess(res.message || 'Game server connected & Gemini key verified!');
      } catch (err) {
        setError(err.message);
        setVerifiedSuccess('');
      } finally {
        setVerifying(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [apiKey, teacherName, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSavedStatus(false);
    setVerifying(true);

    try {
      await verifyTeacherKey({
        teacherDisplayName: teacherName,
        geminiApiKey: apiKey,
      });

      saveTeacherSettings({
        teacherDisplayName: teacherName,
        geminiApiKey: apiKey,
      });

      setVerifiedSuccess('Game server connected & Gemini key verified!');
      setSavedStatus(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (settingsError) {
      setError(settingsError.message);
      setSavedStatus(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleClear = () => {
    window.sessionStorage.removeItem('oct_gemini_key');
    setApiKey('');
    setSavedStatus(false);
    setError('');
    setVerifiedSuccess('');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>🔑 Teacher Settings & API Key</h2>
          <button className={styles.btnClose} onClick={onClose}>✕</button>
        </div>

        <p className={styles.description}>
          Set the teacher name recorded with generated decks and play sessions. A personal
          Gemini key is kept only in this browser tab and is never stored by the server.
        </p>

        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label>Teacher / Classroom Name</label>
            <input
              type="text"
              className={styles.inputField}
              value={teacherName}
              onChange={e => setTeacherName(e.target.value)}
              placeholder="e.g. Mr. Smith - Room 302"
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Google Gemini API Key</label>
            <input
              type="password"
              className={styles.inputField}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              required
            />
            <span className={styles.hint}>
              Get a key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.
              If it fails, the app will not silently retry with another key.
            </span>
          </div>

          {verifying && (
            <div className={styles.verifyingBadge}>
              📡 Testing game server connection & Gemini API key...
            </div>
          )}
          {verifiedSuccess && !verifying && (
            <div className={styles.successBadge}>
              ✅ {verifiedSuccess}
            </div>
          )}
          {error && !verifying && <div className={styles.errorBadge}>{error}</div>}
          {savedStatus && !verifying && (
            <div className={styles.successBadge}>
              ✅ Preferences saved!
            </div>
          )}

          <div className={styles.btnRow}>
            {apiKey && (
              <button type="button" className={styles.btnClear} onClick={handleClear}>
                Clear Key
              </button>
            )}
            <button type="submit" className={styles.btnSave} disabled={verifying}>
              {verifying ? 'Verifying...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

