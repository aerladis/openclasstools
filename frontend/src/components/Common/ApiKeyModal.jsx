import React, { useState, useEffect } from 'react';
import styles from './ApiKeyModal.module.css';

export default function ApiKeyModal({ isOpen, onClose }) {
  const [apiKey, setApiKey] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [savedStatus, setSavedStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(localStorage.getItem('berkai_gemini_api_key') || '');
      setTeacherName(localStorage.getItem('berkai_teacher_name') || '');
      setSavedStatus(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('berkai_gemini_api_key', apiKey.trim());
    localStorage.setItem('berkai_teacher_name', teacherName.trim() || 'Anonymous Teacher');
    setSavedStatus(true);
    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleClear = () => {
    localStorage.removeItem('berkai_gemini_api_key');
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
          Input your personal Google Gemini API Key to use your own generation quota for classroom AI content.
          Your key stays safely stored in your browser session.
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
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Google Gemini API Key (Optional Custom Key)</label>
            <input
              type="password"
              className={styles.inputField}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
            />
            <span className={styles.hint}>
              Get a free API key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>. Leave blank to use server key.
            </span>
          </div>

          {savedStatus && (
            <div className={styles.successBadge}>
              ✅ Settings & API Key saved!
            </div>
          )}

          <div className={styles.btnRow}>
            {apiKey && (
              <button type="button" className={styles.btnClear} onClick={handleClear}>
                Clear Custom Key
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
