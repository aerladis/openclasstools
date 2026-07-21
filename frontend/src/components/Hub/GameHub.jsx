import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './GameHub.module.css';

export default function GameHub() {
  const [serverHealth, setServerHealth] = useState({ status: 'checking', activeGames: 0 });

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setServerHealth({
          status: 'online',
          activeGames: data?.activeGames || 1
        });
      })
      .catch(() => {
        setServerHealth({ status: 'offline', activeGames: 0 });
      });
  }, []);

  const games = [
    {
      id: 'lingoparty',
      title: 'LingoParty',
      subtitle: 'React Widescreen Flagship',
      icon: '🎲',
      desc: 'Mario Party-style language board game with 16:9 widescreen winding adventure map, floating 3D character standees, AI challenges, and Mystery Box of Fate.',
      tags: ['AI Powered', 'Multiplayer', 'Board Game'],
      path: '/lingoparty',
      isReact: true
    },
    {
      id: 'whoami',
      title: 'Who Am I?',
      subtitle: 'Character Guessing',
      icon: '🎭',
      desc: 'Classic character guessing game with AI-generated classroom lists, countdown timer, and glassmorphism cards.',
      tags: ['AI Powered', 'Party'],
      path: '/who.html',
      isReact: false
    },
    {
      id: 'taboo',
      title: 'Taboo',
      subtitle: 'Word Description',
      icon: '💬',
      desc: 'Describe target vocabulary without saying forbidden words. Features team scoring and AI card generation.',
      tags: ['Teams', 'Vocabulary'],
      path: '/taboo.html',
      isReact: false
    },
    {
      id: 'hangman',
      title: 'Hangman',
      subtitle: 'Classic Word Guess',
      icon: '🪵',
      desc: 'Guess vocabulary letters before the SVG gallows completes. AI topic generator and hint system.',
      tags: ['SVG Animation', 'Word Game'],
      path: '/hangman.html',
      isReact: false
    },
    {
      id: 'millionaire',
      title: 'Millionaire',
      subtitle: 'Quiz Show',
      icon: '💰',
      desc: '15 progressive difficulty questions with 50:50, Phone-a-Friend, and Ask-the-Audience lifelines.',
      tags: ['Quiz Show', 'Lifelines'],
      path: '/millionaire.html',
      isReact: false
    },
    {
      id: 'kelime',
      title: 'Kelime Oyunu',
      subtitle: 'Turkish Word Game',
      icon: '🇹🇷',
      desc: 'Fast-paced letter reveal word guessing game with scoring and AI question generation.',
      tags: ['Letter Reveal', 'Timer'],
      path: '/kelime.html',
      isReact: false
    },
    {
      id: 'wheel',
      title: 'Wheel of Names',
      subtitle: 'Custom Selector',
      icon: '🎡',
      desc: 'Customizable spinning wheel with realistic sound effects and physics for picking students or topics.',
      tags: ['Physics', 'Tool'],
      path: '/wheel.html',
      isReact: false
    },
    {
      id: 'bottle',
      title: 'Spin the Bottle',
      subtitle: 'Interactive Spinner',
      icon: '🍾',
      desc: 'Smooth physics-based bottle spinner for classroom roleplay and turn-taking.',
      tags: ['3D Physics', 'Party'],
      path: '/bottle.html',
      isReact: false
    }
  ];

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hubHeader}>
        <div className={styles.titleSection}>
          <h1>🎮 OpenClassTools Game Hub</h1>
          <p>Next-Gen AI-Powered Classroom Party Games & Widescreen Interactive Board Suite</p>
        </div>

        <div className={styles.statusBadge}>
          <div className={styles.statusDot} style={{ background: serverHealth.status === 'offline' ? '#ef4444' : '#10b981' }}></div>
          <span>Server: {serverHealth.status === 'offline' ? 'Offline' : `Online (${serverHealth.activeGames} Active Games)`}</span>
        </div>
      </header>

      <section className={styles.gamesGrid}>
        {games.map(game => {
          const CardContent = (
            <div className={`glass-card ${styles.gameCard}`}>
              <div>
                <div className={styles.gameHeader}>
                  <span className={styles.gameIcon}>{game.icon}</span>
                  <div className={styles.gameTitle}>
                    <h3>{game.title}</h3>
                    <span>{game.subtitle}</span>
                  </div>
                </div>
                <p className={styles.gameDesc}>{game.desc}</p>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.tags}>
                  {game.tags.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                </div>
                <div className={styles.playBtn}>
                  {game.isReact ? 'Launch React App 🚀' : 'Open Game Page ↗'}
                </div>
              </div>
            </div>
          );

          return game.isReact ? (
            <Link key={game.id} to={game.path} style={{ textDecoration: 'none' }}>
              {CardContent}
            </Link>
          ) : (
            <a key={game.id} href={game.path} style={{ textDecoration: 'none' }}>
              {CardContent}
            </a>
          );
        })}
      </section>
    </div>
  );
}
