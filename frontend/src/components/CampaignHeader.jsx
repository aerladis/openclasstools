import React from 'react';

export default function CampaignHeader({ campaignName, currentStageIndex, totalStages, stageName, onNextStage, onExitCampaign }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.95))',
      borderBottom: '1px solid rgba(168, 85, 247, 0.3)',
      backdropFilter: 'blur(12px)',
      padding: '10px 20px',
      color: '#ffffff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '1.2rem' }}>🚀</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', background: 'linear-gradient(to right, #c084fc, #fcd34d)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            LESSON CAMPAIGN: {campaignName}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            Stage {currentStageIndex + 1} of {totalStages}: <strong style={{ color: '#e2e8f0' }}>{stageName}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          type="button"
          onClick={onNextStage}
          style={{
            background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.85rem',
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(168, 85, 247, 0.4)'
          }}
        >
          Next Stage ➔
        </button>
        <button
          type="button"
          onClick={onExitCampaign}
          style={{
            background: 'rgba(148, 163, 184, 0.15)',
            color: '#cbd5e1',
            fontSize: '0.8rem',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            cursor: 'pointer'
          }}
        >
          Exit Quest
        </button>
      </div>
    </div>
  );
}
