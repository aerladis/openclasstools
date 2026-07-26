import React, { useState, useEffect } from 'react';
import styles from './ApiKeyModal.module.css';
import {
  getTeacherContext,
  saveTeacherSettings,
} from '../../services/platformApi';

export default function ApiKeyModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const context = getTeacherContext();
      setApiKey(context.geminiApiKey);
      setTeacherName(context.teacherDisplayName);
      setSavedStatus(false);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    try {
      saveTeacherSettings({
        teacherDisplayName: teacherName,
        geminiApiKey: apiKey,
      });
      setError('');
      setSavedStatus(true);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (settingsError) {
      setError(settingsError.message);
      setSavedStatus(false);
    }
  };

  const handleClear = () => {
    window.sessionStorage.removeItem('oct_gemini_key');
    setApiKey('');
    setSavedStatus(false);
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

          {error && <div className={styles.errorBadge}>{error}</div>}
          {savedStatus && (
            <div className={styles.successBadge}>
              ✅ Settings & API Key saved!
            </div>
          )}

          <div className={styles.btnRow}>
            {apiKey && (
              <button type="button" className={styles.btnClear} onClick={handleClear}>
                Clear Key
              </button>
            )}
            <button type="submit" className={styles.btnSave}>
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
