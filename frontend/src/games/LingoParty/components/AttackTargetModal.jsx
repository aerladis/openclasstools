import React from 'react';
import styles from './AttackTargetModal.module.css';

export default function AttackTargetModal({ isOpen, item, teams, onSelect, onCancel }) {
  if (!isOpen || !item) return null;

  const isSteal = item.id === 'meteor_strike';

  return (
    <div className={styles.modalOverlay}>
      <div className={`glass-card ${styles.targetCard}`}>
        <h2 className={styles.title}>{item.icon} {item.name}</h2>
        <p className={styles.subtitle}>
          {isSteal ? 'Choose which crew to steal Trophies from:' : 'Choose which crew to zap back -3 Planets:'}
        </p>

        <div className={styles.teamsGrid}>
          {teams.map(team => {
            const hasShield = (team.items || []).some(i => i.id === 'shield');
            return (
              <button
                key={team.id}
                className={styles.teamOption}
                onClick={() => onSelect(team.id)}
              >
                <span className={styles.teamPawn}>{team.pawn}</span>
                <span className={styles.teamName}>
                  {team.name}
                  {hasShield && <span title="Grammar Shield — absorbs one attack"> 🛡️</span>}
                </span>
                <span className={styles.teamMeta}>🏆 {team.trophies} · 📍 Tile {team.position}</span>
              </button>
            );
          })}
        </div>

        <button
          className="btn-secondary"
          style={{ width: '100%', padding: '0.8rem', fontWeight: 800 }}
          onClick={onCancel}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}
