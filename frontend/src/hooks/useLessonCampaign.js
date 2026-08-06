import { useState, useCallback } from 'react';

export function useLessonCampaign() {
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  const startCampaign = useCallback((campaignData) => {
    setActiveCampaign(campaignData);
    setCurrentStageIndex(0);
  }, []);

  const nextStage = useCallback(() => {
    if (!activeCampaign || !activeCampaign.stages) return null;
    if (currentStageIndex < activeCampaign.stages.length - 1) {
      const nextIdx = currentStageIndex + 1;
      setCurrentStageIndex(nextIdx);
      return activeCampaign.stages[nextIdx];
    }
    return null;
  }, [activeCampaign, currentStageIndex]);

  const endCampaign = useCallback(() => {
    setActiveCampaign(null);
    setCurrentStageIndex(0);
  }, []);

  const currentStage = activeCampaign?.stages?.[currentStageIndex] || null;

  return {
    activeCampaign,
    currentStage,
    currentStageIndex,
    totalStages: activeCampaign?.stages?.length || 0,
    startCampaign,
    nextStage,
    endCampaign
  };
}
