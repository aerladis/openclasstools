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

const ALL_CATEGORIES = ['ordering', 'riddle', 'scramble', 'pronunciation', 'grammar', 'association', 'speed', 'roleplay'];

function parseOrderingLines(rawPrompt) {
  if (!rawPrompt || typeof rawPrompt !== 'string') return [];

  let text = rawPrompt.trim();
  text = text.replace(/^(put\s+this\s+conversation\s+(in\s+)?(correct\s+)?order\s*:?|reorder\s+(the\s+following\s+)?(conversation\s+)?:?|order\s+the\s+dialogue\s*:?)/i, '').trim();

  let lines = [];
  if (/(^|\s)[1-9]\.\s+/.test(text)) {
    lines = text.split(/(?=(?:^|\s)[1-9]\.\s+)/).map(s => s.trim()).filter(Boolean);
  } else if (text.includes('\n')) {
    lines = text.split('\n').map(s => s.trim()).filter(Boolean);
  } else if (/[A-Z][a-z]*\s*:\s*/.test(text)) {
    lines = text.split(/(?=[A-Z][a-z]*\s*:\s*)/).map(s => s.trim()).filter(Boolean);
  } else {
    lines = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
  }

  return lines
    .map(line => line.replace(/^(put\s+this\s+conversation[^:]*:?)/i, '').replace(/^[1-9]\.\s*/, '').trim())
    .filter(Boolean);
}

export default function QuestionTesterModal({ deck = [], onClose, onTestCard }) {
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const typeCounts = useMemo(() => {
    const counts = { all: deck.length };
    ALL_CATEGORIES.forEach(cat => { counts[cat] = 0; });
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
          {ALL_CATEGORIES.map(t => (
            <button
              key={t}
              className={`${styles.filterTab} ${filterType === t ? styles.filterActive : ''}`}
              onClick={() => setFilterType(t)}
            >
              {TYPE_ICONS[t] || '🃏'} {t === 'pronunciation' ? 'Tongue-Twister' : t === 'ordering' ? 'Ordering' : t.toUpperCase()} ({typeCounts[t] || 0})
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
          {filteredCards.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
              No challenges match category <strong>{filterType.toUpperCase()}</strong>.
            </div>
          ) : (
            filteredCards.map(({ card, index }) => {
              const orderingLines = card.type === 'ordering' ? parseOrderingLines(card.prompt) : [];
              return (
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
                        <div style={{ color: '#fed7aa', fontWeight: 700, marginBottom: '0.4rem' }}>
                          🔢 Dialogue Lines ({orderingLines.length} blocks):
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                          {orderingLines.map((line, idx) => (
                            <div key={idx} style={{ background: 'rgba(249, 115, 22, 0.12)', border: '1px solid rgba(249, 115, 22, 0.3)', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.9rem', color: '#fed7aa', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ background: '#f97316', color: '#fff', fontSize: '0.75rem', fontWeight: 900, borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {idx + 1}
                              </span>
                              <span>{line}</span>
                            </div>
                          ))}
                        </div>
                        {card.answer && (
                          <div className={styles.cardAnswer}>
                            <strong>Target Sequence:</strong> {card.answer}
                          </div>
                        )}
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
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
