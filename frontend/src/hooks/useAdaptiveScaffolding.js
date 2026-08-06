import { useState, useCallback } from 'react';

/**
 * Custom React Hook for Dynamic Adaptive ELT Scaffolding (ZPD / i+1 / i-1)
 */
export function useAdaptiveScaffolding(initialEnabled = true) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [teamStats, setTeamStats] = useState({});

  const recordTurnResult = useCallback((teamId, isCorrect) => {
    if (!teamId) return;

    setTeamStats(prev => {
      const current = prev[teamId] || { total: 0, correct: 0, streak: 0 };
      const newTotal = current.total + 1;
      const newCorrect = isCorrect ? current.correct + 1 : current.correct;
      const newStreak = isCorrect ? current.streak + 1 : 0;

      return {
        ...prev,
        [teamId]: { total: newTotal, correct: newCorrect, streak: newStreak }
      };
    });
  }, []);

  const getScaffoldingForTeam = useCallback((teamId) => {
    if (!enabled || !teamId) {
      return { mode: 'STANDARD', showWordBank: false, showFirstLetter: false, isStreakBoost: false };
    }

    const stats = teamStats[teamId] || { total: 0, correct: 0, streak: 0 };
    const accuracy = stats.total > 0 ? stats.correct / stats.total : 0.7;

    if (accuracy >= 0.85 && stats.streak >= 2) {
      return {
        mode: 'CHALLENGE_PLUS',
        showWordBank: false,
        showFirstLetter: false,
        isStreakBoost: true,
        badgeText: '🚀 STREAK BOOST (i+1)'
      };
    }

    if (stats.total >= 2 && accuracy < 0.5) {
      return {
        mode: 'SUPPORT_PLUS',
        showWordBank: true,
        showFirstLetter: true,
        isStreakBoost: false,
        badgeText: '💡 HELPING HAND (i-1)'
      };
    }

    return {
      mode: 'STANDARD',
      showWordBank: false,
      showFirstLetter: false,
      isStreakBoost: false
    };
  }, [enabled, teamStats]);

  return {
    enabled,
    setEnabled,
    recordTurnResult,
    getScaffoldingForTeam
  };
}
