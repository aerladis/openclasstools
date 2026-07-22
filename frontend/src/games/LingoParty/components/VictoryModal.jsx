import React from 'react';
import styles from './ShopModal.module.css';

export default function VictoryModal({ teams, onPlayAgain, onReturnHub }) {
  // Sort teams by Trophies (descending), then Coins (descending)
  const sortedTeams = [...teams].sort((a, b) => {
    if (b.trophies !== a.trophies) return b.trophies - a.trophies;
    return b.coins - a.coins;
  });

  const winner = sortedTeams[0] || { name: 'Winner Crew', icon: '🚀', trophies: 0, coins: 0 };
  const ranks = ['🥇 1st Place', '🥈 2nd Place', '🥉 3rd Place', '4th Place', '5th Place', '6th Place'];

  return (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modalContent}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(20, 10, 45, 0.95), rgba(10, 5, 25, 0.98))',
          border: '2px solid rgba(245, 158, 11, 0.6)',
          boxShadow: '0 0 60px rgba(245, 158, 11, 0.4), 0 0 100px rgba(168, 85, 247, 0.3)'
        }}
      >
        {/* Crown & Victory Header */}
        <div style={{ fontSize: '4.5rem', marginBottom: '0.4rem', animation: 'float 3s ease-in-out infinite' }}>
          👑
        </div>
        <h1 style={{
          fontSize: '2.4rem',
          fontWeight: 900,
          background: 'linear-gradient(135deg, #f59e0b, #ec4899, #a855f7)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '0.2rem',
          letterSpacing: '-0.5px'
        }}>
          GLORIOUS VICTORY SANCTUARY!
        </h1>
        <p style={{ color: 'rgba(241, 245, 249, 0.75)', fontSize: '1rem', marginBottom: '1.6rem' }}>
          The cosmic voyage is complete! All crews have reached the Goal Base.
        </p>

        {/* Winner Spotlight Card */}
        <div style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
          border: '2px solid rgba(245, 158, 11, 0.8)',
          borderRadius: '20px',
          padding: '1.4rem',
          marginBottom: '1.6rem',
          boxShadow: '0 0 35px rgba(245, 158, 11, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.6rem'
        }}>
          <span style={{ fontSize: '4rem', filter: 'drop-shadow(0 0 15px rgba(245, 158, 11, 0.8))' }}>
            {winner.icon}
          </span>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>
            {winner.name}
          </h2>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.2rem' }}>
            <span style={{ background: 'rgba(245, 158, 11, 0.25)', border: '1px solid #f59e0b', color: '#fef08a', padding: '0.4rem 1.2rem', borderRadius: '50px', fontWeight: 800, fontSize: '1.1rem' }}>
              🏆 {winner.trophies} Trophies
            </span>
            <span style={{ background: 'rgba(56, 189, 248, 0.25)', border: '1px solid #38bdf8', color: '#7dd3fc', padding: '0.4rem 1.2rem', borderRadius: '50px', fontWeight: 800, fontSize: '1.1rem' }}>
              💰 {winner.coins} Coins
            </span>
          </div>
        </div>

        {/* Final Leaderboard Podium */}
        <div style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '1rem', marginBottom: '1.8rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#a78bfa', marginBottom: '0.8rem', textAlign: 'left' }}>
            📊 Final Crew Leaderboard
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedTeams.map((team, idx) => (
              <div
                key={team.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 1rem',
                  borderRadius: '12px',
                  background: idx === 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: idx === 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: idx === 0 ? '#f59e0b' : '#94a3b8' }}>
                    {ranks[idx] || `${idx + 1}th Place`}
                  </span>
                  <span style={{ fontSize: '1.4rem' }}>{team.icon}</span>
                  <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>{team.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', fontWeight: 700 }}>
                  <span style={{ color: '#f59e0b' }}>🏆 {team.trophies}</span>
                  <span style={{ color: '#38bdf8' }}>💰 {team.coins}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            className={styles.btnPrimary}
            onClick={onPlayAgain}
            style={{
              padding: '0.85rem 2rem',
              fontSize: '1.05rem',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              boxShadow: '0 0 25px rgba(16, 185, 129, 0.5)'
            }}
          >
            🔄 Rematch / Play Again
          </button>
          <a
            href="index.html"
            className={styles.btnSecondary}
            style={{
              padding: '0.85rem 2rem',
              fontSize: '1.05rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            🏠 Return to Hub
          </a>
        </div>
      </div>
    </div>
  );
}
