import React, { useEffect, useRef } from 'react';
import styles from './GenerationConsole.module.css';

export default function GenerationConsole({ logs = [], onClose }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [logs]);

  if (!logs || !logs.length) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.console}>
        <div className={styles.header}>
          <span className={styles.headerTitle}>⚡ AI Generation Console</span>
          {onClose && (
            <button type="button" className={styles.closeBtn} onClick={onClose} title="Close Console">
              ✕
            </button>
          )}
        </div>
        <ul ref={listRef} className={styles.logList}>
          {logs.map((entry, index) => (
            <li
              key={index}
              className={`${styles.logItem} ${entry.type ? styles[entry.type] : ''}`}
            >
              <span className={styles.time}>[{entry.time}]</span>
              <span className={styles.message}>{entry.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

