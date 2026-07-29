import React from 'react';
import styles from './OrbitResultModal.module.css';

export default function OrbitResultModal({ orbitResult, onContinue }) {
  if (!orbitResult) return null;

  const { orbitNumber, cubeTeamName, cubeTeamPawn, cubeCount, requiredCubes, teams } = orbitResult;
  const nextOrbit = orbitNumber + 1;

  const sortedTeams = [...teams].sort((a, b) => {
    if ((b.gibelCubes || 0) !== (a.gibelCubes || 0)) return (b.gibelCubes || 0) - (a.gibelCubes || 0);
    return (b.trophies || 0) - (a.trophies || 0);
  });

  return (
    <div className={styles.overlay}>
      <div className={`glass-card ${styles.card}`}>
        <div className={styles.header}>
          <div className={styles.orbitBadge}>🛸 ORBIT {orbitNumber} COMPLETE</div>
          <h2 className={styles.title}>Orbit Results</h2>
        </div>

        <div className={styles.cubeAward}>
          <span className={styles.cubeIcon}>🧊</span>
          <div>
            <div className={styles.cubeText}>
              {cubeTeamPawn} {cubeTeamName} earned a Gibel Cube!
            </div>
            <div className={styles.cubeProgress}>
              Cubes: {cubeCount} / {requiredCubes}
            </div>
          </div>
        </div>

        <div className={styles.standings}>
          <h3 className={styles.standingsTitle}>📊 Crew Standings</h3>
          {sortedTeams.map((team, idx) => (
            <div key={team.id} className={`${styles.teamRow} ${idx === 0 ? styles.teamRowFirst : ''}`}>
              <div className={styles.teamLeft}>
                <span className={styles.rank}>#{idx + 1}</span>
                <span className={styles.pawn}>{team.pawn}</span>
                <span className={styles.name}>{team.name}</span>
              </div>
              <div className={styles.teamRight}>
                <span className={styles.statCube}>🧊 {team.gibelCubes || 0}</span>
                <span className={styles.statTrophy}>🏆 {team.trophies || 0}</span>
              </div>
            </div>
          ))}
        </div>

        <button className={styles.continueBtn} onClick={onContinue}>
          🚀 Launch Orbit {nextOrbit} — Board Shuffled!
        </button>
      </div>
    </div>
  );
}
