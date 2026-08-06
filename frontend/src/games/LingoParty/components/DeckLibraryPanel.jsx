import React, { useState } from 'react';
import styles from './DeckLibraryPanel.module.css';
import GenerationConsole from '../../../components/Common/GenerationConsole';
import WorksheetExportModal from '../../../components/WorksheetExportModal';

export default function DeckLibraryPanel({
  decks,
  selectedDeck,
  loading,
  error,
  logs,
  refresh,
  select,
  cefr,
  topic,
  deckName,
  launching,
  launchError,
  onCefrChange,
  onTopicChange,
  onDeckNameChange,
  onLaunch,
  onGenerate,
}) {
  const [showPrintModal, setShowPrintModal] = useState(false);

  const selectedDeckObject = selectedDeck ? {
    gameType: 'lingoparty',
    name: selectedDeck.name,
    content: selectedDeck.currentVersion?.content || []
  } : null;

  return (
    <section className={styles.panel} aria-label="Registered LingoParty decks">
      <div className={styles.heading}>
        <div>
          <h2>Registered challenge decks</h2>
          <p>Existing decks are shared globally and launch with an immutable version.</p>
        </div>
        <button type="button" onClick={() => refresh().catch(() => {})} disabled={loading}>
          Refresh
        </button>
      </div>

      <label>
        Existing deck
        <select value={selectedDeck?.id || ''} onChange={(event) => select(event.target.value)}>
          <option value="">Choose a registered deck</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name} · v{deck.currentVersion.versionNumber}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="button" onClick={onLaunch} disabled={!selectedDeck || launching} style={{ flex: 1 }}>
          Launch selected deck
        </button>
        {selectedDeckObject && (
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            style={{ background: '#7c3aed', color: '#ffffff', fontWeight: 600, border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer' }}
          >
            🖨️ Print
          </button>
        )}
      </div>

      <div className={styles.generator}>
        <label>
          New deck name
          <input
            value={deckName}
            onChange={(event) => onDeckNameChange(event.target.value)}
            placeholder="Required"
            maxLength={100}
          />
        </label>
        <label>
          CEFR
          <select value={cefr} onChange={(event) => onCefrChange(event.target.value)}>
            {['A1', 'A2', 'B1', 'B2', 'C1'].map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </label>
        <label className={styles.wide}>
          Topic
          <input value={topic} onChange={(event) => onTopicChange(event.target.value)} />
        </label>
        <button type="button" onClick={onGenerate} disabled={launching || loading}>
          {launching ? 'Preparing voyage…' : 'Generate, save & launch'}
        </button>
      </div>

      {(error || launchError) && <p className={styles.error}>{launchError || error}</p>}
      <GenerationConsole logs={logs} />

      {showPrintModal && selectedDeckObject && (
        <WorksheetExportModal
          deck={selectedDeckObject}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </section>
  );
}

