import React, { useState } from 'react';
import useDeckLibrary from '../../../hooks/useDeckLibrary';
import DeckLibraryPanel from './DeckLibraryPanel';
import styles from './SetupScreen.module.css';

const EMOJI_PALETTE = ['🐉', '🚀', '🤖', '🦊', '⚡', '🦉', '🦁', '🐬'];
const DEFAULT_NAMES = ['Crew A', 'Crew B', 'Crew C', 'Crew D', 'Crew E', 'Crew F'];

export default function SetupScreen({ onStartGame, playSound }) {
  const [teamCount, setTeamCount] = useState(3);
  const [boardLength, setBoardLength] = useState(30);
  const [cefr, setCefr] = useState('B1');
  const [topic, setTopic] = useState('General Classroom Vocabulary & Idioms');
  const [deckName, setDeckName] = useState('');
  const [baseColor, setBaseColor] = useState('#64748b');
  const [customNames, setCustomNames] = useState(DEFAULT_NAMES);
  const [customPawns, setCustomPawns] = useState(EMOJI_PALETTE);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState('');
  const deckLibrary = useDeckLibrary('lingoparty');

  const teams = () => Array.from({ length: teamCount }, (_, index) => ({
    id: `team-${index + 1}`,
    name: customNames[index]?.trim() || DEFAULT_NAMES[index],
    pawn: customPawns[index] || EMOJI_PALETTE[index],
    position: 0,
    trophies: 0,
    items: [],
  }));

  const launchDeck = async (deck) => {
    if (!deck?.currentVersion?.id) {
      setLaunchError('Choose or generate a registered deck first.');
      return;
    }
    setLaunching(true);
    setLaunchError('');
    try {
      await onStartGame({
        teams: teams(),
        boardLength,
        baseColor,
        deck: deck.currentVersion.content,
        deckId: deck.id,
        deckVersionId: deck.currentVersion.id,
      });
      playSound?.('correct');
    } catch (error) {
      setLaunchError(error.message);
      playSound?.('wrong');
    } finally {
      setLaunching(false);
    }
  };

  const generateAndLaunch = async () => {
    setLaunching(true);
    setLaunchError('');
    try {
      const deck = await deckLibrary.generate({
        endpoint: '/api/generate-lingoparty',
        deckName,
        theme: topic,
        cefr,
        count: 30,
      });
      setDeckName('');
      await launchDeck(deck);
    } catch (error) {
      setLaunchError(error.message);
      playSound?.('wrong');
      setLaunching(false);
    }
  };

  const changeName = (index, value) => {
    setCustomNames((current) => current.map((name, i) => (i === index ? value : name)));
  };

  const cyclePawn = (index) => {
    setCustomPawns((current) => current.map((pawn, i) => {
      if (i !== index) return pawn;
      const currentIndex = EMOJI_PALETTE.indexOf(pawn);
      return EMOJI_PALETTE[(currentIndex + 1) % EMOJI_PALETTE.length];
    }));
    playSound?.('roll');
  };

  return (
    <div className={styles.setupContainer}>
      <div className={`glass-card ${styles.setupCard}`}>
        <div className={styles.header}>
          <h1>Mission Briefing & Crew Setup</h1>
          <p>Launch an exact registered challenge-deck version and record the voyage.</p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Number of crews</label>
            <select
              className={styles.selectField}
              value={teamCount}
              onChange={(event) => setTeamCount(Number(event.target.value))}
            >
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <option key={count} value={count}>{count} {count === 1 ? 'Crew' : 'Crews'}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Flight path length</label>
            <select
              className={styles.selectField}
              value={boardLength}
              onChange={(event) => setBoardLength(Number(event.target.value))}
            >
              <option value={24}>24 planets</option>
              <option value={30}>30 planets</option>
              <option value={32}>32 planets</option>
              <option value={54}>54 planets</option>
            </select>
          </div>
          <div className={`${styles.formGroup} ${styles.fullSpan}`}>
            <label>Standard planet color</label>
            <input
              type="color"
              className={styles.inputField}
              value={baseColor}
              onChange={(event) => setBaseColor(event.target.value)}
            />
          </div>
          <div className={`${styles.formGroup} ${styles.fullSpan}`}>
            <label>Custom crew names</label>
            <div className={styles.formGrid}>
              {Array.from({ length: teamCount }, (_, index) => (
                <div key={DEFAULT_NAMES[index]} style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" onClick={() => cyclePawn(index)}>
                    {customPawns[index]}
                  </button>
                  <input
                    className={styles.inputField}
                    value={customNames[index]}
                    onChange={(event) => changeName(index, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DeckLibraryPanel
          {...deckLibrary}
          cefr={cefr}
          topic={topic}
          deckName={deckName}
          launching={launching}
          launchError={launchError}
          onCefrChange={setCefr}
          onTopicChange={setTopic}
          onDeckNameChange={setDeckName}
          onLaunch={() => launchDeck(deckLibrary.selectedDeck)}
          onGenerate={generateAndLaunch}
        />
      </div>
    </div>
  );
}
