import React, { useState, useEffect } from 'react';
import styles from './ChallengeModal.module.css';

function getGuaranteedScramble(scrambledWord, targetWord) {
  const target = String(targetWord || '').toUpperCase().trim();
  const rawScramble = String(scrambledWord || '').toUpperCase().trim();

  const targetChars = target.replace(/[^A-Z]/g, '');
  const scrambleChars = rawScramble.replace(/[^A-Z]/g, '');

  if (!rawScramble || !scrambleChars || scrambleChars === targetChars || scrambleChars.length < 2) {
    const chars = (targetChars || 'WORD').split('');
    let shuffled = [...chars];
    let attempts = 0;
    while (attempts < 25 && shuffled.join('') === targetChars) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      attempts++;
    }
    return shuffled.join(' - ');
  }

  return scrambleChars.split('').join(' - ');
}

export default function ChallengeModal({ challenge, activeTeam, onResolve, playSound }) {
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isClueUnlocked, setIsClueUnlocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [timerActive, setTimerActive] = useState(true);

  useEffect(() => {
    setIsAnswerRevealed(false);
    setIsClueUnlocked(false);
    setTimeLeft(45);
    setTimerActive(true);
  }, [challenge]);

  useEffect(() => {
    if (!challenge || !timerActive || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [challenge, timerActive, timeLeft]);

  if (!challenge || !activeTeam) return null;

  const hasClueDecoder = (activeTeam?.items || []).some(i => i.id === 'clue_key');

  const handleUnlockClue = () => {
    if (hasClueDecoder) {
      const idx = activeTeam.items.findIndex(i => i.id === 'clue_key');
      if (idx !== -1) activeTeam.items.splice(idx, 1);
      setIsClueUnlocked(true);
      if (playSound) playSound('trophy');
    } else if (activeTeam.coins >= 5) {
      activeTeam.coins -= 5;
      setIsClueUnlocked(true);
      if (playSound) playSound('trophy');
    }
  };

  const handleCorrect = () => {
    if (playSound) playSound('correct');
    onResolve({ result: 'correct', coins: challenge.coins || 15 });
  };

  const handleWrong = () => {
    if (playSound) playSound('wrong');
    onResolve({ result: 'wrong', coins: 0 });
  };

  const renderHighlightedAnswer = (prompt, targetAnswer) => {
    if (!targetAnswer) return null;
    const answerStr = String(targetAnswer);

    if (!prompt || typeof prompt !== 'string') {
      return <span>{answerStr}</span>;
    }

    const cleanWord = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, '');
    const promptWords = new Set(prompt.split(/\s+/).map(cleanWord));
    const answerWords = answerStr.split(/(\s+)/);

    const hasAnyDifferences = answerWords.some(w => {
      const c = cleanWord(w);
      return c && !promptWords.has(c);
    });

    if (!hasAnyDifferences) {
      return <span>{answerStr}</span>;
    }

    return (
      <span>
        {answerWords.map((token, idx) => {
          const cleaned = cleanWord(token);
          if (!cleaned) return token;
          const isFixedPart = !promptWords.has(cleaned);
          if (isFixedPart) {
            return (
              <span key={idx} className={styles.highlightedAnswerWord}>
                {token}
              </span>
            );
          }
          return token;
        })}
      </span>
    );
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={`glass-card ${styles.challengeCard}`}>
        <div className={styles.headerRow}>
          <span className={styles.typeBadge}>{challenge.type || 'Challenge'}</span>
          <span className={styles.coinsBadge}>+{challenge.coins || 15} Coins</span>
        </div>

        <h2 className={styles.mainPrompt}>
          {challenge.type === 'scramble' ? (
            `🔤 Scrambled Word: ${getGuaranteedScramble(challenge.scrambledWord, challenge.targetWord || challenge.word)}`
          ) : challenge.type === 'taboo' ? (
            `🚫 Describe Word: "${challenge.word || 'Vocabulary'}"`
          ) : (
            challenge.prompt || challenge.question || challenge.word || 'Complete the language challenge!'
          )}
        </h2>

        {challenge.type === 'taboo' && challenge.forbidden && (
          <div className={styles.subcontentBox}>
            <strong>🚫 Forbidden Words: </strong>{Array.isArray(challenge.forbidden) ? challenge.forbidden.join(' • ') : challenge.forbidden}
          </div>
        )}

        {/* Clue Hint Box (Hidden by default, unlockable via Clue Decoder item or 5 coins) */}
        {challenge.clue && (
          isClueUnlocked ? (
            <div className={styles.subcontentBox}>
              <strong>💡 Clue: </strong>{challenge.clue}
            </div>
          ) : (
            <button
              className={styles.revealClueBtn}
              onClick={handleUnlockClue}
              disabled={!hasClueDecoder && activeTeam.coins < 5}
            >
              {hasClueDecoder
                ? '💡 Use Clue Decoder (1 Owned in Inventory)'
                : activeTeam.coins >= 5
                  ? '💡 Unlock Hint Clue (Costs 5 🪙)'
                  : '🔒 Hint Clue Locked (Needs Clue Decoder or 5 🪙)'}
            </button>
          )
        )}

        {/* Target Answer / Error Correction Highlight */}
        {(challenge.targetWord || challenge.answer) && (
          !isAnswerRevealed ? (
            <button
              className={`btn-secondary ${styles.revealAnswerBtn}`}
              onClick={() => setIsAnswerRevealed(true)}
            >
              👁️ Click to Reveal Target Answer
            </button>
          ) : (
            <div className={styles.answerBox}>
              <div className={styles.answerLabel}>Target Answer</div>
              <div className={styles.answerText}>
                {renderHighlightedAnswer(challenge.prompt || challenge.question, challenge.targetWord || challenge.answer)}
              </div>
            </div>
          )
        )}

        {/* Timer Bar */}
        <div>
          <div className={styles.timerBarContainer}>
            <div
              className={styles.timerBarFill}
              style={{ width: `${(timeLeft / 45) * 100}%` }}
            />
          </div>
          <div className={styles.timerText}>⏱️ {timeLeft}s remaining</div>
        </div>

        {/* Grading Actions */}
        <div className={styles.actionRow}>
          <button className={styles.btnCorrect} onClick={handleCorrect}>
            ✅ Correct (+{challenge.coins || 15})
          </button>
          <button className={styles.btnWrong} onClick={handleWrong}>
            ❌ Incorrect
          </button>
        </div>
      </div>
    </div>
  );
}
