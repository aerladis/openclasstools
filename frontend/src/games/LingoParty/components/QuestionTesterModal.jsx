import React, { useState, useMemo } from 'react';
import styles from './QuestionTesterModal.module.css';

const TYPE_ICONS = {
  riddle: '🧩',
  scramble: '🔤',
  pronunciation: '👅',
  speech: '👅',
  ordering: '🔢',
  grammar: '✍️',
  speed: '⚡',
  roleplay: '💬',
  association: '🎯',
  truefalse: '🔄'
};

export default function QuestionTesterModal({ deck = [], onClose, onTestCard }) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const typeCounts = useMemo(() => {
    const counts = { all: deck.length };
    deck.forEach(card => {
      const t = card.type || 'unknown';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [deck]);

  const filteredCards = useMemo(() => {
    return deck.map((card, index) => ({ card, index: index + 1 })).filter(({ card }) => {
      const matchesType = filterType === 'all' || card.type === filterType;
      const qText = (card.prompt || card.question || card.word || card.scrambledWord || '').toLowerCase();
      const aText = (card.answer || card.targetWord || '').toLowerCase();
      const matchesSearch = !searchQuery || qText.includes(searchQuery.toLowerCase()) || aText.includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [deck, filterType, searchQuery]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`glass-card ${styles.testerCard}`} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2>🔍 Question Tester Panel</h2>
            <p className={styles.subtext}>
              Reviewing all <strong>{deck.length}</strong> registered challenges in generated deck sequence.
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterRow}>
          <button
            className={`${styles.filterTab} ${filterType === 'all' ? styles.filterActive : ''}`}
            onClick={() => setFilterType('all')}
          >
            All ({typeCounts.all})
          </button>
          {Object.keys(typeCounts).filter(k => k !== 'all').map(t => (
            <button
              key={t}
              className={`${styles.filterTab} ${filterType === t ? styles.filterActive : ''}`}
              onClick={() => setFilterType(t)}
            >
              {TYPE_ICONS[t] || '🃏'} {t === 'pronunciation' ? 'Tongue-Twister' : t.toUpperCase()} ({typeCounts[t]})
            </button>
          ))}
        </div>

        {/* Search Field */}
        <input
          type="text"
          className={styles.searchInput}
          placeholder="🔎 Search by question keyword or target answer..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        {/* Card List */}
        <div className={styles.cardList}>
          {filteredCards.map(({ card, index }) => (
            <div key={index} className={styles.cardItem}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIndex}>#{index}</span>
                <span className={styles.typeBadge}>
                  {TYPE_ICONS[card.type] || '🎯'} {(card.type === 'pronunciation' ? 'Tongue-Twister' : card.type || 'Challenge').toUpperCase()}
                </span>
                <button
                  className={styles.testRunBtn}
                  onClick={() => onTestCard(card)}
                >
                  ⚡ Test Run in Game
                </button>
              </div>

              <div className={styles.cardPrompt}>
                {card.type === 'scramble' ? (
                  <>
                    <div><strong>Scrambled Word:</strong> {card.scrambledWord}</div>
                    <div><strong>Target Word:</strong> {card.targetWord}</div>
                    {card.clue && <div><strong>Clue:</strong> {card.clue}</div>}
                  </>
                ) : card.type === 'ordering' ? (
                  <>
                    <div style={{ color: '#fed7aa', fontWeight: 700 }}>Dialogue Lines to Order:</div>
                    <pre className={styles.orderingPre}>{card.prompt}</pre>
                    {card.answer && <div><strong>Correct Sequence:</strong> {card.answer}</div>}
                  </>
                ) : (
                  <>
                    <div><strong>Prompt:</strong> {card.prompt || card.question || card.word}</div>
                    {(card.answer != null || card.targetWord != null) && (
                      <div className={styles.cardAnswer}>
                        <strong>Answer:</strong> {String(card.answer || card.targetWord)}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
