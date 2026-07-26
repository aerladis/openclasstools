import React from 'react';
import styles from './GenerationConsole.module.css';

export default function GenerationConsole({ logs = [] }) {
  if (!logs.length) return null;

  return (
    <div className={styles.console}>
      <div className={styles.header}>AI Generation Console</div>
      <ul className={styles.logList}>
        {logs.map((entry, index) => (
          <li
            key={index}
            className={`${styles.logItem} ${entry.type === 'error' ? styles.error : ''}`}
          >
            <span className={styles.time}>{entry.time}</span>
            <span className={styles.message}>{entry.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
